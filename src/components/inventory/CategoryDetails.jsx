import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../Button';
import InventoryList from './InventoryList';

function CategoryDetails({
  category,
  items,
  onClose,
  onEdit,
  onDelete,
  onPreviewQr,
  isLoading,
  role,
  isDarkMode
}) {
  const { isDarkMode: componentDarkMode } = useTheme();

  const currentIsDarkMode = isDarkMode !== undefined ? isDarkMode : componentDarkMode;

  if (!category) return null;

  // Filter the provided items to get only items for the selected category
  const categoryItems = useMemo(() => {
    if (!Array.isArray(items)) {
      console.error("CategoryDetails received non-array items:", items);
      return []; // Return empty array if items is not an array
    }
    return items.filter(item => item.category === category);
  }, [items, category]); // Re-filter only when items or category changes

  const totalQuantity = useMemo(() => {
    return categoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [categoryItems]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`p-6 rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col 
        ${currentIsDarkMode ? 'bg-gray-800' : 'bg-white'}`}> {/* Use flex-col and adjust max-h */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 flex-shrink-0"> {/* Add flex-shrink-0 */}
          <div>
            <h2 className={`text-2xl font-bold ${currentIsDarkMode ? 'text-white' : 'text-gray-900'}`}>{category}</h2>
            <p className={`text-sm ${currentIsDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'} •
              Total Quantity: {totalQuantity}
            </p>
          </div>
          <Button
            onClick={onClose}
            color="red"
            size="md"
          >
            Close
          </Button>
        </div>

        {/* Render InventoryList with filtered category items */}
        <div className="flex-grow overflow-hidden"> {/* flex-grow and overflow-hidden to make list fill available space */}
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingSpinner size="md" />
            </div>
          ) : categoryItems.length > 0 ? (
            <InventoryList
              items={categoryItems}
              onEdit={onEdit}
              onDelete={onDelete}
              onPreviewQr={onPreviewQr}
              isLoading={isLoading}
              role={role}
              isDarkMode={currentIsDarkMode}
            />
          ) : (
            <div className={`text-center p-8 rounded-lg ${currentIsDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              <p>No items found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryDetails;