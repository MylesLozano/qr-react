import React, { useState } from 'react';
import QRCode from 'qrcode.react';
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
    const [qrRef, setQrRef] = useState(null);

    const downloadQR = async () => {
        if (!qrRef) return;

        try {
            const canvas = await html2canvas(qrRef);
            canvas.toBlob((blob) => {
                saveAs(blob, `qr-${item.name || 'code'}.png`);
            });
            toast.success('QR code downloaded successfully!');
        } catch (error) {
            console.error('Error downloading QR:', error);
            toast.error('Failed to download QR code');
        }
    };

    const qrData = item?.qrData || {
        id: item?.id,
        name: item?.name,
        unitNumber: item?.unitNumber,
        lab: item?.lab,
        condition: item?.itemCondition,
        lastUpdated: new Date().toISOString()
    };

    return (
        <div className="flex flex-col items-center">
            <div ref={setQrRef} className="p-4 bg-white inline-block">
                <QRCode
                    value={JSON.stringify(qrData)}
                    size={size}
                    level="H"
                    includeMargin={true}
                />
            </div>

            {showActions && (
                <div className="mt-4 space-x-2">
                    {!item?.uniqueQR ? (
                        <button
                            onClick={() => onGenerate(item)}
                            disabled={isGenerating}
                            className={`px-4 py-2 rounded ${isGenerating ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
                                } text-white`}
                        >
                            {isGenerating ? 'Generating...' : 'Generate QR'}
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => onPreview(item)}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                            >
                                View QR
                            </button>
                            <button
                                onClick={downloadQR}
                                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                            >
                                Download
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default QRCodeManager; 