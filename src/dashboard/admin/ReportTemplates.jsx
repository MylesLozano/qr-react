import React, { useState, useEffect } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const ReportTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        fields: [],
        format: 'pdf'
    });
    const [newField, setNewField] = useState({
        name: '',
        type: 'text',
        required: false
    });
    const { isDarkMode } = useTheme();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const q = query(collection(db, 'reportTemplates'), orderBy('name'));
            const snapshot = await getDocs(q);
            const fetchedTemplates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTemplates(fetchedTemplates);
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to fetch templates');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTemplate) {
                await updateDoc(doc(db, 'reportTemplates', editingTemplate.id), formData);
                toast.success('Template updated successfully');
            } else {
                await addDoc(collection(db, 'reportTemplates'), {
                    ...formData,
                    createdAt: new Date()
                });
                toast.success('Template created successfully');
            }
            setFormData({ name: '', description: '', fields: [], format: 'pdf' });
            setEditingTemplate(null);
            fetchTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            toast.error('Failed to save template');
        }
    };

    const handleDelete = async (templateId) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;

        try {
            await deleteDoc(doc(db, 'reportTemplates', templateId));
            toast.success('Template deleted successfully');
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            toast.error('Failed to delete template');
        }
    };

    const handleEdit = (template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            description: template.description || '',
            fields: template.fields || [],
            format: template.format || 'pdf'
        });
    };

    const addField = () => {
        if (!newField.name) return;
        setFormData({
            ...formData,
            fields: [...formData.fields, { ...newField }]
        });
        setNewField({ name: '', type: 'text', required: false });
    };

    const removeField = (index) => {
        const updatedFields = [...formData.fields];
        updatedFields.splice(index, 1);
        setFormData({ ...formData, fields: updatedFields });
    };

    return (
        <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Report Templates</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Form */}
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <h2 className="text-xl font-semibold mb-4">
                        {editingTemplate ? 'Edit Template' : 'Add New Template'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Template Name</label>
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
                            <label className="block text-sm font-medium mb-1">Output Format</label>
                            <select
                                value={formData.format}
                                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                    }`}
                            >
                                <option value="pdf">PDF</option>
                                <option value="csv">CSV</option>
                                <option value="excel">Excel</option>
                            </select>
                        </div>

                        {/* Fields Management */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium">Fields</h3>
                            <div className="space-y-2">
                                {formData.fields.map((field, index) => (
                                    <div
                                        key={index}
                                        className={`p-2 rounded border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                                            }`}
                                    >
                                        <div className="flex justify-between items-center">
                                            <span className="font-medium">{field.name}</span>
                                            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                {field.type} {field.required ? '(Required)' : ''}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => removeField(index)}
                                                className={`p-1 rounded ${isDarkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-500'
                                                    }`}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-medium">Add New Field</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        placeholder="Field Name"
                                        value={newField.name}
                                        onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                                        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                            }`}
                                    />
                                    <select
                                        value={newField.type}
                                        onChange={(e) => setNewField({ ...newField, type: e.target.value })}
                                        className={`p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                            }`}
                                    >
                                        <option value="text">Text</option>
                                        <option value="number">Number</option>
                                        <option value="date">Date</option>
                                        <option value="boolean">Boolean</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="required"
                                        checked={newField.required}
                                        onChange={(e) => setNewField({ ...newField, required: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label htmlFor="required" className="text-sm">Required Field</label>
                                </div>
                                <button
                                    type="button"
                                    onClick={addField}
                                    className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                        } text-white`}
                                >
                                    Add Field
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                type="submit"
                                className={`px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white`}
                            >
                                {editingTemplate ? 'Update' : 'Add'} Template
                            </button>
                            {editingTemplate && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setEditingTemplate(null);
                                        setFormData({ name: '', description: '', fields: [], format: 'pdf' });
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

                {/* Templates List */}
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                    }`}>
                    <h2 className="text-xl font-semibold mb-4">Templates</h2>
                    {loading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="space-y-4">
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    className={`p-4 rounded-lg border ${isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-white'
                                        }`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-medium">{template.name}</h3>
                                            {template.description && (
                                                <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                                    }`}>
                                                    {template.description}
                                                </p>
                                            )}
                                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                                }`}>
                                                Format: {template.format.toUpperCase()} | Fields: {template.fields?.length || 0}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(template)}
                                                className={`p-1 rounded ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                                                    }`}
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(template.id)}
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

export default ReportTemplates; 