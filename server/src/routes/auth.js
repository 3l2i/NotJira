import { Router } from 'express';
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  InitiateAuthCommand,
  ConfirmSignUpCommand,
  GetUserCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoConfig } from '../config/cognito.js';
import * as userService from '../services/userService.js';

const router = Router();
const cognitoClient = new CognitoIdentityProviderClient({
  region: cognitoConfig.region,
});

/**
 * POST /api/auth/signup
 * Register a new user with Cognito.
 * Body: { email, password, name, role, teamId }
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, role = 'employee', teamId } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Missing required fields: email, password, name',
      });
    }

    const userAttributes = [
      { Name: 'email', Value: email },
      { Name: 'name', Value: name },
      { Name: 'custom:role', Value: role },
    ];

    if (teamId) {
      userAttributes.push({ Name: 'custom:teamId', Value: teamId });
    }

    const command = new SignUpCommand({
      ClientId: cognitoConfig.appClientId,
      Username: email,
      Password: password,
      UserAttributes: userAttributes,
    });

    const result = await cognitoClient.send(command);

    res.status(201).json({
      message: 'User registered successfully. Please check your email for verification code.',
      userId: result.UserSub,
      confirmed: result.UserConfirmed,
    });
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    if (err.name === 'InvalidPasswordException') {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

/**
 * POST /api/auth/confirm
 * Confirm user registration with the verification code.
 * Body: { email, code }
 */
router.post('/confirm', async (req, res, next) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing required fields: email, code' });
    }

    const command = new ConfirmSignUpCommand({
      ClientId: cognitoConfig.appClientId,
      Username: email,
      ConfirmationCode: code,
    });

    await cognitoClient.send(command);

    res.json({ message: 'Email verified successfully. You can now sign in.' });
  } catch (err) {
    if (err.name === 'CodeMismatchException') {
      return res.status(400).json({ error: 'Invalid verification code.' });
    }
    if (err.name === 'ExpiredCodeException') {
      return res.status(400).json({ error: 'Verification code has expired.' });
    }
    next(err);
  }
});

/**
 * POST /api/auth/login
 * Sign in an existing user.
 * Body: { email, password }
 * Returns: { idToken, accessToken, refreshToken }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields: email, password' });
    }

    const command = new InitiateAuthCommand({
      ClientId: cognitoConfig.appClientId,
      AuthFlow: 'USER_PASSWORD_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    });

    const result = await cognitoClient.send(command);

    res.json({
      idToken: result.AuthenticationResult.IdToken,
      accessToken: result.AuthenticationResult.AccessToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
    });
  } catch (err) {
    if (err.name === 'NotAuthorizedException') {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (err.name === 'UserNotConfirmedException') {
      return res.status(403).json({ error: 'Please verify your email before signing in.' });
    }
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Get current user info from Cognito using the access token.
 * Requires: Bearer token (access token)
 */
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization header' });
    }

    const accessToken = authHeader.split(' ')[1];

    const command = new GetUserCommand({ AccessToken: accessToken });
    const result = await cognitoClient.send(command);

    // Parse user attributes into a clean object
    const attributes = {};
    for (const attr of result.UserAttributes) {
      attributes[attr.Name] = attr.Value;
    }

    const userData = {
      userId: attributes.sub,
      email: attributes.email,
      name: attributes.name,
      role: attributes['custom:role'] || 'employee',
      teamId: attributes['custom:teamId'] || null,
    };

    // ⚠️ CRITICAL: Sync user to DynamoDB local cache so they appear in team queries
    await userService.upsertUser(userData);

    res.json(userData);
  } catch (err) {
    if (err.name === 'NotAuthorizedException') {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
    next(err);
  }
});

export default router;
