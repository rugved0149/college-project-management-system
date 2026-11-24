import { db } from '../config/database.js';

export function listProjectsForUser(user) {
  const base = `SELECT p.*, c.name AS category_name, u.name AS owner_name,
    (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.project_id) AS member_count
    FROM projects p JOIN users u ON u.user_id = p.owner_id LEFT JOIN categories c ON c.category_id = p.category_id`;
  if (user.role === 'SYSTEM_ADMIN') return db.prepare(`${base} ORDER BY p.updated_at DESC`).all();
  if (user.role === 'DEPARTMENT_ADMIN') return db.prepare(`${base} WHERE p.department_id = ? ORDER BY p.updated_at DESC`).all(user.department_id);
  if (user.role === 'FACULTY') return db.prepare(`${base} WHERE p.guide_id = ? ORDER BY p.updated_at DESC`).all(user.user_id);
  return db.prepare(`${base} WHERE p.owner_id = ? OR EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = ?
  ) ORDER BY p.updated_at DESC`).all(user.user_id, user.user_id);
}

export function findProject(projectId) {
  return db.prepare('SELECT p.*, c.name AS category_name, g.name AS guide_name FROM projects p LEFT JOIN categories c ON c.category_id=p.category_id LEFT JOIN users g ON g.user_id=p.guide_id WHERE p.project_id = ?').get(projectId);
}

export function isProjectMember(projectId, userId) {
  return Boolean(db.prepare('SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, userId));
}

export function canViewProject(project, user) {
  if (!project) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (user.role === 'DEPARTMENT_ADMIN') return project.department_id === user.department_id;
  if (user.role === 'FACULTY') return project.guide_id === user.user_id;
  return project.owner_id === user.user_id || isProjectMember(project.project_id, user.user_id);
}

export function canManageProject(project, user) {
  if (!project) return false;
  if (user.role === 'SYSTEM_ADMIN') return true;
  if (user.role === 'DEPARTMENT_ADMIN') return project.department_id === user.department_id;
  return project.owner_id === user.user_id || (user.role === 'FACULTY' && project.guide_id === user.user_id);
}

export function getProjectWorkspace(projectId) {
  const project = findProject(projectId);
  if (!project) return null;
  const members = db.prepare(`SELECT u.user_id, u.name, u.email, u.role
    FROM project_members pm JOIN users u ON u.user_id = pm.user_id
    WHERE pm.project_id = ? ORDER BY pm.joined_at`).all(projectId);
  const tasks = db.prepare(`SELECT t.*, u.name AS assignee_name
    FROM tasks t LEFT JOIN users u ON u.user_id = t.assignee_id
    WHERE t.project_id = ? ORDER BY t.task_id DESC`).all(projectId);
  const milestones = db.prepare('SELECT * FROM milestones WHERE project_id = ? ORDER BY due_date').all(projectId);
  const submissions = db.prepare(`SELECT s.*, u.name AS submitter_name
    FROM submissions s JOIN users u ON u.user_id = s.submitter_id
    WHERE s.project_id = ? ORDER BY s.submitted_at DESC`).all(projectId);
  const feedback = db.prepare(`SELECT f.*, u.name AS reviewer_name, s.submission_type
    FROM feedback f JOIN submissions s ON s.submission_id = f.submission_id
    JOIN users u ON u.user_id = f.reviewer_id WHERE s.project_id = ? ORDER BY f.created_at DESC`).all(projectId);
  return { project, members, tasks, milestones, submissions, feedback };
}

export function createProject({ title, description, userId, categoryId = null }) {
  const result = db.prepare(`INSERT INTO projects(title, description, owner_id, department_id, category_id)
    VALUES (?, ?, ?, (SELECT department_id FROM users WHERE user_id = ?), ?)`)
    .run(title, description, userId, userId, categoryId);
  db.prepare('INSERT INTO project_members(project_id, user_id) VALUES (?, ?)').run(result.lastInsertRowid, userId);
  return findProject(result.lastInsertRowid);
}

export function updateProjectDetails(projectId, { title, description }) {
  db.prepare(`UPDATE projects SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP
    WHERE project_id = ?`).run(title, description, projectId);
  return findProject(projectId);
}

export function addProjectMember(projectId, userId) {
  db.prepare('INSERT INTO project_members(project_id, user_id) VALUES (?, ?)').run(projectId, userId);
}

export function removeProjectMember(projectId, userId) {
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
}

export function findUserByEmail(email) {
  return db.prepare('SELECT user_id, name, email, role, department_id, is_active FROM users WHERE email = ?').get(email);
}

export function notifyUser(userId, message) {
  db.prepare('INSERT INTO notifications(user_id, message) VALUES (?, ?)').run(userId, message);
}

export function notifyProjectMembers(projectId, message, exceptUserId = null) {
  const members = db.prepare('SELECT user_id FROM project_members WHERE project_id = ?').all(projectId);
  const insert = db.prepare('INSERT INTO notifications(user_id, message) VALUES (?, ?)');
  const tx = db.transaction(() => members.forEach(member => {
    if (member.user_id !== exceptUserId) insert.run(member.user_id, message);
  }));
  tx();
}

export function setProjectGuide(projectId, guideId) {
  db.prepare('UPDATE projects SET guide_id = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?').run(guideId, projectId);
}

export function listProjectMembers(projectId) {
  return db.prepare('SELECT user_id FROM project_members WHERE project_id = ?').all(projectId);
}

export function setProjectStatus(projectId, status) {
  db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?').run(status, projectId);
}

export function findActiveCategory(categoryId, departmentId) {
  return db.prepare('SELECT category_id FROM categories WHERE category_id = ? AND is_active = 1 AND (department_id = ? OR department_id IS NULL)')
    .get(categoryId, departmentId);
}

export function listActiveCategoriesForDepartment(departmentId) {
  return db.prepare('SELECT category_id,name,description FROM categories WHERE is_active=1 AND (department_id=? OR department_id IS NULL) ORDER BY name').all(departmentId);
}
