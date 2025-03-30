import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

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

  if (loading) return <div>Loading...</div>;
  return isValid ? children : <Navigate to="/login" />;
};

export default ProtectedRoute;