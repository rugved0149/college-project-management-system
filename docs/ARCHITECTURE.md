# CampusFlow architecture

## Architectural decisions
CampusFlow is a layered modular monolith deployed as a client/application/persistent-storage three-tier system. The backend is one Node.js/Express process; its modules are not independent microservices.

## Logical layers
1. Presentation: React + Vite browser application.
2. API: Express REST endpoints and authentication middleware.
3. Business logic: authentication, project lifecycle, work/review and administration routes.
4. Data access: SQLite persistence boundary.
5. Database: one SQLite file on persistent storage.

The database file is accessed only by the backend. Uploaded documents belong in application-managed storage; the database stores file paths and metadata, not file contents.

## Domain model
User, Department, Project, ProjectMember, Task, Milestone, Submission, Feedback and Notification are represented by relational tables. Foreign keys are enabled. Project membership is unique per project/user pair.

## Roles
- STUDENT: creates and participates in projects, manages work and submits proposals/deliverables.
- FACULTY: reviews assigned proposals and deliverables and provides feedback.
- DEPARTMENT_ADMIN: manages department users and reviews project activity.
- SYSTEM_ADMIN: manages system-level access and administration.

## Project lifecycle
DRAFT → PROPOSAL_SUBMITTED → UNDER_REVIEW → REVISION_REQUIRED / APPROVED / REJECTED → IN_PROGRESS → COMPLETED.

A project must not be marked completed merely because tasks are done; final deliverable approval is required. Proposal and deliverable submissions retain separate submission records and feedback.

## API conventions
REST API prefix: /api. Authentication uses bearer JWTs. JSON is used for metadata. File uploads should be stored outside the public static directory with only their metadata/path stored in SQLite.

## Deployment
The client is a static Vite build. The API is a Node web service. SQLite and uploaded files require persistent disk storage attached to the API service. Set CLIENT_URL and VITE_API_URL to the deployed service origins.
