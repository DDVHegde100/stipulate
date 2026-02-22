#!/usr/bin/env tsx
/** SQS-driven ingestion worker — processes parser jobs from queue. */
import { processIngestionJob } from '../src/services/ingestion-pipeline.service.js';
import {
  receiveIngestionJobMessages,
  deleteIngestionJobMessage,
} from '../src/lib/sqs.js';
import { disconnectDatabase } from '../src/lib/db.js';

async function main(): Promise<void> {
  const messages = await receiveIngestionJobMessages(10);
  let processed = 0;

  for (const msg of messages) {
    await processIngestionJob(msg.jobId);
    await deleteIngestionJobMessage(msg.receiptHandle);
    processed++;
  }

  console.log(JSON.stringify({ ok: true, processed, received: messages.length }));
  await disconnectDatabase();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
