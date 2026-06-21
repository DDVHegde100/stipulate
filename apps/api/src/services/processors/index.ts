import { lithicProcessor } from './lithic.processor.js';
import { marqetaProcessor } from './marqeta.processor.js';
import { sandboxProcessor } from './sandbox.processor.js';
import type { IssuingProcessor, ProcessorKind } from './types.js';

const processors: Record<ProcessorKind, IssuingProcessor> = {
  sandbox: sandboxProcessor,
  stripe: sandboxProcessor,
  lithic: lithicProcessor,
  marqeta: marqetaProcessor,
};

export function getIssuingProcessor(kind: ProcessorKind): IssuingProcessor {
  return processors[kind];
}

export function processorKindFromSlug(processor: string): ProcessorKind {
  if (processor === 'stripe_issuing') return 'stripe';
  if (processor === 'lithic') return 'lithic';
  if (processor === 'marqeta') return 'marqeta';
  return 'sandbox';
}

export type { IssuingProcessor, ProcessorKind } from './types.js';
