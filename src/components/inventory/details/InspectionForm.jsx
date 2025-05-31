import { useState } from 'react';
import PropTypes from 'prop-types';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useAuth } from '../../../hooks/useAuth';
import Button from '../../Button';
import { toast } from 'react-toastify';

/**
 * InspectionForm component - Allows admins and superadmins to submit inspection reports
 * for inventory items after scanning QR codes
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.item - The item being inspected
 * @param {boolean} props.isDarkMode - Whether dark mode is active
 * @param {function} props.onCancel - Function to call when canceling the form
 * @returns {JSX.Element} The rendered InspectionForm component
 */
function InspectionForm({ item, isDarkMode, onCancel }) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkboxes, setCheckboxes] = useState({
    physicalConditionGood: false,
    labelsIntact: false,
    functionalityTested: false,
    safetyCompliant: false,
    calibrationUpToDate: false,
  });
  const [notes, setNotes] = useState('');

  const handleCheckboxChange = (event) => {
    const { name, checked } = event.target;
    setCheckboxes(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const handleNotesChange = (event) => {
    setNotes(event.target.value);
  };

  const isFormValid = () => {
    // Allow submission regardless of checkbox count
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!isFormValid()) {
      toast.warning('Please complete at least 3 inspection checkpoints');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create the inspection report data that matches the security rules
      const reportData = {
        itemId: item.id,
        itemName: item.name,
        inspectorId: user?.uid || '',
        inspectorEmail: user?.email || '',
        inspectorName: user?.displayName || '',
        timestamp: serverTimestamp(),
        inspectionResults: {
          ...checkboxes,
          notes: notes.trim()
        },
        lab: item.lab || '',
        category: item.category || '',
        serialNumber: item.serialNumber || '',
        unitNumber: item.unitNumber || ''
      };

      // Save to Firestore
      const docRef = await addDoc(collection(db, 'inspectionReports'), reportData);
      
      toast.success('Inspection report submitted successfully');
      
      // Reset form
      setCheckboxes({
        physicalConditionGood: false,
        labelsIntact: false,
        functionalityTested: false,
        safetyCompliant: false,
        calibrationUpToDate: false,
      });
      setNotes('');
      
      console.info('Inspection report created with ID:', docRef.id);
      
      // Close the form after successful submission
      onCancel();
    } catch (error) {
      console.error('Error submitting inspection report:', error);
      toast.error('Failed to submit inspection report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`mt-8 p-6 rounded-lg shadow-md transition-colors duration-200 ${isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
      <h3 className="text-xl font-semibold mb-4 border-b pb-2">Item Inspection Report</h3>
      
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="physicalConditionGood"
              name="physicalConditionGood"
              checked={checkboxes.physicalConditionGood}
              onChange={handleCheckboxChange}
              className={`w-5 h-5 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
            />
            <label htmlFor="physicalConditionGood" className="ml-2">
              Physical condition is good (no visible damage)
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="labelsIntact"
              name="labelsIntact"
              checked={checkboxes.labelsIntact}
              onChange={handleCheckboxChange}
              className={`w-5 h-5 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
            />
            <label htmlFor="labelsIntact" className="ml-2">
              QR code and labels are intact and readable
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="functionalityTested"
              name="functionalityTested"
              checked={checkboxes.functionalityTested}
              onChange={handleCheckboxChange}
              className={`w-5 h-5 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
            />
            <label htmlFor="functionalityTested" className="ml-2">
              Item functionality has been tested
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="safetyCompliant"
              name="safetyCompliant"
              checked={checkboxes.safetyCompliant}
              onChange={handleCheckboxChange}
              className={`w-5 h-5 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
            />
            <label htmlFor="safetyCompliant" className="ml-2">
              Item meets safety requirements
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="calibrationUpToDate"
              name="calibrationUpToDate"
              checked={checkboxes.calibrationUpToDate}
              onChange={handleCheckboxChange}
              className={`w-5 h-5 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'}`}
            />
            <label htmlFor="calibrationUpToDate" className="ml-2">
              Calibration/maintenance is up to date (if applicable)
            </label>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="notes" className="block mb-2 font-medium">
            Inspection Notes:
          </label>
          <textarea
            id="notes"
            name="notes"
            value={notes}
            onChange={handleNotesChange}
            rows={4}
            className={`w-full p-3 rounded-lg border transition-colors duration-200 focus:ring-2 focus:ring-blue-500 ${
              isDarkMode
                ? 'bg-gray-700 border-gray-600 text-white focus:bg-gray-700'
                : 'bg-gray-50 border-gray-300 text-gray-900 focus:bg-white'
            }`}
            placeholder="Enter any additional observations or notes about the condition of the item..."
          />
        </div>
        
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            color="gray"
            onClick={onCancel}
            disabled={isSubmitting}
            size="md"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="green"
            disabled={isSubmitting || !isFormValid()}
            loading={isSubmitting}
            loadingText="Submitting..."
            size="md"
          >
            Submit Inspection Report
          </Button>
        </div>
      </form>
    </div>
  );
}

InspectionForm.propTypes = {
  item: PropTypes.object.isRequired,
  isDarkMode: PropTypes.bool.isRequired,
  onCancel: PropTypes.func.isRequired
};

export default InspectionForm;
