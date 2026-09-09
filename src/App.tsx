import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LandingPage } from './pages/LandingPage';
import { InternalLoginPage } from './pages/InternalLoginPage';
import { AdminPage } from './pages/AdminPage';
import { ApplicationWizardPage } from './pages/ApplicationWizardPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Internal Staff Login */}
          <Route path="/internal/login" element={<InternalLoginPage />} />

          {/* Peserta Registration & Application Wizard (Fase 4) */}
          <Route
            path="/daftar"
            element={
              <ProtectedRoute allowedRoles={['PESERTA', 'ADMIN']}>
                <ApplicationWizardPage />
              </ProtectedRoute>
            }
          />

          {/* Verifikator Workspace (Fase 6) */}
          <Route
            path="/verifikator"
            element={
              <ProtectedRoute allowedRoles={['VERIFIKATOR', 'ADMIN']}>
                <div className="container py-5">
                  <div className="card shadow-sm border-0">
                    <div className="card-body p-4 text-center">
                      <h3 className="fw-bold text-primary">Workspace Verifikator Administrasi</h3>
                      <p className="text-muted">Fitur seleksi administrasi berkas (Fase 6)</p>
                      <a href="/" className="btn btn-outline-primary mt-2">
                        Kembali ke Beranda
                      </a>
                    </div>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Lembaga Seleksi Wawancara (Fase 7) */}
          <Route
            path="/wawancara"
            element={
              <ProtectedRoute allowedRoles={['LEMBAGA_SELEKSI', 'ADMIN']}>
                <div className="container py-5">
                  <div className="card shadow-sm border-0">
                    <div className="card-body p-4 text-center">
                      <h3 className="fw-bold text-primary">Workspace Lembaga Seleksi (Wawancara)</h3>
                      <p className="text-muted">Fitur penilaian dan input skor wawancara (Fase 7)</p>
                      <a href="/" className="btn btn-outline-primary mt-2">
                        Kembali ke Beranda
                      </a>
                    </div>
                  </div>
                </div>
              </ProtectedRoute>
            }
          />

          {/* Administrator Dashboard (Fase 3 / Fase 8) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AdminPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback 404 */}
          <Route
            path="*"
            element={
              <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <div className="text-center">
                  <h1 className="display-1 fw-bold text-primary">404</h1>
                  <h4 className="fw-bold">Halaman Tidak Ditemukan</h4>
                  <p className="text-muted">Halaman yang Anda cari tidak tersedia.</p>
                  <a href="/" className="btn btn-primary mt-2">
                    Kembali ke Beranda
                  </a>
                </div>
              </div>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
