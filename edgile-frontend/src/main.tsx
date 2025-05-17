import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { FacultyAuthProvider } from './contexts/FacultyAuthContext'
import { UniversityProvider } from './contexts/UniversityContext'
import { SnackbarProvider } from './contexts/SnackbarContext'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SnackbarProvider>
      <UniversityProvider>
        <FacultyAuthProvider>
          <AuthProvider>
            <BrowserRouter>
              <Toaster position="top-center" />
              <App />
            </BrowserRouter>
          </AuthProvider>
        </FacultyAuthProvider>
      </UniversityProvider>
    </SnackbarProvider>
  </React.StrictMode>,
) 