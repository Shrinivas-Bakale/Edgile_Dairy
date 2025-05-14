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

  const handleBackToHome = () => {
    navigate('/');
  };

  const renderAccessForm = () => (
    <form className="space-y-6" onSubmit={handleAccessCodeSubmit}>
      <div>
        <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
          Administrator Access Code
        </label>
        <div className="mt-2">
          <input
            id="accessCode"
            name="accessCode"
            type="password"
            required
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="appearance-none block w-full px-4 py-3 border-2 border-blue-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 transition duration-200"
            placeholder="Enter access code"
          />
        </div>
      </div>

      <div className="pt-3">
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200 ${
            loading ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {loading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : 'Verify Access Code'}
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
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter your email"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
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
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter OTP"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            loading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </div>
    </form>
  );

  const renderChoiceButtons = () => (
    <div className="space-y-5">
      <button
        onClick={() => handleChoice('login')}
        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
      >
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
          </svg>
          Login to Existing Account
        </span>
      </button>
      <button
        onClick={() => handleChoice('register')}
        className="w-full flex justify-center py-3 px-4 border-2 border-blue-600 rounded-lg shadow-md text-base font-medium text-blue-600 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-200"
      >
        <span className="flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Register New Account
        </span>
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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative">
      {/* Back to Home button */}
      <button 
        onClick={handleBackToHome}
        className="absolute top-8 left-8 flex items-center text-blue-600 hover:text-blue-800 transition-colors duration-200 font-medium group"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
        </svg>
        Back to Home
      </button>

      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-blue-100 rounded-bl-full opacity-30" />
      <div className="absolute bottom-0 left-0 w-1/4 h-1/4 bg-blue-100 rounded-tr-full opacity-30" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="text-center">
          <svg className="mx-auto h-16 w-16 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {getStepTitle()}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 max-w-xs mx-auto">
            {getStepDescription()}
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-8 shadow-xl sm:rounded-xl border border-blue-100 relative z-10">
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}
          {renderCurrentStep()}
        </div>
        
        {/* Footer text */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Secure administrator access for Edgile
        </p>
      </div>
    </div>
  );
};

export default AdminAccess; 