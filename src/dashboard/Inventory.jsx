import React, { useState, useEffect, useMemo, useCallback } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, getDoc, updateDoc } from "firebase/firestore";
import { db, logAudit, auth } from "../firebase";
import { serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import Papa from "papaparse";
import QRCode from "qrcode.react";

// Add sanitization functions
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.replace(/[<>]/g, '');
};

const sanitizeNumber = (input) => {
  if (typeof input === 'number') return input;
  return parseInt(input.toString().replace(/[^0-9]/g, '')) || 0;
};

// Add debounce function
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Add search history to localStorage
const saveSearchHistory = (search) => {
  const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  if (!history.includes(search)) {
    history.unshift(search);
    localStorage.setItem('searchHistory', history.slice(0, 10));
  }
};

function Inventory() {
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
    description: "", // New field for description
    lab: "", // New field for lab tag
    uniqueQR: false, // New field for QR tracking
    itemCondition: "New" // New field for item condition
  });

  // State for expanded categories and filters
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterLab, setFilterLab] = useState("");

  const [csvData, setCsvData] = useState([]);
  const [role, setRole] = useState("");

  const [editingItem, setEditingItem] = useState(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Add new state for advanced search
  const [advancedSearch, setAdvancedSearch] = useState({
    dateRange: { start: null, end: null },
    priceRange: { min: null, max: null },
    conditions: [],
    labs: []
  });

  const [searchHistory, setSearchHistory] = useState(
    JSON.parse(localStorage.getItem('searchHistory') || '[]')
  );

  const [savedSearches, setSavedSearches] = useState(
    JSON.parse(localStorage.getItem('savedSearches') || '[]')
  );

  // Add new QR-related states
  const [qrPreview, setQrPreview] = useState(null);
  const [batchQrItems, setBatchQrItems] = useState([]);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrStats, setQrStats] = useState({
    totalWithQr: 0,
    totalWithoutQr: 0,
    lastGenerated: null
  });

  // Memoize category grouping calculation
  const categoryGroups = useMemo(() => {
    const groups = {};
    items.forEach(item => {
      const category = item.category || "Uncategorized";
      if (!groups[category]) {
        groups[category] = {
          items: [],
          totalQuantity: 0
        };
      }
      groups[category].items.push(item);
      groups[category].totalQuantity += (parseInt(item.quantity) || 0);
    });
    return groups;
  }, [items]);

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

  useEffect(() => {
    const fetchUserRole = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role);
        }
      }
    };
    fetchUserRole();

    const q = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedItems = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setItems(fetchedItems);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const stats = items.reduce((acc, item) => {
      if (item.uniqueQR) {
        acc.totalWithQr++;
      } else {
        acc.totalWithoutQr++;
      }
      return acc;
    }, { totalWithQr: 0, totalWithoutQr: 0 });
    setQrStats(stats);
  }, [items]);

  const addItem = async () => {
    setIsLoading(true);
    const { name, category, quantity, dateAcquired } = formData;

    // Enhanced validation with sanitization
    const sanitizedName = sanitizeInput(name);
    const sanitizedCategory = sanitizeInput(category);
    const sanitizedQuantity = sanitizeNumber(quantity);

    if (!sanitizedName.trim()) {
      toast.error("Item name is required!");
      setIsLoading(false);
      return;
    }
    if (!sanitizedCategory.trim()) {
      toast.error("Category is required!");
      setIsLoading(false);
      return;
    }
    if (sanitizedQuantity < 0) {
      toast.error("Quantity must be a positive number!");
      setIsLoading(false);
      return;
    }
    if (dateAcquired && isNaN(new Date(dateAcquired).getTime())) {
      toast.error("Invalid date format!");
      setIsLoading(false);
      return;
    }

    try {
      const itemData = {
        ...formData,
        name: sanitizedName,
        category: sanitizedCategory,
        quantity: sanitizedQuantity,
        dateAcquired: dateAcquired || null,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "inventory"), itemData);

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Added item: ${sanitizedName}`);
      }

      toast.success("Item added successfully!");
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
      toast.error(`Error adding item: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    if (!editingItem.name.trim()) {
      toast.error("Name cannot be empty.");
      return;
    }
    if (editingItem.quantity < 0) {
      toast.error("Quantity cannot be negative.");
      return;
    }

    try {
      await updateDoc(doc(db, "inventory", editingItem.id), {
        name: editingItem.name,
        quantity: editingItem.quantity,
        itemCondition: editingItem.itemCondition,
        lab: editingItem.lab,
        description: editingItem.description,
        updatedAt: serverTimestamp(),
      });
      toast.success("Item updated successfully!");
      setEditingItem(null);
    } catch (error) {
      console.error("Error updating item:", error);
      toast.error("Failed to update item.");
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete '${name}'?`)) return;
    try {
      await deleteDoc(doc(db, "inventory", id));
      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Deleted item: ${name}`);
      }
      toast.info(`Deleted '${name}'.`);
    } catch (error) {
      toast.error("Error deleting item: " + error.message);
    }
  };

  const stockStatusColor = (qty) => {
    if (qty === 0) return "bg-red-500";
    if (qty < 5) return "bg-yellow-400";
    return "bg-green-500";
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    console.log("File selected:", file.name);
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        console.log("CSV parse results:", results.data);
        setCsvData(results.data.filter(row => row.name));
      },
      error: (error) => {
        console.error("CSV parse error:", error);
        toast.error("Error parsing CSV file: " + error.message);
      }
    });
  };

  const bulkUpload = async () => {
    setIsUploading(true);
    try {
      // Check user role before proceeding
      if (!auth.currentUser) {
        toast.error("You must be logged in to upload CSV");
        setIsUploading(false);
        return;
      }
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!userDoc.exists() || !["admin", "superadmin"].includes(userDoc.data().role)) {
        toast.error("You don't have permission to upload CSV");
        setIsUploading(false);
        return;
      }

      if (!csvData.length) {
        toast.error("No data to upload");
        setIsUploading(false);
        return;
      }

      // Process in batches of 500
      const batchSize = 500;
      const batches = [];
      for (let i = 0; i < csvData.length; i += batchSize) {
        batches.push(csvData.slice(i, i + batchSize));
      }

      let successCount = 0;
      let errorCount = 0;

      for (const batch of batches) {
        try {
          const batchPromises = batch.map(row => {
            // Validate required fields
            if (!row.name) {
              errorCount++;
              return Promise.reject(new Error(`Row missing name: ${JSON.stringify(row)}`));
            }

            const quantity = parseInt(row.quantity);
            if (isNaN(quantity) || quantity < 0) {
              errorCount++;
              return Promise.reject(new Error(`Invalid quantity in row: ${JSON.stringify(row)}`));
            }

            return addDoc(collection(db, "inventory"), {
              unitNumber: row.unitNumber || "",
              name: row.name,
              brand: row.brand || "",
              serialNumber: row.serialNumber || "",
              dateAcquired: row.dateAcquired || null,
              quantity: quantity,
              remarks: row.remarks || "",
              category: row.category || "",
              description: row.description || "",
              lab: row.lab || "",
              uniqueQR: row.uniqueQR === "true" || false,
              itemCondition: row.itemCondition || "New",
              createdAt: serverTimestamp(),
            });
          });

          await Promise.all(batchPromises);
          successCount += batch.length;
        } catch (error) {
          console.error("Error in batch upload:", error);
          errorCount += batch.length;
        }
      }

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Bulk uploaded ${successCount} items, ${errorCount} failed`);
      }

      if (errorCount > 0) {
        toast.warning(`Uploaded ${successCount} items, ${errorCount} failed. Check console for details.`);
      } else {
        toast.success(`Successfully uploaded ${successCount} items`);
      }

      setCsvData([]);
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error(`Error during bulk upload: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle category expansion
  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Filter items based on search and filters
  const filteredCategories = Object.keys(categoryGroups).filter(category => {
    // Check if category name matches search term
    if (searchTerm && !category.toLowerCase().includes(searchTerm.toLowerCase())) {
      // If category doesn't match, check if any items in category match search term
      const hasMatchingItem = categoryGroups[category].items.some(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      if (!hasMatchingItem) return false;
    }
    return true;
  });

  // Get filtered items for a specific category
  const getFilteredItems = (category) => {
    return categoryGroups[category].items.filter(item => {
      // Basic search filter
      const matchesSearch = !searchTerm ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      // Condition filter
      const matchesCondition = !filterCondition || item.itemCondition === filterCondition;

      // Lab filter
      const matchesLab = !filterLab || item.lab === filterLab;

      // Date range filter
      const matchesDateRange = !advancedSearch.dateRange.start || !advancedSearch.dateRange.end ||
        (item.dateAcquired >= advancedSearch.dateRange.start &&
          item.dateAcquired <= advancedSearch.dateRange.end);

      // Price range filter (if implemented)
      const matchesPriceRange = !advancedSearch.priceRange.min || !advancedSearch.priceRange.max ||
        (item.price >= advancedSearch.priceRange.min &&
          item.price <= advancedSearch.priceRange.max);

      // Multiple conditions filter
      const matchesConditions = advancedSearch.conditions.length === 0 ||
        advancedSearch.conditions.includes(item.itemCondition);

      // Multiple labs filter
      const matchesLabs = advancedSearch.labs.length === 0 ||
        advancedSearch.labs.includes(item.lab);

      return matchesSearch && matchesCondition && matchesLab &&
        matchesDateRange && matchesPriceRange &&
        matchesConditions && matchesLabs;
    });
  };

  // Get available conditions and labs for filters
  const availableConditions = ["New", "Good", "Fair", "Damaged", "For Repair", "Lost", "Decommissioned"];
  const availableLabs = [...new Set(items.map(item => item.lab).filter(Boolean))];

  // Save current search
  const saveCurrentSearch = () => {
    const search = {
      term: searchTerm,
      filters: {
        condition: filterCondition,
        lab: filterLab,
        ...advancedSearch
      },
      timestamp: new Date().toISOString()
    };

    setSavedSearches(prev => {
      const newSearches = [search, ...prev];
      localStorage.setItem('savedSearches', JSON.stringify(newSearches));
      return newSearches;
    });

    toast.success('Search saved successfully!');
  };

  // Load saved search
  const loadSavedSearch = (savedSearch) => {
    setSearchTerm(savedSearch.term);
    setFilterCondition(savedSearch.filters.condition);
    setFilterLab(savedSearch.filters.lab);
    setAdvancedSearch(savedSearch.filters);
  };

  // Generate QR code for an item
  const generateQrCode = async (item) => {
    try {
      setIsGeneratingQr(true);
      const qrData = {
        id: item.id,
        name: item.name,
        unitNumber: item.unitNumber,
        lab: item.lab,
        condition: item.itemCondition,
        lastUpdated: new Date().toISOString()
      };

      // Update item with QR status
      await updateDoc(doc(db, "inventory", item.id), {
        uniqueQR: true,
        qrData: qrData,
        qrGeneratedAt: serverTimestamp()
      });

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Generated QR for item: ${item.name}`);
      }

      toast.success(`QR code generated for ${item.name}`);
    } catch (error) {
      console.error("Error generating QR:", error);
      toast.error(`Failed to generate QR: ${error.message}`);
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Generate QR codes in batch
  const generateBatchQr = async (items) => {
    try {
      setIsGeneratingQr(true);
      let successCount = 0;
      let errorCount = 0;

      for (const item of items) {
        try {
          const qrData = {
            id: item.id,
            name: item.name,
            unitNumber: item.unitNumber,
            lab: item.lab,
            condition: item.itemCondition,
            lastUpdated: new Date().toISOString()
          };

          await updateDoc(doc(db, "inventory", item.id), {
            uniqueQR: true,
            qrData: qrData,
            qrGeneratedAt: serverTimestamp()
          });
          successCount++;
        } catch (error) {
          console.error(`Error generating QR for ${item.name}:`, error);
          errorCount++;
        }
      }

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Generated QR codes in batch: ${successCount} success, ${errorCount} failed`);
      }

      if (errorCount > 0) {
        toast.warning(`Generated ${successCount} QR codes, ${errorCount} failed`);
      } else {
        toast.success(`Successfully generated ${successCount} QR codes`);
      }
    } catch (error) {
      console.error("Batch QR generation error:", error);
      toast.error(`Error during batch QR generation: ${error.message}`);
    } finally {
      setIsGeneratingQr(false);
      setBatchQrItems([]);
    }
  };

  // Preview QR code
  const previewQrCode = (item) => {
    if (!item.uniqueQR) return;
    setQrPreview({
      item,
      data: item.qrData
    });
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Inventory Management</h2>

      {/* Add Item Form (Only for Admin/SuperAdmin) */}
      {(role === "superadmin" || role === "admin") && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <input
              type="text"
              placeholder="Unit Number"
              className="border p-2 rounded"
              value={formData.unitNumber}
              onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
            />
            <input
              type="text"
              placeholder="Name"
              className="border p-2 rounded"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <input
              type="text"
              placeholder="Brand"
              className="border p-2 rounded"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            />
            <input
              type="text"
              placeholder="Serial Number"
              className="border p-2 rounded"
              value={formData.serialNumber}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
            />
            <input
              type="text"
              placeholder="Category"
              className="border p-2 rounded"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
            <input
              type="date"
              placeholder="Date Acquired"
              className="border p-2 rounded"
              value={formData.dateAcquired}
              onChange={(e) => setFormData({ ...formData, dateAcquired: e.target.value })}
            />
            <input
              type="number"
              placeholder="Quantity"
              className="border p-2 rounded"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
              min="0"
            />
            <input
              type="text"
              placeholder="Remarks"
              className="border p-2 rounded"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
            />
            <input
              type="text"
              placeholder="Description"
              className="border p-2 rounded"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <select
              className="border p-2 rounded"
              value={formData.lab}
              onChange={(e) => setFormData({ ...formData, lab: e.target.value })}
            >
              <option value="">Select Lab (Optional)</option>
              <option value="Mac Laboratory">Mac Laboratory</option>
              <option value="Entertainment and Multimedia Computing Lab">EMC Lab</option>
              <option value="Other">Other</option>
            </select>
            <select
              className="border p-2 rounded"
              value={formData.itemCondition}
              onChange={(e) => setFormData({ ...formData, itemCondition: e.target.value })}
            >
              <option value="New">New</option>
              <option value="Good">Good</option>
              <option value="Fair">Fair</option>
              <option value="Damaged">Damaged</option>
              <option value="For Repair">For Repair</option>
              <option value="Lost">Lost</option>
              <option value="Decommissioned">Decommissioned</option>
            </select>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="uniqueQR"
                checked={formData.uniqueQR}
                onChange={(e) => setFormData({ ...formData, uniqueQR: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="uniqueQR">Create Unique QR?</label>
            </div>
          </div>

          <button
            onClick={addItem}
            disabled={isLoading}
            className={`bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {isLoading ? 'Adding...' : 'Add Item'}
          </button>

          {/* CSV Upload */}
          <div className="mt-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="mb-2 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text"
            />
            {csvData.length > 0 && (
              <button
                onClick={bulkUpload}
                disabled={isUploading}
                className={`ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
              >
                {isUploading ? 'Uploading...' : `Upload CSV (${csvData.length} items)`}
              </button>
            )}
          </div>
        </>
      )}

      {/* Enhanced Search Section */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search items..."
                className="border p-2 rounded w-full"
                onChange={handleSearchChange}
                value={searchTerm}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-gray-500 hover:text-gray-700"
                >
                  ×
                </button>
              )}
            </div>

            {/* Search History */}
            {searchHistory.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500">Recent Searches:</div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {searchHistory.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchTerm(term)}
                      className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Advanced Filters */}
          <div>
            <label className="block text-sm font-medium mb-1">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                className="border p-2 rounded w-full"
                onChange={e => setAdvancedSearch(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, start: e.target.value }
                }))}
              />
              <input
                type="date"
                className="border p-2 rounded w-full"
                onChange={e => setAdvancedSearch(prev => ({
                  ...prev,
                  dateRange: { ...prev.dateRange, end: e.target.value }
                }))}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Conditions</label>
            <select
              multiple
              className="border p-2 rounded w-full"
              onChange={e => {
                const options = e.target.options;
                const selected = [];
                for (let i = 0; i < options.length; i++) {
                  if (options[i].selected) {
                    selected.push(options[i].value);
                  }
                }
                setAdvancedSearch(prev => ({
                  ...prev,
                  conditions: selected
                }));
              }}
            >
              {availableConditions.map(condition => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end space-x-2">
            <button
              onClick={saveCurrentSearch}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Save Search
            </button>
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterCondition('');
                setFilterLab('');
                setAdvancedSearch({
                  dateRange: { start: null, end: null },
                  priceRange: { min: null, max: null },
                  conditions: [],
                  labs: []
                });
              }}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Saved Searches */}
        {savedSearches.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Saved Searches:</div>
            <div className="flex flex-wrap gap-2">
              {savedSearches.map((search, index) => (
                <button
                  key={index}
                  onClick={() => loadSavedSearch(search)}
                  className="bg-gray-100 px-3 py-1 rounded hover:bg-gray-200 text-sm"
                >
                  {search.term || 'Untitled Search'}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Category-based Inventory View */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">Inventory by Category</h3>

        {filteredCategories.length === 0 ? (
          <p className="text-center p-4">No items found matching your search.</p>
        ) : (
          <>
            {filteredCategories.map(category => (
              <div key={category} className="mb-4 border rounded overflow-hidden">
                <div
                  className="bg-gray-100 p-3 flex justify-between items-center cursor-pointer"
                  onClick={() => toggleCategory(category)}
                >
                  <div className="font-medium">{category}</div>
                  <div className="flex items-center">
                    <span className="mr-4">Total: {categoryGroups[category].totalQuantity}</span>
                    <span className={`${expandedCategories[category] ? 'transform rotate-180' : ''} transition-transform`}>
                      ▼
                    </span>
                  </div>
                </div>

                {expandedCategories[category] && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-200">
                          <th className="p-2 border">Unit Number</th>
                          <th className="p-2 border">Name</th>
                          <th className="p-2 border">Brand</th>
                          <th className="p-2 border">Lab</th>
                          <th className="p-2 border">Condition</th>
                          <th className="p-2 border">Stock Status</th>
                          <th className="p-2 border">QR</th>
                          {(role === "admin" || role === "superadmin") && <th className="p-2 border">Actions</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {getFilteredItems(category).map(item => (
                          <tr key={item.id} className="text-center">
                            <td className="p-2 border">{item.unitNumber || "N/A"}</td>
                            <td className="p-2 border">{item.name}</td>
                            <td className="p-2 border">{item.brand || "N/A"}</td>
                            <td className="p-2 border">{item.lab || "N/A"}</td>
                            <td className="p-2 border">{item.itemCondition || "New"}</td>
                            <td className="p-2 border">
                              <span className={`px-2 py-1 rounded text-white ${stockStatusColor(item.quantity)}`}>
                                {item.quantity > 0 ? (item.quantity >= 5 ? "Available" : "Low Stock") : "Out of Stock"}
                              </span>
                            </td>
                            <td className="p-2 border">
                              {item.uniqueQR ? (
                                <button
                                  onClick={() => previewQrCode(item)}
                                  className="text-green-600 hover:text-green-800"
                                >
                                  View QR
                                </button>
                              ) : (
                                <button
                                  onClick={() => generateQrCode(item)}
                                  disabled={isGeneratingQr}
                                  className={`text-blue-600 hover:text-blue-800 ${isGeneratingQr ? 'opacity-50 cursor-not-allowed' : ''
                                    }`}
                                >
                                  Generate QR
                                </button>
                              )}
                            </td>
                            {(role === "admin" || role === "superadmin") && (
                              <td className="p-2 border space-x-2">
                                <button
                                  onClick={() => setEditingItem(item)}
                                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                                >
                                  Update
                                </button>
                                <button
                                  onClick={() => deleteItem(item.id, item.name)}
                                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                >
                                  Delete
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* QR Code Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">QR Code Management</h3>
          <div className="text-sm text-gray-600">
            {qrStats.totalWithQr} with QR, {qrStats.totalWithoutQr} without
          </div>
        </div>

        {/* QR Code Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={() => {
              const itemsWithoutQr = items.filter(item => !item.uniqueQR);
              setBatchQrItems(itemsWithoutQr);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Select Items for Batch QR
          </button>

          {batchQrItems.length > 0 && (
            <button
              onClick={() => generateBatchQr(batchQrItems)}
              disabled={isGeneratingQr}
              className={`bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 ${isGeneratingQr ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            >
              {isGeneratingQr ? 'Generating...' : `Generate ${batchQrItems.length} QR Codes`}
            </button>
          )}

          <button
            onClick={() => setBatchQrItems([])}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Clear Selection
          </button>
        </div>

        {/* Selected Items for Batch QR */}
        {batchQrItems.length > 0 && (
          <div className="mb-6">
            <h4 className="text-lg font-medium mb-2">Selected Items ({batchQrItems.length})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {batchQrItems.map(item => (
                <div key={item.id} className="border p-3 rounded">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">{item.unitNumber}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* QR Code Preview Modal */}
        {qrPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-md">
              <h3 className="text-xl font-semibold mb-4">QR Code Preview</h3>
              <div className="flex flex-col items-center">
                <QRCode
                  value={JSON.stringify(qrPreview.data)}
                  size={256}
                  level="H"
                  includeMargin={true}
                />
                <div className="mt-4 text-center">
                  <div className="font-medium">{qrPreview.item.name}</div>
                  <div className="text-sm text-gray-600">{qrPreview.item.unitNumber}</div>
                </div>
              </div>
              <button
                onClick={() => setQrPreview(null)}
                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>

      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-md w-full max-w-lg">
            <h2 className="text-xl font-semibold mb-4">Edit Item</h2>

            {/* Editable Fields */}
            <div className="space-y-4">
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                placeholder="Name"
              />
              <input
                type="number"
                className="border p-2 rounded w-full"
                value={editingItem.quantity}
                onChange={(e) => setEditingItem({ ...editingItem, quantity: parseInt(e.target.value) })}
                placeholder="Quantity"
                min="0"
              />
              <select
                value={editingItem.itemCondition}
                onChange={e => setEditingItem({ ...editingItem, itemCondition: e.target.value })}
                className="border p-2 rounded w-full"
              >
                <option value="New">New</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Damaged">Damaged</option>
                <option value="For Repair">For Repair</option>
                <option value="Lost">Lost</option>
                <option value="Decommissioned">Decommissioned</option>
              </select>
              <input
                type="text"
                className="border p-2 rounded w-full"
                value={editingItem.lab}
                onChange={(e) => setEditingItem({ ...editingItem, lab: e.target.value })}
                placeholder="Lab (Mac Lab, EMC Lab, etc.)"
              />
              <textarea
                className="border p-2 rounded w-full"
                value={editingItem.description}
                onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                placeholder="Description"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;