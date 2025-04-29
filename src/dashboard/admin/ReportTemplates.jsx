import React, { useState, useEffect, useMemo } from 'react';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, where, limit, serverTimestamp } from 'firebase/firestore';
import { db, logAudit } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../context/AuthContext';
import { canPerformAction } from '../../utils/roleUtils';
import ErrorBoundary from '../../components/ErrorBoundary';

const ReportTemplates = () => {
    const { user } = useAuth();
    const { isDarkMode } = useTheme();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        fields: [],
        outputFormat: 'pdf',
        filters: [],
        sorting: []
    });
    const [newField, setNewField] = useState({
        name: '',
        type: 'text',
        required: false
    });
    const [error, setError] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);

    // Check permissions
    const canManageTemplates = canPerformAction(user?.role, 'manage_templates');
    const canViewTemplates = canPerformAction(user?.role, 'view_templates');

    useEffect(() => {
        if (!canViewTemplates) {
            toast.error('You do not have permission to view templates');
            return;
        }
        fetchTemplates();
        fetchAuditLogs();
    }, [canViewTemplates]);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const templatesRef = collection(db, 'report_templates');
            const q = query(
                templatesRef,
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const templatesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTemplates(templatesData);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setError('Failed to fetch templates');
            toast.error('Failed to fetch templates');
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const logsRef = collection(db, 'audit_logs');
            const q = query(
                logsRef,
                where('action', 'in', ['create_template', 'update_template', 'delete_template']),
                orderBy('timestamp', 'desc'),
                limit(10)
            );
            const snapshot = await getDocs(q);
            const logs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setAuditLogs(logs);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    };

    const logAuditAction = async (action, details) => {
        try {
            await addDoc(collection(db, 'audit_logs'), {
                userId: user.uid,
                action,
                details,
                timestamp: serverTimestamp()
            });
        } catch (error) {
            console.error('Error logging audit action:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!canManageTemplates) {
            toast.error('You do not have permission to manage templates');
            return;
        }

        try {
            setLoading(true);
            const templateData = {
                ...formData,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                createdBy: user.uid
            };

            if (editingTemplate) {
                await updateDoc(doc(db, 'report_templates', editingTemplate.id), templateData);
                await logAuditAction('update_template', { templateId: editingTemplate.id });
                toast.success('Template updated successfully');
            } else {
                await addDoc(collection(db, 'report_templates'), templateData);
                await logAuditAction('create_template', { templateName: formData.name });
                toast.success('Template created successfully');
            }

            setFormData({
                name: '',
                description: '',
                fields: [],
                outputFormat: 'pdf',
                filters: [],
                sorting: []
            });
            setEditingTemplate(null);
            fetchTemplates();
        } catch (error) {
            console.error('Error saving template:', error);
            setError('Failed to save template');
            toast.error('Failed to save template');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (templateId) => {
        if (!canManageTemplates) {
            toast.error('You do not have permission to delete templates');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            setLoading(true);
            await deleteDoc(doc(db, 'report_templates', templateId));
            await logAuditAction('delete_template', { templateId });
            toast.success('Template deleted successfully');
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
            setError('Failed to delete template');
            toast.error('Failed to delete template');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (template) => {
        if (!canManageTemplates) {
            toast.error('You do not have permission to edit templates');
            return;
        }
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            description: template.description,
            fields: template.fields,
            outputFormat: template.outputFormat,
            filters: template.filters,
            sorting: template.sorting
        });
    };

    const addField = () => {
        if (!newField.name) {
            toast.error('Field name is required');
            return;
        }
        setFormData(prev => ({
            ...prev,
            fields: [...prev.fields, newField]
        }));
        setNewField({
            name: '',
            type: 'text',
            required: false
        });
    };

    const removeField = (index) => {
        setFormData(prev => ({
            ...prev,
            fields: prev.fields.filter((_, i) => i !== index)
        }));
    };

    if (!canViewTemplates) {
        return (
            <div className="p-4">
                <div className="text-red-500">Access Denied</div>
            </div>
        );
    }

    return (
        <ErrorBoundary>
            <div className={`p-4 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
                <h1 className="text-2xl font-bold mb-4">Report Templates</h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {loading ? (
                    <LoadingSpinner />
                ) : (
                    <>
                        {canManageTemplates && (
                            <div className="mb-6">
                                <h2 className="text-xl font-semibold mb-4">
                                    {editingTemplate ? 'Edit Template' : 'Create New Template'}
                                </h2>
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <label className="block mb-2">Template Name</label>
                                        <input
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            className={`w-full p-2 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2">Description</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                            className={`w-full p-2 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                                            rows="3"
                                        />
                                    </div>

                                    <div>
                                        <label className="block mb-2">Output Format</label>
                                        <select
                                            value={formData.outputFormat}
                                            onChange={(e) => setFormData(prev => ({ ...prev, outputFormat: e.target.value }))}
                                            className={`w-full p-2 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                                        >
                                            <option value="pdf">PDF</option>
                                            <option value="csv">CSV</option>
                                            <option value="excel">Excel</option>
                                        </select>
                                    </div>

                                    <div>
                                        <h3 className="text-lg font-semibold mb-2">Fields</h3>
                                        <div className="space-y-2">
                                            {formData.fields.map((field, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <span>{field.name} ({field.type})</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => removeField(index)}
                                                        className="text-red-500 hover:text-red-700"
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex space-x-2">
                                            <input
                                                type="text"
                                                value={newField.name}
                                                onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value }))}
                                                placeholder="Field Name"
                                                className={`p-2 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                                            />
                                            <select
                                                value={newField.type}
                                                onChange={(e) => setNewField(prev => ({ ...prev, type: e.target.value }))}
                                                className={`p-2 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                                            >
                                                <option value="text">Text</option>
                                                <option value="number">Number</option>
                                                <option value="date">Date</option>
                                                <option value="boolean">Boolean</option>
                                            </select>
                                            <label className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={newField.required}
                                                    onChange={(e) => setNewField(prev => ({ ...prev, required: e.target.checked }))}
                                                />
                                                <span>Required</span>
                                            </label>
                                            <button
                                                type="button"
                                                onClick={addField}
                                                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                                            >
                                                Add Field
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                                    >
                                        {editingTemplate ? 'Update Template' : 'Create Template'}
                                    </button>
                                </form>
                            </div>
                        )}

                        <div>
                            <h2 className="text-xl font-semibold mb-4">Existing Templates</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates.map(template => (
                                    <div
                                        key={template.id}
                                        className={`p-4 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}
                                    >
                                        <h3 className="text-lg font-semibold">{template.name}</h3>
                                        <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                                        <div className="text-sm mb-2">
                                            <span className="font-semibold">Format:</span> {template.outputFormat}
                                        </div>
                                        <div className="text-sm mb-2">
                                            <span className="font-semibold">Fields:</span> {template.fields.length}
                                        </div>
                                        {canManageTemplates && (
                                            <div className="flex space-x-2 mt-4">
                                                <button
                                                    onClick={() => handleEdit(template)}
                                                    className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(template.id)}
                                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8">
                            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                            <div className={`p-4 border rounded ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
                                {auditLogs.map(log => (
                                    <div key={log.id} className="border-b py-2 last:border-b-0">
                                        <div className="flex justify-between">
                                            <span className="font-semibold">{log.action}</span>
                                            <span className="text-sm text-gray-500">
                                                {new Date(log.timestamp?.toDate()).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {JSON.stringify(log.details)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </ErrorBoundary>
    );
};

export default ReportTemplates; 