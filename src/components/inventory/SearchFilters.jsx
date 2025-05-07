import React, { useState } from 'react';

function SearchFilters({ 
  searchField, 
  setSearchField, 
  handleSearchChange, 
  filterCondition, 
  setFilterCondition, 
  filterLab, 
  setFilterLab, 
  isDarkMode 
}) {
  const [error, setError] = useState(null);

  // Add input validation
  const validateSearchInput = (value) => {
    if (value && value.length > 100) {
      setError("Search input is too long");
      return false;
    }
    if (value && /[<>]/.test(value)) {
      setError("Invalid characters in search");
      return false;
    }
    setError(null);
    return true;
  };

  // Wrap search handler with validation
  const handleValidatedSearch = (e) => {
    if (validateSearchInput(e.target.value)) {
      handleSearchChange(e);
    }
  };

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      {error && (
        <div className={`w-full p-2 rounded text-sm ${
          isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
        }`} role="alert">
          {error}
        </div>
      )}

      <select
        value={searchField}
        onChange={(e) => setSearchField(e.target.value)}
        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
        aria-label="Search field"
      >
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="name">Name</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="serialNumber">Serial Number</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="brand">Brand</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="category">Category</option>
      </select>

      <input
        type="text"
        placeholder={`Search by ${searchField}...`}
        onChange={handleValidatedSearch}
        className={`flex-1 min-w-[200px] p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
        aria-label={`Search by ${searchField}`}
      />

      <select
        value={filterCondition}
        onChange={(e) => setFilterCondition(e.target.value)}
        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
        aria-label="Filter by condition"
      >
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="">All Conditions</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="New">New</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="Used">Used</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="Damaged">Damaged</option>
      </select>

      <select
        value={filterLab}
        onChange={(e) => setFilterLab(e.target.value)}
        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'}`}
        aria-label="Filter by lab"
      >
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="">All Labs</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="Mac Lab">Mac Lab</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="EMC Lab">EMC Lab</option>
        <option className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'} value="Others">Others</option>
      </select>
    </div>
  );
}

export default React.memo(SearchFilters);