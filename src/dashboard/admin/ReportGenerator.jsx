import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import usePageTitle from '../../hooks/usePageTitle';
import Button from '../../components/Button';
import EmptyState from '../../components/EmptyState';
import { useNavigate } from 'react-router-dom';

/**
 * ReportGenerator component - Generates reports based on templates and filters
 * @component
 * @returns {JSX.Element} The rendered ReportGenerator component
 */
const ReportGenerator = () => {
    usePageTitle("QCheckCITE - Report Generator");
    const { isDarkMode } = useTheme();
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [isGenerating, setIsGenerating] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        status: '',
        category: ''
    });
    const navigate = useNavigate();

    const buildReportRows = (data, fields) => {
        return data.map(item => fields.map(field => item[field.name] || ''));
    };

    // Memoize filtered data
    const filteredData = useMemo(() => {
        return reportData.filter(item => {
            if (filters.status && item.status !== filters.status) return false;
            if (filters.category && item.category !== filters.category) return false;
            return true;
        });
    }, [reportData, filters]);

    // Fetch templates
    useEffect(() => {
        fetchTemplates();
    }, []);

    // Fetch report data when template or filters change
    useEffect(() => {
        if (selectedTemplate) {
            fetchReportData();
        }
    }, [selectedTemplate, filters]);

    // Fetch templates with error handling
    const fetchTemplates = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Try to get templates from Firestore
            const q = query(collection(db, 'report_templates'), orderBy('name'));
            const snapshot = await getDocs(q);
            const fetchedTemplates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (fetchedTemplates.length > 0) {
                setTemplates(fetchedTemplates);
            } else {
                // If no templates are found, show a sample template
                setTemplates([{
                    id: 'sample-template',
                    name: 'Sample Template',
                    description: 'This is a sample template for demonstration',
                    fields: [
                        { name: 'item', type: 'text', required: true },
                        { name: 'quantity', type: 'number', required: true },
                        { name: 'category', type: 'text', required: false },
                        { name: 'date', type: 'date', required: false }
                    ],
                    format: 'pdf',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }]);
                toast.info('Using sample template for demonstration');
            }
        } catch (error) {
            console.error('Error fetching templates:', error);

            // Handle permission errors specifically
            if (error.code === 'permission-denied') {
                setError('Permission denied: You do not have access to view templates');
                toast.error('Permission denied: You do not have access to view templates');

                // Provide a sample template to allow the UI to function
                setTemplates([{
                    id: 'sample-template',
                    name: 'Sample Template',
                    description: 'This is a sample template for demonstration',
                    fields: [
                        { name: 'item', type: 'text', required: true },
                        { name: 'quantity', type: 'number', required: true },
                        { name: 'category', type: 'text', required: false },
                        { name: 'date', type: 'date', required: false }
                    ],
                    format: 'pdf',
                    createdAt: new Date(),
                    updatedAt: new Date()
                }]);
                toast.info('Using sample template for demonstration');
            } else {
                setError(`Failed to fetch templates: ${error.message}`);
                toast.error('Failed to fetch templates');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch report data with error handling
    const fetchReportData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            let q = query(collection(db, 'inventory'));

            // Apply filters
            if (filters.dateRange.start) {
                q = query(q, where('createdAt', '>=', new Date(filters.dateRange.start)));
            }
            if (filters.dateRange.end) {
                q = query(q, where('createdAt', '<=', new Date(filters.dateRange.end)));
            }
            if (filters.status) {
                q = query(q, where('status', '==', filters.status));
            }
            if (filters.category) {
                q = query(q, where('category', '==', filters.category));
            }

            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setReportData(data);
        } catch (error) {
            console.error('Error fetching report data:', error);

            // Handle permission errors specifically
            if (error.code === 'permission-denied') {
                setError('Permission denied: You do not have access to view inventory data');
                toast.error('Permission denied: You do not have access to view inventory data');

                // Provide sample data for the report
                setReportData([
                    {
                        id: 'sample-1',
                        item: 'Microscope',
                        quantity: 5,
                        category: 'Equipment',
                        status: 'active',
                        date: new Date().toISOString().split('T')[0]
                    },
                    {
                        id: 'sample-2',
                        item: 'Test Tubes',
                        quantity: 50,
                        category: 'Supplies',
                        status: 'active',
                        date: new Date().toISOString().split('T')[0]
                    },
                    {
                        id: 'sample-3',
                        item: 'Lab Coat',
                        quantity: 10,
                        category: 'Apparel',
                        status: 'active',
                        date: new Date().toISOString().split('T')[0]
                    }
                ]);
                toast.info('Using sample data for demonstration');
            } else {
                setError(`Failed to fetch report data: ${error.message}`);
                toast.error('Failed to fetch report data');
            }
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Validate report configuration
    const validateReportConfig = useCallback(() => {
        setFieldErrors({}); // Reset

        if (!selectedTemplate) {
            toast.error('Please select a template');
            return false;
        }

        if (filters.dateRange.start && filters.dateRange.end &&
            new Date(filters.dateRange.start) > new Date(filters.dateRange.end)) {
            setFieldErrors({ endDate: 'End date must be after start date' });
            toast.error('End date must be after start date');
            return false;
        }
        return true;
    }, [selectedTemplate, filters]);

    // Generate PDF report
    const generatePDFReport = async (data) => {
        try {
            setIsGenerating(true);
            
            // Dynamically import jsPDF only when needed
            const { jsPDF } = await import('jspdf');
            
            // Initialize PDF document
            const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
            });

            // Set title
            doc.setFontSize(16);
            doc.text('QCheckCITE Inventory Report', 10, 10);

            // Add report data
            doc.setFontSize(12);
            if (data && data.length > 0) {
                let yPos = 30;
                data.forEach((item, index) => {
                    if (yPos > 270) { // Check if we need a new page
                        doc.addPage();
                        yPos = 10;
                    }
                    doc.text(`${item.name}: ${item.quantity} units`, 10, yPos);
                    yPos += 10;
                });
            } else {
                doc.text('No data available for this report', 10, 30);
            }

            // Save the PDF
            doc.save('inventory-report.pdf');
            toast.success('PDF report generated successfully');
        } catch (error) {
            console.error('PDF Generation Error:', error);
            toast.error('Failed to generate PDF report. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate CSV report
    const generateCSV = useCallback(() => {
        try {
            const fields = selectedTemplate.fields;
            const csvData = filteredData.map(item =>
                Object.fromEntries(fields.map(field => [field.name, item[field.name] || '']))
            );
            const csv = Papa.unparse(csvData);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            saveAs(blob, `${selectedTemplate.name}_${new Date().toISOString()}.csv`);
            toast.success('CSV report generated successfully');
        } catch (error) {
            console.error('Error generating CSV:', error);
            toast.error('Failed to generate CSV report');
        }
    }, [selectedTemplate, filteredData]);

    // Generate report based on selected format
    const generateReport = useCallback(() => {
        if (!validateReportConfig()) return;

        setIsGenerating(true);
        try {
            switch (selectedTemplate.format) {
                case 'pdf':
                    generatePDFReport(filteredData);
                    break;
                case 'csv':
                    generateCSV();
                    break;
                case 'excel':
                    generateCSV();
                    toast.info('Excel format not yet supported. Generating CSV instead.');
                    break;
                default:
                    toast.error('Unsupported format');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            toast.error('Failed to generate report');
        } finally {
            setIsGenerating(false);
        }
    }, [selectedTemplate, validateReportConfig, generatePDFReport, generateCSV]);

    return (
        <ErrorBoundary>
            <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold" role="heading" aria-level="1">Generate Report</h1>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Template Selection and Filters */}
                    <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Report Configuration</h2>

                        {templates.length === 0 ? (
                            <EmptyState
                                title="No Templates Available"
                                message="There are no report templates available. Please create a template first."
                                icon="📋"
                                actionLabel="Create Template"
                                actionFn={() => navigate('/admin-dashboard/templates')}
                            />
                        ) : (
                            <fieldset className="space-y-4 border-t border-gray-300 pt-4">
                                <legend className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                    Report Filters
                                </legend>
                                {/* Template select */}
                                <div>
                                    <label htmlFor="templateSelect" className="block text-sm font-medium mb-1">
                                        Select Template
                                    </label>
                                    <select
                                        id="templateSelect"
                                        value={selectedTemplate?.id || ''}
                                        onChange={(e) => {
                                            const template = templates.find(t => t.id === e.target.value);
                                            setSelectedTemplate(template);
                                        }}
                                        className={`w-full p-2 rounded border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isDarkMode
                                            ? 'bg-gray-700 border-gray-600 focus:ring-offset-gray-800'
                                            : 'bg-white border-gray-300 focus:ring-offset-white'}`}
                                        aria-label="Select report template"
                                    >
                                        <option value="">Select a template</option>
                                        {templates.map(template => (
                                            <option key={template.id} value={template.id} className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                {/* Start/End date */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="startDate" className="block text-sm font-medium mb-1">
                                            Start Date
                                        </label>
                                        <input
                                            id="startDate"
                                            type="date"
                                            value={filters.dateRange.start}
                                            onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                                            className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                                }`}
                                            aria-label="Start date"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="endDate" className="block text-sm font-medium mb-1">
                                            End Date
                                        </label>
                                        <input
                                            id="endDate"
                                            type="date"
                                            value={filters.dateRange.end}
                                            onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                                            className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                                }`}
                                            aria-label="End date"
                                        />
                                        {fieldErrors.endDate && (
                                            <p className="text-sm text-red-500 mt-1">{fieldErrors.endDate}</p>
                                        )}
                                    </div>
                                </div>
                                {/* Status select */}
                                <div>
                                    <label htmlFor="statusSelect" className="block text-sm font-medium mb-1">
                                        Status
                                    </label>
                                    <select
                                        id="statusSelect"
                                        value={filters.status}
                                        onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                        className={`w-full p-2 rounded border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isDarkMode
                                            ? 'bg-gray-700 border-gray-600 focus:ring-offset-gray-800'
                                            : 'bg-white border-gray-300 focus:ring-offset-white'}`}
                                        aria-label="Filter by status"
                                    >
                                        <option value="" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>All Statuses</option>
                                        <option value="active" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>Active</option>
                                        <option value="inactive" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>Inactive</option>
                                        <option value="maintenance" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>Maintenance</option>
                                    </select>
                                </div>
                                {/* Category select */}
                                <div>
                                    <label htmlFor="categorySelect" className="block text-sm font-medium mb-1">
                                        Category
                                    </label>
                                    <select
                                        id="categorySelect"
                                        value={filters.category}
                                        onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                        className={`w-full p-2 rounded border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${isDarkMode
                                            ? 'bg-gray-700 border-gray-600 focus:ring-offset-gray-800'
                                            : 'bg-white border-gray-300 focus:ring-offset-white'}`}
                                        aria-label="Filter by category"
                                    >
                                        <option value="" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>All Categories</option>
                                        <option value="equipment" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>Equipment</option>
                                        <option value="supplies" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>Supplies</option>
                                        <option value="furniture" className={isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}>Furniture</option>
                                    </select>
                                </div>

                                <div>
                                    <Button
                                        onClick={generateReport}
                                        disabled={!selectedTemplate || loading || isGenerating}
                                        className={`w-full px-4 py-2 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                            } text-white ${(!selectedTemplate || loading || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        aria-label="Generate report"
                                    >
                                        {isGenerating ? <LoadingSpinner size="small" /> : 'Generate Report'}
                                    </Button>
                                </div>

                            </fieldset>
                        )}
                    </div>

                    {/* Preview Section */}
                    <div className={`p-6 rounded-lg border transition-colors duration-200 ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
                        }`}>
                        <h2 className="text-xl font-semibold mb-4" role="heading" aria-level="2">Preview</h2>

                        {loading ? (
                            <LoadingSpinner />
                        ) : error ? (
                            <div className="text-red-500">{error}</div>
                        ) : selectedTemplate ? (
                            filteredData.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="min-w-full" role="table" aria-label="Report preview">
                                        <thead>
                                            <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                                {selectedTemplate.fields.map(field => (
                                                    <th key={field.name} scope="col" className="px-4 py-2 text-left">
                                                        {field.name}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredData.map((item, index) => (
                                                <tr key={item.id} className={`${index % 2 === 0 ? (isDarkMode ? 'bg-gray-800' : 'bg-white') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')}`}>
                                                    {selectedTemplate.fields.map(field => (
                                                        <td key={field.name} className="px-4 py-2">
                                                            {item[field.name] || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <EmptyState
                                    title="No Data Available"
                                    message="There is no data matching your filter criteria."
                                    icon="📊"
                                />
                            )
                        ) : (
                            <EmptyState
                                title="No Template Selected"
                                message="Select a template from the configuration panel to preview the report."
                                icon="📋"
                            />
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default ReportGenerator;