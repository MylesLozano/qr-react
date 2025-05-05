// File: src/hooks/useQRCode.js

import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
// Import logAudit from firebase.js
import { logAudit } from "../firebase"; // Assuming logAudit is exported from firebase.js
// Import calculateQrStats if it's a separate utility
import { calculateQrStats } from "../utils/inventoryUtils"; // Assuming calculateQrStats is in inventoryUtils

export default function useQRCode(items, user) {
  // State for the item whose QR code is being previewed
  const [qrPreview, setQrPreview] = useState(null);
  // State for the generated QR code data (the actual content of the QR)
  const [generatedQrData, setGeneratedQrData] = useState(null);
  // State for the loading indicator during QR data generation
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);
  // State for tracking QR code statistics
  const [qrStats, setQrStats] = useState({
    totalWithQr: 0,
    totalWithoutQr: 0,
    lastGenerated: null,
  });
   // State for managing errors during QR operations within the hook
   const [qrError, setQrError] = useState(null);


  // Calculate QR stats whenever the items list changes
  useEffect(() => {
    setQrStats(calculateQrStats(items));
  }, [items]); // Dependency array: recalculate when 'items' changes

  // Validate data structure before generating QR code
  const validateQRData = useCallback((data) => {
     if (!data) {
         throw new Error('No data provided for QR code');
     }
     // Add more specific validation based on your item structure if needed
     // Example: if (!data.id || !data.name) { throw new Error('Item ID and name are required'); }
     return true; // Return true if validation passes
  }, []); // No dependencies if validation is based on data structure

  // Generate QR code data for a given item
  const generateQrCodeData = useCallback((item) => {
      if (!item || !item.id || !item.name) {
          console.error("Attempted to generate QR data for invalid item:", item);
          throw new Error("Invalid item data provided for QR code generation.");
      }

      const data = {
          // Include essential item details for the QR code payload
          id: item.id,
          name: item.name,
          // Add other relevant fields that should be encoded in the QR
          serialNumber: item.serialNumber || null,
          unitNumber: item.unitNumber || null,
          category: item.category || null,
          lab: item.lab || null,
          condition: item.itemCondition || null,
          // Include a timestamp when the QR data was generated
          dateGenerated: new Date().toISOString() // Use ISO string for consistency
      };

      // Optional: Validate the generated data structure if validateQRData is complex
      // validateQRData(data);

      return data;
  }, []); // No dependencies if generate logic only uses item properties


  // Prepare data and trigger preview modal
  const previewQrCode = useCallback(async (item) => {
    if (!item) return;

    setQrPreview(item); // Set the item to be previewed (opens the modal)
    setGeneratedQrData(null); // Clear previous QR data
    setIsGeneratingQr(true); // Indicate loading for data generation
    setQrError(null); // Clear any previous errors

    try {
      // Generate the data that will be encoded in the QR code
      const data = generateQrCodeData(item);

      // Validate the generated data
      validateQRData(data); // Use the validation function

      // Set the generated data state - this will be passed to QRCodeManager
      setGeneratedQrData(data);

      // Log audit for preview action (optional, or maybe log on generation/download)
      // Ensure logAudit is called with correct parameters: action, userEmail, entityType, details
       if (user?.email) {
           await logAudit('Previewed QR Code', user.email, 'inventory', {
               itemId: item.id,
               itemName: item.name,
           });
       } else {
            console.warn("User not logged in, cannot log audit for QR preview.");
       }


      // toast.success("QR code data prepared for preview"); // Optional toast


    } catch (error) {
      console.error("Error preparing QR code data for preview:", error);
      setQrError("Failed to prepare QR code data for preview.");
      toast.error("Failed to prepare QR code data for preview.");
      setQrPreview(null); // Close the modal on error
      setGeneratedQrData(null); // Clear generated data on error
    } finally {
      setIsGeneratingQr(false); // End loading
    }
  }, [generateQrCodeData, validateQRData, user, logAudit]); // Depend on handlers and user


    // Reset states when the preview modal is closed
    const closeQrPreview = useCallback(() => {
        setQrPreview(null);
        setGeneratedQrData(null); // Clear generated data when modal closes
        setQrError(null); // Clear error when modal closes
    }, []);


  // You can also have a separate function here if you need to explicitly trigger generate & save (not just preview)
  // const generateAndDownloadQrCode = useCallback(async (item) => { ... }, [/* dependencies */]);


  return {
    qrStats, // Statistics about QR codes
    qrPreview, // The item being previewed (determines if modal is open)
    setQrPreview, // Setter for preview item (can be used to open/close, but previewQrCode is preferred for opening)
    generatedQrData, // The actual data encoded in the QR code (pass to QRCodeManager)
    isGeneratingQr, // Loading state for data generation
    qrError, // Error state for QR operations
    // generateQrCode, // Removed - logic is now within previewQrCode or a separate download trigger
    previewQrCode, // Handler to trigger preview (generates data and opens modal)
    closeQrPreview // Handler to close the preview modal
  };
}