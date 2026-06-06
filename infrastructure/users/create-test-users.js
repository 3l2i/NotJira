/**
 * infrastructure/users/create-test-users.js
 *
 * Provisions the three test users required for Mini-Jira API testing:
 *   - Ali Manager    (ali@minijira.com)       role: manager,  no teamId
 *   - Sara Employee  (sara@minijira.com)       role: employee, teamId: frontend-id
 *   - Omar Employee  (omar@minijira.com)       role: employee, teamId: backend-id
 *
 * Usage: node infrastructure/users/create-test-users.js
 * Requires: AWS credentials configured (aws configure) + .env with COGNITO_USER_POOL_ID
 */

import 'dotenv/config';
import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
} from '@aws-sdk/client-cognito-identity-provider';

const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});
const userPoolId = process.env.COGNITO_USER_POOL_ID;

async function createTestUser(email, name, role, teamId) {
  try {
    console.log(`Creating ${name} (${email})...`);

    const attributes = [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: name },
      { Name: 'custom:role', Value: role },
    ];
    if (teamId) {
      attributes.push({ Name: 'custom:teamId', Value: teamId });
    }

    await client.send(
      new AdminCreateUserCommand({
        UserPoolId: userPoolId,
        Username: email,
        MessageAction: 'SUPPRESS', // Don't send a Cognito welcome email
        UserAttributes: attributes,
      })
    );

    // Instantly set a permanent password — bypasses FORCE_CHANGE_PASSWORD challenge
    await client.send(
      new AdminSetUserPasswordCommand({
        UserPoolId: userPoolId,
        Username: email,
        Password: 'Password123!',
        Permanent: true,
      })
    );

    console.log(`✅ ${name} created successfully.`);
  } catch (err) {
    if (err.name === 'UsernameExistsException') {
      console.log(`⚠️  User ${email} already exists — skipping.`);
    } else {
      console.error(`❌ Failed to create ${email}:`, err.message);
    }
  }
}

async function run() {
  if (!userPoolId) {
    console.error('❌ COGNITO_USER_POOL_ID is missing in .env');
    process.exit(1);
  }

  console.log(`Using User Pool: ${userPoolId}\n`);

  await createTestUser('ali@minijira.com', 'Ali Manager', 'manager', null);
  await createTestUser('sara@minijira.com', 'Sara Employee', 'employee', 'frontend-id');
  await createTestUser('omar@minijira.com', 'Omar Employee', 'employee', 'backend-id');

  console.log('\n🎉 All test users created and verified!');
}

run();
