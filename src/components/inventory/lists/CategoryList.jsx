import React from 'react';
import PropTypes from 'prop-types';

function CategoryList({ categoryGroups = {}, toggleCategory, isDarkMode }) {
  // Validate inputs
  if (!categoryGroups || typeof categoryGroups !== 'object') {
    console.error('CategoryList: Invalid categoryGroups prop', categoryGroups);
    return (
      <div className={`w-full p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <h2 className="text-xl font-semibold mb-4">Categories</h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No categories available
        </p>
      </div>
    );
  }

  const categoryEntries = Object.entries(categoryGroups);

  if (categoryEntries.length === 0) {
    return (
      <div className={`w-full p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md`}>
        <h2 className="text-xl font-semibold mb-4">Categories</h2>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          No categories found
        </p>
      </div>
    );
  }

  return (
    <div
      className={`w-full p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md h-full`}
    >
      <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
        Categories
      </h2>
      <div className="grid grid-cols-1 gap-4">
        {categoryEntries.map(([category, { items = [], totalQuantity = 0 }]) => (
          <div
            key={category}
            onClick={() => toggleCategory(category)}
            className={`p-4 rounded-lg cursor-pointer transition-colors
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}
            role="button"
            aria-label={`Select ${category} category`}
          >
            <h3 className="font-semibold">{category}</h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {items.length} {items.length === 1 ? 'item' : 'items'} • Total Quantity:{' '}
              {totalQuantity}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

CategoryList.propTypes = {
  categoryGroups: PropTypes.objectOf(
    PropTypes.shape({
      items: PropTypes.array,
      totalQuantity: PropTypes.number,
    })
  ),
  toggleCategory: PropTypes.func.isRequired,
  isDarkMode: PropTypes.bool,
};

export default React.memo(CategoryList);
