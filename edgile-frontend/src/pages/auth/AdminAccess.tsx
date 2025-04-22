import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api';

const AdminAccess: React.FC = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAccessVerified, setIsAccessVerified] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Function to reset verification state
  const resetVerificationState = () => {
    sessionStorage.removeItem('adminAccessVerified');
    sessionStorage.removeItem('adminEmail');
    setIsAccessVerified(false);
    setIsEmailVerified(false);
    setOtpSent(false);
    setEmail('');
    setOtp('');
    setAccessCode('');
    setError(null);
  };

  // Check if already verified on mount and set initial state
  useEffect(() => {
    const verified = sessionStorage.getItem('adminAccessVerified');
    
    // Reset verification state when visiting the page directly
    // This ensures the access code is always asked first when directly accessing this route
    if (window.location.pathname === '/admin/access') {
      resetVerificationState();
    } 
    // Only preserve verification if coming from another admin page
    else if (verified === 'true') {
      setIsAccessVerified(true);
      setIsEmailVerified(true);
    }
  }, []);

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyAccessCode(accessCode);
      
      if (response.success) {
        // Set full verification directly after access code verification
        setIsAccessVerified(true);
        setIsEmailVerified(true);
        
        // Store verification flag in session storage right away
        sessionStorage.setItem('adminAccessVerified', 'true');
      } else {
        setError('Invalid access code. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify access code');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.generateOTP(email);
      
      if (response.success) {
        setOtpSent(true);
        setError('OTP has been sent to your email');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.verifyOTP(email, otp);
      
      if (response.success) {
        // Store verification flag in session storage
        sessionStorage.setItem('adminAccessVerified', 'true');
        
        // Store email in session storage for subsequent login
        sessionStorage.setItem('adminEmail', email);
        
        // Set state to show choices
        setIsEmailVerified(true);
      } else {
        setError('Invalid OTP. Please try again.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = (choice: 'login' | 'register') => {
    if (!isAccessVerified || !isEmailVerified) {
      setError('Please complete the verification process first');
      return;
    }
    
    navigate(`/admin/${choice}`);
  };

  const renderAccessForm = () => (
    <form className="space-y-6" onSubmit={handleAccessCodeSubmit}>
      <div>
        <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
          Administrator Access Code
        </label>
        <div className="mt-1">
          <input
            id="accessCode"
            name="accessCode"
            type="password"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter access code"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Verifying...' : 'Verify Access Code'}
        </button>
      </div>
    </form>
  );

  const renderEmailForm = () => (
    <form className="space-y-6" onSubmit={handleGenerateOTP}>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email Address
        </label>
        <div className="mt-1">
          <input
            id="email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter your email"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Sending...' : 'Send OTP'}
        </button>
      </div>
    </form>
  );

  const renderOTPForm = () => (
    <form className="space-y-6" onSubmit={handleVerifyOTP}>
      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
          OTP Verification
        </label>
        <div className="mt-1">
          <input
            id="otp"
            name="otp"
            type="text"
            required
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            placeholder="Enter OTP"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </form>
  );

  const renderChoiceButtons = () => (
    <div className="space-y-4">
      <button
        onClick={() => handleChoice('login')}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Login to Existing Account
      </button>
      <button
        onClick={() => handleChoice('register')}
        className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
      >
        Register New Account
      </button>
    </div>
  );

  const renderCurrentStep = () => {
    if (!isAccessVerified) {
      return renderAccessForm();
    }
    // Skip email and OTP verification entirely
    return renderChoiceButtons();
  };

  const getStepTitle = () => {
    if (!isAccessVerified) {
      return 'Administrator Access';
    }
    return 'Choose an Option';
  };

  const getStepDescription = () => {
    if (!isAccessVerified) {
      return 'Enter the administrator access code to continue';
    }
    return 'Please choose an option to continue';
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {getStepTitle()}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {getStepDescription()}
        </p>
        {(isAccessVerified || otpSent) && (
          <div className="mt-2 text-center">
            {/* <button
              onClick={resetVerificationState}
              className="text-sm text-primary-600 hover:text-primary-500"
            >
              Start Over
            </button> */}
          </div>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative">
              {error}
            </div>
          )}
          {renderCurrentStep()}
        </div>
      </div>
    </div>
  );
};

export default AdminAccess; 