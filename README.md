# CampusFlow
College Students Project Management System

CampusFlow is a role-based workspace for student project teams, faculty guides, department administrators and system administrators. Its implementation follows the supplied UML design and keeps the deployment intentionally simple.

## Technology and architecture
- **Frontend:** React 18, Vite, React Router
- **Backend:** Node.js 20+, Express REST API
- **Database:** SQLite through better-sqlite3
- **Authentication:** JWT bearer tokens and bcrypt password hashing
- **Uploads:** private server-managed file storage; SQLite stores file metadata and generated filenames
- **Architecture:** layered modular monolith, not microservices

The application has a React presentation layer, Express API/controllers, business services, repository/data-access modules and one SQLite database file. The browser never connects directly to SQLite.

## Roles
- **STUDENT:** register, create projects, manage team membership, work on assigned tasks, track milestones, submit proposals/deliverables and read faculty feedback.
- **FACULTY:** view assigned projects, assign proposals for review, approve/request revision/reject submissions, and provide feedback.
- **DEPARTMENT_ADMIN:** manage department users and categories, assign faculty guides, monitor projects and view department reports.
- **SYSTEM_ADMIN:** manage users and roles, system settings, role permissions and access audit records.

## Project lifecycle
`DRAFT → PROPOSAL_SUBMITTED → UNDER_REVIEW → REVISION_REQUIRED / APPROVED / REJECTED → IN_PROGRESS → COMPLETED`

The proposal must be assigned for review before a decision is recorded. An approved project must be explicitly started before tasks and milestones are managed. A project becomes completed only after an approved final deliverable exists and all tasks and milestones are complete.

The class diagram's ProjectStatus enum omits `UNDER_REVIEW` and `REVISION_REQUIRED`; these states are retained because they are explicit in the state-machine diagram.

## Main workflows
- Student registration and sign-in
- Project creation, category selection, team membership and faculty-guide assignment
- Project detail workspace with task and milestone management
- Proposal and final-deliverable uploads (15 MB maximum; PDF, Office documents, images and ZIP)
- Faculty review queue, feedback history and authenticated file downloads
- Notifications, people administration, reports, category/settings/permission controls and audit log

## Local development
Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example server/.env
```

Edit `server/.env` and set a unique `JWT_SECRET` of at least 24 characters and a strong initial administrator password. Then run:

```bash
npm run seed -w server
npm run dev
```

- Frontend: http://localhost:5173
- API health: http://localhost:5000/api/health

The seed script creates the initial System Administrator and the default Computer Engineering department. Registration creates Student accounts; faculty and administrator roles are assigned by authorized administrators.

## Deployment
The repository includes `render.yaml` for a Render static frontend and Node API service. The API service requires its persistent disk for both the SQLite database and uploaded files. Configure:
- `CLIENT_URL`: deployed static-site origin
- `VITE_API_URL`: deployed API origin plus `/api` only if the frontend expects it (the current client expects the API base URL ending in `/api`)

The Blueprint is configuration only; a live deployment has not yet been verified.

## Design traceability
- [UML diagram traceability](docs/DIAGRAM_TRACEABILITY.md)
- [Architecture decisions](docs/ARCHITECTURE.md)
- [Diagram export inventory](docs/diagrams/README.md)
- [Implementation status and remaining work](docs/IMPLEMENTATION_STATUS.md)
