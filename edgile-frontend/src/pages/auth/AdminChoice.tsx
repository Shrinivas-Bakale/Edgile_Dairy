import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AdminChoice: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const verified = sessionStorage.getItem('adminAccessVerified');
    if (verified !== 'true') {
      navigate('/admin/access');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Administrator Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Choose an option to continue
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-4">
            <button
              onClick={() => navigate('/admin/login')}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Login to Existing Account
            </button>

            <button
              onClick={() => navigate('/admin/register')}
              className="w-full flex justify-center py-3 px-4 border border-primary-600 rounded-md shadow-sm text-sm font-medium text-primary-600 bg-white hover:bg-primary-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Register New Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminChoice; 