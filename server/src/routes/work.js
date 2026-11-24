import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { auth, allow } from '../middleware/auth.js';
import { recordAudit } from '../services/auditService.js';
import { submissionUpload } from '../middleware/upload.js';
import {
  addMilestone, addTask, assignSubmissionForReview, changeMilestone, changeTask, listReviews, listTasks,
  getSubmissionFile, listMilestones, reviewProjectSubmission, submitProjectWork
} from '../services/workService.js';

const router = Router();
router.use(auth);

router.get('/tasks', (req, res) => res.json({ tasks: listTasks(req.user) }));
router.get('/milestones', (req, res) => res.json({ milestones: listMilestones(req.user) }));

router.post('/tasks', (req, res, next) => {
  try {
    if (!req.body.projectId || !req.body.title?.trim()) return res.status(400).json({ error: 'Project and task title are required' });
    const task = addTask(req.user, req.body);
    recordAudit(req.user, req, 'TASK_CREATED', 'TASK', task.task_id, { project_id: task.project_id, title: task.title });
    res.status(201).json({ task });
  } catch (error) { next(error); }
});

router.patch('/tasks/:id', (req, res, next) => {
  try { const task = changeTask(req.user, Number(req.params.id), req.body); recordAudit(req.user, req, 'TASK_UPDATED', 'TASK', req.params.id, { status: task.status }); res.json({ task }); }
  catch (error) { next(error); }
});

router.post('/milestones', (req, res, next) => {
  try {
    if (!req.body.projectId || !req.body.title?.trim()) return res.status(400).json({ error: 'Project and milestone title are required' });
    const milestone = addMilestone(req.user, req.body);
    recordAudit(req.user, req, 'MILESTONE_CREATED', 'MILESTONE', milestone.milestone_id, { project_id: milestone.project_id, title: milestone.title });
    res.status(201).json({ milestone });
  } catch (error) { next(error); }
});

router.patch('/milestones/:id', (req, res, next) => {
  try { const milestone = changeMilestone(req.user, Number(req.params.id), req.body); recordAudit(req.user, req, 'MILESTONE_UPDATED', 'MILESTONE', req.params.id, { is_completed: milestone.is_completed }); res.json({ milestone }); }
  catch (error) { next(error); }
});

router.get('/reviews', allow('FACULTY', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  res.json({ submissions: listReviews(req.user) });
});

router.post('/submissions', submissionUpload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Attach a proposal or deliverable file before submitting' });
    const submission = submitProjectWork(req.user, { ...req.body, filePath: req.file.filename, originalName: req.file.originalname });
    recordAudit(req.user, req, 'SUBMISSION_CREATED', 'SUBMISSION', submission.submission_id, { project_id: submission.project_id, submission_type: submission.submission_type });
    res.status(201).json({ submission });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(error);
  }
});

router.get('/submissions/:id/file', (req, res, next) => {
  try {
    const file = getSubmissionFile(req.user, Number(req.params.id));
    const uploadRoot = path.resolve(process.env.UPLOAD_DIR || './storage/uploads');
    const filePath = path.resolve(uploadRoot, path.basename(file.fileName));
    if (!filePath.startsWith(uploadRoot + path.sep) || !fs.existsSync(filePath)) return res.status(404).json({ error: 'Submission file not found' });
    recordAudit(req.user, req, 'SUBMISSION_FILE_DOWNLOADED', 'SUBMISSION', req.params.id);
    res.download(filePath, path.basename(file.originalName));
  } catch (error) { next(error); }
});

router.post('/submissions/:id/assign-review', allow('FACULTY', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'), (req, res, next) => {
  try { const result = assignSubmissionForReview(req.user, Number(req.params.id)); recordAudit(req.user, req, 'SUBMISSION_ASSIGNED_FOR_REVIEW', 'SUBMISSION', req.params.id); res.json(result); }
  catch (error) { next(error); }
});

router.post('/submissions/:id/review', allow('FACULTY', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'), (req, res, next) => {
  try {
    const result = reviewProjectSubmission(req.user, Number(req.params.id), req.body); recordAudit(req.user, req, 'SUBMISSION_REVIEWED', 'SUBMISSION', req.params.id, { decision: req.body.decision }); res.json(result);
  } catch (error) { next(error); }
});

export default router;
