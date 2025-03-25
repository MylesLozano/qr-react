import React, { useState, useEffect } from "react";
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  deleteDoc 
} from "firebase/firestore";
import { db, logAudit } from "../firebase";
import { auth } from "../firebase"; // Import auth for role tracking
import { serverTimestamp } from "firebase/firestore";
import { toast } from "react-toastify"; // For notifications

function Inventory() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState("");

  useEffect(() => {
    const q = query(collection(db, "inventory"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setItems(querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, []);

  const addItem = async () => {
    if (newItem.trim() === "") {
      toast.error("Item name cannot be empty!");
      return;
    }

    try {
      await addDoc(collection(db, "inventory"), {
        name: newItem.trim(),
        createdAt: serverTimestamp(), // Use Firestore timestamp
      });

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Added new item: ${newItem}`);
      }

      toast.success("Item added successfully!");
      setNewItem("");
    } catch (error) {
      toast.error("Error adding item: " + error.message);
    }
  };

  const deleteItem = async (id, name) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete "${name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "inventory", id));

      if (auth.currentUser) {
        await logAudit(auth.currentUser.email, `Deleted item: ${name}`);
      }

      toast.info(`"${name}" has been deleted.`);
    } catch (error) {
      toast.error("Error deleting item: " + error.message);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      addItem();
    }
  };

  return (
    <div className="p-6 bg-white shadow-md rounded-md">
      <h2 className="text-2xl font-semibold mb-4">Inventory Management</h2>
      
      {/* Input Field & Add Button */}
      <div className="flex mb-4">
        <input
          type="text"
          className="border p-2 flex-1 rounded"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyPress={handleKeyPress} // Handle Enter key
          placeholder="Enter item name"
        />
        <button 
          className="ml-2 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
          onClick={addItem}
        >
          Add Item
        </button>
      </div>

      {/* Inventory Table */}
      <table className="w-full border-collapse border border-gray-300">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border border-gray-300">Item Name</th>
            <th className="p-2 border border-gray-300">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan="2" className="p-4 text-center text-gray-500">
                No items found.
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td className="p-2 border border-gray-300">{item.name}</td>
                <td className="p-2 border border-gray-300 text-center">
                  <button
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition"
                    onClick={() => deleteItem(item.id, item.name)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Inventory;
