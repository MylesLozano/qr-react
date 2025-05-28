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
          position: 'right',
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

      <div className="flex flex-col md:flex-row gap-4">
        {/* Chart Section */}
        <div className="flex-1 h-52 md:h-44 relative mb-4 md:mb-0">
          <Pie data={chartData} options={chartOptions} />
        </div>

        {/* Stats Cards Section */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <div
            className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-100'} shadow-sm`}
          >
            <p className="text-sm text-opacity-75">With QR</p>
            <p className="text-xl font-bold">{safeStats.totalWithQr}</p>
          </div>
          <div
            className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'} shadow-sm`}
          >
            <p className="text-sm text-opacity-75">Without QR</p>
            <p className="text-xl font-bold">{safeStats.totalWithoutQr}</p>
          </div>
          <div
            className={`p-3 rounded-lg text-center ${isDarkMode ? 'bg-green-900/30' : 'bg-green-100'} shadow-sm`}
          >
            <p className="text-sm text-opacity-75">Coverage</p>
            <p className="text-xl font-bold">{qrPercentage}%</p>
          </div>
        </div>
      </div>

      {/* Lab-specific QR Stats */}
      {Object.keys(safeStats.byLab).length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">QR Coverage by Laboratory</h3>
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(safeStats.byLab).map(([lab, stats]) => {
              const labCoverage = stats.totalItems > 0 
                ? Math.round((stats.withQR / stats.totalItems) * 100) 
                : 0;
              
              return (
                <div 
                  key={lab} 
                  className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium truncate max-w-[120px]" title={lab}>{lab}</h4>
                      <div className="text-sm mt-1">
                        <span>Total Items: {stats.totalItems}</span>
                        <span className="mx-2">•</span>
                        <span>With QR: {stats.withQR}</span>
                        <span className="mx-2">•</span>
                        <span>Without QR: {stats.withoutQR}</span>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${labCoverage >= 80 ? 'text-green-500' : labCoverage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                      {labCoverage}%
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className={`mt-2 h-2 w-full bg-gray-300 rounded-full overflow-hidden ${isDarkMode ? 'bg-gray-600' : ''}`}>
                    <div 
                      className={`h-full ${labCoverage >= 80 ? 'bg-green-500' : labCoverage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
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
