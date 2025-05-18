import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import ErrorBoundary from '../components/ErrorBoundary';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchFilters from '../components/inventory/filters/SearchFilters';
import BulkUploadSection from '../components/inventory/forms/BulkUploadSection';
import QRStatsSection from '../components/inventory/stats/QRStatsSection';
import InventoryStatsCharts from '../components/inventory/stats/InventoryStatsCharts';
import CategoryList from '../components/inventory/lists/CategoryList';
import InventoryList from '../components/inventory/lists/InventoryList';
import AddEditForm from '../components/inventory/forms/AddEditForm';
import QRCodePreview from '../components/inventory/modals/QRCodePreview';
import useInventory from '../hooks/useInventory';
import useSearch from '../hooks/useSearch';
import { useQRCode } from '../hooks/useQRCode';
import { toast } from 'react-toastify';
import { canPerformAction } from '../utils/roleUtils';

function Inventory({ isInDashboard = false }) {
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // State to control form visibility
  const [showAddEditForm, setShowAddEditForm] = useState(false);
  // State for selected category (filter)
  const [selectedCategory, setSelectedCategory] = useState(null);

  // More granular loading states for better UX
  const [loadingStates, setLoadingStates] = useState({
    fetchingInventory: true, // Initial fetch of inventory items
    addingItem: false, // Adding a new inventory item
    editingItem: false, // Editing an existing item
    deletingItem: false, // Deleting an item
    bulkUploading: false, // Bulk uploading items from CSV
    generatingQR: false, // Generating QR code
    exportingData: false, // Exporting inventory data
  });

  // Helper function to update loading states
  const updateLoadingState = useCallback((stateKey, value) => {
    setLoadingStates((prev) => ({ ...prev, [stateKey]: value }));
  }, []);

  // Fetch inventory data and manage item state (from useInventory hook)
  const {
    items,
    isLoading,
    error,
    deleteItem,
    bulkUpload,
    isUploading,
    defaultFormData,
    editingItem,
    setEditingItem,
    setCsvData,
    csvData,
  } = useInventory(user);

  // Wrapper for bulkUpload to use our new loading states
  const handleBulkUpload = useCallback(async () => {
    try {
      updateLoadingState('bulkUploading', true);
      await bulkUpload();
    } catch (error) {
      console.error('Bulk upload error:', error);
    } finally {
      updateLoadingState('bulkUploading', false);
    }
  }, [bulkUpload, updateLoadingState]);

  // Search and filter logic (from useSearch hook)
  const {
    searchField,
    filterCondition,
    filterLab,
    setSearchField,
    setFilterCondition,
    setFilterLab,
    handleSearchChange,
    filteredItems,
    categoryGroups,
  } = useSearch(items);

  // QR Code related state and handlers (from useQRCode hook)
  const {
    qrStats, // QR statistics
    qrPreview, // The item currently selected for QR preview (determines modal visibility)
    generatedQrData, // The actual generated data for the QR code
    isGeneratingQr, // Loading state during QR data generation
    qrError, // Error state specific to QR operations
    previewQrCode, // Handler to trigger the QR preview process
    closeQrPreview, // Handler to close the QR preview modal and clear state
  } = useQRCode(items, user); // Pass items and user to the hook

  // Wrapper for previewQrCode to use our granular loading states
  const handlePreviewQrCode = useCallback(
    async (item) => {
      try {
        updateLoadingState('generatingQR', true);
        await previewQrCode(item);
      } finally {
        // The loading state will be updated by our useEffect that watches isGeneratingQr
      }
    },
    [previewQrCode, updateLoadingState]
  );

  // Synchronize our loading states with the hook
  useEffect(() => {
    updateLoadingState('fetchingInventory', isLoading);
  }, [isLoading, updateLoadingState]);

  useEffect(() => {
    updateLoadingState('bulkUploading', isUploading);
  }, [isUploading, updateLoadingState]);

  useEffect(() => {
    updateLoadingState('generatingQR', isGeneratingQr);
  }, [isGeneratingQr, updateLoadingState]);

  // Handler for category filtering
  const handleCategoryToggle = useCallback((category) => {
    setSelectedCategory((prev) => (prev === category ? null : category));
  }, []);

  // Handler for editing an item
  const handleEdit = useCallback(
    (item) => {
      setEditingItem(item);
      setShowAddEditForm(true);
      // Scroll to the form for better UX
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: 'smooth',
        });
      }, 100);
    },
    [setEditingItem]
  );

  // Handler for adding a new item
  const handleAddItem = useCallback(() => {
    setEditingItem(defaultFormData);
    setShowAddEditForm(true);
    // Scroll to the form for better UX
    setTimeout(() => {
      window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }, [defaultFormData, setEditingItem]);

  // Handler for closing the form
  const handleFormClose = useCallback(() => {
    setEditingItem(null);
    setShowAddEditForm(false);
  }, [setEditingItem]);
  // Handler for deleting an item
  const handleDeleteItem = useCallback(
    async (itemId, itemName) => {
      try {
        const confirmDelete = window.confirm(`Are you sure you want to delete "${itemName}"?`);
        if (!confirmDelete) return;

        updateLoadingState('deletingItem', true);
        await deleteItem(itemId); // Use the deleteItem function from useInventory
        toast.success(`${itemName} deleted successfully!`);
      } catch (error) {
        console.error('Error deleting item:', error);
        toast.error(`Failed to delete ${itemName}. ${error.message || ''}`);
      } finally {
        updateLoadingState('deletingItem', false);
      }
    },
    [deleteItem, updateLoadingState]
  );

  // Permission check (simplified)
  const canEdit = canPerformAction(role, 'edit_inventory');
  const canDelete = canPerformAction(role, 'delete_inventory');
  const canAddEditDelete = canEdit || canDelete; // Either can edit or delete
  // Early return for empty inventory
  if (!loadingStates.fetchingInventory && !error && (!items || items.length === 0)) {
    return (
      <ErrorBoundary>
        <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} w-full`}>
          <div className={`w-full p-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            <div className="mb-8">
              {!isInDashboard && (
                <Button
                  onClick={() => navigate(-1)}
                  color="gray"
                  size="md"
                  className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                  aria-label="Go back to the previous page"
                >
                  <span className="mr-2">←</span> Back
                </Button>
              )}
              <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

              <div
                className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-md`}
              >
                <h2 className="text-xl mb-4">No Inventory Items Found</h2>
                <p className="mb-4">There are currently no items in the inventory.</p>
                {canAddEditDelete ? (
                  <div className="space-y-4">
                    <p>As an administrator, you can:</p>
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={handleAddItem}
                        color="blue"
                        className="inline-flex items-center"
                      >
                        <span className="mr-2">+</span> Add New Item
                      </Button>
                    </div>

                    {showAddEditForm && (
                      <div>
                        {/* BulkUploadSection shown with the Add New Item form */}
                        <BulkUploadSection
                          setCsvData={setCsvData}
                          csvData={csvData || []}
                          bulkUpload={handleBulkUpload}
                          isUploading={isUploading}
                          isDarkMode={isDarkMode}
                        />
                        <AddEditForm
                          onSuccess={handleFormClose}
                          editingItem={editingItem}
                          defaultFormData={defaultFormData}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <p className="text-lg mb-2">No items are currently available.</p>
                    <p>Please check back later or contact an administrator.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }
  // Rest of the component for non-empty inventory
  return (
    <ErrorBoundary>
      <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} w-full`}>
        {/* Main Inventory Loading and Error Feedback */}
        {loadingStates.fetchingInventory && !error && <LoadingSpinner fullScreen />}
        {error && (
          <div className="text-red-500 text-center mb-4">
            Error loading inventory: {error.message || error}
          </div>
        )}
        {/* Full-width content */}
        <div className={`w-full p-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <div className="mb-6">
            {/* Back Button */}
            {!isInDashboard && (
              <Button
                onClick={() => navigate(-1)}
                color="gray"
                size="md"
                className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                aria-label="Go back to the previous page"
              >
                <span className="mr-2">←</span> Back
              </Button>
            )}
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold">Inventory Management</h1>

              <div className="flex gap-3">
                {/* Only keep the Add New Item button */}
                {canAddEditDelete && (
                  <Button
                    onClick={handleAddItem}
                    color="blue"
                    size="md"
                    className="inline-flex items-center"
                  >
                    <span className="mr-2">+</span> Add New Item
                  </Button>
                )}
              </div>
            </div>

            {/* QR Stats and Inventory Charts in a responsive grid - MOVED UP TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
              {/* QR Stats Section */}
              <div className="w-full">
                <QRStatsSection qrStats={qrStats} isDarkMode={isDarkMode} />
              </div>
              {/* Inventory Statistics Charts */}
              <div className="w-full">
                <InventoryStatsCharts items={items} isDarkMode={isDarkMode} />
              </div>
            </div>

            {/* Search and Filter Component - MADE MORE COMPACT */}
            <SearchFilters
              searchField={searchField}
              setSearchField={setSearchField}
              handleSearchChange={handleSearchChange}
              filterCondition={filterCondition}
              setFilterCondition={setFilterCondition}
              filterLab={filterLab}
              setFilterLab={setFilterLab}
              isDarkMode={isDarkMode}
              isCompact={true}
            />

            {/* Category List - CONVERTED TO HORIZONTAL SCROLLABLE */}
            <div className="mb-4 overflow-x-auto">
              <CategoryList
                categoryGroups={categoryGroups}
                toggleCategory={handleCategoryToggle}
                isDarkMode={isDarkMode}
                selectedCategory={selectedCategory}
                isHorizontal={true}
              />
            </div>

            {/* Category filtering heading */}
            {selectedCategory && (
              <div
                className={`mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}
              >
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Category: {selectedCategory}</h2>
                  <Button onClick={() => setSelectedCategory(null)} color="gray" size="sm">
                    Clear Filter
                  </Button>
                </div>
              </div>
            )}

            {/* Inventory List and Add/Edit Form side by side */}
            <div className="flex flex-col lg:flex-row gap-6 mb-6">
              {/* The main InventoryList displaying filtered search results */}
              <div className={`${canAddEditDelete && showAddEditForm ? 'lg:w-1/2' : 'w-full'}`}>
                <InventoryList
                  items={filteredItems} // Pass filtered items from search
                  onEdit={handleEdit}
                  onDelete={handleDeleteItem}
                  onPreviewQr={handlePreviewQrCode} // Pass the handlePreviewQrCode handler
                  isLoading={loadingStates.fetchingInventory}
                  role={role}
                  isDarkMode={isDarkMode}
                  filterByCategory={selectedCategory} // Pass the selected category for filtering
                />
              </div>

              {/* Add/Edit Item Form - side by side with list when visible */}
              {canAddEditDelete && showAddEditForm && (
                <div className="lg:w-1/2">
                  {/* BulkUploadSection shown with the Add New Item form */}
                  <BulkUploadSection
                    setCsvData={setCsvData}
                    csvData={csvData || []}
                    bulkUpload={handleBulkUpload}
                    isUploading={isUploading}
                    isDarkMode={isDarkMode}
                  />
                  <div
                    className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md mt-4`}
                  >
                    <h2 className="text-xl font-semibold mb-4">
                      {editingItem?.id ? 'Edit Item' : 'Add New Item'}
                    </h2>
                    <AddEditForm
                      onSuccess={handleFormClose}
                      editingItem={editingItem}
                      defaultFormData={defaultFormData}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* QR Preview Modal (render if qrPreview item is set) */}
            {qrPreview && (
              <QRCodePreview
                item={qrPreview} // Pass the item data
                qrData={generatedQrData} // Pass the generated QR data
                onClose={closeQrPreview} // Pass the handler to close the modal
                isGenerating={loadingStates.generatingQR} // Use granular loading states
                qrError={qrError} // Pass error state from hook
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Inventory;
