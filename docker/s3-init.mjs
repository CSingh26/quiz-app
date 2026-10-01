import { S3Client, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
const client = new S3Client({ endpoint: process.env.S3_ENDPOINT, region: process.env.S3_REGION || 'us-east-1', forcePathStyle: true, maxAttempts: 3 });
try {
  for (const Bucket of (process.env.S3_INIT_BUCKETS || 'quizbee-materials').split(',')) {
    try { await client.send(new HeadBucketCommand({ Bucket }), { abortSignal: AbortSignal.timeout(15000) }); }
    catch (error) {
      if (error.$metadata?.httpStatusCode !== 404) throw error;
      await client.send(new CreateBucketCommand({ Bucket }), { abortSignal: AbortSignal.timeout(15000) });
    }
  }
  console.log('Private local object-storage buckets are ready.');
} catch { console.error('Object storage initialization failed. Check service availability and credentials.'); process.exitCode = 1; }
finally { client.destroy(); }
