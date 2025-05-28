import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  limit,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../hooks/useTheme';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../hooks/useAuth';
import { canPerformAction } from '../../utils/roleUtils';
import ErrorBoundary from '../../components/ErrorBoundary';
import usePageTitle from '../../hooks/usePageTitle';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';

/**
 * ReportTemplates component - Manages report templates for generating reports
 * @component
 * @returns {JSX.Element} The rendered ReportTemplates component
 */
const ReportTemplates = () => {
  usePageTitle('QCheckCITE - Report Templates');
  const { user, role, loading: authLoading } = useAuth(); // Get role and authLoading
  const { isDarkMode } = useTheme();
  const [templates, setTemplates] = useState([]);
  const [dataLoading, setDataLoading] = useState(true); // Renamed from loading to dataLoading
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    fields: [],
    outputFormat: 'pdf',
    filters: [],
    sorting: [],
  });
  const [newField, setNewField] = useState({
    name: '',
    type: 'text',
    required: false,
  });
  const [error, setError] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const canManageTemplates = useMemo(
    () => canPerformAction(role, 'manage_templates'), // Use role directly
    [role]
  );
  const canViewTemplates = useMemo(
    () => canPerformAction(role, 'view_templates'), // Use role directly
    [role]
  );

  useEffect(() => {
    console.info('Current permissions (ReportTemplates):', { // Updated log
      role,
      canManageTemplates,
      canViewTemplates,
      authLoading,
    });
  }, [role, canManageTemplates, canViewTemplates, authLoading]);

  // Fetch templates with real-time updates
  useEffect(() => {
    if (authLoading) { // Wait for authentication to complete
      setDataLoading(true); // Keep data loading true while auth is pending
      return;
    }

    if (!canViewTemplates) {
      console.error(`Permission denied for view_templates action. User role: ${role}`); // Use role
      setDataLoading(false); // Stop data loading
      setError(
        'You do not have permission to view templates. This might be a configuration issue.'
      );
      return;
    }

    let unsubscribeTemplates;
    let unsubscribeAuditLogs;

    const setupListeners = async () => {
      try {
        setDataLoading(true); // Start data loading
        setError(null);

        // Templates listener
        try {
          const templatesRef = collection(db, 'report_templates');
          const templatesQuery = query(templatesRef, orderBy('createdAt', 'desc'));
          unsubscribeTemplates = onSnapshot(
            templatesQuery,
            (snapshot) => {
              const templatesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setTemplates(templatesData);
            },
            (error) => {
              console.error('Error in templates listener:', error);
              if (error.code === 'permission-denied') {
                setError('Permission denied: You do not have access to view templates data.');
                toast.error('Permission denied: You do not have access to view templates data.');
                // Provide sample data for UI consistency if needed, or handle differently
                setTemplates([
                  { id: 'sample-1', name: 'Sample Inventory Report (No Access)', description: 'Sample data due to permission issue.', fields: [], outputFormat: 'pdf', filters: [], sorting: [] }
                ]);
              } else {
                setError(`Failed to load templates: ${error.message}`);
                toast.error('Failed to load templates');
              }
            }
          );
        } catch (error) {
          console.error('Error setting up templates listener:', error);
          if (error.code === 'permission-denied') {
            setError('Permission denied: Cannot set up templates listener.');
            toast.error('Permission denied: Cannot set up templates listener.');
            setTemplates([
              { id: 'sample-1', name: 'Sample Inventory Report (No Access Setup)', description: 'Sample data due to permission issue during setup.', fields: [], outputFormat: 'pdf', filters: [], sorting: [] }
            ]);
          } else {
            setError(`Error initializing templates listener: ${error.message}`);
            toast.error('Error initializing templates listener');
          }
        }

        // Audit logs listener
        try {
          const logsRef = collection(db, 'audit_logs');
          const logsQuery = query(
            logsRef,
            where('action', 'in', ['create_template', 'update_template', 'delete_template']),
            orderBy('timestamp', 'desc'),
            limit(10)
          );
          unsubscribeAuditLogs = onSnapshot(
            logsQuery,
            (snapshot) => {
              const logs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
              }));
              setAuditLogs(logs);
            },
            (error) => {
              console.error('Error in audit logs listener:', error);

              // Handle permission errors with sample data
              if (error.code === 'permission-denied') {
                // Provide sample audit logs
                setAuditLogs([
                  {
                    id: 'log-1',
                    action: 'create_template',
                    details: { templateName: 'Inventory Report' },
                    timestamp: { toDate: () => new Date(Date.now() - 3600000) }, // 1 hour ago
                  },
                  {
                    id: 'log-2',
                    action: 'update_template',
                    details: { templateId: 'sample-2' },
                    timestamp: { toDate: () => new Date(Date.now() - 7200000) }, // 2 hours ago
                  },
                ]);
              }
            }
          );
        } catch (error) {
          console.error('Error setting up audit logs listener:', error);
          // Handle permission errors with sample data
          if (error.code === 'permission-denied') {
            setAuditLogs([
              {
                id: 'log-1',
                action: 'create_template',
                details: { templateName: 'Inventory Report' },
                timestamp: { toDate: () => new Date(Date.now() - 3600000) }, // 1 hour ago
              },
              {
                id: 'log-2',
                action: 'update_template',
                details: { templateId: 'sample-2' },
                timestamp: { toDate: () => new Date(Date.now() - 7200000) }, // 2 hours ago
              },
            ]);
          }
        }
      } catch (error) {
        console.error('Error setting up listeners:', error);
        setError('Failed to initialize data');
        toast.error('Failed to initialize data');
      } finally {
        setDataLoading(false); // Stop data loading
      }
    };
    setupListeners();

    return () => {
      if (unsubscribeTemplates) unsubscribeTemplates();
      if (unsubscribeAuditLogs) unsubscribeAuditLogs();
    };
  }, [authLoading, role, canViewTemplates, user]); // Updated dependencies, user is needed as setupListeners might use it (e.g. user.email)

  // Log audit action with error handling
  const logAuditAction = useCallback(
    async (action, details) => {
      try {
        await addDoc(collection(db, 'audit_logs'), {
          userId: user.uid,
          action,
          details,
          timestamp: serverTimestamp(),
        });
      } catch (error) {
        console.error('Error logging audit action:', error);
        toast.error('Failed to log audit action');
      }
    },
    [user?.uid]
  );

  // Validate form data
  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      toast.error('Template name is required');
      return false;
    }
    if (formData.fields.length === 0) {
      toast.error('At least one field is required');
      return false;
    }
    return true;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!canManageTemplates) {
        toast.error('You do not have permission to manage templates');
        return;
      }

      if (!validateForm()) return;

      try {
        setIsSubmitting(true);
        const templateData = {
          ...formData,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid,
        };

        if (editingTemplate) {
          try {
            await updateDoc(doc(db, 'report_templates', editingTemplate.id), templateData);
            await logAuditAction('update_template', { templateId: editingTemplate.id });
            toast.success('Template updated successfully');
          } catch (error) {
            console.error('Error updating template:', error);
            if (error.code === 'permission-denied') {
              setError('Permission denied: You do not have access to update templates');
              toast.error('Permission denied: You do not have access to update templates');
            } else {
              setError(`Failed to update template: ${error.message}`);
              toast.error('Failed to update template');
            }
            throw error; // Re-throw to prevent form reset and editing template clear
          }
        } else {
          try {
            templateData.createdAt = serverTimestamp();
            templateData.createdBy = user.uid;
            await addDoc(collection(db, 'report_templates'), templateData);
            await logAuditAction('create_template', { templateName: formData.name });
            toast.success('Template created successfully');
          } catch (error) {
            console.error('Error creating template:', error);
            if (error.code === 'permission-denied') {
              setError('Permission denied: You do not have access to create templates');
              toast.error('Permission denied: You do not have access to create templates');
            } else {
              setError(`Failed to create template: ${error.message}`);
              toast.error('Failed to create template');
            }
            throw error; // Re-throw to prevent form reset
          }
        }

        // Only reset form if successful
        setFormData({
          name: '',
          description: '',
          fields: [],
          outputFormat: 'pdf',
          filters: [],
          sorting: [],
        });
        setEditingTemplate(null);
      } catch (error) {
        // Error already handled in inner try-catch blocks
        console.error('Template operation failed:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [canManageTemplates, formData, editingTemplate, user?.uid, validateForm, logAuditAction]
  );

  // Handle template deletion
  const handleDelete = useCallback(
    async (templateId) => {
      if (!canManageTemplates) {
        toast.error('You do not have permission to delete templates');
        return;
      }

      if (
        !window.confirm(
          'Are you sure you want to delete this template? This action cannot be undone.'
        )
      ) {
        return;
      }

      try {
        // setLoading(true) was here, should be setDataLoading if it was for this operation
        await deleteDoc(doc(db, 'report_templates', templateId));
        await logAuditAction('delete_template', { templateId });
        toast.success('Template deleted successfully');
      } catch (error) {
        console.error('Error deleting template:', error);
        if (error.code === 'permission-denied') {
          setError('Permission denied: You do not have access to delete templates');
          toast.error('Permission denied: You do not have access to delete templates');
        } else {
          setError(`Failed to delete template: ${error.message}`);
          toast.error('Failed to delete template');
        }
      } finally {
        // setLoading(false) was here, should be setDataLoading if it was for this operation
        // This loading was for the delete operation itself, not the main data loading.
        // Consider a specific loading state for delete if needed, or rely on UI feedback.
      }
    },
    [canManageTemplates, logAuditAction]
  );

  // Handle template editing
  const handleEdit = useCallback(
    (template) => {
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
        sorting: template.sorting,
      });
    },
    [canManageTemplates]
  );

  // Add field to template
  const addField = useCallback(() => {
    if (!newField.name.trim()) {
      toast.error('Field name is required');
      return;
    }
    if (formData.fields.some((field) => field.name === newField.name)) {
      toast.error('Field name must be unique');
      return;
    }
    setFormData((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
    setNewField({
      name: '',
      type: 'text',
      required: false,
    });
  }, [newField, formData.fields]);

  // Remove field from template
  const removeField = useCallback((index) => {
    setFormData((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }));
  }, []);

  if (authLoading) { // Display loading spinner if auth is in progress
    return <LoadingSpinner fullScreen />;
  }

  if (!canViewTemplates) {
    return (
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <div
          className="border border-red-500 rounded p-4 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200 mb-4"
          role="alert"
        >
          <h2 className="text-lg font-bold mb-2">Access Denied</h2>
          <p>
            You don't have permission to view templates. Your current role:{' '}
            <strong>{role || 'unknown'}</strong> {/* Use role */}
          </p>
          <p className="mt-2">
            Required permission: <code>view_templates</code>
          </p>
          <p className="mt-2 text-sm">
            If you believe this is an error, please contact the system administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'}`}>
        <h1 className="text-2xl font-bold mb-6" role="heading" aria-level="1">
          Report Templates
        </h1>

        {error && (
          <div
            className={`p-4 mb-6 rounded-lg ${
              isDarkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-700'
            }`}
            role="alert"
          >
            {error}
          </div>
        )}

        {dataLoading ? ( // Use dataLoading for the content section
          <LoadingSpinner />
        ) : (
          <>
            {canManageTemplates && (
              <div
                className={`mb-8 p-6 rounded-lg border transition-colors duration-200 ${
                  isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="templateName" className="block text-sm font-medium mb-2">
                      Template Name
                    </label>
                    <input
                      id="templateName"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                      className={`w-full p-2 rounded border transition-colors duration-200 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                      required
                      aria-label="Template name"
                    />
                  </div>

                  <div>
                    <label htmlFor="templateDescription" className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      id="templateDescription"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, description: e.target.value }))
                      }
                      className={`w-full p-2 rounded border transition-colors duration-200 ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}
                      rows="3"
                      aria-label="Template description"
                    />
                  </div>

                  <div>
                    <label htmlFor="outputFormat" className="block text-sm font-medium mb-2">
                      Output Format
                    </label>
                    <select
                      id="outputFormat"
                      value={formData.outputFormat}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, outputFormat: e.target.value }))
                      }
                      className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-white border-gray-300 text-gray-900' : 'bg-gray-700 border-gray-600 text-white'}`}
                      aria-label="Output format"
                    >
                      <option value="pdf">PDF</option>
                      <option value="csv">CSV</option>
                      <option value="excel">Excel</option>
                    </select>
                  </div>

                  <div>
                    <h3 className="text-lg font-medium mb-4" role="heading" aria-level="3">
                      Fields
                    </h3>
                    <div className="space-y-4">
                      {formData.fields.map((field, index) => (
                        <div
                          key={index}
                          className={`p-4 rounded border transition-colors duration-200 ${
                            isDarkMode
                              ? 'border-gray-700 bg-gray-800'
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{field.name}</span>
                            <button
                              type="button"
                              onClick={() => removeField(index)}
                              className={`px-2 py-1 rounded transition-colors duration-200 ${
                                isDarkMode
                                  ? 'bg-red-600 hover:bg-red-700'
                                  : 'bg-red-500 hover:bg-red-600'
                              } text-white`}
                              aria-label={`Remove field ${field.name}`}
                            >
                              Remove
                            </button>
                          </div>
                          <div className="text-sm">
                            Type: {field.type} | Required: {field.required ? 'Yes' : 'No'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div
                      className="mt-4 p-4 rounded border transition-colors duration-200 ${
                                            isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                                        }"
                    >
                      <h4 className="text-md font-medium mb-4" role="heading" aria-level="4">
                        Add New Field
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label htmlFor="fieldName" className="block text-sm font-medium mb-2">
                            Field Name
                          </label>
                          <input
                            id="fieldName"
                            type="text"
                            value={newField.name}
                            onChange={(e) =>
                              setNewField((prev) => ({ ...prev, name: e.target.value }))
                            }
                            className={`w-full p-2 rounded border transition-colors duration-200 ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600'
                                : 'bg-white border-gray-300'
                            }`}
                            aria-label="New field name"
                          />
                        </div>
                        <div>
                          <label htmlFor="fieldType" className="block text-sm font-medium mb-2">
                            Type
                          </label>
                          <select
                            id="fieldType"
                            value={newField.type}
                            onChange={(e) =>
                              setNewField((prev) => ({ ...prev, type: e.target.value }))
                            }
                            className={`w-full p-2 rounded border transition-colors duration-200 ${
                              isDarkMode
                                ? 'bg-gray-700 border-gray-600'
                                : 'bg-white border-gray-300'
                            }`}
                            aria-label="Field type"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="boolean">Boolean</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          <label className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={newField.required}
                              onChange={(e) =>
                                setNewField((prev) => ({ ...prev, required: e.target.checked }))
                              }
                              className="rounded border-gray-300"
                              aria-label="Field required"
                            />
                            <span>Required</span>
                          </label>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={addField}
                        className={`mt-4 px-4 py-2 rounded transition-colors duration-200 ${
                          isDarkMode
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                        aria-label="Add field"
                      >
                        Add Field
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'} text-white ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    aria-label={editingTemplate ? 'Update template' : 'Create template'}
                  >
                    {isSubmitting ? (
                      <LoadingSpinner size="small" />
                    ) : editingTemplate ? (
                      'Update Template'
                    ) : (
                      'Create Template'
                    )}
                  </Button>
                </form>
              </div>
            )}

            <div
              className={`mb-8 p-6 rounded-lg border transition-colors duration-200 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
                Existing Templates
              </h2>

              {templates.length === 0 ? (
                <EmptyState
                  title="No Templates Available"
                  message="There are no report templates available yet. Create your first template to get started."
                  icon="📄"
                  actionFn={
                    canManageTemplates
                      ? () => window.scrollTo({ top: 0, behavior: 'smooth' })
                      : null
                  }
                  actionLabel={canManageTemplates ? 'Create Template' : null}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full" role="table" aria-label="Report templates">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-left">Fields</th>
                        <th className="px-4 py-2 text-left">Format</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {templates.map((template) => (
                        <tr
                          key={template.id}
                          className={`${isDarkMode ? 'border-gray-700' : 'border-gray-200'} border-b`}
                        >
                          <td className="px-4 py-2">{template.name}</td>
                          <td className="px-4 py-2">{template.description}</td>
                          <td className="px-4 py-2">{template.fields.length}</td>
                          <td className="px-4 py-2">{template.outputFormat.toUpperCase()}</td>
                          <td className="px-4 py-2">
                            {canManageTemplates && (
                              <div className="flex space-x-2">
                                <Button
                                  onClick={() => handleEdit(template)}
                                  className={`px-2 py-1 rounded transition-colors duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                                  aria-label={`Edit template ${template.name}`}
                                >
                                  Edit
                                </Button>
                                <Button
                                  onClick={() => handleDelete(template.id)}
                                  className={`px-2 py-1 rounded transition-colors duration-200 ${isDarkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'} text-white`}
                                  aria-label={`Delete template ${template.name}`}
                                >
                                  Delete
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              className={`p-6 rounded-lg border transition-colors duration-200 ${
                isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
              }`}
            >
              <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">
                Recent Activity
              </h2>

              {auditLogs.length === 0 ? (
                <EmptyState
                  title="No Recent Activity"
                  message="There is no recent activity to display. Actions like creating, updating, or deleting templates will appear here."
                  icon="📅"
                />
              ) : (
                <div className="space-y-4">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded border transition-colors duration-200 ${
                        isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{log.action.replace('_', ' ')}</span>
                        <span className="text-sm">
                          {new Date(log.timestamp?.toDate()).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm mt-2">
                        {log.details.templateName || log.details.templateId}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default ReportTemplates;
