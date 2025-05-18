# Development Guidelines

## Component Structure

- Components in PascalCase (`InventoryList.jsx`)
- Group by feature: `/components/inventory/lists/InventoryList.jsx`
- One component per file

## Code Style

- Single quotes
- 2 space indentation
- Max line: 120 chars
- Semicolons required

## Import Order

1. React/React libraries
2. External libraries
3. Internal components/hooks
4. Assets/styles

## JSX Style

- Props on new lines for readability
- Destructure props
- Handle loading/error states

## Best Practices

- Extract reusable logic to hooks
- Use meaningful component/variable names
- Add JSDoc for components and complex functions
- Avoid nested ternaries
- Use proper error handling

## Formatting

Run `npm run format` before committing changes
