import React from 'react';
import Papa from 'papaparse';
import Button from '../../Button';
import { toast } from 'react-toastify';

function BulkUploadSection({ setCsvData, csvData = [], bulkUpload, isUploading, isDarkMode }) {
  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      complete: (results) => {
        setCsvData(results.data);
        toast.success(`${results.data.length} items parsed from CSV`);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  return (
    <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
      <h2 className="text-xl font-semibold mb-4">Bulk Upload</h2>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        <div className="w-full">
          <label htmlFor="csvUpload" className="block mb-2 text-sm font-medium">
            Upload CSV File
          </label>
          <input
            id="csvUpload"
            type="file"
            accept=".csv"
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
        </div>
        <Button
          onClick={bulkUpload}
          disabled={isUploading || !csvData || csvData.length === 0}
          color="green"
          size="md"
          className="sm:w-auto w-full mt-2 sm:mt-0 whitespace-nowrap"
        >
          {isUploading ? 'Uploading…' : 'Upload CSV'}
        </Button>
      </div>
      {csvData && csvData.length > 0 && (
        <div className="mt-4">
          <p className={`text-sm ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
            {csvData.length} items ready to upload
          </p>
          <div className={`mt-2 p-2 rounded max-h-40 overflow-y-auto text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
            <p className="font-medium mb-1">CSV Preview:</p>
            <ul className="list-disc pl-5">
              {csvData.slice(0, 5).map((item, index) => (
                <li key={index}>
                  {item.name || item.Name || Object.values(item)[0] || 'Unnamed item'}
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