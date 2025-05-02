import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import Button from '../Button';

function CategoryDetails({ 
  category, 
  items, 
  onClose 
}) {
  const { isDarkMode } = useTheme();

  if (!category) return null;

  const categoryItems = items.filter(item => item.category === category);
  
  const totalQuantity = categoryItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  
  const getConditionColor = (condition) => {
    switch(condition) {
      case 'New': return 'text-green-500';
      case 'Used': return 'text-yellow-500';
      case 'Damaged': return 'text-red-500';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`p-6 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto 
        ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">{category}</h2>
            <p className="text-sm text-gray-500">
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
        
        {categoryItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categoryItems.map((item) => (
              <div 
                key={item.id} 
                className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              >
                <h3 className="font-semibold mb-2">{item.name}</h3>
                <p className="text-sm mb-1">Brand: {item.brand || 'N/A'}</p>
                <p className="text-sm mb-1">Serial: {item.serialNumber || 'N/A'}</p>
                <p className="text-sm mb-1">
                  Quantity: <span className="font-medium">{item.quantity}</span>
                </p>
                <p className="text-sm mb-1">
                  Condition: <span className={getConditionColor(item.itemCondition)}>{item.itemCondition}</span>
                </p>
                {item.lab && <p className="text-sm mb-1">Lab: {item.lab}</p>}
                {item.dateAcquired && <p className="text-sm mb-1">Date Acquired: {item.dateAcquired}</p>}
                {item.description && <p className="text-sm mb-1">Description: {item.description}</p>}
                {item.remarks && <p className="text-sm">Remarks: {item.remarks}</p>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-8">
            <p>No items found in this category.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryDetails;