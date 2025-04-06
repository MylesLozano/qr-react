import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import { db, auth } from "../../firebase";
import usePageTitle from "../../hooks/usePageTitle";
import BaseDashboard from "../BaseDashboard";

function MyRequests() {
  usePageTitle("QCheckCITE - My Requests");

  const [requests, setRequests] = useState([]);
  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [usageLocation, setUsageLocation] = useState("");

  // Fetch user requests
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, "requests"), where("userId", "==", user.uid));
        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const userRequests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          setRequests(userRequests);
        });

        return () => unsubscribeSnapshot(); // Clean up snapshot listener
      }
    });

    return () => unsubscribe(); // Clean up auth listener
  }, []);

  // Handle request submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) return alert("You must be logged in.");

    try {
      await addDoc(collection(db, "requests"), {
        userId: user.uid,
        userEmail: user.email,
        itemName,
        quantity,
        createdAt: serverTimestamp(),
        reason,
        usageLocation,
        status: "pending"
      });

      alert("Request submitted!");
      setItemName("");
      setQuantity(1);
      setReason("");
      setUsageLocation("");
    } catch (error) {
      console.error("Error submitting request:", error);
      alert("Failed to submit request.");
    }
  };

  // Handle request deletion
  const handleDelete = async (id) => {
    const confirm = window.confirm("Are you sure you want to cancel this request?");
    if (!confirm) return;

    try {
      await deleteDoc(doc(db, "requests", id));
      alert("Request successfully cancelled.");
    } catch (error) {
      console.error("Error cancelling request:", error);
      alert("An error occurred while cancelling the request.");
    }
  };

  return (
    <BaseDashboard role="user">
      <h1 className="text-3xl font-bold mb-6">My Requests</h1>

      {/* Request Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-4 mb-6">
        <input
          type="text"
          placeholder="Item Name"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full"
        />
        <input
          type="number"
          placeholder="Quantity"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="p-2 border border-gray-300 rounded w-full"
        />
        <input
          type="text"
          placeholder="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full"
        />
        <input
          type="text"
          placeholder="Usage Location"
          value={usageLocation}
          onChange={(e) => setUsageLocation(e.target.value)}
          className="p-2 border border-gray-300 rounded w-full"
        />
        <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
          Submit Request
        </button>
      </form>

      {requests.length === 0 ? (
        <p className="text-gray-500">You have no requests yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Quantity</th>
                <th className="p-2 border">Date Requested</th>
                <th className="p-2 border">Reason</th>
                <th className="p-2 border">Usage Location</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="text-center">
                  <td className="p-2 border">{req.itemName}</td>
                  <td className="p-2 border">{req.quantity}</td>
                  <td className="p-2 border">{req.createdAt?.toDate().toLocaleString() || "N/A"}</td>
                  <td className="p-2 border">{req.reason || "N/A"}</td>
                  <td className="p-2 border">{req.usageLocation || "N/A"}</td>
                  <td className="p-2 border">
                    <span
                      className={`px-2 py-1 rounded text-white ${
                        req.status === "approved"
                          ? "bg-green-500"
                          : req.status === "rejected"
                          ? "bg-red-500"
                          : "bg-yellow-500"
                      }`}
                    >
                      {req.status || "Pending"}
                    </span>
                  </td>
                  <td className="p-2 border">
                    {req.status === "pending" && (
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        onClick={() => handleDelete(req.id)}
                      >
                        Cancel
                      </button>
                    )}
                    {req.status !== "pending" && <span className="text-gray-400">No actions</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseDashboard>
  );
}

export default MyRequests;
