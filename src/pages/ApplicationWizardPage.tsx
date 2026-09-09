import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

interface RegionItem {
  id: string;
  code: string;
  name: string;
}

export const ApplicationWizardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetProgramId = searchParams.get('programId') || 'prog-ai-cloud-2026';

  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<number>(1);
  const [programName, setProgramName] = useState('Pelatihan Beasiswa');
  const [programRequirements, setProgramRequirements] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Step 1 Form State (Data Diri) ───────────────────────────
  const [nik, setNik] = useState(user?.nik || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE'>('MALE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');

  // Regional selection state
  const [provinces, setProvinces] = useState<RegionItem[]>([]);
  const [regencies, setRegencies] = useState<RegionItem[]>([]);
  const [districts, setDistricts] = useState<RegionItem[]>([]);
  const [villages, setVillages] = useState<RegionItem[]>([]);

  const [provinceCode, setProvinceCode] = useState('');
  const [provinceName, setProvinceName] = useState('');
  const [regencyCode, setRegencyCode] = useState('');
  const [regencyName, setRegencyName] = useState('');
  const [districtCode, setDistrictCode] = useState('');
  const [districtName, setDistrictName] = useState('');
  const [villageCode, setVillageCode] = useState('');
  const [villageName, setVillageName] = useState('');

  // ── Step 2 Form State (Pendidikan) ──────────────────────────
  const [educationLevel, setEducationLevel] = useState('S1 (Sarjana)');
  const [institutionName, setInstitutionName] = useState('');
  const [major, setMajor] = useState('');
  const [graduationYear, setGraduationYear] = useState<number>(2024);
  const [currentOccupation, setCurrentOccupation] = useState('');

  // ── Step 4 Form State (Persetujuan) ─────────────────────────
  const [agreed, setAgreed] = useState(false);

  // 1. Initialize or load existing active draft
  useEffect(() => {
    const initApplication = async () => {
      setIsLoading(true);
      try {
        // Load active draft
        let appData: any = null;
        try {
          const res = await api.get('/api/v1/applications/my-active');
          if (res.data) appData = res.data;
        } catch {
          // No active draft
        }

        // If no active draft, create one with idempotency key
        if (!appData) {
          const idemKey = `idem-${user?.id}-${Date.now()}`;
          const createRes = await api.post(
            '/api/v1/applications',
            { programId: targetProgramId },
            { headers: { 'Idempotency-Key': idemKey } }
          );
          appData = createRes.data;
        }

        if (appData) {
          setApplicationId(appData.id);
          setRegistrationCode(appData.registrationCode);
          setAppVersion(appData.version || 1);
          setCurrentStep(appData.currentStep || 1);

          if (appData.programSnapshot) {
            setProgramName(appData.programSnapshot.name || 'Pelatihan Beasiswa');
            setProgramRequirements(appData.programSnapshot.requirements || []);
          }

          // Populate step 1 data if exists
          const p = appData.personalDetails || {};
          if (p.nik) setNik(p.nik);
          if (p.full_name) setFullName(p.full_name);
          if (p.email) setEmail(p.email);
          if (p.birth_place) setBirthPlace(p.birth_place);
          if (p.birth_date) setBirthDate(p.birth_date.split('T')[0]);
          if (p.gender) setGender(p.gender);
          if (p.phone_number) setPhoneNumber(p.phone_number);
          if (p.address) setAddress(p.address);
          if (p.province_code) { setProvinceCode(p.province_code); setProvinceName(p.province_name || ''); }
          if (p.regency_code) { setRegencyCode(p.regency_code); setRegencyName(p.regency_name || ''); }
          if (p.district_code) { setDistrictCode(p.district_code); setDistrictName(p.district_name || ''); }
          if (p.village_code) { setVillageCode(p.village_code); setVillageName(p.village_name || ''); }

          // Populate step 2 data if exists
          const e = appData.educationDetails || {};
          if (e.education_level) setEducationLevel(e.education_level);
          if (e.institution_name) setInstitutionName(e.institution_name);
          if (e.major) setMajor(e.major);
          if (e.graduation_year) setGraduationYear(e.graduation_year);
          if (e.current_occupation) setCurrentOccupation(e.current_occupation);

          // Populate consent if exists
          if (appData.consent?.agreed_at) {
            setAgreed(true);
          }
        }
      } catch (err: any) {
        setSaveError(err.message || 'Gagal memuat formulir pendaftaran');
      } finally {
        setIsLoading(false);
      }
    };

    initApplication();
  }, [targetProgramId, user]);

  // 2. Load provinces
  useEffect(() => {
    api.get('/api/v1/regions/provinces')
      .then((res) => {
        if (res.data) setProvinces(res.data);
      })
      .catch(() => {
        // Fallback demo provinces
        setProvinces([
          { id: '1', code: '31', name: 'DKI JAKARTA' },
          { id: '2', code: '32', name: 'JAWA BARAT' },
          { id: '3', code: '33', name: 'JAWA TENGAH' }
        ]);
      });
  }, []);

  // 3. Load regencies when province changes
  useEffect(() => {
    if (!provinceCode) return;
    api.get(`/api/v1/regions/regencies?provinceCode=${provinceCode}`)
      .then((res) => {
        if (res.data) setRegencies(res.data);
      })
      .catch(() => {
        setRegencies([{ id: '1', code: '3273', name: 'KOTA BANDUNG' }]);
      });
  }, [provinceCode]);

  // 4. Load districts when regency changes
  useEffect(() => {
    if (!regencyCode) return;
    api.get(`/api/v1/regions/districts?regencyCode=${regencyCode}`)
      .then((res) => {
        if (res.data) setDistricts(res.data);
      })
      .catch(() => {
        setDistricts([{ id: '1', code: '327301', name: 'COBLONG' }]);
      });
  }, [regencyCode]);

  // 5. Load villages when district changes
  useEffect(() => {
    if (!districtCode) return;
    api.get(`/api/v1/regions/villages?districtCode=${districtCode}`)
      .then((res) => {
        if (res.data) setVillages(res.data);
      })
      .catch(() => {
        setVillages([{ id: '1', code: '32730101', name: 'DAGO' }]);
      });
  }, [districtCode]);

  // ── Save Handlers per Step (AT-05: Optimistic Concurrency) ───
  const saveStep1 = async (): Promise<boolean> => {
    if (!applicationId) return false;
    if (!birthPlace || !birthDate || !phoneNumber || !address) {
      setSaveError('Harap lengkapi semua kolom bertanda bintang pada Data Diri');
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await api.put(`/api/v1/applications/${applicationId}/sections/personal`, {
        birthPlace,
        birthDate,
        gender,
        phoneNumber,
        address,
        provinceCode: provinceCode || '32',
        provinceName: provinceName || 'JAWA BARAT',
        regencyCode: regencyCode || '3273',
        regencyName: regencyName || 'KOTA BANDUNG',
        districtCode: districtCode || '327301',
        districtName: districtName || 'COBLONG',
        villageCode: villageCode || '32730101',
        villageName: villageName || 'DAGO',
        expectedVersion: appVersion
      });
      setAppVersion(res.data.version);
      setSaveSuccess('Bagian Data Diri berhasil disimpan');
      return true;
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan Data Diri');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveStep2 = async (): Promise<boolean> => {
    if (!applicationId) return false;
    if (!institutionName) {
      setSaveError('Nama Instansi / Sekolah / Universitas wajib diisi');
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await api.put(`/api/v1/applications/${applicationId}/sections/education`, {
        educationLevel,
        institutionName,
        major,
        graduationYear: Number(graduationYear),
        currentOccupation,
        expectedVersion: appVersion
      });
      setAppVersion(res.data.version);
      setSaveSuccess('Bagian Latar Belakang Pendidikan berhasil disimpan');
      return true;
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan Pendidikan');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const saveStep4 = async (): Promise<boolean> => {
    if (!applicationId) return false;
    if (!agreed) {
      setSaveError('Anda wajib mencentang persetujuan keabsahan data sebelum mengirim');
      return false;
    }

    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await api.put(`/api/v1/applications/${applicationId}/sections/consent`, {
        agreed: true,
        statementText: 'Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang saya unggah adalah benar, sah, dan milik saya pribadi.',
        agreementVersion: 'v1.0',
        expectedVersion: appVersion
      });
      setAppVersion(res.data.version);
      setSaveSuccess('Persetujuan berhasil disimpan');
      return true;
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan persetujuan');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    setSaveSuccess(null);
    setSaveError(null);

    if (currentStep === 1) {
      const ok = await saveStep1();
      if (ok) setCurrentStep(2);
    } else if (currentStep === 2) {
      const ok = await saveStep2();
      if (ok) setCurrentStep(3);
    } else if (currentStep === 3) {
      // Step 3 Document uploads (Fase 5 wires full uploads)
      setCurrentStep(4);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraftOnly = async () => {
    if (currentStep === 1) await saveStep1();
    else if (currentStep === 2) await saveStep2();
    else if (currentStep === 4) await saveStep4();
  };

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-2" role="status"></div>
          <p className="text-muted small">Menyiapkan formulir pendaftaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 pb-5">
      {/* ── Navigation Bar ───────────────────────────────────── */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm">
        <div className="container">
          <Link className="navbar-brand fw-bold" to="/">
            <i className="bi bi-mortarboard-fill me-2"></i>BeasiswaApp
          </Link>
          <div className="dropdown ms-auto">
            <button
              className="btn btn-outline-light dropdown-toggle btn-sm"
              type="button"
              data-bs-toggle="dropdown"
            >
              <i className="bi bi-person-circle me-1"></i> {user?.fullName || user?.email}
            </button>
            <ul className="dropdown-menu dropdown-menu-end shadow border-0">
              <li>
                <Link className="dropdown-item" to="/">
                  <i className="bi bi-arrow-left me-2"></i>Kembali ke Beranda
                </Link>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item text-danger" onClick={() => logout()}>
                  <i className="bi bi-box-arrow-right me-2"></i>Keluar (Logout)
                </button>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="container py-4">
        {/* Welcome & Info Alert */}
        <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center mb-4">
          <i className="bi bi-info-circle-fill fs-3 me-3 flex-shrink-0 text-primary"></i>
          <div>
            <strong className="fs-6">Selamat Datang! Silakan Lengkapi Formulir Pendaftaran</strong>
            <p className="mb-0 small">
              Program: <strong>{programName}</strong> | No. Registrasi:{' '}
              <code>{registrationCode || 'REG-PENDING'}</code>
            </p>
          </div>
        </div>

        {/* Global Notifications */}
        {saveSuccess && (
          <div className="alert alert-success alert-dismissible fade show py-2 small mb-3">
            <i className="bi bi-check-circle-fill me-2"></i>{saveSuccess}
            <button type="button" className="btn-close" onClick={() => setSaveSuccess(null)}></button>
          </div>
        )}
        {saveError && (
          <div className="alert alert-danger alert-dismissible fade show py-2 small mb-3">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{saveError}
            <button type="button" className="btn-close" onClick={() => setSaveError(null)}></button>
          </div>
        )}

        {/* ── 4-Step Wizard Container ─────────────────────────── */}
        <div className="card border-0 shadow-sm overflow-hidden">
          {/* Wizard Step Headers */}
          <div className="bg-white border-bottom">
            <div className="row g-0 text-center">
              <div
                className={`col-3 py-3 border-end ${
                  currentStep === 1
                    ? 'border-bottom border-primary border-3 fw-bold text-primary bg-light'
                    : currentStep > 1
                    ? 'border-bottom border-success border-3 text-success'
                    : 'text-muted'
                }`}
              >
                <i className={`bi ${currentStep > 1 ? 'bi-check-circle-fill' : 'bi-1-circle'} me-1`}></i>
                <span className="d-none d-md-inline">1. Data Diri &amp; Kontak</span>
                <span className="d-inline d-md-none">1. Diri</span>
              </div>
              <div
                className={`col-3 py-3 border-end ${
                  currentStep === 2
                    ? 'border-bottom border-primary border-3 fw-bold text-primary bg-light'
                    : currentStep > 2
                    ? 'border-bottom border-success border-3 text-success'
                    : 'text-muted'
                }`}
              >
                <i className={`bi ${currentStep > 2 ? 'bi-check-circle-fill' : 'bi-2-circle'} me-1`}></i>
                <span className="d-none d-md-inline">2. Pendidikan &amp; Pekerjaan</span>
                <span className="d-inline d-md-none">2. Edukasi</span>
              </div>
              <div
                className={`col-3 py-3 border-end ${
                  currentStep === 3
                    ? 'border-bottom border-primary border-3 fw-bold text-primary bg-light'
                    : currentStep > 3
                    ? 'border-bottom border-success border-3 text-success'
                    : 'text-muted'
                }`}
              >
                <i className={`bi ${currentStep > 3 ? 'bi-check-circle-fill' : 'bi-3-circle'} me-1`}></i>
                <span className="d-none d-md-inline">3. Unggah Dokumen</span>
                <span className="d-inline d-md-none">3. Berkas</span>
              </div>
              <div
                className={`col-3 py-3 ${
                  currentStep === 4
                    ? 'border-bottom border-primary border-3 fw-bold text-primary bg-light'
                    : 'text-muted'
                }`}
              >
                <i className="bi bi-4-circle me-1"></i>
                <span className="d-none d-md-inline">4. Persetujuan &amp; Submit</span>
                <span className="d-inline d-md-none">4. Kirim</span>
              </div>
            </div>
          </div>

          <div className="card-body p-4">
            {/* ── STEP 1: DATA DIRI ──────────────────────────── */}
            {currentStep === 1 && (
              <div>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="bi bi-person-vcard me-2"></i>Bagian 1: Data Diri &amp; Informasi Kontak
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">NIK (Nomor Induk Kependudukan) *</label>
                    <input
                      type="text"
                      className="form-control bg-light"
                      value={nik}
                      readOnly
                    />
                    <div className="form-text small">NIK terdaftar permanen sesuai akun.</div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Nama Lengkap *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Tempat Lahir *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Kota tempat lahir"
                      value={birthPlace}
                      onChange={(e) => setBirthPlace(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Tanggal Lahir *</label>
                    <input
                      type="date"
                      className="form-control"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold small">Jenis Kelamin *</label>
                    <select
                      className="form-select"
                      value={gender}
                      onChange={(e) => setGender(e.target.value as any)}
                      required
                    >
                      <option value="MALE">Laki-laki</option>
                      <option value="FEMALE">Perempuan</option>
                    </select>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-semibold small">Alamat Domisili *</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Nama jalan, RT/RW, nomor rumah"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {/* Cascading Region Selectors */}
                  <div className="col-md-3">
                    <label className="form-label fw-semibold small">Provinsi *</label>
                    <select
                      className="form-select"
                      value={provinceCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setProvinceCode(code);
                        const p = provinces.find(x => x.code === code);
                        if (p) setProvinceName(p.name);
                        setRegencyCode('');
                        setDistrictCode('');
                        setVillageCode('');
                      }}
                      required
                    >
                      <option value="">-- Pilih Provinsi --</option>
                      {provinces.map((p) => (
                        <option key={p.id} value={p.code}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold small">Kabupaten/Kota *</label>
                    <select
                      className="form-select"
                      value={regencyCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setRegencyCode(code);
                        const r = regencies.find(x => x.code === code);
                        if (r) setRegencyName(r.name);
                        setDistrictCode('');
                        setVillageCode('');
                      }}
                      disabled={!provinceCode}
                      required
                    >
                      <option value="">-- Pilih Kab/Kota --</option>
                      {regencies.map((r) => (
                        <option key={r.id} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold small">Kecamatan *</label>
                    <select
                      className="form-select"
                      value={districtCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setDistrictCode(code);
                        const d = districts.find(x => x.code === code);
                        if (d) setDistrictName(d.name);
                        setVillageCode('');
                      }}
                      disabled={!regencyCode}
                      required
                    >
                      <option value="">-- Pilih Kecamatan --</option>
                      {districts.map((d) => (
                        <option key={d.id} value={d.code}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold small">Kelurahan/Desa *</label>
                    <select
                      className="form-select"
                      value={villageCode}
                      onChange={(e) => {
                        const code = e.target.value;
                        setVillageCode(code);
                        const v = villages.find(x => x.code === code);
                        if (v) setVillageName(v.name);
                      }}
                      disabled={!districtCode}
                      required
                    >
                      <option value="">-- Pilih Kelurahan --</option>
                      {villages.map((v) => (
                        <option key={v.id} value={v.code}>{v.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Nomor HP / WhatsApp *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="contoh: 081234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Alamat Email *</label>
                    <input
                      type="email"
                      className="form-control bg-light"
                      value={email}
                      readOnly
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 2: PENDIDIKAN & PEKERJAAN ──────────────── */}
            {currentStep === 2 && (
              <div>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="bi bi-mortarboard me-2"></i>Bagian 2: Latar Belakang Pendidikan &amp; Pekerjaan
                </h6>
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Pendidikan Terakhir *</label>
                    <select
                      className="form-select"
                      value={educationLevel}
                      onChange={(e) => setEducationLevel(e.target.value)}
                      required
                    >
                      <option value="SMA/SMK Sederajat">SMA/SMK Sederajat</option>
                      <option value="D3 / D4">D3 / D4</option>
                      <option value="S1 (Sarjana)">S1 (Sarjana)</option>
                      <option value="S2 / S3">S2 / S3</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Nama Instansi / Sekolah / Universitas *</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Universitas Indonesia"
                      value={institutionName}
                      onChange={(e) => setInstitutionName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Jurusan / Program Studi</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Teknik Informatika"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold small">Tahun Lulus</label>
                    <input
                      type="number"
                      className="form-control"
                      min={1970}
                      max={2030}
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(Number(e.target.value))}
                    />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold small">Pekerjaan Saat Ini</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Contoh: Belum Bekerja / Freelancer"
                      value={currentOccupation}
                      onChange={(e) => setCurrentOccupation(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── STEP 3: UNGGAH DOKUMEN ──────────────────────── */}
            {currentStep === 3 && (
              <div>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>Bagian 3: Unggah Dokumen Persyaratan
                </h6>
                <p className="text-muted small mb-4">
                  Pastikan dokumen diunggah dalam format resmi (PDF / JPG / PNG, ukuran maksimal 2MB per file).
                </p>

                <div className="row g-4">
                  {(programRequirements.length > 0 ? programRequirements : [
                    { requirementTypeId: 'ktp', code: 'KTP', name: 'Kartu Tanda Penduduk (KTP)', isRequired: true },
                    { requirementTypeId: 'kk', code: 'KK', name: 'Kartu Keluarga (KK)', isRequired: true },
                    { requirementTypeId: 'ijazah', code: 'IJAZAH', name: 'Ijazah Terakhir / SKL', isRequired: true },
                    { requirementTypeId: 'komitmen', code: 'SURAT_KOMITMEN', name: 'Surat Pernyataan Komitmen', isRequired: false }
                  ]).map((req) => (
                    <div className="col-md-6" key={req.requirementTypeId || req.code}>
                      <div className="card border p-3 h-100 bg-white">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <strong className="text-dark">{req.name}</strong>
                          <span className={`badge ${req.isRequired ? 'bg-danger' : 'bg-secondary'}`}>
                            {req.isRequired ? 'Wajib' : 'Opsional'}
                          </span>
                        </div>
                        <input
                          type="file"
                          className="form-control mb-1"
                          accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <small className="text-muted">
                          Format: PDF, JPG, PNG (Maks 2MB)
                        </small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 4: PERSETUJUAN & SUBMIT ────────────────── */}
            {currentStep === 4 && (
              <div>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="bi bi-shield-check me-2"></i>Bagian 4: Lembar Persetujuan &amp; Pernyataan Keabsahan Data
                </h6>
                <div className="alert alert-light border p-3 mb-4">
                  <h6 className="fw-bold mb-2">Pemberitahuan Penting:</h6>
                  <p className="small text-muted mb-0">
                    Pastikan Anda telah memeriksa kembali seluruh isian pada Step 1 hingga Step 3 sebelum
                    melakukan konfirmasi. Setelah permohonan dikirimkan secara final, data Anda akan diverifikasi
                    oleh tim administrator.
                  </p>
                </div>

                <div className="form-check p-3 bg-white border rounded">
                  <input
                    className="form-check-input ms-0 me-2"
                    type="checkbox"
                    id="checkSah"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                  />
                  <label className="form-check-label small fw-semibold" htmlFor="checkSah">
                    Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang saya unggah adalah
                    benar, sah, dan milik saya pribadi. Apabila di kemudian hari ditemukan data tidak benar,
                    saya bersedia menerima sanksi pembatalan kepesertaan.
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* ── Wizard Footer Navigation Controls ────────────── */}
          <div className="card-footer bg-white border-top p-3 d-flex justify-content-between align-items-center">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrev}
              disabled={currentStep === 1 || isSaving}
            >
              <i className="bi bi-arrow-left me-1"></i> Kembali
            </button>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleSaveDraftOnly}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <i className="bi bi-bookmark me-1"></i> Simpan Draft
                  </>
                )}
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  className="btn btn-primary fw-semibold"
                  onClick={handleNext}
                  disabled={isSaving}
                >
                  Selanjutnya <i className="bi bi-arrow-right ms-1"></i>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success fw-semibold"
                  onClick={async () => {
                    const ok = await saveStep4();
                    if (ok) {
                      alert('Draft permohonan pendaftaran Anda berhasil disiapkan secara lengkap!');
                      navigate('/');
                    }
                  }}
                  disabled={!agreed || isSaving}
                >
                  <i className="bi bi-send me-1"></i> Kirim Pendaftaran (Submit)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
