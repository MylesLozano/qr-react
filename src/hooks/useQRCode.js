import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import QRCodeManager from "../components/QRCodeManager";
import { logAudit } from "../firebase";
import { calculateQrStats } from "../utils/inventoryUtils";

export default function useQRCode(items, user) {
  const [qrPreview, setQrPreview] = useState(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  const [qrStats, setQrStats] = useState({
    totalWithQr: 0,
    totalWithoutQr: 0,
    lastGenerated: null,
  });

  // Calculate QR stats when items change
  useEffect(() => {
    setQrStats(calculateQrStats(items));
  }, [items]);

  // Generate QR code
  const generateQrCode = async (item) => {
    try {
      setIsGeneratingQr(true);

      const qrData = {
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        dateGenerated: new Date().toISOString(),
      };

      await QRCodeManager.generateQR(qrData);
      await logAudit(user.email, `Generated QR code for: ${item.name}`);

      // Update QR stats
      setQrStats((prev) => ({
        ...prev,
        lastGenerated: new Date().toISOString(),
        totalWithQr: prev.totalWithQr + 1,
        totalWithoutQr: prev.totalWithoutQr - 1,
      }));

      toast.success("QR code generated successfully");
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    } finally {
      setIsGeneratingQr(false);
    }
  };

  // Preview QR code
  const previewQrCode = (item) => {
    setQrPreview(item);
  };

  return {
    qrStats,
    qrPreview,
    setQrPreview,
    isGeneratingQr,
    generateQrCode,
    previewQrCode,
  };
}
