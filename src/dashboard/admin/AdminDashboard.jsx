import React, { useState } from 'react';
import QRCodeManager from '../../components/QRCodeManager';
import { toast } from 'react-toastify';
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "../../firebase";

function AdminDashboard() {
  usePageTitle("QCheckCITE - Admin");

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateQR = async (item) => {
    setIsGenerating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrValue(JSON.stringify({
        id: item.id,
        name: item.name,
        unitNumber: item.unitNumber,
        lab: item.lab,
        condition: item.itemCondition,
        lastUpdated: new Date().toISOString()
      }));
      toast.success('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewQR = (item) => {
    setQrValue(JSON.stringify({
      id: item.id,
      name: item.name,
      unitNumber: item.unitNumber,
      lab: item.lab,
      condition: item.itemCondition,
      lastUpdated: new Date().toISOString()
    }));
  };

  // State for summary data
  const [userCount, setUserCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  useEffect(() => {
    setLoadingCounts(true);
    const usersCol = collection(db, "users");
    const requestsCol = collection(db, "requests");

    const fetchCounts = async () => {
      try {
        // Fetch total users
        const userSnapshot = await getCountFromServer(usersCol);
        setUserCount(userSnapshot.data().count);

        // Fetch pending requests
        const pendingQuery = query(requestsCol, where("status", "==", "pending"));
        const pendingSnapshot = await getCountFromServer(pendingQuery);
        setPendingRequestsCount(pendingSnapshot.data().count);

      } catch (error) {
        console.error("Error fetching dashboard counts:", error);
        // Optionally set an error state here
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <BaseDashboard role="admin">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">Total Users</h2>
          <p className="text-2xl mt-2">
            {loadingCounts ? "..." : userCount}
          </p>
        </div>
        <div className="p-5 bg-white shadow rounded-lg text-center">
          <h2 className="text-xl font-bold">Pending Requests</h2>
          <p className="text-2xl mt-2">
            {loadingCounts ? "..." : pendingRequestsCount}
          </p>
        </div>
      </div>

      {/* QR Code Generator Section */}
      <div className="bg-white p-6 shadow rounded-lg text-center">
        <h2 className="text-xl font-semibold mb-4">QR Code Generator</h2>

        <div className="mb-4">
          <QRCodeManager
            item={{
              id: 'sample',
              name: 'Sample Item',
              unitNumber: '123',
              lab: 'Main Lab',
              itemCondition: 'Good',
              uniqueQR: true
            }}
            onGenerate={handleGenerateQR}
            onPreview={handlePreviewQR}
            isGenerating={isGenerating}
          />
        </div>
      </div>
    </BaseDashboard>
  );
}

export default AdminDashboard;
