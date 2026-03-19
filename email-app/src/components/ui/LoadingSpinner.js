import React from 'react';

const LoadingSpinner = ({ label = 'Loading...' }) => (
  <div className="loading-state">
    <div className="spinner" />
    {label && <p>{label}</p>}
  </div>
);

export default LoadingSpinner;
