export type ProcessorKind = 'sandbox' | 'stripe' | 'lithic' | 'marqeta';

export interface ProcessorCardholderResult {
  externalId: string;
  mode: ProcessorKind;
}

export interface ProcessorVirtualCardResult {
  externalId: string;
  last4: string;
  network: string;
  expMonth: number;
  expYear: number;
  panToken: string;
  mode: ProcessorKind;
}

export interface IssuingProcessor {
  kind: ProcessorKind;
  createCardholder(input: {
    consumerUserId: string;
    name: string;
    email?: string;
  }): Promise<ProcessorCardholderResult>;
  issueVirtualCard(input: {
    cardholderExternalId: string;
  }): Promise<ProcessorVirtualCardResult>;
}
