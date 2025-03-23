import React, { useState, useRef } from "react";
import QRCode from "react-qr-code";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import BaseDashboard from "./BaseDashboard";
import usePageTitle from "../hooks/usePageTitle";

function AdminDashboard() {
  usePageTitle("QCheckCITE - Admin");

  const [qrValue, setQrValue] = useState("https://yourwebsite.com"); // Default QR value
  const qrRef = useRef(null);

  // 📥 Function to Download QR Code as Image
  const downloadQR = async () => {
    if (!qrRef.current) return;

    const canvas = await html2canvas(qrRef.current);
    canvas.toBlob((blob) => {
      saveAs(blob, "qrcode.png");
    });
  };

  return (
    <BaseDashboard role="admin">
      <h1 className="text-3xl font-bold mb-4">Admin Dashboard</h1>

      {/* QR Code Generator Section */}
      <div className="bg-white p-6 shadow rounded-lg text-center">
        <h2 className="text-xl font-semibold mb-4">Generate QR Code</h2>

        {/* Input Field for Custom QR Code Value */}
        <input
          type="text"
          className="border p-2 rounded w-full mb-4"
          placeholder="Enter text or URL"
          value={qrValue}
          onChange={(e) => setQrValue(e.target.value)}
        />

        {/* QR Code Display */}
        <div ref={qrRef} className="p-4 bg-white inline-block">
          <QRCode value={qrValue} size={256} />
        </div>

        {/* Download Button */}
        <button
          onClick={downloadQR}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Download QR Code
        </button>
      </div>
    </BaseDashboard>
  );
}

export default AdminDashboard;
