import React from "react";
import PropTypes from "prop-types";
import Button from "../../Button";

/**
 * Form action buttons component
 */
function FormActions({
  isLoading,
  onCancel,
  isEditing = false
}) {
  return (
    <div className="mt-4 flex justify-end space-x-4">
      <Button
        onClick={onCancel}
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
  );
}

FormActions.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired,
  isEditing: PropTypes.bool
};

export default React.memo(FormActions);
