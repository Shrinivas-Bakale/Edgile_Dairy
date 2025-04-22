import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './contexts/AuthContext'
import { FacultyAuthProvider } from './contexts/FacultyAuthContext'
import { StudentAuthProvider } from './contexts/StudentAuthContext'
import { UniversityProvider } from './contexts/UniversityContext'
import { SnackbarProvider } from './contexts/SnackbarContext'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { DarkModeProvider } from './contexts/DarkModeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DarkModeProvider>
      <SnackbarProvider>
        <UniversityProvider>
          <FacultyAuthProvider>
            <StudentAuthProvider>
              <AuthProvider>
                <BrowserRouter>
                  <Toaster position="top-center" />
                  <App />
                </BrowserRouter>
              </AuthProvider>
            </StudentAuthProvider>
          </FacultyAuthProvider>
        </UniversityProvider>
      </SnackbarProvider>
    </DarkModeProvider>
  </React.StrictMode>,
) 