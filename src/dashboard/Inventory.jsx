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
import CategoryDetails from '../components/inventory/modals/CategoryDetails';
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

  // State for managing category details modal
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  // Handler to open the category details modal
  const toggleCategory = useCallback((category) => {
    setSelectedCategory(category);
    setShowCategoryDetails(true);
  }, []);

  // Handler to close the category details modal
  const closeCategoryDetails = useCallback(() => {
    setShowCategoryDetails(false);
    setSelectedCategory(null);
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
        <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div
            className={`container mx-auto p-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}
          >
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
                className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}
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
      <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {/* Main Inventory Loading and Error Feedback */}
        {loadingStates.fetchingInventory && !error && <LoadingSpinner fullScreen />}
        {error && (
          <div className="text-red-500 text-center mb-4">
            Error loading inventory: {error.message || error}
          </div>
        )}

        {/* Use a responsive container with padding */}
        <div className={`container mx-auto p-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <div className="mb-8">
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
            {/* Search and Filter Component */}
            <SearchFilters
              searchField={searchField}
              setSearchField={setSearchField}
              handleSearchChange={handleSearchChange}
              filterCondition={filterCondition}
              setFilterCondition={setFilterCondition}
              filterLab={filterLab}
              setFilterLab={setFilterLab}
              isDarkMode={isDarkMode}
            />{' '}
            {/* QR Stats Section (Moved to be shown alone) */}
            <div className="mb-6">
              <QRStatsSection qrStats={qrStats} isDarkMode={isDarkMode} />
            </div>
            {/* Inventory Statistics Charts - Added to show lab and condition distribution */}
            <div className="mb-6">
              <InventoryStatsCharts items={items} isDarkMode={isDarkMode} />
            </div>
            {/* Categories and Virtualized List side-by-side */}
            {/* Adjust stacking on smaller screens */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Category List */}
              <CategoryList
                categoryGroups={categoryGroups}
                toggleCategory={toggleCategory}
                isDarkMode={isDarkMode}
              />
              {/* The main InventoryList displaying filtered search results */}{' '}
              <InventoryList
                items={filteredItems} // Pass filtered items from search
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onPreviewQr={handlePreviewQrCode} // Pass the handlePreviewQrCode handler
                isLoading={loadingStates.fetchingInventory}
                role={role}
                isDarkMode={isDarkMode}
              />
            </div>
            {/* Add/Edit Item Form - only shown when needed */}
            {canAddEditDelete && showAddEditForm && (
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
            {/* Category Details Modal */}
            {showCategoryDetails && (
              <CategoryDetails
                category={selectedCategory}
                items={items} // Pass the *full* items list to CategoryDetails
                onClose={closeCategoryDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onPreviewQr={handlePreviewQrCode} // Pass the handlePreviewQrCode handler
                isLoading={loadingStates.fetchingInventory}
                role={role}
                isDarkMode={isDarkMode}
              />
            )}
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
