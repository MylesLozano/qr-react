// File: src/components/inventory/QRCodePreview.jsx

import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import QRCodeManager from '../QRCodeManager'; // Import QRCodeManager
import Button from '../Button'; // Assuming you use a custom Button component
import LoadingSpinner from '../LoadingSpinner'; // Import LoadingSpinner

function QRCodePreview({
  item, // The item data for context
  qrData, // The already generated QR data to display
  onClose, // Handler to close the modal
  isGenerating = false, // Loading state from the hook (optional, can show spinner here)
  qrError = null // Error state from the hook (optional, can display error here)
}) {
  const { isDarkMode } = useTheme(); // Access theme context

  // If item or qrData is missing and not loading/generating, return null
  if (!item || !qrData && !isGenerating) return null;


  return (
    // Fixed modal overlay classes
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Modal content container */}
      <div className={`p-6 rounded-lg max-w-md w-full ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-900'}`}>
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">QR Code Preview</h3>
          {/* Close Button (using a regular button for consistency with design) */}
           <Button onClick={onClose} color="gray" size="sm">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               </svg>
           </Button>
        </div>

        {/* Loading or Error during data generation */}
        {isGenerating && !qrData && (
            <div className="flex flex-col items-center justify-center h-40"> {/* Adjust height as needed */}
                <LoadingSpinner size="md" />
                <p className="mt-2">Generating QR data...</p>
            </div>
        )}

        {qrError && !qrData && (
             <div className="text-red-500 text-center mb-4">
                {qrError}
            </div>
        )}


        {/* Item Information (Display if item data is available) */}
        {item && (
             <div className="mb-4">
               <p className="font-semibold">{item.name}</p>
               {item.serialNumber && <p className="text-sm">Serial: {item.serialNumber}</p>}
               {item.category && <p className="text-sm">Category: {item.category}</p>}
             </div>
        )}


        {/* QR Code Manager (Display only if qrData is available) */}
        {qrData && item && ( // Pass item as context for download naming etc.
             <QRCodeManager
               item={item} // Pass the item data
               qrData={qrData} // Pass the generated QR data
               // Pass download related props/handlers if you move download logic here
               // isDownloading={isDownloading} // State from QRCodeManager if download is internal
               // onDownload={handleDownload} // Handler from parent/hook if download is external
             />
        )}


        {/* Action Buttons */}
        {/* Generate button is removed from Preview, handled before modal opens */}
        {/* Download button will be inside QRCodeManager */}

        {/* Close Button (moved to header for better placement in modals) */}
        {/*
        <div className="flex justify-end mt-4">
             <Button
               onClick={onClose}
               color="gray"
               size="md"
             >
               Close
             </Button>
        </div>
         */}
      </div>
    </div>
  );
}

export default QRCodePreview;