import React from 'react';

function CategoryList({ categoryGroups, toggleCategory, isDarkMode }) {
  return (
    <div className={`w-full lg:w-1/3 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className="text-xl font-semibold mb-4">Categories</h2>
      <div className="grid grid-cols-1 gap-4">
        {Object.entries(categoryGroups).map(([category, { items, totalQuantity }]) => (
          <div
            key={category}
            onClick={() => toggleCategory(category)}
            className={`p-4 rounded-lg cursor-pointer transition-colors 
              ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}
          >
            <h3 className="font-semibold">{category}</h3>
            <p className="text-sm text-gray-500">
              {items.length} items • Total Quantity: {totalQuantity}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(CategoryList);