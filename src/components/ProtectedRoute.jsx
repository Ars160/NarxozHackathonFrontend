import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children }) => {
  const [isValid, setIsValid] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/protected', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsValid(response.ok);
      } catch (error) {
        setIsValid(false);
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-[#F8F9FA] flex flex-col items-center justify-center z-50 gap-4">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-[#C8102E] shadow-lg">
          <LoadingSpinner size={32} color="#ffffff" />
        </div>
        <p className="text-sm font-medium text-gray-500 tracking-wide">Загрузка...</p>
      </div>
    );
  }

  return isValid ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;