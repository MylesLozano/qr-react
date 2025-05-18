# Contributing to QCheckCITE

## Setup

1. **Requirements**

   - Node.js (v18+)
   - npm (v8+)

2. **Installation**

   ```
   git clone <repository-url>
   cd qr-react
   npm install
   ```

3. **Development**
   ```
   npm run dev
   ```

## Workflow

1. Create a feature branch
2. Make your changes
3. Format code: `npm run format`
4. Run linting: `npm run lint`
5. Submit PR

## Code Style

Follow the [Code Style Guide](./docs/CODE_STYLE.md)

## Testing

- Test on desktop and mobile views
- Handle error states
- Check accessibility

## Commit Messages

Use clear, descriptive commit messages:

- feat: Add new feature
- fix: Fix a bug
- docs: Update documentation
- style: Format code
- refactor: Restructure code

1. **Branch naming convention**

   - `feature/description` - For new features
   - `bugfix/description` - For bug fixes
   - `refactor/description` - For code refactoring
   - `docs/description` - For documentation updates

2. **Code style**

   - Follow the project's [CODE_STYLE.md](./CODE_STYLE.md) guidelines
   - Run `npm run format` to auto-format your code
   - Run `npm run lint:fix` to fix linting issues

3. **Committing changes**

   - Use conventional commit messages (`feat:`, `fix:`, `docs:`, etc.)
   - Keep commits focused on a single logical change

4. **Pull requests**
   - Create a pull request against the `main` branch
   - Fill out the PR template with all required information
   - Link to any related issues
   - Wait for code review and address feedback

## Project Structure

- `/src/components/` - Reusable UI components
- `/src/context/` - React context providers
- `/src/hooks/` - Custom React hooks
- `/src/utils/` - Utility functions
- `/src/dashboard/` - Dashboard and feature pages
- `/src/assets/` - Static assets

## Common Tasks

### Creating a new component

1. Create a new file in the appropriate directory
2. Use the JSDoc template from `docs/jsdoc-templates.js`
3. Follow the component structure in CODE_STYLE.md

### Adding a new page

1. Create the page component in the appropriate dashboard directory
2. Add the route in App.jsx
3. Add any necessary navigation links

### Working with Firebase

- Use the existing hooks and utilities for Firebase operations
- Follow security best practices for database operations
- Add audit logging for important actions

## Testing

- Write unit tests for utility functions
- Test components across different screen sizes
- Verify your changes work in both light and dark mode

## Deployment

The project uses Firebase Hosting for deployment:

1. Build the production version:

   ```powershell
   npm run build
   ```

2. Deploy to Firebase:
   ```powershell
   firebase deploy
   ```

## Need Help?

If you have questions or need help, please:

- Check existing documentation
- Review closed issues and PRs
- Ask in the project's communication channels

Thank you for contributing to QCheckCITE!
