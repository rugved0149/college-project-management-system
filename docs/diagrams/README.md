# UML diagram reference

The design baseline was supplied as `pms_updated(1).zip`. It contains these 20 PNG exports:

- `pms_architecture.drawio.png`
- `pms_component.drawio.png`
- `pms_composite_structure.drawio.png`
- `pms_package_structure.drawio.png`
- `pms_package_structure_1.png`
- `pms_deployment.png`
- `pms_class.drawio.png`
- `pms_usecase.drawio.png`
- `pms_profile.drawio.png`
- `pms_state.drawio.png`
- `pms_activity.drawio.png`
- `pms_activity_1.drawio.png`
- `pms_sequence.drawio.png`
- `pms_sequence_1.drawio.png`
- `pms_sequence_2.drawio.png`
- `pms_communication.drawio.png`
- `pms_communication_1.drawio.png`
- `pms_communication_2.drawio.png`
- `pms_interaction.drawio.png`
- `pms_timing.drawio.png`

The original ZIP remains the source for the image exports; individual PNGs have not yet been committed here. See [DIAGRAM_TRACEABILITY.md](../DIAGRAM_TRACEABILITY.md) for the diagram-to-code mapping.

Design constraints:
- Roles: Student, Faculty Guide, Department Administrator, System Administrator.
- Core entities: User, Department, Project, ProjectMember, Task, Milestone, Submission, Feedback, Notification.
- Runtime: React client, Express application server, SQLite persistent database.
- Backend packages: API/routes, business services, repositories/data access, domain rules and database connection.

Do not introduce MongoDB, a separate database server or microservices into this design.
