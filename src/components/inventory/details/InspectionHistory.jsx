import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../firebase';
import LoadingSpinner from '../../LoadingSpinner';

/**
 * InspectionHistory component - Displays recent inspection reports for an item
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {string} props.itemId - The ID of the item to show inspection history for
 * @param {boolean} props.isDarkMode - Whether dark mode is active
 * @returns {JSX.Element} The rendered InspectionHistory component
 */
function InspectionHistory({ itemId, isDarkMode }) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchInspectionReports() {
      if (!itemId) return;

      try {
        setLoading(true);
        const reportsQuery = query(
          collection(db, 'inspectionReports'),
          where('itemId', '==', itemId),
          orderBy('timestamp', 'desc'),
          limit(5)
        );

        const querySnapshot = await getDocs(reportsQuery);
        const reportsList = [];
        
        querySnapshot.forEach((doc) => {
          const reportData = doc.data();
          // Convert Firestore timestamp to JS Date
          const timestamp = reportData.timestamp?.toDate() || new Date();
          
          reportsList.push({
            id: doc.id,
            ...reportData,
            timestamp
          });
        });

        setReports(reportsList);
      } catch (err) {
        console.error('Error fetching inspection reports:', err);
        setError('Failed to load inspection history');
      } finally {
        setLoading(false);
      }
    }

    fetchInspectionReports();
  }, [itemId]);

  if (loading) {
    return (
      <div className={`mt-6 p-6 rounded-lg shadow-md flex justify-center items-center transition-colors duration-200 ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`mt-6 p-6 rounded-lg shadow-md transition-colors duration-200 ${
        isDarkMode ? 'bg-red-900/30 text-red-200 border border-red-800' : 'bg-red-50 text-red-700 border border-red-200'
      }`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
          {error}
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className={`mt-6 p-6 rounded-lg shadow-md transition-colors duration-200 ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <p className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          No inspection reports found for this item.
        </p>
      </div>
    );
  }

  return (
    <div className={`mt-6 p-4 rounded-lg shadow-md transition-colors duration-200 ${
      isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h4 className="text-lg font-semibold mb-4 border-b pb-2">Recent Inspections</h4>
      <div className="space-y-4">
        {reports.map((report) => (
          <div 
            key={report.id}
            className={`p-4 rounded-lg transition-colors duration-200 ${
              isDarkMode ? 'bg-gray-700 border border-gray-600' : 'bg-gray-50 border border-gray-200'
            } shadow-sm`}
          >
            <div className="flex justify-between items-start mb-3 border-b pb-2">
              <div>
                <span className="font-medium">Inspected by:</span>{' '}
                <span className={isDarkMode ? 'text-blue-400' : 'text-blue-600'}>
                  {report.inspectedBy?.displayName || report.inspectedBy?.email || 'Unknown'}
                </span>
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                {report.timestamp.toLocaleDateString()} {report.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 transition-colors duration-200 ${
                  report.inspection?.physicalConditionGood 
                    ? isDarkMode ? 'bg-green-400' : 'bg-green-500' 
                    : isDarkMode ? 'bg-red-400' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Physical condition</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 transition-colors duration-200 ${
                  report.inspection?.labelsIntact 
                    ? isDarkMode ? 'bg-green-400' : 'bg-green-500' 
                    : isDarkMode ? 'bg-red-400' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Labels intact</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 transition-colors duration-200 ${
                  report.inspection?.functionalityTested 
                    ? isDarkMode ? 'bg-green-400' : 'bg-green-500' 
                    : isDarkMode ? 'bg-red-400' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Functionality tested</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 transition-colors duration-200 ${
                  report.inspection?.safetyCompliant 
                    ? isDarkMode ? 'bg-green-400' : 'bg-green-500' 
                    : isDarkMode ? 'bg-red-400' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Safety compliant</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full mr-2 transition-colors duration-200 ${
                  report.inspection?.calibrationUpToDate 
                    ? isDarkMode ? 'bg-green-400' : 'bg-green-500' 
                    : isDarkMode ? 'bg-red-400' : 'bg-red-500'
                }`}></div>
                <span className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>Calibration up to date</span>
              </div>
            </div>
            
            {report.inspection?.notes && (
              <div className={`mt-2 p-3 rounded border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <p className={`text-sm italic ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {report.inspection.notes}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

InspectionHistory.propTypes = {
  itemId: PropTypes.string.isRequired,
  isDarkMode: PropTypes.bool.isRequired
};

export default InspectionHistory;
