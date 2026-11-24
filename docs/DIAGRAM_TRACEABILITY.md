# UML diagram-to-implementation traceability

This matrix tracks the supplied QPP diagram set against the current CampusFlow implementation. "Partial" means the model contains more detail than the current application or the feature is represented only at API/schema level.

| Diagram | Main design intent | Implementation mapping | Status |
|---|---|---|---|
| Use case | Student, Faculty Guide, Department Administrator and System Administrator workflows | Authentication, projects, teams, tasks, milestones, submissions, reviews, feedback, people administration, reports, categories, settings, permissions and audit console | Partial |
| Class | User, Department, Project, ProjectMember, Submission, Task, Milestone, Feedback and Notification entities | SQLite relational schema and project/work repositories; Category, RolePermission, SystemSetting and AuditLog added for administrative use cases | Partial |
| State | Project proposal, review, revision, approval, execution and completion transitions | Project and submission services enforce proposal/review states; final completion guard checks tasks, milestones and final deliverable approval | Implemented core transitions |
| Activity | End-to-end project proposal and delivery workflows | Project and work services coordinate creation, submission, review, feedback and completion | Partial; compare each branch against the activity export |
| Activity 1 | Alternate task/deliverable workflow | Task, milestone and submission services | Partial |
| Sequence | User-to-application project interactions | React client, Express routes, services, repositories and SQLite | Partial |
| Sequence 1 | Submission and review interaction | Submission and review service methods, feedback records and notifications | Partial |
| Sequence 2 | Administrative interaction | Admin routes and administration console | Partial |
| Communication | Object collaboration in the main project workflow | Modular route/service/repository boundaries | Partial |
| Communication 1 | Submission/review object collaboration | Work service and repository methods | Partial |
| Communication 2 | Administration object collaboration | Admin route, database and audit records | Partial |
| Interaction overview | High-level interaction between workflows | Route/service composition across auth, projects, work and admin modules | Partial |
| Timing | Time-related state changes | Created/updated/submitted timestamps and due dates; no dedicated timing scheduler | Partial |
| Package structure | Logical application package boundaries | Client pages/components; server routes, services, repositories, middleware and database | Implemented structure |
| Package structure 1 | Alternate package organization view | Same modular-monolith package layout | Partial |
| Component | Runtime software components and dependencies | React/Vite client, Express API, SQLite persistence and file-upload middleware | Implemented core components |
| Composite structure | Internal collaboration of a subsystem | Service/repository decomposition and middleware composition | Partial |
| Architecture | Overall system organization | Layered modular monolith: presentation, API/routes, services, repositories/data access, SQLite | Implemented core architecture |
| Deployment | Runtime nodes and deployment mapping | Render web services, static frontend, API service and persistent storage configuration | Configuration present; deployment not yet verified |
| Profile | Domain-specific UML stereotypes and constraints | Application roles, workflow states, role permissions and validation constraints | Partial |

## Important reconciliation notes

- The class diagram's `ProjectStatus` enum omits `UNDER_REVIEW` and `REVISION_REQUIRED`, while the state diagram requires those transitions. The implementation retains both states to preserve the modeled review workflow.
- Category management is present in the administrative console and projects can be assigned an active category belonging to their department (or a global category).
- Role-permission records are checked for category-management API access. Other authorization paths still use role and ownership checks in their service methods.
- Audit records currently cover successful authentication and the new administrative changes. Extend audit coverage to all security-sensitive project, submission and file-access actions before production.
- The Render Blueprint is deployment configuration, not proof of a successful production deployment.
