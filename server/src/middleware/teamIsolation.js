/**
 * Team Isolation Middleware
 *
 * ⚠️ CRITICAL SECURITY REQUIREMENT:
 * Employees must ONLY access tasks belonging to their own team.
 * This is enforced server-side — not just hidden in the UI.
 *
 * Managers can access all teams' data (they are not bound to a team).
 */

/**
 * Ensures an employee can only access resources for their own team.
 * Managers bypass this check entirely.
 *
 * Usage: router.get('/tasks', authenticate, enforceTeamIsolation, handler)
 *
 * For GET requests: injects teamId into req.query
 * For POST/PUT requests: validates teamId in req.body
 */
export const enforceTeamIsolation = (req, res, next) => {
  // Managers can access all teams
  if (req.user.role === 'manager' || req.user.role === 'admin') {
    return next();
  }

  const userTeamId = req.user.teamId;

  if (!userTeamId) {
    return res.status(403).json({
      error: 'No team assigned',
      message: 'You must be assigned to a team to access tasks.',
    });
  }

  // For GET requests — force the query to the user's team
  if (req.method === 'GET') {
    req.query.teamId = userTeamId;
    return next();
  }

  // For POST/PUT/PATCH — validate that the body's teamId matches
  if (req.body && req.body.teamId && req.body.teamId !== userTeamId) {
    return res.status(403).json({
      error: 'Team isolation violation',
      message: 'You cannot create or modify tasks for another team.',
    });
  }

  // Inject the user's teamId if not provided
  if (req.body) {
    req.body.teamId = userTeamId;
  }

  next();
};

/**
 * Validates that the requesting user has access to a specific task.
 * Used for single-task operations (GET /tasks/:id, PUT /tasks/:id).
 *
 * This checks the task's teamId against the user's teamId AFTER
 * fetching the task from DynamoDB. The task object should be
 * attached to req.task by the service layer.
 */
export const validateTaskAccess = (req, res, next) => {
  // Managers can access any task
  if (req.user.role === 'manager' || req.user.role === 'admin') {
    return next();
  }

  const task = req.task;
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  if (task.teamId !== req.user.teamId) {
    // ⚠️ Return 404, not 403, to avoid leaking task existence
    return res.status(404).json({ error: 'Task not found' });
  }

  next();
};
