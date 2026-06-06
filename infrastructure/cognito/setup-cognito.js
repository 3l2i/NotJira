/**
 * ═══════════════════════════════════════════════════════════════
 * Cognito User Pool Setup Script — Mini-Jira on AWS
 * ═══════════════════════════════════════════════════════════════
 *
 * Creates:
 *   1. A Cognito User Pool with email-based sign-in
 *   2. Custom attributes: custom:role, custom:teamId
 *   3. An App Client with USER_PASSWORD_AUTH flow enabled
 *
 * Usage:
 *   node infrastructure/cognito/setup-cognito.js
 *
 * After running, copy the output values into your .env file:
 *   COGNITO_USER_POOL_ID=...
 *   COGNITO_APP_CLIENT_ID=...
 * ═══════════════════════════════════════════════════════════════
 */

import {
  CognitoIdentityProviderClient,
  CreateUserPoolCommand,
  CreateUserPoolClientCommand,
  DescribeUserPoolCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const REGION = 'eu-north-1';
const client = new CognitoIdentityProviderClient({ region: REGION });

async function createUserPool() {
  console.log('📦 Creating Cognito User Pool...');

  const command = new CreateUserPoolCommand({
    PoolName: 'MiniJira-UserPool',

    // Sign-in configuration
    UsernameAttributes: ['email'], // Users sign in with their email
    AutoVerifiedAttributes: ['email'], // Auto-verify email

    // Password policy
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: false, // Keep it simpler for demo
        TemporaryPasswordValidityDays: 7,
      },
    },

    // Email verification
    VerificationMessageTemplate: {
      DefaultEmailOption: 'CONFIRM_WITH_CODE',
      EmailSubject: 'Mini-Jira — Verify Your Email',
      EmailMessage: 'Your Mini-Jira verification code is: {####}',
    },

    // Schema: standard + custom attributes
    Schema: [
      {
        Name: 'email',
        AttributeDataType: 'String',
        Required: true,
        Mutable: true,
      },
      {
        Name: 'name',
        AttributeDataType: 'String',
        Required: true,
        Mutable: true,
      },
      // ─── Custom Attributes ─────────────────────────
      {
        Name: 'role',
        AttributeDataType: 'String',
        Mutable: true,
        StringAttributeConstraints: {
          MinLength: '1',
          MaxLength: '20',
        },
      },
      {
        Name: 'teamId',
        AttributeDataType: 'String',
        Mutable: true,
        StringAttributeConstraints: {
          MinLength: '0',
          MaxLength: '50',
        },
      },
    ],

    // Account recovery
    AccountRecoverySetting: {
      RecoveryMechanisms: [
        { Name: 'verified_email', Priority: 1 },
      ],
    },

    // Admin settings
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: false, // Allow self-registration
    },

    // MFA — disabled for demo simplicity
    MfaConfiguration: 'OFF',
  });

  const result = await client.send(command);
  const poolId = result.UserPool.Id;

  console.log(`✅ User Pool created: ${poolId}`);
  return poolId;
}

async function createAppClient(userPoolId) {
  console.log('📦 Creating App Client...');

  const command = new CreateUserPoolClientCommand({
    UserPoolId: userPoolId,
    ClientName: 'MiniJira-WebApp',

    // Auth flows
    ExplicitAuthFlows: [
      'ALLOW_USER_PASSWORD_AUTH',    // For login form
      'ALLOW_REFRESH_TOKEN_AUTH',    // For session refresh
      'ALLOW_USER_SRP_AUTH',         // For Amplify compatibility
    ],

    // Token validity
    AccessTokenValidity: 1,    // 1 hour
    IdTokenValidity: 1,        // 1 hour
    RefreshTokenValidity: 30,  // 30 days
    TokenValidityUnits: {
      AccessToken: 'hours',
      IdToken: 'hours',
      RefreshToken: 'days',
    },

    // No client secret — needed for browser-based apps
    GenerateSecret: false,

    // Readable attributes (what the client can read from tokens)
    ReadAttributes: [
      'email',
      'name',
      'custom:role',
      'custom:teamId',
    ],

    // Writable attributes (what the client can set during signup)
    WriteAttributes: [
      'email',
      'name',
      'custom:role',
      'custom:teamId',
    ],

    PreventUserExistenceErrors: 'ENABLED', // Don't leak if user exists
  });

  const result = await client.send(command);
  const clientId = result.UserPoolClient.ClientId;

  console.log(`✅ App Client created: ${clientId}`);
  return clientId;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   Mini-Jira Cognito Setup                        ║');
  console.log('║   Region: eu-north-1                              ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log();

  try {
    const userPoolId = await createUserPool();
    const appClientId = await createAppClient(userPoolId);

    console.log();
    console.log('═══════════════════════════════════════════════════');
    console.log('  🎉 COGNITO SETUP COMPLETE!');
    console.log('═══════════════════════════════════════════════════');
    console.log();
    console.log('  Add these to your .env files:');
    console.log();
    console.log(`  COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`  COGNITO_APP_CLIENT_ID=${appClientId}`);
    console.log();
    console.log('  For the React client (VITE env vars):');
    console.log();
    console.log(`  VITE_COGNITO_USER_POOL_ID=${userPoolId}`);
    console.log(`  VITE_COGNITO_APP_CLIENT_ID=${appClientId}`);
    console.log(`  VITE_COGNITO_REGION=${REGION}`);
    console.log();
    console.log('  Custom Attributes Added:');
    console.log('  ─────────────────────────');
    console.log('  • custom:role   → "manager" | "employee" | "admin"');
    console.log('  • custom:teamId → UUID of the assigned team');
    console.log();
    console.log('  Password Policy:');
    console.log('  ─────────────────────────');
    console.log('  • Min 8 characters');
    console.log('  • Uppercase + lowercase + numbers required');
    console.log('  • Symbols NOT required (simpler for demo)');
    console.log('═══════════════════════════════════════════════════');
  } catch (err) {
    if (err.name === 'ResourceNotFoundException') {
      console.error('❌ AWS credentials not configured. Run `aws configure` first.');
    } else {
      console.error('💥 Setup failed:', err.message);
    }
    process.exit(1);
  }
}

main();
