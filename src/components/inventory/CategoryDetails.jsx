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

  // Filter items for selected category
  const categoryItems = useMemo(() => {
    if (!Array.isArray(items)) {
      console.error("CategoryDetails received non-array items:", items);
      return [];
    }
    return items.filter(item => item.category === category);
  }, [items, category]);

  const totalQuantity = useMemo(() => {
    return categoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [categoryItems]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl shadow-xl 
        ${currentIsDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-900'}`}>
        {/* Header - Fixed */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700/50">
          <div>
            <h2 className="text-2xl font-bold">{category}</h2>
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