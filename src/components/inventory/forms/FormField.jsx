import React from 'react';
import PropTypes from 'prop-types';

/**
 * A reusable form field component supporting various input types
 */
function FormField({
  type = 'text',
  name,
  placeholder,
  value,
  onChange,
  required = false,
  min,
  options = [],
  error = '',
  className = '',
  isDarkMode,
  label = '',
}) {
  const inputClass = `p-2 rounded border ${
    isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300'
  } w-full ${error ? 'border-red-500' : ''} ${className}`;

  // Common label element for all input types
  const labelElement = label ? (
    <label
      htmlFor={name}
      className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}
    >
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  ) : null;

  switch (type) {
    case 'textarea':
      return (
        <div className="w-full">
          {labelElement}
          <textarea
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={inputClass}
            rows="2"
            required={required}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );

    case 'select':
      return (
        <div className="w-full">
          {labelElement}
          <select
            name={name}
            value={value}
            onChange={onChange}
            className={`${inputClass} ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-black'}`}
            required={required}
          >
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                className={`${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-black'}`}
              >
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );

    case 'checkbox':
      return (
        <div className="w-full">
          {labelElement}
          <label className="flex items-center mb-2">
            {' '}
            <input
              type="checkbox"
              id={name}
              name={name}
              checked={value}
              onChange={onChange}
              className="mr-2"
              required={required}
            />
            <span className="text-sm">{placeholder}</span>
          </label>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );

    case 'number':
      return (
        <div className="w-full">
          {labelElement}
          <input
            type="number"
            id={name}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            min={min}
            className={inputClass}
            required={required}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );

    case 'date':
      return (
        <div className="w-full">
          {labelElement}
          <input
            type="date"
            id={name}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={inputClass}
            required={required}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );

    default: // text input is the default
      return (
        <div className="w-full">
          {labelElement}
          <input
            type="text"
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className={inputClass}
            required={required}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );
  }
}

FormField.propTypes = {
  type: PropTypes.oneOf(['text', 'textarea', 'select', 'checkbox', 'number', 'date']),
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  error: PropTypes.string,
  className: PropTypes.string,
  isDarkMode: PropTypes.bool,
  label: PropTypes.string,
};

export default React.memo(FormField);
