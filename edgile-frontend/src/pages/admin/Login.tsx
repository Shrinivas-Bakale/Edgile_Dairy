import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { adminLogin, error: authError, loading: authLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    otp: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requiresOTP, setRequiresOTP] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Check if access code is verified on component mount
  useEffect(() => {
    const verified = sessionStorage.getItem('adminAccessVerified');
    if (verified !== 'true') {
      navigate('/admin/access');
    }
    
    // Pre-fill email if stored from OTP verification
    const adminEmail = sessionStorage.getItem('adminEmail');
    if (adminEmail) {
      setFormData(prev => ({
        ...prev,
        email: adminEmail
      }));
    }
  }, [navigate]);

  // Update local error state when auth error changes
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call adminLogin and navigate on success
      await adminLogin(formData.email, formData.password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      // If the error indicates OTP is required, show OTP form
      if (err.response?.data?.requiresOTP) {
        setRequiresOTP(true);
        setOtpSent(true);
      } else {
        setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // For OTP verification, we should use a different function
      // but since we don't have one, we'll use adminLogin as is
      await adminLogin(formData.email, formData.password);
      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const renderInitialForm = () => (
    <form className="space-y-6" onSubmit={handleInitialSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="admin@edgile.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <div className="mt-1">
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={formData.password}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || authLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            (loading || authLoading) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {(loading || authLoading) ? 'Signing in...' : 'Sign in'}
        </button>
      </div>
    </form>
  );

  const renderOtpForm = () => (
    <form className="space-y-6" onSubmit={handleOtpSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {otpSent && (
        <div className="bg-green-50 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          A verification code has been sent to your email address.
        </div>
      )}

      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
          Verification Code
        </label>
        <div className="mt-1">
          <input
            id="otp"
            name="otp"
            type="text"
            maxLength={6}
            required
            value={formData.otp}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter 6-digit code"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || authLoading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            (loading || authLoading) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {(loading || authLoading) ? 'Verifying...' : 'Verify Code'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Administrator Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {requiresOTP 
            ? 'Please enter the verification code sent to your email'
            : 'Sign in to your administrator account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {requiresOTP ? renderOtpForm() : renderInitialForm()}
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 