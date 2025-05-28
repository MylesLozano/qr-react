import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import PropTypes from 'prop-types';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function InventoryStatsCharts({ items = [], isDarkMode }) {  // Define chart colors that work with both light and dark mode
  const chartColors = {
    // Condition colors
    good: '#10B981', // Green
    used: '#FBBF24', // Yellow/Amber
    damaged: '#EF4444', // Red
    unknown: '#6B7280', // Gray

    // Lab colors
    itLab: '#3B82F6', // Blue
    emcLab: '#8B5CF6', // Purple
    others: '#6B7280', // Gray
    
    // Status colors
    available: '#059669', // Emerald
    inUse: '#3B82F6', // Blue
    maintenance: '#F59E0B', // Amber
    retired: '#9CA3AF', // Gray
  };

  // Calculate lab statistics
  const labStats = useMemo(() => {
    const stats = {
      'IT Lab': 0,
      'EMC Lab': 0,
      Others: 0,
    };

    if (!Array.isArray(items) || items.length === 0) return stats;

    items.forEach((item) => {
      if (!item || !item.lab) {
        stats['Others']++;
      } else if (item.lab === 'IT Lab') {
        stats['IT Lab']++;
      } else if (item.lab === 'EMC Lab') {
        stats['EMC Lab']++;
      } else {
        stats['Others']++;
      }
    });

    return stats;
  }, [items]);
  // Calculate condition statistics
  const conditionStats = useMemo(() => {
    const stats = {
      Good: 0,
      Used: 0,
      Damaged: 0,
      Unknown: 0,
    };

    if (!Array.isArray(items) || items.length === 0) return stats;

    items.forEach((item) => {
      if (!item || !item.itemCondition) {
        stats['Unknown']++;
      } else if (item.itemCondition === 'Good' || item.itemCondition === 'New') {
        stats['Good']++;
      } else if (item.itemCondition === 'Used') {
        stats['Used']++;
      } else if (item.itemCondition === 'Damaged' || item.itemCondition === 'Defective') {
        stats['Damaged']++;
      } else {
        stats['Unknown']++;
      }
    });

    return stats;
  }, [items]);
  
  // Calculate status statistics
  const statusStats = useMemo(() => {
    const stats = {
      Available: 0,
      'In Use': 0,
      'Under Maintenance': 0,
      Retired: 0,
      Other: 0,
    };

    if (!Array.isArray(items) || items.length === 0) return stats;

    items.forEach((item) => {
      if (!item || !item.status) {
        stats['Other']++;
      } else if (item.status === 'Available') {
        stats['Available']++;
      } else if (item.status === 'In Use') {
        stats['In Use']++;
      } else if (item.status === 'Under Maintenance') {
        stats['Under Maintenance']++;
      } else if (item.status === 'Retired') {
        stats['Retired']++;
      } else {
        stats['Other']++;
      }
    });

    return stats;
  }, [items]);

  // Prepare lab chart data
  const labChartData = {
    labels: Object.keys(labStats),
    datasets: [
      {
        data: Object.values(labStats),
        backgroundColor: [chartColors.itLab, chartColors.emcLab, chartColors.others],
        borderWidth: 1,
        borderColor: isDarkMode ? '#374151' : '#F3F4F6',
      },
    ],
  };
  // Prepare condition chart data
  const conditionChartData = {
    labels: Object.keys(conditionStats),
    datasets: [
      {
        data: Object.values(conditionStats),
        backgroundColor: [
          chartColors.good,
          chartColors.used,
          chartColors.damaged,
          chartColors.unknown,
        ],
        borderWidth: 1,
        borderColor: isDarkMode ? '#374151' : '#F3F4F6',
      },
    ],
  };
  
  // Prepare status chart data
  const statusChartData = {
    labels: Object.keys(statusStats),
    datasets: [
      {
        data: Object.values(statusStats),
        backgroundColor: [
          chartColors.available,
          chartColors.inUse,
          chartColors.maintenance,
          chartColors.retired,
          chartColors.unknown,
        ],
        borderWidth: 1,
        borderColor: isDarkMode ? '#374151' : '#F3F4F6',
      },
    ],
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: isDarkMode ? '#E5E7EB' : '#374151',
          padding: 20,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: isDarkMode ? '#4B5563' : '#FFF',
        titleColor: isDarkMode ? '#E5E7EB' : '#111827',
        bodyColor: isDarkMode ? '#E5E7EB' : '#1F2937',
        borderColor: isDarkMode ? '#6B7280' : '#E5E7EB',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = total === 0 ? 0 : Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };  return (
    <div
      className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md h-full relative z-0`}
    >
      <h2 className="text-xl font-semibold mb-4">Inventory Statistics</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Distribution Chart */}
        <div className="bg-opacity-50 rounded-lg p-3">
          <h3 className="text-lg font-medium mb-2 text-center">Lab Distribution</h3>
          <div className="h-56 lg:h-48 relative">
            <Doughnut data={labChartData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            {Object.entries(labStats).map(([lab, count]) => (
              <div
                key={lab}
                className={`p-2 rounded text-center ${
                  lab === 'IT Lab'
                    ? isDarkMode
                      ? 'bg-blue-900/30'
                      : 'bg-blue-100'
                    : lab === 'EMC Lab'
                      ? isDarkMode
                        ? 'bg-purple-900/30'
                        : 'bg-purple-100'
                      : isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-100'
                } shadow-sm`}
              >
                <span className="text-xs block truncate max-w-[60px]" title={lab}>{lab}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Condition Distribution Chart */}
        <div className="bg-opacity-50 rounded-lg p-3">
          <h3 className="text-lg font-medium mb-2 text-center">Condition Distribution</h3>
          <div className="h-56 lg:h-48 relative">
            <Doughnut data={conditionChartData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-4 gap-2 mt-4">
            {Object.entries(conditionStats).map(([condition, count]) => (
              <div
                key={condition}
                className={`p-2 rounded text-center ${
                  condition === 'Good'
                    ? isDarkMode
                      ? 'bg-green-900/30'
                      : 'bg-green-100'
                    : condition === 'Used'
                      ? isDarkMode
                        ? 'bg-yellow-900/30'
                        : 'bg-yellow-100'
                      : condition === 'Damaged'
                        ? isDarkMode
                          ? 'bg-red-900/30'
                          : 'bg-red-100'
                        : isDarkMode
                          ? 'bg-gray-700'
                          : 'bg-gray-100'
                } shadow-sm`}
              >
                <span className="text-xs block truncate max-w-[60px]" title={condition}>{condition}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Status Distribution Chart */}
        <div className="bg-opacity-50 rounded-lg p-3 lg:col-span-2">
          <h3 className="text-lg font-medium mb-2 text-center">Status Distribution</h3>
          <div className="h-56 lg:h-48 relative">
            <Doughnut data={statusChartData} options={chartOptions} />
          </div>
          <div className="grid grid-cols-5 gap-2 mt-4">
            {Object.entries(statusStats).map(([status, count]) => (
              <div
                key={status}
                className={`p-2 rounded text-center ${
                  status === 'Available'
                    ? isDarkMode
                      ? 'bg-emerald-900/30'
                      : 'bg-emerald-100'
                    : status === 'In Use'
                      ? isDarkMode
                        ? 'bg-blue-900/30'
                        : 'bg-blue-100'
                      : status === 'Under Maintenance'
                        ? isDarkMode
                          ? 'bg-amber-900/30'
                          : 'bg-amber-100'
                        : status === 'Retired'
                          ? isDarkMode
                            ? 'bg-gray-700'
                            : 'bg-gray-200'
                          : isDarkMode
                            ? 'bg-gray-700'
                            : 'bg-gray-100'
                } shadow-sm`}
              >
                <span className="text-xs block truncate max-w-[60px]" title={status}>{status}</span>
                <span className="font-bold">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

InventoryStatsCharts.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      lab: PropTypes.string,
      itemCondition: PropTypes.string,
      status: PropTypes.string,
    })
  ),
  isDarkMode: PropTypes.bool,
};

export default InventoryStatsCharts;
