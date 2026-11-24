import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import {
  addMember, assignGuide, createUserProject, editProject, getProjectForUser,
  listProjects, removeMember, startProject
} from '../services/projectService.js';

const router = Router();
router.use(auth);

router.get('/', (req, res) => res.json({ projects: listProjects(req.user) }));

router.post('/', (req, res, next) => {
  try {
    const project = createUserProject(req.user, req.body);
    res.status(201).json({ project });
  } catch (error) { next(error); }
});

router.get('/:id', (req, res, next) => {
  try { res.json(getProjectForUser(req.user, Number(req.params.id))); }
  catch (error) { next(error); }
});

router.post('/:id/start', (req, res, next) => {
  try { res.json(startProject(req.user, Number(req.params.id))); }
  catch (error) { next(error); }
});

router.patch('/:id', (req, res, next) => {
  try { res.json({ project: editProject(req.user, Number(req.params.id), req.body) }); }
  catch (error) { next(error); }
});

router.post('/:id/members', (req, res, next) => {
  try {
    const member = addMember(req.user, Number(req.params.id), req.body.email);
    res.status(201).json({ member });
  } catch (error) { next(error); }
});

router.delete('/:id/members/:memberId', (req, res, next) => {
  try {
    removeMember(req.user, Number(req.params.id), Number(req.params.memberId));
    res.json({ success: true });
  } catch (error) { next(error); }
});

router.put('/:id/guide', (req, res, next) => {
  try { res.json({ guide: assignGuide(req.user, Number(req.params.id), req.body.email) }); }
  catch (error) { next(error); }
});

export default router;
