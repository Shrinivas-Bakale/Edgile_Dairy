import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../utils/api';

const AdminAccess: React.FC = () => {
  const navigate = useNavigate();
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAccessVerified, setIsAccessVerified] = useState(false);

  // Function to reset verification state
  const resetVerificationState = () => {
    sessionStorage.removeItem('adminAccessVerified');
    setIsAccessVerified(false);
    setAccessCode('');
    setError(null);
  };

  useEffect(() => {
    const verified = sessionStorage.getItem('adminAccessVerified');
    if (window.location.pathname === '/admin/access') {
      resetVerificationState();
    } else if (verified === 'true') {
      setIsAccessVerified(true);
    }
  }, []);

  const handleAccessCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await authAPI.verifyAccessCode(accessCode);
      if (response.success) {
        setIsAccessVerified(true);
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

  const handleChoice = (choice: 'login' | 'register') => {
    if (!isAccessVerified) {
      setError('Please complete the verification process first');
      return;
    }
    navigate(`/admin/${choice}`);
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-secondary-100 px-4 py-8">
      {/* Decorative blurred shapes */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary-100 rounded-full filter blur-3xl opacity-30 z-0" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary-200 rounded-full filter blur-3xl opacity-30 z-0" />

      <div className="relative z-10 w-full max-w-md mx-auto">
        {/* Back to Home button */}
        <button 
          onClick={handleBackToHome}
          className="absolute -top-14 left-0 flex items-center text-primary-600 hover:text-primary-800 transition-colors duration-200 font-medium group"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform duration-200" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back to Home
        </button>

        <div className="bg-white rounded-2xl shadow-2xl border border-primary-100 px-8 py-10 flex flex-col items-center">
          <svg className="h-20 w-20 text-primary-500 mb-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2 text-center">Administrator Access</h2>
          <p className="text-base text-gray-600 mb-6 text-center">Enter the administrator access code to continue</p>

          {error && (
            <div className="mb-6 w-full bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-md flex items-start">
              <svg className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {!isAccessVerified ? (
            <form className="w-full space-y-6" onSubmit={handleAccessCodeSubmit}>
              <div>
                <label htmlFor="accessCode" className="block text-sm font-semibold text-gray-700 mb-1">
                  Administrator Access Code
                </label>
                <input
                  id="accessCode"
                  name="accessCode"
                  type="password"
                  required
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="appearance-none block w-full px-4 py-3 border-2 border-primary-200 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-500 transition duration-200 text-lg"
                  placeholder="Enter access code"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-6 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
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
            </form>
          ) : (
            <div className="w-full space-y-5 mt-2">
              <button
                onClick={() => handleChoice('login')}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-semibold text-white bg-primary-500 hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition duration-200"
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
                className="w-full flex justify-center py-3 px-4 border-2 border-primary-500 rounded-lg shadow-md text-base font-semibold text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-400 transition duration-200"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register New Account
                </span>
              </button>
            </div>
          )}
          <p className="mt-8 text-center text-sm text-gray-400">
            Secure administrator access for <span className="font-semibold text-primary-500">Edgile</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminAccess; 