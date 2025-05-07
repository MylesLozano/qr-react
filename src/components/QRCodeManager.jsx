// File: src/components/QRCodeManager.jsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { logAudit, saveQRCodeToFirestore, getQRCodeFromFirestore } from '../firebase';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';
import { useTheme } from '../context/ThemeContext';
import Button from './Button';
import { useErrorHandler } from '../hooks/useErrorHandler';

// Constants
const MAX_QR_SIZE = 200;
const MIN_QR_SIZE = 120;

function QRCodeManager({
    item,
    qrData,
    isGenerating = false,
    showActions = true,
    size = MAX_QR_SIZE,
    onGenerateQR = null
}) {
    const { isDarkMode } = useTheme();
    const { user } = useAuth();
    const handleError = useErrorHandler();
    const qrElementRef = useRef(null);
    const [localQrData, setLocalQrData] = useState(qrData);
    const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [qrGenerated, setQrGenerated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Add input validation for item prop
    const validateItem = useCallback((item) => {
        if (!item) throw new Error("No item provided");
        if (!item.id) throw new Error("Item missing ID");
        if (!item.name) throw new Error("Item missing name");
        return true;
    }, []);

    // Add QR data validation
    const validateQrData = useCallback((data) => {
        if (!data) throw new Error("No QR data provided");
        if (typeof data !== 'object') throw new Error("Invalid QR data format");
        if (JSON.stringify(data).length > 1000) throw new Error("QR data exceeds size limit");
        return true;
    }, []);

    // Effect to check for existing QR code
    useEffect(() => {
        if (item?.id) {
            checkExistingQR();
        }
    }, [item]);

    // Get QR code size based on data length (memoized)
    const getQRSize = useMemo(() => {
        if (!localQrData) return MIN_QR_SIZE;
        const dataLength = JSON.stringify(localQrData).length;
        return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, Math.round(dataLength * 2.5)));
    }, [localQrData]);

    const checkExistingQR = async () => {
        if (!item?.id) {
            setError("Cannot check QR code: Invalid item");
            return;
        }

        try {
            const existingQR = await getQRCodeFromFirestore(item.id);
            if (existingQR) {
                const parsedData = JSON.parse(existingQR.qrData);
                validateQrData(parsedData);
                setLocalQrData(parsedData);
                setQrGenerated(true);
            }
        } catch (err) {
            const message = err.message || 'Error checking existing QR code';
            console.error('Error checking existing QR:', err);
            setError(message);
            setQrGenerated(false);
        }
    };

    useEffect(() => {
        if (qrData && !qrGenerated) {
            saveQRToFirestore();
        }
    }, [qrData, qrGenerated]);

    const saveQRToFirestore = async () => {
        if (!item?.id || !qrElementRef.current || isSaving) return;
        
        setIsSaving(true);
        setError(null);

        try {
            // Validate inputs
            validateItem(item);
            if (qrData) validateQrData(qrData);

            // Convert SVG to canvas, then to PNG data URL
            const svgElement = qrElementRef.current.querySelector('svg');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20;
            
            canvas.width = getQRSize + (padding * 2);
            canvas.height = getQRSize + (padding * 2);
            
            // Fill white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Convert SVG to image
            const img = new Image();
            const svgBlob = new Blob([svgElement.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
            const URL = window.URL || window.webkitURL || window;
            const svgUrl = URL.createObjectURL(svgBlob);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = svgUrl;
            });

            // Draw image with padding
            ctx.drawImage(img, padding, padding, getQRSize, getQRSize);
            URL.revokeObjectURL(svgUrl);

            // Save to Firestore
            const dataUrl = canvas.toDataURL('image/png');
            await saveQRCodeToFirestore(item.id, dataUrl, {
                qrData: JSON.stringify(qrData),
                itemName: item.name,
                generatedBy: user.email,
                timestamp: new Date().toISOString()
            });

            await logAudit('qr_code_saved', user.email, 'inventory', {
                itemId: item.id,
                itemName: item.name
            });

            setQrGenerated(true);
            toast.success('QR code saved successfully');
        } catch (err) {
            const message = err.message || 'Failed to save QR code';
            handleError(err, message);
            setError(message);
            setQrGenerated(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDownload = async () => {
        if (!localQrData || !qrElementRef.current) {
            setError("No QR code data available to download");
            return;
        }

        setIsDownloading(true);
        setError(null);

        try {
            // Validate QR data before download
            validateQrData(localQrData);

            // Create SVG data URL
            const svgElement = qrElementRef.current.querySelector('svg');
            if (!svgElement) throw new Error('QR code element not found');

            // Create canvas with white background
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20;
            
            canvas.width = getQRSize + (padding * 2);
            canvas.height = getQRSize + (padding * 2);
            
            // Fill white background
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Convert SVG to image
            const img = new Image();
            const svgBlob = new Blob([svgElement.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
            const URL = window.URL || window.webkitURL || window;
            const svgUrl = URL.createObjectURL(svgBlob);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = svgUrl;
            });

            // Draw image with padding
            ctx.drawImage(img, padding, padding, getQRSize, getQRSize);
            URL.revokeObjectURL(svgUrl);

            // Convert to PNG and download
            canvas.toBlob((blob) => {
                saveAs(blob, `QR_${item?.name || 'code'}_${new Date().toISOString().split('T')[0]}.png`);
            });

            // Log the download
            if (user) {
                await logAudit('qr_code_downloaded', user.email, 'qr_code', {
                    itemId: item?.id,
                    itemName: item?.name
                });
            }

            toast.success('QR code downloaded successfully');
        } catch (err) {
            const message = err.message || 'Failed to download QR code';
            handleError(err, message);
            setError(message);
        } finally {
            setIsDownloading(false);
        }
    };

    // Add cleanup effect
    useEffect(() => {
        return () => {
            setError(null);
            setQrGenerated(false);
            setLocalQrData(null);
        };
    }, []);

    return (
        <ErrorBoundary>
            <div className={`w-full max-w-sm mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
                <div className="p-4">
                    {error && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
                            {error}
                        </div>
                    )}

                    {/* QR Code Display */}
                    <div className="flex flex-col items-center justify-center">
                        {localQrData && (
                            <div ref={qrElementRef} className="p-4 bg-white rounded-lg shadow-inner mb-4 transition-transform hover:scale-105">
                                <QRCodeSVG
                                    value={JSON.stringify(localQrData)}
                                    size={getQRSize}
                                    level="H"
                                    includeMargin={true}
                                    className="max-w-full h-auto"
                                />
                            </div>
                        )}

                        {/* Loading States */}
                        {(isGeneratingLocal || isSaving) && (
                            <div className="flex items-center justify-center mb-4">
                                <LoadingSpinner size="sm" />
                                <span className="ml-2 text-sm text-gray-500">
                                    {isSaving ? 'Saving QR code...' : 'Generating QR code...'}
                                </span>
                            </div>
                        )}

                        {/* Item Details */}
                        {item && (
                            <div className="text-center mb-4">
                                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {item.name}
                                </h3>
                                {item.serialNumber && (
                                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        Serial: {item.serialNumber}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        {showActions && qrGenerated && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                                <Button
                                    onClick={handleDownload}
                                    disabled={isDownloading || isSaving}
                                    color="blue"
                                    size="md"
                                    className="flex-1 justify-center max-w-[200px]"
                                >
                                    {isDownloading ? (
                                        <LoadingSpinner size="sm" />
                                    ) : (
                                        <>
                                            <span className="mr-2">⬇️</span>
                                            Download QR
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default QRCodeManager;