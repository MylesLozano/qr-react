import { useCallback, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTheme } from '../../../hooks/useTheme';
import Button from '../../Button';
import LoadingSpinner from '../../LoadingSpinner';
import { canPerformAction, canGenerateQR } from '../../../utils/roleUtils';
import BulkEditForm from '../forms/BulkEditForm';

function InventoryList({
  items,
  onEdit,
  onDelete,
  onBulkDelete,
  onPreviewQr,
  onAddItem, // New prop for Add New Item functionality
  isLoading,
  isBulkDeleting,
  role,
  filterByCategory = null,
  isAddEditFormActive = false, // New prop to control the layout
}) {
  const { isDarkMode } = useTheme();  // Permission checks
  const canEdit = canPerformAction(role, 'edit_inventory');
  const canDelete = canPerformAction(role, 'delete_inventory');
  // Always allow viewing QR codes for all users
  const canViewQr = true; // All users can view QR codes
  const canGenerateQrPermission = canGenerateQR(role); // Renamed to avoid conflict with function name if any

  // State for bulk operations
  const [selectedItems, setSelectedItems] = useState({});
  const [bulkMode, setBulkMode] = useState(false);
  const [showBulkEditForm, setShowBulkEditForm] = useState(false); // This will control the visibility of the bulk edit *area*
  const [isActualBulkEditFormExpanded, setIsActualBulkEditFormExpanded] = useState(false); // Controls if the form itself is expanded
  // State to track which items are being deleted
  const [deletingItems, setDeletingItems] = useState({});

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
      // Clear selections and hide bulk edit form area when exiting bulk mode
      setSelectedItems({});
      setShowBulkEditForm(false);
      setIsActualBulkEditFormExpanded(false); // Also collapse the form itself
    }
  }, [bulkMode]);

  // Handle bulk edit
  const handleBulkEdit = useCallback(() => {
    const selectedCount = Object.values(selectedItems).filter(Boolean).length;
    if (selectedCount === 0) {
      return;
    }
    setShowBulkEditForm(true); // Show the area for bulk editing
    setIsActualBulkEditFormExpanded(false); // Start with the form itself collapsed
  }, [selectedItems]);

  // Handle bulk edit success
  const handleBulkEditSuccess = useCallback((_updatedItemIds, _updatedFields) => {
    setIsActualBulkEditFormExpanded(false); // Collapse the form after success
    // showBulkEditForm remains true, so the toggle button area stays
  }, []);

  // Close bulk edit form
  const closeBulkEditForm = useCallback(() => {
    setShowBulkEditForm(false); // Hide the entire bulk edit area
    setIsActualBulkEditFormExpanded(false); // Ensure form is also marked as collapsed
  }, []);  // Bulk action handlers
  const handleBulkDelete = useCallback(() => {
    const selectedIds = Object.keys(selectedItems).filter((id) => selectedItems[id]);
    if (selectedIds.length === 0) {
      return;
    }
    
    // Use the onBulkDelete prop which has the appropriate confirmation
    onBulkDelete(selectedIds).then(result => {
      // Clear selections if deletion was successful
      if (result?.success) {
        setSelectedItems({});
      }
    }).catch(err => {
      console.error('Error in bulk delete:', err);
    });
    
  }, [selectedItems, onBulkDelete]);

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

  // Wrap onDelete to track which item is being deleted
  const handleItemDelete = useCallback((itemId, itemName) => {
    setDeletingItems(prev => ({ ...prev, [itemId]: true }));
    
    // Call the original onDelete and clean up when done
    return onDelete(itemId, itemName)
      .finally(() => {
        setDeletingItems(prev => {
          const newState = { ...prev };
          delete newState[itemId];
          return newState;
        });
      });
  }, [onDelete]);

  // Memoize the row renderer to prevent unnecessary re-renders
  const Row = useCallback(
    ({ index, style }) => {
      const item = displayedItems[index];
      if (!item) return null;

      // Add isDeleting flag to the item
      const isItemDeleting = !!deletingItems[item.id];      return (
        <div style={style} className="px-2">
          <div
            className={`p-3 sm:p-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} mb-3 
            flex flex-col transition-colors duration-200 shadow-sm ${isItemDeleting ? 'opacity-70' : ''}`}
          >
            {/* Title and Checkbox (common for both layouts) */}
            <div className="flex items-start gap-3 mb-3">
              {/* Checkbox for bulk selection */}
              {bulkMode && (
                <div className="flex items-center justify-center mt-1 flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={!!selectedItems[item.id]}
                    onChange={() => toggleItemSelection(item.id)}
                    className="h-4 w-4 rounded focus:ring-blue-500"
                    aria-label={`Select ${item.name}`}
                  />
                </div>
              )}

              {/* Item title and unit */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">{item.name}</h3>
                {item.unitNumber && (
                  <p className="text-sm text-opacity-75 mt-1">
                    <span className="font-medium">Unit:</span> {item.unitNumber}
                  </p>
                )}
              </div>
            </div>

            {isAddEditFormActive ? (
              /* LAYOUT WHEN ADDEDITFORM IS ACTIVE - Buttons at the bottom */
              <>
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Details grid - responsive layout */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                    {/* Column 1: Basic info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-opacity-75 font-medium min-w-[50px]">Brand:</span>
                        <span className="truncate">{item.brand || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-opacity-75 font-medium min-w-[50px]">Serial:</span>
                        <span className="truncate">{item.serialNumber || 'N/A'}</span>
                      </div>
                      {item.status && (
                        <div className="flex items-center gap-2">
                          <span className="text-opacity-75 font-medium min-w-[50px]">Status:</span>
                          <span className="truncate">{item.status}</span>
                        </div>
                      )}
                    </div>

                    {/* Column 2: Category and lab info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-opacity-75 font-medium min-w-[60px]">Category:</span>
                        <span className="font-medium truncate">{item.category}</span>
                      </div>
                      {item.lab && (
                        <div className="flex items-center gap-2">
                          <span className="text-opacity-75 font-medium min-w-[60px]">Lab:</span>
                          <span className="truncate">{item.lab}</span>
                        </div>
                      )}
                      {item.itemCondition && (
                        <div className="flex items-center gap-2">
                          <span className="text-opacity-75 font-medium min-w-[60px]">Condition:</span>
                          <span
                            className={`truncate ${
                              item.itemCondition === 'Good'
                                ? 'text-green-500'
                                : item.itemCondition === 'Used'
                                  ? 'text-yellow-500'
                                  : item.itemCondition === 'Damaged'
                                    ? 'text-red-500'
                                    : ''
                            }`}
                          >
                            {item.itemCondition}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Column 3: Quantity and date */}
                    <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                      <div className="flex items-center gap-2">
                        <span className="text-opacity-75 font-medium">Quantity:</span>
                        <span className={`font-semibold ${stockStatusColor(item.quantity)}`}>
                          {item.quantity}
                        </span>
                      </div>
                      {item.lastUpdated && (
                        <div className="flex items-center gap-2">
                          <span className="text-opacity-75 font-medium">Updated:</span>
                          <span className="text-xs text-gray-500">
                            {new Date(item.lastUpdated).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Action buttons in a row at the bottom for expanded layout */}
                <div className="flex flex-wrap gap-2 justify-end mt-3">
                  {(canEdit || canDelete || canGenerateQrPermission || canViewQr) && (
                    <>
                      {canEdit && (
                        <Button
                          onClick={() => onEdit(item)}
                          color="blue"
                          size="sm"
                          className="min-w-[70px] text-xs"
                        >
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          onClick={() => handleItemDelete(item.id, item.name)}
                          color="red"
                          size="sm"
                          className="min-w-[70px] text-xs"
                          loading={deletingItems[item.id]}
                          loadingText="..."
                        >
                          Delete
                        </Button>
                      )}
                      {canViewQr && (
                        <Button
                          onClick={() => onPreviewQr(item)}
                          color="green"
                          size="sm"
                          className="min-w-[70px] text-xs"
                          title="QR Action"
                        >
                          QR
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            ) : (
              // COMPACT LAYOUT WHEN ADDEDITFORM IS NOT ACTIVE
              <>
                {/* Compact details grid with all info in one column */}
                <div className="grid grid-cols-1 text-sm mb-3">
                  {/* All details including quantity */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 items-center">
                      <div className="flex items-center">
                        <span className="text-opacity-75 font-medium min-w-[50px]">Brand:</span>
                        <span className="truncate">{item.brand || 'N/A'}</span>
                      </div>
                      <div className="flex items-center">
                        <span className="text-opacity-75 font-medium min-w-[50px]">Serial:</span>
                        <span className="truncate">{item.serialNumber || 'N/A'}</span>
                      </div>
                      {item.status && (
                        <div className="flex items-center">
                          <span className="text-opacity-75 font-medium min-w-[50px]">Status:</span>
                          <span className="truncate">{item.status}</span>
                        </div>
                      )}
                      <div className="flex items-center">
                        <span className="text-opacity-75 font-medium min-w-[60px]">Category:</span>
                        <span className="font-medium truncate">{item.category}</span>
                      </div>
                      {item.lab && (
                        <div className="flex items-center">
                          <span className="text-opacity-75 font-medium min-w-[60px]">Lab:</span>
                          <span className="truncate">{item.lab}</span>
                        </div>
                      )}
                      {item.itemCondition && (
                        <div className="flex items-center">
                          <span className="text-opacity-75 font-medium min-w-[70px]">Condition:</span>
                          <span
                            className={`truncate ${
                              item.itemCondition === 'Good'
                                ? 'text-green-500'
                                : item.itemCondition === 'Used'
                                  ? 'text-yellow-500'
                                  : item.itemCondition === 'Damaged'
                                    ? 'text-red-500'
                                    : ''
                            }`}
                          >
                            {item.itemCondition}
                          </span>
                        </div>
                      )}
                      {/* Quantity is now part of the details */}
                      <div className="flex items-center">
                        <span className="text-opacity-75 font-medium min-w-[60px]">Quantity:</span>
                        <span className={`font-bold ${stockStatusColor(item.quantity)}`}>{item.quantity}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action buttons in a row for compact layout */}
                <div className="flex flex-wrap gap-2 justify-end">
                  {(canEdit || canDelete || canGenerateQrPermission || canViewQr) && (
                    <>
                      {canEdit && (
                        <Button
                          onClick={() => onEdit(item)}
                          color="blue"
                          size="sm"
                          className="min-w-[70px] text-xs"
                        >
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          onClick={() => handleItemDelete(item.id, item.name)}
                          color="red"
                          size="sm"
                          className="min-w-[70px] text-xs"
                          loading={deletingItems[item.id]}
                          loadingText="..."
                        >
                          Delete
                        </Button>
                      )}
                      {canViewQr && (
                        <Button
                          onClick={() => onPreviewQr(item)}
                          color="green"
                          size="sm"
                          className="min-w-[70px] text-xs"
                          title="QR Action"
                        >
                          QR
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      );
    },    
    [
      displayedItems,
      isDarkMode,
      canEdit,
      canDelete,
      canGenerateQrPermission, // Used renamed permission variable
      canViewQr,
      onEdit,
      onPreviewQr,
      bulkMode,
      selectedItems,
      toggleItemSelection,
      deletingItems,
      handleItemDelete,
      isAddEditFormActive // Add dependency on the new prop
    ]
  );

  // Loading overlay for bulk operations
  const renderLoadingOverlay = () => {
    if (!isBulkDeleting) return null;
    
    return (
      <div className="absolute inset-0 bg-black bg-opacity-40 z-10 flex items-center justify-center">
        <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} max-w-md text-center shadow-lg`}>
          <div className="animate-pulse mb-4">
            <svg className="animate-spin h-10 w-10 mx-auto text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Deleting Items</h3>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
            Please wait while we delete the selected items...
          </p>
        </div>
      </div>
    );
  };
  
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
    <div className="h-full shadow-md rounded-lg relative flex flex-col"> {/* MODIFIED LINE */}
      {/* Loading overlay for bulk operations */}
      {renderLoadingOverlay()}

      {/* Bulk Edit Area - shows toggle button and then the form */}
      {showBulkEditForm && (
        <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-200'} shadow`}>
          <Button
            onClick={() => setIsActualBulkEditFormExpanded(prev => !prev)}
            color="indigo"
            size="sm"
            className="w-full mb-3 text-sm"
          >
            {isActualBulkEditFormExpanded ? 'Hide Bulk Edit Form' : `Configure Edit for ${selectedCount} Item(s)`}
          </Button>

          {isActualBulkEditFormExpanded && (
            <BulkEditForm
              selectedItems={selectedItems}
              items={items}
              onSuccess={handleBulkEditSuccess}
              onClose={closeBulkEditForm}
            />
          )}
        </div>
      )}

      {/* Bulk actions toolbar */}
      {canEdit && (
        <div className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={toggleBulkMode}
                color={bulkMode ? 'blue' : 'gray'}
                size="sm"
                className="flex items-center text-sm"
              >
                {bulkMode ? 'Exit Bulk' : 'Bulk Edit'}
              </Button>
              {/* Add New Item button, only show when not in bulk mode */}
              {typeof onAddItem === 'function' && !bulkMode && (
                <Button
                  onClick={onAddItem}
                  color="blue"
                  size="sm"
                  className="flex items-center text-sm"
                >
                  <span className="mr-1">+</span> Add New Item
                </Button>
              )}
              {bulkMode && (
                <>
                  <Button
                    onClick={selectAllItems}
                    color="gray"
                    size="sm"
                    className="text-sm"
                    disabled={displayedItems.length === 0}
                  >
                    Select All
                  </Button>
                  {selectedCount > 0 && (
                    <Button 
                      onClick={deselectAllItems} 
                      color="gray" 
                      size="sm"
                      className="text-sm"
                    >
                      Deselect All
                    </Button>
                  )}
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {selectedCount} selected
                  </span>
                </>
              )}
            </div>

            {bulkMode && selectedCount > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {canEdit && (
                  <Button 
                    onClick={handleBulkEdit} 
                    color="blue" 
                    size="sm"
                    className="text-sm"
                  >
                    Edit Selected
                  </Button>
                )}
                {canDelete && (
                  <Button 
                    onClick={handleBulkDelete} 
                    color="red" 
                    size="sm"
                    className="text-sm"
                    loading={isBulkDeleting}
                    loadingText="Deleting..."
                  >
                    Delete Selected
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="relative flex-1 min-h-[600px]">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={displayedItems.length}              // MODIFIED LINE: Dynamic row height based on screen width and form state
              itemSize={(() => {
                // Base size on screen width and whether edit form is active
                if (isAddEditFormActive) {
                  // Taller rows when edit form is active
                  return width < 640 ? 420 : width < 1024 ? 340 : 280;
                } else {
                  // More compact rows when edit form is not active
                  return width < 640 ? 340 : width < 1024 ? 260 : 220;
                }
              })()}
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
      status: PropTypes.string,
      unitNumber: PropTypes.string, // Added unitNumber based on usage in Row
      lastUpdated: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]), // Added lastUpdated based on usage
    })
  ),
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onBulkDelete: PropTypes.func.isRequired,
  onPreviewQr: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
  isBulkDeleting: PropTypes.bool,
  role: PropTypes.string,
  filterByCategory: PropTypes.string,
  isAddEditFormActive: PropTypes.bool, // New prop for controlling layout
  // isDarkMode: PropTypes.bool, // isDarkMode is from useTheme, not a prop
};

export default InventoryList;