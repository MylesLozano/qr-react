import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import usePageTitle from '../../hooks/usePageTitle';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        status: '',
        category: ''
    });
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
            const q = query(collection(db, 'reportTemplates'), orderBy('name'));
            const snapshot = await getDocs(q);
            const fetchedTemplates = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setTemplates(fetchedTemplates);
        } catch (error) {
            console.error('Error fetching templates:', error);
            setError('Failed to fetch templates');
            toast.error('Failed to fetch templates');
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
            setError('Failed to fetch report data');
            toast.error('Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    }, [filters]);

    // Validate report configuration
    const validateReportConfig = useCallback(() => {
        if (!selectedTemplate) {
            toast.error('Please select a template');
            return false;
        }
        if (filters.dateRange.start && filters.dateRange.end &&
            new Date(filters.dateRange.start) > new Date(filters.dateRange.end)) {
            toast.error('End date must be after start date');
            return false;
        }
        return true;
    }, [selectedTemplate, filters]);

    // Generate PDF report
    const generatePDF = useCallback(() => {
        try {
            const doc = new jsPDF();
            const tableColumn = selectedTemplate.fields.map(field => field.name);
            const tableRows = buildReportRows(filteredData, selectedTemplate.fields);
            doc.text(`${selectedTemplate.name} Report`, 14, 15);
            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: 20,
                theme: isDarkMode ? 'grid' : 'striped',
                styles: {
                    fontSize: 10,
                    cellPadding: 5,
                    overflow: 'linebreak'
                }
            });

            doc.save(`${selectedTemplate.name}_${new Date().toISOString()}.pdf`);
            toast.success('PDF report generated successfully');
        } catch (error) {
            console.error('Error generating PDF:', error);
            toast.error('Failed to generate PDF report');
        }
    }, [selectedTemplate, filteredData, isDarkMode]);

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
                    generatePDF();
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
    }, [selectedTemplate, validateReportConfig, generatePDF, generateCSV]);

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

                        <div className="space-y-4">
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
                                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                    aria-label="Select report template"
                                >
                                    <option value="">Select a template</option>
                                    {templates.map(template => (
                                        <option key={template.id} value={template.id}>
                                            {template.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

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
                                </div>
                            </div>

                            <div>
                                <label htmlFor="statusSelect" className="block text-sm font-medium mb-1">
                                    Status
                                </label>
                                <select
                                    id="statusSelect"
                                    value={filters.status}
                                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                    aria-label="Filter by status"
                                >
                                    <option value="">All Statuses</option>
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="maintenance">Maintenance</option>
                                </select>
                            </div>

                            <div>
                                <label htmlFor="categorySelect" className="block text-sm font-medium mb-1">
                                    Category
                                </label>
                                <select
                                    id="categorySelect"
                                    value={filters.category}
                                    onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                    className={`w-full p-2 rounded border transition-colors duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                                        }`}
                                    aria-label="Filter by category"
                                >
                                    <option value="">All Categories</option>
                                    <option value="equipment">Equipment</option>
                                    <option value="supplies">Supplies</option>
                                    <option value="furniture">Furniture</option>
                                </select>
                            </div>

                            <button
                                onClick={generateReport}
                                disabled={!selectedTemplate || loading || isGenerating}
                                className={`w-full px-4 py-2 rounded transition-colors duration-200 ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                                    } text-white ${(!selectedTemplate || loading || isGenerating) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                aria-label="Generate report"
                            >
                                {isGenerating ? <LoadingSpinner size="small" /> : 'Generate Report'}
                            </button>
                        </div>
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
                            <div className="overflow-x-auto">
                                <table className="min-w-full" role="table" aria-label="Report preview">
                                    <thead>
                                        <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                            {selectedTemplate.fields.map(field => (
                                                <th key={field.name} className="px-4 py-2 text-left">
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
                            <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                Select a template to preview
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ErrorBoundary>
    );
};

export default ReportGenerator; 