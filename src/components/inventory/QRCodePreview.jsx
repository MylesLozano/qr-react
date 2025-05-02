import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import QRCodeManager from '../QRCodeManager';
import Button from '../Button';

function QRCodePreview({ 
  item, 
  onClose, 
  onGenerate, 
  isGenerating = false 
}) {
  const { isDarkMode } = useTheme();

  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg max-w-md w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold">QR Code Preview</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="mb-4">
          <p className="font-semibold">{item.name}</p>
          {item.serialNumber && <p className="text-sm">Serial: {item.serialNumber}</p>}
          {item.category && <p className="text-sm">Category: {item.category}</p>}
        </div>
        
        <div className="flex justify-center mb-6">
          <QRCodeManager
            item={item}
            onGenerate={onGenerate}
            isLoading={isGenerating}
          />
        </div>
        
        <div className="flex space-x-4 mt-4">
          <Button
            onClick={onGenerate}
            color="green"
            size="md"
            loading={isGenerating}
            disabled={isGenerating}
            className="flex-1"
          >
            {isGenerating ? 'Generating...' : 'Generate QR Code'}
          </Button>
          
          <Button
            onClick={onClose}
            color="gray"
            size="md"
            className="flex-1"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QRCodePreview;