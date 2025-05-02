import React from 'react';

function QRStatsSection({ qrStats, isDarkMode }) {
  return (
    <div className={`flex-1 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
      <h2 className="text-xl font-semibold mb-2">QR Code Statistics</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-500">Items with QR</p>
          <p className="text-2xl font-bold">{qrStats.totalWithQr}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Items without QR</p>
          <p className="text-2xl font-bold">{qrStats.totalWithoutQr}</p>
        </div>
      </div>
    </div>
  );
}

export default React.memo(QRStatsSection);