import React, { useState } from 'react';
import PropTypes from 'prop-types';

function SearchFilters({
  searchField,
  setSearchField,
  handleSearchChange,
  filterCondition,
  setFilterCondition,
  filterLab,
  setFilterLab,
  unitNumber, // New prop
  setUnitNumber, // New prop
  sortOrder, // New prop
  setSortOrder, // New prop
  isDarkMode,
  isCompact = false,
}) {
  const [error, setError] = useState(null);
  const [unitNumberError, setUnitNumberError] = useState(null);

  // Add input validation
  const validateSearchInput = (value) => {
    if (value && value.length > 100) {
      setError('Search input is too long');
      return false;
    }
    if (value && /[<>]/.test(value)) {
      setError('Invalid characters in search');
      return false;
    }
    setError(null);
    return true;
  };

  // Validate unit number input
  const validateUnitNumberInput = (value) => {
    if (value && value.length > 50) { // Max length for unit number
      setUnitNumberError('Unit number is too long');
      return false;
    }
    if (value && !/^[a-zA-Z0-9-]*$/.test(value)) { // Alphanumeric and hyphens
      setUnitNumberError('Invalid characters in unit number');
      return false;
    }
    setUnitNumberError(null);
    return true;
  };

  // Wrap search handler with validation
  const handleValidatedSearch = (e) => {
    if (validateSearchInput(e.target.value)) {
      handleSearchChange(e);
    }
  };

  const handleUnitNumberChange = (e) => {
    if (validateUnitNumberInput(e.target.value)) {
      setUnitNumber(e.target.value);
    } else {
      // Optionally clear the input or keep the invalid value for user correction
      // For now, we allow invalid input to remain for correction, error is shown
      setUnitNumber(e.target.value);
    }
  };

  return (
    <div
      className={`w-full ${isCompact ? 'p-2' : 'p-4'} rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-md relative z-0`}
    >
      {!isCompact && <h2 className="text-lg font-semibold mb-3">Search & Filters</h2>}

      {error && (
        <div
          className={`w-full p-2 mb-3 rounded text-sm ${
            isDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'
          }`}
          role="alert"
        >
          {error}
        </div>
      )}
      {unitNumberError && (
        <div
          className={`w-full p-2 mb-3 rounded text-sm ${
            isDarkMode ? 'bg-yellow-900/50 text-yellow-200' : 'bg-yellow-100 text-yellow-700'
          }`}
          role="alert"
        >
          {unitNumberError}
        </div>
      )}

      <div className={`flex flex-wrap ${isCompact ? 'gap-2' : 'gap-4'}`}>
        <select
          value={searchField}
          onChange={(e) => setSearchField(e.target.value)}
          className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} ${isCompact ? 'text-sm' : ''}`}
          aria-label="Search field"
        >
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="name"
          >
            Name
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="serialNumber"
          >
            Serial Number
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="brand"
          >
            Brand
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="category"
          >
            Category
          </option>
        </select>

        <input
          type="text"
          placeholder={`Search by ${searchField}...`}
          onChange={handleValidatedSearch}
          className={`flex-1 min-w-[150px] p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} ${isCompact ? 'text-sm' : ''}`}
          aria-label={`Search by ${searchField}`}
        />

        <input
          type="text"
          placeholder="Unit Number..."
          value={unitNumber}
          onChange={handleUnitNumberChange}
          className={`flex-1 min-w-[100px] p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} ${isCompact ? 'text-sm' : ''} ${unitNumberError ? (isDarkMode ? 'border-yellow-500' : 'border-yellow-400') : ''}`}
          aria-label="Filter by unit number"
        />

        <select
          value={filterCondition}
          onChange={(e) => setFilterCondition(e.target.value)}
          className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} ${isCompact ? 'text-sm' : ''}`}
          aria-label="Filter by condition"
        >
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value=""
          >
            All Conditions
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="New"
          >
            New
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="Used"
          >
            Used
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="Damaged"
          >
            Damaged
          </option>
        </select>

        <select
          value={filterLab}
          onChange={(e) => setFilterLab(e.target.value)}
          className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-black'} ${isCompact ? 'text-sm' : ''}`}
          aria-label="Filter by lab"
        >
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value=""
          >
            All Labs
          </option>          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="IT Lab"
          >
            IT Lab
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="EMC Lab"
          >
            EMC Lab
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="Others"
          >
            Others
          </option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-black'} ${isCompact ? 'text-sm' : ''}`}
          aria-label="Sort order"
        >
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="asc"
          >
            Ascending
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="desc"
          >
            Descending
          </option>
        </select>
      </div>
    </div>
  );
}

SearchFilters.propTypes = {
  searchField: PropTypes.string.isRequired,
  setSearchField: PropTypes.func.isRequired,
  handleSearchChange: PropTypes.func.isRequired,
  filterCondition: PropTypes.string.isRequired,
  setFilterCondition: PropTypes.func.isRequired,
  filterLab: PropTypes.string.isRequired,
  setFilterLab: PropTypes.func.isRequired,
  unitNumber: PropTypes.string.isRequired, // New prop
  setUnitNumber: PropTypes.func.isRequired, // New prop
  sortOrder: PropTypes.string.isRequired, // New prop
  setSortOrder: PropTypes.func.isRequired, // New prop
  isDarkMode: PropTypes.bool,
  isCompact: PropTypes.bool,
};

export default React.memo(SearchFilters);
