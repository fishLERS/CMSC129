import React from 'react';
import ReactDOM from 'react-dom/client';
// import { AuthProvider } from './hooks/useAuth';
// import App from './App';
import Inventory from "./Inventory";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <Inventory />
  // <React.StrictMode>
    // <AuthProvider><App /></AuthProvider>
  // </React.StrictMode>
);
