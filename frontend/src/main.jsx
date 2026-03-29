import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css'; // Adjust if your global CSS filename is different

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);