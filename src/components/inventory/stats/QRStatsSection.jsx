import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

function QRStatsSection({ qrStats = {}, isDarkMode }) {
  // Validate and provide defaults for qrStats
  const safeStats = {
    totalWithQr: Number(qrStats?.totalWithQr) || 0,
    totalWithoutQr: Number(qrStats?.totalWithoutQr) || 0,
    byLab: qrStats?.byLab || {}
  };

  // Calculate percentage with QR codes
  const totalItems = safeStats.totalWithQr + safeStats.totalWithoutQr;
  const qrPercentage = totalItems > 0 ? Math.round((safeStats.totalWithQr / totalItems) * 100) : 0;

  // Prepare chart data
  const chartData = useMemo(
    () => ({
      labels: ['With QR Code', 'Without QR Code'],
      datasets: [
        {
          data: [safeStats.totalWithQr, safeStats.totalWithoutQr],
          backgroundColor: [
            '#60A5FA', // Blue for items with QR
            '#9CA3AF', // Gray for items without QR
          ],
          borderWidth: 1,
          borderColor: isDarkMode ? '#374151' : '#F3F4F6',
        },
      ],
    }),
    [safeStats.totalWithQr, safeStats.totalWithoutQr, isDarkMode]
  );

  // Chart options
  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDarkMode ? '#E5E7EB' : '#374151',
            padding: 15,
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
              const percentage = totalItems > 0 ? Math.round((value / totalItems) * 100) : 0;
              return `${label}: ${value} (${percentage}%)`;
            },
          },
        },
      },
    }),
    [isDarkMode, totalItems]
  );

  return (
    <div
      className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md h-full relative z-0`}
    >
      <h2 className="text-xl font-semibold mb-4">QR Code Statistics</h2>

      {/* Mobile and small screens: Stack vertically */}
      <div className="flex flex-col xl:flex-row gap-6">
        {/* Chart Section */}
        <div className="w-full xl:w-1/2">
          <div className="h-64 sm:h-72 lg:h-80 xl:h-64 relative mb-4">
            <Pie data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Stats Cards Section */}
        <div className="w-full xl:w-1/2 flex flex-col justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-4">
            <div
              className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} shadow-sm`}
            >
              <p className="text-sm text-opacity-75 mb-2">With QR Code</p>
              <p className="text-2xl font-bold">{safeStats.totalWithQr}</p>
            </div>
            <div
              className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} shadow-sm`}
            >
              <p className="text-sm text-opacity-75 mb-2">Without QR Code</p>
              <p className="text-2xl font-bold">{safeStats.totalWithoutQr}</p>
            </div>
            <div
              className={`p-4 rounded-lg text-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} shadow-sm`}
            >
              <p className="text-sm text-opacity-75 mb-2">QR Coverage</p>
              <p className="text-2xl font-bold">{qrPercentage}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lab-specific QR Stats */}
      {Object.keys(safeStats.byLab).length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">QR Coverage by Laboratory</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
            {Object.entries(safeStats.byLab).map(([lab, stats]) => {
              const labCoverage = stats.totalItems > 0 
                ? Math.round((stats.withQR / stats.totalItems) * 100) 
                : 0;
              
              return (
                <div 
                  key={lab} 
                  className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1 min-w-0 pr-4">
                      <h4 className="font-medium truncate" title={lab}>{lab}</h4>
                      <div className="text-sm mt-2 space-y-1">
                        <div>Total Items: <span className="font-medium">{stats.totalItems}</span></div>
                        <div className="flex gap-4">
                          <span>With QR: <span className="font-medium">{stats.withQR}</span></span>
                          <span>Without QR: <span className="font-medium">{stats.withoutQR}</span></span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-2xl font-bold flex-shrink-0 ${labCoverage >= 80 ? 'text-green-500' : labCoverage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {labCoverage}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className={`h-3 w-full bg-gray-300 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : ''}`}>
                    <div 
                      className={`h-full transition-all duration-300 ${labCoverage >= 80 ? 'bg-green-500' : labCoverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${labCoverage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

QRStatsSection.propTypes = {
  qrStats: PropTypes.shape({
    totalWithQr: PropTypes.number,
    totalWithoutQr: PropTypes.number,
    byLab: PropTypes.object,
  }),
  isDarkMode: PropTypes.bool,
};

export default React.memo(QRStatsSection);