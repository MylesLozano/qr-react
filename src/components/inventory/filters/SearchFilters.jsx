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
  isDarkMode,
  isCompact = false,
}) {
  const [error, setError] = useState(null);

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

  // Wrap search handler with validation
  const handleValidatedSearch = (e) => {
    if (validateSearchInput(e.target.value)) {
      handleSearchChange(e);
    }
  };

  return (
    <div
      className={`w-full ${isCompact ? 'p-2' : 'p-4'} rounded-lg mb-4 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} shadow-md`}
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
          className={`flex-1 min-w-[200px] p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'} ${isCompact ? 'text-sm' : ''}`}
          aria-label={`Search by ${searchField}`}
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
          </option>
          <option
            className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}
            value="Mac Lab"
          >
            Mac Lab
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
  isDarkMode: PropTypes.bool,
  isCompact: PropTypes.bool,
};

export default React.memo(SearchFilters);
