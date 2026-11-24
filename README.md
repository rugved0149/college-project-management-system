# CampusFlow
College Students Project Management System

A role-based project workspace for students, faculty guides, department administrators and system administrators.

## Architecture
- React + Vite frontend
- Node.js + Express REST API
- Layered modular-monolith backend
- SQLite persistence (single database file; no separate DB server)
- Managed file uploads; SQLite stores file metadata and paths

## Local development
Requirements: Node.js 20+

```bash
npm install
cp .env.example server/.env
npm run seed -w server
npm run dev
```

Frontend: http://localhost:5173  
API health: http://localhost:5000/api/health

Configure a unique JWT_SECRET (24+ characters) and initial administrator credentials in server/.env before starting the API.

## Roles
STUDENT, FACULTY, DEPARTMENT_ADMIN, SYSTEM_ADMIN

## Administration

The administration console supports department-scoped category management, system-level department management, registration policy configuration, role-permission controls and audit-log review. Student project creation can optionally assign an active category available to the student's department.

See [UML diagram traceability](docs/DIAGRAM_TRACEABILITY.md) for the supplied diagram-to-code mapping and known model reconciliations.

## Project lifecycle
DRAFT → PROPOSAL_SUBMITTED → UNDER_REVIEW → REVISION_REQUIRED / APPROVED / REJECTED → IN_PROGRESS → COMPLETED.

A project is completed only after its final deliverable is approved.
