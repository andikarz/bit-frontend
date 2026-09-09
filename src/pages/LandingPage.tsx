import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginModal } from '../components/auth/LoginModal';
import { RegisterModal } from '../components/auth/RegisterModal';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';
import { ChangePasswordModal } from '../components/auth/ChangePasswordModal';
import { api } from '../services/api';
import { Link, useNavigate } from 'react-router-dom';

interface ProgramItem {
  id: string;
  title: string;
  category: string;
  description: string;
  badge: string;
  badgeClass: string;
  deadline: string;
  method: string;
  quota: number;
}

interface RequirementItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  allowedTypes: string[];
  maxBytes: number;
  isRequired: boolean;
}

const FALLBACK_PROGRAMS: ProgramItem[] = [
  {
    id: 'prog-1',
    title: 'Pelatihan Web Developer Specialist',
    category: 'Teknologi Informasi',
    description:
      'Mempelajari pengembangan aplikasi web modern berbasis Fullstack dari tingkat dasar hingga profesional.',
    badge: 'Pendaftaran Dibuka',
    badgeClass: 'bg-success',
    deadline: '30 Sept 2026',
    method: 'Daring (Online)',
    quota: 100,
  },
  {
    id: 'prog-2',
    title: 'Pelatihan Data Analyst & SQL',
    category: 'Data Science',
    description:
      'Pelajari analisis data, visualisasi, serta pengelolaan database relational untuk kebutuhan industri digital.',
    badge: 'Pendaftaran Dibuka',
    badgeClass: 'bg-success',
    deadline: '15 Okt 2026',
    method: 'Hybrid (Bandung)',
    quota: 50,
  },
  {
    id: 'prog-3',
    title: 'UI/UX Design & Prototyping',
    category: 'Desain Digital',
    description:
      'Menguasai riset pengguna, pembuatan wireframe, hingga rancangan prototipe aplikasi yang efisien.',
    badge: 'Segera Ditutup',
    badgeClass: 'bg-danger',
    deadline: '10 Sept 2026',
    method: 'Daring (Online)',
    quota: 75,
  },
];

export const LandingPage: React.FC = () => {
  const { user, logout, needsPasswordChange } = useAuth();
  const navigate = useNavigate();

  const [programs, setPrograms] = useState<ProgramItem[]>(FALLBACK_PROGRAMS);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(true);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  
  const [selectedProgram, setSelectedProgram] = useState<ProgramItem | null>(null);
  const [programRequirements, setProgramRequirements] = useState<RequirementItem[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Load published programs dynamically from Master service via Gateway
  useEffect(() => {
    api.get('/api/v1/programs')
      .then((res) => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          const mapped: ProgramItem[] = res.data.map((p: any) => {
            const endDate = new Date(p.registration_end_at || p.registrationEndAt);
            const isClosed = endDate < new Date();
            return {
              id: p.id,
              title: p.name,
              category: p.method === 'DARING' ? 'Online Class' : p.location || 'Pelatihan Kejuruan',
              description: p.description || 'Program beasiswa pelatihan keahlian bersertifikat resmi.',
              badge: isClosed ? 'Ditutup' : 'Pendaftaran Dibuka',
              badgeClass: isClosed ? 'bg-secondary' : 'bg-success',
              deadline: endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
              method: p.method === 'DARING' ? 'Daring (Online)' : p.method === 'HYBRID' ? 'Hybrid' : 'Luring (Tatap Muka)',
              quota: p.quota
            };
          });
          setPrograms(mapped);
        }
      })
      .catch(() => {
        // Fallback data is preserved
      })
      .finally(() => {
        setIsLoadingPrograms(false);
      });
  }, []);

  const handleOpenDetail = async (prog: ProgramItem) => {
    setSelectedProgram(prog);
    setIsLoadingDetail(true);
    try {
      const res = await api.get(`/api/v1/programs/${prog.id}`);
      if (res.data && res.data.requirements) {
        setProgramRequirements(res.data.requirements);
      } else {
        setProgramRequirements([]);
      }
    } catch {
      setProgramRequirements([]);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleStartApply = (program: ProgramItem) => {
    if (!user) {
      setIsLoginOpen(true);
    } else if (user.role === 'PESERTA') {
      navigate(`/daftar?programId=${program.id}`);
    } else {
      navigate('/internal/login');
    }
  };

  return (
    <div>
      {/* ── Navigation Bar ───────────────────────────────────── */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            <i className="bi bi-mortarboard-fill me-2"></i>BeasiswaApp
          </Link>
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto me-3">
              <li className="nav-item">
                <a className="nav-link active" href="#home">
                  Beranda
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#program">
                  Program Beasiswa
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#persyaratan">
                  Persyaratan Umum
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="#alur">
                  Alur Pendaftaran
                </a>
              </li>
            </ul>

            <div className="d-flex align-items-center gap-2">
              {!user ? (
                <>
                  <button
                    className="btn btn-outline-light btn-sm px-3"
                    onClick={() => setIsLoginOpen(true)}
                  >
                    Masuk
                  </button>
                  <button
                    className="btn btn-light text-primary fw-semibold btn-sm px-3"
                    onClick={() => setIsRegisterOpen(true)}
                  >
                    Daftar Akun
                  </button>
                </>
              ) : (
                <div className="dropdown">
                  <button
                    className="btn btn-light btn-sm dropdown-toggle fw-semibold text-primary d-flex align-items-center gap-2"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    <i className="bi bi-person-circle"></i>
                    <span>{user.fullName || user.email}</span>
                    <span className="badge bg-primary text-white ms-1">{user.role}</span>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow border-0">
                    {user.role === 'PESERTA' && (
                      <li>
                        <Link className="dropdown-item" to="/daftar">
                          <i className="bi bi-file-earmark-text me-2"></i>Formulir Pendaftaran
                        </Link>
                      </li>
                    )}
                    {user.role === 'ADMIN' && (
                      <li>
                        <Link className="dropdown-item" to="/admin">
                          <i className="bi bi-speedometer2 me-2"></i>Dashboard Admin
                        </Link>
                      </li>
                    )}
                    {user.role === 'VERIFIKATOR' && (
                      <li>
                        <Link className="dropdown-item" to="/verifikator">
                          <i className="bi bi-check2-circle me-2"></i>Workspace Verifikator
                        </Link>
                      </li>
                    )}
                    {user.role === 'LEMBAGA_SELEKSI' && (
                      <li>
                        <Link className="dropdown-item" to="/wawancara">
                          <i className="bi bi-mic me-2"></i>Workspace Wawancara
                        </Link>
                      </li>
                    )}
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => setIsChangePasswordOpen(true)}
                      >
                        <i className="bi bi-key me-2"></i>Ganti Password
                      </button>
                    </li>
                    <li>
                      <hr className="dropdown-divider" />
                    </li>
                    <li>
                      <button
                        className="dropdown-item text-danger"
                        onClick={() => logout()}
                      >
                        <i className="bi bi-box-arrow-right me-2"></i>Keluar
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero Section ─────────────────────────────────────── */}
      <section
        id="home"
        className="text-center text-md-start text-white py-5"
        style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)' }}
      >
        <div className="container py-4">
          <div className="row align-items-center">
            <div className="col-lg-7">
              <h1 className="display-4 fw-bold mb-3">
                Tingkatkan Keahlian Anda Bersama Beasiswa Pelatihan
              </h1>
              <p className="lead mb-4 opacity-90">
                Daftarkan diri Anda untuk mengikuti berbagai program pelatihan bersertifikat gratis.
                Pilih program yang sesuai dengan jalur karier impian Anda.
              </p>
              <div className="d-flex flex-wrap gap-2">
                <a href="#program" className="btn btn-warning btn-lg fw-bold px-4">
                  Lihat Beasiswa Aktif
                </a>
                {!user && (
                  <button
                    className="btn btn-outline-light btn-lg px-4"
                    onClick={() => setIsRegisterOpen(true)}
                  >
                    Daftar Sekarang
                  </button>
                )}
              </div>
            </div>
            <div className="col-lg-5 text-center d-none d-lg-block">
              <i className="bi bi-award display-1 opacity-75" style={{ fontSize: '9rem' }}></i>
            </div>
          </div>
        </div>
      </section>

      {/* ── Programs Section ─────────────────────────────────── */}
      <section id="program" className="py-5 bg-light">
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="fw-bold">Program Beasiswa Pelatihan Aktif</h2>
            <p className="text-muted">Pilih program pelatihan yang saat ini membuka pendaftaran</p>
          </div>

          {isLoadingPrograms ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted small">Memuat daftar beasiswa...</p>
            </div>
          ) : (
            <div className="row g-4">
              {programs.map((prog) => (
                <div className="col-md-6 col-lg-4" key={prog.id}>
                  <div className="card h-100 border-0 shadow-sm">
                    <div className="card-body">
                      <span className={`badge ${prog.badgeClass} mb-2`}>
                        <i className="bi bi-clock me-1"></i>
                        {prog.badge}
                      </span>
                      <h5 className="card-title fw-bold mb-2">{prog.title}</h5>
                      <p className="card-text text-muted small">{prog.description}</p>
                      <hr />
                      <ul className="list-unstyled small mb-4">
                        <li className="mb-1">
                          <i className="bi bi-calendar-event me-2 text-primary"></i>
                          <strong>Batas Pendaftaran:</strong> {prog.deadline}
                        </li>
                        <li className="mb-1">
                          <i className="bi bi-geo-alt me-2 text-primary"></i>
                          <strong>Metode:</strong> {prog.method}
                        </li>
                        <li>
                          <i className="bi bi-people me-2 text-primary"></i>
                          <strong>Kuota:</strong> {prog.quota} Peserta
                        </li>
                      </ul>
                    </div>
                    <div className="card-footer bg-transparent border-0 pb-3">
                      <button
                        className="btn btn-primary w-100 fw-semibold"
                        onClick={() => handleOpenDetail(prog)}
                      >
                        Lihat Detail & Daftar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Persyaratan Section ──────────────────────────────── */}
      <section id="persyaratan" className="py-5">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <h2 className="fw-bold mb-3">Persyaratan Berkas Pendaftaran</h2>
              <p className="text-muted mb-4">
                Sebelum melakukan pendaftaran, pastikan Anda telah menyiapkan berkas-berkas pendukung
                berikut dalam format <strong>PDF/JPG/PNG (Maks. 2MB per file)</strong>:
              </p>

              <div className="d-flex mb-3">
                <div className="me-3 text-primary">
                  <i className="bi bi-card-heading fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Kartu Tanda Penduduk (KTP)</h5>
                  <p className="text-muted small mb-0">
                    Identitas resmi yang mencantumkan NIK yang valid.
                  </p>
                </div>
              </div>

              <div className="d-flex mb-3">
                <div className="me-3 text-primary">
                  <i className="bi bi-people-fill fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Kartu Keluarga (KK)</h5>
                  <p className="text-muted small mb-0">
                    Dokumen verifikasi data domisili dan keluarga.
                  </p>
                </div>
              </div>

              <div className="d-flex mb-3">
                <div className="me-3 text-primary">
                  <i className="bi bi-mortarboard fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Ijazah Terakhir / Transkrip</h5>
                  <p className="text-muted small mb-0">
                    Bukti jenjang pendidikan formal terakhir.
                  </p>
                </div>
              </div>

              <div className="d-flex">
                <div className="me-3 text-primary">
                  <i className="bi bi-file-earmark-check fs-3"></i>
                </div>
                <div>
                  <h5 className="fw-bold mb-1">Surat Pernyataan Komitmen</h5>
                  <p className="text-muted small mb-0">
                    Pernyataan kesediaan mengikuti pelatihan sampai selesai.
                  </p>
                </div>
              </div>
            </div>

            <div className="col-lg-6" id="alur">
              <div className="card border-0 shadow-sm bg-light">
                <div className="card-body p-4">
                  <h4 className="fw-bold mb-4 text-primary">
                    <i className="bi bi-signpost-2 me-2"></i>Alur Pendaftaran
                  </h4>

                  <div className="d-flex mb-3">
                    <span className="badge bg-primary rounded-circle p-3 me-3 align-self-start">
                      1
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Buat Akun & Login</h6>
                      <p className="small text-muted">
                        Daftarkan NIK dan Email untuk memperoleh akun dan kata sandi sementara.
                      </p>
                    </div>
                  </div>

                  <div className="d-flex mb-3">
                    <span className="badge bg-primary rounded-circle p-3 me-3 align-self-start">
                      2
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Pengisian Formulir (4 Step Wizard)</h6>
                      <p className="small text-muted">
                        Lengkapi Data Diri, Pendidikan/Pekerjaan, Upload Berkas, dan Pernyataan
                        Keabsahan.
                      </p>
                    </div>
                  </div>

                  <div className="d-flex mb-3">
                    <span className="badge bg-primary rounded-circle p-3 me-3 align-self-start">
                      3
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Seleksi Administrasi & Wawancara</h6>
                      <p className="small text-muted">
                        Pantau status seleksi secara realtime melalui dashboard akun Anda.
                      </p>
                    </div>
                  </div>

                  <div className="d-flex">
                    <span className="badge bg-success rounded-circle p-3 me-3 align-self-start">
                      4
                    </span>
                    <div>
                      <h6 className="fw-bold mb-0">Pengumuman Kelulusan</h6>
                      <p className="small text-muted">
                        Peserta yang lulus seleksi wawancara berhak mengikuti pelatihan.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="bg-dark text-white py-4">
        <div className="container text-center">
          <p className="mb-1 small">
            &copy; 2026 Portal Aplikasi Pendaftaran Beasiswa Pelatihan. All rights reserved.
          </p>
          <p className="mb-0 small">
            <Link to="/internal/login" className="text-white-50 text-decoration-none">
              <i className="bi bi-shield-lock me-1"></i>Portal Petugas &amp; Administrator Internal
            </Link>
          </p>
        </div>
      </footer>

      {/* ── Modals ────────────────────────────────────────────── */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenForgotPassword={() => setIsForgotOpen(true)}
      />

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <ForgotPasswordModal
        isOpen={isForgotOpen}
        onClose={() => setIsForgotOpen(false)}
        onOpenLogin={() => setIsLoginOpen(true)}
      />

      <ChangePasswordModal
        isOpen={isChangePasswordOpen || needsPasswordChange}
        isForced={needsPasswordChange}
        onClose={() => setIsChangePasswordOpen(false)}
      />

      {/* ── Program Detail Modal with Dynamic Requirements ─────── */}
      {selectedProgram && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content shadow">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">{selectedProgram.title}</h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setSelectedProgram(null)}
                ></button>
              </div>
              <div className="modal-body p-4">
                <h6 className="fw-bold">Deskripsi Program</h6>
                <p className="text-muted small">{selectedProgram.description}</p>

                <div className="row g-3 my-2">
                  <div className="col-sm-4">
                    <div className="p-2 border rounded bg-light">
                      <small className="text-muted d-block">Metode Pelaksanaan</small>
                      <strong className="text-primary">{selectedProgram.method}</strong>
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="p-2 border rounded bg-light">
                      <small className="text-muted d-block">Batas Pendaftaran</small>
                      <strong className="text-primary">{selectedProgram.deadline}</strong>
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="p-2 border rounded bg-light">
                      <small className="text-muted d-block">Alokasi Kuota</small>
                      <strong className="text-primary">{selectedProgram.quota} Peserta</strong>
                    </div>
                  </div>
                </div>

                <h6 className="fw-bold mt-4">Dokumen yang Wajib Diunggah</h6>
                {isLoadingDetail ? (
                  <div className="text-center py-2">
                    <div className="spinner-border spinner-border-sm text-primary"></div>
                    <span className="ms-2 small text-muted">Memuat daftar berkas persyaratan...</span>
                  </div>
                ) : programRequirements.length > 0 ? (
                  <ul className="list-group list-group-flush mb-3">
                    {programRequirements.map((req) => (
                      <li
                        key={req.id}
                        className="list-group-item d-flex justify-content-between align-items-center px-0 py-2"
                      >
                        <div>
                          <strong>{req.name}</strong>
                          {req.description && (
                            <small className="text-muted d-block">{req.description}</small>
                          )}
                          <small className="text-secondary">
                            Format: {req.allowedTypes ? req.allowedTypes.map(t => t.split('/')[1]?.toUpperCase()).join(', ') : 'PDF'} | Maks: {(req.maxBytes / 1048576).toFixed(0)}MB
                          </small>
                        </div>
                        <span className={`badge ${req.isRequired ? 'bg-danger' : 'bg-secondary'}`}>
                          {req.isRequired ? 'Wajib' : 'Opsional'}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <ul className="text-muted small">
                    <li>Scan KTP &amp; Kartu Keluarga (PDF / JPG, Maks 2MB)</li>
                    <li>Scan Ijazah Terakhir / SKL (PDF, Maks 2MB)</li>
                    <li>Surat Pernyataan Komitmen Pelatihan (PDF, Maks 2MB)</li>
                  </ul>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedProgram(null)}
                >
                  Tutup
                </button>
                <button
                  type="button"
                  className="btn btn-primary fw-semibold"
                  onClick={() => {
                    const prog = selectedProgram;
                    setSelectedProgram(null);
                    handleStartApply(prog);
                  }}
                >
                  Daftar Beasiswa Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
