import React, { useEffect, useState, useMemo } from "react";
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
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { toast } from 'react-toastify';

function Requests() {
  usePageTitle("QCheckCITE - Manage Requests");

  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  // Memoize filtered requests
  const filteredRequests = useMemo(() => {
    return filter === "all"
      ? requests
      : requests.filter(request => request.status === filter);
  }, [requests, filter]);

  useEffect(() => {
    setLoading(true);
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
      setLoading(false);
    });

    return () => unsubscribe();
  }, [filter]);

  const updateRequestStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, "requests", id), { status });
      toast.success(`Request ${status}.`);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    }
  };

  // Row component for virtual list
  const Row = ({ index, style }) => {
    const request = filteredRequests[index];
    return (
      <div style={style} className="border-b p-4">
        <div className="grid grid-cols-4 gap-4 items-center">
          <div>
            <div className="font-medium">{request.itemName}</div>
            <div className="text-sm text-gray-600">Requested by: {request.userEmail}</div>
          </div>
          <div>
            <div className="text-sm">Quantity: {request.quantity}</div>
            <div className="text-sm">Date: {new Date(request.createdAt?.toDate()).toLocaleDateString()}</div>
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-white ${request.status === 'pending' ? 'bg-yellow-500' :
                request.status === 'approved' ? 'bg-green-500' :
                  'bg-red-500'
              }`}>
              {request.status}
            </span>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => updateRequestStatus(request.id, 'approved')}
              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              disabled={request.status === 'approved'}
            >
              Approve
            </button>
            <button
              onClick={() => updateRequestStatus(request.id, 'rejected')}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
              disabled={request.status === 'rejected'}
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseDashboard role="admin">
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Manage Requests</h1>

        {/* Filter Controls */}
        <div className="mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {/* Virtualized List */}
        <div className="bg-white rounded-lg shadow" style={{ height: '600px' }}>
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-lg">Loading requests...</div>
            </div>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  itemCount={filteredRequests.length}
                  itemSize={100}
                  width={width}
                >
                  {Row}
                </List>
              )}
            </AutoSizer>
          )}
        </div>
      </div>
    </BaseDashboard>
  );
}

export default Requests;
