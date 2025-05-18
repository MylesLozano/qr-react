import { useState, useCallback, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useTheme } from '../hooks/useTheme';
import { toast } from 'react-toastify';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';

function QRScanner({ isInDashboard = false }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [loadingComponent, setLoadingComponent] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);

  // Add a delay before loading the scanner to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingComponent(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Make sure we have permissions
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then(() => {
          console.info('Camera permission granted');
        })
        .catch((err) => {
          console.error('Camera permission denied:', err);
          setError('Camera permission denied. Please allow camera access to scan QR codes.');
        });
    } else {
      setError('Camera access is not supported in this browser.');
    }
  }, []);

  const handleScanError = useCallback((err) => {
    console.error('QR Scan Error:', err);
    setError(err.message || 'Failed to scan QR code');
    setScanning(false);
    toast.error('Failed to scan QR code');
  }, []);

  const handleScanResult = useCallback(
    (result) => {
      try {
        setScanning(false);
        setScanResult(result);
        toast.success('QR code scanned successfully!');
      } catch (err) {
        handleScanError(err);
      }
    },
    [handleScanError]
  );

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(URL.createObjectURL(file)); // Save for preview

    try {
      const image = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageElement(canvas);
      if (result?.text) {
        setScanResult(result.text);
        toast.success('QR code decoded from image!');
      } else {
        toast.error('Could not detect a QR code in this image.');
      }
    } catch (err) {
      console.error('Image QR decode error:', err);
      toast.error('Failed to decode image QR code');
    }
  };

  const startScanning = useCallback(() => {
    setScanning(true);
    setError(null);
    setScanResult(null);
  }, []);
  const handleBack = useCallback(() => {
    if (isInDashboard) {
      navigate('/user-dashboard', { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, isInDashboard]);

  if (loadingComponent) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">QR Code Scanner</h2>
        {!isInDashboard && (
          <Button
            onClick={handleBack}
            color="gray"
            className="hover:bg-gray-700"
            aria-label="Go back"
          >
            Back
          </Button>
        )}
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
            <>
              <div className="flex justify-center">
                <Button onClick={startScanning} color="blue" size="lg" className="mr-2">
                  Start Scanning
                </Button>
                {!isInDashboard && (
                  <Button onClick={handleBack} color="gray" size="lg">
                    Cancel
                  </Button>
                )}
              </div>

              <div className="mt-4">
                <label className="block mb-2 text-sm font-medium">Upload QR Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className={`block text-sm ${isDarkMode ? 'text-white' : 'text-gray-700'}`}
                />

                {uploadedFile && (
                  <div className="mt-4 flex flex-col items-start gap-2">
                    <img
                      src={uploadedFile}
                      alt="Uploaded preview"
                      className="max-h-40 rounded border"
                    />
                    <Button onClick={() => setUploadedFile(null)} color="gray" size="sm">
                      Clear Upload
                    </Button>
                  </div>
                )}
              </div>
            </>
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
