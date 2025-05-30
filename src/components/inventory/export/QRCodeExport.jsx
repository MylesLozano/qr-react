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

import { useState } from 'react'; // Removed useEffect
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
import QRCodeManager from '../../../components/QRCodeManager';
import QRCodeProgressIndicator from './QRCodeProgressIndicator';

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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewItems, setPreviewItems] = useState([]);
  const [qrDataMap, setQrDataMap] = useState(new Map());
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [preparationProgress, setPreparationProgress] = useState({ current: 0, total: 0 });
  
  // Temporary SVG reference commented out as not used
  // const tempSvgRef = React.useRef(null);

  // Function to prepare preview data
  const preparePreviewData = async () => {
    if (!canExport) {
      toast.error('You do not have permission to export QR codes');
      return;
    }
    
    if (!items || items.length === 0) {
      toast.error('No items available for QR code export');
      return;
    }

    setIsPreviewLoading(true);
    setPreparationProgress({ current: 0, total: items.length });
    
    let tempContainerForPreparation; // Temporary container for this function scope

    try {
      const itemsToProcess = [];
      const newQrDataMap = new Map();

      // Create a hidden container for temporary QR code SVGs if needed for regeneration
      tempContainerForPreparation = document.createElement('div');
      tempContainerForPreparation.style.position = 'absolute';
      tempContainerForPreparation.style.visibility = 'hidden';
      document.body.appendChild(tempContainerForPreparation);

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setPreparationProgress({ current: i + 1, total: items.length });
        
        const hasQR = await hasQRCode(item.id);
        
        if (hasQR) {
          let qrCodeDataFromDb = await getQRCodeFromFirestore(item.id);
          
          if (qrCodeDataFromDb && (!qrCodeDataFromDb.qrCode && qrCodeDataFromDb.qrString)) {
            // Data URL is missing, but qrString is present. Regenerate data URL.
            try {
              const tempSvgContainer = document.createElement('div');
              tempContainerForPreparation.appendChild(tempSvgContainer);
              tempSvgContainer.innerHTML = '<svg width="256" height="256" fill="white" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"></svg>';
              const svgContainer = tempSvgContainer.firstChild;

              const canvas = await createQrCanvas(
                svgContainer, 
                256, 
                isDarkMode,
                {
                  qrString: qrCodeDataFromDb.qrString,
                  itemName: item.name,
                  lab: item.lab,
                  category: item.category,
                  unit: item.unitNumber,
                  unitNumber: item.unitNumber,
                  itemId: item.id
                }
              );
              const dataUrl = canvas.toDataURL('image/png');
              qrCodeDataFromDb.qrCode = dataUrl; // Add the generated data URL
              // tempSvgContainer.remove(); // Clean up individual temp SVG
            } catch (regenError) {
              console.error(`Error regenerating QR data URL for item ${item.id} during preview preparation:`, regenError);
              // Potentially skip this item or mark it as problematic
              // For now, we'll proceed, and performExport might still try or fail
            }
          }

          if (qrCodeDataFromDb && qrCodeDataFromDb.qrCode) { // Ensure qrCode (dataURL) is now present
            itemsToProcess.push(item);
            newQrDataMap.set(item.id, qrCodeDataFromDb);
          }
        }
      }

      if (tempContainerForPreparation && document.body.contains(tempContainerForPreparation)) {
        document.body.removeChild(tempContainerForPreparation);
      }

      if (itemsToProcess.length === 0) {
        toast.info('No items with QR codes found for preview or export.');
        return;
      }

      setQrDataMap(newQrDataMap);
      setPreviewItems(itemsToProcess);
      setShowPreviewModal(true);

    } catch (error) {
      console.error('Error preparing preview:', error);
      toast.error('Failed to prepare QR code preview');
    } finally {
      setIsPreviewLoading(false);
      setPreparationProgress({ current: 0, total: 0 }); // Reset progress when done
      // Ensure cleanup of temp container if it was created and added
      if (tempContainerForPreparation && document.body.contains(tempContainerForPreparation)) {
        document.body.removeChild(tempContainerForPreparation);
      }
    }
  };

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
              qrString: qrString, // Pass the actual QR string
              itemName: item.name,
              lab: item.lab,
              category: item.category,
              unit: item.unitNumber, // Using unitNumber property
              unitNumber: item.unitNumber, // Explicitly including unitNumber for redundancy
              itemId: item.id, // Added itemId for display
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
    // Instead of immediately exporting, show the preview first
    await preparePreviewData();
  };

  // Function to actually perform the export after preview
  const performExport = async () => {
    if (previewItems.length === 0 || qrDataMap.size === 0) {
      toast.error('No items available for QR code export');
      return;
    }

    setIsExporting(true);
    setExportProgress({ current: 0, total: previewItems.length });
    onExporting(true);
    setShowPreviewModal(false); // Close the modal

    let tempContainer; 
    const failedItems = []; // Initialize array to track failed items

    try {
      const zip = new JSZip();
      const qrFolder = zip.folder('QR_Codes');
      
      tempContainer = document.createElement('div');
      tempContainer.style.position = 'absolute';
      tempContainer.style.visibility = 'hidden';
      document.body.appendChild(tempContainer);
      
      const BATCH_SIZE = 5;
      // setExportProgress({ current: 0, total: previewItems.length }); // Already set above
      
      for (let i = 0; i < previewItems.length; i += BATCH_SIZE) {
        const batch = previewItems.slice(i, i + BATCH_SIZE);
        
        const batchPromises = batch.map(async (item) => {
          try {
            const itemQrData = qrDataMap.get(item.id);
            if (!itemQrData) {
              failedItems.push({ name: item.name || `ID: ${item.id}`, error: 'QR data not found in map.' });
              return; // Skip if no data
            }
  
            const fileName = `QR_${item.id}_${item.name.replace(/[^a-z0-9]/gi, '_')}.png`;

            if (itemQrData.qrCode && itemQrData.qrCode.startsWith('data:image/png;base64,')) {
              const blob = await fetch(itemQrData.qrCode).then(r => r.blob());
              qrFolder.file(fileName, blob);
            } else if (itemQrData.qrString) {
              const tempSvgContainer = document.createElement('div');
              tempContainer.appendChild(tempSvgContainer);
              tempSvgContainer.innerHTML = '<svg width="256" height="256" fill="white" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg"></svg>';
              const svgContainer = tempSvgContainer.firstChild;

              const canvas = await createQrCanvas(
                svgContainer, 
                256, 
                isDarkMode,
                {
                  qrString: itemQrData.qrString,
                  itemName: item.name,
                  lab: item.lab,
                  category: item.category,
                  unit: item.unitNumber,
                  unitNumber: item.unitNumber
                }
              );
            
              const blob = await new Promise((resolve, reject) => {
                if (!canvas || typeof canvas.toBlob !== 'function') {
                  return reject(new Error(`createQrCanvas did not return a valid canvas for item ID ${item.id} ('${item.name}').`));
                }
                canvas.toBlob(blobResult => {
                  if (blobResult) {
                    resolve(blobResult);
                  } else {
                    reject(new Error(`canvas.toBlob returned null for item ID ${item.id} ('${item.name}'). Canvas dimensions: ${canvas.width}x${canvas.height}.`));
                  }
                }, 'image/png');
              });
              
              qrFolder.file(fileName, blob);
              // tempSvgContainer.remove(); // Optional: cleanup individual temp SVG container
            } else {
              failedItems.push({ name: item.name || `ID: ${item.id}`, error: 'No QR code data URL or QR string found.' });
              return; // Skip if no usable QR data
            }
            setExportProgress(prev => ({ ...prev, current: prev.current + 1 }));
          } catch (error) {
            console.error(`Error processing QR for item ${item.id} ('${item.name}'):`, error.message, error.stack);
            failedItems.push({ name: item.name || `ID: ${item.id}`, error: error.message });
            // Do not increment progress for failed items, or it will look like it succeeded.
          }
        }); 
        
        await Promise.all(batchPromises); 
      } 
      
      if (tempContainer && document.body.contains(tempContainer)) {
        document.body.removeChild(tempContainer);
      }
      
      if (failedItems.length > 0) {
        const errorSummary = failedItems.slice(0, 5).map(f => `${f.name}: ${f.error}`).join('\\n');
        const moreErrorsMessage = failedItems.length > 5 ? `\\n...and ${failedItems.length - 5} more errors.` : '';
        toast.error(`Failed to process ${failedItems.length} QR codes.\\n${errorSummary}${moreErrorsMessage}`, { autoClose: 15000 });
      }

      const successfulCount = previewItems.length - failedItems.length;
      if (successfulCount > 0) {
        const content = await zip.generateAsync({ type: 'blob' });
        saveAs(content, 'QCheckCITE_QR_Codes.zip');
        toast.success(`${successfulCount} QR codes exported successfully.`);
      } else if (failedItems.length === previewItems.length && previewItems.length > 0) {
        toast.error('All QR codes failed to export. Check console for details.');
      } else if (previewItems.length === 0) {
        // This case is handled at the start of the function
      }

    } catch (error) {
      console.error('Error exporting QR codes:', error);
      const errorMsg = getQrErrorMessage('export', error);
      toast.error(errorMsg);
      if (tempContainer && document.body.contains(tempContainer)) { 
        document.body.removeChild(tempContainer);
      }
    } finally {
      setIsExporting(false);
      onExporting(false);
      // Reset progress to 0 for next time, or to total if you want it to show full upon completion
      setExportProgress({ current: 0, total: 0 }); 
    }
  };

  // QR Code Preview Modal Component
  const QRCodePreviewModal = () => {
    if (!showPreviewModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div
          role="dialog"
          aria-labelledby="qr-preview-title"
          aria-describedby="qr-preview-description"
          className={`p-6 rounded-lg w-full max-w-5xl ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} max-h-[90vh] flex flex-col`}
        >
          <div className={`flex justify-between items-center mb-4 sticky top-0 bg-inherit z-10 pb-2 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <h3 id="qr-preview-title" className="text-xl font-semibold">
              QR Code Export Preview
            </h3>
            <Button
              onClick={() => setShowPreviewModal(false)}
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

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="mb-4">
              <p className="text-sm mb-2">
                Ready to export {previewItems.length} QR codes. Confirm to download as a ZIP file.
              </p>
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  onClick={() => setShowPreviewModal(false)}
                  color="gray"
                >
                  Cancel
                </Button>
                <Button
                  onClick={performExport}
                  color="blue"
                  disabled={isExporting}
                  icon={
                    isExporting ? (
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    )
                  }
                >
                  {isExporting ? 'Preparing Download...' : 'Download All QR Codes'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {previewItems.slice(0, 9).map(item => {
                const qrData = qrDataMap.get(item.id);
                if (!qrData) return null;
                
                // Parse the QR data if it's stored as JSON
                let parsedQrData;
                try {
                  parsedQrData = qrData.qrData ? JSON.parse(qrData.qrData) : { qrString: qrData.qrString };
                } catch { // Removed unused 'e'
                  parsedQrData = { qrString: qrData.qrString };
                }
                
                return (
                  <div key={item.id} className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex flex-col items-center">
                      <QRCodeManager 
                        item={item} 
                        qrData={parsedQrData} 
                        showActions={false} 
                        size={150} 
                      />
                      <div className="mt-2 text-center">
                        <p className={`font-medium truncate max-w-full ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>{item.name}</p>
                        <p className="text-xs text-gray-500 truncate">ID: {item.id}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {previewItems.length > 9 && (
                <div className={`p-4 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <div className="text-center">
                    <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                      +{previewItems.length - 9} more QR codes
                    </p>
                    <p className="text-xs text-gray-500">
                      All QR codes will be included in the ZIP file
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  // Conditional rendering for progress indicator
  if (isExporting || isGenerating || isPreviewLoading || (preparationProgress.total > 0 && preparationProgress.current < preparationProgress.total) ) {
    // Determine the operation type and progress data to pass to the indicator
    let currentOperationType = '';
    // Initialize with a default shape; actual values are assigned below based on state.
    let currentProgress = { current: 0, total: 0 }; 

    if (isExporting) {
      currentOperationType = 'exporting';
      currentProgress = exportProgress;
    } else if (isGenerating) {
      currentOperationType = 'generating';
      currentProgress = exportProgress; // Generation updates exportProgress state
    } else { 
      // This branch is taken if isExporting and isGenerating are false,
      // meaning isPreviewLoading or the preparationProgress condition is true.
      currentOperationType = 'preparing';
      currentProgress = preparationProgress;
    }

    return (
      <QRCodeProgressIndicator
        isDarkMode={isDarkMode} // Pass isDarkMode from useTheme hook
        operationType={currentOperationType} // Pass the determined operation type
        progress={currentProgress} // Pass the relevant progress object
      />
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
          disabled={isPreviewLoading}
        >
          {isPreviewLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {preparationProgress.total > 0 ? 
                `Preparing ${preparationProgress.current} of ${preparationProgress.total}...` : 
                'Preparing...'
              }
            </span>
          ) : (
            <span className="truncate">Download All QR Codes</span>
          )}
        </Button>
        <Button
          onClick={handleGenerateAndStoreQRCodes}
          color="green"
          className="flex-1 py-2.5"
          disabled={isGenerating}
          icon={
            isGenerating ? (
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            )
          }
        >
          {isGenerating ? (
            <span className="flex items-center">
              <span className="truncate">
                {exportProgress.total > 0 ? 
                  `Generating ${exportProgress.current} of ${exportProgress.total}...` : 
                  'Generating...'
                }
              </span>
            </span>
          ) : (
            <span className="truncate">Generate QR Codes</span>
          )}
        </Button>
      </div>
      
      {/* Preview Modal */}
      <QRCodePreviewModal />
    </div>
  );
}

QRCodeExport.propTypes = {
  items: PropTypes.array,
  onExporting: PropTypes.func,
};

export default QRCodeExport;
