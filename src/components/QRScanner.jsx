import React, { useState, useCallback } from "react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useTheme } from "../context/ThemeContext";
import { toast } from "react-toastify";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import { useNavigate } from "react-router-dom";

function QRScanner() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);

  const handleScanError = useCallback((err) => {
    console.error("QR Scan Error:", err);
    setError(err.message);
    setScanning(false);
    toast.error("Failed to scan QR code");
  }, []);

  const handleScanResult = useCallback((result) => {
    try {
      setScanning(false);
      setScanResult(result);
      toast.success("QR code scanned successfully!");
    } catch (err) {
      handleScanError(err);
    }
  }, [handleScanError]);

  const startScanning = useCallback(() => {
    setScanning(true);
    setError(null);
    setScanResult(null);
  }, []);

  return (
    <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800" : "bg-white"}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">QR Code Scanner</h2>
        <Button
          onClick={() => navigate(-1)}
          color="gray"
          className="hover:bg-gray-700"
          aria-label="Go back"
        >
          Back
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded">
          <p>{error}</p>
        </div>
      )}

      {scanResult ? (
        <div className="mb-4 p-4 bg-green-100 text-green-700 rounded">
          <p>Scanned Result: {scanResult}</p>
          <Button
            onClick={startScanning}
            color="blue"
            className="mt-4"
            aria-label="Scan another QR code"
          >
            Scan Another
          </Button>
        </div>
      ) : (
        <div>
          {!scanning ? (
            <div className="flex justify-center">
              <Button
                onClick={startScanning}
                color="blue"
                size="lg"
                className="mr-2"
              >
                Start Scanning
              </Button>
              <Button
                onClick={() => navigate(-1)}
                color="gray"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="relative">
              {scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                  <LoadingSpinner size="large" />
                </div>
              )}
              <Scanner
                onResult={handleScanResult}
                onError={handleScanError}
                options={{
                  delayBetweenScanAttempts: 100,
                  delayBetweenScanSuccess: 500,
                }}
                className="rounded-lg"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QRScanner;