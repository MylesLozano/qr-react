import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, logAudit } from '../../../firebase';
import { toast } from 'react-toastify';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import Button from '../../Button';
import FormField from './FormField';

function BulkEditForm({ selectedItems, items, onClose, onSuccess }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  // Fields that can be bulk edited
  const [editableFields, setEditableFields] = useState({
    unitNumber: { enabled: false, value: '' },
    itemCondition: { enabled: false, value: '' },
    lab: { enabled: false, value: '' },
    status: { enabled: false, value: '' },
  });

  // Clear success message after display
  useEffect(() => {
    let timer;
    if (successMessage) {
      timer = setTimeout(() => {
        setSuccessMessage('');
      }, 5000); // Hide after 5 seconds
    }
    return () => clearTimeout(timer);
  }, [successMessage]);

  // No selected items case
  if (!selectedItems || Object.keys(selectedItems).filter((id) => selectedItems[id]).length === 0) {
    return (
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <h2 className="text-xl font-semibold mb-4">Bulk Edit Items</h2>
        <p className="text-center py-4">No items selected for bulk editing.</p>
        <div className="flex justify-end mt-4">
          <Button onClick={onClose} color="gray">
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Get selected item IDs
  const selectedItemIds = Object.keys(selectedItems).filter((id) => selectedItems[id]);
  const selectedItemsCount = selectedItemIds.length;

  // Toggle field selection for bulk edit
  const toggleFieldSelection = (fieldName) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        enabled: !prev[fieldName].enabled,
      },
    }));
  };

  // Handle field value changes
  const handleFieldChange = (fieldName, value) => {
    setEditableFields((prev) => ({
      ...prev,
      [fieldName]: {
        ...prev[fieldName],
        value,
      },
    }));
  };

  // Submit bulk edit changes
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate: ensure at least one field is selected for update
    const hasEnabledFields = Object.values(editableFields).some((field) => field.enabled);
    if (!hasEnabledFields) {
      toast.error('Please select at least one field to update');
      return;
    }

    // Validate: ensure all enabled fields have values
    const hasEmptyEnabledField = Object.entries(editableFields).some(
      ([_, field]) => field.enabled && field.value === ''
    );
    if (hasEmptyEnabledField) {
      toast.error('Please provide values for all selected fields');
      return;
    }

    try {
      setIsLoading(true);

      // Prepare update data object only including enabled fields
      const updateData = {
        updatedAt: serverTimestamp(),
        updatedBy: user.email,
      };

      const updatedFields = [];
      Object.entries(editableFields).forEach(([fieldName, field]) => {
        if (field.enabled && field.value) {
          updateData[fieldName] = field.value;
          updatedFields.push(fieldName);
        }
      });

      // Batch update all selected items
      const updatePromises = selectedItemIds.map(async (itemId) => {
        try {
          const itemRef = doc(db, 'inventory', itemId);
          await updateDoc(itemRef, updateData);

          // Find the item name for audit log
          const itemName = items.find((item) => item.id === itemId)?.name || 'Unknown Item';

          // Log audit for each update
          await logAudit('inventory_bulk_updated', user.email, 'inventory', {
            itemId,
            itemName,
            updatedFields,
          });
        } catch (error) {
          console.error(`Error updating item ${itemId}:`, error);
          throw error; // Re-throw to be caught by the outer try/catch
        }
      });

      await Promise.all(updatePromises);      // Success message details
      const fieldLabels = {
        unitNumber: 'Unit Number',
        itemCondition: 'Item Condition',
        lab: 'Laboratory',
        status: 'Status',
      };

      const updatedFieldLabels = updatedFields.map((field) => fieldLabels[field] || field);
      const successDetails = `Updated ${updatedFieldLabels.join(', ')} for ${selectedItemsCount} items`;

      // Set success message and show toast
      setSuccessMessage(successDetails);
      toast.success(successDetails);

      // Callback after successful update
      if (onSuccess) {
        onSuccess(selectedItemIds, updatedFields);
      }
    } catch (error) {
      console.error('Error in bulk update:', error);
      toast.error(`Failed to update items: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Bulk Edit Items</h2>
        <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {selectedItemsCount} {selectedItemsCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>

      {successMessage && (
        <div
          className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-green-800/20' : 'bg-green-100'} text-green-600`}
        >
          <p>{successMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Field selection checkboxes */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <h3 className="font-medium mb-3">Select fields to edit:</h3>            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-unitNumber"
                  checked={editableFields.unitNumber.enabled}
                  onChange={() => toggleFieldSelection('unitNumber')}
                  className="mr-2 h-5 w-5"
                />
                <label htmlFor="edit-unitNumber">Unit Number</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-condition"
                  checked={editableFields.itemCondition.enabled}
                  onChange={() => toggleFieldSelection('itemCondition')}
                  className="mr-2 h-5 w-5"
                />
                <label htmlFor="edit-condition">Item Condition</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-lab"
                  checked={editableFields.lab.enabled}
                  onChange={() => toggleFieldSelection('lab')}
                  className="mr-2 h-5 w-5"
                />
                <label htmlFor="edit-lab">Laboratory</label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-status"
                  checked={editableFields.status.enabled}
                  onChange={() => toggleFieldSelection('status')}
                  className="mr-2 h-5 w-5"
                />
                <label htmlFor="edit-status">Status</label>
              </div>
            </div>
          </div>          {/* Form Fields - only shown if enabled */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Unit Number Field */}
            {editableFields.unitNumber.enabled && (
              <div>
                <FormField
                  label="Unit Number"
                  name="unitNumber"
                  value={editableFields.unitNumber.value}
                  onChange={(e) => handleFieldChange('unitNumber', e.target.value)}
                  isDarkMode={isDarkMode}
                />
              </div>
            )}
            
            {/* Item Condition Field */}
            {editableFields.itemCondition.enabled && (
              <div>
                <FormField
                  label="Item Condition"
                  name="itemCondition"
                  value={editableFields.itemCondition.value}
                  onChange={(e) => handleFieldChange('itemCondition', e.target.value)}
                  type="select"
                  options={[
                    { value: '', label: 'Select Condition' },
                    { value: 'New', label: 'New' },
                    { value: 'Good', label: 'Good' },
                    { value: 'Used', label: 'Used' },
                    { value: 'Damaged', label: 'Damaged' },
                  ]}
                  required
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* Laboratory Field */}
            {editableFields.lab.enabled && (
              <div>
                <FormField
                  label="Lab"
                  name="lab"
                  value={editableFields.lab.value}
                  onChange={(e) => handleFieldChange('lab', e.target.value)}
                  type="select"
                  options={[
                    { value: '', label: 'Select Lab' },
                    { value: 'Mac Lab', label: 'Mac Lab' },
                    { value: 'EMC Lab', label: 'EMC Lab' },
                    { value: 'Others', label: 'Others' },
                  ]}
                  required
                  isDarkMode={isDarkMode}
                />
              </div>
            )}

            {/* Status Field */}
            {editableFields.status.enabled && (
              <div>
                <FormField
                  label="Status"
                  name="status"
                  value={editableFields.status.value}
                  onChange={(e) => handleFieldChange('status', e.target.value)}
                  type="select"
                  options={[
                    { value: '', label: 'Select Status' },
                    { value: 'Available', label: 'Available' },
                    { value: 'In Use', label: 'In Use' },
                    { value: 'Under Maintenance', label: 'Under Maintenance' },
                    { value: 'Retired', label: 'Retired' },
                  ]}
                  required
                  isDarkMode={isDarkMode}
                />
              </div>
            )}
          </div>

          {/* Form Actions */}          <div className="flex justify-end gap-3 mt-6">
            <Button type="button" onClick={onClose} color="gray" disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" color="blue" loading={isLoading} loadingText="Updating..." disabled={isLoading}>
              Update All Selected Items
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

BulkEditForm.propTypes = {
  selectedItems: PropTypes.object.isRequired,
  items: PropTypes.array.isRequired,
  onClose: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
};

export default BulkEditForm;
