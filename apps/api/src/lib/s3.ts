import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

let client: S3Client | undefined;

function getS3Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.AWS_REGION ?? 'us-east-1',
      endpoint: process.env.AWS_ENDPOINT_URL,
      forcePathStyle: Boolean(process.env.AWS_ENDPOINT_URL),
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
          }
        : undefined,
    });
  }
  return client;
}

export async function uploadBenefitSource(input: {
  key: string;
  body: Buffer | string;
  contentType?: string;
}): Promise<string> {
  const bucket = process.env.S3_BENEFIT_PDF_BUCKET ?? 'stipulate-benefit-pdfs';
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType ?? 'application/octet-stream',
    }),
  );
  return `s3://${bucket}/${input.key}`;
}

export async function downloadBenefitSource(key: string): Promise<Buffer> {
  const bucket = process.env.S3_BENEFIT_PDF_BUCKET ?? 'stipulate-benefit-pdfs';
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = await response.Body?.transformToByteArray();
  return Buffer.from(bytes ?? []);
}
