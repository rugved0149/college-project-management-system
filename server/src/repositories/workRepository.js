import { db } from '../config/database.js';

export function listTasksForUser(user) {
  return db.prepare(`SELECT t.*, p.title AS project_title
    FROM tasks t JOIN projects p ON p.project_id = t.project_id
    WHERE p.owner_id = ? OR p.guide_id = ? OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = p.project_id AND pm.user_id = ?
    ) ORDER BY t.due_date`).all(user.user_id, user.user_id, user.user_id);
}

export function createTask({ projectId, title, description, dueDate, assigneeId }) {
  const result = db.prepare(`INSERT INTO tasks(project_id, title, description, due_date, assignee_id)
    VALUES (?, ?, ?, ?, ?)`).run(projectId, title, description, dueDate, assigneeId);
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(result.lastInsertRowid);
}

export function updateTask(taskId, { status, assigneeId, dueDate }) {
  db.prepare(`UPDATE tasks SET status = COALESCE(?, status),
    assignee_id = COALESCE(?, assignee_id), due_date = COALESCE(?, due_date)
    WHERE task_id = ?`).run(status, assigneeId, dueDate, taskId);
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
}

export function createMilestone({ projectId, title, dueDate }) {
  const result = db.prepare('INSERT INTO milestones(project_id, title, due_date) VALUES (?, ?, ?)').run(projectId, title, dueDate);
  return db.prepare('SELECT * FROM milestones WHERE milestone_id = ?').get(result.lastInsertRowid);
}

export function updateMilestone(milestoneId, { title, dueDate, isCompleted }) {
  db.prepare(`UPDATE milestones SET title = COALESCE(?, title),
    due_date = COALESCE(?, due_date), is_completed = COALESCE(?, is_completed)
    WHERE milestone_id = ?`).run(title, dueDate, isCompleted, milestoneId);
  return db.prepare('SELECT * FROM milestones WHERE milestone_id = ?').get(milestoneId);
}

export function listReviewsForUser(user) {
  const sql = `SELECT s.*, p.title AS project_title, p.guide_id, p.department_id,
    u.name AS submitter_name FROM submissions s
    JOIN projects p ON p.project_id = s.project_id
    JOIN users u ON u.user_id = s.submitter_id WHERE s.status = 'PENDING'`;
  if (user.role === 'SYSTEM_ADMIN') return db.prepare(sql + ' ORDER BY s.submitted_at').all();
  if (user.role === 'DEPARTMENT_ADMIN') return db.prepare(sql + ' AND p.department_id = ? ORDER BY s.submitted_at').all(user.department_id);
  return db.prepare(sql + ' AND p.guide_id = ? ORDER BY s.submitted_at').all(user.user_id);
}

export function createSubmission({ projectId, submitterId, submissionType, filePath, originalName }) {
  const result = db.prepare(`INSERT INTO submissions(project_id, submitter_id, submission_type, file_path, original_name)
    VALUES (?, ?, ?, ?, ?)`).run(projectId, submitterId, submissionType, filePath, originalName);
  return db.prepare('SELECT * FROM submissions WHERE submission_id = ?').get(result.lastInsertRowid);
}

export function findSubmission(submissionId) {
  return db.prepare('SELECT * FROM submissions WHERE submission_id = ?').get(submissionId);
}

export function reviewSubmission({ submission, reviewerId, decision, comments }) {
  const tx = db.transaction(() => {
    db.prepare('UPDATE submissions SET status = ?, reviewer_id = ? WHERE submission_id = ?')
      .run(decision, reviewerId, submission.submission_id);
    db.prepare('INSERT INTO feedback(submission_id, reviewer_id, comments) VALUES (?, ?, ?)')
      .run(submission.submission_id, reviewerId, comments);
    if (submission.submission_type === 'PROPOSAL') {
      const next = decision === 'APPROVED' ? 'APPROVED' : decision;
      db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
        .run(next, submission.project_id);
    } else if (decision === 'APPROVED') {
      const openTasks = db.prepare("SELECT COUNT(*) AS count FROM tasks WHERE project_id = ? AND status != 'COMPLETED'").get(submission.project_id).count;
      const openMilestones = db.prepare('SELECT COUNT(*) AS count FROM milestones WHERE project_id = ? AND is_completed = 0').get(submission.project_id).count;
      const next = openTasks === 0 && openMilestones === 0 ? 'COMPLETED' : 'IN_PROGRESS';
      db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?').run(next, submission.project_id);
    } else {
      db.prepare('UPDATE projects SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE project_id = ?')
        .run(decision, submission.project_id);
    }
    const owner = db.prepare('SELECT owner_id FROM projects WHERE project_id = ?').get(submission.project_id);
    db.prepare('INSERT INTO notifications(user_id, message) VALUES (?, ?)')
      .run(owner.owner_id, `Your ${submission.submission_type.toLowerCase()} has been reviewed: ${decision.replaceAll('_', ' ').toLowerCase()}.`);
  });
  tx();
}

export function getSubmissionFeedback(submissionId) {
  return db.prepare(`SELECT f.*, u.name AS reviewer_name FROM feedback f
    JOIN users u ON u.user_id = f.reviewer_id WHERE f.submission_id = ? ORDER BY f.created_at`).all(submissionId);
}
