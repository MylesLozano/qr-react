// File: src/hooks/useQRCode.js

import { useState, useCallback, useEffect } from 'react';
import {
  saveQRCodeToFirestore,
  getQRCodeFromFirestore,
  updateQRCodeLockStatus,
  logAudit,
} from '../firebase';
import { calculateQrStats } from '../utils/inventoryUtils';
import { generateQrString } from '../utils/qrUtils';

export function useQRCode(items = [], user) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [qrStats, setQrStats] = useState({ totalWithQr: 0, totalWithoutQr: 0 });
  const [qrPreview, setQrPreview] = useState(null);
  const [generatedQrData, setGeneratedQrData] = useState(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  const checkExistingRequest = useCallback(async (itemId) => {
    try {
      const existingQR = await getQRCodeFromFirestore(itemId);
      return existingQR || null;
    } catch (err) {
      console.error('Error checking existing QR:', err);
      return null;
    }
  }, []);

  const createRequest = useCallback(
    async (itemId, qrDataUrl, metadata = {}) => {
      try {
        await saveQRCodeToFirestore(itemId, qrDataUrl, {
          ...metadata,
          generatedBy: user?.email,
        });
        await logAudit('qr_code_generated', user?.email, 'qr', {
          itemId,
          ...metadata,
        });
        return true;
      } catch (err) {
        console.error('Error saving QR code:', err);
        return false;
      }
    },
    [user?.email]
  );

  const handleQRCode = useCallback(
    async (itemId, qrDataUrl, metadata = {}) => {
      setLoading(true);
      setError(null);

      try {
        const existingQR = await checkExistingRequest(itemId);
        if (existingQR?.isLocked) {
          setError('This QR code is locked and cannot be modified.');
          return false;
        }

        const success = await createRequest(itemId, qrDataUrl, metadata);
        if (!success) {
          setError('Failed to save QR code');
          return false;
        }

        return true;
      } catch (err) {
        setError(err.message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [checkExistingRequest, createRequest]
  );

  const updateQRLock = useCallback(
    async (itemId, lock) => {
      try {
        await updateQRCodeLockStatus(itemId, lock);
        await logAudit(lock ? 'qr_code_locked' : 'qr_code_unlocked', user?.email, 'qr', { itemId });
        return true;
      } catch (err) {
        console.error('Error updating QR lock status:', err);
        return false;
      }
    },
    [user?.email]
  );

  // Generate QR data for an item
  const generateQrData = useCallback((item) => {
    if (!item || !item.id) return null;

    // Generate a unique QR string for this item
    const qrString = generateQrString(item.id);

    return {
      id: item.id,
      name: item.name,
      serialNumber: item.serialNumber || '',
      category: item.category || '',
      lab: item.lab || '',
      itemCondition: item.itemCondition || '',
      timestamp: new Date().toISOString(),
      qrString: qrString, // Add the unique QR string
    };
  }, []);
  // Preview QR code for an item
  const previewQrCode = useCallback(
    async (item) => {
      if (!item || !item.id) {
        setError('Invalid item selected');
        return;
      }

      try {
        setIsGeneratingQr(true);
        setQrPreview(item);

        // First check if we already have a QR code stored for this item
        const existingQR = await checkExistingRequest(item.id);

        if (existingQR) {
          // Use the stored QR code data
          try {
            let qrData;

            if (existingQR.qrData) {
              // Parse stored QR data from JSON
              qrData = JSON.parse(existingQR.qrData);

              // Ensure the QR data has a qrString
              if (!qrData.qrString && existingQR.qrString) {
                qrData.qrString = existingQR.qrString;
              }
            } else if (existingQR.qrString) {
              // If no qrData but we have a qrString, create new QR data with it
              qrData = generateQrData(item);
              qrData.qrString = existingQR.qrString;
            } else {
              // Fallback to generating new data
              qrData = generateQrData(item);
            }

            setGeneratedQrData(qrData);
          } catch (err) {
            console.error('Error parsing stored QR data:', err);
            setGeneratedQrData(generateQrData(item));
          }
        } else {
          // Generate new QR code data with a unique QR string
          setGeneratedQrData(generateQrData(item));
        }
      } catch (err) {
        setError(err.message || 'Error generating QR preview');
        console.error('QR preview error:', err);
      } finally {
        setIsGeneratingQr(false);
      }
    },
    [checkExistingRequest, generateQrData]
  );

  // Close QR preview
  const closeQrPreview = useCallback(() => {
    setQrPreview(null);
    setGeneratedQrData(null);
    setError(null);
  }, []);

  // Update QR stats when items change
  useEffect(() => {
    if (Array.isArray(items) && items.length > 0) {
      setQrStats(calculateQrStats(items));
    }
  }, [items]);

  return {
    loading,
    error,
    handleQRCode,
    updateQRLock,
    qrStats,
    qrPreview,
    generatedQrData,
    isGeneratingQr,
    previewQrCode,
    closeQrPreview,
    qrError: error,
  };
}
