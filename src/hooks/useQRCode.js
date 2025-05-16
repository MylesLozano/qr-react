// File: src/hooks/useQRCode.js

import { useState, useCallback } from "react";
import {
  saveQRCodeToFirestore,
  getQRCodeFromFirestore,
  updateQRCodeLockStatus,
  logAudit,
} from "../firebase";

export function useQRCode(user) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkExistingRequest = useCallback(async (itemId) => {
    try {
      const existingQR = await getQRCodeFromFirestore(itemId);
      return existingQR || null;
    } catch (err) {
      console.error("Error checking existing QR:", err);
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
        await logAudit("qr_code_generated", user?.email, "qr", {
          itemId,
          ...metadata,
        });
        return true;
      } catch (err) {
        console.error("Error saving QR code:", err);
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
          setError("This QR code is locked and cannot be modified.");
          return false;
        }

        const success = await createRequest(itemId, qrDataUrl, metadata);
        if (!success) {
          setError("Failed to save QR code");
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
        await logAudit(
          lock ? "qr_code_locked" : "qr_code_unlocked",
          user?.email,
          "qr",
          { itemId }
        );
        return true;
      } catch (err) {
        console.error("Error updating QR lock status:", err);
        return false;
      }
    },
    [user?.email]
  );

  return {
    loading,
    error,
    handleQRCode,
    updateQRLock,
  };
}
