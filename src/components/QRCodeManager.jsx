// File: src/components/QRCodeManager.jsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../firebase';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import { useTheme, getThemeClass } from '../context/ThemeContext';
import Button from './Button';
import { useErrorHandler } from '../hooks/useErrorHandler';

// Constants
const MAX_QR_SIZE = 256;
const MIN_QR_SIZE = 128;

function QRCodeManager({
    item, // Item details (for context, like filename for download)
    qrData, // The pre-generated QR data object
    isGenerating = false, // Loading state for generation (passed from hook, less critical here)
    showActions = true, // Whether to show action buttons (Download)
    size = MAX_QR_SIZE, // Default size, can be overridden by getQRSize
    onGenerateQR = null // Optional callback for QR generation
}) {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const { error, setError, handleError } = useErrorHandler();

    // Internal states
    const [isDownloading, setIsDownloading] = useState(false);
    const [localQrData, setLocalQrData] = useState(null);
    const [qrGenerated, setQrGenerated] = useState(false);
    const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);

    const qrElementRef = useRef(null);
    const retryTimeoutRef = useRef(null);

    // Use the provided qrData or generate our own item-specific QR data
    useEffect(() => {
        // If qrData is provided externally, use it
        if (qrData) {
            setLocalQrData(qrData);
            setQrGenerated(true);
            return;
        }

        // Otherwise, reset the state when item changes
        if (item) {
            setLocalQrData(null);
            setQrGenerated(false);
        }
    }, [qrData, item]);

    // Generate a unique QR code based on item properties
    const generateUniqueQRForItem = useCallback(async () => {
        if (!item || !item.id) {
            toast.error('Cannot generate QR: No valid item provided');
            return;
        }

        setIsGeneratingLocal(true);
        setError(null);

        try {
            // Create a unique QR data object for this specific item
            const uniqueQRData = {
                itemId: item.id,
                name: item.name || 'Unnamed Item',
                unitNumber: item.unitNumber || '',
                timestamp: new Date().toISOString(),
                // Add a unique identifier - could be a hash of item properties or a UUID
                uniqueId: `${item.id}-${Date.now()}`,
                // Add any other relevant item data for QR identification
                ...(item.category && { category: item.category }),
                ...(item.location && { location: item.location }),
                ...(item.status && { status: item.status })
            };

            // If external generation callback is provided, use it
            if (onGenerateQR && typeof onGenerateQR === 'function') {
                const result = await onGenerateQR(uniqueQRData);
                setLocalQrData(result || uniqueQRData);
            } else {
                // Otherwise use our local generation
                setLocalQrData(uniqueQRData);
            }

            setQrGenerated(true);
            toast.success('QR code generated successfully!');
            // Standardized audit log action and entity type
            logAudit('qr_code_generated', user.email, 'inventory', {
                itemName: item.name,
                itemId: item.id,
            });

        } catch (err) {
            handleError(err);
            setQrGenerated(false);
        } finally {
            setIsGeneratingLocal(false);
        }
    }, [item, user, onGenerateQR, handleError, setError]);

    // Handle QR code download with a simpler approach that avoids html2canvas
    const handleDownload = async () => {
        // Only attempt download if QR data is available and generated
        if (!localQrData || !qrGenerated) {
            toast.warning('Please generate a QR code first');
            return;
        }

        setIsDownloading(true);
        setError(null);

        try {
            // Get the SVG element
            const svgElement = qrElementRef.current?.querySelector('svg');
            if (!svgElement) {
                throw new Error('QR code SVG element not found.');
            }

            // Get SVG data
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

            // Create an image from the SVG
            const DOMURL = window.URL || window.webkitURL || window;
            const url = DOMURL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = () => {
                // Create canvas
                const canvas = document.createElement('canvas');
                canvas.width = getQRSize;
                canvas.height = getQRSize;

                // Draw background
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = isDarkMode ? '#1a1a1a' : '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw SVG
                ctx.drawImage(img, 0, 0);

                // Convert to blob and download
                canvas.toBlob((blob) => {
                    if (!blob) {
                        throw new Error('Failed to create image blob.');
                    }

                    const filename = `qr-code-${item?.unitNumber || item?.id || 'item'}.png`;
                    saveAs(blob, filename);

                    // Log audit
                    try {
                        if (user?.email && item?.id && item?.name) {
                            logAudit('Downloaded QR Code', user.email, 'inventory', {
                                itemId: item.id,
                                itemName: item.name || 'Unnamed Item',
                            });
                        }
                    } catch (auditError) {
                        console.error('Error logging audit:', auditError);
                    }

                    toast.success('QR code downloaded successfully');
                    setIsDownloading(false);
                    DOMURL.revokeObjectURL(url);
                }, 'image/png');
            };

            img.onerror = (error) => {
                DOMURL.revokeObjectURL(url);
                throw new Error('Failed to load SVG image: ' + error);
            };

            img.src = url;

        } catch (error) {
            handleError(error);
            setIsDownloading(false);
        }
    };

    // Get QR code size based on data length (memoized)
    const getQRSize = useMemo(() => {
        if (!localQrData) return MIN_QR_SIZE;

        const dataLength = JSON.stringify(localQrData).length;
        return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, dataLength * 3));
    }, [localQrData]);

    // Clean up on unmount
    useEffect(() => {
        return () => {
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, []);


    return (
        <ErrorBoundary>
            <div
                className={getThemeClass(isDarkMode, 'p-6 rounded-lg shadow', 'bg-gray-800', 'bg-white')}
                role="region"
                aria-label="QR Code Display and Download"
            >
                <div className="flex flex-col items-center space-y-4">
                    {/* Error Display */}
                    {error && (
                        <div
                            className={getThemeClass(isDarkMode, 'p-4 rounded mb-4', 'bg-red-900 text-red-100 border-red-700', 'bg-red-100 text-red-700 border-red-400 border')}
                            role="alert"
                            aria-live="assertive"
                        >
                            {error}
                        </div>
                    )}

                    {/* QR Code Display Area */}
                    <div
                        id="qr-code"
                        className={getThemeClass(isDarkMode, 'p-4 rounded-lg flex items-center justify-center', 'bg-gray-700', 'bg-white')}
                        aria-label="Generated QR Code"
                        ref={qrElementRef}
                        style={{ width: getQRSize, height: getQRSize }}
                    >
                        {localQrData && qrGenerated ? (
                            <QRCodeSVG
                                value={JSON.stringify(localQrData)}
                                size={getQRSize}
                                level="H"
                                marginSize={0}
                                aria-label={`QR Code for ${item?.name || 'item'}`}
                                className="transition-opacity duration-300"
                                // Set explicit foreground/background colors for better compatibility
                                bgColor={isDarkMode ? "#333333" : "#FFFFFF"}
                                fgColor={isDarkMode ? "#FFFFFF" : "#000000"}
                            />
                        ) : (
                            // Show placeholder if no QR data
                            <div className={getThemeClass('w-full h-full flex items-center justify-center rounded-lg', 'bg-gray-700', 'bg-gray-100')}>
                                {isGenerating || isGeneratingLocal ? (
                                    <LoadingSpinner size="md" />
                                ) : (
                                    <p className={getThemeClass('text-gray-400', 'text-gray-500')}>
                                        No QR code generated
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Item Information */}
                    {item && (
                        <div className="text-center">
                            <p className={getThemeClass('text-sm font-semibold', isDarkMode ? 'text-white' : 'text-gray-900')}>
                                {item.name || 'Item Details'}
                            </p>
                            {item.unitNumber && <p className={getThemeClass('text-xs', isDarkMode ? 'text-gray-500' : 'text-gray-600')}>Unit #{item.unitNumber}</p>}
                        </div>
                    )}

                    {/* Actions Area */}
                    {showActions && (
                        <div className="flex flex-col w-full space-y-3">
                            {/* Generate QR Button - Always show if we have an item */}
                            {item && item.id && (
                                <Button
                                    onClick={generateUniqueQRForItem}
                                    disabled={isGeneratingLocal || isGenerating}
                                    className={getThemeClass(
                                        'px-4 py-2 rounded-md text-white transition-colors duration-200 w-full',
                                        isGeneratingLocal || isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700',
                                        isGeneratingLocal || isGenerating ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                    )}
                                    aria-label="Generate Unique QR Code"
                                    aria-busy={isGeneratingLocal || isGenerating}
                                >
                                    {isGeneratingLocal || isGenerating ? (
                                        <LoadingSpinner size="small" />
                                    ) : qrGenerated ? 'Regenerate QR Code' : 'Generate QR Code'}
                                </Button>
                            )}

                            {/* Download Button - Only show if QR has been generated */}
                            {qrGenerated && localQrData && (
                                <Button
                                    onClick={handleDownload}
                                    disabled={!localQrData || !qrGenerated || isDownloading}
                                    className={getThemeClass(
                                        'px-4 py-2 rounded-md text-white transition-colors duration-200 w-full',
                                        !localQrData || !qrGenerated || isDownloading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700',
                                        !localQrData || !qrGenerated || isDownloading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
                                    )}
                                    aria-label="Download QR Code"
                                    aria-busy={isDownloading}
                                >
                                    {isDownloading ? <LoadingSpinner size="small" /> : 'Download QR Code'}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default QRCodeManager;