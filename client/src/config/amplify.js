import { Amplify } from 'aws-amplify';

/**
 * Amplify configuration for Cognito Auth.
 * Reads from VITE_ environment variables.
 */
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_APP_CLIENT_ID,
      loginWith: {
        email: true,
      },
      signUpVerificationMethod: 'code',
      userAttributes: {
        email: { required: true },
        name: { required: true },
        'custom:role': { required: false },
        'custom:teamId': { required: false },
      },
    },
  },
};

Amplify.configure(amplifyConfig);

export default amplifyConfig;
