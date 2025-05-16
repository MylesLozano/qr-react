import React from "react";
import PropTypes from "prop-types";

/**
 * A reusable form field component supporting various input types
 */
function FormField({
  type = "text",
  name,
  placeholder,
  value,
  onChange,
  required = false,
  min,
  options = [],
  error = "",
  className = "",
  isDarkMode,
}) {
  const inputClass = `p-2 rounded border ${
    isDarkMode ? "bg-gray-800 border-gray-700 text-white" : "bg-white border-gray-300"
  } w-full ${error ? "border-red-500" : ""} ${className}`;

  switch (type) {
    case "textarea":
      return (
        <div className="w-full">
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

    case "select":
      return (
        <div className="w-full">
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
                className={`${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-black"}`}
              >
                {option.label}
              </option>
            ))}
          </select>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>
      );

    case "checkbox":
      return (
        <div className="w-full">
          <label className="flex items-center mb-2">
            <input
              type="checkbox"
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

    case "number":
      return (
        <div className="w-full">
          <input
            type="number"
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

    case "date":
      return (
        <div className="w-full">
          <input
            type="date"
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
  type: PropTypes.oneOf(["text", "textarea", "select", "checkbox", "number", "date"]),
  name: PropTypes.string.isRequired,
  placeholder: PropTypes.string,
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.bool
  ]),
  onChange: PropTypes.func.isRequired,
  required: PropTypes.bool,
  min: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired
    })
  ),
  error: PropTypes.string,
  className: PropTypes.string,
  isDarkMode: PropTypes.bool
};

export default React.memo(FormField);
