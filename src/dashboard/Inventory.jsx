// File: src/dashboard/Inventory.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ErrorBoundary from '../components/ErrorBoundary';
import Button from "../components/Button";
import LoadingSpinner from '../components/LoadingSpinner';
import SearchFilters from '../components/inventory/SearchFilters';
import BulkUploadSection from '../components/inventory/BulkUploadSection';
import QRStatsSection from '../components/inventory/QRStatsSection';
import CategoryList from '../components/inventory/CategoryList';
import InventoryList from '../components/inventory/InventoryList';
import AddEditForm from '../components/inventory/AddEditForm';
import CategoryDetails from '../components/inventory/CategoryDetails';
// Import QRCodePreview from the correct path
import QRCodePreview from '../components/inventory/QRCodePreview';
import useInventory from '../hooks/useInventory';
import useSearch from '../hooks/useSearch';
import useQRCode from '../hooks/useQRCode';
import { toast } from 'react-toastify';
import Papa from 'papaparse';
import { canPerformAction } from '../utils/roleUtils';

function Inventory() {
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();
  const navigate = useNavigate();

  // Fetch inventory data and manage item state (from useInventory hook)
  const {
    items,
    isLoading,
    error,
    deleteItem,
    bulkUpload,
    isUploading,
    formData,
    setFormData,
    defaultFormData,
    isEditing,
    setIsEditing,
    editingItem,
    setEditingItem,
    validationErrors,
    setCsvData,
    csvData,
    handleSaveEdit
  } = useInventory(user);

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
    categoryGroups
  } = useSearch(items);

  // QR Code related state and handlers (from useQRCode hook)
  const {
    qrStats, // QR statistics
    qrPreview, // The item currently selected for QR preview (determines modal visibility)
    setQrPreview, // Setter to control qrPreview state (can be used to close modal)
    generatedQrData, // The actual generated data for the QR code
    isGeneratingQr, // Loading state during QR data generation
    qrError, // Error state specific to QR operations
    previewQrCode, // Handler to trigger the QR preview process
    closeQrPreview // Handler to close the QR preview modal and clear state
  } = useQRCode(items, user); // Pass items and user to the hook

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
  const handleEdit = useCallback((item) => {
    setEditingItem(item);
    setIsEditing(true);
    // Add logic here to show/scroll to the form if needed
  }, [setEditingItem, setIsEditing]);

  // Handler for deleting an item
  const handleDeleteItem = useCallback(async (itemId, itemName) => {
    try {
      const confirmDelete = window.confirm(`Are you sure you want to delete "${itemName}"?`);
      if (!confirmDelete) return;

      await deleteItem(itemId); // Use the deleteItem function from useInventory
      toast.success(`${itemName} deleted successfully!`);
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error(`Failed to delete ${itemName}. ${error.message || ''}`);
    }
  }, [deleteItem]);

  // Permission check (simplified)
  const canEdit = canPerformAction(role, 'edit_inventory');
  const canDelete = canPerformAction(role, 'delete_inventory');
  const canGenerateQr = canPerformAction(role, 'generate_reports');
  const canAddEditDelete = canEdit || canDelete; // Either can edit or delete

  // Early return for empty inventory
  if (!isLoading && !error && (!items || items.length === 0)) {
    return (
      <ErrorBoundary>
        <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
          <div className={`container mx-auto p-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
            <div className="mb-8">
              <Button
                onClick={() => navigate(-1)}
                color="gray"
                size="md"
                className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
                aria-label="Go back to the previous page"
              >
                <span className="mr-2">←</span> Back
              </Button>
              <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

              <div className={`p-8 rounded-lg text-center ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <h2 className="text-xl mb-4">No Inventory Items Found</h2>
                <p className="mb-4">There are currently no items in the inventory.</p>
                {canAddEditDelete ? (
                  <div className="space-y-4">
                    <p>As an administrator, you can:</p>
                    <div className="flex justify-center gap-4">
                      <Button
                        onClick={() => setIsEditing(true)}
                        color="blue"
                        className="inline-flex items-center"
                      >
                        <span className="mr-2">+</span> Add New Item
                      </Button>
                      {isEditing && (
                        <AddEditForm
                          formData={formData}
                          setFormData={setFormData}
                          isEditing={isEditing}
                          setIsEditing={setIsEditing}
                          editingItem={editingItem}
                          setEditingItem={setEditingItem}
                          handleSaveEdit={handleSaveEdit}
                          defaultFormData={defaultFormData}
                          validationErrors={validationErrors}
                          isLoading={isLoading}
                          isDarkMode={isDarkMode}
                        />
                      )}
                    </div>
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
        {isLoading && !error && <LoadingSpinner fullScreen />}
        {error && (
          <div className="text-red-500 text-center mb-4">
            Error loading inventory: {error.message || error}
          </div>
        )}

        {/* Use a responsive container with padding */}
        <div className={`container mx-auto p-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <div className="mb-8">
            {/* Back Button */}
            <Button
              onClick={() => navigate(-1)}
              color="gray"
              size="md"
              className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
              aria-label="Go back to the previous page"
            >
              <span className="mr-2">←</span> Back
            </Button>
            <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

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
            />

            {/* Bulk Upload and QR Stats side-by-side */}
            {/* Adjust spacing and stacking on smaller screens */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Render BulkUploadSection only if user has permission */}
              {canAddEditDelete && (
                <BulkUploadSection
                  setCsvData={setCsvData}
                  csvData={csvData}
                  bulkUpload={bulkUpload}
                  isUploading={isUploading}
                  isDarkMode={isDarkMode}
                />
              )}
              {/* QR Stats Section */}
              <QRStatsSection qrStats={qrStats} isDarkMode={isDarkMode} />
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
              {/* The main InventoryList displaying filtered search results */}
              <InventoryList
                items={filteredItems} // Pass filtered items from search
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onPreviewQr={previewQrCode} // Pass the previewQrCode handler from useQRCode
                isLoading={isLoading}
                role={role}
                isDarkMode={isDarkMode}
              />
            </div>

            {/* Add/Edit Item Form */}
            {canAddEditDelete && (
              <AddEditForm
                formData={formData}
                setFormData={setFormData}
                isEditing={isEditing}
                setIsEditing={setIsEditing}
                editingItem={editingItem}
                setEditingItem={setEditingItem}
                handleSaveEdit={handleSaveEdit}
                defaultFormData={defaultFormData}
                validationErrors={validationErrors}
                isLoading={isLoading}
                isDarkMode={isDarkMode}
              />
            )}

            {/* Category Details Modal */}
            {showCategoryDetails && (
              <CategoryDetails
                category={selectedCategory}
                items={items} // Pass the *full* items list to CategoryDetails
                onClose={closeCategoryDetails}
                onEdit={handleEdit}
                onDelete={handleDeleteItem}
                onPreviewQr={previewQrCode} // Pass the previewQrCode handler
                isLoading={isLoading}
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
                isGenerating={isGeneratingQr} // Pass loading state from hook
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