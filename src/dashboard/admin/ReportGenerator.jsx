import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

const ReportGenerator = () => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState([]);
    const [filters, setFilters] = useState({
        dateRange: { start: '', end: '' },
        status: '',
        category: ''
    });
    const { isDarkMode } = useTheme();

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        if (selectedTemplate) {
            fetchReportData();
        }
    }, [selectedTemplate, filters]);

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

    const fetchReportData = async () => {
        try {
            setLoading(true);
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
            toast.error('Failed to fetch report data');
        } finally {
            setLoading(false);
        }
    };

    const generateReport = () => {
        if (!selectedTemplate) {
            toast.error('Please select a template');
            return;
        }

        switch (selectedTemplate.format) {
            case 'pdf':
                generatePDF();
                break;
            case 'csv':
                generateCSV();
                break;
            case 'excel':
                generateExcel();
                break;
            default:
                toast.error('Unsupported format');
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const tableColumn = selectedTemplate.fields.map(field => field.name);
        const tableRows = reportData.map(item =>
            selectedTemplate.fields.map(field => item[field.name] || '')
        );

        doc.text(`${selectedTemplate.name} Report`, 14, 15);
        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 20
        });

        doc.save(`${selectedTemplate.name}_${new Date().toISOString()}.pdf`);
    };

    const generateCSV = () => {
        const csvData = reportData.map(item => {
            const row = {};
            selectedTemplate.fields.forEach(field => {
                row[field.name] = item[field.name] || '';
            });
            return row;
        });

        const csv = Papa.unparse(csvData);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        saveAs(blob, `${selectedTemplate.name}_${new Date().toISOString()}.csv`);
    };

    const generateExcel = () => {
        // For Excel, we'll use CSV as a fallback since it's widely supported
        generateCSV();
        toast.info('Excel format not yet supported. Generating CSV instead.');
    };

    return (
        <div className={`p-6 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Generate Report</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Template Selection and Filters */}
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <h2 className="text-xl font-semibold mb-4">Report Configuration</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Template</label>
                            <select
                                value={selectedTemplate?.id || ''}
                                onChange={(e) => {
                                    const template = templates.find(t => t.id === e.target.value);
                                    setSelectedTemplate(template);
                                }}
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
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
                                <label className="block text-sm font-medium mb-1">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.start}
                                    onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
                                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">End Date</label>
                                <input
                                    type="date"
                                    value={filters.dateRange.end}
                                    onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
                                    className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Category</label>
                            <select
                                value={filters.category}
                                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                                className={`w-full p-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                            >
                                <option value="">All Categories</option>
                                <option value="equipment">Equipment</option>
                                <option value="supplies">Supplies</option>
                                <option value="furniture">Furniture</option>
                            </select>
                        </div>

                        <button
                            onClick={generateReport}
                            disabled={!selectedTemplate || loading}
                            className={`w-full px-4 py-2 rounded ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} text-white disabled:opacity-50`}
                        >
                            Generate Report
                        </button>
                    </div>
                </div>

                {/* Preview Section */}
                <div className={`p-6 rounded-lg border ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                    <h2 className="text-xl font-semibold mb-4">Preview</h2>

                    {loading ? (
                        <LoadingSpinner />
                    ) : selectedTemplate ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
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
                                    {reportData.map((item, index) => (
                                        <tr key={item.id} className={index % 2 === 0 ? (isDarkMode ? 'bg-gray-800' : 'bg-white') : (isDarkMode ? 'bg-gray-700' : 'bg-gray-50')}>
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
                        <p className="text-center text-gray-500">Select a template to preview</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportGenerator; 