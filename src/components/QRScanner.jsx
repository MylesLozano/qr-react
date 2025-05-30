import { useState, useCallback, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner'; // Changed back to Scanner which is the correct export
import { BrowserQRCodeReader } from '@zxing/browser';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { canScanQR } from '../utils/roleUtils';
import { parseQrScanResult, getQrErrorMessage } from '../utils/qrUtils';
import { toast } from 'react-toastify';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';

function QRScanner({ isInDashboard = false }) {
  const { isDarkMode } = useTheme();
  const { /* user, */ role } = useAuth();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  /* Commenting out unused state, but kept for future implementation */
  // const [parsedResult, setParsedResult] = useState(null);
  const [loadingComponent, setLoadingComponent] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const canScan = canScanQR(role);

  // Add a delay before loading the scanner to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingComponent(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);
  
  // Make sure we have permissions
  useEffect(() => {
    if (!canScan) {
      setError('You do not have permission to scan QR codes. Please contact your administrator.');
      return;
    }

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
  }, [canScan]);
  
  const handleScanError = useCallback((err) => {
    console.error('QR Scan Error:', err);
    const errorMsg = getQrErrorMessage('scan', err);
    setError(errorMsg);
    setScanning(false);
    toast.error(errorMsg);
  }, []);
  
  // Navigate to item details
  const navigateToItem = useCallback((itemId) => {
    if (itemId) {
      navigate(`/inventory/item/${itemId}`);
    }
  }, [navigate]);
  
  const handleScanResult = useCallback(async (detectedCodes) => {
    try {
      setScanning(false);
      
      // The latest @yudiel/react-qr-scanner version returns an array of detected barcodes
      // We'll use the first detected code's rawValue
      if (!detectedCodes || detectedCodes.length === 0) {
        return;
      }
      
      const scannedText = detectedCodes[0].rawValue;
      
      // Parse the scan result using our utility function
      const parsedData = parseQrScanResult(scannedText);
      
      if (parsedData.valid) {
        // Set scan result based on the type of QR code detected
        if (parsedData.type === 'qrstring') {
          setScanResult(`Item ID: ${parsedData.itemId} (${parsedData.raw})`);
          toast.success('QR code scanned successfully!');
          
          // Prompt user to view item details after a brief delay
          setTimeout(() => {
            if (window.confirm(`Item ${parsedData.itemId} found. View details?`)) {
              navigateToItem(parsedData.itemId);
            }
          }, 800);
        } else if (parsedData.type === 'legacy-json') {
          setScanResult(`Item ID: ${parsedData.itemId} (Legacy QR)`);
          toast.success('Legacy QR code scanned successfully!');
          
          // Prompt user to view item details after a brief delay
          setTimeout(() => {
            if (window.confirm(`Legacy Item ${parsedData.itemId} found. View details?`)) {
              navigateToItem(parsedData.itemId);
            }
          }, 800);
        }
      } else {
        // Display appropriate error message for invalid QR formats
        setScanResult(`Unrecognized format: ${parsedData.raw.substring(0, 50)}${parsedData.raw.length > 50 ? '...' : ''}`);
        toast.warning(parsedData.error || 'QR code scanned, but not in expected format.');
      }
    } catch (err) {
      handleScanError(err);
    }
  }, [handleScanError, navigateToItem]);

  // Handle file uploads for QR code scanning
  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(URL.createObjectURL(file)); // Save for preview

    try {
      // Show scanning state
      setScanning(true);
      
      const image = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

      const reader = new BrowserQRCodeReader();
      const result = await reader.decodeFromImageElement(canvas);
      
      if (result?.text) {
        // Use the same parsing utility we use for camera scanning
        const parsedData = parseQrScanResult(result.text);
        
        if (parsedData.valid) {
          if (parsedData.type === 'qrstring') {
            setScanResult(`Item ID: ${parsedData.itemId} (${parsedData.raw})`);
            toast.success('QR code decoded from image!');
            
            // Prompt user to view item details after a brief delay
            setTimeout(() => {
              if (window.confirm(`Item ${parsedData.itemId} found. View details?`)) {
                navigateToItem(parsedData.itemId);
              }
            }, 800);
          } else if (parsedData.type === 'legacy-json') {
            setScanResult(`Item ID: ${parsedData.itemId} (Legacy QR)`);
            toast.success('Legacy QR code decoded from image!');
            
            // Prompt user to view item details after a brief delay
            setTimeout(() => {
              if (window.confirm(`Legacy Item ${parsedData.itemId} found. View details?`)) {
                navigateToItem(parsedData.itemId);
              }
            }, 800);
          }
        } else {
          setScanResult(`Unrecognized format: ${parsedData.raw.substring(0, 50)}${parsedData.raw.length > 50 ? '...' : ''}`);
          toast.warning(parsedData.error || 'QR code decoded, but not in expected format.');
        }
      } else {
        toast.error('Could not detect a QR code in this image.');
      }
    } catch (err) {
      console.error('Image QR decode error:', err);
      toast.error('Failed to decode image QR code');
    } finally {
      setScanning(false);
    }
  }, [navigateToItem]);

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
          <p>Scanned Result: {scanResult}</p>                <div className="flex flex-wrap gap-2 mt-4">
            <Button
              onClick={startScanning}
              color="blue"
              aria-label="Scan another QR code"
            >
              Scan Another
            </Button>
            {scanResult && scanResult.includes('Item ID:') && (
              <Button
                onClick={() => {
                  const itemId = scanResult.match(/Item ID: ([^(]+)/)?.[1]?.trim();
                  if (itemId) {
                    navigateToItem(itemId);
                  }
                }}
                color="green"
                aria-label="View item details"
              >
                View Item Details
              </Button>
            )}
          </div>
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
                onScan={handleScanResult}
                onError={handleScanError}
                scanDelay={100}
                constraints={{
                  facingMode: 'environment' // Use the back camera when available
                }}
                styles={{
                  container: { borderRadius: '0.5rem' },
                  video: { borderRadius: '0.5rem' }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QRScanner;
