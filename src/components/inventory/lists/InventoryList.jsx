import { useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from "../../../hooks/useAuth";
import Button from '../../Button';
import LoadingSpinner from '../../LoadingSpinner';
import { canPerformAction } from '../../../utils/roleUtils';

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
    if (!item) return null;

    return (
      <div style={style} className="px-2">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'} mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors duration-200`}>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{item.name}</h3>
            <div className="space-y-1 text-sm">
              <p className="flex items-center gap-2">
                <span className="text-opacity-75">Brand:</span>
                <span>{item.brand || 'N/A'}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-opacity-75">Serial:</span>
                <span>{item.serialNumber || 'N/A'}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="text-opacity-75">Category:</span>
                <span>{item.category}</span>
              </p>
              {item.lab && (
                <p className="flex items-center gap-2">
                  <span className="text-opacity-75">Lab:</span>
                  <span>{item.lab}</span>
                </p>
              )}
              {item.itemCondition && (
                <p className="flex items-center gap-2">
                  <span className="text-opacity-75">Condition:</span>
                  <span>{item.itemCondition}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-start sm:items-end gap-2 mt-2 sm:mt-0">
            <span className={`font-semibold ${stockStatusColor(item.quantity)}`}>
              Qty: {item.quantity}
            </span>
            {(canEdit || canDelete || canGenerateQr) && (
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button
                    onClick={() => onEdit(item)}
                    color="blue"
                    size="sm"
                    className="min-w-[60px]"
                  >
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button
                    onClick={() => onDelete(item.id, item.name)}
                    color="red"
                    size="sm"
                    className="min-w-[60px]"
                  >
                    Delete
                  </Button>
                )}
                {canGenerateQr && (
                  <Button
                    onClick={() => onPreviewQr(item)}
                    color="green"
                    size="sm"
                    className="min-w-[60px]"
                  >
                    QR
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }, [items, isDarkMode, canEdit, canDelete, canGenerateQr, onEdit, onDelete, onPreviewQr]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg ${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
        <p className="text-lg">No inventory items found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-[400px] h-[calc(100vh-20rem)]">
      <AutoSizer>
        {({ height, width }) => (
          <List
            height={height}
            itemCount={items.length}
            itemSize={180}
            width={width}
            overscanCount={3}
            className={`scrollbar-thin ${isDarkMode ? 'scrollbar-track-gray-800 scrollbar-thumb-gray-600' : 'scrollbar-track-gray-200 scrollbar-thumb-gray-400'}`}
          >
            {Row}
          </List>
        )}
      </AutoSizer>
    </div>
  );
}

export default InventoryList;