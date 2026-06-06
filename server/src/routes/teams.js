import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as teamService from '../services/teamService.js';

const router = Router();
router.use(authenticate);

/**
 * GET /api/teams
 * List all teams. All authenticated users can view.
 */
router.get('/', async (_req, res, next) => {
  try {
    const teams = await teamService.getAllTeams();
    res.json({ teams });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/teams/:teamId
 */
router.get('/:teamId', async (req, res, next) => {
  try {
    const team = await teamService.getTeamById(req.params.teamId);
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    res.json({ team });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/teams/:teamId/members
 * Get all members of a team.
 */
router.get('/:teamId/members', async (req, res, next) => {
  try {
    const members = await teamService.getTeamMembers(req.params.teamId);
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/teams
 * Create a new team. Only managers/admins.
 * Body: { name }
 */
router.post('/', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const team = await teamService.createTeam(req.body);
    res.status(201).json({ team });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/teams/:teamId
 * Delete a team. Only managers/admins.
 */
router.delete('/:teamId', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    await teamService.deleteTeam(req.params.teamId);
    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
