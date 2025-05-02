import React from 'react';

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
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        value={searchField}
        onChange={(e) => setSearchField(e.target.value)}
        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
      >
        <option value="name">Name</option>
        <option value="serialNumber">Serial Number</option>
        <option value="brand">Brand</option>
        <option value="category">Category</option>
      </select>
      <input
        type="text"
        placeholder={`Search by ${searchField}...`}
        onChange={handleSearchChange}
        className={`flex-1 min-w-[200px] p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
      />
      <select
        value={filterCondition}
        onChange={(e) => setFilterCondition(e.target.value)}
        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
      >
        <option value="">All Conditions</option>
        <option value="New">New</option>
        <option value="Used">Used</option>
        <option value="Damaged">Damaged</option>
      </select>
      <select
        value={filterLab}
        onChange={(e) => setFilterLab(e.target.value)}
        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'}`}
      >
        <option value="">All Labs</option>
        <option value="Mac Lab">Mac Lab</option>
        <option value="EMC Lab">EMC Lab</option>
        <option value="Others">Others</option>
      </select>
    </div>
  );
}

export default React.memo(SearchFilters);