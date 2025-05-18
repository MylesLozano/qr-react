import { useState, useEffect, useCallback } from "react";
import {
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db, logAudit } from "../firebase";
import { toast } from "react-toastify";
import {
  validateItem,
  sanitizeInput,
  sanitizeNumber,
  parseAbbreviatedDate,
} from "../utils/inventoryUtils";

const defaultFormData = {
  unitNumber: "",
  name: "",
  brand: "",
  serialNumber: "",
  dateAcquired: "",
  quantity: 1,
  remarks: "",
  category: "",
  description: "",
  lab: "",
  uniqueQR: false,
  itemCondition: "New",
};

export default function useInventory(user) {
  const [formData, setFormData] = useState(defaultFormData);
  const [items, setItems] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Fetch inventory items
  useEffect(() => {
    if (!user) return;

    const inventoryQuery = query(
      collection(db, "inventory"),
      orderBy("createdAt", "desc")
    );
    const unsubscribe = onSnapshot(
      inventoryQuery,
      (querySnapshot) => {
        const newItems = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setItems(newItems);
        setError(null);
      },
      (error) => {
        console.error("Error fetching inventory:", error);
        setError("Failed to load inventory data");
        toast.error("Failed to load inventory data");
      }
    );

    return unsubscribe;
  }, [user]);

  // Validate item data
  const handleItemValidation = useCallback(() => {
    const errors = validateItem(formData);

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error(Object.values(errors).join(", "));
      return false;
    }

    setValidationErrors({});
    return true;
  }, [formData]);

  // Add new item
  const addItem = async () => {
    if (!handleItemValidation()) return;

    try {
      setIsLoading(true);
      setError(null);

      const itemData = {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.email,
        updatedBy: user.email,
      };

      const newItemRef = await addDoc(collection(db, "inventory"), itemData);
      await logAudit("inventory_added", user.email, "inventory", {
        itemId: newItemRef.id,
        itemName: formData.name,
      });

      toast.success("Item added successfully");
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error adding item:", error);
      setError("Failed to add item");
      toast.error("Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  // Save edited item
  const handleSaveEdit = async () => {
    if (!handleItemValidation()) return;
    if (!editingItem?.id) {
      toast.error("Cannot update item: Missing item ID.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const sanitizedData = {
        ...formData,
        name: sanitizeInput(formData.name),
        brand: sanitizeInput(formData.brand),
        serialNumber: sanitizeInput(formData.serialNumber),
        remarks: sanitizeInput(formData.remarks),
        quantity: sanitizeNumber(formData.quantity),
        updatedAt: serverTimestamp(),
        updatedBy: user.email,
      };

      await updateDoc(doc(db, "inventory", editingItem.id), sanitizedData);
      await logAudit("inventory_updated", user.email, "inventory", {
        itemId: editingItem.id,
        itemName: sanitizedData.name,
      });

      toast.success("Item updated successfully");
      setIsEditing(false);
      setEditingItem(null);
      setFormData(defaultFormData);
    } catch (error) {
      console.error("Error updating item:", error);
      setError(error.message);
      toast.error(`Failed to update item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete item
  const deleteItem = async (id, name) => {
    try {
      setIsLoading(true);
      setError(null);

      await deleteDoc(doc(db, "inventory", id));
      await logAudit("inventory_deleted", user.email, "inventory", {
        itemId: id,
        itemName: name,
      });

      toast.success("Item deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      setError(error.message);
      toast.error(`Failed to delete item: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Bulk upload items
  const bulkUpload = async () => {
    if (csvData.length === 0) {
      toast.error("No data to upload!");
      return;
    }

    setIsUploading(true);
    let skippedRows = 0;
    let addedCount = 0;

    try {
      const batch = writeBatch(db);
      const addedItemDetails = [];

      for (const item of csvData) {
        // Only require name, quantity, and category
        const name = sanitizeInput(item.name);
        const quantity = sanitizeNumber(item.quantity);
        const category = sanitizeInput(item.category);

        if (!name || !category || isNaN(quantity)) {
          skippedRows++;
          continue;
        }
        const sanitizedItem = {
          unitNumber: sanitizeInput(item.unitNum) || "",
          name,
          brand: sanitizeInput(item.brand) || "",
          serialNumber:
            sanitizeInput(item.serialNum || item.serialNumber) || "N/A", // Ensure serialNumber is a string and defaults to "N/A"
          dateAcquired:
            item.dateAcqui || item.dateAcquired
              ? parseAbbreviatedDate(item.dateAcqui || item.dateAcquired)
              : null, // Handle special date formats
          quantity,
          remarks: sanitizeInput(item.remarks) || "",
          category,
          uniqueQR: false,
          itemCondition: "New",
          createdAt: serverTimestamp(),
          createdBy: user.email,
          updatedAt: serverTimestamp(),
          updatedBy: user.email,
        };

        const newDocRef = doc(collection(db, "inventory"));
        batch.set(newDocRef, sanitizedItem);
        addedCount++;
        addedItemDetails.push({ id: newDocRef.id, name: sanitizedItem.name }); // Collect details for audit
      }

      await batch.commit();
      // Log only if items were actually added
      if (addedCount > 0) {
        await logAudit("inventory_bulk_uploaded", user.email, "inventory", {
          addedCount: addedCount,
          skippedCount: skippedRows,
          // Optionally include item IDs/names if not too large
          // items: addedItemDetails
        });
      }

      toast.success(
        `Successfully uploaded ${addedCount} items!${
          skippedRows > 0
            ? ` Skipped ${skippedRows} row(s) missing required fields.`
            : ""
        }`
      );
      setCsvData([]);
    } catch (error) {
      console.error("Error in bulk upload:", error);
      toast.error(`Error in bulk upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    items,
    isLoading,
    error,
    addItem,
    deleteItem,
    bulkUpload,
    isUploading,
    formData,
    setFormData,
    defaultFormData,
    isEditing,
    setIsEditing,
    editingItem,
    setEditingItem,
    validationErrors,
    setCsvData,
    csvData,
    handleSaveEdit,
  };
}
