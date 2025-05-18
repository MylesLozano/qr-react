import React from 'react';
import PropTypes from 'prop-types';

function CategoryList({
  categoryGroups = {},
  toggleCategory,
  isDarkMode,
  selectedCategory = null,
  isHorizontal = false,
}) {
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
      className={`w-full p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md ${isHorizontal ? 'overflow-x-auto' : 'h-full'}`}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold whitespace-nowrap mr-4" role="heading" aria-level="2">
          Categories
        </h2>
        {selectedCategory && (
          <button
            onClick={() => toggleCategory(null)}
            className={`text-sm px-2 py-1 rounded whitespace-nowrap ${
              isDarkMode ? 'text-blue-300 hover:bg-gray-700' : 'text-blue-600 hover:bg-gray-100'
            }`}
            aria-label="Show all categories"
          >
            Show All
          </button>
        )}
      </div>
      <div className={isHorizontal ? 'flex space-x-4 pb-2' : 'grid grid-cols-1 gap-4'}>
        {categoryEntries.map(([category, { items = [], totalQuantity = 0 }]) => (
          <div
            key={category}
            onClick={() => toggleCategory(category)}
            className={`${isHorizontal ? 'min-w-[200px] flex-shrink-0' : ''} p-4 rounded-lg cursor-pointer transition-colors
              ${
                selectedCategory === category
                  ? isDarkMode
                    ? 'bg-blue-800 hover:bg-blue-700'
                    : 'bg-blue-100 hover:bg-blue-200'
                  : isDarkMode
                    ? 'bg-gray-700 hover:bg-gray-600'
                    : 'bg-gray-50 hover:bg-gray-100'
              }`}
            role="button"
            aria-label={`Select ${category} category`}
            aria-pressed={selectedCategory === category}
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
  selectedCategory: PropTypes.string,
  isHorizontal: PropTypes.bool,
};

export default React.memo(CategoryList);
