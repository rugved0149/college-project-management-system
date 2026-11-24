# Implementation status — current milestone

## Implemented

- React/Vite workspace shell with role-aware navigation and responsive CampusFlow styling
- JWT authentication, password hashing, active-account enforcement and current-user hydration from SQLite
- Four application roles: Student, Faculty, Department Administrator and System Administrator
- Department-scoped user listing, role changes and account activation controls
- Project creation, listing, details, team membership and faculty-guide assignment
- Department/global category management and category assignment during project creation
- Project proposal and deliverable submission, file retrieval, version-aware review workflow and feedback
- Task and milestone creation, assignment/progress updates and completion guard
- In-app notifications
- Department-scoped project reports
- System configuration for registration availability
- Role-permission records with API enforcement for category-management access
- Audit records for successful account registration/login and administrative changes
- SQLite schema, indexes, foreign-key constraints and additive category migration
- Render Blueprint for API/static frontend and persistent API storage
- All 20 supplied UML diagram exports retained in `docs/diagrams`
- Diagram-to-implementation matrix in `docs/DIAGRAM_TRACEABILITY.md`

## Remaining before production

- Automated API integration tests and browser-level end-to-end workflow tests
- Extend audit coverage to project lifecycle transitions, submissions, downloads and all security-sensitive operations
- Apply role-permission configuration consistently to all permission-sensitive service operations
- Add department editing UI and department deactivation policy
- Verify upload file content (MIME sniffing), malware scanning and configurable upload limits
- Add password reset and email verification
- Validate database backup/restore, persistent-disk behavior and production deployment
- Conduct a security review of authorization, upload handling, rate limits and error handling

## UML reconciliation

The class diagram's `ProjectStatus` enum omits `UNDER_REVIEW` and `REVISION_REQUIRED`, while the state diagram uses both. The implementation keeps both states to preserve the modeled proposal-review-revision workflow.

See `docs/DIAGRAM_TRACEABILITY.md` for the diagram-by-diagram implementation mapping and outstanding alignment work.
