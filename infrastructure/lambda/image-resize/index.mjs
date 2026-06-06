import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

const s3 = new S3Client({ region: 'eu-north-1' });
const RESIZED_BUCKET = process.env.S3_RESIZED_BUCKET;

export const handler = async (event) => {
  console.log('📸 Image Resize Lambda triggered:', JSON.stringify(event, null, 2));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`🔍 Processing: s3://${bucket}/${key}`);

    try {
      // 1. Download original from S3
      const getResult = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const chunks = [];
      for await (const chunk of getResult.Body) {
        chunks.push(chunk);
      }
      const imageBuffer = Buffer.concat(chunks);

      // 2. Resize to 400x400 thumbnail
      console.log('✂️ Resizing image...');
      const resized = await sharp(imageBuffer)
        .resize(400, 400, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toBuffer();

      // 3. Upload to resized bucket
      console.log(`📤 Uploading to: s3://${RESIZED_BUCKET}/${key}`);
      await s3.send(new PutObjectCommand({
        Bucket: RESIZED_BUCKET,
        Key: key,
        Body: resized,
        ContentType: 'image/jpeg',
      }));

      console.log('✅ Successfully resized and uploaded!');
    } catch (err) {
      console.error(`❌ Error processing ${key}:`, err);
      throw err; // Lambda will retry if we throw an error
    }
  }

  return { statusCode: 200, body: 'Success' };
};
