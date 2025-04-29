import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../firebase';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '../context/ThemeContext';

// Constants
const RATE_LIMIT_MS = 5000; // 5 seconds
const MAX_QR_SIZE = 256;
const MIN_QR_SIZE = 128;
const MAX_NAME_LENGTH = 100;

function QRCodeManager({
    item,
    onGenerate,
    onPreview,
    isGenerating,
    showActions = true,
    size = MAX_QR_SIZE
}) {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const [qrData, setQrData] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [lastGenerationTime, setLastGenerationTime] = useState(null);
    const [qrElement, setQrElement] = useState(null);

    // Validate QR data
    const validateQRData = useCallback((data) => {
        if (!data) {
            throw new Error('No data provided for QR code');
        }
        if (!data.id || !data.name) {
            throw new Error('Item ID and name are required');
        }
        if (data.name.length > MAX_NAME_LENGTH) {
            throw new Error(`Name must be less than ${MAX_NAME_LENGTH} characters`);
        }
        return true;
    }, []);

    // Generate QR data with validation
    const generateQRData = useCallback(() => {
        if (!item) {
            throw new Error('No item selected');
        }

        const data = {
            id: item.id,
            name: item.name,
            unitNumber: item.unitNumber,
            lab: item.lab,
            condition: item.itemCondition,
            lastUpdated: new Date().toISOString()
        };

        validateQRData(data);
        return data;
    }, [item, validateQRData]);

    // Handle QR code generation with rate limiting and error handling
    const handleGenerate = async () => {
        try {
            if (lastGenerationTime && Date.now() - lastGenerationTime < RATE_LIMIT_MS) {
                const timeLeft = Math.ceil((RATE_LIMIT_MS - (Date.now() - lastGenerationTime)) / 1000);
                toast.warning(`Please wait ${timeLeft} seconds before generating another QR code`);
                return;
            }

            setError(null);
            if (onGenerate) {
                await onGenerate(item);
            }
            const data = generateQRData();
            setQrData(data);
            setLastGenerationTime(Date.now());

            // Log audit
            await logAudit(user.uid, 'generate_qr', {
                itemId: item.id,
                itemName: item.name,
                timestamp: new Date().toISOString()
            });

            toast.success('QR code generated successfully');
        } catch (error) {
            console.error('Error generating QR code:', error);
            setError(error.message);
            toast.error(`Failed to generate QR code: ${error.message}`);
        }
    };

    // Handle QR code preview with error handling
    const handlePreview = useCallback(() => {
        try {
            setError(null);
            if (onPreview) {
                onPreview(item);
            }
            const data = generateQRData();
            setQrData(data);
        } catch (error) {
            console.error('Error previewing QR code:', error);
            setError(error.message);
            toast.error(`Failed to preview QR code: ${error.message}`);
        }
    }, [item, onPreview, generateQRData]);

    // Handle QR code download with error handling and retry logic
    const handleDownload = async () => {
        if (!qrData) {
            toast.warning('Please generate a QR code first');
            return;
        }

        setIsDownloading(true);
        setError(null);
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            try {
                const qrElement = document.getElementById('qr-code');
                if (!qrElement) {
                    throw new Error('QR code element not found');
                }

                const canvas = await html2canvas(qrElement, {
                    scale: 2,
                    backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
                    logging: false,
                    useCORS: true
                });

                // Convert to blob and save
                canvas.toBlob((blob) => {
                    if (!blob) {
                        throw new Error('Failed to create image blob');
                    }
                    saveAs(blob, `qr-code-${item.unitNumber || item.id}.png`);

                    // Log audit
                    logAudit(user.uid, 'download_qr', {
                        itemId: item.id,
                        itemName: item.name,
                        timestamp: new Date().toISOString()
                    });

                    toast.success('QR code downloaded successfully');
                });
                break;
            } catch (error) {
                retryCount++;
                if (retryCount === maxRetries) {
                    console.error('Error downloading QR code:', error);
                    setError(error.message);
                    toast.error(`Failed to download QR code: ${error.message}`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        setIsDownloading(false);
    };

    // Get QR code size based on content with memoization
    const getQRSize = useMemo(() => {
        if (!qrData) return size;
        const dataLength = JSON.stringify(qrData).length;
        return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, dataLength * 2));
    }, [qrData, size]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            setQrData(null);
            setError(null);
        };
    }, []);

    return (
        <ErrorBoundary>
            <div
                className={`p-6 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
                role="region"
                aria-label="QR Code Manager"
            >
                <div className="flex flex-col items-center space-y-4">
                    {/* Error Display */}
                    {error && (
                        <div
                            className={`p-4 rounded mb-4 ${isDarkMode
                                ? 'bg-red-900 text-red-100 border-red-700'
                                : 'bg-red-100 text-red-700 border-red-400'
                                } border`}
                            role="alert"
                        >
                            {error}
                        </div>
                    )}

                    {/* QR Code Display */}
                    <div
                        id="qr-code"
                        className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}
                        aria-label="QR Code Display"
                        ref={setQrElement}
                    >
                        {qrData ? (
                            <QRCodeSVG
                                value={JSON.stringify(qrData)}
                                size={getQRSize}
                                level="H"
                                includeMargin={true}
                                aria-label={`QR Code for ${item?.name}`}
                                className="transition-opacity duration-300"
                            />
                        ) : (
                            <div className={`w-64 h-64 flex items-center justify-center rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
                                }`}>
                                <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                                    No QR code generated
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Item Information */}
                    <div className="text-center">
                        <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            {item?.name || 'No item selected'}
                        </h3>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {item?.unitNumber ? `Unit #${item.unitNumber}` : 'No unit number'}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {item?.lab ? `Lab: ${item.lab}` : 'No lab assigned'}
                        </p>
                        <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Condition: {item?.itemCondition || 'Unknown'}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    {showActions && (
                        <div className="flex space-x-4">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`px-4 py-2 rounded-md text-white transition-colors duration-200 ${isGenerating
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                                aria-label="Generate QR Code"
                            >
                                {isGenerating ? <LoadingSpinner size="small" /> : 'Generate QR'}
                            </button>
                            <button
                                onClick={handlePreview}
                                disabled={!qrData}
                                className={`px-4 py-2 rounded-md text-white transition-colors duration-200 ${!qrData
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                                aria-label="Preview QR Code"
                            >
                                Preview
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={!qrData || isDownloading}
                                className={`px-4 py-2 rounded-md text-white transition-colors duration-200 ${!qrData || isDownloading
                                    ? 'bg-gray-400 cursor-not-allowed'
                                    : 'bg-purple-600 hover:bg-purple-700'
                                    }`}
                                aria-label="Download QR Code"
                            >
                                {isDownloading ? <LoadingSpinner size="small" /> : 'Download'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default QRCodeManager; 