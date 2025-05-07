import React, { useMemo } from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../Button';
import InventoryList from './InventoryList';
import LoadingSpinner from '../LoadingSpinner';

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

  // Validate category
  if (!category) {
    console.error("CategoryDetails: No category provided");
    return null;
  }

  // Validate items array
  if (!Array.isArray(items)) {
    console.error("CategoryDetails received invalid items:", items);
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`p-6 rounded-lg ${currentIsDarkMode ? 'bg-red-900/50 text-red-200' : 'bg-red-100 text-red-700'}`}>
          <p>Error: Invalid items data</p>
          <Button onClick={onClose} color="gray" className="mt-4">Close</Button>
        </div>
      </div>
    );
  }

  // Filter and memoize category items with error handling
  const categoryItems = useMemo(() => {
    try {
      return items.filter(item => {
        if (!item || typeof item !== 'object') {
          console.warn("Invalid item in category items:", item);
          return false;
        }
        return item.category === category;
      });
    } catch (error) {
      console.error("Error filtering category items:", error);
      return [];
    }
  }, [items, category]);

  // Calculate total quantity with error handling
  const totalQuantity = useMemo(() => {
    try {
      return categoryItems.reduce((sum, item) => {
        const quantity = Number(item?.quantity);
        return sum + (isNaN(quantity) ? 0 : quantity);
      }, 0);
    } catch (error) {
      console.error("Error calculating total quantity:", error);
      return 0;
    }
  }, [categoryItems]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-xl 
        ${currentIsDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold" role="heading" aria-level="2">{category}</h2>
            <p className={`text-sm ${currentIsDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {categoryItems.length} {categoryItems.length === 1 ? 'item' : 'items'} •
              Total Quantity: {totalQuantity}
            </p>
          </div>
          <Button
            onClick={onClose}
            color="gray"
            size="sm"
            className="hover:bg-gray-700/50 rounded-lg"
            aria-label="Close category details"
          >
            ✕
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-hidden p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[200px]">
              <LoadingSpinner size="lg" />
            </div>
          ) : categoryItems.length > 0 ? (
            <div className="h-full overflow-y-auto">
              <InventoryList
                items={categoryItems}
                onEdit={onEdit}
                onDelete={onDelete}
                onPreviewQr={onPreviewQr}
                isLoading={false}
                role={role}
                isDarkMode={currentIsDarkMode}
              />
            </div>
          ) : (
            <div className={`flex items-center justify-center h-full min-h-[200px] rounded-lg 
              ${currentIsDarkMode ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              <p className="text-lg">No items found in this category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryDetails;