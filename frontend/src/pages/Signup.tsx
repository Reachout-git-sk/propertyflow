import React from 'react';
import { Link } from 'react-router-dom';

export const Signup: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Sign Up</h1>
        <p className="text-gray-600 mb-6">Contact admin to create account</p>
        <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
          Back to Login
        </Link>
      </div>
    </div>
  );
};
