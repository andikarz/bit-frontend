import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isLoading, needsPasswordChange } = useAuth();

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2 text-muted small">Memuat data sesi...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/internal/login" replace />;
  }

  // AT-01: Forced password change on first login
  if (needsPasswordChange) {
    return (
      <div className="min-vh-100 bg-light">
        <ChangePasswordModal isOpen={true} isForced={true} />
      </div>
    );
  }

  if (allowedRoles && !allowedRoles.includes(user.role) && user.role !== 'ADMIN') {
    return (
      <div className="container py-5 text-center">
        <div className="card shadow-sm p-5 border-0 mx-auto" style={{ maxWidth: '500px' }}>
          <i className="bi bi-shield-slash text-danger display-1 mb-3"></i>
          <h4 className="fw-bold">Akses Ditolak (403)</h4>
          <p className="text-muted small">
            Peran Anda ({user.role}) tidak memiliki izin untuk mengakses halaman ini.
          </p>
          <a href="/" className="btn btn-primary mt-2">
            Kembali ke Beranda
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
