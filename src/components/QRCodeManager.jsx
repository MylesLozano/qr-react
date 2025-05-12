// File: src/components/QRCodeManager.jsx

import { useState, useCallback, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQRCode } from '../hooks/useQRCode';
import { useAuth } from '../hooks/useAuth';
import { useErrorHandler } from '../hooks/useErrorHandler';
import Button from './Button';
import { toast } from 'react-toastify';
import ErrorBoundary from './ErrorBoundary';
import { useTheme } from '../hooks/useTheme';

// Constants
const MAX_QR_SIZE = 256;

function QRCodeManager({
    item,
    qrData,
    showActions = true,
    size = MAX_QR_SIZE,
}) {
    const [localQrData, setLocalQrData] = useState(qrData);
    const { user } = useAuth();
    const { handleQRCode } = useQRCode(user);
    const handleError = useErrorHandler();
    const { isDarkMode } = useTheme();

    const validateQrData = useCallback((qrObject) => {
        if (!qrObject || typeof qrObject !== 'object') {
            handleError(new Error('Invalid QR data format'));
            return false;
        }
        return true;
    }, [handleError]);

    const handleQrGeneration = useCallback(async () => {
        if (!validateQrData(localQrData)) return;

        try {
            // Save QR code generation
            const success = await handleQRCode(item.id, null, {
                qrData: JSON.stringify(localQrData),
                itemName: item.name,
            });

            if (success) {
                setLocalQrData(localQrData);
            }
        } catch (err) {
            handleError(err);
        }
    }, [handleQRCode, handleError, item.id, item.name, localQrData, validateQrData]);

    useEffect(() => {
        if (qrData) {
            validateQrData(qrData);
            setLocalQrData(qrData);
        }
    }, [qrData, validateQrData]);

    const handleDownload = async () => {
        if (!localQrData) {
            toast.error("No QR code data available to download");
            return;
        }

        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const padding = 20;

            canvas.width = size + (padding * 2);
            canvas.height = size + (padding * 2);

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const img = new Image();
            const svgBlob = new Blob([null], { type: 'image/svg+xml;charset=utf-8' });
            const URL = window.URL || window.webkitURL || window;
            const svgUrl = URL.createObjectURL(svgBlob);

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
                img.src = svgUrl;
            });

            ctx.drawImage(img, padding, padding, size, size);
            URL.revokeObjectURL(svgUrl);

            canvas.toBlob((blob) => {
                const fileName = `QR_${item?.name || 'code'}_${new Date().toISOString().split('T')[0]}.png`;
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
            });

            toast.success('QR code downloaded successfully');
        } catch (err) {
            handleError(err);
            toast.error('Failed to download QR code');
        }
    };

    return (
        <ErrorBoundary>
            <div className={`w-full max-w-sm mx-auto ${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg overflow-hidden`}>
                <div className="p-4">
                    <div className="flex flex-col items-center justify-center min-h-[200px]">
                        {localQrData ? (
                            <QRCodeSVG
                                value={JSON.stringify(localQrData)}
                                size={size}
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
                            <Button
                                onClick={handleQrGeneration}
                                color="green"
                                size="sm"
                            >
                                Save QR
                            </Button>
                            <Button
                                onClick={handleDownload}
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