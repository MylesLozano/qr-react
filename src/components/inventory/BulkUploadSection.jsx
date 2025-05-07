import React from 'react';
import Papa from 'papaparse';
import Button from '../Button';
import { toast } from 'react-toastify';

function BulkUploadSection({ setCsvData, csvData, bulkUpload, isUploading, isDarkMode }) {
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
    <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className="text-xl font-semibold mb-4">Bulk Upload</h2>
      <div className="flex items-center gap-4">
        <label htmlFor="csvUpload" className="sr-only">Upload CSV</label>
        <input
          type="file"
          accept=".csv"
          onChange={handleCsvUpload}
          className={`
            block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100
            ${isDarkMode ? 'file:bg-blue-900 file:text-white hover:file:bg-blue-800' : ''}
          `}
        />
        <Button
          onClick={bulkUpload}
          disabled={isUploading || csvData.length === 0}
          color="green"
          size="md"
          className="inline-flex items-center justify-center"
        >
          {isUploading ? 'Uploading…' : 'Upload CSV'}
        </Button>
      </div>
      {csvData.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          {csvData.length} items ready to upload
        </p>
      )}
    </div>
  );
}

export default React.memo(BulkUploadSection);