import { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTheme } from '../../../hooks/useTheme';
import Button from '../../Button';
import LoadingSpinner from '../../LoadingSpinner';
import { canPerformAction } from '../../../utils/roleUtils';
import BulkEditForm from '../forms/BulkEditForm';

function InventoryList({
  items,
  onEdit,
  onDelete,
  onPreviewQr,
  isLoading,
  role,
  filterByCategory = null,
}) {
  const { isDarkMode } = useTheme();
  // Permission checks
  const canEdit = canPerformAction(role, 'edit_inventory');
  const canDelete = canPerformAction(role, 'delete_inventory');
  // Allow all users to view QR codes, but generating might be restricted
  const canGenerateQr = true; // Changed to always allow QR button access

  // State for bulk operations
  const [selectedItems, setSelectedItems] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkEditForm, setShowBulkEditForm] = useState(false);

  // Filter items by category if filterByCategory is provided
  const displayedItems = useMemo(() => {
    if (!filterByCategory) return items;
    return items.filter((item) => item.category === filterByCategory);
  }, [items, filterByCategory]);

  // Toggle item selection for bulk operations
  const toggleItemSelection = useCallback((itemId) => {
    setSelectedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  }, []);

  // Toggle bulk mode on/off
  const toggleBulkMode = useCallback(() => {
    setBulkMode((prev) => !prev);
    if (bulkMode) {
      // Clear selections when exiting bulk mode
      setSelectedItems({});
      setShowBulkEditForm(false);
    }
  }, [bulkMode]);

  // Handle bulk edit
  const handleBulkEdit = useCallback(() => {
    const selectedCount = Object.values(selectedItems).filter(Boolean).length;
    if (selectedCount === 0) {
      return;
    }
    setShowBulkEditForm(true);
  }, [selectedItems]);
  // Handle bulk edit success
  const handleBulkEditSuccess = useCallback((_updatedItemIds, _updatedFields) => {
    // Keep the form open to allow for additional edits
    // But provide user feedback (handled in BulkEditForm)
    // Optionally, we could clear selections:
    // setSelectedItems({});
    // setShowBulkEditForm(false);
  }, []);

  // Close bulk edit form
  const closeBulkEditForm = useCallback(() => {
    setShowBulkEditForm(false);
  }, []);

  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    const selectedIds = Object.keys(selectedItems).filter((id) => selectedItems[id]);
    if (selectedIds.length === 0) {
      return;
    }

    // Confirmation before bulk delete
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected items?`)) {
      selectedIds.forEach((id) => {
        const itemToDelete = items.find((item) => item.id === id);
        if (itemToDelete) {
          onDelete(id, itemToDelete.name);
        }
      });
      // Clear selections after delete
      setSelectedItems({});
    }
  }, [selectedItems, items, onDelete]);

  const stockStatusColor = (qty) => {
    if (qty <= 0) return 'text-red-500';
    if (qty <= 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  // Select all items
  const selectAllItems = useCallback(() => {
    const newSelection = {};
    displayedItems.forEach((item) => {
      newSelection[item.id] = true;
    });
    setSelectedItems(newSelection);
  }, [displayedItems]);

  // Deselect all items
  const deselectAllItems = useCallback(() => {
    setSelectedItems({});
  }, []);

  // Memoize the row renderer to prevent unnecessary re-renders
  const Row = useCallback(
    ({ index, style }) => {
      const item = displayedItems[index];
      if (!item) return null;

      return (
        <div style={style} className="px-2">
          {' '}
          <div
            className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200 shadow-sm`}
          >
            {/* Checkbox for bulk selection - only shown in bulk mode */}
            {bulkMode && (
              <div className="flex items-center justify-center mr-2">
                <input
                  type="checkbox"
                  checked={!!selectedItems[item.id]}
                  onChange={() => toggleItemSelection(item.id)}
                  className="h-5 w-5 rounded focus:ring-blue-500"
                  aria-label={`Select ${item.name}`}
                />
              </div>
            )}

            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="font-semibold truncate text-lg">{item.name}</h3>
                <p className="flex items-center gap-2 mt-1">
                  <span className="text-opacity-75 font-medium">Brand:</span>
                  <span>{item.brand || 'N/A'}</span>
                </p>
                <p className="flex items-center gap-2">
                  <span className="text-opacity-75 font-medium">Serial:</span>
                  <span>{item.serialNumber || 'N/A'}</span>
                </p>
              </div>

              <div>
                <p className="flex items-center gap-2">
                  <span className="text-opacity-75 font-medium">Category:</span>
                  <span className="font-medium">{item.category}</span>
                </p>
                {item.lab && (
                  <p className="flex items-center gap-2">
                    <span className="text-opacity-75 font-medium">Lab:</span>
                    <span>{item.lab}</span>
                  </p>
                )}{' '}
                {item.itemCondition && (
                  <p className="flex items-center gap-2">
                    <span className="text-opacity-75 font-medium">Condition:</span>
                    <span
                      className={
                        item.itemCondition === 'Good'
                          ? 'text-green-500'
                          : item.itemCondition === 'Used'
                            ? 'text-yellow-500'
                            : item.itemCondition === 'Damaged'
                              ? 'text-red-500'
                              : ''
                      }
                    >
                      {item.itemCondition}
                    </span>
                  </p>
                )}
              </div>

              <div>
                <span className={`font-semibold text-lg ${stockStatusColor(item.quantity)}`}>
                  Qty: {item.quantity}
                </span>
                {item.lastUpdated && (
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {new Date(item.lastUpdated).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end justify-center gap-2 ml-2">
              {(canEdit || canDelete || canGenerateQr) && (
                <div className="flex flex-col gap-2 w-full">
                  {' '}
                  {canEdit && (
                    <Button
                      onClick={() => onEdit(item)}
                      color="blue"
                      size="sm"
                      className="min-w-[80px] w-full"
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      onClick={() => onDelete(item.id, item.name)}
                      color="red"
                      size="sm"
                      className="min-w-[80px] w-full"
                    >
                      Delete
                    </Button>
                  )}
                  {canGenerateQr && (
                    <Button
                      onClick={() => onPreviewQr(item)}
                      color="green"
                      size="sm"
                      className="min-w-[80px] w-full flex items-center justify-center gap-1"
                      title="Generate/View QR Code"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                      QR
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    },
    [
      displayedItems,
      isDarkMode,
      canEdit,
      canDelete,
      canGenerateQr,
      onEdit,
      onDelete,
      onPreviewQr,
      bulkMode,
      selectedItems,
      toggleItemSelection,
    ]
  );
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!Array.isArray(displayedItems) || displayedItems.length === 0) {
    return (
      <div
        className={`p-8 text-center rounded-lg shadow-md h-full ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}
      >
        <p className="text-lg">No inventory items found matching your criteria.</p>
      </div>
    );
  }

  // Calculate how many items are selected
  const selectedCount = Object.values(selectedItems).filter(Boolean).length;

  return (
    <div className="h-full shadow-md rounded-lg">
      {/* Bulk Edit Form */}
      {showBulkEditForm && (
        <div className="mb-4">
          <BulkEditForm
            selectedItems={selectedItems}
            items={items}
            onSuccess={handleBulkEditSuccess}
            onClose={() => {
              closeBulkEditForm();
              // We want to keep the selections after editing
            }}
          />
        </div>
      )}
      {/* Bulk actions toolbar */}
      {canEdit && (
        <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={toggleBulkMode}
                color={bulkMode ? 'blue' : 'gray'}
                size="sm"
                className="flex items-center"
              >
                {bulkMode ? 'Exit Bulk Mode' : 'Bulk Edit'}
              </Button>

              {bulkMode && (
                <>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedCount} items selected
                  </span>

                  <Button
                    onClick={selectAllItems}
                    color="gray"
                    size="sm"
                    disabled={displayedItems.length === 0}
                  >
                    Select All
                  </Button>

                  {selectedCount > 0 && (
                    <Button onClick={deselectAllItems} color="gray" size="sm">
                      Deselect All
                    </Button>
                  )}
                </>
              )}
            </div>

            {bulkMode && selectedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <Button onClick={handleBulkEdit} color="blue" size="sm">
                    Edit Selected
                  </Button>
                )}

                {canDelete && (
                  <Button onClick={handleBulkDelete} color="red" size="sm">
                    Delete Selected
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}{' '}
      <div className="relative flex-1 min-h-[600px] h-[calc(100vh-12rem)]">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={displayedItems.length}
              itemSize={180}
              width={width}
              overscanCount={5}
              className={`scrollbar-thin ${isDarkMode ? 'scrollbar-track-gray-800 scrollbar-thumb-gray-600' : 'scrollbar-track-gray-200 scrollbar-thumb-gray-400'}`}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    </div>
  );
}

InventoryList.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      name: PropTypes.string,
      brand: PropTypes.string,
      serialNumber: PropTypes.string,
      category: PropTypes.string,
      lab: PropTypes.string,
      itemCondition: PropTypes.string,
      quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    })
  ),
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onPreviewQr: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  role: PropTypes.string,
  filterByCategory: PropTypes.string,
  isDarkMode: PropTypes.bool,
};

export default InventoryList;
