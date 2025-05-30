import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useTheme } from '../../../hooks/useTheme';
import { useAuth } from '../../../hooks/useAuth';
import { canPerformInspection } from '../../../utils/roleUtils';
import LoadingSpinner from '../../LoadingSpinner';
import Button from '../../Button';
import InspectionForm from './InspectionForm';
import InspectionHistory from './InspectionHistory';
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
  const { role } = useAuth();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInspectionForm, setShowInspectionForm] = useState(false);
  const [showInspectionHistory, setShowInspectionHistory] = useState(false);
  const canInspect = canPerformInspection(role);

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
      toast.error('Cannot request item: Item information is incomplete');
      return;
    }
    
    // Check if item is available to request based on quantity
    if (item.quantity <= 0) {
      toast.warning('This item is currently out of stock');
      return;
    }
    
    // Navigate to requests form with item pre-selected
    navigate(`/my-requests?itemId=${item.id}&itemName=${encodeURIComponent(item.name)}`);
    
    // Show confirmation message
    toast.info('Redirecting to request form...');
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
        )}        {/* Actions */}
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
            title={item.quantity <= 0 ? 'Item out of stock' : 'Request this item'}
          >
            Request This Item {item.quantity <= 0 && '(Out of Stock)'}
          </Button>          {canInspect && (
            <Button
              onClick={() => setShowInspectionForm(!showInspectionForm)}
              color="orange"
              title="Perform item inspection and file a report"
              className="transition-colors duration-200 flex items-center gap-1"
            >
              {showInspectionForm ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                  Hide Inspection Form
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Perform Inspection
                </>
              )}
            </Button>
          )}
        </div>
          {/* Inspection Form for Admins and Superadmins */}
        {canInspect && showInspectionForm && (
          <InspectionForm 
            item={item} 
            isDarkMode={isDarkMode} 
            onCancel={() => setShowInspectionForm(false)}
          />
        )}
          {/* Button to toggle inspection history */}
        {canInspect && (
          <div className="mt-6 mb-2">
            <Button
              onClick={() => setShowInspectionHistory(!showInspectionHistory)}
              color={showInspectionHistory ? 'blue' : 'gray'}
              size="md"
              className={`flex items-center py-2 px-3 shadow-sm transition-all duration-200 ${
                isDarkMode 
                  ? showInspectionHistory ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600' 
                  : showInspectionHistory ? 'bg-blue-500' : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`mr-2 h-5 w-5 transition-all duration-200 ${showInspectionHistory ? 'text-white' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {showInspectionHistory ? 'Hide' : 'Show'} Inspection History
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`ml-2 h-5 w-5 transition-transform duration-200 ${showInspectionHistory ? 'rotate-180' : ''}`}
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Button>
          </div>
        )}
        
        {/* Show inspection history for admins and superadmins */}
        {canInspect && showInspectionHistory && (
          <InspectionHistory itemId={item.id} isDarkMode={isDarkMode} />
        )}
      </div>
    </div>
  );
}

export default ItemDetails;
