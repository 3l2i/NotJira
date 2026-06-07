# Security Architecture

This document details the security posture, architecture, and threat mitigation strategies implemented in the Mini-Jira AWS application.

## Network & Infrastructure Security
- **Private Subnets:** EC2 instances running the Node.js backend are isolated in private subnets with no direct internet access.
- **Application Load Balancer (ALB):** Acts as the single public entry point for the API.
- **Security Groups:** EC2 instances only accept traffic originating from the ALB Security Group.
- **NAT Gateway:** Provides controlled, outbound-only internet access for private instances to communicate with AWS APIs (DynamoDB, SNS, etc.).

## Application Security
- **Zero-Trust Authentication:** Cognito JWT tokens are validated on every protected API route using the RS256 algorithm and JWKS endpoints.
- **Rate Limiting:** 
  - `10` authentication attempts per 15 minutes to prevent brute-force attacks.
  - `100` API calls per minute per IP to mitigate application-layer DoS.
- **Strict Headers:** Helmet.js and Nginx enforce `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, and strict `Content-Security-Policy`.
- **CORS Hardening:** Cross-Origin Resource Sharing is strictly limited to the development localhost and the production CloudFront distribution.
- **Input Validation:** All POST/PUT endpoints are validated against strict schemas using **Zod** to prevent NoSQL injection and malformed payload execution.
- **Fingerprint Prevention:** `X-Powered-By` headers are stripped from Express responses.

## Access Control & Authorization
- **Server-Side Tenant Isolation:** Multi-tenancy is enforced server-side. DynamoDB queries mandate the `teamId` partition key, ensuring users cannot query cross-team data (preventing Insecure Direct Object Reference / BOLA).
- **Least Privilege (IAM):** EC2 instances and Lambda functions operate under strict IAM execution roles with granular resource permissions.
- **Presigned URLs:** S3 object access is governed by temporary credentials (5-minute expiry for uploads, 1-hour expiry for reads) rather than public bucket policies.
- **Role-Based Access Control (RBAC):** Middleware checks `custom:role` attributes from Cognito to restrict destructive actions (e.g., deleting tasks) to Managers.

## Data Security & Encryption
- **Data in Transit:** All client-to-server traffic is encrypted via HTTPS (CloudFront & ALB ACM Certificates).
- **Data at Rest:** 
  - DynamoDB tables utilize AWS managed encryption at rest.
  - S3 buckets utilize SSE-S3 encryption.
- **Secret Management:** Sensitive configuration variables are managed via **AWS Systems Manager Parameter Store**, keeping credentials off the EC2 disk.

## Monitoring, Detection, & Auditing
- **Amazon CloudWatch:** Configured with custom dashboards and alarms to monitor system health, Lambda errors, and SQS queue delays.
- **Application Audit Log:** A custom DynamoDB table (`MiniJira_AuditLog`) tracks user actions (status changes, task creation) for non-repudiation and accountability.

## Documentation & Reporting
- **STRIDE Threat Model:** An extensive threat model mapping architecture components against Spoofing, Tampering, Repudiation, Information Disclosure, DoS, and Elevation of Privilege. See [THREAT_MODEL.md](./THREAT_MODEL.md).
- **Security Headers Scan:** Validated via SecurityHeaders.com, achieving an 'A+' grade by enforcing strict policies through CloudFront.
