// File: src/hooks/useQRCode.js

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import { logAudit, db, getQRCodeFromFirestore, updateQRCodeLockStatus } from "../firebase";
import { calculateQrStats } from "../utils/inventoryUtils";
import {
  doc,
  updateDoc,
  getDoc,
  setDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";

export default function useQRCode(items, user) {
  const [qrPreview, setQrPreview] = useState(null);
  const [generatedQrData, setGeneratedQrData] = useState(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrStats, setQrStats] = useState({
    totalWithQr: 0,
    totalWithoutQr: 0,
    lastGenerated: null,
  });
  const [qrError, setQrError] = useState(null);
  const [isQrLocked, setIsQrLocked] = useState(false);

  // Calculate QR stats whenever items change
  useEffect(() => {
    setQrStats(calculateQrStats(items));
  }, [items]);

  // Check if an item is already requested
  const checkExistingRequest = async (itemId) => {
    try {
      const requestRef = doc(db, "itemRequests", itemId);
      const requestDoc = await getDoc(requestRef);

      if (requestDoc.exists()) {
        const requestData = requestDoc.data();
        // Check if the request is still active (less than 24 hours old)
        const requestTime = requestData.timestamp.toDate();
        const now = new Date();
        const hoursDiff = (now - requestTime) / (1000 * 60 * 60);

        if (hoursDiff < 24) {
          if (requestData.requestedBy === user.email) {
            return { isRequested: true, isSameUser: true };
          }
          return { isRequested: true, isSameUser: false };
        }
      }
      return { isRequested: false };
    } catch (error) {
      console.error("Error checking request status:", error);
      throw error;
    }
  };

  // Create a new request
  const createRequest = async (itemId) => {
    const requestRef = doc(db, "itemRequests", itemId);
    await setDoc(requestRef, {
      itemId,
      requestedBy: user.email,
      timestamp: serverTimestamp(),
      status: "pending",
    });
  };

  const validateQRData = useCallback((data) => {
    if (!data) {
      throw new Error("No data provided for QR code");
    }
    return true;
  }, []);

  const generateQrCodeData = useCallback((item) => {
    if (!item || !item.id || !item.name) {
      throw new Error("Invalid item data provided for QR code generation.");
    }

    return {
      id: item.id,
      name: item.name,
      serialNumber: item.serialNumber || null,
      unitNumber: item.unitNumber || null,
      category: item.category || null,
      lab: item.lab || null,
      condition: item.itemCondition || null,
      dateGenerated: new Date().toISOString(),
    };
  }, []);

  const previewQrCode = useCallback(
    async (item) => {
      if (!item) return;

      setQrPreview(item);
      setGeneratedQrData(null);
      setIsGeneratingQr(true);
      setQrError(null);
      setIsQrLocked(false);

      try {
        // Check for existing requests first
        const { isRequested, isSameUser } = await checkExistingRequest(item.id);
        if (isRequested) {
          if (isSameUser) {
            toast.info("You have already requested this item");
          } else {
            toast.error("Item has already been requested. Choose another one.");
          }
          setQrPreview(null);
          setIsGeneratingQr(false);
          return;
        }

        // Check if QR is locked before generating
        const existingQRDoc = await getQRCodeFromFirestore(item.id);
        if (existingQRDoc && existingQRDoc.isLocked) {
          toast.info("This item's QR code is currently locked.");
          if (existingQRDoc.qrData) {
            try {
              setGeneratedQrData(JSON.parse(existingQRDoc.qrData));
              setIsQrLocked(true);
            } catch (parseError) {
              console.error("Failed to parse existing QR data:", parseError);
              setQrError("Failed to load existing QR data.");
              toast.error("Failed to load existing QR data.");
            }
          }
          setIsGeneratingQr(false);
          return;
        }

        // Create a new request
        await createRequest(item.id);

        // Generate QR code data
        const data = generateQrCodeData(item);
        validateQRData(data);

        // Convert QR code to image using QRCodeSVG
        const qrSvg = document.createElement("div");
        qrSvg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"></svg>`;
        // Note: The actual QR code rendering will happen in the QRCodeManager component

        // Store QR code and update item
        const itemRef = doc(db, "inventory", item.id);
        await updateDoc(itemRef, {
          hasQR: true,
          lastQRGenerated: serverTimestamp(),
        });

        setGeneratedQrData(data);
        setIsQrLocked(existingQRDoc?.isLocked || false);

        await logAudit("qr_code_generated", user.email, "inventory", {
          itemName: item.name,
          itemId: item.id,
        });
      } catch (error) {
        console.error("Error preparing QR code data for preview:", error);
        setQrError("Failed to prepare QR code data for preview.");
        toast.error("Failed to prepare QR code data for preview.");
        setQrPreview(null);
        setGeneratedQrData(null);
      } finally {
        setIsGeneratingQr(false);
      }
    },
    [generateQrCodeData, validateQRData, user, checkExistingRequest, createRequest]
  );

  const closeQrPreview = useCallback(() => {
    setQrPreview(null);
    setGeneratedQrData(null);
    setQrError(null);
    setIsQrLocked(false);
  }, []);

  const toggleLockQR = useCallback(async (itemId) => {
    if (!itemId || !user) return;

    const newLockStatus = !isQrLocked;
    setIsGeneratingQr(true);
    setQrError(null);

    try {
      await updateQRCodeLockStatus(itemId, newLockStatus);
      setIsQrLocked(newLockStatus);

      await logAudit(newLockStatus ? "qr_code_locked" : "qr_code_unlocked", user.email, "qr_code", {
        itemId: itemId,
      });

      toast.success(`QR code successfully ${newLockStatus ? 'locked' : 'unlocked'}.`);
    } catch (error) {
      console.error("Error toggling QR lock status:", error);
      setQrError("Failed to update QR code lock status.");
      toast.error("Failed to update QR code lock status.");
    } finally {
      setIsGeneratingQr(false);
    }
  }, [isQrLocked, user, updateQRCodeLockStatus, logAudit]);

  return {
    qrStats,
    qrPreview,
    setQrPreview,
    generatedQrData,
    isGeneratingQr,
    qrError,
    isQrLocked,
    previewQrCode,
    closeQrPreview,
    toggleLockQR,
  };
}