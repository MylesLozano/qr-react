import React from 'react';
import PropTypes from 'prop-types';

function QRStatsSection({ qrStats = {}, isDarkMode }) {
  // Validate and provide defaults for qrStats
  const safeStats = {
    totalWithQr: Number(qrStats?.totalWithQr) || 0,
    totalWithoutQr: Number(qrStats?.totalWithoutQr) || 0
  };

  // Calculate percentage with QR codes
  const totalItems = safeStats.totalWithQr + safeStats.totalWithoutQr;
  const qrPercentage = totalItems > 0 
    ? Math.round((safeStats.totalWithQr / totalItems) * 100) 
    : 0;

  return (
    <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className="text-xl font-semibold mb-2">QR Code Statistics</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-gray-500">Items with QR</p>
          <p className="text-2xl font-bold">{safeStats.totalWithQr}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Items without QR</p>
          <p className="text-2xl font-bold">{safeStats.totalWithoutQr}</p>
        </div>
        <div className="col-span-2 md:col-span-1">
          <p className="text-sm text-gray-500">Coverage</p>
          <p className="text-2xl font-bold">{qrPercentage}%</p>
        </div>
      </div>
    </div>
  );
}

QRStatsSection.propTypes = {
  qrStats: PropTypes.shape({
    totalWithQr: PropTypes.number,
    totalWithoutQr: PropTypes.number
  }),
  isDarkMode: PropTypes.bool
};

export default React.memo(QRStatsSection);