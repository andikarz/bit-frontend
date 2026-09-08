# Mockup to React Component Mapping

Based on PRD v1.3 §5 and the 10 mockup files in `2. MOCKUP/`.

## 1. Calon Pendaftar Mockups

| Mockup File | Route | Primary React Component | Key Features & Subcomponents |
|---|---|---|---|
| `1_index.html` | `/` | `LandingPage.tsx` | - Hero section with platform intro<br>- `ProgramCatalog.tsx`: Dynamic program cards<br>- `ProgramDetailModal.tsx`: Requirements & quota info<br>- Auth modals (`RegisterModal.tsx`, `LoginModal.tsx`) |
| `2_index_awal.html` | `/pendaftaran/:id` | `ApplicationWizard.tsx` | - Stepper header (1. Biodata, 2. Pendidikan, 3. Dokumen, 4. Ringkasan)<br>- `StepBiodata.tsx`: Region cascader, personal info<br>- `StepEducation.tsx`: Education history<br>- `StepDocuments.tsx`: Reservation upload & ClamAV status<br>- `StepSummary.tsx`: Consent & final submit button<br>- Auto-save with debouncing & optimistic lock |
| `3_index_terkirim.html` | `/pendaftaran/:id/terkirim` | `ApplicationSubmitted.tsx` | - Ticket header with registration code `REG-YYYY-XXXXX`<br>- Submission timestamp & timeline<br>- Read-only snapshot of all submitted sections<br>- Status banner: `SUBMITTED / PENDING ADMINISTRASI` |
| `4_index_revisi.html` | `/pendaftaran/:id/revisi` | `ApplicationRevision.tsx` | - Verifier feedback alert banner<br>- Field-level revision notes<br>- Document re-upload with clean scan verification<br>- `ResubmitButton.tsx` with confirmation modal |
| `5_index_ditutup.html` | `/program-ditutup` | `ProgramClosed.tsx` | - Closed program banner & announcement<br>- Existing applicants can still view draft/revision<br>- Disabled registration buttons |
| `6_index_lulus.html` | `/pendaftaran/:id/hasil` | `ApplicationResult.tsx` | - Acceptance status: `LULUS / DITERIMA`<br>- `AcceptanceLetterDownload.tsx`: PDF download button<br>- Training schedule & Telegram/group link<br>- `AttendanceConfirmation.tsx`: Confirm / Withdraw buttons |

## 2. Internal Staff Mockups

| Mockup File | Route | Primary React Component | Key Features & Subcomponents |
|---|---|---|---|
| `Internal/1_index_login.html` | `/internal/login` | `InternalLogin.tsx` | - Operator login with email/username & password<br>- Role-based redirect upon login |
| `Internal/2_index_verifikator.html` | `/internal/verifikator` | `VerifierDashboard.tsx` | - Application verification queue with search & filters<br>- `VerificationDetailModal.tsx`: Multi-tab view<br>- `DocumentPreview.tsx`: In-browser PDF/image blob preview<br>- Document checklist: Valid / Invalid per item<br>- Decision modal: `LOLOS`, `PERLU REVISI`, `TOLAK` |
| `Internal/3_index_wawancara.html` | `/internal/wawancara` | `InterviewDashboard.tsx` | - Candidates passed administration queue<br>- `InterviewScoreSheet.tsx`: Motivasi (30%), Teknis (40%), Komunikasi (30%)<br>- Automated weighted score calculation<br>- Final decision: `LULUS` or `TIDAK LULUS` |
| `Internal/4_index_admin.html` | `/admin/dashboard` | `AdminDashboard.tsx` | - Metric cards: Total Pendaftar, Lolos Admin, Lulus Wawancara, Kuota<br>- Status distribution charts & program filter<br>- `ProgramManagement.tsx`: CRUD programs & quotas<br>- `UserManagement.tsx`: Internal users & role assignment<br>- `ExportButton.tsx`: XLSX report download |
