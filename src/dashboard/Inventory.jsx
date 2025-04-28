import React, { useState, useEffect } from "react";
import { collection, addDoc, query, orderBy, onSnapshot, doc, deleteDoc, getDoc } from "firebase/firestore";
import { db, logAudit, auth } from "../firebase";
import { serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import Papa from "papaparse";

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
  
  // State for category grouping and expanded categories
  const [categoryGroups, setCategoryGroups] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCondition, setFilterCondition] = useState("");
  const [filterLab, setFilterLab] = useState("");
  
  const [csvData, setCsvData] = useState([]);
  const [role, setRole] = useState("");

  const [editingItem, setEditingItem] = useState(null);

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
      
      // Group items by category
      const groups = {};
      fetchedItems.forEach(item => {
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
      setCategoryGroups(groups);
    });

    return () => unsubscribe();
  }, []);

  const addItem = async () => {
    const { name, category, quantity } = formData;
    if (!name.trim() || !category.trim() || quantity < 0) {
      toast.error("Name, Category and Quantity are required!");
      return;
    }
    try {
      await addDoc(collection(db, "inventory"), {
        ...formData,
        createdAt: serverTimestamp()
      });
      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Added item: ${formData.name}`);
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
      toast.error("Error adding item: " + error.message);
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
    try {
      // Check user role before proceeding
      if (!auth.currentUser) {
        toast.error("You must be logged in to upload CSV");
        return;
      }
      const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (!userDoc.exists() || !["admin", "superadmin"].includes(userDoc.data().role)) {
        toast.error("You don't have permission to upload CSV");
        return;
      }

      console.log("Starting bulk upload with data:", csvData);
      for (const row of csvData) {
        console.log("Processing row:", row);
        await addDoc(collection(db, "inventory"), {
          unitNumber: row.unitNumber || "",
          name: row.name,
          brand: row.brand || "",
          serialNumber: row.serialNumber || "",
          dateAcquired: row.dateAcquired || "",
          quantity: parseInt(row.quantity) || 0,
          remarks: row.remarks || "",
          category: row.category || "",
          description: row.description || "",
          lab: row.lab || "",
          uniqueQR: row.uniqueQR === "true" || false,
          itemCondition: row.itemCondition || "New",
          createdAt: serverTimestamp(),
        });
      }
      toast.success("CSV uploaded successfully!");
      setCsvData([]);
    } catch (error) {
      console.error("Bulk upload error:", error);
      toast.error("Error uploading CSV: " + error.message);
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
      // Apply search filter if exists
      const matchesSearch = !searchTerm || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Apply condition filter if exists
      const matchesCondition = !filterCondition || item.itemCondition === filterCondition;
      
      // Apply lab filter if exists
      const matchesLab = !filterLab || item.lab === filterLab;
      
      return matchesSearch && matchesCondition && matchesLab;
    });
  };

  // Get available conditions and labs for filters
  const availableConditions = ["New", "Good", "Fair", "Damaged", "For Repair", "Lost", "Decommissioned"];
  const availableLabs = [...new Set(items.map(item => item.lab).filter(Boolean))];

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
              onChange={(e) => setFormData({...formData, unitNumber: e.target.value})}
            />
            <input
              type="text"
              placeholder="Name"
              className="border p-2 rounded"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
            <input
              type="text"
              placeholder="Brand"
              className="border p-2 rounded"
              value={formData.brand}
              onChange={(e) => setFormData({...formData, brand: e.target.value})}
            />
            <input
              type="text"
              placeholder="Serial Number"
              className="border p-2 rounded"
              value={formData.serialNumber}
              onChange={(e) => setFormData({...formData, serialNumber: e.target.value})}
            />
            <input
              type="text"
              placeholder="Category"
              className="border p-2 rounded"
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
            />
            <input
              type="date"
              placeholder="Date Acquired"
              className="border p-2 rounded"
              value={formData.dateAcquired}
              onChange={(e) => setFormData({...formData, dateAcquired: e.target.value})}
            />
            <input
              type="number"
              placeholder="Quantity"
              className="border p-2 rounded"
              value={formData.quantity}
              onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
              min="0"
            />
            <input
              type="text"
              placeholder="Remarks"
              className="border p-2 rounded"
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
            />
            <input
              type="text"
              placeholder="Description"
              className="border p-2 rounded"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
            <select
              className="border p-2 rounded"
              value={formData.lab}
              onChange={(e) => setFormData({...formData, lab: e.target.value})}
            >
              <option value="">Select Lab (Optional)</option>
              <option value="Mac Laboratory">Mac Laboratory</option>
              <option value="Entertainment and Multimedia Computing Lab">EMC Lab</option>
              <option value="Other">Other</option>
            </select>
            <select
              className="border p-2 rounded"
              value={formData.itemCondition}
              onChange={(e) => setFormData({...formData, itemCondition: e.target.value})}
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
                onChange={(e) => setFormData({...formData, uniqueQR: e.target.checked})}
                className="mr-2"
              />
              <label htmlFor="uniqueQR">Create Unique QR?</label>
            </div>
          </div>

          <button
            onClick={addItem}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Add Item
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
                className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Upload CSV ({csvData.length} items)
              </button>
            )}
          </div>
        </>
      )}

      {/* Search and Filters */}
      <div className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <input
                    type="text"
                    placeholder="Search items..."
                    className="border p-2 rounded w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filter by Condition</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={filterCondition}
                    onChange={(e) => setFilterCondition(e.target.value)}
                  >
                    <option value="">All Conditions</option>
                    {availableConditions.map(condition => (
                      <option key={condition} value={condition}>{condition}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Filter by Lab</label>
                  <select
                    className="border p-2 rounded w-full"
                    value={filterLab}
                    onChange={(e) => setFilterLab(e.target.value)}
                  >
                    <option value="">All Labs</option>
                    {availableLabs.map(lab => (
                      <option key={lab} value={lab}>{lab}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end">
                  <button 
                    onClick={() => {
                      setSearchTerm("");
                      setFilterCondition("");
                      setFilterLab("");
                    }}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
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