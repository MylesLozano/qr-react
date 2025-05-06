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
const MAX_QR_SIZE = 200;
const MIN_QR_SIZE = 120;

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

                    {/* QR Code Manager (Display only if qrData is available) */}
                    {qrData && item && ( // Pass item as context for download naming etc.
                        <div className="flex flex-col items-center justify-center w-full">
                            {/* Container to make QR code responsive */}
                            <div ref={qrElementRef} className="p-4 bg-white rounded-lg mb-4" style={{ maxWidth: MAX_QR_SIZE, width: '100%', height: 'auto' }}>
                                <QRCodeSVG
                                    value={JSON.stringify(localQrData)}
                                    size={getQRSize} // Use calculated size, but container limits max
                                    level="H"
                                    includeMargin={false}
                                />
                            </div>

                            {/* Action Buttons - Stack on small screens */}
                            {showActions && (
                                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                                    <Button
                                        onClick={handleDownload}
                                        disabled={isDownloading || !qrGenerated}
                                        color="blue"
                                        size="md"
                                        className="w-full sm:w-auto justify-center"
                                    >
                                        {isDownloading ? 'Downloading...' : 'Download QR'}
                                    </Button>
                                    {/* Add other actions here if needed */}
                                </div>
                            )}
                        </div>
                    )}

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
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default QRCodeManager;