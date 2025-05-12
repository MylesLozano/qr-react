import { useState, useEffect } from "react";
import { doc, updateDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, logAudit } from "../../firebase";
import { toast } from "react-toastify";
import Button from "../Button";
import { sanitizeInput, sanitizeNumber } from "../../utils/inventoryUtils";
import { useInventoryValidation } from "../../hooks/useInventoryValidation";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";

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

  const inputClass = `p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
    }`;

  const getErrorClass = (fieldName) =>
    validationErrors[fieldName] ? "border-red-500" : "";

  return (
    <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-h-[85vh] overflow-y-auto`}>
      <h2 className="text-xl font-semibold sticky top-0 bg-inherit py-2 mb-4 z-10">
        {isEditing ? 'Edit Item' : 'Add New Item'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              name="name"
              placeholder="Name *"
              value={formData.name}
              onChange={handleChange}
              className={`${inputClass} ${getErrorClass("name")} w-full`}
              required
            />
            {validationErrors.name && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <input
              type="text"
              name="brand"
              placeholder="Brand"
              value={formData.brand}
              onChange={handleChange}
              className={`${inputClass} w-full`}
            />
          </div>

          <div>
            <input
              type="text"
              name="serialNumber"
              placeholder="Serial Number"
              value={formData.serialNumber}
              onChange={handleChange}
              className={`${inputClass} w-full`}
            />
          </div>

          <div>
            <input
              type="text"
              name="category"
              placeholder="Category *"
              value={formData.category}
              onChange={handleChange}
              className={`${inputClass} ${getErrorClass("category")} w-full`}
              required
            />
            {validationErrors.category && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.category}</p>
            )}
          </div>

          <div>
            <input
              type="number"
              name="quantity"
              placeholder="Quantity *"
              value={formData.quantity}
              onChange={handleChange}
              min="0"
              className={`${inputClass} ${getErrorClass("quantity")} w-full`}
              required
            />
            {validationErrors.quantity && (
              <p className="text-red-500 text-xs mt-1">{validationErrors.quantity}</p>
            )}
          </div>

          <div>
            <input
              type="date"
              name="dateAcquired"
              placeholder="Date Acquired"
              value={formData.dateAcquired}
              onChange={handleChange}
              className={`${inputClass} w-full`}
            />
          </div>

          <div>
            <select
              name="itemCondition"
              value={formData.itemCondition}
              onChange={handleChange}
              className={`${inputClass} w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
            >
              <option value="New">New</option>
              <option value="Used">Used</option>
              <option value="Damaged">Damaged</option>
            </select>
          </div>

          <div>
            <select
              name="lab"
              value={formData.lab}
              onChange={handleChange}
              className={`${inputClass} w-full ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
            >
              <option value="" className={`${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}>
                Select Lab
              </option>
              <option value="Mac Lab" className={`${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}>
                Mac Lab
              </option>
              <option value="EMC Lab" className={`${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}>
                EMC Lab
              </option>
              <option value="Others" className={`${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}>
                Others
              </option>
            </select>
          </div>

          <div className="md:col-span-2 lg:col-span-1">
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                name="uniqueQR"
                checked={formData.uniqueQR}
                onChange={handleChange}
                className="mr-2"
              />
              <span className="text-sm">Generate Unique QR Code</span>
            </label>
          </div>

          <div className="col-span-full">
            <textarea
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              className={`${inputClass} w-full`}
              rows="2"
            />
          </div>

          <div className="col-span-full">
            <textarea
              name="remarks"
              placeholder="Remarks"
              value={formData.remarks}
              onChange={handleChange}
              className={`${inputClass} w-full`}
              rows="2"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-4">
          <Button
            onClick={handleCancel}
            color="gray"
            size="md"
            type="button"
          >
            Cancel
          </Button>

          <Button
            color="blue"
            size="md"
            type="submit"
            loading={isLoading}
            disabled={isLoading}
          >
            {isLoading
              ? 'Saving...'
              : (isEditing ? 'Save Changes' : 'Add Item')
            }
          </Button>
        </div>
      </form>
    </div>
  );
}

export default AddEditForm;