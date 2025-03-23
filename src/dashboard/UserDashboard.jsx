import React, { useState } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import BaseDashboard from "./BaseDashboard";
import usePageTitle from "./usePageTitle";


function UserDashboard() {
  usePageTitle("QCheckCITE - User");
  const [scanResult, setScanResult] = useState(null);
  const [paused, setPaused] = useState(false);

  return (
    <BaseDashboard role="user">
      <h1 className="text-3xl font-bold mb-4">User Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">Available Inventory</h2>
          <p className="text-2xl mt-2">150</p>
        </div>
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">My Requests</h2>
          <p className="text-2xl mt-2">3</p>
        </div>
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">Approved Requests</h2>
          <p className="text-2xl mt-2">2</p>
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