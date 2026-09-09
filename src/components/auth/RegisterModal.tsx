import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const { register } = useAuth();
  const [nik, setNik] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (nik.length !== 16 || !/^\d{16}$/.test(nik)) {
      setError('NIK harus berupa 16 digit angka sesuai KTP');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(nik, fullName.trim(), email.trim());
      setSuccess(
        res.message ||
          'Pendaftaran berhasil! Kredensial login & password sementara telah dikirimkan ke email Anda.'
      );
      setNik('');
      setFullName('');
      setEmail('');
    } catch (err: any) {
      setError(err.message || 'Pendaftaran gagal. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-person-plus-fill me-2"></i>Daftar Akun Peserta
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-4">
            {error && (
              <div className="alert alert-danger py-2 small d-flex align-items-center mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                <div>{error}</div>
              </div>
            )}
            {success && (
              <div className="alert alert-success py-3 small mb-3">
                <div className="fw-semibold mb-1">
                  <i className="bi bi-check-circle-fill me-2"></i>Pendaftaran Berhasil!
                </div>
                <div>{success}</div>
                <div className="mt-3">
                  <button
                    type="button"
                    className="btn btn-sm btn-success w-100"
                    onClick={() => {
                      onClose();
                      onOpenLogin();
                    }}
                  >
                    Buka Halaman Login
                  </button>
                </div>
              </div>
            )}

            {!success && (
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">
                    Nomor Induk Kependudukan (NIK)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="16 digit NIK sesuai KTP"
                    maxLength={16}
                    value={nik}
                    onChange={(e) => setNik(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                  <div className="form-text small">Wajib 16 digit angka valid.</div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Nama Lengkap</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nama sesuai KTP"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold small">Alamat Email Aktif</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <div className="form-text small">
                    Password sementara akan dikirimkan ke email ini.
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Mendaftarkan...
                    </>
                  ) : (
                    'Daftar & Kirim Kredensial'
                  )}
                </button>
              </form>
            )}
          </div>

          <div className="modal-footer justify-content-center bg-light py-3">
            <span className="small text-muted">
              Sudah punya akun?{' '}
              <button
                type="button"
                className="btn btn-link p-0 fw-semibold text-decoration-none"
                onClick={() => {
                  onClose();
                  onOpenLogin();
                }}
              >
                Login di sini
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
