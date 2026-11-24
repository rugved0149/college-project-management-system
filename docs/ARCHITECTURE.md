# CampusFlow architecture

## Architectural decisions
CampusFlow is a **layered modular monolith** deployed as a three-tier system: browser client, application server and persistent storage. The backend is one Node.js/Express process. Its modules are not independent microservices.

## Logical layers
1. **Presentation:** React + Vite pages and reusable components.
2. **API:** Express REST routes, authentication and upload middleware.
3. **Business logic:** project lifecycle, team, task, milestone, submission, review and administration services.
4. **Data access:** repositories that encapsulate SQLite queries and persistence operations.
5. **Database:** one SQLite file on the API service's persistent disk.

Routes should validate HTTP input and delegate domain decisions to services. Services enforce role, department, membership and lifecycle rules. Repositories own SQL statements. The frontend communicates only through REST; it never opens the SQLite file.

## Domain model
The core entities are User, Department, Project, ProjectMember, Task, Milestone, Submission, Feedback and Notification. Administrative use cases add Category, RolePermission, SystemSetting and AuditLog records. Foreign keys are enabled and project membership is unique per project/user pair.

## Roles and access
- **STUDENT:** creates projects, participates in project teams, updates assigned tasks and submits proposals/deliverables.
- **FACULTY:** accesses assigned projects and reviews submissions with feedback.
- **DEPARTMENT_ADMIN:** manages department users/categories and monitors department projects.
- **SYSTEM_ADMIN:** manages system-wide roles, permissions, configuration and audit access.

Project and task access is scoped by ownership, membership, assigned faculty guide, department or system role.

## Project lifecycle
`DRAFT → PROPOSAL_SUBMITTED → UNDER_REVIEW → REVISION_REQUIRED / APPROVED / REJECTED → IN_PROGRESS → COMPLETED`

Proposal submission moves a project to PROPOSAL_SUBMITTED. An authorized guide/admin assigns it for review, moving it to UNDER_REVIEW. Review may approve, request revision or reject. An approved project must be explicitly started before tasks and milestones are managed. Completion requires an approved final deliverable and zero open tasks and milestones.

A deliverable revision or rejection leaves the project IN_PROGRESS so a corrected deliverable can be submitted. Proposal revision/rejection changes the project-level proposal state.

## File handling
Uploads are stored outside the public static directory using generated server-side filenames. The API validates extension/MIME metadata and enforces a 15 MB limit. SQLite stores the generated filename and original display name, not file contents. Downloads require authentication and project access checks.

## API conventions
REST API prefix: `/api`. Authentication uses bearer JWTs. JSON is used for metadata; multipart/form-data is used for submission uploads. Health endpoint: `GET /api/health`.

## Deployment
The client is a static Vite build. The API is a Node web service. SQLite and uploaded files share the API service's persistent disk. Set `CLIENT_URL` to the frontend origin and `VITE_API_URL` to the API base URL ending in `/api`. The Render Blueprint is configuration; deployment and persistence still require live verification.
