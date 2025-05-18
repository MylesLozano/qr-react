# Line Length Compliance Options

## Overview

We've made significant progress on improving code quality in the QCheckCITE-React codebase. There are still a few files with lines exceeding our maximum line length limit of 100 characters.

## Current Status

We've successfully addressed:

- All console.log statements have been converted to console.info, console.warn, or console.error
- All JSX template files have appropriate eslint-disable comments
- Syntax and formatting issues throughout the codebase
- Fixed most line length issues in critical files

## Remaining Issues

Several files still have max-len warnings. Below are options for addressing them:

### Option 1: Increase ESLint line length limit

You can increase the max-len limit in eslint.config.js from 100 to 120 characters, which would resolve most of the remaining issues without code changes.

```javascript
'max-len': ['warn', {
  'code': 120,
  'ignoreComments': true,
  'ignoreStrings': true,
  'ignoreTemplateLiterals': true,
  'ignoreUrls': true,
  'ignoreRegExpLiterals': true
}],
```

### Option 2: Add eslint-disable comments

You can add `// eslint-disable-next-line max-len` comments above specific long lines. This is useful for lines that are difficult to split, such as URLs or JSX with many props.

### Option 3: Manual line splitting

For JSX components with many props, split them onto separate lines:

Before:

```jsx
<Button size="sm" variant="primary" onClick={handleSubmit} disabled={isSubmitting} className="mr-2">
  Submit
</Button>
```

After:

```jsx
<Button size="sm" variant="primary" onClick={handleSubmit} disabled={isSubmitting} className="mr-2">
  Submit
</Button>
```

### Option 4: Ignore specific files

Add the troublesome files to the ESLint ignore list if they're generated files or rarely changed.

## Recommendation

We recommend using a combination of approaches:

1. Increase max-len to 120 for most files
2. For JSX components, split multi-prop elements onto separate lines
3. Add eslint-disable comments only when absolutely necessary

## Files with Remaining Line Length Issues

```
scripts/generateHealthReport.js
src/Login.jsx
src/components/LoadingSpinner.jsx
src/components/SplashScreen.jsx
src/dashboard/BaseDashboard.jsx
src/dashboard/UnifiedReporting.jsx
src/dashboard/admin/ReportGenerator.jsx
src/main.jsx
```

## Next Steps

1. Review this document with your team
2. Decide on the preferred approach
3. Implement the chosen solutions
4. Run a final lint check to verify all issues are resolved
