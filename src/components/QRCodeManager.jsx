import React, { useState, useCallback, useMemo } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { logAudit } from '../firebase';
import ErrorBoundary from './ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';

function QRCodeManager({
    item,
    onGenerate,
    onPreview,
    isGenerating,
    showActions = true,
    size = 256
}) {
    const { user } = useAuth();
    const [qrData, setQrData] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [error, setError] = useState(null);

    // Rate limiting
    const [lastGenerationTime, setLastGenerationTime] = useState(null);
    const RATE_LIMIT_MS = 5000; // 5 seconds

    // Validate QR data
    const validateQRData = useCallback((data) => {
        if (!data) return false;
        if (!data.id || !data.name) return false;
        if (data.name.length > 100) return false;
        return true;
    }, []);

    // Generate QR data with validation
    const generateQRData = useCallback(() => {
        if (!item) return null;

        const data = {
            id: item.id,
            name: item.name,
            unitNumber: item.unitNumber,
            lab: item.lab,
            condition: item.itemCondition,
            lastUpdated: new Date().toISOString()
        };

        if (!validateQRData(data)) {
            throw new Error('Invalid QR data');
        }

        return data;
    }, [item, validateQRData]);

    // Handle QR code generation with rate limiting
    const handleGenerate = async () => {
        try {
            if (lastGenerationTime && Date.now() - lastGenerationTime < RATE_LIMIT_MS) {
                toast.warning('Please wait before generating another QR code');
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
                itemName: item.name
            });

            toast.success('QR code generated successfully');
        } catch (error) {
            console.error('Error generating QR code:', error);
            setError(error.message);
            toast.error(`Failed to generate QR code: ${error.message}`);
        }
    };

    // Handle QR code preview
    const handlePreview = () => {
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
    };

    // Handle QR code download
    const handleDownload = async () => {
        if (!qrData) {
            toast.warning('Please generate a QR code first');
            return;
        }

        setIsDownloading(true);
        setError(null);
        try {
            const qrElement = document.getElementById('qr-code');
            if (!qrElement) {
                throw new Error('QR code element not found');
            }

            const canvas = await html2canvas(qrElement, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false
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
                    itemName: item.name
                });

                toast.success('QR code downloaded successfully');
            });
        } catch (error) {
            console.error('Error downloading QR code:', error);
            setError(error.message);
            toast.error(`Failed to download QR code: ${error.message}`);
        } finally {
            setIsDownloading(false);
        }
    };

    // Get QR code size based on content
    const getQRSize = useMemo(() => {
        const data = JSON.stringify(qrData || generateQRData());
        return Math.min(256, Math.max(128, data.length * 2));
    }, [qrData, generateQRData]);

    return (
        <ErrorBoundary>
            <div className="bg-white p-6 rounded-lg shadow" role="region" aria-label="QR Code Manager">
                <div className="flex flex-col items-center space-y-4">
                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4" role="alert">
                            {error}
                        </div>
                    )}

                    {/* QR Code Display */}
                    <div
                        id="qr-code"
                        className="p-4 bg-white rounded-lg"
                        aria-label="QR Code Display"
                    >
                        {qrData ? (
                            <QRCodeSVG
                                value={JSON.stringify(qrData)}
                                size={getQRSize}
                                level="H"
                                includeMargin={true}
                                aria-label={`QR Code for ${item?.name}`}
                            />
                        ) : (
                            <div className="w-64 h-64 flex items-center justify-center bg-gray-100 rounded-lg">
                                <p className="text-gray-500">No QR code generated</p>
                            </div>
                        )}
                    </div>

                    {/* Item Information */}
                    <div className="text-center">
                        <h3 className="text-lg font-semibold">{item?.name || 'No item selected'}</h3>
                        <p className="text-sm text-gray-600">
                            {item?.unitNumber ? `Unit #${item.unitNumber}` : 'No unit number'}
                        </p>
                        <p className="text-sm text-gray-600">
                            {item?.lab ? `Lab: ${item.lab}` : 'No lab assigned'}
                        </p>
                        <p className="text-sm text-gray-600">
                            Condition: {item?.itemCondition || 'Unknown'}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    {showActions && (
                        <div className="flex space-x-4">
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`px-4 py-2 rounded-md text-white ${isGenerating
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
                                className={`px-4 py-2 rounded-md text-white ${!qrData
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
                                className={`px-4 py-2 rounded-md text-white ${!qrData || isDownloading
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