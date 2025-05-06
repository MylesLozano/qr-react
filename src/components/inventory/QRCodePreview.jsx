// File: src/components/inventory/QRCodePreview.jsx

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import QRCodeManager from '../QRCodeManager'; // Import QRCodeManager
import Button from '../Button'; // Assuming you use a custom Button component
import LoadingSpinner from '../LoadingSpinner'; // Import LoadingSpinner

function QRCodePreview({ item, qrData, onClose, isGenerating = false, qrError = null }) {
  const { isDarkMode } = useTheme();

  if (!item || !qrData && !isGenerating) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`p-6 rounded-lg w-full max-w-md ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-900'} max-h-[90vh] flex flex-col`}>
        {/* Modal Header - Fixed at top */}
        <div className="flex justify-between items-center mb-4 sticky top-0 bg-inherit z-10 pb-2 border-b border-gray-700">
          <h3 className="text-xl font-semibold">QR Code Preview</h3>
          <Button onClick={onClose} color="gray" size="sm" className="hover:bg-gray-700 rounded-full p-1">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Loading or Error during data generation */}
          {isGenerating && !qrData && (
            <div className="flex flex-col items-center justify-center py-8">
              <LoadingSpinner size="md" />
              <p className="mt-2">Generating QR data...</p>
            </div>
          )}

          {qrError && !qrData && (
            <div className="text-red-500 text-center mb-4">
              {qrError}
            </div>
          )}

          {/* Item Information */}
          {item && (
            <div className="mb-4">
              <p className="font-semibold">{item.name}</p>
              {item.serialNumber && <p className="text-sm opacity-75">Serial: {item.serialNumber}</p>}
              {item.category && <p className="text-sm opacity-75">Category: {item.category}</p>}
            </div>
          )}

          {/* QR Code Display */}
          {qrData && item && (
            <QRCodeManager
              item={item}
              qrData={qrData}
              showActions={true}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default QRCodePreview;