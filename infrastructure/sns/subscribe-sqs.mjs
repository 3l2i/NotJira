import { SNSClient, SubscribeCommand } from '@aws-sdk/client-sns';
import { SQSClient, SetQueueAttributesCommand } from '@aws-sdk/client-sqs';

const sns = new SNSClient({ region: 'eu-north-1' });
const sqs = new SQSClient({ region: 'eu-north-1' });

const SNS_TOPIC_ARN = 'arn:aws:sns:eu-north-1:722867460649:MiniJira-TaskAssignment';
const SQS_QUEUE_ARN = 'arn:aws:sqs:eu-north-1:722867460649:MiniJira-AssignmentQueue';
const SQS_QUEUE_URL = 'https://sqs.eu-north-1.amazonaws.com/722867460649/MiniJira-AssignmentQueue';

async function subscribeSqsToSns() {
  console.log('🔗 Connecting SQS to SNS...');

  try {
    // Step 1: Grant SNS permission to send messages to SQS
    console.log('🔓 Updating SQS Access Policy...');
    const policy = {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Service: 'sns.amazonaws.com' },
        Action: 'sqs:SendMessage',
        Resource: SQS_QUEUE_ARN,
        Condition: {
          ArnEquals: { 'aws:SourceArn': SNS_TOPIC_ARN }
        }
      }]
    };

    await sqs.send(new SetQueueAttributesCommand({
      QueueUrl: SQS_QUEUE_URL,
      Attributes: {
        Policy: JSON.stringify(policy)
      }
    }));
    console.log('✅ SQS policy updated successfully!');

    // Step 2: Subscribe SQS to SNS topic
    console.log('📡 Creating SNS Subscription...');
    const result = await sns.send(new SubscribeCommand({
      TopicArn: SNS_TOPIC_ARN,
      Protocol: 'sqs',
      Endpoint: SQS_QUEUE_ARN
    }));

    console.log('✅ SQS subscribed to SNS topic!');
    console.log('📋 Subscription ARN:', result.SubscriptionArn);

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

subscribeSqsToSns();
