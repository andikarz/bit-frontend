import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onOpenLogin,
}) => {
  const { forgotPassword, resetPassword } = useAuth();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      await forgotPassword(email.trim());
      setSuccess('Instruksi dan token reset kata sandi telah dikirimkan ke email Anda.');
      setStep('reset');
    } catch (err: any) {
      setError(err.message || 'Gagal mengirim instruksi reset kata sandi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError('Password baru minimal 8 karakter');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi kata sandi baru tidak cocok');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setSuccess('Kata sandi Anda berhasil diperbarui! Silakan masuk kembali.');
      setTimeout(() => {
        onClose();
        onOpenLogin();
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Token reset tidak valid atau telah kedaluwarsa.');
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
              <i className="bi bi-question-circle-fill me-2"></i>
              {step === 'request' ? 'Lupa Kata Sandi' : 'Reset Kata Sandi'}
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
              <div className="alert alert-success py-2 small d-flex align-items-center mb-3">
                <i className="bi bi-check-circle-fill me-2 flex-shrink-0"></i>
                <div>{success}</div>
              </div>
            )}

            {step === 'request' ? (
              <form onSubmit={handleRequest}>
                <p className="text-muted small mb-3">
                  Masukkan alamat email yang terdaftar pada akun Anda. Kami akan mengirimkan token untuk mereset kata sandi.
                </p>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Alamat Email</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Mengirimkan...' : 'Kirim Token Reset'}
                </button>
                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="btn btn-link p-0 small text-decoration-none"
                    onClick={() => setStep('reset')}
                  >
                    Sudah memiliki token reset? Klik di sini
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleReset}>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Token Reset</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Masukkan token dari email"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold small">Kata Sandi Baru</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="Minimal 8 karakter"
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
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-semibold"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Menyimpan...' : 'Perbarui Kata Sandi'}
                </button>
              </form>
            )}
          </div>
          <div className="modal-footer justify-content-center bg-light py-3">
            <button
              type="button"
              className="btn btn-link p-0 small text-decoration-none"
              onClick={() => {
                onClose();
                onOpenLogin();
              }}
            >
              Kembali ke Halaman Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
