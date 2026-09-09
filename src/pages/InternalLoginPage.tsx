import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const InternalLoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('VERIFIKATOR');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const user = await login(identifier.trim(), password);

      // Validate user role matches internal expectations
      if (user.role === 'PESERTA') {
        throw new Error('Akun ini adalah akun Peserta. Silakan login melalui portal peserta.');
      }

      // Route according to user role
      if (user.role === 'ADMIN') {
        navigate('/admin');
      } else if (user.role === 'VERIFIKATOR') {
        navigate('/verifikator');
      } else if (user.role === 'LEMBAGA_SELEKSI') {
        navigate('/wawancara');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'Kombinasi identitas dan kata sandi internal salah');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-3"
      style={{ background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)' }}
    >
      <div
        className="card border-0 shadow-lg mx-auto bg-white"
        style={{ maxWidth: '440px', width: '100%', borderRadius: '16px', overflow: 'hidden' }}
      >
        <div
          className="text-center p-4 text-white"
          style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)' }}
        >
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3 shadow-sm"
            style={{
              width: '65px',
              height: '65px',
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(5px)',
            }}
          >
            <i className="bi bi-shield-lock-fill fs-2 text-white"></i>
          </div>
          <h4 className="fw-bold mb-1">Portal Internal</h4>
          <p className="text-white-50 small mb-0">Sistem Pengelola & Seleksi Beasiswa</p>
        </div>

        <div className="card-body p-4">
          <div
            className="alert alert-primary bg-primary-subtle text-primary border-0 d-flex align-items-center small py-2 mb-4"
            role="alert"
          >
            <i className="bi bi-info-circle-fill fs-5 me-2 flex-shrink-0"></i>
            <div>Area khusus pemroses data (Verifikator, Lembaga Seleksi, & Admin).</div>
          </div>

          {error && (
            <div className="alert alert-danger py-2 small d-flex align-items-center mb-3">
              <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary small">
                Username / NIP / Email Internal
              </label>
              <div className="input-group">
                <span className="input-group-text bg-light text-primary">
                  <i className="bi bi-person-badge-fill"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Masukkan ID pengguna"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold text-secondary small">Kata Sandi</label>
              <div className="input-group">
                <span className="input-group-text bg-light text-primary">
                  <i className="bi bi-key-fill"></i>
                </span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold text-secondary small">
                Masuk Sebagai (Role Akses)
              </label>
              <select
                className="form-select bg-light"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
              >
                <option value="VERIFIKATOR">Verifikator (Seleksi Administrasi)</option>
                <option value="LEMBAGA_SELEKSI">Lembaga Seleksi (Wawancara)</option>
                <option value="ADMIN">Administrator System</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-100 py-2 fw-semibold mb-2"
              style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', border: 'none' }}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Memproses...
                </>
              ) : (
                <>
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Masuk Dashboard
                </>
              )}
            </button>
          </form>
        </div>

        <div className="card-footer bg-light border-top-0 p-3 text-center">
          <p className="mb-1 small text-muted">
            <i className="bi bi-check-circle-fill text-primary me-1"></i>Akses Terenkripsi & Ter-autentikasi
          </p>
          <Link to="/" className="small text-decoration-none text-secondary">
            <i className="bi bi-arrow-left me-1"></i>Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </div>
  );
};
