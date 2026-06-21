import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import * as cardRepo from '../../repositories/card.repository.js';
import * as plaidRepo from '../../repositories/plaid.repository.js';
import { suggestCatalogCardId } from '../../services/card-mapping.service.js';
import {
  createPlaidLinkToken,
  exchangePlaidPublicToken,
  fetchPlaidAccounts,
  fetchPlaidInstitution,
  isPlaidConfigured,
} from '../../services/plaid.service.js';
import { resolveConsumerUserId } from '../../lib/consumer-context.js';
import { syncPlaidTransactionsForConsumer } from '../../services/plaid-transaction-sync.service.js';

export const plaidHandler = new Hono<AppBindings>();

async function resolveUserRef(c: Parameters<typeof resolveConsumerUserId>[0]): Promise<string> {
  return (await resolveConsumerUserId(c)) ?? 'default';
}

async function mapAccountsToCatalog(input: {
  institutionName: string;
  accounts: Array<{
    accountId: string;
    accountName: string;
    accountMask: string | null;
    accountType: string | null;
    accountSubtype: string | null;
  }>;
}) {
  const { cards: catalogCards } = await cardRepo.listCards({ limit: 210 });
  const catalogRefs = catalogCards.map((card) => ({
    id: card.card_id,
    issuer: card.issuer_name ?? card.issuer_slug ?? '',
    productName: card.name,
  }));

  return input.accounts.map((account) => {
    const suggestion = suggestCatalogCardId({
      institutionName: input.institutionName,
      accountName: account.accountName,
      catalog: catalogRefs,
    });
    return {
      accountId: account.accountId,
      accountName: account.accountName,
      accountMask: account.accountMask ?? undefined,
      accountType: account.accountType ?? undefined,
      accountSubtype: account.accountSubtype ?? undefined,
      mappedCardId: suggestion.cardId ?? undefined,
      mappingConfidence: suggestion.confidence || undefined,
    };
  });
}

/** Create a Plaid Link token (sandbox stub until Plaid keys configured). */
plaidHandler.post('/link-token', async (c) => {
  const consumerUserId = await resolveUserRef(c);

  if (process.env.NODE_ENV === 'test' || !isPlaidConfigured()) {
    return c.json({
      data: {
        linkToken: `link-sandbox-stub-${Date.now()}`,
        expiration: new Date(Date.now() + 30 * 60_000).toISOString(),
        mode: 'stub',
        message: 'Configure PLAID_CLIENT_ID and PLAID_SECRET for live bank linking',
      },
      requestId: c.get('requestId'),
    });
  }

  const link = await createPlaidLinkToken({ consumerUserId });
  return c.json({
    data: {
      linkToken: link.linkToken,
      expiration: link.expiration,
      mode: process.env.PLAID_ENV ?? 'sandbox',
    },
    requestId: c.get('requestId'),
  });
});

/** Exchange public token for access token (stub). */
plaidHandler.post('/exchange', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) as {
    publicToken?: string;
    institutionName?: string;
  };

  if (!body.publicToken) {
    return c.json(
      {
        error: { code: 'VALIDATION_ERROR', message: 'publicToken is required' },
        requestId: c.get('requestId'),
      },
      422,
    );
  }

  const consumerUserId = await resolveUserRef(c);

  if (process.env.NODE_ENV === 'test' || !isPlaidConfigured()) {
    const institutionName = body.institutionName ?? 'Chase';
    const stubAccounts = [
      {
        accountId: `acct_${body.publicToken.slice(-6)}_1`,
        accountName: 'Sapphire Preferred',
        accountMask: '4242',
        accountType: 'credit',
        accountSubtype: 'credit card',
      },
      {
        accountId: `acct_${body.publicToken.slice(-6)}_2`,
        accountName: 'Freedom Unlimited',
        accountMask: '1111',
        accountType: 'credit',
        accountSubtype: 'credit card',
      },
    ];

    const mappedAccounts = await mapAccountsToCatalog({
      institutionName,
      accounts: stubAccounts.map((account) => ({
        accountId: account.accountId,
        accountName: account.accountName,
        accountMask: account.accountMask,
        accountType: account.accountType,
        accountSubtype: account.accountSubtype,
      })),
    });

    const { item, accounts } = await plaidRepo.upsertPlaidItem({
      consumerUserId,
      itemId: `item_stub_${body.publicToken.slice(-8)}`,
      institutionName,
      accessToken: `access_${body.publicToken}`,
      accounts: mappedAccounts,
    });

    return c.json({
      data: {
        itemId: item.item_id,
        institutionName: item.institution_name,
        accountsLinked: accounts.length,
        suggestedCards: mappedAccounts
          .filter((account) => account.mappedCardId)
          .map((account) => ({
            accountName: account.accountName,
            cardId: account.mappedCardId,
            confidence: account.mappingConfidence,
          })),
        mode: 'stub',
      },
      requestId: c.get('requestId'),
    });
  }

  const exchange = await exchangePlaidPublicToken(body.publicToken);
  const institution = await fetchPlaidInstitution(exchange.accessToken);
  const institutionName = body.institutionName ?? institution.institutionName ?? 'Linked bank';
  const plaidAccounts = await fetchPlaidAccounts(exchange.accessToken);
  const creditAccounts = plaidAccounts.filter(
    (account) => account.accountType === 'credit' || account.accountSubtype === 'credit card',
  );

  const mappedAccounts = await mapAccountsToCatalog({
    institutionName,
    accounts: creditAccounts.length > 0 ? creditAccounts : plaidAccounts,
  });

  const { item, accounts } = await plaidRepo.upsertPlaidItem({
    consumerUserId,
    itemId: exchange.itemId,
    institutionId: institution.institutionId ?? undefined,
    institutionName,
    accessToken: exchange.accessToken,
    accounts: mappedAccounts,
  });

  return c.json({
    data: {
      itemId: item.item_id,
      institutionName: item.institution_name,
      accountsLinked: accounts.length,
      suggestedCards: mappedAccounts
        .filter((account) => account.mappedCardId)
        .map((account) => ({
          accountName: account.accountName,
          cardId: account.mappedCardId,
          confidence: account.mappingConfidence,
        })),
      mode: process.env.PLAID_ENV ?? 'sandbox',
    },
    requestId: c.get('requestId'),
  });
});

/** List linked bank accounts with catalog card mapping suggestions. */
plaidHandler.get('/accounts', async (c) => {
  const consumerUserId = await resolveUserRef(c);
  const accounts = await plaidRepo.listLinkedAccounts(consumerUserId);

  return c.json({
    data: {
      accounts: accounts.map((account) => ({
        accountId: account.account_id,
        accountName: account.account_name,
        accountMask: account.account_mask,
        accountType: account.account_type,
        accountSubtype: account.account_subtype,
        institutionName: account.institutionName,
        mappedCardId: account.mapped_card_id,
        mappingConfidence: account.mapping_confidence,
        mappingSource: account.mapping_source,
      })),
    },
    requestId: c.get('requestId'),
  });
});

/** Sync recent Plaid transactions into cap spend tracking. */
plaidHandler.post('/sync-transactions', async (c) => {
  const consumerUserId = await resolveUserRef(c);
  const days = Number(c.req.query('days') ?? 30);

  const result = await syncPlaidTransactionsForConsumer({
    consumerUserId,
    orgId: c.get('orgId'),
    days: Number.isFinite(days) ? days : 30,
  });

  return c.json({
    data: result,
    requestId: c.get('requestId'),
  });
});
