import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api, getAccessToken } from '../services/api';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

interface RegionItem {
  id: string;
  code: string;
  name: string;
}

interface UploadedDocInfo {
  documentId: string;
  originalFilename: string;
  fileSize: number;
  mimeType: string;
  isClean: boolean;
  sha256Hash?: string;
}

interface UploadState {
  status: 'idle' | 'reserving' | 'uploading' | 'scanning' | 'done' | 'error';
  message?: string;
}

export const ApplicationWizardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetProgramId = searchParams.get('programId') || 'prog-ai-cloud-2026';

  const [currentStep, setCurrentStep] = useState(1);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [registrationCode, setRegistrationCode] = useState<string | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<string>('DRAFT');
  const [administrationStatus, setAdministrationStatus] = useState<string>('NOT_STARTED');
  const [interviewStatus, setInterviewStatus] = useState<string>('NOT_ELIGIBLE');
  const [finalStatus, setFinalStatus] = useState<string>('UNDECIDED');
  const [confirmationStatus, setConfirmationStatus] = useState<string>('NOT_AVAILABLE');
  const [reviewData, setReviewData] = useState<any>(null);
  const [interviewScoreData, setInterviewScoreData] = useState<any>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isEditingRevision, setIsEditingRevision] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<number>(1);
  const [availablePrograms, setAvailablePrograms] = useState<any[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [programName, setProgramName] = useState('Pelatihan Beasiswa');
  const [programRequirements, setProgramRequirements] = useState<any[]>([]);
  const [isChangingProgram, setIsChangingProgram] = useState(false);

  // ── Modal & Confirmation State (Mockup 6_index_lulus.html) ────
  const [showDaftarUlangModal, setShowDaftarUlangModal] = useState(false);
  const [showReadonlyModal, setShowReadonlyModal] = useState(false);
  const [showSuratModal, setShowSuratModal] = useState(false);
  const [kesediaanStatus, setKesediaanStatus] = useState<'CONFIRMED' | 'WITHDRAWN'>('CONFIRMED');
  const [catatanKonfirmasi, setCatatanKonfirmasi] = useState('');
  const [isSubmittingConfirmation, setIsSubmittingConfirmation] = useState(false);
  const [readonlyActiveTab, setReadonlyActiveTab] = useState<'ringkasan' | 'datadiri' | 'pendidikan' | 'berkas'>('ringkasan');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // ── Step 3 Form State (Dokumen) ─────────────────────────────
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, UploadedDocInfo>>({});
  const [uploadingDoc, setUploadingDoc] = useState<Record<string, UploadState>>({});

  // ── Step 4 Form State (Persetujuan) ─────────────────────────
  const [agreed, setAgreed] = useState(false);

  // Helper: Format byte size
  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // 1. Initialize or load existing active draft
  useEffect(() => {
    const initApplication = async () => {
      setIsLoading(true);
      try {
        // Fetch published programs from master service
        let publishedList: any[] = [];
        try {
          const progRes = await api.get('/api/v1/programs');
          publishedList = progRes?.data?.data || progRes?.data || (Array.isArray(progRes) ? progRes : []);
          if (Array.isArray(publishedList) && publishedList.length > 0) {
            setAvailablePrograms(publishedList);
          }
        } catch (e) {
          console.warn('Failed to load published programs list:', e);
        }

        const queryProgId = searchParams.get('programId');
        const sessionProgId = sessionStorage.getItem('pending_program_id');
        const desiredProgId = queryProgId || sessionProgId || (publishedList.length > 0 ? publishedList[0].id : 'prog-ai-cloud-2026');

        let appData: any = null;
        try {
          const res = await api.get('/api/v1/applications/my-active');
          if (res.data) appData = res.data;
        } catch {
          // No active draft yet
        }

        // If user already has a DRAFT and specifically selected a different program (via URL param or session):
        if (appData && appData.submissionStatus === 'DRAFT' && (queryProgId || sessionProgId)) {
          const targetToSwitch = queryProgId || sessionProgId;
          if (targetToSwitch && targetToSwitch !== appData.programId) {
            try {
              const switchRes = await api.put(`/api/v1/applications/${appData.id}/program`, {
                programId: targetToSwitch
              });
              if (switchRes.data) {
                appData = switchRes.data;
              }
            } catch (err) {
              console.warn('Failed to switch draft program:', err);
            }
          }
        }

        // If no active draft, create one with the desired program
        if (!appData) {
          const idemKey = `idem-${user?.id}-${Date.now()}`;
          const createRes = await api.post(
            '/api/v1/applications',
            { programId: desiredProgId },
            { headers: { 'Idempotency-Key': idemKey } }
          );
          appData = createRes.data;
        }
        sessionStorage.removeItem('pending_program_id');

        if (appData) {
          setApplicationId(appData.id);
          setSelectedProgramId(appData.programId || desiredProgId);
          setRegistrationCode(appData.registrationCode);
          setSubmissionStatus(appData.submissionStatus || 'DRAFT');
          setAdministrationStatus(appData.administrationStatus || 'NOT_STARTED');
          setInterviewStatus(appData.interviewStatus || 'NOT_ELIGIBLE');
          setFinalStatus(appData.finalStatus || 'UNDECIDED');
          setConfirmationStatus(appData.confirmationStatus || 'NOT_AVAILABLE');
          if (appData.confirmation) {
            setConfirmationStatus(appData.confirmation.status || 'NOT_AVAILABLE');
            setKesediaanStatus(appData.confirmation.status || 'CONFIRMED');
            if (appData.confirmation.notes) setCatatanKonfirmasi(appData.confirmation.notes);
          }
          setSubmittedAt(appData.submittedAt || null);
          setAppVersion(appData.version || 1);
          setCurrentStep(appData.currentStep || 1);
          if (appData.review) setReviewData(appData.review);
          if (appData.interviewScore) setInterviewScoreData(appData.interviewScore);

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

          // Populate documents if exist
          const rawDocs = appData.documents || appData.documentBindings || [];
          if (Array.isArray(rawDocs) && rawDocs.length > 0) {
            const docsMap: Record<string, UploadedDocInfo> = {};
            for (const d of rawDocs) {
              const code = d.requirement_type_code || d.requirementTypeCode;
              if (code) {
                docsMap[code] = {
                  documentId: d.document_id || d.documentId || d.id,
                  originalFilename: d.original_filename || d.originalFilename || 'document.pdf',
                  fileSize: Number(d.file_size || d.fileSize || 0),
                  mimeType: d.mime_type || d.mimeType || 'application/pdf',
                  isClean: Boolean(d.is_clean ?? d.isClean),
                  sha256Hash: d.sha256_hash || d.sha256Hash
                };
              }
            }
            setUploadedDocs(docsMap);
          }

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
  }, [searchParams, user]);

  // Program switcher handler for DRAFT applications
  const handleProgramChange = async (newProgId: string) => {
    if (!applicationId || newProgId === selectedProgramId || isChangingProgram) return;
    setIsChangingProgram(true);
    setSaveError(null);
    try {
      const res = await api.put(`/api/v1/applications/${applicationId}/program`, {
        programId: newProgId
      });
      if (res.data) {
        const updated = res.data;
        setSelectedProgramId(updated.programId);
        if (updated.programSnapshot) {
          setProgramName(updated.programSnapshot.name || 'Pelatihan Beasiswa');
          setProgramRequirements(updated.programSnapshot.requirements || []);
        }
        setSaveSuccess(`Pilihan program beasiswa berhasil dialihkan ke: ${updated.programSnapshot?.name || 'Program Baru'}`);
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch (err: any) {
      setSaveError(err.message || 'Gagal mengalihkan program beasiswa');
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setIsChangingProgram(false);
    }
  };

  // Refresh application status on demand
  const refreshStatus = useCallback(async (showFeedback = false) => {
    try {
      setIsRefreshingStatus(true);
      const res = await api.get('/api/v1/applications/my-active');
      if (res.data) {
        const d = res.data;
        setApplicationId(d.id);
        setRegistrationCode(d.registrationCode);
        setSubmissionStatus(d.submissionStatus || 'DRAFT');
        setAdministrationStatus(d.administrationStatus || 'NOT_STARTED');
        setInterviewStatus(d.interviewStatus || 'NOT_ELIGIBLE');
        setFinalStatus(d.finalStatus || 'UNDECIDED');
        setConfirmationStatus(d.confirmationStatus || 'NOT_AVAILABLE');
        if (d.confirmation) {
          setConfirmationStatus(d.confirmation.status || 'NOT_AVAILABLE');
          setKesediaanStatus(d.confirmation.status || 'CONFIRMED');
          if (d.confirmation.notes) setCatatanKonfirmasi(d.confirmation.notes);
        }
        setSubmittedAt(d.submittedAt || null);
        setAppVersion(d.version || 1);
        if (d.review) setReviewData(d.review);
        if (d.interviewScore) setInterviewScoreData(d.interviewScore);
        if (showFeedback) {
          setSaveSuccess('Status permohonan berhasil diperbarui!');
          setTimeout(() => setSaveSuccess(null), 3000);
        }
      }
    } catch (err: any) {
      console.error('Failed to refresh application status:', err);
    } finally {
      setIsRefreshingStatus(false);
    }
  }, []);

  // Periodic polling for status updates every 15 seconds after submission
  useEffect(() => {
    if (submissionStatus !== 'DRAFT') {
      const interval = setInterval(() => {
        refreshStatus(false);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [submissionStatus, refreshStatus]);

  // 2. Load provinces
  useEffect(() => {
    api.get('/api/v1/regions/provinces')
      .then((res) => {
        if (res.data) setProvinces(res.data);
      })
      .catch(() => {
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

  // ── Step 1 Save (Data Diri) ─────────────────────────────────
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

  // ── Step 2 Save (Pendidikan) ────────────────────────────────
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

  // ── Step 3 Document Upload Handler ──────────────────────────
  const handleFileUpload = async (reqCode: string, file: File) => {
    if (!applicationId) return;

    // Check size limit: 2MB (2,097,152 bytes)
    if (file.size > 2 * 1024 * 1024) {
      setSaveError(`Berkas "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB) melebihi batas maksimal 2MB.`);
      return;
    }

    setSaveError(null);
    setSaveSuccess(null);
    setUploadingDoc(prev => ({
      ...prev,
      [reqCode]: { status: 'reserving', message: 'Membuat reservasi upload (TTL 5 menit)...' }
    }));

    try {
      // 1. Create reservation in Transaksi
      const resRes = await api.post(`/api/v1/applications/${applicationId}/reservations`, {
        requirementTypeCode: reqCode
      });
      const reservationId = resRes.data.id;

      // 2. Upload file multipart and trigger ClamAV scanner
      setUploadingDoc(prev => ({
        ...prev,
        [reqCode]: { status: 'uploading', message: 'Mengunggah & memindai dengan ClamAV...' }
      }));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('reservationId', reservationId);

      const uploadRes = await api.post('/api/v1/documents', formData);
      const doc = uploadRes.data;

      const isClean = doc.scanStatus === 'CLEAN';

      setUploadedDocs(prev => ({
        ...prev,
        [reqCode]: {
          documentId: doc.id,
          originalFilename: doc.originalFilename,
          fileSize: doc.fileSize,
          mimeType: doc.mimeType,
          isClean,
          sha256Hash: doc.sha256Hash
        }
      }));

      if (isClean) {
        setUploadingDoc(prev => ({
          ...prev,
          [reqCode]: { status: 'done', message: 'Dokumen lolos pemindaian antivirus & terverifikasi!' }
        }));
        setSaveSuccess(`Dokumen ${file.name} berhasil diunggah dan terverifikasi bersih oleh ClamAV.`);
      } else {
        setUploadingDoc(prev => ({
          ...prev,
          [reqCode]: { status: 'error', message: 'PERINGATAN: Berkas terindikasi virus/malware oleh ClamAV dan ditolak.' }
        }));
        setSaveError(`Berkas ${file.name} ditolak karena terdeteksi potensi ancaman malware.`);
      }
    } catch (err: any) {
      const msg = err.message || 'Gagal mengunggah dokumen';
      setUploadingDoc(prev => ({
        ...prev,
        [reqCode]: { status: 'error', message: msg }
      }));
      setSaveError(`Gagal mengunggah dokumen ${file.name}: ${msg}`);
    }
  };

  // ── Step 4 Save (Persetujuan) ───────────────────────────────
  const saveStep4 = async (): Promise<number | null> => {
    if (!applicationId) return null;
    if (!agreed) {
      setSaveError('Anda wajib menyetujui pernyataan keabsahan data sebelum mengirim permohonan.');
      return null;
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
      const newVersion = res.data?.version ?? (appVersion + 1);
      setAppVersion(newVersion);
      setSaveSuccess('Persetujuan berhasil disimpan');
      return newVersion;
    } catch (err: any) {
      setSaveError(err.message || 'Gagal menyimpan lembar persetujuan');
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  // ── Step 4 Final Submit ─────────────────────────────────────
  const handleFinalSubmit = async () => {
    if (!applicationId) return;
    setIsSubmitting(true);
    setSaveError(null);

    try {
      // 1. Save consent first and obtain the newly incremented version
      const freshVersion = await saveStep4();
      if (freshVersion === null) {
        setShowSubmitModal(false);
        setIsSubmitting(false);
        return;
      }

      // 2. Submit application atomically (AT-08) using the fresh version
      const res = await api.post(`/api/v1/applications/${applicationId}/submit`, {
        expectedVersion: freshVersion
      });

      if (res.data?.registrationCode) {
        setRegistrationCode(res.data.registrationCode);
      }
      setSubmissionStatus('SUBMITTED');
      setAdministrationStatus('PENDING');
      setInterviewStatus('NOT_ELIGIBLE');
      setFinalStatus('UNDECIDED');
      setSubmittedAt(new Date().toISOString());
      setShowSubmitModal(false);
      setSaveSuccess('Pendaftaran beasiswa Anda berhasil dikirimkan dan masuk ke tahap verifikasi berkas!');
    } catch (err: any) {
      setShowSubmitModal(false);
      setSaveError(err.message || 'Gagal mengirimkan pendaftaran');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Resubmit handler for revisions (Fase 6) ─────────────────
  const handleResubmit = async () => {
    if (!applicationId) return;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      const res = await api.post(`/api/v1/applications/${applicationId}/resubmit`, {
        expectedVersion: appVersion
      });
      setSubmissionStatus('RESUBMITTED');
      setAdministrationStatus('PENDING');
      if (res.data?.version) setAppVersion(res.data.version);
      setIsEditingRevision(false);
      setSaveSuccess('Permohonan perbaikan berhasil dikirimkan ulang (Resubmitted) dan masuk antrean verifikasi berkas!');
    } catch (err: any) {
      setSaveError(err.message || 'Gagal mengirim ulang permohonan');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Navigation Wizard ───────────────────────────────────────
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
      // Validate mandatory documents before going to Step 4
      const reqs = programRequirements.length > 0 ? programRequirements : [
        { requirementTypeId: 'req-ktp-uuid', code: 'KTP', name: 'Kartu Tanda Penduduk (KTP)', isRequired: true },
        { requirementTypeId: 'req-kk-uuid', code: 'KK', name: 'Kartu Keluarga (KK)', isRequired: true },
        { requirementTypeId: 'req-ijazah-uuid', code: 'IJAZAH', name: 'Ijazah Terakhir', isRequired: true }
      ];

      const mandatory = reqs.filter((r: any) => r.isRequired || r.isMandatory || r.is_mandatory || r.is_required);
      const missing = mandatory.filter((m: any) => {
        const code = m.code || m.requirementTypeCode || m.requirement_type_code;
        return !uploadedDocs[code]?.isClean;
      });

      if (missing.length > 0) {
        setSaveError(`Dokumen wajib berikut belum diunggah atau belum lolos verifikasi antivirus: ${missing.map((m: any) => m.name || m.code).join(', ')}`);
        return;
      }

      setCurrentStep(4);
    }
  };

  const handlePrev = () => {
    setSaveSuccess(null);
    setSaveError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraftOnly = async () => {
    if (currentStep === 1) await saveStep1();
    else if (currentStep === 2) await saveStep2();
    else if (currentStep === 4) await saveStep4();
  };

  const copyRegistrationCode = () => {
    if (registrationCode) {
      navigator.clipboard.writeText(registrationCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleSubmitConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId) return;
    setIsSubmittingConfirmation(true);
    try {
      const res = await api.post(`/api/v1/applications/${applicationId}/confirmation`, {
        status: kesediaanStatus,
        notes: catatanKonfirmasi
      });
      if (res.data) {
        setConfirmationStatus(res.data.status);
        setShowDaftarUlangModal(false);
        setSaveSuccess(
          kesediaanStatus === 'CONFIRMED'
            ? 'Konfirmasi kesediaan Anda berhasil dikirim! Terima kasih atas komitmen Anda.'
            : 'Konfirmasi pengunduran diri Anda telah tercatat.'
        );
        setTimeout(() => setSaveSuccess(null), 5000);
        refreshStatus();
      }
    } catch (err: any) {
      setSaveError(err.response?.data?.message || err.message || 'Gagal mengirim konfirmasi daftar ulang');
      setTimeout(() => setSaveError(null), 5000);
    } finally {
      setIsSubmittingConfirmation(false);
    }
  };

  // Requirements list to render
  const activeRequirements = programRequirements.length > 0 ? programRequirements : [
    { requirementTypeId: 'req-ktp-uuid', code: 'KTP', name: 'Kartu Tanda Penduduk (KTP)', description: 'Scan KTP asli yang masih berlaku', isRequired: true },
    { requirementTypeId: 'req-kk-uuid', code: 'KK', name: 'Kartu Keluarga (KK)', description: 'Scan Kartu Keluarga terbaru', isRequired: true },
    { requirementTypeId: 'req-ijazah-uuid', code: 'IJAZAH', name: 'Ijazah Terakhir', description: 'Scan Ijazah pendidikan terakhir / SKL', isRequired: true },
    { requirementTypeId: 'req-transkrip-uuid', code: 'TRANSKRIP', name: 'Transkrip Nilai', description: 'Scan Transkrip akademik resmi', isRequired: true },
    { requirementTypeId: 'req-cv-uuid', code: 'CV', name: 'Curriculum Vitae (CV)', description: 'CV format terkini dalam PDF', isRequired: true },
    { requirementTypeId: 'req-sertif-uuid', code: 'SERTIFIKAT', name: 'Sertifikat Pendukung', description: 'Sertifikat kompetensi atau prestasi relevan', isRequired: false }
  ];

  if (isLoading) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}></div>
          <h6 className="fw-bold text-secondary">Menyiapkan Formulir Pendaftaran...</h6>
          <p className="text-muted small">Memuat data permohonan dan persyaratan program beasiswa</p>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW: POST-SUBMISSION CONFIRMATION DASHBOARD
  // (Sesuai Mockup Calon Pendaftar/3_index_setelah_daftar.html)
  // ══════════════════════════════════════════════════════════════
  if (submissionStatus !== 'DRAFT' && !isEditingRevision) {
    const isAccepted = finalStatus === 'ACCEPTED' || interviewStatus === 'PASSED';
    const isRejected = finalStatus === 'NOT_ACCEPTED' || interviewStatus === 'FAILED' || administrationStatus === 'REJECTED';
    const isPassedAdmin = administrationStatus === 'PASSED' && !isAccepted && !isRejected;
    const isRevision = administrationStatus === 'REVISION' || submissionStatus === 'REVISION_REQUIRED';
    const isPending = !isAccepted && !isRejected && !isPassedAdmin && !isRevision;

    return (
      <div className="bg-light min-vh-100 pb-5">
        <style>{`
          .hero-lulus {
            background: linear-gradient(135deg, #198754 0%, #0f5132 100%);
            color: white;
            border-radius: 12px;
          }
          .badge-status {
            font-size: 0.9rem;
            padding: 8px 14px;
          }
          .wizard-steps .nav-link {
            color: #6c757d;
            border-radius: 0;
            border-bottom: 3px solid transparent;
          }
          .wizard-steps .nav-link.active {
            color: #0d6efd;
            background-color: transparent;
            border-bottom: 3px solid #0d6efd;
            font-weight: bold;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin-animation {
            animation: spin 1s linear infinite;
            display: inline-block;
          }
          @media print {
            body * {
              visibility: hidden !important;
            }
            #printable-surat-modal, #printable-surat-modal * {
              visibility: visible !important;
            }
            #printable-surat-modal {
              position: fixed;
              left: 0;
              top: 0;
              width: 100vw;
              margin: 0;
              padding: 24px;
              background: white;
              z-index: 99999;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

        {/* Navbar User */}
        <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top shadow-sm no-print">
          <div className="container">
            <Link className="navbar-brand fw-bold" to="/">
              <i className="bi bi-mortarboard-fill me-2"></i>BeasiswaApp
            </Link>
            <div className="dropdown ms-auto">
              <button className="btn btn-outline-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                <i className="bi bi-person-circle me-1"></i> {fullName || user?.fullName || user?.email}
              </button>
              <ul className="dropdown-menu dropdown-menu-end shadow border-0">
                <li>
                  <button className="dropdown-item" onClick={() => refreshStatus(true)}>
                    <i className="bi bi-arrow-clockwise me-2"></i>Perbarui Status
                  </button>
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
          {/* Top Bar with Refresh & Notice */}
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3 gap-2 no-print">
            <span className="badge bg-white text-secondary border shadow-sm px-3 py-2">
              <i className="bi bi-person-badge me-1 text-primary"></i> Portal Status &amp; Pengumuman Peserta
            </span>
            <button
              className="btn btn-sm btn-outline-primary bg-white shadow-sm d-flex align-items-center gap-2 fw-semibold px-3 py-1"
              onClick={() => refreshStatus(true)}
              disabled={isRefreshingStatus}
            >
              <i className={`bi bi-arrow-clockwise ${isRefreshingStatus ? 'spin-animation' : ''}`}></i>
              {isRefreshingStatus ? 'Memperbarui...' : 'Perbarui Status'}
            </button>
          </div>

          {/* Dynamic Alert Messages */}
          {saveSuccess && (
            <div className="alert alert-success alert-dismissible fade show shadow-sm mb-3" role="alert">
              <i className="bi bi-check-circle-fill me-2"></i>{saveSuccess}
              <button type="button" className="btn-close" onClick={() => setSaveSuccess(null)}></button>
            </div>
          )}
          {saveError && (
            <div className="alert alert-danger alert-dismissible fade show shadow-sm mb-3" role="alert">
              <i className="bi bi-exclamation-octagon-fill me-2"></i>{saveError}
              <button type="button" className="btn-close" onClick={() => setSaveError(null)}></button>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* BANNER HERO UCAPAN SELAMAT (Mockup 6_index_lulus.html)    */}
          {/* ══════════════════════════════════════════════════════════ */}
          {isAccepted && (
            <div className="hero-lulus p-4 p-md-5 mb-4 shadow-sm position-relative overflow-hidden">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <span className="badge bg-warning text-dark fw-bold mb-2">
                    <i className="bi bi-trophy-fill me-1"></i> PENGUMUMAN SELEKSI FINAL
                  </span>
                  <h2 className="display-6 fw-bold mb-2">Selamat, {fullName || user?.fullName || 'Peserta'}!</h2>
                  <p className="lead mb-3">
                    Anda dinyatakan <strong>LULUS SELEKSI</strong> dan diterima sebagai penerima beasiswa program <strong>{programName}</strong>.
                  </p>
                  <div className="d-flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="btn btn-warning fw-bold text-dark shadow-sm"
                      onClick={() => setShowSuratModal(true)}
                    >
                      <i className="bi bi-file-earmark-pdf-fill me-1"></i> Unduh Surat Kelulusan (PDF)
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-light"
                      onClick={() => setShowDaftarUlangModal(true)}
                    >
                      <i className="bi bi-check-circle-fill me-1"></i> Konfirmasi / Daftar Ulang
                    </button>
                  </div>

                  {confirmationStatus === 'CONFIRMED' && (
                    <div className="mt-3">
                      <span className="badge bg-white text-success fw-bold px-3 py-2 shadow-sm">
                        <i className="bi bi-check2-circle me-1"></i> Status Kehadiran: Bersedia Mengikuti Pelatihan
                      </span>
                    </div>
                  )}
                  {confirmationStatus === 'WITHDRAWN' && (
                    <div className="mt-3">
                      <span className="badge bg-white text-danger fw-bold px-3 py-2 shadow-sm">
                        <i className="bi bi-x-circle me-1"></i> Status Kehadiran: Mengundurkan Diri
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-md-4 text-center d-none d-md-block">
                  <i className="bi bi-award-fill opacity-75" style={{ fontSize: '8rem' }}></i>
                </div>
              </div>
            </div>
          )}

          {/* BANNER JIKA LOLOS ADMINISTRASI & MENUNGGU WAWANCARA */}
          {isPassedAdmin && (
            <div className="alert alert-primary border-0 shadow-sm d-flex align-items-center mb-4 p-4 rounded-3" role="alert">
              <i className="bi bi-patch-check-fill fs-2 me-3 text-primary"></i>
              <div>
                <strong className="fs-5 text-primary">Selamat! Anda Dinyatakan Lolos Seleksi Administrasi</strong>
                <p className="mb-0 small text-secondary">
                  Berkas administrasi Anda telah diverifikasi dan dinyatakan lengkap &amp; sesuai. Saat ini permohonan Anda siap untuk tahapan <strong>Seleksi Wawancara</strong>.
                </p>
              </div>
            </div>
          )}

          {/* BANNER JIKA PENDING VERIFIKASI (Mockup 3_index_terkirim.html) */}
          {isPending && (
            <div className="alert alert-success border-0 shadow-sm d-flex align-items-center mb-4 p-4 rounded-3" role="alert">
              <i className="bi bi-check-circle-fill fs-2 me-3 text-success"></i>
              <div>
                <strong className="fs-5 text-success">Pendaftaran Berhasil Terkirim!</strong>
                <p className="mb-0 small text-secondary">
                  Berkas Anda telah terkunci dan saat ini sedang dalam proses <strong>Seleksi Administrasi</strong> oleh Verifikator. Perubahan data tidak dapat dilakukan selama proses verifikasi berjalan.
                </p>
              </div>
            </div>
          )}

          {/* BANNER JIKA REVISI BERKAS (Mockup 4_index_revisi.html) */}
          {isRevision && (
            <div className="alert alert-warning border-0 shadow-sm d-flex flex-wrap align-items-center justify-content-between mb-4 p-4 rounded-3" role="alert">
              <div className="d-flex align-items-center mb-2 mb-md-0">
                <i className="bi bi-exclamation-triangle-fill fs-2 me-3 text-warning"></i>
                <div>
                  <strong className="fs-5 text-dark">Perhatian: Berkas Permohonan Memerlukan Perbaikan (Revisi)</strong>
                  <p className="mb-0 small text-secondary">
                    Tim verifikator memerlukan perbaikan atau unggah ulang dokumen sebelum permohonan dapat diproses lebih lanjut.
                  </p>
                </div>
              </div>
              <button
                className="btn btn-warning text-dark fw-bold px-3 py-2 shadow-sm"
                onClick={() => {
                  setCurrentStep(3);
                  setIsEditingRevision(true);
                }}
              >
                <i className="bi bi-pencil-square me-2"></i>Perbaiki Berkas Sekarang
              </button>
            </div>
          )}

          {/* BANNER JIKA TIDAK LOLOS */}
          {isRejected && (
            <div className="alert alert-danger border-0 shadow-sm d-flex align-items-center mb-4 p-4 rounded-3" role="alert">
              <i className="bi bi-x-circle-fill fs-2 me-3 text-danger"></i>
              <div>
                <strong className="fs-5 text-danger">Pengumuman Hasil Seleksi: Mohon Maaf, Anda Belum Lolos Seleksi</strong>
                <p className="mb-0 small text-secondary">
                  {administrationStatus === 'REJECTED'
                    ? 'Berkas administrasi dan dokumen yang diunggah belum memenuhi kriteria persyaratan program beasiswa ini.'
                    : interviewStatus === 'FAILED'
                    ? 'Berdasarkan evaluasi wawancara oleh Lembaga Seleksi, hasil penilaian belum memenuhi standar kelulusan.'
                    : 'Permohonan beasiswa Anda pada program ini belum dapat diloloskan pada periode seleksi saat ini.'}
                </p>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* TABEL MONITORING STATUS DETAIL (Mockup 6_index_lulus.html) */}
          {/* ══════════════════════════════════════════════════════════ */}
          <div className="card border-0 shadow-sm mb-4">
            <div className="card-header bg-white py-3 fw-bold border-bottom d-flex justify-content-between align-items-center">
              <span>
                <i className="bi bi-clipboard-data-fill me-2 text-success"></i>Rincian Status Seleksi Peserta
              </span>
              <span className="badge bg-light text-dark border font-monospace">
                Kode: {registrationCode || 'REG-PENDING'}
              </span>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Program Pelatihan</th>
                      <th>Seleksi Administrasi</th>
                      <th>Seleksi Wawancara</th>
                      <th>Status Akhir (Kelulusan)</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>
                        <strong>{programName}</strong><br />
                        <small className="text-muted">Kode Pendaftaran: {registrationCode || 'REG-PENDING'}</small>
                      </td>
                      <td>
                        {administrationStatus === 'PASSED' ? (
                          <span className="badge bg-success badge-status">
                            <i className="bi bi-check-circle-fill me-1"></i> Lolos
                          </span>
                        ) : administrationStatus === 'REJECTED' ? (
                          <span className="badge bg-danger badge-status">
                            <i className="bi bi-x-circle-fill me-1"></i> Tidak Lolos
                          </span>
                        ) : administrationStatus === 'REVISION' ? (
                          <span className="badge bg-warning text-dark badge-status">
                            <i className="bi bi-pencil-square me-1"></i> Revisi Berkas
                          </span>
                        ) : (
                          <span className="badge bg-info text-dark badge-status">
                            <i className="bi bi-hourglass-split me-1"></i> Proses Verifikasi
                          </span>
                        )}
                      </td>
                      <td>
                        {interviewStatus === 'PASSED' ? (
                          <span className="badge bg-success badge-status">
                            <i className="bi bi-check-circle-fill me-1"></i> Lulus Wawancara
                          </span>
                        ) : interviewStatus === 'FAILED' ? (
                          <span className="badge bg-danger badge-status">
                            <i className="bi bi-x-circle-fill me-1"></i> Tidak Lulus
                          </span>
                        ) : administrationStatus === 'PASSED' ? (
                          <span className="badge bg-warning text-dark badge-status">
                            <i className="bi bi-clock-history me-1"></i> Menunggu Jadwal
                          </span>
                        ) : (
                          <span className="badge bg-secondary badge-status">
                            -
                          </span>
                        )}
                      </td>
                      <td>
                        {isAccepted ? (
                          <span className="badge bg-success badge-status">
                            <i className="bi bi-trophy-fill me-1"></i> DITERIMA (LULUS)
                          </span>
                        ) : isRejected ? (
                          <span className="badge bg-danger badge-status">
                            <i className="bi bi-x-circle-fill me-1"></i> DITOLAK
                          </span>
                        ) : (
                          <span className="badge bg-info text-dark badge-status">
                            <i className="bi bi-hourglass-split me-1"></i> PROSES SELEKSI
                          </span>
                        )}
                      </td>
                      <td>
                        {isRevision ? (
                          <button
                            className="btn btn-sm btn-warning text-dark fw-bold"
                            onClick={() => {
                              setCurrentStep(3);
                              setIsEditingRevision(true);
                            }}
                          >
                            <i className="bi bi-pencil-square me-1"></i> Perbaiki Berkas
                          </button>
                        ) : (
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => setShowReadonlyModal(true)}
                          >
                            <i className="bi bi-eye me-1"></i> Lihat Data Pendaftaran
                          </button>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════ */}
          {/* RINCIAN LANGKAH SELANJUTNYA & JADWAL (Mockup 6_index_lulus)*/}
          {/* ══════════════════════════════════════════════════════════ */}
          {isAccepted && (
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <h6 className="fw-bold text-success mb-3">
                      <i className="bi bi-info-circle-fill me-2"></i>Langkah Selanjutnya
                    </h6>
                    <ol className="small text-secondary ps-3 mb-0">
                      <li className="mb-2">Unduh Surat Keterangan Kelulusan resmi berbentuk PDF melalui tombol di atas.</li>
                      <li className="mb-2">Lakukan konfirmasi kehadiran/daftar ulang sebelum <strong>10 September 2026</strong>.</li>
                      <li className="mb-2">Bergabung ke dalam grup koordinasi Telegram/WhatsApp peserta pelatihan.</li>
                      <li>Mengikuti Orientasi Pembukaan Pelatihan secara daring sesuai jadwal terlampir pada surat.</li>
                    </ol>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100 bg-white">
                  <div className="card-body">
                    <h6 className="fw-bold text-primary mb-3">
                      <i className="bi bi-calendar-check-fill me-2"></i>Jadwal Kegiatan Pelatihan
                    </h6>
                    <ul className="list-unstyled small mb-0">
                      <li className="mb-2"><strong>Konfirmasi Daftar Ulang:</strong> 02 - 10 September 2026</li>
                      <li className="mb-2"><strong>Orientasi Peserta:</strong> 15 September 2026 (09.00 WIB)</li>
                      <li><strong>Pelaksanaan Kelas Pertama:</strong> 20 September 2026</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════ */}
          {/* EVALUASI SELEKSI WAWANCARA (JIKA TERSEDIA)                */}
          {/* ══════════════════════════════════════════════════════════ */}
          {interviewScoreData && (
            <div className="card shadow-sm border-0 mb-4">
              <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
                <h6 className="fw-bold mb-0 text-dark">
                  <i className="bi bi-clipboard2-data me-2 text-primary"></i>Evaluasi Seleksi Wawancara
                </h6>
                <span className={`badge ${interviewScoreData.decision === 'PASSED' ? 'bg-success' : 'bg-danger'} px-3 py-1 fs-6`}>
                  {interviewScoreData.decision === 'PASSED' ? 'LULUS WAWANCARA' : 'TIDAK LULUS WAWANCARA'}
                </span>
              </div>
              <div className="card-body p-4">
                <div className="row g-3 text-center mb-3">
                  <div className="col-6 col-md-3">
                    <div className="p-3 border rounded bg-light">
                      <small className="text-muted d-block">Komunikasi &amp; Sikap (30%)</small>
                      <span className="fs-4 fw-bold text-dark">{interviewScoreData.scoreAspect1 ?? '-'}</span>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-3 border rounded bg-light">
                      <small className="text-muted d-block">Teknis &amp; Portofolio (40%)</small>
                      <span className="fs-4 fw-bold text-dark">{interviewScoreData.scoreAspect2 ?? '-'}</span>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className="p-3 border rounded bg-light">
                      <small className="text-muted d-block">Motivasi &amp; Komitmen (30%)</small>
                      <span className="fs-4 fw-bold text-dark">{interviewScoreData.scoreAspect3 ?? '-'}</span>
                    </div>
                  </div>
                  <div className="col-6 col-md-3">
                    <div className={`p-3 border rounded ${interviewScoreData.decision === 'PASSED' ? 'bg-success-subtle border-success text-success' : 'bg-danger-subtle border-danger text-danger'}`}>
                      <small className="d-block fw-semibold">Total Nilai Wawancara</small>
                      <span className="fs-3 fw-bold">{interviewScoreData.totalScore != null ? Number(interviewScoreData.totalScore).toFixed(2) : '-'}</span>
                      <small className="d-block text-muted">dari 100</small>
                    </div>
                  </div>
                </div>
                {interviewScoreData.notes && (
                  <div className="p-3 rounded bg-light border">
                    <strong className="small text-secondary d-block mb-1">
                      <i className="bi bi-chat-quote me-1"></i> Catatan Evaluasi Tim Pewawancara:
                    </strong>
                    <p className="mb-0 text-dark fst-italic">"{interviewScoreData.notes}"</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {reviewData?.generalNotes && (
            <div className="alert alert-info border shadow-sm mb-4">
              <h6 className="fw-bold mb-1">
                <i className="bi bi-info-circle-fill me-2"></i>Catatan Tim Verifikator Administrasi:
              </h6>
              <p className="mb-0">{reviewData.generalNotes}</p>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL KONFIRMASI DAFTAR ULANG (Mockup #daftarUlangModal)   */}
        {/* ══════════════════════════════════════════════════════════ */}
        {showDaftarUlangModal && (
          <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-success text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-check2-square me-2"></i>Konfirmasi Kehadiran / Daftar Ulang
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowDaftarUlangModal(false)}></button>
                </div>
                <div className="modal-body">
                  <p className="small text-muted">
                    Silakan konfirmasi kesediaan Anda untuk mengikuti program <strong>{programName}</strong> hingga selesai.
                  </p>
                  <form onSubmit={handleSubmitConfirmation}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Status Kesediaan</label>
                      <select
                        className="form-select"
                        value={kesediaanStatus}
                        onChange={(e) => setKesediaanStatus(e.target.value as any)}
                      >
                        <option value="CONFIRMED">Ya, Saya Bersedia Mengikuti Pelatihan</option>
                        <option value="WITHDRAWN">Saya Mengundurkan Diri</option>
                      </select>
                    </div>
                    <div className="mb-3">
                      <label className="form-label fw-semibold small">Catatan Tambahan (Opsional)</label>
                      <textarea
                        className="form-control"
                        rows={3}
                        placeholder="Catatan untuk panitia (misal kesiapan perangkat, jadwal, dll)..."
                        value={catatanKonfirmasi}
                        onChange={(e) => setCatatanKonfirmasi(e.target.value)}
                      ></textarea>
                    </div>
                    <div className="d-flex gap-2">
                      <button type="button" className="btn btn-light border flex-fill" onClick={() => setShowDaftarUlangModal(false)}>
                        Batal
                      </button>
                      <button type="submit" className="btn btn-success flex-fill fw-semibold" disabled={isSubmittingConfirmation}>
                        {isSubmittingConfirmation ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>Menyimpan...
                          </>
                        ) : (
                          'Kirim Konfirmasi'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL DATA PENDAFTARAN (READ-ONLY) (#wizardReadonlyModal)  */}
        {/* ══════════════════════════════════════════════════════════ */}
        {showReadonlyModal && (
          <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-secondary text-white">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-lock-fill me-2"></i>Arsip Data Pendaftaran ({isAccepted ? 'Lulus' : 'Read-Only'})
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowReadonlyModal(false)}></button>
                </div>
                <div className="modal-body p-0">
                  {/* Status List Group (Mockup 6_index_lulus) */}
                  <div className="p-3 bg-light border-bottom">
                    <ul className="list-group list-group-flush small rounded border">
                      <li className="list-group-item d-flex justify-content-between">
                        <strong>Nama Lengkap:</strong>
                        <span>{fullName || user?.fullName}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <strong>NIK:</strong>
                        <span className="font-monospace">{nik || user?.nik}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <strong>Program:</strong>
                        <span>{programName}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <strong>Seleksi Administrasi:</strong>
                        <span>{administrationStatus === 'PASSED' ? 'Disetujui / Lolos' : administrationStatus === 'REJECTED' ? 'Tidak Lolos' : 'Dalam Proses'}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <strong>Seleksi Wawancara:</strong>
                        <span>{interviewStatus === 'PASSED' ? 'Lulus Wawancara' : interviewStatus === 'FAILED' ? 'Tidak Lulus' : 'Menunggu Jadwal'}</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between">
                        <strong>Hasil Akhir:</strong>
                        <span className={`badge ${isAccepted ? 'bg-success' : isRejected ? 'bg-danger' : 'bg-info text-dark'}`}>
                          {isAccepted ? 'LULUS / DITERIMA' : isRejected ? 'TIDAK DITERIMA' : 'PROSES SELEKSI'}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* Tabs Detail Data */}
                  <ul className="nav nav-tabs nav-justified wizard-steps bg-white border-bottom">
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${readonlyActiveTab === 'ringkasan' ? 'active' : ''}`}
                        onClick={() => setReadonlyActiveTab('ringkasan')}
                      >
                        Ringkasan
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${readonlyActiveTab === 'datadiri' ? 'active' : ''}`}
                        onClick={() => setReadonlyActiveTab('datadiri')}
                      >
                        1. Data Diri &amp; Kontak
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${readonlyActiveTab === 'pendidikan' ? 'active' : ''}`}
                        onClick={() => setReadonlyActiveTab('pendidikan')}
                      >
                        2. Pendidikan &amp; Pekerjaan
                      </button>
                    </li>
                    <li className="nav-item">
                      <button
                        type="button"
                        className={`nav-link ${readonlyActiveTab === 'berkas' ? 'active' : ''}`}
                        onClick={() => setReadonlyActiveTab('berkas')}
                      >
                        3. Berkas Dokumen
                      </button>
                    </li>
                  </ul>

                  <div className="p-3">
                    {readonlyActiveTab === 'ringkasan' && (
                      <div className="small">
                        <div className="row g-3">
                          <div className="col-sm-6">
                            <span className="text-muted d-block">Nomor Registrasi:</span>
                            <strong className="font-monospace text-primary fs-6">{registrationCode}</strong>
                          </div>
                          <div className="col-sm-6">
                            <span className="text-muted d-block">Tanggal Pengiriman:</span>
                            <span>{submittedAt ? new Date(submittedAt).toLocaleString('id-ID') : '-'}</span>
                          </div>
                          <div className="col-sm-6">
                            <span className="text-muted d-block">Alamat Email &amp; No. HP:</span>
                            <span>{email} | {phoneNumber}</span>
                          </div>
                          <div className="col-sm-6">
                            <span className="text-muted d-block">Pendidikan Terakhir:</span>
                            <span>{educationLevel} — {institutionName} {major ? `(${major})` : ''}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {readonlyActiveTab === 'datadiri' && (
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">NIK</label>
                          <input type="text" className="form-control form-control-sm" value={nik} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Nama Lengkap</label>
                          <input type="text" className="form-control form-control-sm" value={fullName} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Email</label>
                          <input type="text" className="form-control form-control-sm" value={email} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">No. HP / WhatsApp</label>
                          <input type="text" className="form-control form-control-sm" value={phoneNumber} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Tempat / Tanggal Lahir</label>
                          <input type="text" className="form-control form-control-sm" value={`${birthPlace || '-'}, ${birthDate || '-'}`} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Jenis Kelamin</label>
                          <input type="text" className="form-control form-control-sm" value={gender === 'MALE' ? 'Laki-laki' : 'Perempuan'} disabled />
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted mb-1">Alamat Lengkap</label>
                          <input type="text" className="form-control form-control-sm" value={`${address || '-'}, ${villageName || ''}, ${districtName || ''}, ${regencyName || ''}, ${provinceName || ''}`} disabled />
                        </div>
                      </div>
                    )}

                    {readonlyActiveTab === 'pendidikan' && (
                      <div className="row g-2 small">
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Jenjang Pendidikan</label>
                          <input type="text" className="form-control form-control-sm" value={educationLevel} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Nama Perguruan Tinggi / Sekolah</label>
                          <input type="text" className="form-control form-control-sm" value={institutionName} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Jurusan / Program Studi</label>
                          <input type="text" className="form-control form-control-sm" value={major || '-'} disabled />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label text-muted mb-1">Tahun Lulus</label>
                          <input type="text" className="form-control form-control-sm" value={graduationYear || '-'} disabled />
                        </div>
                        <div className="col-12">
                          <label className="form-label text-muted mb-1">Pekerjaan Saat Ini</label>
                          <input type="text" className="form-control form-control-sm" value={currentOccupation || 'Belum / Tidak Bekerja'} disabled />
                        </div>
                      </div>
                    )}

                    {readonlyActiveTab === 'berkas' && (
                      <div>
                        <div className="list-group list-group-flush small">
                          {Object.entries(uploadedDocs).length === 0 ? (
                            <div className="text-muted text-center py-3">Tidak ada berkas terunggah</div>
                          ) : (
                            Object.entries(uploadedDocs).map(([code, doc]) => (
                              <div key={code} className="list-group-item d-flex justify-content-between align-items-center py-2 px-0">
                                <div className="d-flex align-items-center gap-2">
                                  <i className="bi bi-file-earmark-pdf-fill text-danger fs-4"></i>
                                  <div>
                                    <strong>{code}</strong> — <span className="text-dark">{doc.originalFilename}</span>
                                    <div className="text-muted" style={{ fontSize: '0.75rem' }}>{formatBytes(doc.fileSize)} • Clean</div>
                                  </div>
                                </div>
                                <a
                                  href={`/api/v1/documents/${doc.documentId}/content${getAccessToken() ? `?token=${encodeURIComponent(getAccessToken()!)}` : ''}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-sm btn-outline-primary"
                                >
                                  <i className="bi bi-eye me-1"></i>Lihat Berkas
                                </a>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer bg-light">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowReadonlyModal(false)}>
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MODAL SURAT KELULUSAN RESMI (PDF / PRINTABLE)              */}
        {/* ══════════════════════════════════════════════════════════ */}
        {showSuratModal && (
          <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
              <div className="modal-content border-0 shadow">
                <div className="modal-header bg-dark text-white no-print">
                  <h5 className="modal-title fw-bold">
                    <i className="bi bi-file-earmark-pdf-fill text-warning me-2"></i>Surat Keterangan Kelulusan Seleksi (SK)
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowSuratModal(false)}></button>
                </div>
                <div className="modal-body p-4 bg-white" id="printable-surat-modal">
                  {/* Kop Surat Resmi */}
                  <div className="text-center pb-3 mb-3 border-bottom border-dark border-3" style={{ borderBottomStyle: 'double' }}>
                    <div className="d-flex align-items-center justify-content-center gap-3 mb-2">
                      <i className="bi bi-award-fill text-warning fs-1"></i>
                      <div>
                        <h6 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>
                          KEMENTERIAN KOMUNIKASI DAN DIGITAL REPUBLIK INDONESIA
                        </h6>
                        <h5 className="fw-bold mb-0 text-uppercase text-primary">
                          BADAN PENGEMBANGAN SUMBER DAYA MANUSIA KOMUNIKASI DAN DIGITAL
                        </h5>
                        <small className="text-muted">
                          Jl. Medan Merdeka Barat No. 9, Jakarta Pusat 10110 | Website: https://komdigi.go.id | Email: beasiswa@komdigi.go.id
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Nomor & Judul Surat */}
                  <div className="text-center mb-4">
                    <h6 className="fw-bold text-decoration-underline mb-1">SURAT KEPUTUSAN KELULUSAN SELEKSI</h6>
                    <div className="small text-muted font-monospace">Nomor: BIT/SK-LULUS/2026/{registrationCode || 'REG-2026-FINAL'}</div>
                    <div className="small fw-semibold mt-1">Tentang: Penetapan Penerima Beasiswa Indonesia Talenta Tahun Anggaran 2026</div>
                  </div>

                  {/* Isi Surat */}
                  <p className="small text-secondary" style={{ lineHeight: 1.6 }}>
                    Berdasarkan hasil rekapitulasi Uji Administrasi dan Uji Wawancara Komprehensif oleh Tim Penguji dan Panitia Seleksi Nasional, dengan ini menetapkan bahwa calon peserta di bawah ini:
                  </p>

                  <div className="card bg-light border p-3 mb-3">
                    <table className="table table-sm table-borderless mb-0 small">
                      <tbody>
                        <tr>
                          <td style={{ width: '220px' }} className="text-muted">Nama Lengkap</td>
                          <td style={{ width: '10px' }}>:</td>
                          <td className="fw-bold text-dark">{fullName || user?.fullName}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Nomor Induk Kependudukan (NIK)</td>
                          <td>:</td>
                          <td className="font-monospace">{nik || user?.nik}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Nomor Registrasi Seleksi</td>
                          <td>:</td>
                          <td className="font-monospace fw-bold text-primary">{registrationCode}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Program Pelatihan Beasiswa</td>
                          <td>:</td>
                          <td className="fw-bold text-dark">{programName}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Status Keputusan Akhir</td>
                          <td>:</td>
                          <td>
                            <span className="badge bg-success px-3 py-1 fw-bold fs-6">
                              <i className="bi bi-patch-check-fill me-1"></i> DITERIMA SEBAGAI PENERIMA BEASISWA
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <p className="small text-secondary" style={{ lineHeight: 1.6 }}>
                    Kepada peserta yang bersangkutan diwajibkan:
                  </p>
                  <ol className="small text-secondary ps-3 mb-4" style={{ lineHeight: 1.6 }}>
                    <li>Melakukan konfirmasi kehadiran / daftar ulang paling lambat tanggal <strong>10 September 2026</strong> pukul 23:59 WIB.</li>
                    <li>Mengikuti sesi Orientasi Pembukaan Beasiswa pada tanggal <strong>15 September 2026</strong>.</li>
                    <li>Mematuhi seluruh ketentuan dan kode etik penyelenggaraan Program Beasiswa Indonesia Talenta.</li>
                  </ol>

                  {/* Pengesahan Tanda Tangan */}
                  <div className="row mt-4 pt-2">
                    <div className="col-6 text-center">
                      <div className="p-2 border rounded d-inline-block bg-light">
                        <i className="bi bi-qr-code fs-1 d-block"></i>
                        <small className="font-monospace text-muted" style={{ fontSize: '0.65rem' }}>
                          VERIFIED-BIT-2026<br />DIGITALLY SIGNED
                        </small>
                      </div>
                    </div>
                    <div className="col-6 text-center small">
                      <div className="text-muted">Ditetapkan di: Jakarta</div>
                      <div className="text-muted mb-4">Pada tanggal: {submittedAt ? new Date(submittedAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '02 September 2026'}</div>
                      <div className="fw-bold text-decoration-underline mt-4">Panitia Seleksi Beasiswa</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>Badan Pengembangan SDM Komunikasi &amp; Digital</div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-light no-print d-flex justify-content-between">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowSuratModal(false)}>
                    Tutup
                  </button>
                  <button type="button" className="btn btn-warning fw-bold text-dark" onClick={() => window.print()}>
                    <i className="bi bi-printer-fill me-1"></i> Cetak / Simpan PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // VIEW: 4-STEP WIZARD FORM
  // ══════════════════════════════════════════════════════════════
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

      <div className="container py-4" style={{ maxWidth: '960px' }}>
        {/* ── Header Card ──────────────────────────────────────── */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-4">
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
              <div style={{ flex: '1 1 520px' }}>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="badge bg-primary-subtle text-primary">Formulir Pendaftaran Beasiswa</span>
                  {availablePrograms.length > 1 && submissionStatus === 'DRAFT' && (
                    <span className="badge bg-info-subtle text-info border">
                      <i className="bi bi-collection me-1"></i>Tersedia {availablePrograms.length} Pilihan Program
                    </span>
                  )}
                </div>

                {submissionStatus === 'DRAFT' && availablePrograms.length > 1 ? (
                  <div className="my-2 p-2 bg-light rounded border">
                    <label className="form-label small fw-bold text-dark mb-1 d-flex align-items-center gap-1">
                      <i className="bi bi-mortarboard-fill text-primary"></i> Program Beasiswa yang Dipilih:
                    </label>
                    <select
                      className="form-select fw-bold text-primary border-primary bg-white shadow-sm"
                      value={selectedProgramId}
                      onChange={(e) => handleProgramChange(e.target.value)}
                      disabled={isChangingProgram}
                    >
                      {availablePrograms.map((prog) => (
                        <option key={prog.id} value={prog.id}>
                          {prog.name} — ({prog.method === 'DARING' ? 'Online' : prog.method === 'HYBRID' ? 'Hybrid' : 'Tatap Muka'}) | Kuota: {prog.quota}
                        </option>
                      ))}
                    </select>
                    {isChangingProgram && (
                      <small className="text-muted d-block mt-1">
                        <span className="spinner-border spinner-border-sm me-1 text-primary"></span>
                        Memperbarui program beasiswa &amp; persyaratan dokumen...
                      </small>
                    )}
                  </div>
                ) : (
                  <h4 className="fw-bold mb-1 text-dark">{programName}</h4>
                )}

                <p className="text-muted small mb-0">
                  Silakan isi seluruh tahapan data dengan teliti dan unggah dokumen persyaratan yang sah.
                </p>
              </div>
              <div className="text-end">
                <div className="small text-muted">Kode Registrasi:</div>
                <div className="fw-bold font-monospace text-primary fs-5">{registrationCode || 'REG-PENDING'}</div>
                <span className="badge bg-secondary-subtle text-secondary border">Status: {submissionStatus}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Step Indicator Bar ───────────────────────────────── */}
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-body p-3">
            <div className="row g-2 text-center">
              {[
                { step: 1, label: 'Data Diri', icon: 'bi-person' },
                { step: 2, label: 'Pendidikan', icon: 'bi-mortarboard' },
                { step: 3, label: 'Unggah Berkas', icon: 'bi-file-earmark-arrow-up' },
                { step: 4, label: 'Persetujuan & Submit', icon: 'bi-shield-check' }
              ].map((s) => (
                <div className="col-3" key={s.step}>
                  <div
                    className={`p-2 rounded d-flex flex-column align-items-center cursor-pointer transition ${
                      currentStep === s.step
                        ? 'bg-primary text-white fw-bold shadow-sm'
                        : currentStep > s.step
                        ? 'bg-light text-success fw-semibold border border-success-subtle'
                        : 'bg-light text-muted'
                    }`}
                    style={{ cursor: s.step < currentStep ? 'pointer' : 'default' }}
                    onClick={() => {
                      if (s.step < currentStep) setCurrentStep(s.step);
                    }}
                  >
                    <i className={`bi ${s.icon} fs-5 mb-1`}></i>
                    <span className="small text-truncate w-100">
                      {s.step}. {s.label}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Revision Mode Banner (If applicable) ─────────────── */}
        {isEditingRevision && (
          <div className="alert alert-warning border-warning shadow-sm mb-4 d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div>
              <h6 className="fw-bold mb-1">
                <i className="bi bi-pencil-square me-2"></i>Mode Perbaikan Berkas (Revisi Permohonan)
              </h6>
              <p className="small mb-0">
                Silakan ganti atau perbaiki dokumen yang ditolak oleh verifikator pada Bagian 3, lalu klik tombol <strong>Kirim Ulang Permohonan</strong>.
              </p>
            </div>
            <div className="d-flex gap-2">
              <button
                className="btn btn-sm btn-outline-secondary bg-white shadow-sm"
                onClick={() => setIsEditingRevision(false)}
              >
                <i className="bi bi-arrow-left me-1"></i> Batal &amp; Kembali ke Status
              </button>
              <button
                className="btn btn-sm btn-warning text-dark fw-bold shadow-sm"
                onClick={handleResubmit}
                disabled={isSubmitting}
              >
                <i className="bi bi-send-check me-1"></i> {isSubmitting ? 'Mengirim Ulang...' : 'Kirim Ulang Permohonan'}
              </button>
            </div>
          </div>
        )}

        {/* ── Alerts ──────────────────────────────────────────── */}
        {saveSuccess && (
          <div className="alert alert-success alert-dismissible fade show shadow-sm" role="alert">
            <i className="bi bi-check-circle me-2"></i>{saveSuccess}
            <button type="button" className="btn-close" onClick={() => setSaveSuccess(null)}></button>
          </div>
        )}

        {saveError && (
          <div className="alert alert-danger alert-dismissible fade show shadow-sm" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>{saveError}
            <button type="button" className="btn-close" onClick={() => setSaveError(null)}></button>
          </div>
        )}

        {/* ── Main Form Container ──────────────────────────────── */}
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            {/* ── STEP 1: DATA DIRI ───────────────────────────── */}
            {currentStep === 1 && (
              <div>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="bi bi-person-badge me-2"></i>Bagian 1: Data Pribadi Calon Peserta
                </h6>

                {/* Info Program Terpilih */}
                <div className="alert alert-primary bg-primary-subtle border-primary-subtle mb-4 p-3 rounded-3 d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <div>
                    <div className="small text-uppercase fw-bold text-primary mb-1">
                      <i className="bi bi-award-fill me-1"></i> Program Beasiswa yang Anda Daftarkan:
                    </div>
                    <div className="fw-bold fs-6 text-dark">{programName}</div>
                    <small className="text-muted">
                      Persyaratan dokumen berkas pada Bagian 3 disesuaikan khusus untuk program beasiswa ini.
                    </small>
                  </div>
                  {availablePrograms.length > 1 && submissionStatus === 'DRAFT' && (
                    <div>
                      <select
                        className="form-select form-select-sm border-primary text-primary fw-semibold shadow-sm"
                        value={selectedProgramId}
                        onChange={(e) => handleProgramChange(e.target.value)}
                        disabled={isChangingProgram}
                      >
                        {availablePrograms.map((prog) => (
                          <option key={prog.id} value={prog.id}>
                            Ganti ke: {prog.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Nomor Induk Kependudukan (NIK) *</label>
                    <input
                      type="text"
                      className="form-control bg-light font-monospace"
                      value={nik}
                      readOnly
                      title="NIK terdaftar otomatis dari akun Anda"
                    />
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>NIK terkunci sesuai identitas pendaftaran akun</small>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Nama Lengkap Sesuai KTP *</label>
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
                      placeholder="Contoh: Jakarta"
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
                      onChange={(e) => setGender(e.target.value as 'MALE' | 'FEMALE')}
                      required
                    >
                      <option value="MALE">Laki-laki</option>
                      <option value="FEMALE">Perempuan</option>
                    </select>
                  </div>

                  <div className="col-12">
                    <label className="form-label fw-semibold small">Alamat Domisili Lengkap (Jalan, RT/RW, No. Rumah) *</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Contoh: Jl. Merdeka No. 12 RT 01 / RW 02"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                    ></textarea>
                  </div>

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
                    <label className="form-label fw-semibold small">Kabupaten / Kota *</label>
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
                    <label className="form-label fw-semibold small">Kelurahan / Desa *</label>
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
                    <label className="form-label fw-semibold small">Nomor HP / WhatsApp Aktif *</label>
                    <input
                      type="tel"
                      className="form-control"
                      placeholder="Contoh: 081234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      required
                    />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-semibold small">Alamat Email Terdaftar *</label>
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
                      placeholder="Contoh: Teknik Informatika / Ilmu Komputer"
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

            {/* ── STEP 3: UNGGAH DOKUMEN PERSYARATAN ───────────── */}
            {currentStep === 3 && (
              <div>
                <h6 className="fw-bold mb-2 text-primary">
                  <i className="bi bi-file-earmark-arrow-up me-2"></i>Bagian 3: Unggah Dokumen Persyaratan
                </h6>
                <p className="text-muted small mb-4">
                  Pastikan dokumen asli dalam format resmi (<strong>PDF / JPG / PNG</strong>) dengan ukuran berkas maksimal <strong>2MB</strong>.
                  Setiap berkas akan dipindai secara otomatis menggunakan <em>ClamAV Antivirus</em> sebelum diterima sistem.
                </p>

                <div className="row g-4">
                  {activeRequirements.map((req: any) => {
                    const code = req.code || req.requirementTypeCode || req.requirement_type_code;
                    const isMandatory = req.isRequired || req.isMandatory || req.is_mandatory || req.is_required;
                    const doc = uploadedDocs[code];
                    const upState = uploadingDoc[code];
                    const isUploading = upState && (upState.status === 'reserving' || upState.status === 'uploading' || upState.status === 'scanning');

                    return (
                      <div className="col-md-6" key={req.requirementTypeId || code}>
                        <div className={`card h-100 border transition ${doc?.isClean ? 'border-success bg-success-subtle bg-opacity-10' : 'bg-white'}`}>
                          <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <div>
                                <strong className="text-dark d-block">{req.name}</strong>
                                {req.description && (
                                  <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>{req.description}</small>
                                )}
                              </div>
                              <span className={`badge ${isMandatory ? 'bg-danger' : 'bg-secondary'}`}>
                                {isMandatory ? 'Wajib' : 'Opsional'}
                              </span>
                            </div>

                            {/* Case A: Already Uploaded and Clean */}
                            {doc?.isClean ? (
                              <div className="p-2 border border-success-subtle rounded bg-white mt-2">
                                <div className="d-flex align-items-center justify-content-between mb-1">
                                  <div className="d-flex align-items-center gap-2 overflow-hidden">
                                    <i className="bi bi-file-earmark-check-fill text-success fs-4"></i>
                                    <div className="text-truncate">
                                      <strong className="small d-block text-truncate">{doc.originalFilename}</strong>
                                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        {formatBytes(doc.fileSize)}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                                    <i className="bi bi-shield-check me-1"></i> Clean
                                  </span>
                                </div>

                                <div className="d-flex justify-content-end gap-2 mt-2 pt-1 border-top">
                                  <label className="btn btn-outline-secondary btn-sm py-0 px-2 small" style={{ cursor: 'pointer', fontSize: '0.75rem' }}>
                                    <i className="bi bi-arrow-repeat me-1"></i>Ganti Berkas
                                    <input
                                      type="file"
                                      className="d-none"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      disabled={isUploading}
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleFileUpload(code, e.target.files[0]);
                                        }
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              /* Case B: File Input / Upload Action */
                              <div className="mt-2">
                                {isUploading ? (
                                  <div className="p-3 border rounded bg-light text-center">
                                    <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                                    <div className="small fw-semibold text-primary">{upState?.message || 'Memproses berkas...'}</div>
                                  </div>
                                ) : (
                                  <div>
                                    <input
                                      type="file"
                                      className="form-control form-control-sm mb-1"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      disabled={isSaving}
                                      onChange={(e) => {
                                        if (e.target.files?.[0]) {
                                          handleFileUpload(code, e.target.files[0]);
                                        }
                                      }}
                                    />
                                    <div className="d-flex justify-content-between align-items-center text-muted" style={{ fontSize: '0.75rem' }}>
                                      <span>Format: PDF, JPG, PNG</span>
                                      <span>Maks. 2MB</span>
                                    </div>
                                  </div>
                                )}

                                {upState?.status === 'error' && (
                                  <div className="alert alert-danger py-1 px-2 mt-2 mb-0 small" style={{ fontSize: '0.75rem' }}>
                                    <i className="bi bi-exclamation-octagon-fill me-1"></i>{upState.message}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 4: PERSETUJUAN & RINGKASAN DATA ────────── */}
            {currentStep === 4 && (
              <div>
                <h6 className="fw-bold mb-3 text-primary">
                  <i className="bi bi-shield-check me-2"></i>Bagian 4: Ringkasan &amp; Pernyataan Keabsahan Data
                </h6>

                {/* Summary Card */}
                <div className="card border bg-light mb-4">
                  <div className="card-header bg-white py-2 border-bottom">
                    <strong className="small text-secondary">Periksa Kembali Rincian Pendaftaran Anda</strong>
                  </div>
                  <div className="card-body p-3 small">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <span className="text-muted d-block">Program Beasiswa:</span>
                        <strong>{programName}</strong>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted d-block">Nama Lengkap &amp; NIK:</span>
                        <strong>{fullName}</strong> ({nik})
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted d-block">Tempat, Tanggal Lahir:</span>
                        <span>{birthPlace}, {birthDate} ({gender === 'MALE' ? 'Laki-laki' : 'Perempuan'})</span>
                      </div>
                      <div className="col-md-6">
                        <span className="text-muted d-block">Kontak (HP &amp; Email):</span>
                        <span>{phoneNumber} | {email}</span>
                      </div>
                      <div className="col-12">
                        <span className="text-muted d-block">Alamat Domisili:</span>
                        <span>{address}, {villageName}, {districtName}, {regencyName}, {provinceName}</span>
                      </div>
                      <div className="col-12">
                        <span className="text-muted d-block">Pendidikan Terakhir:</span>
                        <span>{educationLevel} — {institutionName} {major ? `(${major})` : ''} — Lulus {graduationYear}</span>
                      </div>
                    </div>

                    <hr className="my-3" />

                    <span className="text-muted d-block mb-2">Dokumen Terunggah ({Object.keys(uploadedDocs).length} berkas):</span>
                    <div className="row g-2">
                      {Object.entries(uploadedDocs).map(([code, doc]) => (
                        <div className="col-md-6" key={code}>
                          <div className="p-2 border rounded bg-white d-flex align-items-center justify-content-between">
                            <span className="text-truncate me-2">
                              <i className="bi bi-file-earmark-check text-success me-1"></i>
                              <strong>{code}:</strong> {doc.originalFilename}
                            </span>
                            <span className="badge bg-success-subtle text-success">Clean</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Consent Checkbox */}
                <div className="form-check p-3 bg-white border rounded shadow-sm">
                  <input
                    className="form-check-input ms-0 me-2"
                    type="checkbox"
                    id="checkSah"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    required
                  />
                  <label className="form-check-label small fw-semibold" htmlFor="checkSah" style={{ cursor: 'pointer' }}>
                    Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang saya unggah adalah
                    benar, sah, dan milik saya pribadi. Apabila di kemudian hari ditemukan data tidak benar atau palsu,
                    saya bersedia menerima sanksi pembatalan kepesertaan dan diproses sesuai ketentuan hukum yang berlaku.
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
              disabled={currentStep === 1 || isSaving || isSubmitting}
            >
              <i className="bi bi-arrow-left me-1"></i> Kembali
            </button>

            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={handleSaveDraftOnly}
                disabled={isSaving || isSubmitting}
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
                  className="btn btn-primary fw-semibold px-4"
                  onClick={handleNext}
                  disabled={isSaving || isSubmitting}
                >
                  Selanjutnya <i className="bi bi-arrow-right ms-1"></i>
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-success fw-semibold px-4"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={!agreed || isSaving || isSubmitting}
                >
                  <i className="bi bi-send-fill me-1"></i> Kirim Pendaftaran (Submit)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Modal Konfirmasi Submit Final (AT-08) ─────────────── */}
      {showSubmitModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-send-check me-2"></i>Konfirmasi Pengiriman Pendaftaran
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                ></button>
              </div>
              <div className="modal-body p-4">
                <p className="mb-3">
                  Apakah Anda yakin seluruh data diri, riwayat pendidikan, dan berkas persyaratan yang Anda unggah telah <strong>benar, lengkap, dan sah</strong>?
                </p>
                <div className="alert alert-warning py-2 px-3 small mb-0">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <strong>Perhatian:</strong> Setelah dikirimkan, permohonan Anda akan dikunci (status <strong>SUBMITTED</strong>) dan langsung diteruskan ke tim verifikator seleksi administrasi.
                </div>
              </div>
              <div className="modal-footer bg-light border-top p-3">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  className="btn btn-success fw-semibold"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Mengirimkan...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check2-circle me-1"></i> Ya, Kirim Sekarang
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
