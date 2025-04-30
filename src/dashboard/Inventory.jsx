import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, getDoc, updateDoc, where, writeBatch, serverTimestamp } from "firebase/firestore";
import { db, logAudit, auth } from "../firebase";
import { toast } from "react-toastify";
import Papa from "papaparse";
import QRCodeManager from '../components/QRCodeManager';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from "react-router-dom";
import { useAuth } from '../context/AuthContext';
import { canPerformAction } from '../utils/roleUtils';
import {
  sanitizeInput,
  sanitizeNumber,
  debounce,
  saveSearchHistory,
  validateItem,
  calculateQrStats,
  groupByCategory
} from '../utils/inventoryUtils';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';

function Inventory() {
  const { isDarkMode } = useTheme();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    unitNumber: "",
    name: "",
    brand: "",
    serialNumber: "",
    dateAcquired: "",
    quantity: 1,
    remarks: "",
    category: "",
    description: "",
    lab: "",
    uniqueQR: false,
    itemCondition: "New"
  });

  // State management
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterLab, setFilterLab] = useState("");
  const [searchField, setSearchField] = useState("name");
  const [csvData, setCsvData] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  // Advanced search state
  const [advancedSearch, setAdvancedSearch] = useState({
    dateRange: { start: null, end: null },
    priceRange: { min: null, max: null },
    conditions: [],
    labs: []
  });

  // Search history state
  const [searchHistory, setSearchHistory] = useState(() => {
    try {
      const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
      return Array.isArray(history) ? history : [];
    } catch {
      return [];
    }
  });

  const [savedSearches, setSavedSearches] = useState(() => {
    try {
      const searches = JSON.parse(localStorage.getItem('savedSearches') || '[]');
      return Array.isArray(searches) ? searches : [];
    } catch {
      return [];
    }
  });

  // QR-related states
  const [qrPreview, setQrPreview] = useState(null);
  const [batchQrItems, setBatchQrItems] = useState([]);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrStats, setQrStats] = useState({
    totalWithQr: 0,
    totalWithoutQr: 0,
    lastGenerated: null
  });

  // Category details state
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryDetails, setShowCategoryDetails] = useState(false);

  const addEditFormRef = useRef(null);

  // Permission checks
  const canEdit = useMemo(() => canPerformAction(role, 'edit_inventory'), [role]);
  const canDelete = useMemo(() => canPerformAction(role, 'delete_inventory'), [role]);
  const canGenerateQr = useMemo(() => canPerformAction(role, 'generate_reports'), [role]);

  // Enhanced search functionality with memoization
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.name.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Memoize category grouping calculation
  const categoryGroups = useMemo(() => groupByCategory(filteredItems), [filteredItems]);

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const value = sanitizeInput(e.target.value);
    debouncedSearch(value);
    if (value.trim()) {
      saveSearchHistory(value);
      setSearchHistory(prev => [value, ...prev].slice(0, 10));
    }
  };

  // Data fetching with error handling
  useEffect(() => {
    if (!user) return;

    const inventoryQuery = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
    const inventoryUnsubscribe = onSnapshot(inventoryQuery,
      (querySnapshot) => {
        const newItems = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setItems(newItems);
        setError(null);
      },
      (error) => {
        console.error("Error fetching inventory:", error);
        setError("Failed to load inventory data");
        toast.error("Failed to load inventory data");
      }
    );

    return () => inventoryUnsubscribe();
  }, [user]);

  // QR stats calculation
  useEffect(() => {
    setQrStats(calculateQrStats(items));
  }, [items]);

  // Add item with validation and permission check
  const addItem = async () => {
    if (!canEdit) {
      toast.error("You don't have permission to add items");
      return;
    }

    const errors = validateItem(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error(Object.values(errors).join(', '));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors({});

      const itemData = {
        ...formData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user.email,
        updatedBy: user.email
      };

      const docRef = await addDoc(collection(db, "inventory"), itemData);
      await logAudit(user.email, `Added item: ${formData.name}`);
      toast.success("Item added successfully");
      setFormData({
        unitNumber: "",
        name: "",
        brand: "",
        serialNumber: "",
        dateAcquired: "",
        quantity: 1,
        remarks: "",
        category: "",
        description: "",
        lab: "",
        uniqueQR: false,
        itemCondition: "New"
      });
    } catch (error) {
      console.error("Error adding item:", error);
      setError("Failed to add item");
      toast.error("Failed to add item");
    } finally {
      setIsLoading(false);
    }
  };

  // Edit item with validation and permission check
  const handleEdit = (item) => {
    if (!canEdit) {
      toast.error("You don't have permission to edit items");
      return;
    }
    setEditingItem(item);
    setFormData(item);
    setIsEditing(true);
    setValidationErrors({});
  };

  // Save edit with validation and permission check
  const handleSaveEdit = async () => {
    if (!canEdit) {
      toast.error("You don't have permission to edit items");
      return;
    }

    const errors = validateItem(formData);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.error(Object.values(errors).join(', '));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setValidationErrors({});

      const sanitizedData = {
        ...formData,
        name: sanitizeInput(formData.name),
        brand: sanitizeInput(formData.brand),
        serialNumber: sanitizeInput(formData.serialNumber),
        remarks: sanitizeInput(formData.remarks),
        quantity: sanitizeNumber(formData.quantity),
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };

      await updateDoc(doc(db, "inventory", editingItem.id), sanitizedData);
      await logAudit(user.uid, 'update_item', {
        itemId: editingItem.id,
        itemName: sanitizedData.name
      });

      toast.success("Item updated successfully");
      setIsEditing(false);
      setEditingItem(null);
      setFormData({
        unitNumber: "",
        name: "",
        brand: "",
        serialNumber: "",
        dateAcquired: "",
        quantity: 1,
        remarks: "",
        category: "",
        description: "",
        lab: "",
        uniqueQR: false,
        itemCondition: "New"
      });
    } catch (error) {
      console.error("Error updating item:", error);
      setError(error.message);
      toast.error(`Failed to update item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete item with permission check and confirmation
  const deleteItem = async (id, name) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete items");
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await deleteDoc(doc(db, "inventory", id));
      await logAudit(user.uid, 'delete_item', {
        itemId: id,
        itemName: name
      });
      toast.success("Item deleted successfully");
    } catch (error) {
      console.error("Error deleting item:", error);
      setError(error.message);
      toast.error(`Failed to delete item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stockStatusColor = (qty) => {
    if (qty <= 0) return "text-red-500";
    if (qty <= 5) return "text-yellow-500";
    return "text-green-500";
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvData(results.data);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const bulkUpload = async () => {
    if (csvData.length === 0) {
      toast.error("No data to upload!");
      return;
    }

    setIsUploading(true);
    let skippedRows = 0;
    try {
      for (const item of csvData) {
        // Only require name, quantity, and category
        const name = sanitizeInput(item.name);
        const quantity = sanitizeNumber(item.quantity);
        const category = sanitizeInput(item.category);
        if (!name || !category || isNaN(quantity)) {
          skippedRows++;
          continue;
        }
        const sanitizedItem = {
          unitNumber: sanitizeInput(item.unitNum) || "",
          name,
          brand: sanitizeInput(item.brand) || "",
          serialNumber: sanitizeInput(item.serialNum) || "",
          dateAcquired: item.dateAcqui || null,
          quantity,
          remarks: sanitizeInput(item.remarks) || "",
          category,
          uniqueQR: false,
          itemCondition: "New",
          createdAt: serverTimestamp()
        };
        await addDoc(collection(db, "inventory"), sanitizedItem);
      }

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Bulk uploaded ${csvData.length - skippedRows} items (skipped ${skippedRows})`);
      }

      toast.success(`Successfully uploaded ${csvData.length - skippedRows} items!${skippedRows > 0 ? ` Skipped ${skippedRows} row(s) missing required fields.` : ''}`);
      setCsvData([]);
    } catch (error) {
      console.error("Error in bulk upload:", error);
      toast.error(`Error in bulk upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategory(category);
    setShowCategoryDetails(true);
  };

  const getFilteredItems = (category) => {
    return filteredItems.filter(item => item.category === category);
  };

  // Generate QR code with permission check
  const generateQrCode = async (item) => {
    if (!canGenerateQr) {
      toast.error("You don't have permission to generate QR codes");
      return;
    }

    try {
      setIsGeneratingQr(true);
      const qrData = {
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        dateGenerated: new Date().toISOString()
      };

      await QRCodeManager.generateQR(qrData);
      await logAudit(user.email, `Generated QR code for: ${item.name}`);
      toast.success("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  const previewQrCode = (item) => {
    setQrPreview(item);
  };

  const Row = ({ index, style }) => {
    const item = filteredItems[index];
    return (
      <div style={style} className={`p-4 ${index % 2 === 0 ? (isDarkMode ? 'bg-gray-800' : 'bg-white') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')}`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.name}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
              Category: {item.category} | Serial: {item.serialNumber} | Brand: {item.brand}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`font-semibold ${stockStatusColor(item.quantity)}`}>
              Qty: {item.quantity}
            </span>
            {(role === 'admin' || role === 'superadmin') && (
              <>
                <button
                  onClick={() => handleEdit(item)}
                  className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteItem(item.id, item.name)}
                  className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  onClick={() => previewQrCode(item)}
                  className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600"
                >
                  QR
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const CategoryDetailsModal = () => {
    if (!selectedCategory) return null;

    const categoryItems = filteredItems.filter(item => item.category === selectedCategory);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className={`p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">{selectedCategory}</h2>
            <button
              onClick={() => setShowCategoryDetails(false)}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Close
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map((item) => (
              <div key={item.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <h3 className="font-semibold mb-2">{item.name}</h3>
                <p className="text-sm mb-1">Brand: {item.brand}</p>
                <p className="text-sm mb-1">Serial: {item.serialNumber}</p>
                <p className="text-sm mb-1">Quantity: {item.quantity}</p>
                <p className="text-sm mb-1">Condition: {item.itemCondition}</p>
                <p className="text-sm mb-1">Lab: {item.lab}</p>
                {item.description && <p className="text-sm mb-1">Description: {item.description}</p>}
                {item.remarks && <p className="text-sm">Remarks: {item.remarks}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

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
            <button
              onClick={() => navigate(-1)}
              className={`mb-4 px-4 py-2 rounded bg-gray-300 hover:bg-gray-400 text-gray-800 font-medium flex items-center ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : ''}`}
            >
              <span className="mr-2">←</span> Back
            </button>
            <h1 className="text-3xl font-bold mb-4">Inventory Management</h1>

            {/* Search Bar */}
            <div className="flex flex-wrap gap-4 mb-6">
              <select
                value={searchField}
                onChange={(e) => setSearchField(e.target.value)}
                className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="name">Name</option>
                <option value="serialNumber">Serial Number</option>
                <option value="brand">Brand</option>
                <option value="category">Category</option>
              </select>
              <input
                type="text"
                placeholder={`Search by ${searchField}...`}
                onChange={handleSearchChange}
                className={`flex-1 min-w-[200px] p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
              />
              <select
                value={filterCondition}
                onChange={(e) => setFilterCondition(e.target.value)}
                className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="">All Conditions</option>
                <option value="New">New</option>
                <option value="Used">Used</option>
                <option value="Damaged">Damaged</option>
              </select>
              <select
                value={filterLab}
                onChange={(e) => setFilterLab(e.target.value)}
                className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
              >
                <option value="">All Labs</option>
                <option value="Mac Lab">Mac Lab</option>
                <option value="EMC Lab">EMC Lab</option>
                <option value="Others">Others</option>
              </select>
            </div>

            {/* Bulk Upload and QR Stats side-by-side */}
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* Bulk Upload */}
              <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className="text-xl font-semibold mb-4">Bulk Upload</h2>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <button
                    onClick={bulkUpload}
                    disabled={isUploading || csvData.length === 0}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                  >
                    {isUploading ? 'Uploading...' : 'Upload CSV'}
                  </button>
                </div>
                {csvData.length > 0 && (
                  <p className="mt-2 text-sm text-gray-500">
                    {csvData.length} items ready to upload
                  </p>
                )}
              </div>
              {/* QR Stats */}
              <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className="text-xl font-semibold mb-2">QR Code Statistics</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Items with QR</p>
                    <p className="text-2xl font-bold">{qrStats.totalWithQr}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Items without QR</p>
                    <p className="text-2xl font-bold">{qrStats.totalWithoutQr}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Categories and Virtualized List side-by-side */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Categories */}
              <div className={`w-full lg:w-1/3 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className="text-xl font-semibold mb-4">Categories</h2>
                <div className="grid grid-cols-1 gap-4">
                  {Object.entries(categoryGroups).map(([category, { items, totalQuantity }]) => (
                    <div
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`p-4 rounded-lg cursor-pointer transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}
                    >
                      <h3 className="font-semibold">{category}</h3>
                      <p className="text-sm text-gray-500">
                        {items.length} items • Total Quantity: {totalQuantity}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              {/* Virtualized List */}
              <div className="w-full lg:w-2/3 h-[600px]">
                <AutoSizer>
                  {({ height, width }) => (
                    <List
                      height={height}
                      itemCount={filteredItems.length}
                      itemSize={80}
                      width={width}
                    >
                      {Row}
                    </List>
                  )}
                </AutoSizer>
              </div>
            </div>

            {/* Add/Edit Item Form below Categories and List */}
            {(role === 'admin' || role === 'superadmin') && (
              <div ref={addEditFormRef} className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                <h2 className="text-xl font-semibold mb-4">{isEditing ? 'Edit Item' : 'Add New Item'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="text"
                    placeholder="Brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="text"
                    placeholder="Serial Number"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="text"
                    placeholder="Category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="number"
                    placeholder="Quantity"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <input
                    type="date"
                    placeholder="Date Acquired"
                    value={formData.dateAcquired}
                    onChange={(e) => setFormData({ ...formData, dateAcquired: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <select
                    value={formData.itemCondition}
                    onChange={(e) => setFormData({ ...formData, itemCondition: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="New">New</option>
                    <option value="Used">Used</option>
                    <option value="Damaged">Damaged</option>
                  </select>
                  <select
                    value={formData.lab}
                    onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  >
                    <option value="">Select Lab</option>
                    <option value="Mac Lab">Mac Lab</option>
                    <option value="EMC Lab">EMC Lab</option>
                    <option value="Others">Others</option>
                  </select>
                  <textarea
                    placeholder="Description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                  <textarea
                    placeholder="Remarks"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
                  />
                </div>
                <div className="mt-4 flex justify-end space-x-4">
                  {isEditing && (
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditingItem(null);
                        setFormData({
                          unitNumber: "",
                          name: "",
                          brand: "",
                          serialNumber: "",
                          dateAcquired: "",
                          quantity: 1,
                          remarks: "",
                          category: "",
                          description: "",
                          lab: "",
                          uniqueQR: false,
                          itemCondition: "New"
                        });
                      }}
                      className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={isEditing ? handleSaveEdit : addItem}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Add Item')}
                  </button>
                </div>
              </div>
            )}

            {/* Category Details Modal */}
            {showCategoryDetails && <CategoryDetailsModal />}
            {/* QR Preview Modal */}
            {qrPreview && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                  <QRCodeManager
                    item={qrPreview}
                    onGenerate={() => generateQrCode(qrPreview)}
                    onPreview={() => previewQrCode(qrPreview)}
                    isLoading={isGeneratingQr}
                  />
                  <button
                    onClick={() => setQrPreview(null)}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default Inventory;