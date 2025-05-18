import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  addDoc,
  serverTimestamp,
  getCountFromServer,
} from 'firebase/firestore';
import { db, auth } from '../../firebase';
import usePageTitle from '../../hooks/usePageTitle';
import { toast } from 'react-toastify';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import EmptyState from '../../components/EmptyState';
import { format } from 'date-fns';
import Button from '../../components/Button';
import { useNavigate } from 'react-router-dom';

function MyRequests({ isInDashboard = false }) {
  usePageTitle('QCheckCITE - My Requests');
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();

  // State for component
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    itemName: '',
    quantity: 1,
    reason: '',
    usageLocation: '',
  });
  const [errors, setErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // State for dynamic counts
  const [approvedRequestsCount, setApprovedRequestsCount] = useState(0);
  const [totalRequestsCount, setTotalRequestsCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Memoize the current user
  const currentUser = useMemo(() => auth.currentUser, []);

  // Consolidated useEffect for fetching counts and requests
  useEffect(() => {
    const fetchRequestCounts = async () => {
      if (!currentUser) {
        setLoadingCounts(false);
        return;
      }

      try {
        // Total requests count
        const totalRequestsQuery = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid)
        );
        const totalCountSnapshot = await getCountFromServer(totalRequestsQuery);
        setTotalRequestsCount(totalCountSnapshot.data().count);

        // Approved requests count
        const approvedRequestsQuery = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'approved')
        );
        const approvedCountSnapshot = await getCountFromServer(approvedRequestsQuery);
        setApprovedRequestsCount(approvedCountSnapshot.data().count);

        // Pending requests count
        const pendingRequestsQuery = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid),
          where('status', '==', 'pending')
        );
        const pendingCountSnapshot = await getCountFromServer(pendingRequestsQuery);
        setPendingRequestsCount(pendingCountSnapshot.data().count);

        setLoadingCounts(false);
      } catch (error) {
        console.error('Error fetching request counts:', error);
        toast.error('Failed to fetch request counts');
        setLoadingCounts(false);
      }
    };

    let unsubscribeRequests = null;

    const fetchData = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const myRequestsQuery = query(
          collection(db, 'requests'),
          where('userId', '==', currentUser.uid)
        );

        // Fetch counts simultaneously
        fetchRequestCounts();

        unsubscribeRequests = onSnapshot(
          myRequestsQuery,
          (snapshot) => {
            const userRequests = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate(),
            }));
            setRequests(userRequests);
            setLoading(false);
          },
          (err) => {
            console.error('Error fetching data:', err);
            toast.error('Failed to fetch requests');
            setLoading(false);
          }
        );
      } catch (err) {
        console.error('Error in fetchData:', err);
        toast.error('Failed to fetch request data');
        setLoading(false);
      }
    };

    fetchData();

    // Return cleanup function
    return () => {
      if (typeof unsubscribeRequests === 'function') {
        unsubscribeRequests();
      }
    };
  }, [currentUser]);

  // Search inventory items
  const handleSearch = useCallback(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    const inventoryQuery = query(
      collection(db, 'inventory'),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff')
    );

    const unsubscribe = onSnapshot(
      inventoryQuery,
      (snapshot) => {
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
          category: doc.data().category,
          lab: doc.data().lab,
          quantity: doc.data().quantity,
        }));
        setSearchResults(results);
        if (results.length === 0) {
          toast.info('Item not found');
        }
      },
      (error) => {
        console.error('Error searching inventory:', error);
        toast.error('Failed to search inventory');
      }
    );

    return () => unsubscribe();
  }, [searchTerm]);

  // Pre-fill request form when an item is selected
  const handleSelectItem = (item) => {
    setSelectedItem(item);
    setFormData((prev) => ({
      ...prev,
      itemName: item.name,
      usageLocation: item.lab,
    }));
  };

  // Validate form data
  const validateForm = useCallback(() => {
    const newErrors = {};
    if (!formData.itemName.trim()) {
      newErrors.itemName = 'Item name is required';
    }
    if (formData.quantity < 1) {
      newErrors.quantity = 'Quantity must be at least 1';
    }
    if (!formData.reason.trim()) {
      newErrors.reason = 'Reason is required';
    }
    if (!formData.usageLocation.trim()) {
      newErrors.usageLocation = 'Usage location is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form input changes
  const handleInputChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: name === 'quantity' ? parseInt(value) || 0 : value,
      }));
      // Clear error when user types
      if (errors[name]) {
        setErrors((prev) => ({ ...prev, [name]: '' }));
      }
    },
    [errors]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      setSubmitting(true);
      try {
        await addDoc(collection(db, 'requests'), {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          ...formData,
          status: 'pending',
          createdAt: serverTimestamp(),
        });

        toast.success('Request submitted successfully!');
        setFormData({
          itemName: '',
          quantity: 1,
          reason: '',
          usageLocation: '',
        });
        setShowForm(false);
      } catch (error) {
        console.error('Error submitting request:', error);
        toast.error('Failed to submit request. Please try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [formData, currentUser, validateForm]
  );

  // Handle request deletion
  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('Are you sure you want to cancel this request?')) return;

    try {
      await deleteDoc(doc(db, 'requests', id));
      toast.success('Request cancelled successfully');
    } catch (error) {
      console.error('Error cancelling request:', error);
      toast.error('Failed to cancel request. Please try again.');
    }
  }, []);

  // Memoize status colors
  const statusColors = useMemo(
    () => ({
      approved: 'bg-green-500',
      rejected: 'bg-red-500',
      pending: 'bg-yellow-500',
    }),
    []
  );
  // Extract the EmptyRequestsOptions component to improve readability
  const EmptyRequestsOptions = () => (
    <EmptyState
      title="No Requests Found"
      message="You haven't made any requests yet. Create your first request to get started."
      icon="📋"
      actionFn={() => setShowForm(true)}
      actionLabel="Create New Request"
    />
  );

  return (
    <ErrorBoundary>
      <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
        {!isInDashboard && (
          <div className="mb-4">
            <Button
              onClick={() => navigate(-1)}
              color="gray"
              size="md"
              className="flex items-center"
              aria-label="Go back to the previous page"
            >
              <span className="mr-2">←</span> Back
            </Button>
          </div>
        )}

        <h1 className="text-2xl font-bold mb-6" role="heading" aria-level="1">
          My Requests
        </h1>

        <div className="mb-4 flex justify-between items-center">
          {!showForm && (
            <Button onClick={() => setShowForm(true)} color="blue">
              New Request
            </Button>
          )}
          {showForm && (
            <Button onClick={() => setShowForm(false)} color="gray">
              Cancel
            </Button>
          )}
          <div>
            <span className="font-semibold mr-2">Approved:</span>
            {loadingCounts ? <LoadingSpinner size="small" /> : approvedRequestsCount}
            <span className="font-semibold mx-2">Pending:</span>
            {loadingCounts ? <LoadingSpinner size="small" /> : pendingRequestsCount}
            <span className="font-semibold mx-2">Total:</span>
            {loadingCounts ? <LoadingSpinner size="small" /> : totalRequestsCount}
          </div>
        </div>

        {/* Request Form */}
        {showForm && (
          <div
            id="request-form"
            className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-6`}
          >
            <h2 className="text-xl font-semibold mb-4">Create Request</h2>

            {/* Search Inventory */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">Search for an item</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Search inventory..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`p-2 rounded border flex-grow ${
                    isDarkMode
                      ? 'bg-gray-700 border-gray-600 text-white'
                      : 'bg-white border-gray-300'
                  }`}
                />
                <Button onClick={handleSearch}>Search</Button>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Search Results</h3>
                  <div className="max-h-40 overflow-y-auto">
                    <ul>
                      {searchResults.map((item) => (
                        <li
                          key={item.id}
                          className={`p-2 rounded cursor-pointer mb-1 ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-100 hover:bg-gray-200'
                          }`}
                          onClick={() => handleSelectItem(item)}
                        >
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm">Category: {item.category}</p>
                          <p className="text-sm">Lab: {item.lab}</p>
                          <p className="text-sm">Available: {item.quantity}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="itemName" className="block text-sm font-medium mb-1">
                  Item Name
                </label>
                <input
                  id="itemName"
                  name="itemName"
                  type="text"
                  value={formData.itemName}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded border ${
                    errors.itemName ? 'border-red-500' : 'border-gray-300'
                  } ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}
                  aria-invalid={!!errors.itemName}
                  aria-describedby={errors.itemName ? 'itemName-error' : undefined}
                  disabled={!!selectedItem}
                />
                {errors.itemName && (
                  <p id="itemName-error" className="text-red-500 text-sm mt-1">
                    {errors.itemName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="quantity" className="block text-sm font-medium mb-1">
                  Quantity
                </label>
                <input
                  id="quantity"
                  name="quantity"
                  type="number"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="1"
                  className={`w-full px-3 py-2 rounded border ${
                    errors.quantity ? 'border-red-500' : 'border-gray-300'
                  } ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}
                  aria-invalid={!!errors.quantity}
                  aria-describedby={errors.quantity ? 'quantity-error' : undefined}
                />
                {errors.quantity && (
                  <p id="quantity-error" className="text-red-500 text-sm mt-1">
                    {errors.quantity}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="reason" className="block text-sm font-medium mb-1">
                  Reason
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded border ${
                    errors.reason ? 'border-red-500' : 'border-gray-300'
                  } ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}
                  aria-invalid={!!errors.reason}
                  aria-describedby={errors.reason ? 'reason-error' : undefined}
                />
                {errors.reason && (
                  <p id="reason-error" className="text-red-500 text-sm mt-1">
                    {errors.reason}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="usageLocation" className="block text-sm font-medium mb-1">
                  Usage Location
                </label>
                <input
                  id="usageLocation"
                  name="usageLocation"
                  type="text"
                  value={formData.usageLocation}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded border ${
                    errors.usageLocation ? 'border-red-500' : 'border-gray-300'
                  } ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}
                  aria-invalid={!!errors.usageLocation}
                  aria-describedby={errors.usageLocation ? 'usageLocation-error' : undefined}
                />
                {errors.usageLocation && (
                  <p id="usageLocation-error" className="text-red-500 text-sm mt-1">
                    {errors.usageLocation}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={submitting}
                  color="blue"
                  className={`${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label="Submit request"
                >
                  {submitting ? <LoadingSpinner size="small" /> : 'Submit Request'}
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} color="gray">
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Requests Table */}
        {!loading && requests.length === 0 ? (
          <EmptyRequestsOptions />
        ) : (
          <div
            className={`rounded-lg shadow-md p-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-6`}
          >
            <h2 className="text-xl font-semibold mb-4">My Requests</h2>
            <div className="overflow-x-auto">
              <table
                className={`min-w-full border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}
                role="table"
                aria-label="List of requests"
              >
                <thead>
                  <tr className={isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}>
                    <th className="p-2 border">Item</th>
                    <th className="p-2 border">Quantity</th>
                    <th className="p-2 border">Reason</th>
                    <th className="p-2 border">Usage Location</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Date</th>
                    <th className="p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className={`text-center ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}
                    >
                      <td className="p-2 border">{req.itemName}</td>
                      <td className="p-2 border">{req.quantity}</td>
                      <td className="p-2 border">{req.reason || 'N/A'}</td>
                      <td className="p-2 border">{req.usageLocation || 'N/A'}</td>
                      <td className="p-2 border">
                        <span
                          className={`px-2 py-1 rounded text-white ${statusColors[req.status] || 'bg-gray-500'}`}
                        >
                          {req.status || 'Pending'}
                        </span>
                      </td>
                      <td className="p-2 border">
                        {req.createdAt ? format(req.createdAt, 'MMM d, yyyy HH:mm') : 'N/A'}
                      </td>
                      <td className="p-2 border">
                        {req.status === 'pending' ? (
                          <Button
                            onClick={() => handleDelete(req.id)}
                            color="red"
                            size="sm"
                            aria-label={`Cancel request for ${req.itemName}`}
                          >
                            Cancel
                          </Button>
                        ) : (
                          <span className="text-gray-400">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

export default MyRequests;
