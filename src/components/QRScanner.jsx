import { useState, useCallback, useEffect, useRef } from 'react';
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
  const [cameraReady, setCameraReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const scannerRef = useRef(null);
  const videoStreamRef = useRef(null);
  const canScan = canScanQR(role);

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
                });
                if (mounted) {
                  setCameraReady(true);
                  videoStreamRef.current = simpleStream;
                } else {
                  simpleStream.getTracks().forEach(track => track.stop());
                }
              } catch (fallbackErr) {
                setError(`Camera error: Could not access any camera on this device.`);
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
    };
  }, [canScan, scanning, isMobile]);
  
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
  }, [navigateToItem]);  const startScanning = useCallback(() => {
    setScanning(true);
    setError(null);
    setScanResult(null);
    
    // Camera initialization is handled by the useEffect that watches scanning state
    // This ensures the camera is properly initialized when scanning starts
    
    // Add a runtime check to help with debugging
    console.info(`Starting QR scanner. Device: ${isMobile ? 'Mobile' : 'Desktop'}, Camera ready: ${cameraReady}`);
    
    // For iOS devices especially, we need to actively click to access camera
    if (isMobile) {
      const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isiOS) {
        // For iOS, we need a user interaction to properly trigger camera access
        console.info('iOS device detected, ensuring camera access is requested properly');
        
        // Wait a moment then initialize camera explicitly
        setTimeout(() => {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ 
              video: {
                facingMode: { exact: 'environment' } // Force back camera on iOS
              }
            })
            .then(stream => {
              setCameraReady(true);
              videoStreamRef.current = stream;
              
              // Manually attaching to video element as a fallback
              try {
                const videoElement = document.getElementById('qr-scanner-video');
                if (videoElement) {
                  videoElement.srcObject = stream;
                  videoElement.play().catch(err => console.error('Error playing video:', err));
                }
              } catch (err) {
                console.error('Error manually setting up video stream:', err);
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
                .catch(fallbackErr => {
                  setError('Could not access camera. Please check permissions in your browser settings.');
                  setScanning(false);
                });
            });
          }
        }, 300);
      }
    }
  }, [cameraReady, isMobile]);
  
  const handleBack = useCallback(() => {
    if (isInDashboard) {
      navigate('/user-dashboard', { replace: true });
    } else {
      navigate(-1);
    }
  }, [navigate, isInDashboard]);

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
  // ...existing code...

  // Special handling for mobile devices, especially iOS
  useEffect(() => {
    if (!isMobile || !scanning) return;
    
    // For iOS devices, we need some special handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    if (isIOS) {
      // iOS sometimes requires a bit more time to initialize camera properly
      const iOSTimer = setTimeout(() => {
        // Check if video element exists and is playing
        const videoEl = document.getElementById('qr-scanner-video');
        
        if (videoEl && (!videoEl.srcObject || videoEl.paused)) {
          console.info('iOS video not playing, attempting to reinitialize...');
          
          // Attempt to manually initialize the camera on iOS
          navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          })
          .then(stream => {
            videoStreamRef.current = stream;
            videoEl.srcObject = stream;
            videoEl.play()
              .then(() => console.info('iOS camera initialized successfully'))
              .catch(err => console.error('Failed to play iOS video:', err));
          })
          .catch(err => {
            console.error('iOS reinit error:', err);
            
            // Try one more time with basic constraints as last resort
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                videoStreamRef.current = stream;
                videoEl.srcObject = stream;
                videoEl.play().catch(e => console.error('Final play attempt failed:', e));
              })
              .catch(finalErr => {
                console.error('Final iOS camera init failed:', finalErr);
                setError('Could not initialize camera. Please check camera permissions in your device settings.');
                setScanning(false);
              });
          });
        }
      }, 1000); // Wait 1 second on iOS before checking
      
      return () => clearTimeout(iOSTimer);
    }
    
    // Android-specific optimizations
    const isAndroid = /android/i.test(navigator.userAgent);
    if (isAndroid && scanning) {
      // For Android, sometimes we need to ensure the camera has proper focus
      const androidTimer = setTimeout(() => {
        if (videoStreamRef.current) {
          const videoTrack = videoStreamRef.current.getVideoTracks()[0];
          if (videoTrack && videoTrack.getCapabilities && typeof videoTrack.applyConstraints === 'function') {
            const capabilities = videoTrack.getCapabilities();
            
            // Try to set focus mode for better scanning if supported
            if (capabilities && capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              videoTrack.applyConstraints({ 
                advanced: [{ focusMode: 'continuous' }] 
              }).catch(err => console.warn('Failed to set Android focus mode:', err));
            }
          }
        }
      }, 800);
      
      return () => clearTimeout(androidTimer);
    }
  }, [isMobile, scanning]);
  
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
            </>          ) : (
            <div className="relative" ref={scannerRef}>
              {scanning && !cameraReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-lg z-10">
                  <div className="text-center">
                    <LoadingSpinner size="large" />
                    <p className="text-white mt-2">Initializing camera...</p>
                  </div>
                </div>
              )}
                <Scanner
                onScan={handleScanResult}
                onError={handleScanError}
                scanDelay={isMobile ? 800 : 500} // Longer delay for mobile to reduce CPU usage
                constraints={{
                  facingMode: isMobile 
                    ? { exact: 'environment' } // Force back camera on mobile
                    : { ideal: 'environment' }, // Prefer back camera on desktop
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  aspectRatio: { ideal: 1.777 },
                  frameRate: isMobile ? { max: 20 } : { ideal: 25 } // Lower frameRate on mobile
                }}
                styles={{
                  container: { 
                    borderRadius: '0.5rem',
                    height: '300px',
                    maxHeight: '80vh',
                    overflow: 'hidden',
                    backgroundColor: '#000' // Black background helps with contrast
                  },
                  video: { 
                    borderRadius: '0.5rem',
                    height: '100%',
                    width: '100%',
                    objectFit: 'cover',
                    transform: isMobile ? 'scaleX(1)' : 'scaleX(-1)' // Fix mirroring on mobile
                  }
                }}
                containerStyle={{
                  paddingTop: 0,
                  height: '100%'
                }}
                videoId="qr-scanner-video"
                // Increase these settings for better mobile detection
                canvasStyles={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  zIndex: 1
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
