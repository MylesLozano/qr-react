import { useState, useCallback, useEffect, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { BrowserQRCodeReader } from '@zxing/browser';
import { useTheme } from '../hooks/useTheme';
import { canScanQR, canPerformInspection } from '../utils/roleUtils'; 
import { parseQrScanResult, getQrErrorMessage } from '../utils/qrUtils';
import { toast } from 'react-toastify';
import Button from './Button';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';
import InspectionForm from './inventory/details/InspectionForm';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

function QRScanner({ isInDashboard = false, role }) {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [parsedResult, setParsedResult] = useState(null);
  const [loadingComponent, setLoadingComponent] = useState(true);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [itemData, setItemData] = useState(null);
  const [isLoadingItem, setIsLoadingItem] = useState(false);
  const scannerRef = useRef(null);
  const videoStreamRef = useRef(null);
  const canScan = canScanQR(role); 
  const canInspect = canPerformInspection(role);

  // Detect if user is on a mobile device
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    
    // Also check on resize (for responsive testing)
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add a delay before loading the scanner to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingComponent(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);
  // Pre-initialize camera permissions at component mount
  useEffect(() => {
    if (!canScan) {
      setError('You do not have permission to scan QR codes. Please contact your administrator.');
      return;
    }

    let mounted = true;
    
    const initializeCamera = async () => {
      // For desktop users, we should check if camera is available even before scanning starts
      if (!isMobile && !scanning && !cameraReady) {
        // Just check if camera is available, don't fully initialize yet
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          if (mounted) {
            setCameraReady(true);
          }
          return; // Don't fully initialize until user clicks scan
        } catch (err) {
          console.warn('Camera pre-check failed:', err);
          // Don't show error yet, wait until user attempts to scan
          return;
        }
      }
      
      // Don't initialize camera yet if we're not actively scanning to save resources
      if (!scanning) {
        return;
      }
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          // Define constraints based on device type
          const constraints = {
            video: isMobile
              ? {
                  facingMode: { ideal: 'environment' },
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  frameRate: { ideal: 15, max: 30 }, // Lower framerate can help with performance
                  aspectRatio: { ideal: 1.777 }
                }
              : {
                  width: { min: 640, ideal: 1280, max: 1920 },
                  height: { min: 480, ideal: 720, max: 1080 },
                  facingMode: 'user'
                }
          };
          
          // Request camera access with optimal constraints
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          
          // Make sure we're still mounted before setting state
          if (mounted) {
            console.info('Camera permission granted and initialized');
            setCameraReady(true);
            
            // Save stream reference for later cleanup
            videoStreamRef.current = stream;
            
            // For mobile devices, try to optimize camera for QR scanning
            if (isMobile) {
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack && typeof videoTrack.applyConstraints === 'function') {
                try {
                  // Try to set focus mode to continuous for better scanning
                  await videoTrack.applyConstraints({
                    advanced: [
                      { focusMode: 'continuous' },
                      { exposureMode: 'continuous' },
                      { whiteBalanceMode: 'continuous' }
                    ]
                  });
                } catch (constraintErr) {
                  console.warn('Could not apply advanced camera constraints:', constraintErr);
                }
              }
            }
          } else {
            // If no longer mounted, clean up the stream right away
            stream.getTracks().forEach(track => track.stop());
          }
        } catch (err) {
          if (mounted) {
            console.error('Camera initialization error:', err);
            
            // More descriptive error messages for mobile
            if (err.name === 'NotAllowedError') {
              setError('Camera access denied. Please allow camera access in your browser/device settings.');
            } else if (err.name === 'NotFoundError') {
              setError('No camera detected. Please ensure your device has a working camera.');
            } else if (err.name === 'NotReadableError' || err.name === 'AbortError') {
              setError('Camera is already in use by another application or not accessible.');
            } else if (err.name === 'OverconstrainedError') {
              // Try again with more relaxed constraints
              try {
                const simpleStream = await navigator.mediaDevices.getUserMedia({ 
                  video: true 
                });                if (mounted) {
                  setCameraReady(true);
                  videoStreamRef.current = simpleStream;
                } else {                  simpleStream.getTracks().forEach(track => track.stop());
                }
              } catch {
                setError('Camera error: Could not access any camera on this device.');
              }
            } else {
              setError(`Camera error: ${err.message || 'Unknown error accessing camera'}`);
            }
          }
        }
      } else {
        if (mounted) {
          setError('Camera access is not supported in this browser.');
        }
      }
    };
    
    // Small delay before initializing camera
    const initTimer = setTimeout(() => {
      initializeCamera();
    }, 500);
    
    // Clean up effect
    return () => {
      mounted = false;
      clearTimeout(initTimer);
    };  }, [canScan, scanning, isMobile, cameraReady]);
  
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
  
  // Fetch item data from Firestore
  const fetchItemData = useCallback(async (itemId) => {
    if (!itemId) return null;
    
    setIsLoadingItem(true);
    try {
      const itemRef = doc(db, 'inventory', itemId);
      const itemSnap = await getDoc(itemRef);
      
      if (itemSnap.exists()) {
        setIsLoadingItem(false);
        return { id: itemSnap.id, ...itemSnap.data() };
      } else {
        console.error('Item not found:', itemId);
        toast.error('Item not found in inventory system');
        setIsLoadingItem(false);
        return null;
      }
    } catch (err) {
      console.error('Error fetching item data:', err);
      toast.error('Failed to load item data');
      setIsLoadingItem(false);
      return null;
    }
  }, []);
  
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
          setParsedResult(parsedData); // Store the parsed data
          toast.success('QR code scanned successfully!');
          
          // If in inspection mode (admin/superadmin in dashboard), fetch item data immediately
          const isInspectionMode = (role === 'admin' || role === 'superadmin') && isInDashboard && canInspect;
          
          if (isInspectionMode) {
            const item = await fetchItemData(parsedData.itemId);
            if (item) {
              setItemData(item);
            }
          } else {
            // For normal user flow, prompt to view item details
            setTimeout(() => {
              if (window.confirm(`Item ${parsedData.itemId} found. View details?`)) {
                navigateToItem(parsedData.itemId);
              }
            }, 800);
          }
        } else if (parsedData.type === 'legacy-json') {
          setScanResult(`Item ID: ${parsedData.itemId} (Legacy QR)`);
          setParsedResult(parsedData); // Store the parsed data
          toast.success('Legacy QR code scanned successfully!');
          
          // Similar logic for legacy QR codes
          const isInspectionMode = (role === 'admin' || role === 'superadmin') && isInDashboard && canInspect;
          
          if (isInspectionMode) {
            const item = await fetchItemData(parsedData.itemId);
            if (item) {
              setItemData(item);
            }
          } else {
            setTimeout(() => {
              if (window.confirm(`Legacy Item ${parsedData.itemId} found. View details?`)) {
                navigateToItem(parsedData.itemId);
              }
            }, 800);
          }
        }
      } else {
        // Display appropriate error message for invalid QR formats
        setScanResult(`Unrecognized format: ${parsedData.raw.substring(0, 50)}${parsedData.raw.length > 50 ? '...' : ''}`);
        toast.warning(parsedData.error || 'QR code scanned, but not in expected format.');
      }
    } catch (err) {
      handleScanError(err);
    }
  }, [handleScanError, navigateToItem, fetchItemData, role, isInDashboard, canInspect]);

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
    
    // Add a runtime check to help with debugging
    console.info(`Starting QR scanner. Device: ${isMobile ? 'Mobile' : 'Desktop'}, Camera ready: ${cameraReady}`);
    
    // Explicitly initialize camera for both desktop and mobile
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Define constraints based on device type
      const constraints = {
        video: isMobile
          ? {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 15, max: 30 },
              aspectRatio: { ideal: 1.777 }
            }
          : {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 },
              facingMode: 'user'
            }
      };
      
      // For iOS devices especially, we need to handle them differently
      if (isMobile) {
        const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        
        if (isiOS) {
          console.info('iOS device detected, ensuring camera access is requested properly');
          
          // Use simpler constraints for iOS to avoid issues
          navigator.mediaDevices.getUserMedia({ 
            video: {
              facingMode: { exact: 'environment' } // Force back camera on iOS
            }
          })
          .then(stream => {
            setCameraReady(true);
            videoStreamRef.current = stream;
            
            // Manually attaching to video element as a fallback
            const videoElement = document.getElementById('qr-scanner-video');
            if (videoElement) {
              try {
                videoElement.srcObject = stream;
                videoElement.play().catch(err => console.error('Error playing video:', err));
              } catch (err) {
                console.error('Error manually setting up video stream:', err);
              }
            }
          })
          .catch(err => {
            console.error('iOS camera initialization error:', err);
            // For iOS, try again with simpler constraints
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                setCameraReady(true);
                videoStreamRef.current = stream;
              })
              .catch(() => {
                setError('Could not access camera. Please check permissions in your browser settings.');
                setScanning(false);
              });
          });
          return;
        }
      }
      
      // For non-iOS devices (including desktop)
      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          console.info('Camera initialized successfully');
          setCameraReady(true);
          videoStreamRef.current = stream;
        })
        .catch(err => {
          console.error('Camera initialization error:', err);
          if (err.name === 'NotAllowedError') {
            setError('Camera access denied. Please allow camera access in your browser settings.');
          } else if (err.name === 'NotFoundError') {
            setError('No camera detected. Please ensure your device has a working camera.');
          } else {
            setError(`Camera error: ${err.message || 'Unknown error accessing camera'}`);
          }
          setScanning(false);
        });
    } else {
      setError('Camera access is not supported in this browser.');
      setScanning(false);
    }
  }, [isMobile]);
  
  const handleBack = useCallback(() => {
    if (isInDashboard) {
      // Navigate back to the correct dashboard based on role
      if (role === 'admin') {
        navigate('/admin-dashboard', { replace: true });
      } else if (role === 'superadmin') {
        navigate('/superadmin-dashboard', { replace: true });
      } else {
        navigate('/user-dashboard', { replace: true }); // Default or user role
      }
    } else {
      navigate(-1);
    }
  }, [navigate, isInDashboard, role]);

  // Clean up camera resources when component unmounts or scanning stops
  useEffect(() => {
    return () => {
      if (videoStreamRef.current) {
        // Stop all tracks in the stream to properly release the camera
        videoStreamRef.current.getTracks().forEach(track => {
          if (track.readyState === 'live') {
            track.stop();
          }
        });
        videoStreamRef.current = null;
      }
      
      // Also attempt to clean up by ID as a fallback
      try {
        const videoElement = document.getElementById('qr-scanner-video');
        if (videoElement && videoElement.srcObject) {
          const tracks = videoElement.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          videoElement.srcObject = null;
        }
      } catch (err) {
        console.error('Error cleaning up video element:', err);
      }
    };
  }, []);
  
  // Update reference to active stream when scanning state changes
  useEffect(() => {
    if (!scanning) {
      // When scanning stops, clean up camera
      if (videoStreamRef.current) {
        videoStreamRef.current.getTracks().forEach(track => track.stop());
        videoStreamRef.current = null;
      }
    }
  }, [scanning]);
  
  // Make sure we have permissions
  if (!canScan && !error) { // Added !error to prevent overwriting existing errors
    setError('You do not have permission to scan QR codes. Please contact your administrator.');
  }

  if (loadingComponent) {
    return (
      <div className="flex items-center justify-center p-6">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  // Determine if this is an inspection view
  const isInspectionView = (role === 'admin' || role === 'superadmin') && isInDashboard;

  return (
    <div className={`flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-black'} ${isInDashboard ? 'h-full' : 'min-h-screen'}`}>
      {isInspectionView ? (
        <h1 className="text-2xl font-bold mb-6 text-center">Item Inspection Scanner</h1>
      ) : (
        <h1 className="text-2xl font-bold mb-6 text-center">QR Code Scanner</h1>
      )}

      {/* Back Button */}
      {!isInDashboard && (
        <Button
          onClick={handleBack}
          color="gray"
          className="hover:bg-gray-700 mb-4"
          aria-label="Go back"
        >
          Back
        </Button>
      )}

      {/* Error Display */}
      {error && (
        <div className="w-full max-w-md p-4 mb-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}

      {/* Scan Result Display */}
      {scanResult && !error && ( // Added !error to prevent showing result if there's an error
        <div className="w-full max-w-md p-4 mb-4 text-sm text-green-700 bg-green-100 rounded-lg" role="alert">
          <span className="font-medium">Scan Result:</span> {scanResult}
        </div>
      )}      {/* Scanner Component or Start Button */}
      {!scanning && !scanResult && ( // Show start button regardless of camera ready state
        <Button 
          onClick={startScanning} 
          disabled={!canScan} // Only disable if no permission
          className="mb-4"
        >
          {cameraReady ? 'Start Camera Scan' : 'Initialize Camera'}
        </Button>
      )}
      
      {/* Show loading indicator if camera is not yet ready and we intend to scan */}
      {!cameraReady && scanning && (
        <div className="flex flex-col items-center justify-center mb-4">
          <LoadingSpinner />
          <p className="mt-2">Preparing camera...</p>
        </div>
      )}

      {scanning && cameraReady && (
        <div className="w-full max-w-md mb-4 relative">
          <div 
            className="overflow-hidden rounded-lg shadow-lg" 
            style={{ 
              width: '100%', 
              paddingTop: '75%',
              position: 'relative',
              backgroundColor: '#000' // Added background for better contrast
            }}
          >
            <Scanner
              ref={scannerRef}
              onScan={handleScanResult}
              onError={handleScanError}
              constraints={{
                video: isMobile
                  ? { 
                      facingMode: { ideal: 'environment' },
                      width: { ideal: 1280 }, // Higher resolution for better scan
                      height: { ideal: 720 },
                      frameRate: { ideal: 15, max: 30 }, // Adjusted for mobile performance
                      aspectRatio: { ideal: 1.777 } // 16:9
                    } 
                  : { 
                      width: { min: 640, ideal: 1280, max: 1920 }, 
                      height: { min: 480, ideal: 720, max: 1080 },
                      facingMode: 'user' 
                    },
                audio: false,
              }}
              scanDelay={isMobile ? 500 : 300} // Slower scan delay for mobile
              styles={{ // Ensure video fills the container and is mirrored correctly
                container: { width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 },
                video: { 
                  transform: isMobile ? 'scaleX(-1)' : 'none', // Mirror for mobile front camera if used, adjust if back camera
                  objectFit: 'cover' 
                }
              }}
              videoId="qr-scanner-video" // Assign an ID for direct manipulation if needed
            />
          </div>
          <Button onClick={() => setScanning(false)} className="mt-4 w-full">
            Stop Scan
          </Button>
        </div>
      )}

      {/* File Upload Option */}
      {!scanning && (
        <div className="w-full max-w-md mb-4">
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
      )}

      {/* Inspection Form or Details for admin/superadmin in dashboard */}
      {isInspectionView && scanResult && (
        <div className="mt-6 p-4 border rounded-lg w-full max-w-md">
          <h2 className="text-xl font-semibold mb-3">Item Inspection</h2>
          
          {isLoadingItem ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner text="Loading item data..." />
            </div>
          ) : itemData ? (
            <div>
              <div className="mb-4">
                <h3 className="font-medium text-lg">{itemData.name}</h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <span className="font-semibold">ID:</span> {itemData.id}
                  </div>
                  <div>
                    <span className="font-semibold">Category:</span> {itemData.category || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Serial #:</span> {itemData.serialNumber || 'N/A'}
                  </div>
                  <div>
                    <span className="font-semibold">Unit #:</span> {itemData.unitNumber || 'N/A'}
                  </div>
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="font-medium mb-2">Perform Inspection</h3>
                <InspectionForm 
                  item={itemData} 
                  isDarkMode={isDarkMode}
                  onCancel={() => {
                    setItemData(null);
                    setScanResult(null);
                    setParsedResult(null);
                  }}
                />
              </div>
            </div>
          ) : (
            <div>
              <p>Ready to scan an item for inspection.</p>
              {parsedResult && (
                <div className="mt-2">
                  <Button 
                    onClick={() => fetchItemData(parsedResult.itemId)}
                    color="blue"
                  >
                    Load Item Data
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default QRScanner;
