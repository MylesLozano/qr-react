# Code Style Guide

## Naming

- **Components**: PascalCase (e.g., `InventoryList`)
- **Hooks**: camelCase with `use` prefix (e.g., `useAuth`)
- **Functions**: camelCase (e.g., `handleSubmit`)
- **Constants**: UPPERCASE (e.g., `MAX_QR_SIZE`)
- **Files**: Match component name (e.g., `Button.jsx`)

## Component Structure

1. Imports
2. Constants
3. Component definition
4. State and effects
5. Handlers
6. Return JSX
7. Export

## Formatting

- Use single quotes
- 2 space indentation
- Max line length: 120 characters
- Semicolons required

## Comments

- JSDoc for components and hooks
- Only comment complex logic
- No commented-out code

## Best Practices

- Avoid nested ternaries
- One component per file
- Extract reusable logic to hooks
- Use destructuring for props
- Handle all loading/error states

```jsx
// Example component structure
import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import Button from './Button';

const MAX_ITEMS = 100;

/**
 * MyComponent description
 * @component
 * @param {Object} props - Component props
 */
function MyComponent({ items }) {
  const [state, setState] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    // Effect logic
  }, [dependencies]);

  const handleAction = () => {
    // Event handler logic
  };

  // Helper function
  const processData = (data) => {
    // Processing logic
  };

  return <div>{/* JSX structure */}</div>;
}

export default MyComponent;
```

## State Management

- Use React hooks for state management
- Organize related state with `useReducer` when appropriate
- Keep local component state for UI-specific concerns
- Use context for shared state across components (auth, theme)

## Error Handling

- Use try/catch blocks for async operations
- Implement error boundaries for component error handling
- Log errors with appropriate severity levels
- Display user-friendly error messages

## Documentation

- Use JSDoc comments for components, hooks, and utility functions
- Document props, return values, and side effects
- Maintain examples for complex components

## Performance Considerations

- Use memoization with `useMemo` and `useCallback` for expensive operations
- Implement virtualization for long lists (react-window)
- Avoid unnecessary re-renders

## Commit Messages

Format: `type(scope): description`

Types:

- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes (formatting, etc.)
- refactor: Code changes that neither fix bugs nor add features
- perf: Performance improvements
- test: Adding or updating tests
- chore: Changes to the build process or auxiliary tools

## Code Review Checklist

- Code follows project conventions
- No unnecessary code duplication
- Functionality meets requirements
- Error handling is appropriate
- Proper test coverage (where applicable)
- Comments are clear and necessary
- Performance considerations addressed

---

This guide should be treated as a living document and updated as best practices evolve.
