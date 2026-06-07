# Mini-Jira Threat Model (STRIDE)

This document outlines the threat model for the Mini-Jira AWS application using the **STRIDE** methodology.

## Architecture Components Evaluated
1. **CloudFront** (CDN & Frontend Hosting)
2. **Application Load Balancer (ALB)** (Traffic Distribution)
3. **EC2 Instances** (Node.js Backend in Private Subnets)
4. **DynamoDB** (Database)
5. **S3** (Image Attachments)
6. **Cognito** (Authentication & Identity)

---

## 1. Spoofing Identity
*Threat:* An attacker attempts to impersonate a legitimate user or another system component.
* **Cognito / API:** Mitigated by requiring JWT tokens signed with RS256. The Express backend verifies the signature against the Cognito JWKS endpoint on every protected route.
* **CloudFront:** Mitigated by enforcing HTTPS. The origin (ALB) only accepts traffic securely, and AWS Certificate Manager (ACM) manages the SSL/TLS certificates.

## 2. Tampering with Data
*Threat:* An attacker modifies data in transit or at rest.
* **Data in Transit:** Mitigated by end-to-end TLS encryption (HTTPS). 
* **Database (DynamoDB):** Mitigated by AWS managed encryption at rest. Application-layer tampering (e.g., NoSQL injection or malformed payloads) is mitigated by strict **Zod schema validation** on all POST/PUT routes.
* **Storage (S3):** Mitigated by SSE-S3 encryption at rest.

## 3. Repudiation
*Threat:* A user denies performing an action, and the system lacks proof.
* **Application Logic:** Mitigated by the custom `MiniJira_AuditLog` DynamoDB table. Every task creation, status change, and comment is logged with the `actorId`, `actorName`, and exact timestamp.
* **Infrastructure Logging:** Mitigated by comprehensive CloudWatch logs for all Lambda function executions and PM2 application logs on the EC2 instances, ensuring all system events are traceable.

## 4. Information Disclosure
*Threat:* Confidential data is exposed to unauthorized individuals.
* **Cross-Team Data Leakage:** Mitigated by server-enforced team isolation. The backend uses DynamoDB Global Secondary Indexes (GSIs) heavily keyed on `teamId` to ensure users can only ever query data belonging to their verified team.
* **Image Attachments:** Mitigated by keeping S3 buckets private. The application generates **Presigned URLs** with strict, short-lived expirations (5 minutes for uploads, 1 hour for viewing).
* **Environment Variables:** Credentials are not stored on EC2 disks; they are fetched dynamically from **AWS Systems Manager (SSM) Parameter Store** (or injected securely at runtime).

## 5. Denial of Service (DoS)
*Threat:* An attacker exhausts system resources to make the application unavailable.
* **Network Level:** Mitigated by AWS Shield Standard (enabled by default on CloudFront and ALB).
* **Application Level:** Mitigated by **API Rate Limiting** (100 requests/minute per IP) and Auth Rate Limiting (10 attempts/15 minutes) using `express-rate-limit`.
* **Infrastructure Level:** Mitigated by the **Auto Scaling Group (ASG)** which spans 2 Availability Zones and will automatically spin up new instances if CPU utilization spikes or instances fail health checks.

## 6. Elevation of Privilege
*Threat:* An unprivileged user gains administrative access, or a component gains unauthorized permissions.
* **IAM Least-Privilege:** Mitigated by strict IAM roles. EC2 instances only have permission to access specific DynamoDB tables and S3 buckets. Lambda functions only have permissions for exactly what they need (e.g., the Resizer Lambda can only read from Originals and write to Resized).
* **Application Roles:** Handled by Cognito Custom Attributes (`custom:role`). The backend middleware explicitly rejects non-managers from accessing restricted routes (e.g., creating tasks or managing projects) by throwing a 403 Forbidden.
