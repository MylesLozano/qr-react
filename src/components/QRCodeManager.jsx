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
    showActions = true,
    size = MAX_QR_SIZE,
}) {
    const { isDarkMode } = useTheme();
    const { user } = useAuth();
    const { handleError, error: handlerError, setError: setHandlerError } = useErrorHandler();
    const qrElementRef = useRef(null);
    const [localQrData, setLocalQrData] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);
    const [qrExists, setQrExists] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (qrData) {
            try {
                validateQrData(qrData);
                setLocalQrData(qrData);
                setQrExists(true);
                setError(null);
            } catch (validationError) {
                setError(`Invalid QR data received: ${validationError.message}`);
                setLocalQrData(null);
                setQrExists(false);
            }
        } else {
            setLocalQrData(null);
        }
    }, [qrData]);

    useEffect(() => {
        let isMounted = true;
        const checkExistingQR = async () => {
            if (!item?.id) {
                setQrExists(false);
                setLocalQrData(null);
                return;
            }
            if (!localQrData) {
                setIsSaving(true);
                setError(null);
                try {
                    const existingQR = await getQRCodeFromFirestore(item.id);
                    if (isMounted && existingQR) {
                        try {
                            const parsedData = JSON.parse(existingQR.qrData);
                            validateQrData(parsedData);
                            setLocalQrData(parsedData);
                            setQrExists(true);
                        } catch (parseError) {
                            setError("Failed to parse stored QR data.");
                            console.error('Error parsing stored QR:', parseError);
                            setQrExists(false);
                        }
                    } else if (isMounted) {
                        setQrExists(false);
                    }
                } catch (err) {
                    if (isMounted) {
                        setError(err.message || 'Error checking existing QR code');
                        console.error('Error checking existing QR:', err);
                        setQrExists(false);
                    }
                } finally {
                    if (isMounted) setIsSaving(false);
                }
            }
        };

        checkExistingQR();
        return () => { isMounted = false; };
    }, [item?.id]);

    const validateItem = useCallback((itemToCheck) => {
        if (!itemToCheck) throw new Error("No item provided");
        if (!itemToCheck.id) throw new Error("Item missing ID");
        if (!itemToCheck.name) throw new Error("Item missing name");
        return true;
    }, []);

    const validateQrData = useCallback((data) => {
        if (!data) throw new Error("No QR data provided");
        const dataToValidate = typeof data === 'string' ? JSON.parse(data) : data;
        if (typeof dataToValidate !== 'object') throw new Error("Invalid QR data format");
        if (JSON.stringify(dataToValidate).length > 1000) throw new Error("QR data exceeds size limit");
        return true;
    }, []);

    const getQRSize = useMemo(() => {
        if (!localQrData) return MIN_QR_SIZE;
        try {
            const dataLength = JSON.stringify(localQrData).length;
            // Use the size prop but constrain it between MIN and MAX
            const calculatedSize = Math.round(dataLength * 0.5);
            return Math.min(size, Math.max(MIN_QR_SIZE, calculatedSize));
        } catch {
            return MIN_QR_SIZE;
        }
    }, [localQrData, size]);

    const saveQRToFirestore = async () => {
        if (!item?.id || !qrElementRef.current || isSaving || !localQrData) {
            toast.warn("Cannot save QR code: Missing data or already saving.");
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            validateItem(item);
            validateQrData(localQrData);

            const svgElement = qrElementRef.current.querySelector('svg');
            if (!svgElement) throw new Error("QR SVG element not found for saving.");

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20;
            const currentSize = getQRSize;

            canvas.width = currentSize + (padding * 2);
            canvas.height = currentSize + (padding * 2);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const img = new Image();
            const svgBlob = new Blob([svgElement.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            await new Promise((resolve, reject) => {
                img.onload = () => {
                    ctx.drawImage(img, padding, padding, currentSize, currentSize);
                    URL.revokeObjectURL(url);
                    resolve();
                };
                img.onerror = (err) => {
                    URL.revokeObjectURL(url);
                    reject(err);
                };
                img.src = url;
            });

            const dataUrl = canvas.toDataURL('image/png');
            await saveQRCodeToFirestore(item.id, dataUrl, {
                qrData: JSON.stringify(localQrData),
                itemName: item.name,
                generatedBy: user.email,
                timestamp: new Date().toISOString()
            });

            await logAudit('qr_code_saved', user.email, 'inventory', {
                itemId: item.id,
                itemName: item.name
            });

            setQrExists(true);
            toast.success('QR code saved successfully');
        } catch (err) {
            const message = err.message || 'Failed to save QR code';
            setError(message);
            handleError(err, message);
            setQrExists(false);
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
            validateQrData(localQrData);

            const svgElement = qrElementRef.current.querySelector('svg');
            if (!svgElement) throw new Error('QR code element not found');

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20;

            canvas.width = getQRSize + (padding * 2);
            canvas.height = getQRSize + (padding * 2);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const img = new Image();
            const svgBlob = new Blob([svgElement.outerHTML], { type: 'image/svg+xml;charset=utf-8' });
            const URL = window.URL || window.webkitURL || window;
            const svgUrl = URL.createObjectURL(svgBlob);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = svgUrl;
            });

            ctx.drawImage(img, padding, padding, getQRSize, getQRSize);
            URL.revokeObjectURL(svgUrl);

            canvas.toBlob((blob) => {
                saveAs(blob, `QR_${item?.name || 'code'}_${new Date().toISOString().split('T')[0]}.png`);
            });

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

    useEffect(() => {
        return () => {
            setError(null);
            setQrExists(false);
            setLocalQrData(null);
        };
    }, []);

    const shouldShowSaveButton = showActions && localQrData && !qrExists;

    return (
        <ErrorBoundary>
            <div className={`w-full max-w-sm mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
                <div className="p-4">
                    {error && (
                        <div className={`mb-4 p-3 rounded-lg text-sm ${isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
                            {error}
                        </div>
                    )}

                    <div ref={qrElementRef} className="flex flex-col items-center justify-center min-h-[200px]">
                        {isSaving ? (
                            <LoadingSpinner text="Loading/Saving QR..." />
                        ) : localQrData ? (
                            <QRCodeSVG
                                value={JSON.stringify(localQrData)}
                                size={getQRSize}
                                bgColor={isDarkMode ? "#1F2937" : "#FFFFFF"}
                                fgColor={isDarkMode ? "#FFFFFF" : "#000000"}
                                level={"L"}
                                includeMargin={false}
                            />
                        ) : (
                            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {item?.id ? "No QR code generated or found." : "Select an item to manage its QR code."}
                            </div>
                        )}
                    </div>

                    {showActions && localQrData && (
                        <div className="mt-4 flex justify-center gap-3">
                            {shouldShowSaveButton && (
                                <Button
                                    onClick={saveQRToFirestore}
                                    disabled={isSaving || isDownloading}
                                    loading={isSaving}
                                    color="green"
                                    size="sm"
                                >
                                    Save QR
                                </Button>
                            )}
                            <Button
                                onClick={handleDownload}
                                disabled={isSaving || isDownloading}
                                loading={isDownloading}
                                color="blue"
                                size="sm"
                            >
                                Download QR
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </ErrorBoundary>
    );
}

export default QRCodeManager;