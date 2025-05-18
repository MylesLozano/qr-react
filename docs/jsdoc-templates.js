/**
 * JSDoc Templates for QCheckCITE
 * 
 * These templates can be used to maintain consistent documentation across components.
 * Copy and paste these templates when creating new files or documenting existing ones.
 */

/**
 * Component Template
 * 
 * @component
 * @param {Object} props - Component props
 * @param {string} props.name - Description of this prop
 * @param {boolean} [props.optional] - Optional prop with default value
 * @returns {JSX.Element} Rendered component
 */
function ComponentTemplate({ name, optional = false }) {
  return <div>{name}</div>;
}

/**
 * Custom Hook Template
 * 
 * @hook
 * @param {string} param - Parameter description
 * @returns {Object} The returned value
 * @returns {boolean} return.isLoading - Whether the operation is in progress
 * @returns {function} return.handleAction - Function to perform an action
 */
function useHookTemplate(param) {
  return {
    isLoading: false,
    handleAction: () => {}, 
  };
}

/**
 * Utility Function Template
 * 
 * @function
 * @param {Object} param - The input object
 * @param {string} param.id - A unique identifier
 * @returns {Object} The transformed object
 */
function utilityTemplate({ id }) {
  return { processedId: id };
}

// Examples of well-structured multi-line comments:

/**
 * This is a well-formatted multi-line comment that explains the purpose
 * of a complex operation. It can span multiple lines and provides context
 * for other developers.
 * 
 * It may include:
 * - Important considerations
 * - Implementation details
 * - References to specifications
 */

// For shorter explanations, use single-line comments like this
