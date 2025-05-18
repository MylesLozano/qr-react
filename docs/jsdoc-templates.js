/**
 * JSDoc Templates
 */

/**
 * @component
 * @param {Object} props
 * @param {string} props.name - Description
 * @param {boolean} [props.optional] - Optional with default
 * @returns {JSX.Element}
 */
// eslint-disable-next-line no-unused-vars
function ComponentTemplate({ name, optional = false }) {
  return <div>{name}</div>;
}

/**
 * @hook
 * @param {string} param - Parameter description
 * @returns {Object} Hook return values
 * @returns {boolean} return.isLoading - Loading state
 * @returns {function} return.handleAction - Action handler
 */
// eslint-disable-next-line no-unused-vars
function useHookTemplate(param) {
  return {
    isLoading: false,
    handleAction: () => {},
  };
}

/**
 * @function
 * @param {Object} param - Input object
 * @param {string} param.id - Identifier
 * @returns {Object} Result
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
