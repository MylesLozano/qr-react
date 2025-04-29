import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const InventoryCategories = () => {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        parentCategory: ''
    });
    const { isDarkMode } = useTheme();

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'inventoryCategories'), orderBy('name'));
            const snapshot = await getDocs(q);
            const fetchedCategories = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setCategories(fetchedCategories);
        } catch (error) {
            console.error('Error fetching categories:', error);
            toast.error('Failed to fetch categories');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
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
            fetchCategories();
        } catch (error) {
            console.error('Error saving category:', error);
            toast.error('Failed to save category');
        }
    };

    const handleDelete = async (categoryId) => {
        if (!window.confirm('Are you sure you want to delete this category?')) return;

        try {
            await deleteDoc(doc(db, 'inventoryCategories', categoryId));
            toast.success('Category deleted successfully');
            fetchCategories();
        } catch (error) {
            console.error('Error deleting category:', error);
            toast.error('Failed to delete category');
        }
    };

    const handleEdit = (category) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            description: category.description || '',
            parentCategory: category.parentCategory || ''
        });
    };

    return (
        <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Inventory Categories</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Form */}
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <h2 className="text-xl font-semibold mb-4">
                        {editingCategory ? 'Edit Category' : 'Add New Category'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Category Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                required
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Description</label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                                rows="3"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Parent Category</label>
                            <select
                                value={formData.parentCategory}
                                onChange={(e) => setFormData({ ...formData, parentCategory: e.target.value })}
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                            >
                                <option value="">None</option>
                                {categories.map(category => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white`}
                            >
                                {editingCategory ? 'Update' : 'Add'} Category
                            </button>
                            {editingCategory && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingCategory(null);
                                        setFormData({ name: '', description: '', parentCategory: '' });
                                    }}
                                    className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'
                                        } text-white`}
                                >
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                {/* Categories List */}
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <h2 className="text-xl font-semibold mb-4">Categories</h2>
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="space-y-4">
                            {categories.map(category => (
                                <div
                                    key={category.id}
                                    className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
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
                                                className={`p-1 rounded ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                                                    }`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className={`p-1 rounded ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'
                                                    }`}
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
        </div>
    );
};

export default InventoryCategories; 