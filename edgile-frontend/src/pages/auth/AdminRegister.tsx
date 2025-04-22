import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { authAPI } from '../../utils/api';

// Password validation criteria
interface PasswordCriteria {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

const AdminRegister: React.FC = () => {
  const navigate = useNavigate();
  const { adminLogin, login, checkAdminEmailExists } = useAuth();
  const [step, setStep] = useState<'initial' | 'otp'>('initial');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    universityName: '',
    superAdminCode: '',
    otp: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState<PasswordCriteria>({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  const [passwordsMatch, setPasswordsMatch] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  // Check if access code is verified on component mount
  useEffect(() => {
    const isVerified = sessionStorage.getItem('adminAccessVerified');
    if (!isVerified) {
      navigate('/admin/access');
    }
  }, [navigate]);

  // Validate password against criteria
  useEffect(() => {
    if (step === 'otp') {
      const { password, confirmPassword } = formData;
      
      // Criteria validation
      setPasswordCriteria({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      });
      
      // Check if passwords match
      setPasswordsMatch(password === confirmPassword && password !== '');
    }
  }, [formData.password, formData.confirmPassword, step]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // If email field is updated, check if it exists
    if (name === 'email' && value.trim() !== '') {
      // Only check for admin emails
      if (value.endsWith('@admin.edgile.com')) {
        setEmailChecking(true);
        try {
          const exists = await checkAdminEmailExists(value);
          setEmailExists(exists);
        } catch (err) {
          console.error('Error checking email:', err);
        } finally {
          setEmailChecking(false);
        }
      }
    }
  };

  const handleInitialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Check if email exists again before proceeding
    if (emailExists) {
      setError('An admin with this email already exists');
      return;
    }

    setLoading(true);

    try {
      // Generate OTP
      const response = await authAPI.generateOTP(formData.email);

      if (response.success) {
        setOtpSent(true);
        setStep('otp');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to generate OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password
    const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
    if (!isPasswordValid) {
      setError('Password does not meet all requirements');
      return;
    }
    
    // Check if passwords match
    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);

    try {
      // Verify OTP and complete registration
      const response = await authAPI.verifyOTP(formData.email, formData.otp);

      if (response.success) {
        // Complete registration with password
        const registerResponse = await authAPI.register({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          universityName: formData.universityName
        });

        if (registerResponse.token && registerResponse.user) {
          // Store token and user data in localStorage first
          localStorage.setItem('token', registerResponse.token);
          localStorage.setItem('user', JSON.stringify(registerResponse.user));
          
          // Then update auth context
          login(registerResponse.token, registerResponse.user);
          
          // Immediately navigate to dashboard
          window.location.href = '/admin/dashboard';
        } else {
          try {
            // Otherwise try to login
            console.log('Registration successful but no token received, attempting login');
            const loginResult = await adminLogin(formData.email, formData.password);
            
            // Immediately navigate to dashboard
            window.location.href = '/admin/dashboard';
          } catch (loginError) {
            console.error('Login failed after registration:', loginError);
            setError('Registration successful but login failed. Please try logging in manually.');
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await authAPI.register({
        ...formData,
        role: 'admin'
      });
      // Handle successful registration
      navigate('/admin/login');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
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
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Full Name
        </label>
        <div className="mt-1">
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            value={formData.name}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

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
            className={`appearance-none block w-full px-3 py-2 border ${
              emailExists ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm ${
              emailExists ? 'bg-red-50' : 'placeholder-gray-400'
            } focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
          />
          {emailChecking && (
            <p className="mt-1 text-sm text-gray-500">Checking email...</p>
          )}
          {emailExists && (
            <p className="mt-1 text-sm text-red-600">This email is already registered</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="universityName" className="block text-sm font-medium text-gray-700">
          University Name
        </label>
        <div className="mt-1">
          <input
            id="universityName"
            name="universityName"
            type="text"
            required
            value={formData.universityName}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <label htmlFor="superAdminCode" className="block text-sm font-medium text-gray-700">
          Super Admin Code
        </label>
        <div className="mt-1">
          <input
            id="superAdminCode"
            name="superAdminCode"
            type="password"
            required
            value={formData.superAdminCode}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || emailExists}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            (loading || emailExists) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Generating OTP...' : 'Continue'}
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
          Verification code has been sent to your email
        </div>
      )}

      <div>
        <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
          Enter Verification Code
        </label>
        <div className="mt-1">
          <input
            id="otp"
            name="otp"
            type="text"
            required
            value={formData.otp}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
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
            autoComplete="new-password"
            required
            value={formData.password}
            onChange={handleChange}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          
          <div className="mt-2 space-y-1">
            <p className="text-sm font-medium text-gray-700">Password must contain:</p>
            <ul className="text-xs space-y-1 ml-1">
              <li className={`flex items-center ${passwordCriteria.length ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordCriteria.length ? (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                At least 8 characters
              </li>
              <li className={`flex items-center ${passwordCriteria.uppercase ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordCriteria.uppercase ? (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                At least one uppercase letter
              </li>
              <li className={`flex items-center ${passwordCriteria.lowercase ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordCriteria.lowercase ? (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                At least one lowercase letter
              </li>
              <li className={`flex items-center ${passwordCriteria.number ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordCriteria.number ? (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                At least one number
              </li>
              <li className={`flex items-center ${passwordCriteria.special ? 'text-green-600' : 'text-gray-500'}`}>
                {passwordCriteria.special ? (
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                At least one special character (!@#$%^&*(),.?":{}|&lt;&gt;)
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
          Confirm Password
        </label>
        <div className="mt-1">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            required
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`appearance-none block w-full px-3 py-2 border ${
              formData.confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
            } rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500`}
          />
          {formData.confirmPassword && (
            <p className={`mt-1 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              {passwordsMatch ? (
                <>
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Passwords match
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Passwords do not match
                </>
              )}
            </p>
          )}
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={loading || !passwordsMatch || !Object.values(passwordCriteria).every(Boolean)}
          className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${
            (loading || !passwordsMatch || !Object.values(passwordCriteria).every(Boolean)) ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {loading ? 'Verifying...' : 'Verify and Complete Registration'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Admin Registration
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'initial' ? renderInitialForm() : renderOtpForm()}
        </div>
      </div>
    </div>
  );
};

export default AdminRegister; 