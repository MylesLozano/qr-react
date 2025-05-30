import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useTheme } from '../../../hooks/useTheme';
import LoadingSpinner from '../../LoadingSpinner';
import Button from '../../Button';
import { toast } from 'react-toastify';

/**
 * ItemDetails component - Displays detailed information about a specific inventory item
 * Used primarily when navigating from QR code scans
 *  
 * @component
 * @returns {JSX.Element} The rendered ItemDetails component
 */
function ItemDetails() {
  const { itemId } = useParams();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch item details on component mount
  useEffect(() => {
    async function fetchItem() {
      if (!itemId) {
        setError('No item ID provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const itemRef = doc(db, 'inventory', itemId);
        const itemSnap = await getDoc(itemRef);
        
        if (itemSnap.exists()) {
          setItem({
            id: itemSnap.id,
            ...itemSnap.data()
          });
        } else {
          setError(`Item with ID ${itemId} not found`);
          toast.error(`Item not found: ${itemId}`);
        }
      } catch (err) {
        console.error('Error fetching item:', err);
        setError(`Error fetching item details: ${err.message}`);
        toast.error('Failed to load item details');
      } finally {
        setLoading(false);
      }
    }

    fetchItem();
  }, [itemId]);

  // Handler to navigate back
  const handleBack = () => {
    navigate(-1);
  };

  // Navigate to full inventory
  const viewInventory = () => {
    // Use the appropriate inventory route based on user role
    // Currently redirecting to the standard inventory view
    navigate('/admin-dashboard/inventory');
  };

  // Handle item request
  const handleRequestItem = () => {
    // Make sure we have an item
    if (!item || !item.id) {
      toast.error("Cannot request item: Item information is incomplete");
      return;
    }
    
    // Check if item is available to request based on quantity
    if (item.quantity <= 0) {
      toast.warning("This item is currently out of stock");
      return;
    }
    
    // Navigate to requests form with item pre-selected
    navigate(`/my-requests?itemId=${item.id}&itemName=${encodeURIComponent(item.name)}`);
    
    // Show confirmation message
    toast.info("Redirecting to request form...");
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-4 text-red-500">Error</h2>
        <p className="mb-6">{error}</p>
        <div className="flex gap-4">
          <Button onClick={handleBack} color="gray">
            Go Back
          </Button>
          <Button onClick={viewInventory} color="blue">
            View Inventory
          </Button>
        </div>
      </div>
    );
  }

  // Show item details
  if (!item) {
    return (
      <div className={`p-8 rounded-lg shadow-lg max-w-4xl mx-auto my-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
        <h2 className="text-2xl font-bold mb-4">Item Not Found</h2>
        <p className="mb-6">The requested item could not be found.</p>
        <div className="flex gap-4">
          <Button onClick={handleBack} color="gray">
            Go Back
          </Button>
          <Button onClick={viewInventory} color="blue">
            View Inventory
          </Button>
        </div>
      </div>
    );
  }

  // Format date if available
  const formatDate = (date) => {
    if (!date) return 'Not available';
    if (date.toDate) {
      // Handle Firestore timestamp
      return date.toDate().toLocaleDateString();
    } 
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return date;
  };

  // Determine condition class
  const getConditionClass = (condition) => {
    switch (condition?.toLowerCase()) {
      case 'good':
        return 'text-green-500';
      case 'used':
        return 'text-yellow-500';
      case 'damaged':
        return 'text-red-500';
      default:
        return '';
    }
  };

  // Determine quantity status class
  const getQuantityClass = (qty) => {
    if (qty <= 0) return 'text-red-500';
    if (qty <= 5) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className={`p-8 max-w-4xl mx-auto my-8 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Item Details</h1>
        <Button onClick={handleBack} color="gray">
          Back
        </Button>
      </div>

      <div className={`p-8 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        {/* Main item information */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">{item.name}</h2>
          {item.unitNumber && (
            <p className="text-xl mb-2">
              <span className="font-medium">Unit Number:</span> <span className="font-bold text-blue-500">{item.unitNumber}</span>
            </p>
          )}
          {item.category && (
            <p className="text-lg">
              <span className="font-medium">Category:</span> {item.category}
            </p>
          )}
        </div>

        {/* Item details in a grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Basic Information</h3>
            <div className="space-y-3">
              {item.brand && (
                <div className="flex justify-between">
                  <span className="font-medium">Brand:</span>
                  <span>{item.brand}</span>
                </div>
              )}
              {item.serialNumber && (
                <div className="flex justify-between">
                  <span className="font-medium">Serial Number:</span>
                  <span>{item.serialNumber}</span>
                </div>
              )}
              {item.dateAcquired && (
                <div className="flex justify-between">
                  <span className="font-medium">Date Acquired:</span>
                  <span>{formatDate(item.dateAcquired)}</span>
                </div>
              )}
              {item.lab && (
                <div className="flex justify-between">
                  <span className="font-medium">Lab:</span>
                  <span>{item.lab}</span>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Status Information</h3>
            <div className="space-y-3">
              {item.itemCondition && (
                <div className="flex justify-between">
                  <span className="font-medium">Condition:</span>
                  <span className={getConditionClass(item.itemCondition)}>{item.itemCondition}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-medium">Quantity:</span>
                <span className={getQuantityClass(item.quantity)}>{item.quantity}</span>
              </div>
              {item.status && (
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span>{item.status}</span>
                </div>
              )}
              {item.updatedAt && (
                <div className="flex justify-between">
                  <span className="font-medium">Last Updated:</span>
                  <span>{formatDate(item.updatedAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Additional notes */}
        {item.remarks && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">Additional Notes</h3>
            <p className="whitespace-pre-line">{item.remarks}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-4 mt-8">
          <Button onClick={viewInventory} color="blue">
            View All Inventory
          </Button>
          <Button onClick={() => navigate('/scan-qr')} color="green">
            Scan Another QR Code
          </Button>
          <Button 
            onClick={handleRequestItem} 
            color="purple"
            disabled={item.quantity <= 0}
            title={item.quantity <= 0 ? "Item out of stock" : "Request this item"}
          >
            Request This Item {item.quantity <= 0 && "(Out of Stock)"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ItemDetails;
