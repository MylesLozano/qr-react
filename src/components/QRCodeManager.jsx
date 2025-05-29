// File: src/components/QRCodeManager.jsx

/**
 * QR Code Manager Component
 *
 * This component handles the display, generation, and management of QR codes
 * for inventory items. It supports generating, downloading, and displaying
 * QR codes with item information.
 *
 * @module QRCodeManager
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQRCode } from '../hooks/useQRCode';
import { useAuth } from '../hooks/useAuth';
import { useErrorHandler } from '../hooks/useErrorHandler';
import Button from './Button';
import { toast } from 'react-toastify';
import ErrorBoundary from './ErrorBoundary';
import { useTheme } from '../hooks/useTheme';

// Constants
const MAX_QR_SIZE = 256;

/**
 * QR Code Manager component for displaying and managing QR codes
 *
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.item - The inventory item to generate a QR code for
 * @param {Object} props.qrData - Existing QR code data (if available)
 * @param {boolean} [props.showActions=true] - Whether to show action buttons
 * @param {number} [props.size=MAX_QR_SIZE] - Size of the QR code in pixels
 * @returns {JSX.Element} Rendered QR code with controls
 */
function QRCodeManager({ item, qrData, showActions = true, size = MAX_QR_SIZE }) {
  const [localQrData, setLocalQrData] = useState(qrData);
  const [isLocking, setIsLocking] = useState(false); // <-- Add this state
  const { user, role } = useAuth();
  const { handleQRCode, updateQRLock, checkExistingRequest } = useQRCode([], user);
  const handleError = useErrorHandler();
  const { isDarkMode } = useTheme();
  const qrCodeContainerRef = useRef(null);

  const validateQrData = useCallback(
    (qrObject) => {
      if (!qrObject || typeof qrObject !== 'object') {
        handleError(new Error('Invalid QR data format'));
        return false;
      }
      return true;
    },
    [handleError]
  );  const handleQrGeneration = useCallback(async () => {
    if (!item || !item.id) {
      toast.error('No valid item selected');
      return;
    }

    try {
      // First check if this item already has a QR code in Firestore
      let existingQrData = null;
      try {
        const existingQR = await checkExistingRequest?.(item.id);
        if (existingQR) {
          existingQrData = existingQR;
        }
      } catch (error) {
        console.warn('Error checking for existing QR code:', error);
      }
      
      // Use existing QR string in this priority:
      // 1. From Firestore if it exists
      // 2. From local state if it exists
      // 3. Generate new only if neither exists
      const qrString = 
        (existingQrData?.qrString) || 
        (localQrData?.qrString) || 
        `QCCITE-${item.id}-${Date.now()}`;
      
      // console.log('Using QR string:', { 
      //   qrString, 
      //   source: existingQrData?.qrString ? 'database' : (localQrData?.qrString ? 'local state' : 'newly generated')
      // });
      
      // Create or update the QR data
      const updatedQrData = {
        ...(localQrData || {}),
        qrString: qrString,
        itemId: item.id,
        itemName: item.name,
        lab: item.lab || '',
        timestamp: new Date().toISOString(),
        isLocked: existingQrData?.isLocked || localQrData?.isLocked || false,
      };
        // Save QR code generation with the qrString (null for qrDataUrl since we're just storing the string)
      const success = await handleQRCode(item.id, null, {
        qrData: JSON.stringify(updatedQrData),
        qrString: qrString,
        itemName: item.name,
        lab: item.lab || '',
        isLocked: !!updatedQrData.isLocked, // Ensure this is a boolean
      });

      if (success) {
        // Update the local state with the new QR data
        setLocalQrData(updatedQrData);
        toast.success('QR code generated and saved successfully');
      }
    } catch (err) {
      handleError(err);
      toast.error('Failed to generate QR code');
    }
  }, [handleQRCode, handleError, item, localQrData, checkExistingRequest]);
  useEffect(() => {
    // This effect synchronizes localQrData with the qrData prop.
    // It runs when the item being displayed changes (item.id)
    // or when the qrData prop itself changes (e.g., parent fetches new data).
    if (qrData) {
      validateQrData(qrData);
      
      // Smart merge of incoming qrData with local state to prevent losing local updates
      setLocalQrData(prevData => {
        // Complete replacement for item change or if no previous data exists
        if (!prevData || item?.id !== prevData?.itemId) {
          return qrData;
        }
        
        // If we're displaying the same item, and we had local updates to isLocked
        // (e.g., from an optimistic update), and the incoming qrData.isLocked is different,
        // assume our local state (prevData) is more current and should be preserved entirely.
        if (prevData.isLocked !== undefined && prevData.isLocked !== qrData.isLocked) {
          // console.log('Preserving entire local state due to differing lock status:', prevData);
          return prevData; // Return the entire previous (optimistically updated) state
        }
        
        // Otherwise use parent's data
        return qrData;
      });
    } else {
      // If no qrData prop is provided (e.g., item selected but no QR exists yet),
      // set localQrData to null.
      setLocalQrData(null);
    }
    // Dependencies:
    // - item?.id: Resync when the fundamental item being displayed changes.
    // - qrData: Resync if the data prop itself changes reference.
  }, [item?.id, qrData, validateQrData]);const handleDownload = async () => {
    if (!item || !item.id) {
      toast.error('No valid item selected');
      return;
    }

    try {
      // Get the SVG element from the container instead of direct ref
      if (!qrCodeContainerRef.current) {
        throw new Error('QR code container not available');
      }

      const svgElement = qrCodeContainerRef.current.querySelector('svg');
      if (!svgElement) {
        throw new Error('QR code SVG not found');
      }

      // Make sure we're using the existing QR string - don't generate a new one when downloading
      // This is crucial to prevent QR code duplication
      if (!localQrData?.qrString) {
        toast.error('Please generate a QR code first before downloading');
        return;
      }
      
      // Create or update the QR data with latest information
      const updatedQrData = {
        ...(localQrData || {}),
        qrString: localQrData.qrString, // Always use existing string, never generate new on download
        itemId: item.id,
        itemName: item.name,
        lab: item.lab || '',
        timestamp: new Date().toISOString(),
        isLocked: localQrData?.isLocked || false
      };

      // Import createQrCanvas from the utility functions
      const { createQrCanvas } = await import('../utils/qrUtils');      // Get metadata for the QR code image
      const metadata = {
        itemName: item.name,
        lab: item.lab || '',
        itemId: item.id,
        unit: item.unitNumber || '', // Include as unit for backward compatibility
        unitNumber: item.unitNumber || '', // Explicitly add unitNumber for display in downloaded QR
        category: item.category || ''
      };
      
      // Create enhanced canvas with item info
      const canvas = await createQrCanvas(svgElement, size, isDarkMode, metadata);
      
      // Convert canvas to downloadable image and save to Firebase
      canvas.toBlob(async (blob) => {
        try {
          // Create a descriptive file name
          const fileName = `QR_${item.name || 'item'}_${item.id}_${new Date().toISOString().split('T')[0]}.png`;

          // First save to Firebase with the dataUrl
          const dataUrl = canvas.toDataURL('image/png');            await handleQRCode(item.id, dataUrl, {
            qrData: JSON.stringify(updatedQrData), // Pass the full updatedQrData
            qrString: localQrData.qrString, // Use the existing QR string, never generate a new one
            itemName: item.name,
            lab: item.lab || '',
            fileName: fileName,
            isLocked: !!updatedQrData.isLocked, // Ensure this is a boolean
          });

          // Update local QR data state
          setLocalQrData(updatedQrData);

          // Then create download
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = fileName;
          link.click();
          URL.revokeObjectURL(link.href); // Clean up

          toast.success('QR code saved and downloaded successfully');
        } catch (error) {
          handleError(error);
          toast.error('Error saving QR code to database');
        }
      });
    } catch (err) {
      handleError(err);
      toast.error('Failed to download QR code');
    }
  };
  // Determine if user can lock/unlock
  const canLock = role === 'admin' || role === 'superadmin'; // Use the destructured 'role'  
    // Handler to toggle lock status
  const handleLockButtonClick = useCallback(async () => {
    if (!localQrData || !item?.id || isLocking) return;

    setIsLocking(true);
    const currentLockState = !!localQrData.isLocked;
    const newLockState = !currentLockState;
    
    // console.log(`Attempting to ${newLockState ? 'lock' : 'unlock'} QR code for item ${item.id}`);

    try {
      const success = await updateQRLock(item.id, newLockState);

      if (success) {
        // console.log(`QR lock status update successful. New lock state: ${newLockState}`);
        
        // Optimistically update local state with stable fields
        setLocalQrData(prevData => {
          const updatedData = {
            ...(prevData || {}),
            itemId: item.id,
            itemName: item.name,
            lab: item.lab || '',
            qrString: prevData?.qrString || localQrData?.qrString || `QCCITE-${item.id}-${Date.now()}`,
            isLocked: newLockState,
            timestamp: new Date().toISOString()
          };
          // console.log('Updated local QR data:', updatedData);
          return updatedData;
        });
        toast.success(`QR code ${newLockState ? 'locked' : 'unlocked'} successfully`);
      } else {
        console.warn('QR lock update returned false');
        toast.error('Failed to update lock status');
      }
    } catch (err) {
      console.error('Lock toggle error:', err);
      toast.error('Failed to update lock status');
    } finally {
      setIsLocking(false);
    }
  }, [item?.id, item?.name, item?.lab, localQrData, isLocking, updateQRLock]);

  return (
    <ErrorBoundary>
      <div
        className={`w-full max-w-sm mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}
      >
        <div className="p-4">
          {/* Display item information above QR code */}
          {item && (
            <div className="mb-3 text-center">
              <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</h3>
              {item.lab && (
                <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Lab: {item.lab}
                </span>
              )}
            </div>
          )}          <div className="flex flex-col items-center justify-center min-h-[220px]">            {localQrData ? (
              <div ref={qrCodeContainerRef} className="text-center">                <div className={`inline-block p-2 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} mb-2`}>
                  <QRCodeSVG
                    value={localQrData.qrString || JSON.stringify(localQrData)}
                    size={size}
                    bgColor={'#FFFFFF'} // Always white background for consistency
                    fgColor={'#000000'} // Always black for QR modules
                    level={'H'} // Use high error correction level for better scanability
                    marginSize={4}
                  />
                </div>
                <div className="mt-2 text-xs text-center break-all">
                  <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ID: {item?.id}
                  </span>                  {/* Lock status visual indicator */}
                  {localQrData && (
                    <div className="flex items-center justify-center mt-1 gap-1">
                      {localQrData.isLocked ? (
                        <span title="Locked" className="text-yellow-500">🔒 Locked</span>
                      ) : (
                        <span title="Unlocked" className="text-green-500">🔓 Unlocked</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {item?.id
                  ? 'No QR code generated or found. Click \'Generate QR\' to create one.'
                  : 'Select an item to manage its QR code.'}
              </div>
            )}
          </div>          {showActions && item?.id && (
            <div className="mt-4 flex justify-center gap-3">
              <Button 
                onClick={handleQrGeneration} 
                color="green" 
                size="sm" 
                disabled={localQrData?.isLocked || isLocking} // <-- Add isLocking to disable
              >
                {localQrData ? 'Update QR' : 'Generate QR'}
              </Button>
              {localQrData && (
                <>
                  <Button 
                    onClick={handleDownload} 
                    color="blue" 
                    size="sm" 
                    disabled={localQrData?.isLocked || isLocking} // <-- Add isLocking to disable
                  >
                    Download QR
                  </Button>
                  {canLock && (
                    <Button
                      onClick={handleLockButtonClick} // <-- Use the new handler
                      color={localQrData.isLocked ? 'yellow' : 'gray'}
                      size="sm"
                      disabled={isLocking} // <-- Disable button while locking
                    >
                      {isLocking ? (localQrData.isLocked ? 'Unlocking...' : 'Locking...') : (
                        localQrData.isLocked ? (
                          <>
                            <span className="mr-1">🔒</span> Unlock QR
                          </>
                        ) : (
                          <>
                            <span className="mr-1">🔓</span> Lock QR
                          </>
                        )
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default QRCodeManager;
