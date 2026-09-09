import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

/* ── Type Definitions ──────────────────────────────────────────── */
interface QueueItem {
  id: string;
  registrationCode: string;
  nik: string;
  fullName: string;
  programName: string;
  submittedAt: string;
  submissionStatus: string;
  administrationStatus: string;
  lockedBy: string | null;
}

interface Stats {
  pending: number;
  revision: number;
  passed: number;
  rejected: number;
}

interface ChecklistEntry {
  requirementTypeCode: string;
  requirementTypeName: string;
  documentId: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  isValid: boolean;
  notes: string;
}

interface ReviewHistoryItem {
  id: string;
  decision: string;
  generalNotes: string;
  createdAt: string;
  items: { requirementTypeCode: string; isValid: boolean; notes: string }[];
}

interface ApplicationDetail {
  id: string;
  registrationCode: string;
  programSnapshot: any;
  submissionStatus: string;
  administrationStatus: string;
  version: number;
  submittedAt: string;
  personalDetails: any;
  educationDetails: any;
  consent: any;
  documents: any[];
}

/* ── Main Page Component ───────────────────────────────────────── */
export const VerifikatorPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [stats, setStats] = useState<Stats>({ pending: 0, revision: 0, passed: 0, rejected: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationDetail | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [checklist, setChecklist] = useState<ChecklistEntry[]>([]);
  const [decision, setDecision] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: string; text: string } | null>(null);
  const [lockedAppId, setLockedAppId] = useState<string | null>(null);

  /* ── Data Loading ──────────────────────────────────────────── */
  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.set('search', searchTerm);

      const res = await api.get<any>(`/api/v1/reviews/queue?${params.toString()}`);
      setQueue(res.data || []);
      setTotalItems(res.meta?.total || 0);
    } catch (err: any) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get<any>('/api/v1/reviews/stats');
      setStats(res.data || { pending: 0, revision: 0, passed: 0, rejected: 0 });
    } catch (err: any) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    loadQueue();
    loadStats();
  }, [loadQueue, loadStats]);

  /* ── Lock & Open Modal ─────────────────────────────────────── */
  const openVerificationModal = async (item: QueueItem) => {
    try {
      // 1. Lock the application
      await api.post(`/api/v1/reviews/${item.id}/lock`);
      setLockedAppId(item.id);

      // 2. Fetch full application detail
      const res = await api.get<any>(`/api/v1/reviews/${item.id}`);
      const appData = res.data?.application;
      const history = res.data?.reviewHistory || [];

      if (!appData) {
        throw new Error('Data permohonan tidak ditemukan');
      }

      setSelectedApp(appData);
      setReviewHistory(history);

      // 3. Build checklist from document bindings
      const docs = appData.documents || [];
      const entries: ChecklistEntry[] = docs.map((d: any) => ({
        requirementTypeCode: d.requirement_type_code,
        requirementTypeName: d.requirement_type_name,
        documentId: d.document_id,
        originalFilename: d.original_filename,
        mimeType: d.mime_type,
        fileSize: d.file_size,
        isValid: true,
        notes: ''
      }));
      setChecklist(entries);

      // 4. Reset form
      setDecision('');
      setGeneralNotes('');
      setActiveTab(0);
      setShowModal(true);
    } catch (err: any) {
      showToast('error', err.message || 'Gagal membuka verifikasi');
    }
  };

  /* ── Close Modal & Unlock ──────────────────────────────────── */
  const closeModal = async () => {
    if (lockedAppId) {
      try {
        await api.delete(`/api/v1/reviews/${lockedAppId}/lock`);
      } catch {
        // Ignore unlock errors
      }
      setLockedAppId(null);
    }
    setShowModal(false);
    setSelectedApp(null);
    setChecklist([]);
  };

  /* ── Submit Decision ───────────────────────────────────────── */
  const handleSubmitDecision = async () => {
    if (!selectedApp || !decision) {
      showToast('error', 'Pilih status keputusan terlebih dahulu');
      return;
    }

    if (!generalNotes.trim()) {
      showToast('error', 'Catatan verifikator wajib diisi');
      return;
    }

    if (checklist.length === 0) {
      showToast('error', 'Tidak ada dokumen untuk diverifikasi');
      return;
    }

    // Validate: PASSED requires all valid
    if (decision === 'PASSED') {
      const invalid = checklist.filter(c => !c.isValid);
      if (invalid.length > 0) {
        showToast('error', 'Keputusan LOLOS memerlukan semua dokumen berstatus Sesuai');
        return;
      }
    }

    // Validate: REVISION requires at least 1 invalid
    if (decision === 'REVISION') {
      const invalid = checklist.filter(c => !c.isValid);
      if (invalid.length === 0) {
        showToast('error', 'Keputusan REVISI memerlukan minimal 1 dokumen berstatus Ditolak');
        return;
      }
    }

    if (!window.confirm(`Anda yakin ingin submit keputusan "${getDecisionLabel(decision)}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/api/v1/reviews/${selectedApp.id}/decision`, {
        decision,
        generalNotes,
        checklist: checklist.map(c => ({
          requirementTypeCode: c.requirementTypeCode,
          isValid: c.isValid,
          notes: c.notes
        })),
        expectedVersion: selectedApp.version
      });

      setLockedAppId(null); // Lock released by server on decision
      setShowModal(false);
      setSelectedApp(null);

      showToast('success', 'Keputusan verifikasi berhasil disimpan');
      loadQueue();
      loadStats();
    } catch (err: any) {
      showToast('error', err.message || 'Gagal menyimpan keputusan');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Checklist Handlers ────────────────────────────────────── */
  const updateChecklistItem = (index: number, field: 'isValid' | 'notes', value: any) => {
    setChecklist(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  };

  /* ── Toast ─────────────────────────────────────────────────── */
  const showToast = (type: string, text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 4000);
  };

  /* ── Helpers ───────────────────────────────────────────────── */
  const getDecisionLabel = (d: string) => {
    switch (d) {
      case 'PASSED': return 'Disetujui (Lolos Seleksi Administrasi)';
      case 'REVISION': return 'Revisi (Harus Perbaikan Berkas)';
      case 'REJECTED': return 'Ditolak (Gugur Administrasi)';
      default: return '';
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime?.includes('pdf')) return 'bi-file-earmark-pdf';
    if (mime?.includes('image')) return 'bi-file-earmark-image';
    return 'bi-file-earmark';
  };

  const handleLogout = async () => {
    await logout();
    navigate('/internal/login');
  };

  /* ── Render ────────────────────────────────────────────────── */
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* ── Sidebar ────────────────────────────────────────────── */}
      <div
        className="d-flex flex-column p-3 text-white"
        style={{
          width: 260,
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0d6efd 0%, #0a58ca 100%)',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100
        }}
      >
        <div className="d-flex align-items-center mb-4 px-2 pt-2">
          <i className="bi bi-shield-check fs-2 me-2" />
          <div>
            <h6 className="fw-bold mb-0">PORTAL VERIFIKATOR</h6>
            <small className="text-white-50">Beasiswa App</small>
          </div>
        </div>
        <hr className="text-white-50 mt-0" />

        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item">
            <a
              href="#"
              className="nav-link active"
              style={{ color: '#fff', background: 'rgba(255,255,255,0.2)', borderRadius: 8, padding: '12px 15px', fontWeight: 500 }}
              onClick={e => e.preventDefault()}
            >
              <i className="bi bi-file-earmark-check me-2" />
              Verifikasi Seleksi Administrasi
            </a>
          </li>
        </ul>

        <hr className="text-white-50" />
        <div className="px-2">
          <button
            className="btn w-100 text-white"
            style={{ background: 'rgba(220,53,69,0.75)', borderRadius: 8, padding: '12px 15px' }}
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-2" />
            Logout
          </button>
        </div>
      </div>

      {/* ── Main Content ───────────────────────────────────────── */}
      <div style={{ marginLeft: 260, padding: 25, width: '100%', backgroundColor: '#f8f9fa' }}>
        {/* Toast */}
        {toastMsg && (
          <div
            className={`alert alert-${toastMsg.type === 'success' ? 'success' : 'danger'} alert-dismissible fade show position-fixed`}
            style={{ top: 20, right: 20, zIndex: 9999, minWidth: 320 }}
            role="alert"
          >
            <i className={`bi ${toastMsg.type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2`} />
            {toastMsg.text}
            <button type="button" className="btn-close" onClick={() => setToastMsg(null)} />
          </div>
        )}

        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom bg-white p-3 rounded shadow-sm">
          <div>
            <h4 className="fw-bold mb-0">Verifikasi Seleksi Administrasi</h4>
            <small className="text-muted">Kelola dan selesaikan verifikasi berkas calon peserta beasiswa</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
              <i className="bi bi-person-circle me-1" />
              Verifikator: {user?.fullName || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-primary text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Perlu Verifikasi</h6>
                <h3 className="fw-bold mb-0">{stats.pending}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-warning text-dark">
              <div className="card-body">
                <h6 className="card-title" style={{ opacity: 0.7 }}>Status Revisi</h6>
                <h3 className="fw-bold mb-0">{stats.revision}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-success text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Disetujui (Lolos)</h6>
                <h3 className="fw-bold mb-0">{stats.passed}</h3>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm bg-danger text-white">
              <div className="card-body">
                <h6 className="card-title text-white-50">Ditolak</h6>
                <h3 className="fw-bold mb-0">{stats.rejected}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-list-task me-2 text-primary" />
              Daftar Pendaftar (Baru Submit & Revisi)
              {totalItems > 0 && <span className="badge bg-primary ms-2">{totalItems}</span>}
            </span>
            <input
              type="text"
              className="form-control form-control-sm"
              style={{ width: 250 }}
              placeholder="Cari Nama / NIK..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && loadQueue()}
            />
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>No</th>
                    <th>NIK & Nama Peserta</th>
                    <th>Program Pelatihan</th>
                    <th>Tanggal Submit</th>
                    <th>Tipe Pengajuan</th>
                    <th>Status Saat Ini</th>
                    <th className="text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        <div className="spinner-border spinner-border-sm me-2" role="status" />
                        Memuat data...
                      </td>
                    </tr>
                  ) : queue.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4 text-muted">
                        <i className="bi bi-inbox fs-2 d-block mb-2" />
                        Tidak ada permohonan yang menunggu verifikasi
                      </td>
                    </tr>
                  ) : (
                    queue.map((item, idx) => (
                      <tr key={item.id}>
                        <td>{idx + 1}</td>
                        <td>
                          <strong>{item.fullName}</strong><br />
                          <small className="text-muted">NIK: {item.nik}</small>
                        </td>
                        <td>{item.programName}</td>
                        <td>{formatDate(item.submittedAt)}</td>
                        <td>
                          <span className={`badge ${item.submissionStatus === 'RESUBMITTED' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                            {item.submissionStatus === 'RESUBMITTED' ? 'Hasil Revisi' : 'Baru Submit'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-secondary">Menunggu Verifikasi</span>
                        </td>
                        <td className="text-center">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => openVerificationModal(item)}
                          >
                            <i className="bi bi-pencil-square me-1" />
                            Verifikasi Data
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

      {/* ── Verification Modal ─────────────────────────────────── */}
      {showModal && selectedApp && (
        <>
          <div className="modal-backdrop fade show" style={{ zIndex: 1040 }} />
          <div
            className="modal fade show d-block"
            style={{ zIndex: 1050 }}
            tabIndex={-1}
            role="dialog"
          >
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content border-0 shadow-lg">

                {/* Modal Header */}
                <div className="modal-header bg-primary text-white py-3">
                  <div className="d-flex align-items-center">
                    <div
                      className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: 45, height: 45 }}
                    >
                      <i className="bi bi-person-bounding-box fs-4" />
                    </div>
                    <div>
                      <h5 className="modal-title fw-bold mb-0">Verifikasi Berkas Seleksi Administrasi</h5>
                      <small className="text-white-50">
                        Kode Pendaftaran: {selectedApp.registrationCode} | Tipe: {selectedApp.submissionStatus === 'RESUBMITTED' ? 'Hasil Revisi' : 'Baru Submit'}
                      </small>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={closeModal} />
                </div>

                {/* Tab Navigation */}
                <div className="modal-body p-0 bg-light">
                  <ul className="nav nav-pills nav-justified bg-white border-bottom p-2 gap-2">
                    {[
                      { icon: 'bi-person-vcard', label: '1. Data Diri & Kontak' },
                      { icon: 'bi-mortarboard', label: '2. Pendidikan & Kerja' },
                      { icon: 'bi-file-earmark-check', label: '3. Upload Dokumen' },
                      { icon: 'bi-patch-check', label: '4. Persetujuan & Keputusan' }
                    ].map((tab, i) => (
                      <li className="nav-item" key={i}>
                        <button
                          className={`nav-link fw-semibold small ${activeTab === i ? 'active' : ''}`}
                          onClick={() => setActiveTab(i)}
                        >
                          <i className={`bi ${tab.icon} me-1`} />
                          {tab.label}
                        </button>
                      </li>
                    ))}
                  </ul>

                  <div className="p-4">
                    {/* Tab 1: Data Diri */}
                    {activeTab === 0 && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-white fw-bold text-primary border-bottom">
                          <i className="bi bi-card-heading me-2" />
                          Informasi Data Diri & Domisili Peserta
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <FieldDisplay label="NIK (Nomor Induk Kependudukan)" value={selectedApp.personalDetails?.nik} cols={4} bold />
                            <FieldDisplay label="Nama Lengkap" value={selectedApp.personalDetails?.full_name} cols={5} bold />
                            <FieldDisplay label="Jenis Kelamin" value={selectedApp.personalDetails?.gender === 'MALE' ? 'Laki-laki' : selectedApp.personalDetails?.gender === 'FEMALE' ? 'Perempuan' : '-'} cols={3} bold />
                            <FieldDisplay label="Tempat, Tanggal Lahir" value={`${selectedApp.personalDetails?.birth_place || '-'}, ${selectedApp.personalDetails?.birth_date ? formatDate(selectedApp.personalDetails.birth_date) : '-'}`} cols={4} />
                            <FieldDisplay label="No. HP / WhatsApp" value={selectedApp.personalDetails?.phone_number} cols={4} icon="bi-whatsapp text-success" />
                            <FieldDisplay label="Alamat Email" value={selectedApp.personalDetails?.email} cols={4} icon="bi-envelope text-primary" />
                            <FieldDisplay label="Alamat Domisili Lengkap" value={selectedApp.personalDetails?.address} cols={12} />
                            <FieldDisplay label="Provinsi" value={selectedApp.personalDetails?.province_name} cols={3} small />
                            <FieldDisplay label="Kabupaten/Kota" value={selectedApp.personalDetails?.regency_name} cols={3} small />
                            <FieldDisplay label="Kecamatan" value={selectedApp.personalDetails?.district_name} cols={3} small />
                            <FieldDisplay label="Kelurahan" value={selectedApp.personalDetails?.village_name} cols={3} small />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Pendidikan */}
                    {activeTab === 1 && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-white fw-bold text-primary border-bottom">
                          <i className="bi bi-book me-2" />
                          Riwayat Pendidikan & Pekerjaan
                        </div>
                        <div className="card-body">
                          <div className="row g-3">
                            <FieldDisplay label="Pendidikan Terakhir" value={selectedApp.educationDetails?.education_level} cols={6} bold />
                            <FieldDisplay label="Nama Instansi / Sekolah / Universitas" value={selectedApp.educationDetails?.institution_name} cols={6} bold />
                            <FieldDisplay label="Jurusan / Program Studi" value={selectedApp.educationDetails?.major} cols={6} />
                            <FieldDisplay label="Pekerjaan Saat Ini" value={selectedApp.educationDetails?.current_occupation} cols={6} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Dokumen Checklist */}
                    {activeTab === 2 && (
                      <div className="card border-0 shadow-sm mb-3">
                        <div className="card-header bg-white fw-bold text-primary border-bottom d-flex justify-content-between align-items-center">
                          <span>
                            <i className="bi bi-file-earmark-arrow-up me-2" />
                            Peninjauan Berkas Syarat (PDF/JPG/PNG Max 2MB)
                          </span>
                          <span className="badge bg-info-subtle text-info border border-info small">
                            {checklist.length} Dokumen Diunggah
                          </span>
                        </div>
                        <div className="card-body p-0">
                          {checklist.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                              <i className="bi bi-folder-x fs-2 d-block mb-2" />
                              Tidak ada dokumen yang diunggah
                            </div>
                          ) : (
                            <div className="table-responsive">
                              <table className="table table-hover align-middle mb-0">
                                <thead className="table-light small">
                                  <tr>
                                    <th style={{ width: '25%' }}>Persyaratan Dokumen</th>
                                    <th style={{ width: '20%' }}>Berkas Peserta</th>
                                    <th style={{ width: '25%' }}>Kesesuaian Data</th>
                                    <th>Catatan Perbaikan Verifikator</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {checklist.map((item, idx) => (
                                    <tr key={idx}>
                                      <td>
                                        <strong>{item.requirementTypeName}</strong><br />
                                        <small className="text-muted">
                                          Format: {item.mimeType?.split('/')[1]?.toUpperCase() || 'N/A'} ({formatFileSize(item.fileSize)})
                                        </small>
                                      </td>
                                      <td>
                                        <a
                                          href={`/api/v1/documents/${item.documentId}/content`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="btn btn-sm btn-outline-primary w-100"
                                        >
                                          <i className={`bi ${getFileIcon(item.mimeType)} me-1`} />
                                          Pratinjau
                                        </a>
                                      </td>
                                      <td>
                                        <div className="btn-group w-100" role="group">
                                          <input
                                            type="radio"
                                            className="btn-check"
                                            name={`check_${idx}`}
                                            id={`valid_${idx}`}
                                            checked={item.isValid}
                                            onChange={() => updateChecklistItem(idx, 'isValid', true)}
                                          />
                                          <label className="btn btn-outline-success btn-sm" htmlFor={`valid_${idx}`}>
                                            <i className="bi bi-check-lg" /> Sesuai
                                          </label>
                                          <input
                                            type="radio"
                                            className="btn-check"
                                            name={`check_${idx}`}
                                            id={`invalid_${idx}`}
                                            checked={!item.isValid}
                                            onChange={() => updateChecklistItem(idx, 'isValid', false)}
                                          />
                                          <label className="btn btn-outline-danger btn-sm" htmlFor={`invalid_${idx}`}>
                                            <i className="bi bi-x-lg" /> Ditolak
                                          </label>
                                        </div>
                                      </td>
                                      <td>
                                        <input
                                          type="text"
                                          className={`form-control form-control-sm ${!item.isValid ? 'border-danger text-danger' : ''}`}
                                          placeholder="Isi catatan jika tidak sesuai..."
                                          value={item.notes}
                                          onChange={e => updateChecklistItem(idx, 'notes', e.target.value)}
                                        />
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Previous Review History */}
                        {reviewHistory.length > 0 && (
                          <div className="card border-0 shadow-sm mt-3">
                            <div className="card-header bg-white fw-bold text-secondary border-bottom">
                              <i className="bi bi-clock-history me-2" />
                              Riwayat Verifikasi Sebelumnya
                            </div>
                            <div className="card-body">
                              {reviewHistory.map((rh, i) => (
                                <div key={i} className={`border rounded p-3 ${i > 0 ? 'mt-2' : ''}`}>
                                  <div className="d-flex justify-content-between">
                                    <span className={`badge ${rh.decision === 'PASSED' ? 'bg-success' : rh.decision === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                      {rh.decision === 'PASSED' ? 'Disetujui' : rh.decision === 'REJECTED' ? 'Ditolak' : 'Revisi'}
                                    </span>
                                    <small className="text-muted">{formatDate(rh.createdAt)}</small>
                                  </div>
                                  {rh.generalNotes && <p className="mb-1 mt-2 small">{rh.generalNotes}</p>}
                                  {rh.items.filter(ri => !ri.isValid).length > 0 && (
                                    <ul className="mb-0 small text-danger">
                                      {rh.items.filter(ri => !ri.isValid).map((ri, j) => (
                                        <li key={j}>{ri.requirementTypeCode}: {ri.notes || 'Tidak sesuai'}</li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 4: Persetujuan & Keputusan */}
                    {activeTab === 3 && (
                      <>
                        {/* Consent Status */}
                        <div className="card border-0 shadow-sm mb-3">
                          <div className="card-header bg-white fw-bold text-primary border-bottom">
                            <i className="bi bi-shield-check me-2" />
                            Checklist Akhir & Statement Peserta
                          </div>
                          <div className="card-body">
                            {selectedApp.consent ? (
                              <div className="alert alert-success d-flex align-items-center mb-0">
                                <i className="bi bi-check-circle-fill fs-4 me-3" />
                                <div>
                                  <strong>Pernyataan Keabsahan Data Disetujui Peserta</strong>
                                  <p className="mb-0 small">
                                    Peserta telah menyetujui pernyataan keabsahan dokumen dan ketentuan pendaftaran
                                    pada {selectedApp.consent?.agreed_at ? formatDate(selectedApp.consent.agreed_at) : '-'}.
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <div className="alert alert-warning d-flex align-items-center mb-0">
                                <i className="bi bi-exclamation-triangle-fill fs-4 me-3" />
                                <div>
                                  <strong>Pernyataan Belum Disetujui</strong>
                                  <p className="mb-0 small">Peserta belum menyetujui pernyataan keabsahan.</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Decision Form */}
                        <div className="card border-primary shadow-sm">
                          <div className="card-header bg-primary text-white fw-bold">
                            <i className="bi bi-gavel me-2" />
                            Keputusan Akhir Verifikator
                          </div>
                          <div className="card-body bg-white">
                            <div className="row g-3">
                              <div className="col-md-5">
                                <label className="form-label fw-bold">
                                  Status Keputusan <span className="text-danger">*</span>
                                </label>
                                <select
                                  className="form-select form-select-lg border-primary"
                                  value={decision}
                                  onChange={e => setDecision(e.target.value)}
                                  required
                                >
                                  <option value="" disabled>-- Pilih Status --</option>
                                  <option value="PASSED">Disetujui (Lolos Seleksi Administrasi)</option>
                                  <option value="REVISION">Revisi (Harus Perbaikan Berkas)</option>
                                  <option value="REJECTED">Ditolak (Gugur Administrasi)</option>
                                </select>
                              </div>
                              <div className="col-md-7">
                                <label className="form-label fw-bold">
                                  Catatan Verifikator untuk Peserta <span className="text-danger">*</span>
                                </label>
                                <textarea
                                  className="form-control"
                                  rows={3}
                                  placeholder="Tuliskan alasan keputusan atau petunjuk perbaikan berkas secara jelas..."
                                  value={generalNotes}
                                  onChange={e => setGeneralNotes(e.target.value)}
                                  required
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="modal-footer bg-white border-top justify-content-between">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>
                    <i className="bi bi-x-circle me-1" />
                    Tutup
                  </button>
                  <div>
                    {activeTab < 3 ? (
                      <button
                        className="btn btn-primary px-4"
                        onClick={() => setActiveTab(activeTab + 1)}
                      >
                        Selanjutnya <i className="bi bi-arrow-right ms-1" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-success px-4 fw-bold"
                        onClick={handleSubmitDecision}
                        disabled={submitting || !decision}
                      >
                        {submitting ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" />
                            Menyimpan...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-send-check me-1" />
                            Submit Keputusan Verifikasi
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/* ── Field Display Helper Component ──────────────────────────── */
const FieldDisplay: React.FC<{
  label: string;
  value: any;
  cols: number;
  bold?: boolean;
  small?: boolean;
  icon?: string;
}> = ({ label, value, cols, bold, small, icon }) => (
  <div className={`col-md-${cols}`}>
    <label className="text-muted d-block mb-1" style={{ fontSize: '0.75rem' }}>{label}</label>
    <div
      className={`${bold ? 'fw-bold' : 'fw-semibold'} ${small ? 'small' : 'fs-6'} text-dark bg-light p-2 rounded border`}
    >
      {icon && <i className={`bi ${icon} me-1`} />}
      {value || '-'}
    </div>
  </div>
);
