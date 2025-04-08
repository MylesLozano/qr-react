import React, { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  query,
  where,
  orderBy
} from "firebase/firestore";
import { db } from "../../firebase";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";

function Requests() {
  usePageTitle("QCheckCITE - Manage Requests");

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const requestsRef = collection(db, "requests");
    const q =
    filter === "all"
        ? query(requestsRef, orderBy("createdAt", "desc"))
        : query(
            requestsRef,
            where("status", "==", filter),
            orderBy("createdAt", "desc")
        );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(data);
    });

    return () => unsubscribe();
  }, [filter]);

  const updateRequestStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "requests", id), { status });
      alert(`Request ${status}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status.");
    }
  };

  return (
    <BaseDashboard role="admin">
      <h1 className="text-3xl font-bold mb-6">Manage Requests</h1>

      {/* Filter Options */}
      <div className="mb-4">
        <label className="mr-2 font-semibold">Filter by Status:</label>
        <select
          className="border p-2 rounded"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Requests Table */}
      {requests.length === 0 ? (
        <p className="text-gray-500">No requests to show.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-300">
            <thead>
              <tr className="bg-gray-100 text-center">
                <th className="p-2 border">User</th>
                <th className="p-2 border">Item</th>
                <th className="p-2 border">Quantity</th>              
                <th className="p-2 border">Reason</th>
                <th className="p-2 border">Usage Location</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Date Requested</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="text-center">
                  <td className="p-2 border">{req.userEmail || "N/A"}</td>
                  <td className="p-2 border">{req.itemName}</td>
                  <td className="p-2 border">{req.quantity}</td>                  
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
                  <td className="p-2 border space-x-2">
                    {req.status === "pending" && (
                      <>
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                          onClick={() => updateRequestStatus(req.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                          onClick={() => updateRequestStatus(req.id, "rejected")}
                        >
                          Reject
                        </button>
                      </>
                    )}
                    {req.status !== "pending" && <span className="text-gray-400">No actions</span>}
                  </td>
                  <td className="p-2 border">{req.createdAt?.toDate().toLocaleString() || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseDashboard>
  );
}

export default Requests;
