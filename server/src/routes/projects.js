import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as projectService from '../services/projectService.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/projects
 * List all projects. All authenticated users can view.
 */
router.get('/', async (_req, res, next) => {
  try {
    const projects = await projectService.getAllProjects();
    res.json({ projects });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:projectId
 */
router.get('/:projectId', async (req, res, next) => {
  try {
    const project = await projectService.getProjectById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects
 * Create a new project. Only managers.
 * Body: { name, description }
 */
router.post('/', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const project = await projectService.createProject({
      ...req.body,
      managerId: req.user.userId,
    });
    res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/projects/:projectId
 * Update a project. Only managers.
 */
router.put('/:projectId', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const project = await projectService.updateProject(req.params.projectId, req.body);
    res.json({ project });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/projects/:projectId
 * Delete a project. Only managers.
 */
router.delete('/:projectId', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    await projectService.deleteProject(req.params.projectId);
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
