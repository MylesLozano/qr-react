import { useState, useEffect } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, logAudit } from "../../../firebase";
import { toast } from "react-toastify";
import { sanitizeInput, sanitizeNumber } from "../../../utils/inventoryUtils";
import { useInventoryValidation } from "../../../hooks/useInventoryValidation";
import { useAuth } from "../../../hooks/useAuth";
import { useTheme } from "../../../hooks/useTheme";
import FormField from "./FormField";
import FormActions from "./FormActions";

function AddEditForm({ onSuccess, editingItem = null, defaultFormData }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with default values or editing item values
  const [formData, setFormData] = useState(editingItem || defaultFormData);
  const { errors: validationErrors, validate } = useInventoryValidation(formData);

  // Reset form when editingItem changes
  useEffect(() => {
    setFormData(editingItem || defaultFormData);
  }, [editingItem, defaultFormData]);

  const isEditing = !!editingItem;

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    // Handle different input types appropriately
    if (type === "number") {
      setFormData({ ...formData, [name]: parseInt(value) || 0 });
    } else if (type === "checkbox") {
      setFormData({ ...formData, [name]: e.target.checked });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleCancel = () => {
    // Reset form to original state
    setFormData(editingItem || defaultFormData);
    // Call onSuccess to close modal or perform any additional actions
    if (onSuccess) onSuccess();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error(Object.values(validationErrors).join(', '));
      return;
    }

    try {
      setIsLoading(true);

      const sanitizedData = {
        ...formData,
        name: sanitizeInput(formData.name),
        brand: sanitizeInput(formData.brand),
        serialNumber: sanitizeInput(formData.serialNumber),
        remarks: sanitizeInput(formData.remarks),
        description: sanitizeInput(formData.description),
        quantity: sanitizeNumber(formData.quantity),
        updatedAt: serverTimestamp(),
        updatedBy: user.email
      };

      if (isEditing) {
        // Update existing item
        await updateDoc(doc(db, "inventory", editingItem.id), sanitizedData);
        toast.success('Inventory item updated successfully!');
        // Standardized audit log action and entity type
        await logAudit('inventory_updated', user.email, 'inventory', {
          itemId: editingItem.id,
          itemName: sanitizedData.name,
          details: sanitizedData,
        });
      } else {
        // Add new item
        sanitizedData.createdAt = serverTimestamp();
        sanitizedData.createdBy = user.email;
        const docRef = await addDoc(collection(db, "inventory"), sanitizedData);
        toast.success('Inventory item added successfully!');
        // Standardized audit log action and entity type
        await logAudit('inventory_added', user.email, 'inventory', {
          itemId: docRef.id,
          itemName: sanitizedData.name,
          details: sanitizedData,
        });
      }

      // Reset form to default state after successful submission
      setFormData(defaultFormData);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Error saving item:", error);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-h-[85vh] overflow-y-auto`}>
      <h2 className="text-xl font-semibold sticky top-0 bg-inherit py-2 mb-4 z-10">
        {isEditing ? 'Edit Item' : 'Add New Item'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Basic Information */}
          <FormField
            type="text"
            name="name"
            placeholder="Name *"
            value={formData.name}
            onChange={handleChange}
            required={true}
            error={validationErrors.name}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="text"
            name="brand"
            placeholder="Brand"
            value={formData.brand}
            onChange={handleChange}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="text"
            name="serialNumber"
            placeholder="Serial Number"
            value={formData.serialNumber}
            onChange={handleChange}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="text"
            name="category"
            placeholder="Category *"
            value={formData.category}
            onChange={handleChange}
            required={true}
            error={validationErrors.category}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="number"
            name="quantity"
            placeholder="Quantity *"
            value={formData.quantity}
            onChange={handleChange}
            min="0"
            required={true}
            error={validationErrors.quantity}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="date"
            name="dateAcquired"
            placeholder="Date Acquired"
            value={formData.dateAcquired}
            onChange={handleChange}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="select"
            name="itemCondition"
            value={formData.itemCondition}
            onChange={handleChange}
            options={[
              { value: "New", label: "New" },
              { value: "Used", label: "Used" },
              { value: "Damaged", label: "Damaged" }
            ]}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="select"
            name="lab"
            value={formData.lab}
            onChange={handleChange}
            options={[
              { value: "", label: "Select Lab" },
              { value: "Mac Lab", label: "Mac Lab" },
              { value: "EMC Lab", label: "EMC Lab" },
              { value: "Others", label: "Others" }
            ]}
            isDarkMode={isDarkMode}
          />

          <FormField
            type="checkbox"
            name="uniqueQR"
            placeholder="Generate Unique QR Code"
            value={formData.uniqueQR}
            onChange={handleChange}
            isDarkMode={isDarkMode}
          />

          {/* Description and Remarks */}
          <div className="col-span-full">
            <FormField
              type="textarea"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              isDarkMode={isDarkMode}
            />
          </div>

          <div className="col-span-full">
            <FormField
              type="textarea"
              name="remarks"
              placeholder="Remarks"
              value={formData.remarks}
              onChange={handleChange}
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        <FormActions 
          isLoading={isLoading} 
          onCancel={handleCancel} 
          isEditing={isEditing} 
        />
      </form>
    </div>
  );
}

export default AddEditForm;