import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ChangePasswordModalProps {
  isOpen: boolean;
  isForced?: boolean;
  onClose?: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  isForced = false,
  onClose,
  onSuccess,
}) => {
  const { changePassword, logout } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter');
      return;
    }
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setError('Password harus mengandung huruf besar, huruf kecil, dan angka');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok');
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword(oldPassword, newPassword);
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mengganti kata sandi');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      style={{ backgroundColor: 'rgba(0,0,0,0.65)', zIndex: 1060 }}
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content shadow border-0">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title fw-bold">
              <i className="bi bi-shield-exclamation me-2"></i>
              {isForced ? 'Wajib Mengganti Password Sementara' : 'Ganti Kata Sandi'}
            </h5>
            {!isForced && onClose && (
              <button type="button" className="btn-close" onClick={onClose}></button>
            )}
          </div>

          <div className="modal-body p-4">
            {isForced && (
              <div className="alert alert-warning py-2 small mb-3">
                <i className="bi bi-info-circle-fill me-2"></i>
                Untuk keamanan akun Anda, silakan ubah kata sandi sementara yang dikirimkan ke email Anda sebelum melanjutkan.
              </div>
            )}

            {error && (
              <div className="alert alert-danger py-2 small d-flex align-items-center mb-3">
                <i className="bi bi-exclamation-triangle-fill me-2 flex-shrink-0"></i>
                <div>{error}</div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label className="form-label fw-semibold small">Kata Sandi Saat Ini / Sementara</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Masukkan password saat ini"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-3">
                <label className="form-label fw-semibold small">Kata Sandi Baru</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Minimal 8 karakter, kombinasi huruf & angka"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="form-label fw-semibold small">Konfirmasi Kata Sandi Baru</label>
                <input
                  type="password"
                  className="form-control"
                  placeholder="Ulangi kata sandi baru"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="d-flex gap-2">
                {isForced ? (
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-50"
                    onClick={() => logout()}
                  >
                    Keluar / Logout
                  </button>
                ) : (
                  onClose && (
                    <button
                      type="button"
                      className="btn btn-secondary w-50"
                      onClick={onClose}
                    >
                      Batal
                    </button>
                  )
                )}
                <button
                  type="submit"
                  className={`btn btn-primary ${isForced ? 'w-50' : 'w-100'} fw-semibold`}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Menyimpan...
                    </>
                  ) : (
                    'Perbarui Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
