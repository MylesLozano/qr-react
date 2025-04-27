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
    category: ""
  });
  const [csvData, setCsvData] = useState([]);
  const [role, setRole] = useState("");

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
      setItems(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
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
      setFormData({ unitNumber: "", name: "", brand: "", serialNumber: "", dateAcquired: "", quantity: 1, remarks: "", category: "" });
    } catch (error) {
      toast.error("Error adding item: " + error.message);
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

  return (
    <div className="p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Inventory Management</h2>

      {/* Add Item Form (Only for Admin/SuperAdmin) */}
      {(role === "superadmin" || role === "admin") && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {Object.keys(formData).map((key) => (
              <input
                key={key}
                type={key === "quantity" ? "number" : "text"}
                placeholder={key.replace(/([A-Z])/g, ' $1').trim()}
                className="border p-2 rounded"
                value={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: key === "quantity" ? parseInt(e.target.value) : e.target.value })}
              />
            ))}
          </div>
          <button onClick={addItem} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Add Item
          </button>

          {/* CSV Upload */}
          <div className="mt-6">
            <input
              type="file"
              accept=".csv"
              onChange={handleCsvUpload}
              className="mb-2 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
            />
            {csvData.length > 0 && (
              <button onClick={bulkUpload} className="ml-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
                Upload CSV ({csvData.length} items)
              </button>
            )}
          </div>
        </>
      )}

      {/* Inventory Table */}
      <div className="mt-8 overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-2 border">Unit</th>
              <th className="p-2 border">Name</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Serial No.</th>
              <th className="p-2 border">Category</th>
              <th className="p-2 border">Date Acquired</th>
              <th className="p-2 border">Quantity</th>
              <th className="p-2 border">Remarks</th>
              <th className="p-2 border">Stock Status</th>
              {(role === "superadmin" || role === "admin") && <th className="p-2 border">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan="10" className="text-center p-4">No items found.</td></tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="text-center">
                  <td className="p-2 border">{item.unitNumber || "N/A"}</td>
                  <td className="p-2 border">{item.name}</td>
                  <td className="p-2 border">{item.brand || "N/A"}</td>
                  <td className="p-2 border">{item.serialNumber || "N/A"}</td>
                  <td className="p-2 border">{item.category}</td>
                  <td className="p-2 border">{item.dateAcquired || "N/A"}</td>
                  <td className="p-2 border">{item.quantity}</td>
                  <td className="p-2 border">{item.remarks || "N/A"}</td>
                  <td className="p-2 border">
                    <span className={`px-2 py-1 rounded text-white ${stockStatusColor(item.quantity)}`}>{item.quantity > 0 ? (item.quantity >= 5 ? "Available" : "Low Stock") : "Out of Stock"}</span>
                  </td>
                  {(role === "superadmin" || role === "admin") && (
                    <td className="p-2 border">
                      <button onClick={() => deleteItem(item.id, item.name)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Inventory;
