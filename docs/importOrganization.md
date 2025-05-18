# Import Organization Guidelines

Consistent organization of import statements makes code more readable and maintainable. Follow these guidelines for organizing imports in all JavaScript/JSX files.

## Import Order

Imports should be organized in the following order, with a blank line between each group:

1. **React and React-related libraries**
   ```jsx
   import React, { useState, useEffect, useCallback } from 'react';
   import { useParams, useNavigate, Link } from 'react-router-dom';
   ```

2. **External third-party libraries**
   ```jsx
   import { toast } from 'react-toastify';
   import { collection, query, where } from 'firebase/firestore';
   import PropTypes from 'prop-types';
   ```

3. **Firebase services**
   ```jsx
   import { db, auth, logAudit } from '../firebase';
   ```

4. **Custom hooks**
   ```jsx
   import { useAuth } from '../hooks/useAuth';
   import { useTheme } from '../hooks/useTheme';
   ```

5. **Utility functions**
   ```jsx
   import { sanitizeInput } from '../utils/inventoryUtils';
   import { canPerformAction } from '../utils/roleUtils';
   ```

6. **Components**
   ```jsx
   import Button from '../components/Button';
   import LoadingSpinner from '../components/LoadingSpinner';
   ```

7. **Assets and styles**
   ```jsx
   import LogoImage from '../assets/QCheckCITE_Logo.png';
   import './ComponentStyle.css';
   ```

## Example

```jsx
// React and React-related libraries
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// External third-party libraries
import { toast } from 'react-toastify';
import { format } from 'date-fns';

// Firebase services
import { db, logAudit } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

// Custom hooks
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

// Utility functions
import { sanitizeInput, validateItem } from '../utils/inventoryUtils';
import { canPerformAction } from '../utils/roleUtils';

// Components
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorBoundary from '../components/ErrorBoundary';

// Assets
import LogoImage from '../assets/QCheckCITE_Logo.png';
```

## Additional Guidelines

- Destructure imports when appropriate to improve readability
- Only import what you need, avoid importing entire libraries
- Keep alphabetical ordering within each group when possible
- Use absolute imports for external packages and relative imports for local files
- Avoid using default exports when possible to improve code searchability
