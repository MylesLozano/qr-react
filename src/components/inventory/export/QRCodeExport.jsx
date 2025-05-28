// File: src/components/inventory/export/QRCodeExport.jsx
/**
 * QR Code Export Component
 * 
 * This component provides functionality for:
 * 1. Downloading all generated QR codes as a ZIP file
 * 2. Generating new QR codes for items that don't have them yet
 * 
 * QR codes are stored in Firestore and can be exported as PNG files.
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { canGenerateQR } from '../../../utils/roleUtils';
import Button from '../../Button';
import { hasQRCode, getQRCodeFromFirestore, saveQRCodeToFirestore } from '../../../firebase';
import { createQrCanvas, getQrErrorMessage, generateQrString } from '../../../utils/qrUtils';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
// Import commented out as it's not being used
// import { QRCodeSVG } from 'qrcode.react';

/**
 * Component for exporting multiple QR codes at once
 */
function QRCodeExport({ items = [], onExporting = () => {} }) {
  const { isDarkMode } = useTheme();
  const { role, user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState({ current: 0, total: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const canExport = canGenerateQR(role);
  
  // Temporary SVG reference commented out as not used
  // const tempSvgRef = React.useRef(null);

  // Function to generate QR codes and store them in Firestore
  const handleGenerateAndStoreQRCodes = async () => {
    if (!canExport) {
      toast.error('You do not have permission to generate QR codes');
      return;
    }
    
    if (!items || items.length === 0) {
      toast.error('No items available for QR code generation');
      return;
    }

    // --- BEGIN PRE-CHECK ---
    let alreadyHaveQrCount = 0;
    for (const item of items) {
      if (await hasQRCode(item.id)) {
        alreadyHaveQrCount++;
      }
    }

    if (alreadyHaveQrCount === items.length) {
      toast.info(`${items.length} items already have QR codes. No new codes generated.`);
      return;
    }
    // --- END PRE-CHECK ---
    
    setIsGenerating(true);
    setExportProgress({ current: 0, total: items.length });
    onExporting(true);
    
    try {
      let generatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      // Create a hidden container for temporary QR code SVGs
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      document.body.appendChild(tempContainer);
      
      // Process each item 
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setExportProgress({ current: i + 1, total: items.length });
        
        try {
          // Check if the item already has a QR code
          const hasQR = await hasQRCode(item.id);
          
          if (hasQR) {
            // Skip items that already have QR codes
            skippedCount++;
            continue;
          }
          
          // Generate unique QR string for this item
          const qrString = generateQrString(item.id);
          
          // Create QR data
          const qrData = {
            id: item.id,
            name: item.name,
            serialNumber: item.serialNumber || '',
            category: item.category || '',
            lab: item.lab || '',
            itemCondition: item.itemCondition || '',
            timestamp: new Date().toISOString(),
            qrString: qrString
          };
          
          // Create temporary SVG container
          const tempSvgContainer = document.createElement('div');
          tempContainer.appendChild(tempSvgContainer);
          
          // Create SVG element
          tempSvgContainer.innerHTML = '<svg width="256" height="256" fill="white" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"></svg>';
          const svgContainer = tempSvgContainer.firstChild;
          
          // Create Canvas from the SVG
          const canvas = await createQrCanvas(
            svgContainer, 
            256, 
            isDarkMode,
            {
              itemName: item.name,
              lab: item.lab,
              itemId: item.id
            }
          );
          
          // Convert to data URL
          const dataUrl = canvas.toDataURL('image/png');
          
          // Save QR code to Firestore
          await saveQRCodeToFirestore(item.id, dataUrl, {
            qrData: JSON.stringify(qrData),
            qrString: qrString,
            generatedBy: user?.email,
            itemName: item.name,
            lab: item.lab || '',
            fileName: `QR_${item.id}_${item.name.replace(/[^a-z0-9]/gi, '_')}.png`
          });
          
          generatedCount++;
          
        } catch (error) {
          console.error(`Error generating QR for item ${item.id}:`, error);
          errorCount++;
        }
      }
      
      // Remove temporary container
      document.body.removeChild(tempContainer);
      
      // Show success message
      if (generatedCount > 0) {
        toast.success(`Generated ${generatedCount} QR codes successfully`);
        
        if (skippedCount > 0) {
          toast.info(`Skipped ${skippedCount} items that already had QR codes`);
        }
        
        if (errorCount > 0) {
          toast.warning(`Failed to generate ${errorCount} QR codes`);
        }
      } else if (skippedCount > 0 && errorCount === 0) {
        toast.info(`All ${skippedCount} items already have QR codes`);
      } else {
        toast.error('Failed to generate any QR codes');
      }
      
    } catch (error) {
      console.error('Error generating QR codes:', error);
      const errorMsg = getQrErrorMessage('generate', error);
      toast.error(errorMsg);
    } finally {
      setIsGenerating(false);
      onExporting(false);
    }
  };

  // Function to generate a downloadable QR code zip file
  const handleExportQRCodes = async () => {
    if (!canExport) {
      toast.error('You do not have permission to export QR codes');
      return;
    }
    
    if (!items || items.length === 0) {
      toast.error('No items available for QR code export');
      return;
    }

    const itemsWithQR = [];
    const qrData = {};

    // First check which items have QR codes
    setIsExporting(true);
    setExportProgress({ current: 0, total: items.length });
    onExporting(true);

    try {
      // Check which items have QR codes and retrieve QR data
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setExportProgress({ current: i + 1, total: items.length });
        
        // Check if the item has a QR code
        const hasQR = await hasQRCode(item.id);
        if (hasQR) {
          // Get the actual QR code data from Firestore
          const qrCodeData = await getQRCodeFromFirestore(item.id);
          if (qrCodeData && (qrCodeData.qrString || qrCodeData.qrCode)) {
            itemsWithQR.push(item);
            qrData[item.id] = qrCodeData;
          }
        }
      }

      if (itemsWithQR.length === 0) {
        toast.info('No items with QR codes found');
        setIsExporting(false);
        onExporting(false);
        return;
      }

      // Prepare zip file
      const zip = new JSZip();
      const qrFolder = zip.folder('QR_Codes');
      
      // Create a hidden container for temporary QR code SVGs
      const tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      document.body.appendChild(tempContainer);
      
      let processedCount = 0;
      const totalItems = itemsWithQR.length;
      
      // Process each item with a QR code
      for (const item of itemsWithQR) {
        try {
          const itemQrData = qrData[item.id];
          
          // If we have the stored PNG data URL, use it directly
          if (itemQrData.qrCode && itemQrData.qrCode.startsWith('data:image/png;base64,')) {
            // Extract base64 data from data URL - not directly used but needed for processing
            const blob = await fetch(itemQrData.qrCode).then(r => r.blob());
            
            // Add to zip
            const fileName = `QR_${item.id}_${item.name.replace(/[^a-z0-9]/gi, '_')}.png`;
            qrFolder.file(fileName, blob);
            
            processedCount++;
            setExportProgress({ current: Math.min(items.length, processedCount), total: items.length });
            continue;
          }
          
          // Otherwise, create QR code from the qrString
          // QR value kept for documentation purposes but implementation uses svgContainer directly
          // const qrValue = itemQrData.qrString || JSON.stringify({
          //   id: item.id,
          //   name: item.name
          // });
          
          // Create a temporary React component for the QR code
          const tempSvgContainer = document.createElement('div');
          tempContainer.appendChild(tempSvgContainer);
          
          // Render the QR SVG
          const svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          svgElement.setAttribute('width', '256');
          svgElement.setAttribute('height', '256');
          
          // Create QR code using QRCodeSVG
          tempSvgContainer.innerHTML = '<svg width="256" height="256" fill="white" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"></svg>';
          const svgContainer = tempSvgContainer.firstChild;
          
          // Create Canvas from the SVG
          const canvas = await createQrCanvas(
            svgContainer, 
            256, 
            isDarkMode,
            {
              itemName: item.name,
              lab: item.lab
            }
          );
          
          // Convert canvas to blob and add to zip
          canvas.toBlob((blob) => {
            if (blob) {
              const fileName = `QR_${item.id}_${item.name.replace(/[^a-z0-9]/gi, '_')}.png`;
              qrFolder.file(fileName, blob);
              
              processedCount++;
              setExportProgress({ current: Math.min(items.length, processedCount), total: items.length });
              
              // If all files have been processed, generate and download the zip
              if (processedCount === totalItems) {
                finalizeZipDownload();
              }
            }
          });
        } catch (error) {
          console.error(`Error processing QR for item ${item.id}:`, error);
          processedCount++;
          
          // If all files have been processed, generate and download the zip
          if (processedCount === totalItems) {
            finalizeZipDownload();
          }
        }
      }
      
      // Helper function to finalize and download the zip
      async function finalizeZipDownload() {
        try {
          // Remove the temporary container
          document.body.removeChild(tempContainer);
          
          // Generate and download the zip file
          const content = await zip.generateAsync({ type: 'blob' });
          saveAs(content, 'QCheckCITE_QR_Codes.zip');
          
          toast.success(`${itemsWithQR.length} QR codes exported successfully`);
        } catch (error) {
          console.error('Error finalizing zip download:', error);
          toast.error('Error creating ZIP file for download');
        } finally {
          setIsExporting(false);
          onExporting(false);
        }
      }
    } catch (error) {
      console.error('Error exporting QR codes:', error);
      const errorMsg = getQrErrorMessage('export', error);
      toast.error(errorMsg);
      setIsExporting(false);
      onExporting(false);
    }
  };

  if (isExporting || isGenerating) {
    return (
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md relative z-10`}>
        <h2 className="text-lg font-semibold mb-2">
          {isExporting ? 'Exporting QR Codes' : 'Generating QR Codes'}
        </h2>
        <div className="mb-2">
          <p>Processing {exportProgress.current} of {exportProgress.total} items...</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div 
            className={`${isExporting ? 'bg-blue-600' : 'bg-green-600'} h-2.5 rounded-full`}
            style={{width: `${(exportProgress.current / exportProgress.total) * 100}%`}}
          ></div>
        </div>
      </div>
    );
  }

  // If user doesn't have permission, show a message
  if (!canExport) {
    return (
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md relative z-10`}>
        <h2 className="text-lg font-semibold mb-2">Export QR Codes</h2>
        <p className="text-sm mb-4 text-yellow-500">
          You do not have permission to export QR codes. Please contact your administrator.
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md relative z-10`}>
      <h2 className="text-lg font-semibold mb-2">Export QR Codes</h2>
      <p className="text-sm mb-4">
        Export QR codes for all items with generated QR codes.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleExportQRCodes}
          color="blue"
          className="flex-1 py-2.5"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        >
          <span className="truncate">Download All QR Codes</span>
        </Button>
        <Button
          onClick={handleGenerateAndStoreQRCodes}
          color="green"
          className="flex-1 py-2.5"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          }
        >
          <span className="truncate">Generate QR Codes</span>
        </Button>
      </div>
    </div>
  );
}

QRCodeExport.propTypes = {
  items: PropTypes.array,
  onExporting: PropTypes.func,
};

export default QRCodeExport;
