// Importing core dependencies
/* eslint-disable no-unused-vars */
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
/* eslint-enable no-unused-vars */

import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Button from '../../components/Button';
import { useFirebaseCollection } from '../../hooks/useFirebaseCollection';
import { useValidatedForm } from '../../hooks/useFormWithValidation';
import { z } from 'zod';

/**
 * InventoryCategories component - Manages inventory categories for admin users
 * @component
 * @returns {JSX.Element} The rendered InventoryCategories component
 */
const InventoryCategories = () => {
  const { isDarkMode } = useTheme();
  const {
    data: categories,
    loading,
    error,
  } = useFirebaseCollection('inventoryCategories', [orderBy('name')]);
  const schema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name must be under 50 characters'),
    description: z.string().max(200, 'Description must be under 200 characters').optional(),
    parentCategory: z.string().optional(),
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useValidatedForm(schema, { name: '', description: '', parentCategory: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoize category options for parent category select
  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'None' },
      ...categories.map((category) => ({
        value: category.id,
        label: category.name,
      })),
    ],
    [categories]
  );

  const handleSubmitForm = async (data) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await updateDoc(doc(db, 'inventoryCategories', editingCategory.id), data);
        toast.success('Category updated successfully');
      } else {
        await addDoc(collection(db, 'inventoryCategories'), { ...data, createdAt: new Date() });
        toast.success('Category created successfully');
      }
      reset(); // Reset form after success
      setEditingCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error(`Failed to delete category: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle category deletion
  const handleDelete = useCallback(async (categoryId) => {
    if (
      !window.confirm(
        'Are you sure you want to delete this category? This action cannot be undone.'
      )
    )
      return;

    try {
      await deleteDoc(doc(db, 'inventoryCategories', categoryId));
      toast.success('Category deleted successfully');
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    }
  }, []);

  // Handle category edit
  const handleEdit = (category) => {
    setEditingCategory(category);
    reset(category); // Set form values to the category being edited
  };

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold" role="heading" aria-level="1">
            Inventory Categories
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category Form */}
          <div
            className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
          >
            <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
              {editingCategory ? 'Edit Category' : 'Add New Category'}
            </h2>
            <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-4">
              <div>
                <label htmlFor="categoryName" className="block text-sm font-medium mb-1">
                  Category Name
                </label>
                <input
                  id="categoryName"
                  type="text"
                  {...register('name')}
                  className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  aria-label="Category name"
                />
                {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}
              </div>
              <div>
                <label htmlFor="categoryDescription" className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  id="categoryDescription"
                  {...register('description')}
                  className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  rows="3"
                  aria-label="Category description"
                />
                {errors.description && (
                  <p className="text-red-500 text-sm">{errors.description.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="parentCategory" className="block text-sm font-medium mb-1">
                  Parent Category
                </label>
                <select
                  id="parentCategory"
                  {...register('parentCategory')}
                  className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                  aria-label="Parent category"
                >
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  aria-label={editingCategory ? 'Update category' : 'Add category'}
                >
                  {isSubmitting ? (
                    <LoadingSpinner size="small" />
                  ) : editingCategory ? (
                    'Update'
                  ) : (
                    'Add'
                  )}{' '}
                  Category
                </Button>
                {editingCategory && (
                  <Button
                    type="button"
                    onClick={() => {
                      reset();
                      setEditingCategory(null);
                    }}
                    className={`px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-700' : 'bg-gray-500 hover:bg-gray-600'} text-white`}
                    aria-label="Cancel editing"
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </div>

          {/* Categories List */}
          <div
            className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}
          >
            <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
              Categories
            </h2>
            {loading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <div className="space-y-4">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`p-4 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{category.name}</h3>
                        {category.description && (
                          <p
                            className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                          >
                            {category.description}
                          </p>
                        )}
                        {category.parentCategory && (
                          <p
                            className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                          >
                            Parent: {categories.find((c) => c.id === category.parentCategory)?.name}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleEdit(category)}
                          className={`p-1 rounded transition-colors duration-200 ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}
                          aria-label={`Edit ${category.name}`}
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDelete(category.id)}
                          className={`p-1 rounded transition-colors duration-200 ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'}`}
                          aria-label={`Delete ${category.name}`}
                        >
                          Delete
                        </Button>
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
