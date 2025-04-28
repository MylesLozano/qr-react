import React, { useState, useEffect } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, onSnapshot, getCountFromServer } from "firebase/firestore";
import { db, auth } from "../../firebase";

function UserDashboard() {
  usePageTitle("QCheckCITE - User");
  const [scanResult, setScanResult] = useState(null);
  const [paused, setPaused] = useState(false);

  // State for dynamic counts
  const [inventoryCount, setInventoryCount] = useState(0);
  const [myRequestsCount, setMyRequestsCount] = useState(0);
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    setLoadingCounts(true);
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoadingCounts(false);
      return; // Should not happen if protected route works, but good practice
    }

    const inventoryCol = collection(db, "inventory");
    const myRequestsCol = collection(db, "requests");

    // --- Fetch Inventory Count (Example using getCountFromServer for one-time fetch) ---
    const fetchInventoryCount = async () => {
      try {
        const snapshot = await getCountFromServer(inventoryCol);
        setInventoryCount(snapshot.data().count);
      } catch (error) {
        console.error("Error fetching inventory count:", error);
      }
    };

    fetchInventoryCount(); // Call the async function

    // --- Fetch User Request Counts (Example using onSnapshot for real-time) ---
    const myRequestsQuery = query(myRequestsCol, where("userId", "==", currentUser.uid));

    const unsubscribe = onSnapshot(myRequestsQuery, (snapshot) => {
      let total = 0;
      let approved = 0;
      snapshot.forEach(doc => {
        total++;
        if (doc.data().status === 'approved') {
          approved++;
        }
      });
      setMyRequestsCount(total);
      setApprovedRequestsCount(approved);
      setLoadingCounts(false); // Set loading false after counts are updated
    }, (error) => {
      console.error("Error fetching request counts:", error);
      setLoadingCounts(false);
    });

    // Cleanup listener
    return () => unsubscribe();

  }, []); // Runs once on mount

  return (
    <BaseDashboard role="user">
      <h1 className="text-3xl font-bold mb-4">User Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">Available Inventory</h2>
          <p className="text-2xl mt-2">
            {loadingCounts ? "..." : inventoryCount}
          </p>
        </div>
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">My Requests</h2>
          <p className="text-2xl mt-2">
            {loadingCounts ? "..." : myRequestsCount}
          </p>
        </div>
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">Approved Requests</h2>
          <p className="text-2xl mt-2">
            {loadingCounts ? "..." : approvedRequestsCount}
          </p>
        </div>
      </div>

      {/* QR Scanner Section */}
      <div className="mt-8 bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Scan QR Code</h2>
        <Scanner
          onScan={(result) => {
            setScanResult(result);
            setPaused(true);
          }}
          onError={(error) => console.error("QR Scan Error:", error)}
          formats={["qr_code", "code_128"]}
          paused={paused}
          classNames={{ container: "w-full h-auto" }}
        />
        {scanResult && (
          <div className="mt-3 p-3 bg-gray-100 rounded">
            <h3 className="font-semibold">Scanned Code:</h3>
            <p>{scanResult}</p>
            <button
              onClick={() => setPaused(false)}
              className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
            >
              Scan Again
            </button>
          </div>
        )}
      </div>
    </BaseDashboard>
  );
}

export default UserDashboard;