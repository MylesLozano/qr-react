import React, { useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { toast } from 'react-toastify';

function QRCodeManager({
    item,
    onGenerate,
    onPreview,
    isGenerating,
    showActions = true,
    size = 256
}) {
    const [qrData, setQrData] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Generate QR data
    const generateQRData = useCallback(() => {
        if (!item) return null;

        return {
            id: item.id,
            name: item.name,
            unitNumber: item.unitNumber,
            lab: item.lab,
            condition: item.itemCondition,
            lastUpdated: new Date().toISOString()
        };
    }, [item]);

    // Handle QR code generation
    const handleGenerate = async () => {
        try {
            if (onGenerate) {
                await onGenerate(item);
            }
            const data = generateQRData();
            setQrData(data);
            toast.success('QR code generated successfully');
        } catch (error) {
            console.error('Error generating QR code:', error);
            toast.error('Failed to generate QR code');
        }
    };

    // Handle QR code preview
    const handlePreview = () => {
        try {
            if (onPreview) {
                onPreview(item);
            }
            const data = generateQRData();
            setQrData(data);
        } catch (error) {
            console.error('Error previewing QR code:', error);
            toast.error('Failed to preview QR code');
        }
    };

    // Handle QR code download
    const handleDownload = async () => {
        if (!qrData) {
            toast.warning('Please generate a QR code first');
            return;
        }

        setIsDownloading(true);
        try {
            const qrElement = document.getElementById('qr-code');
            if (!qrElement) {
                throw new Error('QR code element not found');
            }

            const canvas = await html2canvas(qrElement, {
                scale: 2,
                backgroundColor: '#ffffff'
            });

            // Convert to blob and save
            canvas.toBlob((blob) => {
                saveAs(blob, `qr-code-${item.unitNumber || item.id}.png`);
                toast.success('QR code downloaded successfully');
            });
        } catch (error) {
            console.error('Error downloading QR code:', error);
            toast.error('Failed to download QR code');
        } finally {
            setIsDownloading(false);
        }
    };

    // Get QR code size based on content
    const getQRSize = () => {
        const data = JSON.stringify(qrData || generateQRData());
        return Math.min(256, Math.max(128, data.length * 2));
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex flex-col items-center space-y-4">
                {/* QR Code Display */}
                <div id="qr-code" className="p-4 bg-white rounded-lg">
                    {qrData ? (
                        <QRCodeSVG
                            value={JSON.stringify(qrData)}
                            size={getQRSize()}
                            level="H"
                            includeMargin={true}
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
                        >
                            {isGenerating ? 'Generating...' : 'Generate QR'}
                        </button>
                        <button
                            onClick={handlePreview}
                            disabled={!qrData}
                            className={`px-4 py-2 rounded-md text-white ${!qrData
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700'
                                }`}
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
                        >
                            {isDownloading ? 'Downloading...' : 'Download'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default QRCodeManager; 