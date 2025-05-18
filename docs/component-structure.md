# React Component Structure Guide

This document outlines the recommended structure for React components in the QCheckCITE project.

## Component Organization

Components should be organized into directories based on feature or functionality:

```
src/
  components/
    Button.jsx             # Generic UI components
    LoadingSpinner.jsx
    ErrorBoundary.jsx
    inventory/             # Feature-specific components
      lists/
        InventoryList.jsx
      forms/
        AddEditForm.jsx
      modals/
        QRCodePreview.jsx
```

## Component Structure

Each component should follow this general structure:

```jsx
/**
 * Component description
 */

// Imports (grouped by type)
import { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { useTheme } from '../hooks/useTheme';
import Button from './Button';

// Constants (if any)
const MAX_ITEMS = 100;

/**
 * Component JSDoc
 */
function ComponentName({ param1, param2 = 'default' }) {
  // State
  const [state, setState] = useState(initialState);

  // Hooks
  const { isDarkMode } = useTheme();

  // Memoization
  const processedData = useMemo(() => {
    // Process data
  }, [dependencies]);

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  // Event handlers
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependencies]);

  // Render methods for complex UI sections
  const renderListItem = (item) => (
    <li key={item.id}>{item.name}</li>
  );

  // Conditional rendering
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  // Main render
  return (
    <div className={`container ${isDarkMode ? 'dark' : 'light'}`}>
      <h2>{param1}</h2>
      <div className="content">
        {/* JSX content */}
      </div>
    </div>
  );
}

// PropTypes validation
ComponentName.propTypes = {
  param1: PropTypes.string.isRequired,
  param2: PropTypes.string
};

export default ComponentName;
```

## Class Components

While we prefer functional components with hooks, if you must use class components:

```jsx
import React, { Component } from 'react';
import PropTypes from 'prop-types';

class ComponentName extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // Initial state
    };
  }

  componentDidMount() {
    // Lifecycle logic
  }

  handleClick = () => {
    // Handler logic
  };

  render() {
    const { param1 } = this.props;
    const { stateValue } = this.state;

    return (
      <div>
        {/* JSX content */}
      </div>
    );
  }
}

ComponentName.propTypes = {
  param1: PropTypes.string.isRequired
};

export default ComponentName;
```

## Context Providers

When creating context providers:

```jsx
import { createContext, useState, useContext } from 'react';

// Create context with a default value
const MyContext = createContext(null);

// Create provider component
export function MyContextProvider({ children }) {
  const [value, setValue] = useState(initialValue);

  // Define methods
  const updateValue = (newValue) => {
    setValue(newValue);
  };

  // Create context value object
  const contextValue = {
    value,
    updateValue
  };

  return (
    <MyContext.Provider value={contextValue}>
      {children}
    </MyContext.Provider>
  );
}

// Create custom hook for using this context
export function useMyContext() {
  const context = useContext(MyContext);
  if (context === null) {
    throw new Error('useMyContext must be used within a MyContextProvider');
  }
  return context;
}
```

## Best Practices

1. **Component Size**: Keep components small and focused on a single responsibility
2. **Prop Naming**: Use clear, descriptive names for props
3. **Default Props**: Provide sensible defaults for optional props
4. **Error Handling**: Include error states and fallbacks
5. **Loading States**: Always handle loading states for async operations
6. **Destructuring**: Use destructuring for props and state
7. **Memoization**: Use `useMemo` and `useCallback` for expensive operations

## Performance Considerations

- Use React.memo() for pure functional components that render often with the same props
- Avoid creating functions inside render that are passed to child components
- Use the useCallback hook for event handlers passed to child components
- Use the useMemo hook for expensive calculations
- Use the React DevTools Profiler to identify performance bottlenecks
