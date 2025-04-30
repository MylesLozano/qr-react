import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';

/**
 * InventoryCategories component - Manages inventory categories for admin users
 * @component
 * @returns {JSX.Element} The rendered InventoryCategories component
 */
const InventoryCategories = () => {
    const { isDarkMode } = useTheme();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentCategory: ''
    });
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Memoize category options for parent category select
    const categoryOptions = useMemo(() => [
        { value: '', label: 'None' },
        ...categories.map(category => ({
            value: category.id,
            label: category.name
        }))
    ], [categories]);

    // Fetch categories with real-time updates
    useEffect(() => {
        setLoading(true);
        const q = query(collection(db, 'inventoryCategories'), orderBy('name'));

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const fetchedCategories = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setCategories(fetchedCategories);
                setLoading(false);
            },
            (error) => {
                console.error('Error fetching categories:', error);
                toast.error('Failed to fetch categories');
                setError(error.message);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Validate form data
    const validateForm = useCallback(() => {
        if (!formData.name.trim()) {
            toast.error('Category name is required');
            return false;
        }
        if (formData.name.length > 50) {
            toast.error('Category name must be less than 50 characters');
            return false;
        }
        if (editingCategory && editingCategory.id === formData.parentCategory) {
            toast.error('A category cannot be its own parent');
            return false;
        }
        if (formData.description.length > 200) {
            toast.error('Description must be less than 200 characters');
            return false;
        }
        return true;
    }, [formData]);

    // Handle form submission
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        try {
            if (editingCategory) {
                await updateDoc(doc(db, 'inventoryCategories', editingCategory.id), formData);
                toast.success('Category updated successfully');
            } else {
                await addDoc(collection(db, 'inventoryCategories'), {
                    ...formData,
                    createdAt: new Date()
                });
                toast.success('Category created successfully');
            }
            setFormData({ name: '', description: '', parentCategory: '' });
            setEditingCategory(null);
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error('Failed to save category');
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    }, [formData, editingCategory, validateForm]);

    // Handle category deletion
    const handleDelete = useCallback(async (categoryId) => {
        if (!window.confirm('Are you sure you want to delete this category? This action cannot be undone.')) return;

        try {
            await deleteDoc(doc(db, 'inventoryCategories', categoryId));
            toast.success('Category deleted successfully');
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category');
            setError(error.message);
        }
    }, []);

    // Handle category edit
    const handleEdit = useCallback((category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            parentCategory: category.parentCategory || ''
        });
    }, []);

    // Handle form reset
    const handleReset = useCallback(() => {
        setEditingCategory(null);
        setFormData({ name: '', description: '', parentCategory: '' });
    }, []);

    return (
        <ErrorBoundary>
            <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold" role="heading" aria-level="1">Inventory Categories</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Category Form */}
                    <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
                            {editingCategory ? 'Edit Category' : 'Add New Category'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="categoryName" className="block text-sm font-medium mb-1">
                                    Category Name
                                </label>
                                <input
                                    id="categoryName"
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    maxLength={50}
                                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                    aria-label="Category name"
                                />
                            </div>
                            <div>
                                <label htmlFor="categoryDescription" className="block text-sm font-medium mb-1">
                                    Description
                                </label>
                                <textarea
                                    id="categoryDescription"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    maxLength={200}
                                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                    rows="3"
                                    aria-label="Category description"
                                />
                            </div>
                            <div>
                                <label htmlFor="parentCategory" className="block text-sm font-medium mb-1">
                                    Parent Category
                                </label>
                                <select
                                    id="parentCategory"
                                    value={formData.parentCategory}
                                    onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                    aria-label="Parent category"
                                >
                                    {categoryOptions.map(option => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                        } text-white ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    aria-label={editingCategory ? 'Update category' : 'Add category'}
                                >
                                    {isSubmitting ? <LoadingSpinner size="small" /> : (editingCategory ? 'Update' : 'Add')} Category
                                </button>
                                {editingCategory && (
                                    <button
                                        type="button"
                                        onClick={handleReset}
                                        className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'
                                            } text-white`}
                                        aria-label="Cancel editing"
                                    >
                                        Cancel
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    {/* Categories List */}
                    <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Categories</h2>
                        {loading ? (
                            <LoadingSpinner />
                        ) : (
                            <div className="space-y-4">
                                {categories.map(category => (
                                    <div
                                        key={category.id}
                                        className={`p-4 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-medium">{category.name}</h3>
                                                {category.description && (
                                                    <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                                        }`}>
                                                        {category.description}
                                                    </p>
                                                )}
                                                {category.parentCategory && (
                                                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                        }`}>
                                                        Parent: {categories.find(c => c.id === category.parentCategory)?.name}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleEdit(category)}
                                                    className={`p-1 rounded transition-colors duration-200 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                                                        }`}
                                                    aria-label={`Edit ${category.name}`}
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(category.id)}
                                                    className={`p-1 rounded transition-colors duration-200 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'
                                                        }`}
                                                    aria-label={`Delete ${category.name}`}
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="mt-4 p-4 rounded-lg bg-red-100 text-red-700">
                        <p>Error: {error}</p>
                    </div>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default InventoryCategories; 