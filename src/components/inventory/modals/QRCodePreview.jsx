// File: src/components/inventory/QRCodePreview.jsx

import { useState, useEffect } from 'react';
import { useTheme } from '../../../hooks/useTheme';
import QRCodeManager from '../../QRCodeManager';
import Button from '../../Button';
import PropTypes from 'prop-types';

function QRCodePreview({ 
  item, 
  qrData, 
  qrError, 
  isGenerating = false, 
  onClose = () => {} 
}) {
  const { isDarkMode } = useTheme();
  const [localQrData, setLocalQrData] = useState(qrData);
  
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

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        role="dialog"
        aria-labelledby="qr-preview-title"
        aria-describedby="qr-preview-description"
        className={`p-6 rounded-lg w-full max-w-md ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} max-h-[90vh] flex flex-col`}
      >
        <div className={`flex justify-between items-center mb-4 sticky top-0 bg-inherit z-10 pb-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <h3 id="qr-preview-title" className="text-xl font-semibold">
            QR Code Preview
          </h3>
          <Button
            onClick={onClose}
            color="gray"
            size="sm"
            className="hover:bg-gray-700 rounded-full p-1"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
          </Button>
        </div>

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
              <div id="qr-preview-description" className="mb-4">
                <p className="font-semibold">{item.name}</p>
                {item.serialNumber && (
                  <p className="text-sm opacity-75">
                    Serial: {item.serialNumber}
                  </p>
                )}
                {item.category && (
                  <p className="text-sm opacity-75">
                    Category: {item.category}
                  </p>
                )}
              </div>              {isGenerating ? (
                <div className="flex items-center justify-center p-4">
                  <div className="animate-pulse">Generating QR data...</div>
                </div>              ) : localQrData ? (
                <QRCodeManager
                  item={item}
                  qrData={localQrData}
                  showActions={true}
                />
              ): (
                <div className="flex flex-col items-center gap-4 p-4">
                  <div className="text-center">No QR code found for this item.</div>
                  <Button 
                    color="blue"
                    onClick={() => {
                      // Generate basic QR data
                      const newQrData = {
                        id: item.id,
                        name: item.name,
                        serialNumber: item.serialNumber || '',
                        category: item.category || '',
                        lab: item.lab || '',
                        itemCondition: item.itemCondition || '',
                        timestamp: new Date().toISOString(),
                      };
                      
                      // Set the local state directly since we're accessing the object reference
                      item.qrData = newQrData;
                      
                      // Force rerender with the new data
                      if (typeof window !== 'undefined')
                        window.dispatchEvent(new Event('qr-generated'));
                    }}
                  >
                    Generate QR Code
                  </Button>
                </div>
              )}
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
    serialNumber: PropTypes.string,
    category: PropTypes.string
  }),
  qrData: PropTypes.object,
  qrError: PropTypes.string,
  isGenerating: PropTypes.bool,
  onClose: PropTypes.func
};

export default QRCodePreview;