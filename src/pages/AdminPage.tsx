import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

interface ProgramAdminItem {
  id: string;
  code: string;
  name: string;
  quota: number;
  method: string;
  is_published: boolean | number;
  registration_start_at: string;
  registration_end_at: string;
  created_at: string;
}

interface RequirementTypeItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  allowed_types: string[];
  max_bytes: number;
  is_active: boolean;
}

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master-beasiswa' | 'master-syarat' | 'users' | 'roles'>('dashboard');

  // Programs state
  const [programs, setPrograms] = useState<ProgramAdminItem[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // New Program form state
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQuota, setNewQuota] = useState(50);
  const [newMethod, setNewMethod] = useState<'DARING' | 'HYBRID' | 'LURING'>('DARING');
  const [newStart, setNewStart] = useState('2026-09-01T00:00:00.000Z');
  const [newEnd, setNewEnd] = useState('2026-10-31T23:59:59.000Z');

  // Requirements state
  const [requirements, setRequirements] = useState<RequirementTypeItem[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);

  // Load programs
  const loadPrograms = async () => {
    setIsLoadingPrograms(true);
    try {
      const res = await api.get('/api/v1/programs/admin/all');
      if (res.data) setPrograms(res.data);
    } catch {
      // Ignore
    } finally {
      setIsLoadingPrograms(false);
    }
  };

  // Load requirements
  const loadRequirements = async () => {
    setIsLoadingRequirements(true);
    try {
      const res = await api.get('/api/v1/requirements/types');
      if (res.data) setRequirements(res.data);
    } catch {
      // Ignore
    } finally {
      setIsLoadingRequirements(false);
    }
  };

  useEffect(() => {
    loadPrograms();
    loadRequirements();
  }, []);

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.post('/api/v1/programs', {
        code: newCode.trim(),
        name: newName.trim(),
        description: newDesc.trim(),
        quota: Number(newQuota),
        method: newMethod,
        registrationStartAt: new Date(newStart).toISOString(),
        registrationEndAt: new Date(newEnd).toISOString(),
        isPublished: true
      });

      setActionSuccess(`Program '${newName}' berhasil dibuat dan dipublikasikan!`);
      setIsAddProgramOpen(false);
      setNewCode('');
      setNewName('');
      setNewDesc('');
      loadPrograms();
    } catch (err: any) {
      setActionError(err.message || 'Gagal menambahkan program');
    }
  };

  const handlePublish = async (id: string, name: string) => {
    try {
      await api.post(`/api/v1/programs/${id}/publish`);
      setActionSuccess(`Program '${name}' berhasil dipublikasikan.`);
      loadPrograms();
    } catch (err: any) {
      setActionError(err.message || 'Gagal mempublikasikan program');
    }
  };

  const handleClose = async (id: string, name: string) => {
    try {
      await api.post(`/api/v1/programs/${id}/close`);
      setActionSuccess(`Pendaftaran program '${name}' telah ditutup.`);
      loadPrograms();
    } catch (err: any) {
      setActionError(err.message || 'Gagal menutup pendaftaran program');
    }
  };

  return (
    <div className="d-flex min-vh-100 bg-light">
      {/* ── Sidebar ────────────────────────────────────────── */}
      <div
        className="d-flex flex-column p-3 text-white position-fixed h-100 shadow"
        style={{
          width: '260px',
          background: 'linear-gradient(180deg, #0d6efd 0%, #0a58ca 100%)',
          zIndex: 100,
        }}
      >
        <div className="d-flex align-items-center mb-3 px-2 pt-2">
          <i className="bi bi-gear-wide-connected fs-2 me-2"></i>
          <div>
            <h6 className="fw-bold mb-0">ADMINISTRATOR</h6>
            <small className="text-white-50">Portal Beasiswa</small>
          </div>
        </div>
        <hr className="text-white-50 mt-0" />

        <ul className="nav nav-pills flex-column mb-auto">
          <li className="nav-item mb-1">
            <button
              className={`nav-link text-white text-start w-100 border-0 ${
                activeTab === 'dashboard' ? 'active bg-white bg-opacity-25' : 'bg-transparent'
              }`}
              onClick={() => setActiveTab('dashboard')}
            >
              <i className="bi bi-speedometer2 me-2"></i>Dashboard
            </button>
          </li>
          <li className="nav-item mb-1">
            <button
              className={`nav-link text-white text-start w-100 border-0 ${
                activeTab === 'master-beasiswa' ? 'active bg-white bg-opacity-25' : 'bg-transparent'
              }`}
              onClick={() => setActiveTab('master-beasiswa')}
            >
              <i className="bi bi-mortarboard me-2"></i>CRUD Beasiswa
            </button>
          </li>
          <li className="nav-item mb-1">
            <button
              className={`nav-link text-white text-start w-100 border-0 ${
                activeTab === 'master-syarat' ? 'active bg-white bg-opacity-25' : 'bg-transparent'
              }`}
              onClick={() => setActiveTab('master-syarat')}
            >
              <i className="bi bi-file-earmark-check me-2"></i>CRUD Persyaratan
            </button>
          </li>
          <li className="nav-item mb-1">
            <button
              className={`nav-link text-white text-start w-100 border-0 ${
                activeTab === 'users' ? 'active bg-white bg-opacity-25' : 'bg-transparent'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <i className="bi bi-people me-2"></i>Users Internal
            </button>
          </li>
        </ul>

        <hr className="text-white-50" />
        <div className="px-2">
          <button
            className="nav-link text-white bg-danger bg-opacity-75 border-0 rounded w-100 py-2 text-start"
            onClick={() => logout()}
          >
            <i className="bi bi-box-arrow-right me-2"></i>Logout
          </button>
        </div>
      </div>

      {/* ── Main Content Area ──────────────────────────────── */}
      <div className="flex-grow-1 p-4" style={{ marginLeft: '260px' }}>
        {/* Top Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom bg-white p-3 rounded shadow-sm">
          <div>
            <h4 className="fw-bold mb-0">Panel Administrator</h4>
            <small className="text-muted">
              Manajemen Sistem Pendaftaran &amp; Seleksi Beasiswa Pelatihan
            </small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
              <i className="bi bi-person-fill-gear me-1"></i> {user?.fullName || user?.email}
            </span>
            <Link to="/" className="btn btn-sm btn-outline-secondary">
              <i className="bi bi-globe me-1"></i>Lihat Beranda
            </Link>
          </div>
        </div>

        {/* Global Notifications */}
        {actionSuccess && (
          <div className="alert alert-success alert-dismissible fade show py-2 small mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>{actionSuccess}
            <button type="button" className="btn-close" onClick={() => setActionSuccess(null)}></button>
          </div>
        )}
        {actionError && (
          <div className="alert alert-danger alert-dismissible fade show py-2 small mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{actionError}
            <button type="button" className="btn-close" onClick={() => setActionError(null)}></button>
          </div>
        )}

        {/* ── TAB 1: DASHBOARD ──────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div>
            <h5 className="fw-bold mb-3">
              <i className="bi bi-bar-chart-line me-2 text-primary"></i>Ringkasan Statistik Pendaftaran
            </h5>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card border-0 shadow-sm bg-primary text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Total Program</small>
                      <h2 className="fw-bold mb-0">{programs.length}</h2>
                    </div>
                    <i className="bi bi-mortarboard fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm bg-info text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Program Aktif</small>
                      <h2 className="fw-bold mb-0">{programs.filter(p => Boolean(p.is_published)).length}</h2>
                    </div>
                    <i className="bi bi-broadcast fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm bg-success text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Total Kuota Tersedia</small>
                      <h2 className="fw-bold mb-0">
                        {programs.reduce((acc, p) => acc + (p.quota || 0), 0)}
                      </h2>
                    </div>
                    <i className="bi bi-people-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-0 shadow-sm bg-secondary text-white p-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Persyaratan Dokumen</small>
                      <h2 className="fw-bold mb-0">{requirements.length}</h2>
                    </div>
                    <i className="bi bi-file-earmark-check fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CRUD BEASISWA ──────────────────────────── */}
        {activeTab === 'master-beasiswa' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
              <h6 className="fw-bold mb-0">Master Data Beasiswa Pelatihan (PRD §5.2)</h6>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setIsAddProgramOpen(true)}
              >
                <i className="bi bi-plus-lg me-1"></i>Tambah Beasiswa
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Kode</th>
                      <th>Nama Beasiswa Pelatihan</th>
                      <th>Kuota</th>
                      <th>Metode</th>
                      <th>Batas Pendaftaran</th>
                      <th>Status</th>
                      <th className="text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingPrograms ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          Memuat data program...
                        </td>
                      </tr>
                    ) : programs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted">
                          Belum ada program beasiswa yang terdaftar.
                        </td>
                      </tr>
                    ) : (
                      programs.map((prog) => {
                        const isPub = Boolean(prog.is_published);
                        return (
                          <tr key={prog.id}>
                            <td><code>{prog.code}</code></td>
                            <td><strong>{prog.name}</strong></td>
                            <td>{prog.quota} Peserta</td>
                            <td>
                              <span className="badge bg-light text-dark border">
                                {prog.method}
                              </span>
                            </td>
                            <td>
                              {new Date(prog.registration_end_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td>
                              {isPub ? (
                                <span className="badge bg-success">PUBLISHED</span>
                              ) : (
                                <span className="badge bg-warning text-dark">DRAFT</span>
                              )}
                            </td>
                            <td className="text-center">
                              <div className="btn-group btn-group-sm">
                                {!isPub ? (
                                  <button
                                    className="btn btn-outline-success"
                                    title="Publikasikan"
                                    onClick={() => handlePublish(prog.id, prog.name)}
                                  >
                                    <i className="bi bi-send-check me-1"></i>Publish
                                  </button>
                                ) : (
                                  <button
                                    className="btn btn-outline-danger"
                                    title="Tutup Pendaftaran"
                                    onClick={() => handleClose(prog.id, prog.name)}
                                  >
                                    <i className="bi bi-x-circle me-1"></i>Tutup
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CRUD PERSYARATAN ───────────────────────── */}
        {activeTab === 'master-syarat' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0">Master Data Persyaratan Dokumen (PRD §5.2)</h6>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Kode Dokumen</th>
                      <th>Nama Persyaratan</th>
                      <th>Format Diizinkan</th>
                      <th>Ukuran Maksimal</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingRequirements ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-muted">
                          Memuat data persyaratan...
                        </td>
                      </tr>
                    ) : requirements.map((req) => (
                      <tr key={req.id}>
                        <td><code>{req.code}</code></td>
                        <td><strong>{req.name}</strong></td>
                        <td>
                          {req.allowed_types ? req.allowed_types.map(t => (
                            <span key={t} className="badge bg-light text-dark border me-1">
                              {t.split('/')[1]?.toUpperCase()}
                            </span>
                          )) : '-'}
                        </td>
                        <td>{(req.max_bytes / 1048576).toFixed(0)} MB</td>
                        <td>
                          <span className="badge bg-success">Aktif</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: USERS INTERNAL ─────────────────────────── */}
        {activeTab === 'users' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3">
              <h6 className="fw-bold mb-0">Manajemen Users Internal (PRD §5.1)</h6>
            </div>
            <div className="card-body p-4 text-center">
              <i className="bi bi-person-badge fs-1 text-primary mb-2"></i>
              <p className="text-muted small">
                Akun Verifikator, Lembaga Seleksi, dan Admin dikelola secara terpusat oleh layanan RBAC.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL: TAMBAH BEASISWA ──────────────────────────── */}
      {isAddProgramOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">Tambah Program Beasiswa Pelatihan</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsAddProgramOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateProgram}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-4">
                      <label className="form-label fw-semibold small">Kode Program</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="contoh: PROG-WEB-2026"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                        required
                      />
                    </div>
                    <div className="col-md-8">
                      <label className="form-label fw-semibold small">Nama Program Beasiswa</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="contoh: Pelatihan Fullstack Web Developer"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold small">Deskripsi Program</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Penjelasan ringkas mengenai kompetensi dan materi pelatihan..."
                        value={newDesc}
                        onChange={(e) => setNewDesc(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Alokasi Kuota Peserta</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        value={newQuota}
                        onChange={(e) => setNewQuota(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Metode Pelaksanaan</label>
                      <select
                        className="form-select"
                        value={newMethod}
                        onChange={(e) => setNewMethod(e.target.value as any)}
                      >
                        <option value="DARING">DARING (Online Penuh)</option>
                        <option value="HYBRID">HYBRID (Kombinasi Online & Offline)</option>
                        <option value="LURING">LURING (Tatap Muka Fisik)</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Tanggal Buka Pendaftaran</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newStart.split('T')[0]}
                        onChange={(e) => setNewStart(`${e.target.value}T00:00:00.000Z`)}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label fw-semibold small">Batas Akhir Pendaftaran</label>
                      <input
                        type="date"
                        className="form-control"
                        value={newEnd.split('T')[0]}
                        onChange={(e) => setNewEnd(`${e.target.value}T23:59:59.000Z`)}
                        required
                      />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddProgramOpen(false)}>
                    Batal
                  </button>
                  <button type="submit" className="btn btn-primary fw-semibold">
                    Simpan &amp; Terbitkan Program
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
