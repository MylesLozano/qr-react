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
  const { user } = useAuth();
  const { handleQRCode } = useQRCode(user);
  const handleError = useErrorHandler();
  const { isDarkMode } = useTheme();
  const qrCodeRef = useRef(null);

  const validateQrData = useCallback(
    (qrObject) => {
      if (!qrObject || typeof qrObject !== 'object') {
        handleError(new Error('Invalid QR data format'));
        return false;
      }
      return true;
    },
    [handleError]
  );

  const handleQrGeneration = useCallback(async () => {
    if (!validateQrData(localQrData)) return;

    try {
      // Save QR code generation
      const success = await handleQRCode(item.id, null, {
        qrData: JSON.stringify(localQrData),
        itemName: item.name,
      });

      if (success) {
        setLocalQrData(localQrData);
      }
    } catch (err) {
      handleError(err);
    }
  }, [handleQRCode, handleError, item.id, item.name, localQrData, validateQrData]);

  useEffect(() => {
    if (qrData) {
      validateQrData(qrData);
      setLocalQrData(qrData);
    }
  }, [qrData, validateQrData]);
  const handleDownload = async () => {
    if (!localQrData) {
      toast.error('No QR code data available to download');
      return;
    }

    try {
      // Get the SVG element directly from our ref
      if (!qrCodeRef.current) {
        throw new Error('QR code reference not available');
      }

      // Create a serialized SVG string from the QR code element
      const svgElement = qrCodeRef.current;
      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(svgElement);

      // Create canvas with padding
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const padding = 20;

      // Set canvas dimensions with padding
      canvas.width = size + padding * 2;
      canvas.height = size + padding * 2;

      // Fill background
      ctx.fillStyle = isDarkMode ? '#1F2937' : '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create a blob from the SVG string
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const svgUrl = URL.createObjectURL(svgBlob);

      // Load the SVG into an image
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = svgUrl;
      });

      // Draw the QR code with padding
      ctx.drawImage(img, padding, padding, size, size);
      URL.revokeObjectURL(svgUrl); // Convert canvas to downloadable image and save to Firebase
      canvas.toBlob(async (blob) => {
        try {
          const fileName = `QR_${item?.name || 'code'}_${new Date().toISOString().split('T')[0]}.png`;

          // First save to Firebase
          const dataUrl = canvas.toDataURL('image/png');
          await handleQRCode(item.id, dataUrl, {
            qrData: JSON.stringify(localQrData),
            itemName: item.name,
            fileName: fileName,
          });

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

  return (
    <ErrorBoundary>
      <div
        className={`w-full max-w-sm mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}
      >
        <div className="p-4">
          <div className="flex flex-col items-center justify-center min-h-[200px]">
            {' '}
            {localQrData ? (
              <QRCodeSVG
                ref={qrCodeRef}
                value={JSON.stringify(localQrData)}
                size={size}
                bgColor={isDarkMode ? '#1F2937' : '#FFFFFF'}
                fgColor={isDarkMode ? '#FFFFFF' : '#000000'}
                level={'L'}
                includeMargin={false}
              />
            ) : (
              <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {item?.id
                  ? 'No QR code generated or found.'
                  : 'Select an item to manage its QR code.'}
              </div>
            )}
          </div>

          {showActions && localQrData && (
            <div className="mt-4 flex justify-center gap-3">
              <Button onClick={handleQrGeneration} color="green" size="sm">
                Save QR
              </Button>
              <Button onClick={handleDownload} color="blue" size="sm">
                Download QR
              </Button>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default QRCodeManager;
