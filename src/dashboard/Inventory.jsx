import React from "react";
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
import QRCodePreview from '../components/inventory/QRCodePreview';
import useInventory from '../hooks/useInventory';
import useSearch from '../hooks/useSearch';
import useQRCode from '../hooks/useQRCode';

function Inventory() {
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  
  const { 
    items, 
    isLoading, 
    error, 
    addItem, 
    editItem, 
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
  
  const {
    searchTerm,
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
  
  const {
    qrStats,
    qrPreview,
    setQrPreview,
    isGeneratingQr,
    generateQrCode,
    previewQrCode
  } = useQRCode(items, user);
  
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [showCategoryDetails, setShowCategoryDetails] = React.useState(false);

  const toggleCategory = (category) => {
    setSelectedCategory(category);
    setShowCategoryDetails(true);
  };

  const canEdit = role === 'admin' || role === 'superadmin';
  const canDelete = role === 'admin' || role === 'superadmin';
  const canGenerateQr = role === 'admin' || role === 'superadmin';

  return (
    <ErrorBoundary>
      <div className={`p-4 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
        {isLoading && <LoadingSpinner />}
        {error && (
          <div className="text-red-500 text-center mb-4">
            {error}
          </div>
        )}

        <div className={`max-w-7xl mx-auto ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
          <div className="mb-8">
            {/* Back Button */}
            <Button
              onClick={() => navigate(-1)}
              color="gray"
              size="md"
              className={`flex items-center ${isDarkMode ? 'text-white' : 'text-gray-800'}`}
            >
              <span className="mr-2">←</span> Back
            </Button>
            <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>
            
            {/* Search Bar */}
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
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <BulkUploadSection 
                setCsvData={setCsvData}
                csvData={csvData}
                bulkUpload={bulkUpload}
                isUploading={isUploading}
                isDarkMode={isDarkMode}
              />
              <QRStatsSection qrStats={qrStats} isDarkMode={isDarkMode} />
            </div>
            
            {/* Categories and Virtualized List side-by-side */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <CategoryList 
                categoryGroups={categoryGroups}
                toggleCategory={toggleCategory}
                isDarkMode={isDarkMode}
              />
              <InventoryList 
                filteredItems={filteredItems}
                handleEdit={setEditingItem}
                deleteItem={deleteItem}
                previewQrCode={previewQrCode}
                role={role}
                isDarkMode={isDarkMode}
              />
            </div>
            
            {/* Add/Edit Item Form */}
            {(role === 'admin' || role === 'superadmin') && (
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
                selectedCategory={selectedCategory}
                filteredItems={filteredItems}
                setShowCategoryDetails={setShowCategoryDetails}
                isDarkMode={isDarkMode}
              />
            )}
            
            {/* QR Preview Modal */}
            {qrPreview && (
              <QRCodePreview 
                qrPreview={qrPreview}
                setQrPreview={setQrPreview}
                generateQrCode={generateQrCode}
                isGeneratingQr={isGeneratingQr}
                isDarkMode={isDarkMode}
              />
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Inventory;