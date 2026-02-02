#!/bin/bash
# Bootstrap LocalStack resources for Stipulate local development

set -euo pipefail

echo "Initializing Stipulate LocalStack resources..."

awslocal s3 mb s3://stipulate-benefit-pdfs 2>/dev/null || true
awslocal s3 mb s3://stipulate-parser-artifacts 2>/dev/null || true

awslocal sqs create-queue --queue-name stipulate-parser-jobs 2>/dev/null || true
awslocal sqs create-queue --queue-name stipulate-benefit-change-events 2>/dev/null || true

awslocal sns create-topic --name stipulate-benefit-changes 2>/dev/null || true

awslocal secretsmanager create-secret \
  --name stipulate/local/openai-api-key \
  --secret-string '{"OPENAI_API_KEY":"sk-local-dev-placeholder"}' \
  2>/dev/null || true

echo "LocalStack initialization complete."
