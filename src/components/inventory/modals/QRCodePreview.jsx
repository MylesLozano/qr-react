// File: src/components/inventory/QRCodePreview.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { canGenerateQR } from '../../../utils/roleUtils';
import { useQRCode } from '../../../hooks/useQRCode';
import QRCodeManager from '../../QRCodeManager';
import Button from '../../Button';
import PropTypes from 'prop-types';

function QRCodePreview({ item, qrData, qrError, isGenerating = false, onClose = () => {} }) {
  const { isDarkMode } = useTheme();
  const { role, user } = useAuth();
  const { handleQRCode } = useQRCode([], user);
  const [localQrData, setLocalQrData] = useState(qrData);
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
  const [qrLocked, setQrLocked] = useState(item?.qrLocked || false);
  
  // Only admin and superadmin can generate QR codes
  // This variable is used to conditionally show/hide the generate button
  const canGenerate = canGenerateQR(role);

  // Listen for QR code generation events
  useEffect(() => {
    const handleQrGenerated = () => {
      if (item && item.qrData) {
        setLocalQrData(item.qrData);
      }
    };

    window.addEventListener('qr-generated', handleQrGenerated);
    return () => {
      window.removeEventListener('qr-generated', handleQrGenerated);
    };
  }, [item]);

  // Update local state when props change
  useEffect(() => {
    setLocalQrData(qrData);
  }, [qrData]);

  // Handler to toggle lock state (replace with real backend logic as needed)
  const handleToggleLock = async () => {
    // Simulate async lock/unlock
    setQrLocked((prev) => !prev);
    // TODO: Add backend update logic here
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {' '}
      <div
        role="dialog"
        aria-labelledby="qr-preview-title"
        aria-describedby="qr-preview-description"
        className={`p-6 rounded-lg w-full max-w-3xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} max-h-[90vh] flex flex-col`}
      >
        <div
          className={`flex justify-between items-center mb-4 sticky top-0 bg-inherit z-10 pb-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
        >
          <h3 id="qr-preview-title" className="text-xl font-semibold">
            QR Code Preview
          </h3>
          <div className="flex gap-2 items-center">
            <Button
              onClick={onClose}
              color="gray"
              size="sm"
              className="hover:bg-gray-700 rounded-full p-1"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 18L18 6M6 6l12 12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                />
              </svg>
            </Button>
          </div>
        </div>{' '}
        <div className="flex-1 overflow-y-auto min-h-0">
          {qrError ? (
            <div
              role="alert"
              className={`p-4 mb-4 rounded-lg ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'}`}
            >
              {qrError}
            </div>
          ) : (
            <>
              {/* Layout with item details on the left and QR code on the right */}
              <div className="flex flex-col md:flex-row gap-6">
                {/* Item Details */}
                <div id="qr-preview-description" className="md:w-1/2">
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <h4 className="font-semibold text-lg mb-3">Item Details</h4>
                    <div className="space-y-2 text-sm">
                      <p className="flex justify-between">
                        <span className="font-medium">Name:</span>
                        <span>{item.name}</span>
                      </p>                      {item.unitNumber && (
                        <p className="flex justify-between">
                          <span className="font-medium">Unit Number:</span>
                          <span className="font-bold text-blue-500 dark:text-blue-400">{item.unitNumber}</span>
                        </p>
                      )}
                      {item.serialNumber && (
                        <p className="flex justify-between">
                          <span className="font-medium">Serial:</span>
                          <span>{item.serialNumber}</span>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span className="font-medium">Category:</span>
                        <span>{item.category}</span>
                      </p>
                      {item.lab && (
                        <p className="flex justify-between">
                          <span className="font-medium">Lab:</span>
                          <span>{item.lab}</span>
                        </p>
                      )}
                      {item.itemCondition && (
                        <p className="flex justify-between">
                          <span className="font-medium">Condition:</span>
                          <span>{item.itemCondition}</span>
                        </p>
                      )}
                      <p className="flex justify-between">
                        <span className="font-medium">Quantity:</span>
                        <span>{item.quantity}</span>
                      </p>
                      {item.remarks && (
                        <p>
                          <span className="font-medium">Remarks:</span>
                          <span className="block mt-1 italic">{item.remarks}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>                {/* QR Code */}
                <div className="md:w-1/2 flex items-center justify-center flex-col gap-4">
                  {isGenerating || isGeneratingLocal ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                      <div className="animate-pulse text-center space-y-2">
                        <div className="inline-block">
                          <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        </div>
                        <p className="font-medium">Generating QR Code...</p>
                        <p className="text-sm text-gray-500">Please wait while we create your QR code</p>
                      </div>
                    </div>
                  ) : localQrData ? (
                    <QRCodeManager item={item} qrData={localQrData} showActions={true} />
                  ) : (
                    <div className="flex flex-col items-center gap-4 p-4">
                      <div className="text-center">No QR code found for this item.</div>
                      {canGenerate && (
                        <Button
                          color="blue"
                          disabled={isGeneratingLocal || qrLocked}
                          onClick={async () => {
                            if (!item || !item.id) return;
                            setIsGeneratingLocal(true);
                            try {
                              // Generate basic QR data with a unique QR string
                              const qrString = `QCCITE-${item.id}-${new Date().getTime()}`;
                              
                              const newQrData = {
                                id: item.id,
                                name: item.name,
                                serialNumber: item.serialNumber || '',
                                category: item.category || '',
                                lab: item.lab || '',
                                itemCondition: item.itemCondition || '',
                                timestamp: new Date().toISOString(),
                                qrString: qrString
                              };

                              // Save to Firebase using the hook
                              const success = await handleQRCode(item.id, null, {
                                qrData: JSON.stringify(newQrData),
                                qrString: qrString,
                                itemName: item.name,
                                lab: item.lab || ''
                              });

                              if (success) {
                                // Update local state
                                setLocalQrData(newQrData);
                                
                                // Also update the item reference for consistency
                                item.qrData = newQrData;

                                // Force rerender with the new data
                                if (typeof window !== 'undefined')
                                  window.dispatchEvent(new Event('qr-generated'));
                              }
                            } catch (error) {
                              console.error('Error generating QR code:', error);
                            } finally {
                              setIsGeneratingLocal(false);
                            }
                          }}
                        >
                          {isGeneratingLocal ? 'Generating...' : 'Generate QR Code'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

QRCodePreview.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    unitNumber: PropTypes.string,
    serialNumber: PropTypes.string,
    category: PropTypes.string,
    lab: PropTypes.string,
    itemCondition: PropTypes.string,
    quantity: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    remarks: PropTypes.string,
  }),
  qrData: PropTypes.object,
  qrError: PropTypes.string,
  isGenerating: PropTypes.bool,
  onClose: PropTypes.func,
};

export default QRCodePreview;
