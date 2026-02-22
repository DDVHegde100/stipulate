import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';

let client: SQSClient | undefined;

function getSqsClient(): SQSClient {
  if (!client) {
    client = new SQSClient({
      region: process.env.AWS_REGION ?? 'us-east-1',
      endpoint: process.env.AWS_ENDPOINT_URL,
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

function queueUrl(): string {
  return process.env.SQS_PARSER_JOBS_QUEUE ?? '';
}

export async function publishIngestionJobMessage(payload: {
  jobId: string;
  cardId: string;
}): Promise<void> {
  const url = queueUrl();
  if (!url) return;

  await getSqsClient().send(
    new SendMessageCommand({
      QueueUrl: url,
      MessageBody: JSON.stringify({ type: 'ingestion.job', ...payload }),
    }),
  );
}

export async function receiveIngestionJobMessages(max = 5): Promise<
  Array<{ receiptHandle: string; jobId: string; cardId: string }>
> {
  const url = queueUrl();
  if (!url) return [];

  const response = await getSqsClient().send(
    new ReceiveMessageCommand({
      QueueUrl: url,
      MaxNumberOfMessages: max,
      WaitTimeSeconds: 1,
    }),
  );

  return (response.Messages ?? []).flatMap((msg) => {
    if (!msg.Body || !msg.ReceiptHandle) return [];
    try {
      const body = JSON.parse(msg.Body) as { jobId: string; cardId: string };
      return [{ receiptHandle: msg.ReceiptHandle, jobId: body.jobId, cardId: body.cardId }];
    } catch {
      return [];
    }
  });
}

export async function deleteIngestionJobMessage(receiptHandle: string): Promise<void> {
  const url = queueUrl();
  if (!url) return;

  await getSqsClient().send(
    new DeleteMessageCommand({ QueueUrl: url, ReceiptHandle: receiptHandle }),
  );
}
