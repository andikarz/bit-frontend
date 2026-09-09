import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

interface CandidateItem {
  id: string; // applicationId
  registrationCode: string;
  applicantId: string;
  nik: string;
  fullName: string;
  programName: string;
  programId: string;
  administrationStatus: string;
  interviewStatus: 'NOT_ELIGIBLE' | 'PENDING' | 'PASSED' | 'FAILED';
  finalStatus: 'UNDECIDED' | 'ACCEPTED' | 'NOT_ACCEPTED';
  scoreAspect1: number | null;
  scoreAspect2: number | null;
  scoreAspect3: number | null;
  totalScore: number | null;
  decision: 'PASSED' | 'FAILED' | null;
  interviewerNotes: string | null;
  interviewedAt: string | null;
}

interface Stats {
  ready: number;
  unscored: number;
  passed: number;
  failed: number;
}

export const WawancaraPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [candidates, setCandidates] = useState<CandidateItem[]>([]);
  const [stats, setStats] = useState<Stats>({ ready: 0, unscored: 0, passed: 0, failed: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateItem | null>(null);
  const [aspect1, setAspect1] = useState<number | ''>('');
  const [aspect2, setAspect2] = useState<number | ''>('');
  const [aspect3, setAspect3] = useState<number | ''>('');
  const [decision, setDecision] = useState<'PASSED' | 'FAILED' | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);

  // Real-time calculated total score: (aspect1 * 0.3) + (aspect2 * 0.4) + (aspect3 * 0.3)
  const calculateTotal = (): number | null => {
    if (aspect1 === '' || aspect2 === '' || aspect3 === '') return null;
    const a1 = Number(aspect1);
    const a2 = Number(aspect2);
    const a3 = Number(aspect3);
    if (isNaN(a1) || isNaN(a2) || isNaN(a3)) return null;
    return Number((a1 * 0.3 + a2 * 0.4 + a3 * 0.3).toFixed(2));
  };

  const calculatedTotal = calculateTotal();

  // Load Queue & Stats
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);

      const [resQueue, resStats] = await Promise.all([
        api.get<any>(`/api/v1/interviews/queue?${params.toString()}`),
        api.get<any>('/api/v1/interviews/stats')
      ]);

      setCandidates(resQueue.data || []);
      setTotalItems(resQueue.meta?.total || 0);
      if (resStats.data) setStats(resStats.data);
    } catch (err: any) {
      console.error('Failed to load interview data:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Open scoring modal
  const openScoringModal = (candidate: CandidateItem) => {
    setSelectedCandidate(candidate);
    setAspect1(candidate.scoreAspect1 ?? 85);
    setAspect2(candidate.scoreAspect2 ?? 85);
    setAspect3(candidate.scoreAspect3 ?? 85);
    setDecision(candidate.decision ?? 'PASSED');
    setNotes(
      candidate.interviewerNotes ??
      'Peserta memiliki motivasi belajar yang tinggi, komunikatif, dan berkomitmen penuh mengikuti seluruh rangkaian program pelatihan.'
    );
    setShowModal(true);
  };

  // Submit scoring
  const handleSubmitScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    if (aspect1 === '' || aspect2 === '' || aspect3 === '') {
      alert('Semua komponen nilai aspek (1, 2, 3) wajib diisi.');
      return;
    }

    if (!decision) {
      alert('Silakan pilih status kelulusan wawancara.');
      return;
    }

    if (!notes.trim() || notes.trim().length < 5) {
      alert('Catatan evaluasi minimal 5 karakter.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(`/api/v1/interviews/${selectedCandidate.id}/score`, {
        scoreAspect1: Number(aspect1),
        scoreAspect2: Number(aspect2),
        scoreAspect3: Number(aspect3),
        decision,
        notes: notes.trim()
      });

      setShowModal(false);
      setToastMsg({
        type: 'success',
        text: `Penilaian wawancara untuk ${selectedCandidate.fullName} berhasil disimpan!`
      });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menyimpan nilai wawancara');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/internal/login');
  };

  return (
    <div className="d-flex" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* ── Sidebar (Adopting 3_index_wawancara.html) ────────────────── */}
      <div
        className="d-flex flex-column p-3 text-white"
        style={{
          width: '260px',
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0d6efd 0%, #0a58ca 100%)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100
        }}
      >
        <div className="d-flex align-items-center mb-4 px-2 pt-2">
          <i className="bi bi-award-fill fs-2 me-2"></i>
          <div>
            <h6 className="fw-bold mb-0">LEMBAGA SELEKSI</h6>
            <small className="text-white-50">Portal Beasiswa</small>
          </div>
        </div>
        <hr className="text-white-50 mt-0" />

        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <a
              href="#queue"
              className="nav-link active text-white"
              style={{
                borderRadius: '8px',
                padding: '12px 15px',
                fontWeight: 500,
                backgroundColor: 'rgba(255, 255, 255, 0.2)'
              }}
            >
              <i className="bi bi-chat-square-text me-2"></i>Proses Wawancara
            </a>
          </li>
        </ul>

        <hr className="text-white-50" />
        <div className="px-2">
          <button
            onClick={handleLogout}
            className="btn btn-danger w-100 text-start text-white bg-danger bg-opacity-75 border-0 py-2"
          >
            <i className="bi bi-box-arrow-right me-2"></i>Logout
          </button>
        </div>
      </div>

      {/* ── Main Content Area ───────────────────────────────────────── */}
      <div className="flex-grow-1 p-4" style={{ marginLeft: '260px' }}>
        {/* Toast Alert */}
        {toastMsg && (
          <div
            className={`alert alert-${toastMsg.type} alert-dismissible fade show shadow-sm mb-4`}
            role="alert"
          >
            <i className={`bi ${toastMsg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`}></i>
            {toastMsg.text}
            <button type="button" className="btn-close" onClick={() => setToastMsg(null)}></button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom bg-white p-3 rounded shadow-sm">
          <div>
            <h4 className="fw-bold mb-0">Menu Proses Wawancara</h4>
            <small className="text-muted">
              Kelola penilaian wawancara dan hasil seleksi peserta yang lolos administrasi
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
              <i className="bi bi-building-check me-1"></i> Tim Penguji: {user?.fullName || 'Lembaga Seleksi'}
            </span>
          </div>
        </div>

        {/* ── 4 Stats Cards ───────────────────────────────────────────── */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-primary text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Siap Wawancara</h6>
                <h3 className="fw-bold mb-0">{stats.ready}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-secondary text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Belum Dinilai</h6>
                <h3 className="fw-bold mb-0">{stats.unscored}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-success text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Lulus Wawancara</h6>
                <h3 className="fw-bold mb-0">{stats.passed}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-danger text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Tidak Lulus</h6>
                <h3 className="fw-bold mb-0">{stats.failed}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* ── Candidate Queue Table Card ─────────────────────────────── */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-people-fill me-2 text-primary"></i>
              Daftar Peserta Seleksi Wawancara ({totalItems})
            </span>

            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm w-auto"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status Wawancara</option>
                <option value="PASSED">Lulus Wawancara</option>
                <option value="FAILED">Tidak Lulus</option>
                <option value="PENDING">Belum Dinilai</option>
              </select>
              <input
                type="text"
                className="form-control form-control-sm w-auto"
                placeholder="Cari Nama / NIK / Kode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}>No</th>
                    <th>NIK & Nama Peserta</th>
                    <th>Program Pelatihan</th>
                    <th>Seleksi Administrasi</th>
                    <th>Nilai Wawancara</th>
                    <th>Status Wawancara</th>
                    <th className="text-center" style={{ width: '160px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                        Memuat data peserta wawancara...
                      </td>
                    </tr>
                  ) : candidates.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-5 text-muted">
                        <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                        Tidak ada peserta dalam antrean wawancara saat ini
                      </td>
                    </tr>
                  ) : (
                    candidates.map((c, idx) => (
                      <tr key={c.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{c.fullName}</strong>
                          <br />
                          <small className="text-muted">NIK: {c.nik} | {c.registrationCode}</small>
                        </td>
                        <td>{c.programName}</td>
                        <td>
                          <span className="badge bg-success">
                            <i className="bi bi-check-circle me-1"></i>Lolos
                          </span>
                        </td>
                        <td>
                          {c.totalScore !== null ? (
                            <span className={`fw-bold fs-6 ${c.interviewStatus === 'PASSED' ? 'text-success' : 'text-danger'}`}>
                              {c.totalScore.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-muted fs-6 fw-bold">-</span>
                          )}
                        </td>
                        <td>
                          {c.interviewStatus === 'PASSED' ? (
                            <span className="badge bg-success">
                              <i className="bi bi-check-lg me-1"></i>Lulus Wawancara
                            </span>
                          ) : c.interviewStatus === 'FAILED' ? (
                            <span className="badge bg-danger">
                              <i className="bi bi-x-lg me-1"></i>Tidak Lulus
                            </span>
                          ) : (
                            <span className="badge bg-secondary">Belum Dinilai</span>
                          )}
                        </td>
                        <td className="text-center">
                          <button
                            className={`btn btn-sm ${c.interviewStatus === 'PENDING' ? 'btn-primary' : 'btn-outline-primary'}`}
                            onClick={() => openScoringModal(c)}
                          >
                            <i className={`bi ${c.interviewStatus === 'PENDING' ? 'bi-pencil-square' : 'bi-pencil'} me-1`}></i>
                            {c.interviewStatus === 'PENDING' ? 'Input Penilaian' : 'Edit Nilai'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ── Scoring Modal (Adopting 3_index_wawancara.html) ─────────── */}
      {showModal && selectedCandidate && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
          tabIndex={-1}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg">
              {/* Modal Header */}
              <div className="modal-header bg-primary text-white py-3">
                <div className="d-flex align-items-center">
                  <div
                    className="bg-white text-primary rounded-circle p-2 me-3 d-flex align-items-center justify-content-center"
                    style={{ width: '45px', height: '45px' }}
                  >
                    <i className="bi bi-chat-left-quote-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="modal-title fw-bold mb-0">Form Penilaian & Hasil Wawancara</h5>
                    <small className="text-white-50">Kode Pendaftaran: {selectedCandidate.registrationCode}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4 bg-light">
                {/* Candidate Information Card */}
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body bg-white rounded">
                    <div className="row g-2 small">
                      <div className="col-md-6">
                        <strong>Nama Peserta:</strong> {selectedCandidate.fullName}
                      </div>
                      <div className="col-md-6">
                        <strong>NIK:</strong> {selectedCandidate.nik}
                      </div>
                      <div className="col-md-6">
                        <strong>Program Pelatihan:</strong> {selectedCandidate.programName}
                      </div>
                      <div className="col-md-6">
                        <strong>Status Administrasi:</strong>{' '}
                        <span className="badge bg-success">Lolos Administrasi</span>
                      </div>
                    </div>
                  </div>
                </div>

                <form onSubmit={handleSubmitScore}>
                  {/* Seksi 1: Input Skor Penilaian */}
                  <div className="card border-0 shadow-sm mb-4">
                    <div className="card-header bg-white fw-bold text-primary border-bottom">
                      <i className="bi bi-clipboard-check me-2"></i>Seksi 1: Input Skor Penilaian (Skala 0 - 100)
                    </div>
                    <div className="card-body bg-white">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">
                            Komunikasi & Sikap (30%) <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0 - 100"
                            min="0"
                            max="100"
                            value={aspect1}
                            onChange={(e) => setAspect1(e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">
                            Pemahaman Teknis & Motivasi (40%) <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0 - 100"
                            min="0"
                            max="100"
                            value={aspect2}
                            onChange={(e) => setAspect2(e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold">
                            Komitmen & Kehadiran Pelatihan (30%) <span className="text-danger">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-control"
                            placeholder="0 - 100"
                            min="0"
                            max="100"
                            value={aspect3}
                            onChange={(e) => setAspect3(e.target.value === '' ? '' : Number(e.target.value))}
                            required
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label small fw-semibold text-primary">
                            Nilai Akhir (Kalkulasi Otomatis)
                          </label>
                          <input
                            type="text"
                            className="form-control fw-bold bg-light border-primary text-primary"
                            value={calculatedTotal !== null ? calculatedTotal.toFixed(2) : '-'}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Seksi 2: Status Wawancara & Keputusan */}
                  <div className="card border-primary shadow-sm mb-2">
                    <div className="card-header bg-primary text-white fw-bold">
                      <i className="bi bi-gavel me-2"></i>Seksi 2: Update Status Wawancara & Keputusan
                    </div>
                    <div className="card-body bg-white">
                      <div className="row g-3">
                        <div className="col-12">
                          <label className="form-label fw-bold">
                            Status Wawancara <span className="text-danger">*</span>
                          </label>
                          <select
                            className="form-select form-select-lg border-primary"
                            value={decision}
                            onChange={(e) => setDecision(e.target.value as 'PASSED' | 'FAILED')}
                            required
                          >
                            <option value="" disabled>-- Pilih Status Kelulusan --</option>
                            <option value="PASSED">Lulus Wawancara</option>
                            <option value="FAILED">Tidak Lulus Wawancara</option>
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label fw-bold">
                            Catatan / Executive Summary Evaluasi <span className="text-danger">*</span>
                          </label>
                          <textarea
                            className="form-control"
                            rows={3}
                            placeholder="Tuliskan catatan hasil wawancara, kelebihan, atau alasan keputusan..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            required
                          ></textarea>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer inside form */}
                  <div className="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                      disabled={submitting}
                    >
                      <i className="bi bi-x-circle me-1"></i>Batal
                    </button>
                    <button
                      type="submit"
                      className="btn btn-success px-4 fw-bold"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-send-check me-1"></i>Submit Hasil Wawancara
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
