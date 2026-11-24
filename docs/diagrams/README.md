# UML diagram reference

This folder is reserved for the UML exports supplied for the CampusFlow design baseline.

The implementation is expected to remain consistent with:
- Use case: Student, Faculty Guide, Department Administrator, System Administrator
- Class: User, Department, Project, ProjectMember, Task, Milestone, Submission, Feedback, Notification
- Package/component: React presentation, REST API, business modules, data access and SQLite
- Deployment: browser/client, Node/Express application server, persistent SQLite file
- Behaviour: project lifecycle state machine and student/faculty activity workflow
- Interactions: authentication, proposal submission/review and deliverable submission/review
- Complex interactions: interaction overview and submission timing

Do not introduce MongoDB, a separate database server, or microservices into this design.
