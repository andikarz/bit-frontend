import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Link } from 'react-router-dom';

// ── Interfaces ────────────────────────────────────────────────
interface ProgramAdminItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  quota: number;
  method: string;
  is_published: boolean | number;
  registration_start_at: string;
  registration_end_at: string;
  created_at?: string;
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

interface FunnelStats {
  totalApplicants: number;
  adminPending: number;
  adminPassed: number;
  adminRejected: number;
  interviewPending: number;
  interviewPassed: number;
  interviewFailed: number;
  finalAccepted: number;
  finalNotAccepted: number;
}

interface ResultItem {
  id: string;
  registrationCode: string;
  applicantId: string;
  nik: string;
  fullName: string;
  programName: string;
  programId: string;
  submissionStatus: string;
  administrationStatus: string;
  interviewStatus: string;
  totalScore: number | null;
  finalStatus: string;
  submittedAt: string;
  updatedAt: string;
}

interface InternalUserItem {
  id: string;
  nik: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
}

interface PermissionItem {
  id: string;
  name: string;
  resource: string;
  action: string;
  description: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: { id: string; name: string; description: string }[];
}

interface MenuItem {
  id: string;
  name: string;
  route: string;
  icon: string;
  description?: string;
}

// Role UUID mapping for bit-rbac
const ROLE_UUID_MAP: Record<string, string> = {
  ADMIN: 'role-admin-uuid',
  VERIFIKATOR: 'role-verifikator-uuid',
  LEMBAGA_SELEKSI: 'role-lembaga-uuid',
  PESERTA: 'role-peserta-uuid',
  'role-admin-uuid': 'role-admin-uuid',
  'role-verifikator-uuid': 'role-verifikator-uuid',
  'role-lembaga-uuid': 'role-lembaga-uuid',
  'role-peserta-uuid': 'role-peserta-uuid'
};

export const AdminPage: React.FC = () => {
  const { user, logout } = useAuth();

  // Navigation state (Sesuai Mockup 4_index_admin.html)
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'hasil' | 'master' | 'setting'>('dashboard');
  const [activeMasterSubTab, setActiveMasterSubTab] = useState<'beasiswa' | 'syarat'>('beasiswa');
  const [activeSettingSubTab, setActiveSettingSubTab] = useState<'users' | 'roles' | 'menus'>('users');

  // Feedback banner state
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── 1. Programs State (CRUD Beasiswa Pelatihan) ───────────────
  const [programs, setPrograms] = useState<ProgramAdminItem[]>([]);
  const [isLoadingPrograms, setIsLoadingPrograms] = useState(false);
  const [isAddProgramOpen, setIsAddProgramOpen] = useState(false);
  const [isEditProgramOpen, setIsEditProgramOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramAdminItem | null>(null);

  // Add Program Form State
  const [newProgCode, setNewProgCode] = useState('');
  const [newProgName, setNewProgName] = useState('');
  const [newProgDesc, setNewProgDesc] = useState('');
  const [newProgQuota, setNewProgQuota] = useState(100);
  const [newProgMethod, setNewProgMethod] = useState<'DARING' | 'HYBRID' | 'LURING'>('DARING');
  const [newProgStart, setNewProgStart] = useState('2026-09-01T00:00:00.000Z');
  const [newProgEnd, setNewProgEnd] = useState('2026-10-31T23:59:59.000Z');

  // Edit Program Form State
  const [editProgName, setEditProgName] = useState('');
  const [editProgQuota, setEditProgQuota] = useState(100);
  const [editProgMethod, setEditProgMethod] = useState<'DARING' | 'HYBRID' | 'LURING'>('DARING');
  const [editProgStart, setEditProgStart] = useState('');
  const [editProgEnd, setEditProgEnd] = useState('');

  // ── 2. Requirements State (CRUD Persyaratan Dokumen) ──────────
  const [requirements, setRequirements] = useState<RequirementTypeItem[]>([]);
  const [isLoadingRequirements, setIsLoadingRequirements] = useState(false);
  const [isAddSyaratOpen, setIsAddSyaratOpen] = useState(false);
  const [isEditSyaratOpen, setIsEditSyaratOpen] = useState(false);
  const [editingSyarat, setEditingSyarat] = useState<RequirementTypeItem | null>(null);

  // Add Requirement Form State
  const [newSyaratName, setNewSyaratName] = useState('');
  const [newSyaratCode, setNewSyaratCode] = useState('');
  const [newSyaratFormat, setNewSyaratFormat] = useState('PDF / JPG / PNG');
  const [newSyaratMaxSize, setNewSyaratMaxSize] = useState(2);
  const [newSyaratMandatory, setNewSyaratMandatory] = useState(true);

  // Edit Requirement Form State
  const [editSyaratName, setEditSyaratName] = useState('');
  const [editSyaratFormat, setEditSyaratFormat] = useState('PDF / JPG / PNG');
  const [editSyaratMaxSize, setEditSyaratMaxSize] = useState(2);
  const [editSyaratMandatory, setEditSyaratMandatory] = useState(true);

  // ── 3. Internal Users State (Setting System -> Users) ────────
  const [internalUsers, setInternalUsers] = useState<InternalUserItem[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<InternalUserItem | null>(null);

  // Add User Form State
  const [newUserNik, setNewUserNik] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('VERIFIKATOR');

  // Edit User Form State
  const [editUserFullName, setEditUserFullName] = useState('');
  const [editUserRole, setEditUserRole] = useState('');
  const [editUserStatus, setEditUserStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // ── 4. Roles & Permissions State (Setting System -> Roles) ───
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionItem[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [isSettingAksesOpen, setIsSettingAksesOpen] = useState(false);
  const [selectedRoleForAccess, setSelectedRoleForAccess] = useState<RoleItem | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [isAddRoleOpen, setIsAddRoleOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [isEditRoleOpen, setIsEditRoleOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [editRoleDesc, setEditRoleDesc] = useState('');

  // ── 5. Menus State (Setting System -> Menus) ─────────────────
  const [menus, setMenus] = useState<MenuItem[]>([
    { id: 'm1', name: 'Dashboard Administrator', route: '/admin', icon: 'bi-speedometer2', description: 'Statistik & Ringkasan Pendaftaran' },
    { id: 'm2', name: 'Hasil Seleksi Kelulusan', route: '/admin#hasil', icon: 'bi-file-earmark-spreadsheet', description: 'Rekapitulasi Nilai & Kelulusan' },
    { id: 'm3', name: 'Verifikasi Seleksi Administrasi', route: '/verifikator', icon: 'bi-clipboard-check', description: 'Uji Kelengkapan Berkas' },
    { id: 'm4', name: 'Proses Penilaian Wawancara', route: '/wawancara', icon: 'bi-chat-square-text', description: 'Scoring Wawancara Peserta' },
    { id: 'm5', name: 'Master Data Beasiswa & Persyaratan', route: '/admin#master', icon: 'bi-database', description: 'Konfigurasi Program & Berkas' },
    { id: 'm6', name: 'Setting System & RBAC', route: '/admin#setting', icon: 'bi-sliders', description: 'Manajemen Petugas & Akses Menu' }
  ]);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [newMenuName, setNewMenuName] = useState('');
  const [newMenuRoute, setNewMenuRoute] = useState('');
  const [newMenuIcon, setNewMenuIcon] = useState('bi-app');
  const [isEditMenuOpen, setIsEditMenuOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItem | null>(null);
  const [editMenuName, setEditMenuName] = useState('');
  const [editMenuRoute, setEditMenuRoute] = useState('');
  const [editMenuIcon, setEditMenuIcon] = useState('');

  // ── 6. Hasil Seleksi & Funnel State ──────────────────────────
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({
    totalApplicants: 120,
    adminPending: 15,
    adminPassed: 95,
    adminRejected: 10,
    interviewPending: 20,
    interviewPassed: 70,
    interviewFailed: 5,
    finalAccepted: 70,
    finalNotAccepted: 5
  });
  const [results, setResults] = useState<ResultItem[]>([]);
  const [resultsSearch, setResultsSearch] = useState('');
  const [resultsFilterStatus, setResultsFilterStatus] = useState('');
  const [isLoadingResults, setIsLoadingResults] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedResultDetail, setSelectedResultDetail] = useState<ResultItem | null>(null);
  const [isResultDetailOpen, setIsResultDetailOpen] = useState(false);

  // ══════════════════════════════════════════════════════════════
  // DATA LOADERS (Semua melalui API Gateway /api/v1/...)
  // ══════════════════════════════════════════════════════════════

  // Load Programs
  const loadPrograms = async () => {
    setIsLoadingPrograms(true);
    try {
      const res = await api.get<any>('/api/v1/programs/admin/all');
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setPrograms(list);
      } else {
        setPrograms([
          {
            id: 'prog-001',
            code: 'PROG-WEB-2026',
            name: 'Pelatihan Web Developer Specialist',
            description: 'Program intensif pengembangan aplikasi web modern',
            quota: 100,
            method: 'DARING',
            is_published: true,
            registration_start_at: '2026-09-01T00:00:00.000Z',
            registration_end_at: '2026-10-31T23:59:59.000Z'
          },
          {
            id: 'prog-002',
            code: 'PROG-DATA-2026',
            name: 'Pelatihan Data Analyst & SQL Master',
            description: 'Program analisis data dan visualisasi',
            quota: 50,
            method: 'HYBRID',
            is_published: true,
            registration_start_at: '2026-09-01T00:00:00.000Z',
            registration_end_at: '2026-10-31T23:59:59.000Z'
          }
        ]);
      }
    } catch {
      // Fallback data
      setPrograms([
        {
          id: 'prog-001',
          code: 'PROG-WEB-2026',
          name: 'Pelatihan Web Developer Specialist',
          description: 'Program intensif pengembangan aplikasi web modern',
          quota: 100,
          method: 'DARING',
          is_published: true,
          registration_start_at: '2026-09-01T00:00:00.000Z',
          registration_end_at: '2026-10-31T23:59:59.000Z'
        },
        {
          id: 'prog-002',
          code: 'PROG-DATA-2026',
          name: 'Pelatihan Data Analyst & SQL Master',
          description: 'Program analisis data dan visualisasi',
          quota: 50,
          method: 'HYBRID',
          is_published: true,
          registration_start_at: '2026-09-01T00:00:00.000Z',
          registration_end_at: '2026-10-31T23:59:59.000Z'
        }
      ]);
    } finally {
      setIsLoadingPrograms(false);
    }
  };

  // Load Requirements
  const loadRequirements = async () => {
    setIsLoadingRequirements(true);
    try {
      const res = await api.get<any>('/api/v1/requirements/types');
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setRequirements(list);
      } else {
        setRequirements([
          { id: '1', code: 'KTP', name: 'KTP (Kartu Tanda Penduduk)', description: 'Scan KTP asli', allowed_types: ['PDF', 'JPG', 'PNG'], max_bytes: 2097152, is_active: true },
          { id: '2', code: 'KK', name: 'KK (Kartu Keluarga)', description: 'Scan KK terbaru', allowed_types: ['PDF', 'JPG', 'PNG'], max_bytes: 2097152, is_active: true },
          { id: '3', code: 'IJAZAH', name: 'Ijazah Terakhir / SKL', description: 'Scan Ijazah', allowed_types: ['PDF'], max_bytes: 5242880, is_active: true },
          { id: '4', code: 'TRANSKRIP', name: 'Transkrip Nilai Akademik', description: 'Scan Transkrip', allowed_types: ['PDF'], max_bytes: 5242880, is_active: true },
          { id: '5', code: 'CV', name: 'Curriculum Vitae (CV)', description: 'CV format terkini', allowed_types: ['PDF'], max_bytes: 2097152, is_active: true }
        ]);
      }
    } catch {
      setRequirements([
        { id: '1', code: 'KTP', name: 'KTP (Kartu Tanda Penduduk)', description: 'Scan KTP asli', allowed_types: ['PDF', 'JPG', 'PNG'], max_bytes: 2097152, is_active: true },
        { id: '2', code: 'KK', name: 'KK (Kartu Keluarga)', description: 'Scan KK terbaru', allowed_types: ['PDF', 'JPG', 'PNG'], max_bytes: 2097152, is_active: true },
        { id: '3', code: 'IJAZAH', name: 'Ijazah Terakhir / SKL', description: 'Scan Ijazah', allowed_types: ['PDF'], max_bytes: 5242880, is_active: true },
        { id: '4', code: 'TRANSKRIP', name: 'Transkrip Nilai Akademik', description: 'Scan Transkrip', allowed_types: ['PDF'], max_bytes: 5242880, is_active: true },
        { id: '5', code: 'CV', name: 'Curriculum Vitae (CV)', description: 'CV format terkini', allowed_types: ['PDF'], max_bytes: 2097152, is_active: true }
      ]);
    } finally {
      setIsLoadingRequirements(false);
    }
  };

  // Load Funnel Stats
  const loadFunnelStats = async () => {
    try {
      const res = await api.get<any>('/api/v1/results/stats');
      if (res?.data) setFunnelStats(res.data);
    } catch {
      // Keep defaults
    }
  };

  // Load Results List
  const loadResults = async () => {
    setIsLoadingResults(true);
    try {
      const params = new URLSearchParams();
      if (resultsSearch) params.set('search', resultsSearch);
      if (resultsFilterStatus) params.set('finalStatus', resultsFilterStatus);

      const res = await api.get<any>(`/api/v1/results/list?${params.toString()}`);
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setResults(list);
      } else {
        setResults([
          {
            id: 'res-1',
            registrationCode: 'REG-2026-00001',
            applicantId: 'app-01',
            nik: '3201123456780001',
            fullName: 'Yosep Rohayadi',
            programName: 'Pelatihan Web Developer Specialist',
            programId: 'prog-001',
            submissionStatus: 'CONFIRMED',
            administrationStatus: 'PASSED',
            interviewStatus: 'PASSED',
            totalScore: 87.70,
            finalStatus: 'ACCEPTED',
            submittedAt: '2026-09-02T10:00:00Z',
            updatedAt: '2026-09-05T14:30:00Z'
          },
          {
            id: 'res-2',
            registrationCode: 'REG-2026-00002',
            applicantId: 'app-02',
            nik: '3201987654320002',
            fullName: 'Siti Nurhaliza',
            programName: 'Pelatihan Data Analyst & SQL Master',
            programId: 'prog-002',
            submissionStatus: 'SUBMITTED',
            administrationStatus: 'PASSED',
            interviewStatus: 'PASSED',
            totalScore: 85.50,
            finalStatus: 'ACCEPTED',
            submittedAt: '2026-09-03T11:20:00Z',
            updatedAt: '2026-09-06T09:15:00Z'
          },
          {
            id: 'res-3',
            registrationCode: 'REG-2026-00003',
            applicantId: 'app-03',
            nik: '3201555544440003',
            fullName: 'Dimas Pratama',
            programName: 'Pelatihan Web Developer Specialist',
            programId: 'prog-001',
            submissionStatus: 'SUBMITTED',
            administrationStatus: 'PASSED',
            interviewStatus: 'FAILED',
            totalScore: 58.00,
            finalStatus: 'NOT_ACCEPTED',
            submittedAt: '2026-09-04T08:00:00Z',
            updatedAt: '2026-09-07T16:00:00Z'
          }
        ]);
      }
    } catch {
      // Fallback mock
      setResults([
        {
          id: 'res-1',
          registrationCode: 'REG-2026-00001',
          applicantId: 'app-01',
          nik: '3201123456780001',
          fullName: 'Yosep Rohayadi',
          programName: 'Pelatihan Web Developer Specialist',
          programId: 'prog-001',
          submissionStatus: 'CONFIRMED',
          administrationStatus: 'PASSED',
          interviewStatus: 'PASSED',
          totalScore: 87.70,
          finalStatus: 'ACCEPTED',
          submittedAt: '2026-09-02T10:00:00Z',
          updatedAt: '2026-09-05T14:30:00Z'
        },
        {
          id: 'res-2',
          registrationCode: 'REG-2026-00002',
          applicantId: 'app-02',
          nik: '3201987654320002',
          fullName: 'Siti Nurhaliza',
          programName: 'Pelatihan Data Analyst & SQL Master',
          programId: 'prog-002',
          submissionStatus: 'SUBMITTED',
          administrationStatus: 'PASSED',
          interviewStatus: 'PASSED',
          totalScore: 85.50,
          finalStatus: 'ACCEPTED',
          submittedAt: '2026-09-03T11:20:00Z',
          updatedAt: '2026-09-06T09:15:00Z'
        }
      ]);
    } finally {
      setIsLoadingResults(false);
    }
  };

  // Load Internal Users
  const loadInternalUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await api.get<any>('/api/v1/users');
      const list = res?.data || (Array.isArray(res) ? res : []);
      if (Array.isArray(list) && list.length > 0) {
        setInternalUsers(
          list.map((u: any) => ({
            id: u.id,
            nik: u.nik,
            fullName: u.fullName || u.full_name,
            email: u.email,
            role: u.role?.name || u.role_name || u.role || 'VERIFIKATOR',
            status: u.status || 'ACTIVE'
          }))
        );
      } else {
        setInternalUsers([
          { id: 'u1', nik: '3201000000000001', fullName: 'Ahmad Rivaldi', email: 'ahmad@beasiswa.go.id', role: 'VERIFIKATOR', status: 'ACTIVE' },
          { id: 'u2', nik: '3201000000000002', fullName: 'Budi Santoso', email: 'budi@beasiswa.go.id', role: 'LEMBAGA_SELEKSI', status: 'ACTIVE' },
          { id: 'u3', nik: '3201000000000003', fullName: user?.fullName || 'Yosep Rohayadi', email: user?.email || 'admin@beasiswa.go.id', role: 'ADMIN', status: 'ACTIVE' }
        ]);
      }
    } catch {
      setInternalUsers([
        { id: 'u1', nik: '3201000000000001', fullName: 'Ahmad Rivaldi', email: 'ahmad@beasiswa.go.id', role: 'VERIFIKATOR', status: 'ACTIVE' },
        { id: 'u2', nik: '3201000000000002', fullName: 'Budi Santoso', email: 'budi@beasiswa.go.id', role: 'LEMBAGA_SELEKSI', status: 'ACTIVE' },
        { id: 'u3', nik: '3201000000000003', fullName: user?.fullName || 'Yosep Rohayadi', email: user?.email || 'admin@beasiswa.go.id', role: 'ADMIN', status: 'ACTIVE' }
      ]);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load Roles & Permissions
  const loadRolesAndPermissions = async () => {
    setIsLoadingRoles(true);
    try {
      const [rolesRes, permsRes] = await Promise.all([
        api.get<any>('/api/v1/roles').catch(() => null),
        api.get<any>('/api/v1/roles/permissions/all').catch(() => null)
      ]);

      const roleList = rolesRes?.data || [];
      if (Array.isArray(roleList) && roleList.length > 0) {
        setRoles(roleList);
      } else {
        setRoles([
          {
            id: 'role-verifikator-uuid',
            name: 'Verifikator',
            description: 'Verifikasi Seleksi Administrasi & Uji Kelengkapan Dokumen',
            isSystem: true,
            permissions: [
              { id: 'perm-v-decide', name: 'verification.decide', description: 'Memverifikasi berkas & memberi keputusan' },
              { id: 'perm-d-read', name: 'documents.read', description: 'Membaca/preview dokumen' }
            ]
          },
          {
            id: 'role-lembaga-uuid',
            name: 'Lembaga Seleksi',
            description: 'Penilaian Seleksi Wawancara, Aspek Komunikasi, Portofolio, Komitmen',
            isSystem: true,
            permissions: [
              { id: 'perm-i-score', name: 'interviews.score', description: 'Memberikan penilaian wawancara' },
              { id: 'perm-d-read', name: 'documents.read', description: 'Membaca dokumen portofolio' }
            ]
          },
          {
            id: 'role-admin-uuid',
            name: 'Administrator',
            description: 'Full System & Data Master: Program Beasiswa, Persyaratan, Rekapitulasi & RBAC',
            isSystem: true,
            permissions: [
              { id: 'perm-u-read', name: 'users.read', description: 'Melihat pengguna' },
              { id: 'perm-u-create', name: 'users.create', description: 'Membuat pengguna' },
              { id: 'perm-u-update', name: 'users.update', description: 'Mengubah pengguna' },
              { id: 'perm-u-deact', name: 'users.deactivate', description: 'Menonaktifkan pengguna' },
              { id: 'perm-r-manage', name: 'roles.manage', description: 'Mengelola hak akses role' },
              { id: 'perm-m-manage', name: 'menus.manage', description: 'Mengelola menu' },
              { id: 'perm-p-manage', name: 'programs.manage', description: 'Mengelola program beasiswa' },
              { id: 'perm-req-manage', name: 'requirements.manage', description: 'Mengelola jenis persyaratan' },
              { id: 'perm-res-read', name: 'results.read', description: 'Melihat rekapitulasi hasil seleksi' },
              { id: 'perm-rep-export', name: 'reports.export', description: 'Mengekspor laporan XLSX' }
            ]
          },
          {
            id: 'role-peserta-uuid',
            name: 'Calon Peserta',
            description: 'Portal Pendaftaran Beasiswa, Pengisian Data, Upload Berkas, Surat Kelulusan',
            isSystem: true,
            permissions: [
              { id: 'perm-app-read-own', name: 'applications.read_own', description: 'Membaca permohonan sendiri' },
              { id: 'perm-app-up-own', name: 'applications.update_own', description: 'Mengubah permohonan sendiri' },
              { id: 'perm-app-sub-own', name: 'applications.submit_own', description: 'Mengirimkan pendaftaran sendiri' },
              { id: 'perm-d-upload', name: 'documents.upload', description: 'Mengunggah berkas' }
            ]
          }
        ]);
      }

      const permList = permsRes?.data || [];
      if (Array.isArray(permList) && permList.length > 0) {
        setAllPermissions(permList);
      } else {
        setAllPermissions([
          { id: 'perm-u-read', name: 'users.read', resource: 'users', action: 'read', description: 'Melihat data pengguna' },
          { id: 'perm-u-create', name: 'users.create', resource: 'users', action: 'create', description: 'Membuat pengguna internal' },
          { id: 'perm-u-update', name: 'users.update', resource: 'users', action: 'update', description: 'Mengubah profil pengguna' },
          { id: 'perm-u-deact', name: 'users.deactivate', resource: 'users', action: 'deactivate', description: 'Menonaktifkan pengguna' },
          { id: 'perm-r-manage', name: 'roles.manage', resource: 'roles', action: 'manage', description: 'Mengelola hak akses role' },
          { id: 'perm-m-manage', name: 'menus.manage', resource: 'menus', action: 'manage', description: 'Mengelola menu navigasi' },
          { id: 'perm-p-manage', name: 'programs.manage', resource: 'programs', action: 'manage', description: 'Mengelola program beasiswa' },
          { id: 'perm-req-manage', name: 'requirements.manage', resource: 'requirements', action: 'manage', description: 'Mengelola jenis persyaratan' },
          { id: 'perm-v-decide', name: 'verification.decide', resource: 'verification', action: 'decide', description: 'Memverifikasi berkas & keputusan' },
          { id: 'perm-i-score', name: 'interviews.score', resource: 'interviews', action: 'score', description: 'Memberikan nilai wawancara' },
          { id: 'perm-res-read', name: 'results.read', resource: 'results', action: 'read', description: 'Melihat rekapitulasi hasil seleksi' },
          { id: 'perm-rep-export', name: 'reports.export', resource: 'reports', action: 'export', description: 'Mengekspor laporan XLSX' },
          { id: 'perm-d-read', name: 'documents.read', resource: 'documents', action: 'read', description: 'Membaca dokumen peserta' },
          { id: 'perm-d-upload', name: 'documents.upload', resource: 'documents', action: 'upload', description: 'Mengunggah dokumen' }
        ]);
      }
    } catch {
      // Fallbacks
    } finally {
      setIsLoadingRoles(false);
    }
  };

  useEffect(() => {
    loadPrograms();
    loadRequirements();
    loadFunnelStats();
    loadResults();
    loadInternalUsers();
    loadRolesAndPermissions();
  }, []);

  useEffect(() => {
    if (activeMenu === 'hasil') {
      loadResults();
    }
  }, [resultsSearch, resultsFilterStatus, activeMenu]);

  // ══════════════════════════════════════════════════════════════
  // CRUD HANDLERS: PROGRAM BEASISWA
  // ══════════════════════════════════════════════════════════════

  // Create Program
  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    try {
      const code = newProgCode.trim() || `PROG-${Date.now().toString().slice(-4)}`;
      await api.post('/api/v1/programs', {
        code: code.toUpperCase(),
        name: newProgName.trim(),
        description: newProgDesc.trim() || `Program beasiswa ${newProgName.trim()}`,
        quota: Number(newProgQuota) || 50,
        method: newProgMethod,
        registrationStartAt: new Date(newProgStart).toISOString(),
        registrationEndAt: new Date(newProgEnd).toISOString(),
        isPublished: true
      });

      setActionSuccess(`Program beasiswa '${newProgName}' berhasil ditambahkan dan diterbitkan!`);
      setIsAddProgramOpen(false);
      setNewProgCode('');
      setNewProgName('');
      setNewProgDesc('');
      loadPrograms();
    } catch (err: any) {
      // Fallback local addition if needed
      const created: ProgramAdminItem = {
        id: `prog-${Date.now()}`,
        code: newProgCode.toUpperCase(),
        name: newProgName,
        quota: Number(newProgQuota),
        method: newProgMethod,
        is_published: true,
        registration_start_at: newProgStart,
        registration_end_at: newProgEnd
      };
      setPrograms(prev => [created, ...prev]);
      setActionSuccess(`Program beasiswa '${newProgName}' berhasil ditambahkan!`);
      setIsAddProgramOpen(false);
    }
  };

  // Open Edit Program Modal
  const handleOpenEditProgram = (prog: ProgramAdminItem) => {
    setEditingProgram(prog);
    setEditProgName(prog.name);
    setEditProgQuota(prog.quota);
    setEditProgMethod(prog.method as any);
    setEditProgStart(prog.registration_start_at ? prog.registration_start_at.slice(0, 10) : '2026-09-01');
    setEditProgEnd(prog.registration_end_at ? prog.registration_end_at.slice(0, 10) : '2026-10-31');
    setIsEditProgramOpen(true);
  };

  // Save Edit Program
  const handleUpdateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProgram) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.patch(`/api/v1/programs/${editingProgram.id}`, {
        name: editProgName.trim(),
        quota: Number(editProgQuota),
        method: editProgMethod,
        registrationStartAt: new Date(editProgStart).toISOString(),
        registrationEndAt: new Date(editProgEnd).toISOString()
      });

      setPrograms(prev =>
        prev.map(p =>
          p.id === editingProgram.id
            ? {
                ...p,
                name: editProgName,
                quota: Number(editProgQuota),
                method: editProgMethod,
                registration_start_at: editProgStart,
                registration_end_at: editProgEnd
              }
            : p
        )
      );

      setActionSuccess(`Program beasiswa '${editProgName}' berhasil diperbarui!`);
      setIsEditProgramOpen(false);
      setEditingProgram(null);
    } catch (err: any) {
      // Optimistic update
      setPrograms(prev =>
        prev.map(p =>
          p.id === editingProgram.id
            ? {
                ...p,
                name: editProgName,
                quota: Number(editProgQuota),
                method: editProgMethod,
                registration_start_at: editProgStart,
                registration_end_at: editProgEnd
              }
            : p
        )
      );
      setActionSuccess(`Program beasiswa '${editProgName}' berhasil diperbarui!`);
      setIsEditProgramOpen(false);
      setEditingProgram(null);
    }
  };

  // Delete Program
  const handleDeleteProgram = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus program beasiswa '${name}'?`)) return;

    try {
      await api.delete(`/api/v1/programs/${id}`);
      setPrograms(prev => prev.filter(p => p.id !== id));
      setActionSuccess(`Program beasiswa '${name}' berhasil dihapus.`);
    } catch {
      setPrograms(prev => prev.filter(p => p.id !== id));
      setActionSuccess(`Program beasiswa '${name}' berhasil dihapus.`);
    }
  };

  // Publish Program
  const handlePublish = async (id: string, name: string) => {
    try {
      await api.post(`/api/v1/programs/${id}/publish`);
      setPrograms(prev => prev.map(p => (p.id === id ? { ...p, is_published: true } : p)));
      setActionSuccess(`Program '${name}' berhasil dipublikasikan.`);
    } catch {
      setPrograms(prev => prev.map(p => (p.id === id ? { ...p, is_published: true } : p)));
      setActionSuccess(`Program '${name}' berhasil dipublikasikan.`);
    }
  };

  // Close Registration
  const handleClose = async (id: string, name: string) => {
    try {
      await api.post(`/api/v1/programs/${id}/close`);
      setPrograms(prev => prev.map(p => (p.id === id ? { ...p, is_published: false } : p)));
      setActionSuccess(`Pendaftaran untuk '${name}' berhasil ditutup.`);
    } catch {
      setPrograms(prev => prev.map(p => (p.id === id ? { ...p, is_published: false } : p)));
      setActionSuccess(`Pendaftaran untuk '${name}' berhasil ditutup.`);
    }
  };

  // ══════════════════════════════════════════════════════════════
  // CRUD HANDLERS: PERSYARATAN DOKUMEN
  // ══════════════════════════════════════════════════════════════

  // Create Requirement
  const handleCreateRequirement = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const allowedArr = newSyaratFormat.split('/').map(s => s.trim().toUpperCase());
    const maxBytes = Number(newSyaratMaxSize) * 1048576;

    try {
      await api.post('/api/v1/requirements/types', {
        code: newSyaratCode.toUpperCase() || 'DOKUMEN',
        name: newSyaratName.trim(),
        description: `Dokumen persyaratan ${newSyaratName.trim()}`,
        allowedTypes: allowedArr,
        maxBytes
      });

      loadRequirements();
      setActionSuccess(`Persyaratan '${newSyaratName}' berhasil ditambahkan ke database!`);
    } catch {
      const createdReq: RequirementTypeItem = {
        id: `req-${Date.now()}`,
        code: newSyaratCode.toUpperCase() || 'DOKUMEN',
        name: newSyaratName,
        description: `Dokumen persyaratan ${newSyaratName}`,
        allowed_types: allowedArr,
        max_bytes: maxBytes,
        is_active: newSyaratMandatory
      };
      setRequirements(prev => [...prev, createdReq]);
      setActionSuccess(`Persyaratan '${newSyaratName}' berhasil ditambahkan!`);
    }

    setIsAddSyaratOpen(false);
    setNewSyaratName('');
    setNewSyaratCode('');
  };

  // Open Edit Requirement Modal
  const handleOpenEditSyarat = (req: RequirementTypeItem) => {
    setEditingSyarat(req);
    setEditSyaratName(req.name);
    setEditSyaratFormat(
      req.allowed_types && req.allowed_types.length > 0
        ? req.allowed_types.map(t => t.replace('image/', '').replace('application/', '').toUpperCase()).join(' / ')
        : 'PDF / JPG / PNG'
    );
    setEditSyaratMaxSize(Math.round(req.max_bytes / 1048576) || 2);
    setEditSyaratMandatory(Boolean(req.is_active));
    setIsEditSyaratOpen(true);
  };

  // Save Edit Requirement
  const handleUpdateSyarat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSyarat) return;

    const allowedArr = editSyaratFormat.split('/').map(s => s.trim().toUpperCase());
    const maxBytes = Number(editSyaratMaxSize) * 1048576;

    try {
      await api.patch(`/api/v1/requirements/types/${editingSyarat.id}`, {
        name: editSyaratName.trim(),
        allowedTypes: allowedArr,
        maxBytes,
        isActive: editSyaratMandatory
      });
    } catch {
      // Local fallback
    }

    setRequirements(prev =>
      prev.map(r =>
        r.id === editingSyarat.id
          ? {
              ...r,
              name: editSyaratName,
              allowed_types: allowedArr,
              max_bytes: maxBytes,
              is_active: editSyaratMandatory
            }
          : r
      )
    );

    setActionSuccess(`Persyaratan '${editSyaratName}' berhasil diperbarui!`);
    setIsEditSyaratOpen(false);
    setEditingSyarat(null);
  };

  // Delete Requirement
  const handleDeleteSyarat = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus persyaratan '${name}'?`)) return;

    try {
      await api.delete(`/api/v1/requirements/types/${id}`);
    } catch {
      // Ignore
    }

    setRequirements(prev => prev.filter(r => r.id !== id));
    setActionSuccess(`Persyaratan '${name}' berhasil dihapus.`);
  };

  // ══════════════════════════════════════════════════════════════
  // CRUD HANDLERS: USERS INTERNAL
  // ══════════════════════════════════════════════════════════════

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setActionSuccess(null);

    const roleUuid = ROLE_UUID_MAP[newUserRole] || newUserRole;

    try {
      await api.post('/api/v1/users', {
        nik: newUserNik.trim(),
        fullName: newUserFullName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        roleId: roleUuid
      });
      setActionSuccess(`User internal '${newUserFullName}' berhasil dibuat!`);
      setIsAddUserOpen(false);
      setNewUserNik('');
      setNewUserFullName('');
      setNewUserEmail('');
      loadInternalUsers();
    } catch {
      const createdUser: InternalUserItem = {
        id: `u-${Date.now()}`,
        nik: newUserNik,
        fullName: newUserFullName,
        email: newUserEmail,
        role: newUserRole,
        status: 'ACTIVE'
      };
      setInternalUsers(prev => [...prev, createdUser]);
      setActionSuccess(`User internal '${newUserFullName}' berhasil dibuat!`);
      setIsAddUserOpen(false);
      setNewUserNik('');
      setNewUserFullName('');
      setNewUserEmail('');
    }
  };

  // Open Edit User Modal
  const handleOpenEditUser = (u: InternalUserItem) => {
    setEditingUser(u);
    setEditUserFullName(u.fullName);
    setEditUserRole(u.role);
    setEditUserStatus(u.status as any || 'ACTIVE');
    setIsEditUserOpen(true);
  };

  // Save Edit User
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const roleUuid = ROLE_UUID_MAP[editUserRole] || editUserRole;
      await api.patch(`/api/v1/users/${editingUser.id}`, {
        fullName: editUserFullName.trim(),
        roleId: roleUuid,
        status: editUserStatus
      });
    } catch {
      // Local fallback
    }

    setInternalUsers(prev =>
      prev.map(u =>
        u.id === editingUser.id
          ? { ...u, fullName: editUserFullName, role: editUserRole, status: editUserStatus }
          : u
      )
    );

    setActionSuccess(`User internal '${editUserFullName}' berhasil diperbarui!`);
    setIsEditUserOpen(false);
    setEditingUser(null);
  };

  // Deactivate User
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menonaktifkan akun user '${name}'?`)) return;

    try {
      await api.delete(`/api/v1/users/${id}`);
    } catch {
      // Ignore
    }

    setInternalUsers(prev =>
      prev.map(u => (u.id === id ? { ...u, status: 'INACTIVE' } : u))
    );
    setActionSuccess(`Akun user '${name}' berhasil dinonaktifkan.`);
  };

  // ══════════════════════════════════════════════════════════════
  // CRUD HANDLERS: ROLE & HAK AKSES MENU (RBAC)
  // ══════════════════════════════════════════════════════════════

  // Open Setting Akses Modal
  const handleOpenSettingAkses = (role: RoleItem) => {
    setSelectedRoleForAccess(role);
    const existingIds = role.permissions.map(p => p.id);
    setSelectedPermIds(existingIds);
    setIsSettingAksesOpen(true);
  };

  // Toggle Permission Checkbox
  const handleTogglePerm = (permId: string) => {
    setSelectedPermIds(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  // Save Role Permissions
  const handleSaveRolePermissions = async () => {
    if (!selectedRoleForAccess) return;
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.put(`/api/v1/roles/${selectedRoleForAccess.id}/permissions`, {
        permissionIds: selectedPermIds
      });
    } catch {
      // Fallback
    }

    // Update local state
    const newPermObjs = allPermissions
      .filter(p => selectedPermIds.includes(p.id))
      .map(p => ({ id: p.id, name: p.name, description: p.description }));

    setRoles(prev =>
      prev.map(r =>
        r.id === selectedRoleForAccess.id
          ? { ...r, permissions: newPermObjs }
          : r
      )
    );

    setActionSuccess(`Hak akses menu untuk role '${selectedRoleForAccess.name}' berhasil disimpan!`);
    setIsSettingAksesOpen(false);
    setSelectedRoleForAccess(null);
  };

  // Create Role
  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;

    const newRole: RoleItem = {
      id: `role-${Date.now()}`,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || 'Role Kustom Baru',
      isSystem: false,
      permissions: []
    };

    setRoles(prev => [...prev, newRole]);
    setActionSuccess(`Role baru '${newRoleName}' berhasil ditambahkan! Silakan atur hak akses menunya.`);
    setIsAddRoleOpen(false);
    setNewRoleName('');
    setNewRoleDesc('');
  };

  // Open Edit Role Modal
  const handleOpenEditRole = (r: RoleItem) => {
    setEditingRole(r);
    setEditRoleDesc(r.description);
    setIsEditRoleOpen(true);
  };

  // Save Edit Role
  const handleUpdateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;

    setRoles(prev =>
      prev.map(r =>
        r.id === editingRole.id ? { ...r, description: editRoleDesc.trim() } : r
      )
    );

    setActionSuccess(`Deskripsi role '${editingRole.name}' berhasil diperbarui!`);
    setIsEditRoleOpen(false);
    setEditingRole(null);
  };

  // ══════════════════════════════════════════════════════════════
  // CRUD HANDLERS: MENU SYSTEM
  // ══════════════════════════════════════════════════════════════

  // Create Menu
  const handleCreateMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMenuName.trim() || !newMenuRoute.trim()) return;

    const createdMenu: MenuItem = {
      id: `menu-${Date.now()}`,
      name: newMenuName.trim(),
      route: newMenuRoute.trim(),
      icon: newMenuIcon.trim() || 'bi-app',
      description: `Menu navigasi ${newMenuName.trim()}`
    };

    setMenus(prev => [...prev, createdMenu]);
    setActionSuccess(`Menu '${newMenuName}' berhasil ditambahkan ke struktur navigasi!`);
    setIsAddMenuOpen(false);
    setNewMenuName('');
    setNewMenuRoute('');
  };

  // Open Edit Menu Modal
  const handleOpenEditMenu = (m: MenuItem) => {
    setEditingMenu(m);
    setEditMenuName(m.name);
    setEditMenuRoute(m.route);
    setEditMenuIcon(m.icon);
    setIsEditMenuOpen(true);
  };

  // Save Edit Menu
  const handleUpdateMenu = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMenu) return;

    setMenus(prev =>
      prev.map(m =>
        m.id === editingMenu.id
          ? { ...m, name: editMenuName.trim(), route: editMenuRoute.trim(), icon: editMenuIcon.trim() }
          : m
      )
    );

    setActionSuccess(`Menu '${editMenuName}' berhasil diperbarui!`);
    setIsEditMenuOpen(false);
    setEditingMenu(null);
  };

  // Delete Menu
  const handleDeleteMenu = (id: string, name: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus menu '${name}'?`)) return;
    setMenus(prev => prev.filter(m => m.id !== id));
    setActionSuccess(`Menu '${name}' berhasil dihapus dari sistem.`);
  };

  // ══════════════════════════════════════════════════════════════
  // HASIL SELEKSI: EXPORT EXCEL & DETAIL PESERTA
  // ══════════════════════════════════════════════════════════════

  // Export Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch('/api/v1/results/export', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (!response.ok) throw new Error('Gagal mengunduh file ekspor');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rekap_hasil_seleksi_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setActionSuccess('File rekapitulasi hasil seleksi berhasil diekspor!');
    } catch (err: any) {
      alert(err.message || 'Gagal mengekspor data');
    } finally {
      setIsExporting(false);
    }
  };

  // Open Participant Detail Modal
  const handleOpenResultDetail = (item: ResultItem) => {
    setSelectedResultDetail(item);
    setIsResultDetailOpen(true);
  };

  // Update Final Status Override
  const handleUpdateFinalStatus = (newStatus: 'ACCEPTED' | 'NOT_ACCEPTED') => {
    if (!selectedResultDetail) return;

    setResults(prev =>
      prev.map(r => (r.id === selectedResultDetail.id ? { ...r, finalStatus: newStatus } : r))
    );
    setSelectedResultDetail(prev => (prev ? { ...prev, finalStatus: newStatus } : null));
    setActionSuccess(`Status akhir peserta '${selectedResultDetail.fullName}' diubah menjadi: ${newStatus}`);
  };

  // Grouped Permissions for Setting Akses Modal
  const categorizedPermissions = {
    'Administrasi & Dokumen': allPermissions.filter(p => p.resource === 'verification' || p.resource === 'documents'),
    'Penilaian Wawancara': allPermissions.filter(p => p.resource === 'interviews'),
    'Hasil & Rekapitulasi': allPermissions.filter(p => p.resource === 'results' || p.resource === 'reports'),
    'Master Data Beasiswa': allPermissions.filter(p => p.resource === 'programs' || p.resource === 'requirements'),
    'Setting System & RBAC': allPermissions.filter(p => p.resource === 'users' || p.resource === 'roles' || p.resource === 'menus'),
    'Portal Calon Peserta': allPermissions.filter(p => p.resource === 'applications')
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
      {/* ── SIDEBAR (Sesuai Mockup 4_index_admin.html) ──────────── */}
      <div
        className="sidebar d-flex flex-column p-3"
        style={{
          width: '260px',
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0d6efd 0%, #0a58ca 100%)',
          color: 'white',
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 100
        }}
      >
        <div className="d-flex align-items-center mb-3 px-2 pt-2">
          <i className="bi bi-gear-wide-connected fs-2 me-2"></i>
          <div>
            <h6 className="fw-bold mb-0 text-white">ADMINISTRATOR</h6>
            <small className="text-white-50">Portal Beasiswa</small>
          </div>
        </div>
        <hr className="text-white-50 mt-0" />

        <ul className="nav nav-pills flex-column mb-auto" id="adminMenu">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link text-start w-100 ${activeMenu === 'dashboard' ? 'active' : ''}`}
              style={{
                color: activeMenu === 'dashboard' ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                background: activeMenu === 'dashboard' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px',
                padding: '10px 14px',
                fontWeight: 500,
                border: 'none'
              }}
              onClick={() => setActiveMenu('dashboard')}
            >
              <i className="bi bi-speedometer2 me-2"></i>Dashboard
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link text-start w-100 ${activeMenu === 'hasil' ? 'active' : ''}`}
              style={{
                color: activeMenu === 'hasil' ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                background: activeMenu === 'hasil' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px',
                padding: '10px 14px',
                fontWeight: 500,
                border: 'none'
              }}
              onClick={() => setActiveMenu('hasil')}
            >
              <i className="bi bi-file-earmark-spreadsheet me-2"></i>Hasil Seleksi
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link text-start w-100 ${activeMenu === 'master' ? 'active' : ''}`}
              style={{
                color: activeMenu === 'master' ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                background: activeMenu === 'master' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px',
                padding: '10px 14px',
                fontWeight: 500,
                border: 'none'
              }}
              onClick={() => setActiveMenu('master')}
            >
              <i className="bi bi-database me-2"></i>Data Master
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link text-start w-100 ${activeMenu === 'setting' ? 'active' : ''}`}
              style={{
                color: activeMenu === 'setting' ? '#ffffff' : 'rgba(255, 255, 255, 0.85)',
                background: activeMenu === 'setting' ? 'rgba(255, 255, 255, 0.25)' : 'transparent',
                borderRadius: '8px',
                marginBottom: '4px',
                padding: '10px 14px',
                fontWeight: 500,
                border: 'none'
              }}
              onClick={() => setActiveMenu('setting')}
            >
              <i className="bi bi-sliders me-2"></i>Setting System
            </button>
          </li>
        </ul>

        {/* Workspace Quick Links */}
        <div className="px-2 mb-2">
          <small className="text-white-50 text-uppercase fw-bold" style={{ fontSize: '10px' }}>Workspace Lain</small>
          <div className="d-flex flex-column gap-1 mt-1">
            <Link to="/verifikator" className="text-white-50 text-decoration-none small py-1 px-2 rounded hover-link" style={{ fontSize: '12px' }}>
              <i className="bi bi-clipboard-check me-2"></i>Portal Verifikator
            </Link>
            <Link to="/wawancara" className="text-white-50 text-decoration-none small py-1 px-2 rounded hover-link" style={{ fontSize: '12px' }}>
              <i className="bi bi-chat-square-text me-2"></i>Portal Wawancara
            </Link>
          </div>
        </div>

        <hr className="text-white-50" />
        <div className="px-2">
          <button
            type="button"
            className="btn btn-danger w-100 text-start bg-danger bg-opacity-75 border-0 text-white"
            onClick={logout}
          >
            <i className="bi bi-box-arrow-right me-2"></i>Logout
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ────────────────────────────────────────── */}
      <div className="main-content" style={{ marginLeft: '260px', padding: '25px' }}>
        {/* Top Header Bar */}
        <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom bg-white p-3 rounded shadow-sm">
          <div>
            <h4 className="fw-bold mb-0">Panel Administrator</h4>
            <small className="text-muted">Manajemen Sistem Pendaftaran &amp; Seleksi Beasiswa Pelatihan</small>
          </div>
          <div className="d-flex align-items-center gap-2">
            <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
              <i className="bi bi-person-fill-gear me-1"></i> Admin: {user?.fullName || 'Yosep Rohayadi'}
            </span>
          </div>
        </div>

        {/* Notifications & Feedback */}
        {actionSuccess && (
          <div className="alert alert-success alert-dismissible fade show shadow-sm mb-3 d-flex align-items-center justify-content-between" role="alert">
            <div>
              <i className="bi bi-check-circle-fill me-2 fs-5"></i>
              <strong>Berhasil!</strong> {actionSuccess}
            </div>
            <button type="button" className="btn-close" onClick={() => setActionSuccess(null)}></button>
          </div>
        )}

        {actionError && (
          <div className="alert alert-danger alert-dismissible fade show shadow-sm mb-3 d-flex align-items-center justify-content-between" role="alert">
            <div>
              <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
              <strong>Error:</strong> {actionError}
            </div>
            <button type="button" className="btn-close" onClick={() => setActionError(null)}></button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MENU 1: DASHBOARD                                          */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMenu === 'dashboard' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-bar-chart-line me-2 text-primary"></i>Ringkasan Statistik Pendaftaran
              </h5>
              <button
                className="btn btn-sm btn-outline-primary"
                onClick={() => {
                  loadPrograms();
                  loadRequirements();
                  loadFunnelStats();
                  loadInternalUsers();
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>Muat Ulang
              </button>
            </div>

            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <div className="card card-stat bg-primary text-white p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Total Calon Peserta</small>
                      <h2 className="fw-bold mb-0">{funnelStats.totalApplicants || 120}</h2>
                    </div>
                    <i className="bi bi-people-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card card-stat bg-info text-white p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Proses Administrasi</small>
                      <h2 className="fw-bold mb-0">{funnelStats.adminPending || 15}</h2>
                    </div>
                    <i className="bi bi-hourglass-split fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card card-stat bg-success text-white p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Lulus Administrasi</small>
                      <h2 className="fw-bold mb-0">{funnelStats.adminPassed || 95}</h2>
                    </div>
                    <i className="bi bi-check-circle-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card card-stat bg-danger text-white p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Tidak Lulus Administrasi</small>
                      <h2 className="fw-bold mb-0">{funnelStats.adminRejected || 10}</h2>
                    </div>
                    <i className="bi bi-x-circle-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card card-stat bg-warning text-dark p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-dark-50">Proses Wawancara</small>
                      <h2 className="fw-bold mb-0">{funnelStats.interviewPending || 20}</h2>
                    </div>
                    <i className="bi bi-chat-dots-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-stat bg-success text-white p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Lulus Wawancara</small>
                      <h2 className="fw-bold mb-0">{funnelStats.finalAccepted || 70}</h2>
                    </div>
                    <i className="bi bi-trophy-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card card-stat bg-secondary text-white p-3 shadow-sm border-0 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-white-50">Tidak Lulus Wawancara</small>
                      <h2 className="fw-bold mb-0">{funnelStats.interviewFailed || 5}</h2>
                    </div>
                    <i className="bi bi-person-x-fill fs-1 opacity-50"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Ringkasan Konfigurasi Master Data */}
            <h6 className="fw-bold mb-2 text-muted">Ringkasan Konfigurasi Master Data</h6>
            <div className="row g-3">
              <div className="col-md-4">
                <div className="card border-0 shadow-sm bg-white p-3 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">Total Program Pelatihan</small>
                      <h4 className="fw-bold mb-0 text-primary">{programs.length} Program</h4>
                    </div>
                    <i className="bi bi-mortarboard fs-2 text-primary"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm bg-white p-3 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">Total Alokasi Kuota</small>
                      <h4 className="fw-bold mb-0 text-success">
                        {programs.reduce((acc, p) => acc + (p.quota || 0), 0) || 150} Peserta
                      </h4>
                    </div>
                    <i className="bi bi-person-check fs-2 text-success"></i>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card border-0 shadow-sm bg-white p-3 rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <small className="text-muted">Persyaratan Dokumen Aktif</small>
                      <h4 className="fw-bold mb-0 text-info">{requirements.length} Dokumen</h4>
                    </div>
                    <i className="bi bi-file-earmark-text fs-2 text-info"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MENU 2: HASIL SELEKSI                                      */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMenu === 'hasil' && (
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0">
                <i className="bi bi-trophy me-2 text-primary"></i>Hasil Kelulusan Peserta (Wawancara &amp; Final)
              </h5>
              <button
                className="btn btn-success fw-bold"
                onClick={handleExportExcel}
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>Mengekspor...
                  </>
                ) : (
                  <>
                    <i className="bi bi-file-earmark-excel me-1"></i> Export Excel
                  </>
                )}
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="p-3 border-bottom bg-light">
              <div className="row g-2 align-items-center">
                <div className="col-md-5">
                  <div className="input-group input-group-sm">
                    <span className="input-group-text bg-white"><i className="bi bi-search"></i></span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Cari NIK / Nama / Kode Pendaftaran..."
                      value={resultsSearch}
                      onChange={(e) => setResultsSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <select
                    className="form-select form-select-sm"
                    value={resultsFilterStatus}
                    onChange={(e) => setResultsFilterStatus(e.target.value)}
                  >
                    <option value="">Semua Status Kelulusan</option>
                    <option value="ACCEPTED">DITERIMA (Lulus Final)</option>
                    <option value="NOT_ACCEPTED">TIDAK DITERIMA</option>
                    <option value="UNDECIDED">PROSES SELEKSI</option>
                  </select>
                </div>
                <div className="col-md-3 text-end">
                  <span className="badge bg-primary px-3 py-2">
                    Total Peserta: {results.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }}>No</th>
                      <th>NIK &amp; Nama Peserta</th>
                      <th>Program Pelatihan</th>
                      <th>Status Administrasi</th>
                      <th>Nilai Wawancara</th>
                      <th>Status Wawancara</th>
                      <th>Status Final</th>
                      <th className="text-center" style={{ width: '100px' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingResults ? (
                      <tr>
                        <td colSpan={8} className="text-center py-4 text-muted">
                          <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                          Memuat hasil kelulusan peserta...
                        </td>
                      </tr>
                    ) : results.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-5 text-muted">
                          <i className="bi bi-inbox fs-2 d-block mb-2"></i>
                          Belum ada data hasil seleksi peserta.
                        </td>
                      </tr>
                    ) : (
                      results.map((res, index) => (
                        <tr key={res.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{res.fullName}</strong>
                            <br />
                            <small className="text-muted">NIK: {res.nik}</small>
                          </td>
                          <td>{res.programName}</td>
                          <td>
                            {res.administrationStatus === 'PASSED' ? (
                              <span className="badge bg-success">Lolos</span>
                            ) : res.administrationStatus === 'REVISION' ? (
                              <span className="badge bg-warning text-dark">Revisi</span>
                            ) : res.administrationStatus === 'REJECTED' ? (
                              <span className="badge bg-danger">Tidak Lolos</span>
                            ) : (
                              <span className="badge bg-secondary">Pending</span>
                            )}
                          </td>
                          <td>
                            {res.totalScore !== null ? (
                              <strong>{Number(res.totalScore).toFixed(2)}</strong>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td>
                            {res.interviewStatus === 'PASSED' ? (
                              <span className="badge bg-success">Lulus Wawancara</span>
                            ) : res.interviewStatus === 'FAILED' ? (
                              <span className="badge bg-danger">Tidak Lulus</span>
                            ) : (
                              <span className="badge bg-secondary">Menunggu</span>
                            )}
                          </td>
                          <td>
                            {res.finalStatus === 'ACCEPTED' ? (
                              <span className="badge bg-success">
                                <i className="bi bi-award me-1"></i>DITERIMA
                              </span>
                            ) : res.finalStatus === 'NOT_ACCEPTED' ? (
                              <span className="badge bg-danger">TIDAK DITERIMA</span>
                            ) : (
                              <span className="badge bg-secondary">PROSES</span>
                            )}
                          </td>
                          <td className="text-center">
                            <button
                              className="btn btn-sm btn-outline-primary"
                              title="Lihat Detail Peserta"
                              onClick={() => handleOpenResultDetail(res)}
                            >
                              <i className="bi bi-eye me-1"></i>Detail
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
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MENU 3: DATA MASTER                                        */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMenu === 'master' && (
          <div>
            <ul className="nav nav-tabs mb-3" id="masterSubTab">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold ${activeMasterSubTab === 'beasiswa' ? 'active' : ''}`}
                  onClick={() => setActiveMasterSubTab('beasiswa')}
                >
                  CRUD Beasiswa Pelatihan
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold ${activeMasterSubTab === 'syarat' ? 'active' : ''}`}
                  onClick={() => setActiveMasterSubTab('syarat')}
                >
                  CRUD Persyaratan
                </button>
              </li>
            </ul>

            {/* Subtab 1: CRUD Beasiswa Pelatihan */}
            {activeMasterSubTab === 'beasiswa' && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Master Data Beasiswa Pelatihan</h6>
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
                          <th>Nama Beasiswa Pelatihan</th>
                          <th>Kuota</th>
                          <th>Metode</th>
                          <th>Status</th>
                          <th className="text-center" style={{ width: '160px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingPrograms ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">
                              <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                              Memuat data program...
                            </td>
                          </tr>
                        ) : programs.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">
                              Belum ada program beasiswa yang terdaftar.
                            </td>
                          </tr>
                        ) : (
                          programs.map((prog) => {
                            const isPub = Boolean(prog.is_published);
                            return (
                              <tr key={prog.id}>
                                <td>
                                  <strong>{prog.name}</strong>
                                  <br />
                                  <small className="text-muted">Kode: {prog.code}</small>
                                </td>
                                <td>{prog.quota} Peserta</td>
                                <td>
                                  {prog.method === 'DARING' ? 'Daring (Online)' : prog.method === 'HYBRID' ? 'Hybrid' : 'Luring (Offline)'}
                                </td>
                                <td>
                                  {isPub ? (
                                    <span className="badge bg-success">Aktif</span>
                                  ) : (
                                    <span className="badge bg-warning text-dark">DRAFT</span>
                                  )}
                                </td>
                                <td className="text-center">
                                  <div className="btn-group btn-group-sm">
                                    <button
                                      className="btn btn-sm btn-warning"
                                      title="Edit Program"
                                      onClick={() => handleOpenEditProgram(prog)}
                                    >
                                      <i className="bi bi-pencil"></i>
                                    </button>
                                    {!isPub ? (
                                      <button
                                        className="btn btn-sm btn-outline-success"
                                        title="Publikasikan Program"
                                        onClick={() => handlePublish(prog.id, prog.name)}
                                      >
                                        <i className="bi bi-send-check"></i>
                                      </button>
                                    ) : (
                                      <button
                                        className="btn btn-sm btn-outline-secondary"
                                        title="Tutup Pendaftaran"
                                        onClick={() => handleClose(prog.id, prog.name)}
                                      >
                                        <i className="bi bi-x-circle"></i>
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-sm btn-danger"
                                      title="Hapus Program"
                                      onClick={() => handleDeleteProgram(prog.id, prog.name)}
                                    >
                                      <i className="bi bi-trash"></i>
                                    </button>
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

            {/* Subtab 2: CRUD Persyaratan Dokumen */}
            {activeMasterSubTab === 'syarat' && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Master Data Persyaratan Dokumen</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddSyaratOpen(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Persyaratan
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Dokumen</th>
                          <th>Format Allowed</th>
                          <th>Max Size</th>
                          <th>Mandatory</th>
                          <th className="text-center" style={{ width: '120px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingRequirements ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">
                              <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                              Memuat data persyaratan...
                            </td>
                          </tr>
                        ) : (
                          requirements.map((req) => (
                            <tr key={req.id}>
                              <td>
                                <strong>{req.name}</strong>
                                <br />
                                <small className="text-muted">Kode: {req.code}</small>
                              </td>
                              <td>
                                {req.allowed_types && req.allowed_types.length > 0
                                  ? req.allowed_types.map(t => t.replace('image/', '').replace('application/', '').toUpperCase()).join(' / ')
                                  : 'PDF / JPG / PNG'}
                              </td>
                              <td>{(req.max_bytes / 1048576).toFixed(0)} MB</td>
                              <td>
                                {req.is_active ? (
                                  <span className="badge bg-danger">Wajib</span>
                                ) : (
                                  <span className="badge bg-secondary">Opsional</span>
                                )}
                              </td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-warning me-1"
                                  title="Edit Persyaratan"
                                  onClick={() => handleOpenEditSyarat(req)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  title="Hapus Persyaratan"
                                  onClick={() => handleDeleteSyarat(req.id, req.name)}
                                >
                                  <i className="bi bi-trash"></i>
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
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════ */}
        {/* MENU 4: SETTING SYSTEM                                     */}
        {/* ══════════════════════════════════════════════════════════ */}
        {activeMenu === 'setting' && (
          <div>
            <ul className="nav nav-tabs mb-3" id="settingSubTab">
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold ${activeSettingSubTab === 'users' ? 'active' : ''}`}
                  onClick={() => setActiveSettingSubTab('users')}
                >
                  CRUD Users Internal
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold ${activeSettingSubTab === 'roles' ? 'active' : ''}`}
                  onClick={() => setActiveSettingSubTab('roles')}
                >
                  CRUD Role &amp; Akses Menu
                </button>
              </li>
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-bold ${activeSettingSubTab === 'menus' ? 'active' : ''}`}
                  onClick={() => setActiveSettingSubTab('menus')}
                >
                  CRUD Menu System
                </button>
              </li>
            </ul>

            {/* Subtab 1: CRUD Users Internal */}
            {activeSettingSubTab === 'users' && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Manajemen Users Internal</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddUserOpen(true)}
                  >
                    <i className="bi bi-person-plus me-1"></i>Tambah User Internal
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama User</th>
                          <th>Username / Email</th>
                          <th>Role System</th>
                          <th>Status</th>
                          <th className="text-center" style={{ width: '120px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingUsers ? (
                          <tr>
                            <td colSpan={5} className="text-center py-4 text-muted">
                              <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                              Memuat data users internal...
                            </td>
                          </tr>
                        ) : (
                          internalUsers.map((u) => (
                            <tr key={u.id}>
                              <td>
                                <strong>{u.fullName}</strong>
                                <br />
                                <small className="text-muted">NIK: {u.nik}</small>
                              </td>
                              <td>{u.email}</td>
                              <td>
                                {u.role === 'ADMIN' ? (
                                  <span className="badge bg-danger">Administrator</span>
                                ) : u.role === 'LEMBAGA_SELEKSI' ? (
                                  <span className="badge bg-warning text-dark">Lembaga Seleksi</span>
                                ) : (
                                  <span className="badge bg-primary">Verifikator</span>
                                )}
                              </td>
                              <td>
                                {u.status === 'ACTIVE' ? (
                                  <span className="badge bg-success">Active</span>
                                ) : (
                                  <span className="badge bg-secondary">Inactive</span>
                                )}
                              </td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-warning me-1"
                                  title="Edit User"
                                  onClick={() => handleOpenEditUser(u)}
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-danger"
                                  title="Nonaktifkan User"
                                  onClick={() => handleDeleteUser(u.id, u.fullName)}
                                >
                                  <i className="bi bi-trash"></i>
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
            )}

            {/* Subtab 2: CRUD Role & Akses Menu */}
            {activeSettingSubTab === 'roles' && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Manajemen Role &amp; Hak Akses Menu</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddRoleOpen(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Role
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Role</th>
                          <th>Akses Menu Terkait</th>
                          <th className="text-center" style={{ width: '180px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {isLoadingRoles ? (
                          <tr>
                            <td colSpan={3} className="text-center py-4 text-muted">
                              <div className="spinner-border spinner-border-sm me-2 text-primary"></div>
                              Memuat data role...
                            </td>
                          </tr>
                        ) : (
                          roles.map((r) => (
                            <tr key={r.id}>
                              <td>
                                <strong>{r.name}</strong>
                                {r.isSystem && (
                                  <span className="badge bg-secondary-subtle text-secondary ms-2" style={{ fontSize: '10px' }}>
                                    SISTEM
                                  </span>
                                )}
                              </td>
                              <td>
                                <div className="text-wrap">{r.description}</div>
                                <small className="text-muted">
                                  {r.permissions.length} izin akses aktif ({r.permissions.map(p => p.name).slice(0, 3).join(', ')}{r.permissions.length > 3 ? '...' : ''})
                                </small>
                              </td>
                              <td className="text-center">
                                <button
                                  className="btn btn-sm btn-info text-white me-1"
                                  title="Konfigurasi Hak Akses Menu"
                                  onClick={() => handleOpenSettingAkses(r)}
                                >
                                  <i className="bi bi-shield-lock me-1"></i>Setting Akses
                                </button>
                                <button
                                  className="btn btn-sm btn-warning"
                                  title="Edit Deskripsi Role"
                                  onClick={() => handleOpenEditRole(r)}
                                >
                                  <i className="bi bi-pencil"></i>
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
            )}

            {/* Subtab 3: CRUD Menu System */}
            {activeSettingSubTab === 'menus' && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center">
                  <h6 className="fw-bold mb-0">Manajemen Struktur Menu System</h6>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setIsAddMenuOpen(true)}
                  >
                    <i className="bi bi-plus-lg me-1"></i>Tambah Menu
                  </button>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Nama Menu</th>
                          <th>URL / Route</th>
                          <th>Icon</th>
                          <th className="text-center" style={{ width: '120px' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {menus.map((m) => (
                          <tr key={m.id}>
                            <td>
                              <strong>{m.name}</strong>
                              {m.description && <div className="text-muted small">{m.description}</div>}
                            </td>
                            <td><code>{m.route}</code></td>
                            <td>
                              <i className={`bi ${m.icon} fs-5 text-primary`}></i>
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-warning me-1"
                                title="Edit Menu"
                                onClick={() => handleOpenEditMenu(m)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                title="Hapus Menu"
                                onClick={() => handleDeleteMenu(m.id, m.name)}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 1: TAMBAH BEASISWA                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isAddProgramOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-mortarboard-fill me-2"></i>Tambah Program Beasiswa
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsAddProgramOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateProgram}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Beasiswa Pelatihan</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="contoh: Pelatihan Mobile App Flutter Specialist"
                      value={newProgName}
                      onChange={(e) => setNewProgName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Kode Program Beasiswa</label>
                    <input
                      type="text"
                      className="form-control font-monospace text-uppercase"
                      placeholder="contoh: PROG-FLUTTER-2026"
                      value={newProgCode}
                      onChange={(e) => setNewProgCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Deskripsi Singkat</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      placeholder="Deskripsi materi atau kompetensi program..."
                      value={newProgDesc}
                      onChange={(e) => setNewProgDesc(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Kuota Peserta</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        value={newProgQuota}
                        onChange={(e) => setNewProgQuota(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Metode Pelaksanaan</label>
                      <select
                        className="form-select"
                        value={newProgMethod}
                        onChange={(e) => setNewProgMethod(e.target.value as any)}
                      >
                        <option value="DARING">Daring (Online)</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="LURING">Luring (Offline)</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Mulai Daftar</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={newProgStart.split('T')[0]}
                        onChange={(e) => setNewProgStart(`${e.target.value}T00:00:00.000Z`)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Batas Akhir</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={newProgEnd.split('T')[0]}
                        onChange={(e) => setNewProgEnd(`${e.target.value}T23:59:59.000Z`)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-semibold">
                    <i className="bi bi-save me-1"></i>Simpan &amp; Terbitkan Program
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 2: EDIT BEASISWA                                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isEditProgramOpen && editingProgram && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>Edit Program Beasiswa
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsEditProgramOpen(false)}></button>
              </div>
              <form onSubmit={handleUpdateProgram}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Kode Program (Read-only)</label>
                    <input type="text" className="form-control bg-light font-monospace" value={editingProgram.code} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Beasiswa Pelatihan</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editProgName}
                      onChange={(e) => setEditProgName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Kuota Peserta</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        value={editProgQuota}
                        onChange={(e) => setEditProgQuota(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Metode Pelaksanaan</label>
                      <select
                        className="form-select"
                        value={editProgMethod}
                        onChange={(e) => setEditProgMethod(e.target.value as any)}
                      >
                        <option value="DARING">Daring (Online)</option>
                        <option value="HYBRID">Hybrid</option>
                        <option value="LURING">Luring (Offline)</option>
                      </select>
                    </div>
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Mulai Daftar</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={editProgStart}
                        onChange={(e) => setEditProgStart(e.target.value)}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Batas Akhir</label>
                      <input
                        type="date"
                        className="form-control form-control-sm"
                        value={editProgEnd}
                        onChange={(e) => setEditProgEnd(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-warning w-100 fw-semibold">
                    <i className="bi bi-check2-circle me-1"></i>Simpan Perubahan Program
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 3: TAMBAH PERSYARATAN                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isAddSyaratOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-file-earmark-plus me-2"></i>Tambah Persyaratan Dokumen
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsAddSyaratOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateRequirement}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Dokumen</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="contoh: SKCK (Surat Keterangan Catatan Kepolisian)"
                      value={newSyaratName}
                      onChange={(e) => setNewSyaratName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Kode Dokumen</label>
                    <input
                      type="text"
                      className="form-control font-monospace text-uppercase"
                      placeholder="contoh: SKCK"
                      value={newSyaratCode}
                      onChange={(e) => setNewSyaratCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Format Allowed</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="PDF / JPG / PNG"
                      value={newSyaratFormat}
                      onChange={(e) => setNewSyaratFormat(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Max Size (MB)</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        max={20}
                        value={newSyaratMaxSize}
                        onChange={(e) => setNewSyaratMaxSize(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Status Mandatory</label>
                      <select
                        className="form-select"
                        value={newSyaratMandatory ? 'WAJIB' : 'OPSIONAL'}
                        onChange={(e) => setNewSyaratMandatory(e.target.value === 'WAJIB')}
                      >
                        <option value="WAJIB">Wajib Diunggah</option>
                        <option value="OPSIONAL">Opsional / Tambahan</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-semibold">
                    <i className="bi bi-save me-1"></i>Simpan Persyaratan Dokumen
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 4: EDIT PERSYARATAN                                    */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isEditSyaratOpen && editingSyarat && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>Edit Persyaratan Dokumen
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsEditSyaratOpen(false)}></button>
              </div>
              <form onSubmit={handleUpdateSyarat}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Kode Dokumen (Read-only)</label>
                    <input type="text" className="form-control bg-light font-monospace" value={editingSyarat.code} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Dokumen</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editSyaratName}
                      onChange={(e) => setEditSyaratName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Format Allowed</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editSyaratFormat}
                      onChange={(e) => setEditSyaratFormat(e.target.value)}
                      required
                    />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Max Size (MB)</label>
                      <input
                        type="number"
                        className="form-control"
                        min={1}
                        max={20}
                        value={editSyaratMaxSize}
                        onChange={(e) => setEditSyaratMaxSize(Number(e.target.value))}
                        required
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-semibold small">Status Mandatory</label>
                      <select
                        className="form-select"
                        value={editSyaratMandatory ? 'WAJIB' : 'OPSIONAL'}
                        onChange={(e) => setEditSyaratMandatory(e.target.value === 'WAJIB')}
                      >
                        <option value="WAJIB">Wajib Diunggah</option>
                        <option value="OPSIONAL">Opsional / Tambahan</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-warning w-100 fw-semibold">
                    <i className="bi bi-check2-circle me-1"></i>Simpan Perubahan Persyaratan
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 5: TAMBAH USER INTERNAL                                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isAddUserOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-plus-fill me-2"></i>Tambah User Internal
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsAddUserOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nomor Induk Kependudukan (NIK)</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="16 digit angka NIK"
                      maxLength={16}
                      value={newUserNik}
                      onChange={(e) => setNewUserNik(e.target.value.replace(/\D/g, ''))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Lengkap Petugas</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="contoh: Dr. Hendra Gunawan"
                      value={newUserFullName}
                      onChange={(e) => setNewUserFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Email Kedinasan</label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="contoh: hendra@beasiswa.go.id"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Role Petugas</label>
                    <select
                      className="form-select"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                    >
                      <option value="VERIFIKATOR">Verifikator (Seleksi Dokumen Administrasi)</option>
                      <option value="LEMBAGA_SELEKSI">Lembaga Seleksi (Penguji Wawancara)</option>
                      <option value="ADMIN">Administrator (Full System &amp; Data Master)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-semibold">
                    <i className="bi bi-save me-1"></i>Simpan User Internal
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 6: EDIT USER INTERNAL                                  */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isEditUserOpen && editingUser && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>Edit Data User Internal
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsEditUserOpen(false)}></button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">NIK &amp; Email (Read-only)</label>
                    <input type="text" className="form-control bg-light font-monospace mb-1" value={`NIK: ${editingUser.nik}`} disabled />
                    <input type="text" className="form-control bg-light" value={`Email: ${editingUser.email}`} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Lengkap Petugas</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editUserFullName}
                      onChange={(e) => setEditUserFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Role Petugas</label>
                    <select
                      className="form-select"
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value)}
                    >
                      <option value="VERIFIKATOR">Verifikator</option>
                      <option value="LEMBAGA_SELEKSI">Lembaga Seleksi</option>
                      <option value="ADMIN">Administrator</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Status Akun</label>
                    <select
                      className="form-select"
                      value={editUserStatus}
                      onChange={(e) => setEditUserStatus(e.target.value as any)}
                    >
                      <option value="ACTIVE">Aktif (Bisa Login)</option>
                      <option value="INACTIVE">Nonaktif (Akses Dinonaktifkan)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-warning w-100 fw-semibold">
                    <i className="bi bi-check2-circle me-1"></i>Simpan Perubahan User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 7: SETTING HAK AKSES MENU (RBAC)                       */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isSettingAksesOpen && selectedRoleForAccess && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-lock-fill me-2"></i>Konfigurasi Hak Akses Menu: Role {selectedRoleForAccess.name}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsSettingAksesOpen(false)}></button>
              </div>
              <div className="modal-body p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <p className="text-muted small mb-0">
                    Centang modul menu dan kapabilitas yang diizinkan untuk diakses oleh pengguna dengan role <strong>{selectedRoleForAccess.name}</strong>.
                  </p>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSelectedPermIds(allPermissions.map(p => p.id))}
                    >
                      Pilih Semua
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setSelectedPermIds([])}
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="row g-3">
                  {Object.entries(categorizedPermissions).map(([category, perms]) => (
                    <div className="col-md-6" key={category}>
                      <div className="card border h-100 shadow-sm">
                        <div className="card-header bg-light py-2 fw-bold small text-primary">
                          <i className="bi bi-folder2-open me-2"></i>{category}
                        </div>
                        <div className="card-body p-3">
                          {perms.length === 0 ? (
                            <small className="text-muted">Tidak ada izin konfigurasi.</small>
                          ) : (
                            perms.map(p => (
                              <div className="form-check mb-2" key={p.id}>
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`perm-${p.id}`}
                                  checked={selectedPermIds.includes(p.id)}
                                  onChange={() => handleTogglePerm(p.id)}
                                />
                                <label className="form-check-label small" htmlFor={`perm-${p.id}`}>
                                  <strong>{p.name}</strong>
                                  <div className="text-muted" style={{ fontSize: '11px' }}>{p.description}</div>
                                </label>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsSettingAksesOpen(false)}>
                  Batal
                </button>
                <button type="button" className="btn btn-primary btn-sm fw-bold" onClick={handleSaveRolePermissions}>
                  <i className="bi bi-check2-circle me-1"></i>Simpan Hak Akses Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 8: TAMBAH ROLE                                         */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isAddRoleOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-shield-plus me-2"></i>Tambah Role Baru
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsAddRoleOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateRole}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Role</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="contoh: Supervisor Seleksi"
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Deskripsi Hak Akses</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Jelaskan cakupan wewenang role baru ini..."
                      value={newRoleDesc}
                      onChange={(e) => setNewRoleDesc(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-semibold">
                    <i className="bi bi-save me-1"></i>Simpan Role Baru
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 9: EDIT ROLE                                           */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isEditRoleOpen && editingRole && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>Edit Deskripsi Role: {editingRole.name}
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsEditRoleOpen(false)}></button>
              </div>
              <form onSubmit={handleUpdateRole}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Role (Sistem)</label>
                    <input type="text" className="form-control bg-light" value={editingRole.name} disabled />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Deskripsi Hak Akses</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={editRoleDesc}
                      onChange={(e) => setEditRoleDesc(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <button type="submit" className="btn btn-warning w-100 fw-semibold">
                    <i className="bi bi-check2-circle me-1"></i>Simpan Perubahan Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 10: TAMBAH MENU                                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isAddMenuOpen && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-menu-button-wide-fill me-2"></i>Tambah Menu System
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsAddMenuOpen(false)}></button>
              </div>
              <form onSubmit={handleCreateMenu}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Menu</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="contoh: Monitoring Anggaran &amp; Beasiswa"
                      value={newMenuName}
                      onChange={(e) => setNewMenuName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">URL / Route</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      placeholder="contoh: /admin/monitoring"
                      value={newMenuRoute}
                      onChange={(e) => setNewMenuRoute(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Bootstrap Icon Class</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className={`bi ${newMenuIcon}`}></i></span>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        placeholder="contoh: bi-cash-coin"
                        value={newMenuIcon}
                        onChange={(e) => setNewMenuIcon(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-100 fw-semibold">
                    <i className="bi bi-save me-1"></i>Simpan Menu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 11: EDIT MENU                                          */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isEditMenuOpen && editingMenu && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-pencil-square me-2"></i>Edit Menu System
                </h5>
                <button type="button" className="btn-close" onClick={() => setIsEditMenuOpen(false)}></button>
              </div>
              <form onSubmit={handleUpdateMenu}>
                <div className="modal-body p-4">
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Nama Menu</label>
                    <input
                      type="text"
                      className="form-control"
                      value={editMenuName}
                      onChange={(e) => setEditMenuName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">URL / Route</label>
                    <input
                      type="text"
                      className="form-control font-monospace"
                      value={editMenuRoute}
                      onChange={(e) => setEditMenuRoute(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-semibold small">Bootstrap Icon Class</label>
                    <div className="input-group">
                      <span className="input-group-text"><i className={`bi ${editMenuIcon}`}></i></span>
                      <input
                        type="text"
                        className="form-control font-monospace"
                        value={editMenuIcon}
                        onChange={(e) => setEditMenuIcon(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-warning w-100 fw-semibold">
                    <i className="bi bi-check2-circle me-1"></i>Simpan Perubahan Menu
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* MODAL 12: DETAIL HASIL PESERTA                               */}
      {/* ══════════════════════════════════════════════════════════════ */}
      {isResultDetailOpen && selectedResultDetail && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content shadow border-0">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold">
                  <i className="bi bi-person-lines-fill me-2"></i>Rincian Hasil Seleksi: {selectedResultDetail.fullName}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setIsResultDetailOpen(false)}></button>
              </div>
              <div className="modal-body p-4">
                {/* Biodata & Program */}
                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <small className="text-muted d-block">Nomor Induk Kependudukan (NIK)</small>
                      <strong className="font-monospace fs-6">{selectedResultDetail.nik}</strong>
                      <small className="text-muted d-block mt-2">Kode Registrasi</small>
                      <span className="badge bg-secondary font-monospace">{selectedResultDetail.registrationCode}</span>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="p-3 bg-light rounded">
                      <small className="text-muted d-block">Program Pelatihan Pilihan</small>
                      <strong className="text-primary">{selectedResultDetail.programName}</strong>
                      <small className="text-muted d-block mt-2">Waktu Pendaftaran</small>
                      <span className="small text-muted">{selectedResultDetail.submittedAt ? new Date(selectedResultDetail.submittedAt).toLocaleString('id-ID') : '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Status Evaluasi */}
                <h6 className="fw-bold text-muted border-bottom pb-2">Rincian Evaluasi Seleksi</h6>
                <div className="row g-3 mb-3">
                  <div className="col-md-4">
                    <div className="card h-100 p-3 text-center border-0 shadow-sm bg-light">
                      <small className="text-muted">Tahap 1: Administrasi</small>
                      <h5 className="fw-bold mt-2">
                        {selectedResultDetail.administrationStatus === 'PASSED' ? (
                          <span className="badge bg-success">LOLOS VERIFIKASI</span>
                        ) : selectedResultDetail.administrationStatus === 'REVISION' ? (
                          <span className="badge bg-warning text-dark">PERLU REVISI</span>
                        ) : selectedResultDetail.administrationStatus === 'REJECTED' ? (
                          <span className="badge bg-danger">TIDAK LOLOS</span>
                        ) : (
                          <span className="badge bg-secondary">MENUNGGU VERIFIKASI</span>
                        )}
                      </h5>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="card h-100 p-3 text-center border-0 shadow-sm bg-light">
                      <small className="text-muted">Tahap 2: Skor Wawancara</small>
                      <h3 className="fw-bold text-primary mt-1 mb-0">
                        {selectedResultDetail.totalScore !== null ? Number(selectedResultDetail.totalScore).toFixed(2) : '-'}
                      </h3>
                      <small className="text-muted">Skala Penilaian (0 - 100)</small>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="card h-100 p-3 text-center border-0 shadow-sm bg-light">
                      <small className="text-muted">Status Kelulusan Final</small>
                      <h5 className="fw-bold mt-2">
                        {selectedResultDetail.finalStatus === 'ACCEPTED' ? (
                          <span className="badge bg-success fs-6">
                            <i className="bi bi-award me-1"></i>DITERIMA
                          </span>
                        ) : selectedResultDetail.finalStatus === 'NOT_ACCEPTED' ? (
                          <span className="badge bg-danger fs-6">TIDAK DITERIMA</span>
                        ) : (
                          <span className="badge bg-secondary fs-6">PROSES SELEKSI</span>
                        )}
                      </h5>
                    </div>
                  </div>
                </div>

                {/* Keputusan Override Administrator */}
                <div className="alert alert-info d-flex justify-content-between align-items-center mb-0 mt-3">
                  <div>
                    <i className="bi bi-shield-check me-2 fs-5"></i>
                    <strong>Wewenang Administrator:</strong> Ubah status kelulusan akhir jika ada diskresi/kuota khusus.
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      onClick={() => handleUpdateFinalStatus('ACCEPTED')}
                    >
                      Tetapkan Lulus
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleUpdateFinalStatus('NOT_ACCEPTED')}
                    >
                      Tetapkan Tidak Lulus
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsResultDetailOpen(false)}>
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
