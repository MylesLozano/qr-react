import React from 'react';
import Papa from 'papaparse';
import Button from '../../Button';
import { toast } from 'react-toastify';

function BulkUploadSection({ setCsvData, csvData = [], bulkUpload, isUploading, isDarkMode }) {
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Check if file is CSV or TXT
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.txt')) {
      toast.error('Please upload a CSV or TXT file');
      return;
    }

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        // Normalize field names for consistent access, especially for unitNumber
        const normalizedData = results.data.map(item => {
          const normalizedItem = { ...item };
            // Process each key in the item to handle case variations
          Object.keys(item).forEach(key => {
            const lowerKey = key.toLowerCase();
              // Handle unitNumber variations (for item identification only, not for bulk editing)
            if (lowerKey === 'unitNumber' || lowerKey === 'unitnumber' || lowerKey === 'unit_number' || lowerKey === 'unit number' || lowerKey === 'unitnum') {
              normalizedItem.unitNumber = item[key];
              // Also set unitNum for backward compatibility
              normalizedItem.unitNum = item[key];
            }
            
            // Handle other common field name variations as needed
            if (lowerKey === 'name') {
              normalizedItem.name = item[key];
            }
          });
          
          return normalizedItem;
        });
        
        setCsvData(normalizedData);
        toast.success(`${normalizedData.length} items parsed from file`);
      },
      error: (error) => {
        toast.error(`Error parsing file: ${error.message}`);
      },
    });
  };
  return (
    <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      <h2 className="text-xl font-semibold mb-4">Bulk Upload</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full">
          <label htmlFor="csvUpload" className="block mb-2 text-sm font-medium">
            Upload CSV or TXT File
          </label>
          <input
            id="csvUpload"
            type="file"
            accept=".csv,.txt"
            onChange={handleCsvUpload}
            className={`
              block w-full text-sm
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              ${isDarkMode ? 'file:bg-blue-900 file:text-white hover:file:bg-blue-800 text-gray-300' : 'text-gray-700'}
            `}
          />
        </div>{' '}
        <Button
          onClick={bulkUpload}
          disabled={isUploading || !csvData || csvData.length === 0}
          color="green"
          size="md"
          className="sm:w-auto w-full mt-2 sm:mt-0 whitespace-nowrap"
        >
          {isUploading ? 'Uploading…' : 'Upload File'}
        </Button>
      </div>
      {csvData && csvData.length > 0 && (
        <div className="mt-4">
          <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
            {csvData.length} items ready to upload
          </p>
          <div
            className={`mt-2 p-2 rounded max-h-40 overflow-y-auto text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
          >
            <p className="font-medium mb-1">File Preview:</p>            <ul className="list-disc pl-5">
              {csvData.slice(0, 5).map((item, index) => (
                <li key={index}>
                  {item.name || item.Name || Object.values(item)[0] || 'Unnamed item'}
                  {item.unitNumber && <span className="ml-2 text-gray-500">Unit: {item.unitNumber}</span>}
                </li>
              ))}
              {csvData.length > 5 && <li>...and {csvData.length - 5} more items</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(BulkUploadSection);
