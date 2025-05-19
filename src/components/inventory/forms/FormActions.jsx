import React from 'react';
import PropTypes from 'prop-types';
import Button from '../../Button';

/**
 * Form action buttons component
 */
function FormActions({ isLoading, onCancel, isEditing = false, isDarkMode }) {
  return (
    <div
      className={`mt-6 flex justify-end space-x-4 py-4 ${isDarkMode ? 'border-t border-gray-700' : 'border-t border-gray-200'}`}
    >
      <Button onClick={onCancel} color="gray" size="md" type="button" disabled={isLoading}>
        Cancel
      </Button>

      <Button 
        color="blue" 
        size="md"        type="submit" 
        loading={isLoading} 
        loadingText={isEditing ? 'Saving Changes...' : 'Adding Item...'}
        disabled={isLoading}
      >
        {isEditing ? 'Save Changes' : 'Add Item'}
      </Button>
    </div>
  );
}

FormActions.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  isEditing: PropTypes.bool,
  isDarkMode: PropTypes.bool,
};

export default React.memo(FormActions);
