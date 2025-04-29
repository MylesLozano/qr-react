import React, { useState, useEffect } from 'react';
import QRCodeManager from '../../components/QRCodeManager';
import { toast } from 'react-toastify';
import BaseDashboard from "../BaseDashboard";
import usePageTitle from "../../hooks/usePageTitle";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from 'react-router-dom';

function AdminDashboard() {
  usePageTitle("QCheckCITE - Admin");

  const [isGenerating, setIsGenerating] = useState(false);
  const [qrPreview, setQrPreview] = useState(null);

  const handleGenerateQR = async (item) => {
    setIsGenerating(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setQrPreview({
        item,
        data: {
          id: item.id,
          name: item.name,
          unitNumber: item.unitNumber,
          lab: item.lab,
          condition: item.itemCondition,
          lastUpdated: new Date().toISOString()
        }
      });
      toast.success('QR code generated successfully!');
    } catch (error) {
      console.error('Error generating QR:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePreviewQR = (item) => {
    setQrPreview({
      item,
      data: {
        id: item.id,
        name: item.name,
        unitNumber: item.unitNumber,
        lab: item.lab,
        condition: item.itemCondition,
        lastUpdated: new Date().toISOString()
      }
    });
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
        toast.error("Failed to load dashboard statistics");
      } finally {
        setLoadingCounts(false);
      }
    };

    fetchCounts();
  }, []);

  return (
    <BaseDashboard role="admin">
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Total Users</h2>
            <p className="text-3xl font-bold text-blue-600">
              {loadingCounts ? "..." : userCount}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-2">Pending Requests</h2>
            <p className="text-3xl font-bold text-yellow-600">
              {loadingCounts ? "..." : pendingRequestsCount}
            </p>
          </div>
        </div>
        {/* QR Code Generator Section */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">QR Code Generator</h2>

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

          {/* QR Preview Modal */}
          {qrPreview && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-4">QR Code Preview</h3>
                <QRCodeManager
                  item={qrPreview.item}
                  onPreview={handlePreviewQR}
                  isGenerating={isGenerating}
                  showActions={false}
                />
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
        <div className="mt-6">
          <Link to="reports" className="nav-link">
            <i className="fas fa-chart-bar"></i> Reports
          </Link>
          <Link to="templates" className="nav-link">
            <i className="fas fa-file-alt"></i> Report Templates
          </Link>
          <Link to="generate-report" className="nav-link">
            <i className="fas fa-file-export"></i> Generate Report
          </Link>
        </div>
      </div>
    </BaseDashboard>
  );
}

export default AdminDashboard;
