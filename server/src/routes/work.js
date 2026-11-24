import { Router } from 'express';
import { auth, allow } from '../middleware/auth.js';
import {
  addMilestone, addTask, changeMilestone, changeTask, listReviews, listTasks,
  reviewProjectSubmission, submitProjectWork
} from '../services/workService.js';

const router = Router();
router.use(auth);

router.get('/tasks', (req, res) => res.json({ tasks: listTasks(req.user) }));

router.post('/tasks', (req, res, next) => {
  try {
    if (!req.body.projectId || !req.body.title?.trim()) return res.status(400).json({ error: 'Project and task title are required' });
    const task = addTask(req.user, req.body);
    res.status(201).json({ task });
  } catch (error) { next(error); }
});

router.patch('/tasks/:id', (req, res, next) => {
  try { res.json({ task: changeTask(req.user, Number(req.params.id), req.body) }); }
  catch (error) { next(error); }
});

router.post('/milestones', (req, res, next) => {
  try {
    if (!req.body.projectId || !req.body.title?.trim()) return res.status(400).json({ error: 'Project and milestone title are required' });
    const milestone = addMilestone(req.user, req.body);
    res.status(201).json({ milestone });
  } catch (error) { next(error); }
});

router.patch('/milestones/:id', (req, res, next) => {
  try { res.json({ milestone: changeMilestone(req.user, Number(req.params.id), req.body) }); }
  catch (error) { next(error); }
});

router.get('/reviews', allow('FACULTY', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'), (req, res) => {
  res.json({ submissions: listReviews(req.user) });
});

router.post('/submissions', (req, res, next) => {
  try {
    const submission = submitProjectWork(req.user, req.body);
    res.status(201).json({ submission });
  } catch (error) { next(error); }
});

router.post('/submissions/:id/review', allow('FACULTY', 'DEPARTMENT_ADMIN', 'SYSTEM_ADMIN'), (req, res, next) => {
  try {
    res.json(reviewProjectSubmission(req.user, Number(req.params.id), req.body));
  } catch (error) { next(error); }
});

export default router;
