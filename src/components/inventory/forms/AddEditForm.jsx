import { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, logAudit } from '../../../firebase';
import { toast } from 'react-toastify';
import { sanitizeInput, sanitizeNumber } from '../../../utils/inventoryUtils';
import { useInventoryValidation } from '../../../hooks/useInventoryValidation';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import FormField from './FormField';
import FormActions from './FormActions';

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
    if (type === 'number') {
      setFormData({ ...formData, [name]: parseInt(value) || 0 });
    } else if (type === 'checkbox') {
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
        updatedBy: user.email,
      };

      if (isEditing) {
        // Update existing item
        await updateDoc(doc(db, 'inventory', editingItem.id), sanitizedData);
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
        const docRef = await addDoc(collection(db, 'inventory'), sanitizedData);
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
      console.error('Error saving item:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'add'} item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-h-[85vh] overflow-y-auto`}
    >
      <h2 className="text-xl font-semibold sticky top-0 bg-inherit py-2 mb-4 z-10">
        {isEditing ? 'Edit Item' : 'Add New Item'}
      </h2>

      <form onSubmit={handleSubmit} className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
          {/* Basic item information - first column */}
          <div className="space-y-4">
            <FormField
              label="Item Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              error={validationErrors.name}
              required
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              error={validationErrors.category}
              required
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Brand"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              error={validationErrors.brand}
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Serial Number"
              name="serialNumber"
              value={formData.serialNumber}
              onChange={handleChange}
              error={validationErrors.serialNumber}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Additional details - second column */}
          <div className="space-y-4">
            <FormField
              label="Quantity"
              name="quantity"
              value={formData.quantity}
              onChange={handleChange}
              error={validationErrors.quantity}
              type="number"
              min="0"
              required
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Lab"
              name="lab"
              value={formData.lab}
              onChange={handleChange}
              error={validationErrors.lab}
              type="select"
              options={[
                { value: '', label: 'Select Lab' },
                { value: 'Mac Lab', label: 'Mac Lab' },
                { value: 'EMC Lab', label: 'EMC Lab' },
                { value: 'Others', label: 'Others' },
              ]}
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Item Condition"
              name="itemCondition"
              value={formData.itemCondition}
              onChange={handleChange}
              error={validationErrors.itemCondition}
              type="select"
              options={[
                { value: '', label: 'Select Condition' },
                { value: 'New', label: 'New' },
                { value: 'Good', label: 'Good' },
                { value: 'Used', label: 'Used' },
                { value: 'Damaged', label: 'Damaged' },
              ]}
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              error={validationErrors.status}
              type="select"
              options={[
                { value: '', label: 'Select Status' },
                { value: 'Available', label: 'Available' },
                { value: 'In Use', label: 'In Use' },
                { value: 'Under Maintenance', label: 'Under Maintenance' },
                { value: 'Retired', label: 'Retired' },
              ]}
              isDarkMode={isDarkMode}
            />
          </div>

          {/* Additional fields - third column */}
          <div className="space-y-4 md:col-span-2 lg:col-span-1">
            <FormField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              error={validationErrors.description}
              type="textarea"
              rows="3"
              isDarkMode={isDarkMode}
            />

            <FormField
              label="Remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              error={validationErrors.remarks}
              type="textarea"
              rows="3"
              isDarkMode={isDarkMode}
            />
          </div>
        </div>

        <FormActions
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
          isEditing={isEditing}
          isDarkMode={isDarkMode}
        />
      </form>
    </div>
  );
}

export default AddEditForm;
