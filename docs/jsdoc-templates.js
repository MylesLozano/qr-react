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
// eslint-disable-next-line no-unused-vars
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
// eslint-disable-next-line no-unused-vars
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
// eslint-disable-next-line no-unused-vars
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
