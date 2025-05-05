import React, { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import Button from '../Button';
import { canPerformAction } from '../../utils/roleUtils';

function InventoryList({
  items,
  onEdit,
  onDelete,
  onPreviewQr,
  isLoading
}) {
  const { isDarkMode } = useTheme();
  const { role } = useAuth();

  // Permission checks
  const canEdit = canPerformAction(role, 'edit_inventory');
  const canDelete = canPerformAction(role, 'delete_inventory');
  const canGenerateQr = canPerformAction(role, 'generate_reports');

  const stockStatusColor = (qty) => {
    if (qty <= 0) return "text-red-500";
    if (qty <= 5) return "text-yellow-500";
    return "text-green-500";
  };

  // Memoize the row renderer to prevent unnecessary re-renders
  const Row = useCallback(({ index, style }) => {
    const item = items[index];
    if (!item) return null; // Defensive check just in case

    return (
      <div style={style} className="px-2">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} mb-2`}>
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{item.name}</h3>
              <p className="text-sm">Brand: {item.brand || 'N/A'}</p>
              <p className="text-sm">Serial: {item.serialNumber || 'N/A'}</p>
              <p className="text-sm">Category: {item.category}</p>
              {item.lab && <p className="text-sm">Lab: {item.lab}</p>}
              {item.itemCondition && <p className="text-sm">Condition: {item.itemCondition}</p>}
            </div>
            <div className="flex flex-col items-end">
              <span className={`font-semibold ${stockStatusColor(item.quantity)}`}>
                Qty: {item.quantity}
              </span>
              {(canEdit || canDelete || canGenerateQr) && (
                <div className="flex gap-2 mt-2">
                  {canEdit && (
                    <Button
                      onClick={() => onEdit(item)}
                      color="blue"
                      size="sm"
                    >
                      Edit
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      onClick={() => onDelete(item.id, item.name)}
                      color="red"
                      size="sm"
                    >
                      Delete
                    </Button>
                  )}
                  {canGenerateQr && (
                    <Button
                      onClick={() => onPreviewQr(item)}
                      color="green"
                      size="sm"
                    >
                      QR
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [items, isDarkMode, canEdit, canDelete, canGenerateQr, onEdit, onDelete, onPreviewQr]);

  // Add a check if items is an array before accessing length
  if (isLoading) {
     return <div className="text-center p-4">Loading inventory items...</div>;
  }

  if (!Array.isArray(items) || items.length === 0) { // <-- Corrected check here
    return (
      <div className={`p-4 text-center rounded-lg ${isDarkMode ? 'bg-gray-700' :
      'bg-gray-100'}`}>
        No inventory items found matching your criteria.
      </div>
    );
  }

  // If items is an array and not empty, render the list
  return (
    <div className="h-[600px] w-full">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={130}
            width={width}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

export default InventoryList;