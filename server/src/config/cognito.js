// Cognito configuration — used by the auth middleware to validate JWTs
// and by auth routes to proxy sign-up / sign-in calls

export const cognitoConfig = {
  region: process.env.AWS_REGION || 'eu-north-1',
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  appClientId: process.env.COGNITO_APP_CLIENT_ID,

  // Derived values
  get issuer() {
    return `https://cognito-idp.${this.region}.amazonaws.com/${this.userPoolId}`;
  },
  get jwksUri() {
    return `${this.issuer}/.well-known/jwks.json`;
  },
};
