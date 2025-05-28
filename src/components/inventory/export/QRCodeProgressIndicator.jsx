/**
 * QR Code Progress Indicator Component
 * 
 * This component provides a visual indicator for QR code processing,
 * including download preparation, generation and exporting.
 */

import PropTypes from 'prop-types';

/**
 * Progress indicator component for QR code operations
 * 
 * @param {Object} props - Component properties
 * @param {boolean} props.isDarkMode - Whether dark mode is active
 * @param {Object} props.progress - Progress information
 * @param {number} props.progress.current - Current progress position
 * @param {number} props.progress.total - Total items to process
 * @param {string} props.operationType - Type of operation ('exporting', 'generating', 'preparing')
 * @returns {JSX.Element} - Rendered progress indicator
 */
function QRCodeProgressIndicator({ isDarkMode, progress, operationType }) {
  // Get appropriate title based on operation type
  const getProgressTitle = () => {
    switch (operationType) {
      case 'exporting':
        return 'Exporting QR Codes';
      case 'generating':
        return 'Generating QR Codes';
      case 'preparing':
      default:
        return 'Preparing QR Codes Preview';
    }
  };

  // Get appropriate color based on operation type
  const getProgressColor = () => {
    switch (operationType) {
      case 'exporting':
        return 'bg-blue-600';
      case 'generating':
        return 'bg-green-600';
      case 'preparing':
      default:
        return 'bg-purple-600';
    }
  };

  // Calculate percentage safely (avoid division by zero)
  const calculatePercentage = () => {
    const total = Math.max(progress.total, 1); // Ensure denominator is at least 1
    return (progress.current / total) * 100;
  };

  return (
    <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-md relative z-10`}>
      <h2 className="text-lg font-semibold mb-2">
        {getProgressTitle()}
      </h2>
      <div className="mb-2">
        <p>Processing {progress.current} of {progress.total} items...</p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div 
          className={`${getProgressColor()} h-2.5 rounded-full transition-all duration-300`}
          style={{ width: `${calculatePercentage()}%` }}
        ></div>
      </div>
    </div>
  );
}

QRCodeProgressIndicator.propTypes = {
  isDarkMode: PropTypes.bool.isRequired,
  progress: PropTypes.shape({
    current: PropTypes.number.isRequired,
    total: PropTypes.number.isRequired
  }).isRequired,
  operationType: PropTypes.oneOf(['exporting', 'generating', 'preparing']).isRequired
};

export default QRCodeProgressIndicator;
