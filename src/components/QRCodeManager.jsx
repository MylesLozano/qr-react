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
  const { user, role } = useAuth(); // Destructure both user and role
  const { handleQRCode } = useQRCode([], user); // user here is still the Firebase user
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
      // Generate a unique QR string for this item if it doesn't exist
      const qrString = localQrData?.qrString || `QCCITE-${item.id}-${new Date().getTime()}`;
      
      // Create or update the QR data
      const updatedQrData = {
        ...(localQrData || {}),
        qrString: qrString,
        itemId: item.id,
        itemName: item.name,
        lab: item.lab || '',
        timestamp: new Date().toISOString(),
        isLocked: localQrData?.isLocked || false, // Add this line
      };
      
      // Save QR code generation with the qrString (null for qrDataUrl since we're just storing the string)
      const success = await handleQRCode(item.id, null, {
        qrData: JSON.stringify(updatedQrData), // Pass the full updatedQrData
        qrString: qrString,
        itemName: item.name,
        lab: item.lab || '',
        isLocked: updatedQrData.isLocked, // Pass isLocked explicitly
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
  }, [handleQRCode, handleError, item, localQrData]);

  useEffect(() => {
    if (qrData) {
      validateQrData(qrData);
      setLocalQrData(qrData);
    }
  }, [qrData, validateQrData]);  const handleDownload = async () => {
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

      // First ensure we have a valid QR string
      const qrString = localQrData?.qrString || `QCCITE-${item.id}-${Date.now()}`;
      
      // Create or update the QR data with latest information
      const updatedQrData = {
        ...(localQrData || {}),
        qrString: qrString,
        itemId: item.id,
        itemName: item.name,
        lab: item.lab || '',
        timestamp: new Date().toISOString(),
        isLocked: localQrData?.isLocked || false, // Add this line
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
          const dataUrl = canvas.toDataURL('image/png');
          
          await handleQRCode(item.id, dataUrl, {
            qrData: JSON.stringify(updatedQrData), // Pass the full updatedQrData
            qrString: qrString,
            itemName: item.name,
            lab: item.lab || '',
            fileName: fileName,
            isLocked: updatedQrData.isLocked, // Pass isLocked explicitly
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
  const handleLockToggle = async () => {
    if (!localQrData) return;
    try {
      // You need to implement updateQRLock in your useQRCode or Firebase utils
      await handleQRCode(item.id, null, {
        ...localQrData,
        isLocked: !localQrData.isLocked,
        lockAction: true, // Optional: to distinguish lock action
      });
      setLocalQrData({ ...localQrData, isLocked: !localQrData.isLocked });
      toast.success(`QR code ${localQrData.isLocked ? 'unlocked' : 'locked'} successfully`);
    } catch (err) {
      handleError(err);
      toast.error('Failed to update lock status');
    }
  };

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
                    includeMargin={true}
                  />
                </div>
                <div className="mt-2 text-xs text-center break-all">
                  <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ID: {item?.id}
                  </span>
                </div>
              </div>
            ) : (
              <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {item?.id
                  ? 'No QR code generated or found. Click "Generate QR" to create one.'
                  : 'Select an item to manage its QR code.'}
              </div>
            )}
          </div>

          {showActions && item?.id && (
            <div className="mt-4 flex justify-center gap-3">
              <Button onClick={handleQrGeneration} color="green" size="sm" disabled={localQrData?.isLocked}>
                {localQrData ? 'Update QR' : 'Generate QR'}
              </Button>
              {localQrData && (
                <>
                  <Button onClick={handleDownload} color="blue" size="sm">
                    Download QR
                  </Button>
                  {canLock && (
                    <Button
                      onClick={handleLockToggle}
                      color={localQrData.isLocked ? 'yellow' : 'gray'}
                      size="sm"
                    >
                      {localQrData.isLocked ? 'Unlock QR' : 'Lock QR'}
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
