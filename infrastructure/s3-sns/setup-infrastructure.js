/**
 * infrastructure/s3-sns/setup-infrastructure.js
 *
 * Creates the S3 buckets and SNS topic required by the Mini-Jira backend.
 *
 * What it does:
 *   1. Creates S3 "originals" bucket  (minijira-originals-ali-XXXXXX)
 *   2. Applies CORS policy to originals bucket (allows direct browser uploads)
 *   3. Creates S3 "resized" bucket    (minijira-resized-ali-XXXXXX)
 *   4. Creates SNS topic              (MiniJira-TaskAssignment)
 *   5. Subscribes an email address to the topic (requires inbox confirmation)
 *
 * Usage: node infrastructure/s3-sns/setup-infrastructure.js
 * Requires: AWS credentials configured (aws configure) + .env with AWS_REGION
 *
 * After running, copy the output values into server/.env
 */

import 'dotenv/config';
import { S3Client, CreateBucketCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { SNSClient, CreateTopicCommand, SubscribeCommand } from '@aws-sdk/client-sns';

const region = process.env.AWS_REGION || 'eu-north-1';
const s3Client = new S3Client({ region });
const snsClient = new SNSClient({ region });

// Bucket names must be globally unique — appending a timestamp suffix guarantees this
const uniqueId = Date.now().toString().slice(-6);
const originalsBucket = `minijira-originals-ali-${uniqueId}`;
const resizedBucket   = `minijira-resized-ali-${uniqueId}`;
const notificationEmail = 'aliabdallah12376@gmail.com';

async function run() {
  console.log('🚀 Starting AWS S3 & SNS Setup...\n');

  try {
    // ── 1. Create S3 Originals Bucket ───────────────────────────────────────
    console.log(`Creating S3 bucket: ${originalsBucket}...`);
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: originalsBucket,
        CreateBucketConfiguration: { LocationConstraint: region },
      })
    );

    // ── 2. Apply CORS to Originals (allows React frontend to PUT directly) ──
    console.log(`Enabling CORS for ${originalsBucket}...`);
    await s3Client.send(
      new PutBucketCorsCommand({
        Bucket: originalsBucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
            },
          ],
        },
      })
    );

    // ── 3. Create S3 Resized Bucket ─────────────────────────────────────────
    console.log(`Creating S3 bucket: ${resizedBucket}...`);
    await s3Client.send(
      new CreateBucketCommand({
        Bucket: resizedBucket,
        CreateBucketConfiguration: { LocationConstraint: region },
      })
    );

    // ── 4. Create SNS Topic ─────────────────────────────────────────────────
    console.log('Creating SNS Topic: MiniJira-TaskAssignment...');
    const topicRes = await snsClient.send(
      new CreateTopicCommand({ Name: 'MiniJira-TaskAssignment' })
    );
    const topicArn = topicRes.TopicArn;

    // ── 5. Subscribe Email ──────────────────────────────────────────────────
    console.log(`Subscribing ${notificationEmail} to SNS Topic...`);
    await snsClient.send(
      new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: 'email',
        Endpoint: notificationEmail,
      })
    );

    // ── 6. Print results ────────────────────────────────────────────────────
    console.log('\n✅ Infrastructure Setup Complete!');
    console.log('\n─── COPY THESE INTO server/.env ───────────────────────────');
    console.log(`S3_ORIGINALS_BUCKET=${originalsBucket}`);
    console.log(`S3_RESIZED_BUCKET=${resizedBucket}`);
    console.log(`SNS_TASK_ASSIGNMENT_TOPIC_ARN=${topicArn}`);
    console.log('────────────────────────────────────────────────────────────\n');
    console.log(`📧 Check inbox at ${notificationEmail} and click "Confirm Subscription"!`);
  } catch (err) {
    console.error('❌ Error during setup:', err.message);
    process.exit(1);
  }
}

run();
