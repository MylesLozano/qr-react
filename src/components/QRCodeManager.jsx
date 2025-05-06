// File: src/components/QRCodeManager.jsx

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../firebase';
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
    const retryTimeoutRef = useRef(null);

    // Get QR code size based on data length (memoized)
    const getQRSize = useMemo(() => {
        if (!localQrData) return MIN_QR_SIZE;
        const dataLength = JSON.stringify(localQrData).length;
        return Math.min(MAX_QR_SIZE, Math.max(MIN_QR_SIZE, Math.round(dataLength * 2.5)));
    }, [localQrData]);

    // Helper for theme-based class names
    const getThemeClass = useCallback((isDark, baseClass, darkClass, lightClass) => {
        return `${baseClass} ${isDark ? darkClass : lightClass}`;
    }, []);

    useEffect(() => {
        setLocalQrData(qrData);
        if (qrData) setQrGenerated(true);
    }, [qrData]);

    const handleDownload = async () => {
        if (!localQrData || !qrElementRef.current) return;

        setIsDownloading(true);
        setError(null);

        try {
            // Create SVG data URL
            const svgElement = qrElementRef.current.querySelector('svg');
            if (!svgElement) throw new Error('QR code element not found');

            // Create canvas with white background
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20; // Add padding around QR code
            
            // Set canvas size with padding
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
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `QR_${item?.name || 'code'}_${new Date().toISOString().split('T')[0]}.png`;
            link.href = pngUrl;
            link.click();

            // Log the download
            if (user) {
                await logAudit('qr_code_downloaded', user.email, 'qr_code', {
                    itemId: item?.id,
                    itemName: item?.name
                });
            }

            toast.success('QR code downloaded successfully');
        } catch (err) {
            const message = 'Failed to download QR code';
            handleError(err, message);
            setError(message);
        } finally {
            setIsDownloading(false);
        }
    };

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
                        {showActions && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full justify-center">
                                <Button
                                    onClick={handleDownload}
                                    disabled={isDownloading || !qrGenerated}
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