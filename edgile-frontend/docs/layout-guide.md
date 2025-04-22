# Layout Guide for Edgile Application

## Dashboard Layout Consistency

All administrative, faculty, and student dashboard pages **must** use the `DashboardWrapper` component to ensure consistent navigation with navbar and sidebar throughout the application.

### How to Implement

There are two ways to include the `DashboardWrapper` in your pages:

#### 1. Direct Component Usage (Recommended)

Import and wrap your component's return statement with the `DashboardWrapper`:

```tsx
import DashboardWrapper from '../components/DashboardWrapper';

const YourPage: React.FC = () => {
  // Component logic

  return (
    <DashboardWrapper>
      <div className="your-content-container">
        {/* Your page content goes here */}
      </div>
    </DashboardWrapper>
  );
};
```

Remember to wrap all return statements, including loading and error states:

```tsx
if (loading) {
  return (
    <DashboardWrapper>
      <div className="loading-container">
        {/* Loading indicator */}
      </div>
    </DashboardWrapper>
  );
}

if (error) {
  return (
    <DashboardWrapper>
      <div className="error-container">
        {/* Error message */}
      </div>
    </DashboardWrapper>
  );
}
```

#### 2. Higher-Order Component (Alternative)

For pages that don't need conditional rendering, you can use the `withDashboard` higher-order component:

```tsx
import withDashboard from '../components/withDashboard';

const YourPage: React.FC = () => {
  // Component logic

  return (
    <div className="your-content-container">
      {/* Your page content goes here */}
    </div>
  );
};

export default withDashboard(YourPage);
```

### Pages That Should Use DashboardWrapper

- All pages under `/admin/` routes **except** authentication pages:
  - ✅ Dashboard
  - ✅ Profile
  - ✅ FacultyPage
  - ✅ RegistrationCodes
  - ✅ Any other admin dashboard pages

- All pages under `/faculty/` routes **except** authentication pages:
  - ✅ FacultyDashboard
  - ✅ Profile
  - ✅ Course pages
  - ✅ Any other faculty dashboard pages

- All pages under `/student/` routes **except** authentication pages:
  - ✅ StudentDashboard
  - ✅ Profile
  - ✅ Course pages
  - ✅ Any other student dashboard pages

### Pages That Should NOT Use DashboardWrapper

- Authentication pages:
  - ❌ Login
  - ❌ Register
  - ❌ ForgotPassword
  - ❌ ResetPassword

- Public pages:
  - ❌ LandingPage
  - ❌ About
  - ❌ Contact

## Troubleshooting

If your navigation or sidebar isn't appearing on a dashboard page:

1. Check if the page is wrapped with `DashboardWrapper`
2. Verify that all conditional rendering paths include the wrapper
3. Make sure the DashboardWrapper is importing correctly from the right path

## Example Implementation

Here's a complete example of a page with proper DashboardWrapper usage:

```tsx
import React, { useState, useEffect } from 'react';
import DashboardWrapper from '../../components/DashboardWrapper';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

const ExamplePage: React.FC = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get('/some-endpoint');
        setData(response.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardWrapper>
        <div className="loading-spinner-container">
          <div className="spinner"></div>
        </div>
      </DashboardWrapper>
    );
  }

  if (error) {
    return (
      <DashboardWrapper>
        <div className="error-container">
          <p>Error: {error}</p>
        </div>
      </DashboardWrapper>
    );
  }

  return (
    <DashboardWrapper>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Example Page</h1>
        <div className="content-area">
          {/* Your main content here */}
        </div>
      </div>
    </DashboardWrapper>
  );
};

export default ExamplePage;
``` 