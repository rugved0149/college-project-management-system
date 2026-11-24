# Implementation status — current milestone

## Implemented

- React/Vite responsive CampusFlow workspace with role-aware navigation
- Student registration, mandatory email verification, sign-in and profile management; bcrypt password hashing, JWT authentication and active-account enforcement
- Single-use email-verification tokens (24-hour expiry) and password-reset tokens (1-hour expiry), stored as SHA-256 hashes
- Password-reset and email-change session revocation through per-user JWT session versions
- Brevo transactional email integration with rate-limited verification, resend and password-recovery endpoints
- Four roles: Student, Faculty, Department Administrator and System Administrator
- Project list, create, category selection and access-controlled project detail
- Team membership management and faculty-guide assignment
- Task and milestone creation, assignment, progress updates and due dates
- Proposal and final-deliverable file upload to private server storage with extension/MIME allowlists and file-signature verification
- Optional ClamAV INSTREAM malware scanning; can be configured to fail closed when scanning is required
- Authenticated submission downloads and faculty feedback history
- Proposal review assignment, approve/revision/reject decisions and lifecycle transitions
- Explicit start action for approved projects
- Completion guard: approved final deliverable plus all tasks and milestones completed
- Notifications for account, team, project and review events
- Department-scoped people administration, department/category management and reports
- Student profile management
- System settings, role-permission records and audit-log console
- Shared audit service covering project creation/updates/start, team membership, guide assignment, task and milestone changes, submissions, review assignment/decisions and authenticated file downloads
- SQLite schema with foreign keys, indexes and additive category migration
- Layered modular-monolith structure: routes, services, repositories, domain enums/lifecycle rules, middleware and database connection
- Unit tests for proposal/review/start/completion state rules, cryptographic authentication-token generation and upload signature/scanner policy
- Authentication API integration tests for verified/unverified sign-in, one-time email verification, password reset and JWT session revocation
- GitHub Actions frontend build, backend unit/integration tests and server syntax checks pass
- Render Blueprint with static frontend, API service and persistent storage
- UML traceability matrix for all 20 supplied diagram exports

## Remaining before production

- Add browser-level end-to-end tests for all four roles
- Extend authorization tests for cross-department and non-member access
- Add audit coverage for remaining read/export operations where a compliance requirement exists

- Add a department deactivation policy (departments are currently renamed rather than deleted to preserve references)
- Move remaining authentication and administration SQL from route handlers into repository/service modules
- Validate SQLite backup/restore and persistent-disk behavior
- Deploy to Render and verify CORS, build-time API URL, uploads and database persistence
- Conduct a security review of authentication, authorization, upload handling, rate limits and error handling

## Model reconciliation

The supplied class diagram's ProjectStatus enum lists DRAFT, PROPOSAL_SUBMITTED, APPROVED, IN_PROGRESS, COMPLETED and REJECTED. The state diagram additionally uses UNDER_REVIEW and REVISION_REQUIRED. The implementation retains those two workflow states so the proposal review and revision loop can function.

The supplied diagrams remain the design authority. The PNG exports were supplied in a ZIP; individual image assets are not currently committed to this repository.
