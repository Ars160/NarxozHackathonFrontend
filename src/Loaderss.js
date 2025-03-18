import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import './style.css'

export const GlobalLoader = () => (
    <div className="global-loader">
      <LoadingSpinner />
    </div>
  );

export const LocalLoader = () => (
  <div className="d-flex justify-content-center p-4">
    <LoadingSpinner />
  </div>
);