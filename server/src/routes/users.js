import { Router } from 'express';
import {
  CognitoIdentityProviderClient,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as userService from '../services/userService.js';
import { cognitoConfig } from '../config/cognito.js';

const router = Router();
router.use(authenticate);

const cognitoClient = new CognitoIdentityProviderClient({ region: cognitoConfig.region });

/**
 * GET /api/users
 * List all users. Managers can see all, employees see their team.
 */
router.get('/', async (req, res, next) => {
  try {
    let users;
    if (req.user.role === 'manager' || req.user.role === 'admin') {
      users = await userService.getAllUsers();
    } else {
      users = await userService.getUsersByTeam(req.user.teamId);
    }
    res.json({ users });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/users/:userId
 */
router.get('/:userId', async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/users/:userId/team
 * Assign a user to a team. Only managers/admins.
 * Updates BOTH DynamoDB (for fast lookups) and Cognito (so new tokens are correct).
 * Body: { teamId }
 */
router.put('/:userId/team', requireRole('manager', 'admin'), async (req, res, next) => {
  try {
    const { teamId } = req.body;
    if (!teamId) {
      return res.status(400).json({ error: 'Missing required field: teamId' });
    }

    // 1. Update DynamoDB local cache
    const user = await userService.assignUserToTeam(req.params.userId, teamId);

    // 2. Update Cognito so the user's next token carries the new custom:teamId
    try {
      await cognitoClient.send(
        new AdminUpdateUserAttributesCommand({
          UserPoolId: cognitoConfig.userPoolId,
          Username: user.email,
          UserAttributes: [{ Name: 'custom:teamId', Value: teamId }],
        })
      );
    } catch (cognitoErr) {
      // Log but don't fail — DynamoDB is updated, Cognito will sync on next login
      console.error('⚠️ Failed to update Cognito teamId:', cognitoErr.message);
    }

    res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;

