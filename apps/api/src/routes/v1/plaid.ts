import { Hono } from 'hono';

import type { AppBindings } from '../../app.js';
import * as cardRepo from '../../repositories/card.repository.js';
import * as plaidRepo from '../../repositories/plaid.repository.js';
import { suggestCatalogCardId } from '../../services/card-mapping.service.js';

export const plaidHandler = new Hono<AppBindings>();

function resolveConsumerUserId(c: {
  req: { header: (name: string) => string | undefined };
}): string {
  return c.req.header('X-Consumer-User-Id') ?? c.req.header('X-User-Ref') ?? 'default';
}

/** Create a Plaid Link token (sandbox stub until Plaid keys configured). */
plaidHandler.post('/link-token', async (c) => {
  const configured = Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);

  if (!configured) {
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

  return c.json({
    data: {
      linkToken: `link-production-pending-${Date.now()}`,
      expiration: new Date(Date.now() + 30 * 60_000).toISOString(),
      mode: 'pending',
      message: 'Plaid SDK integration pending in next release',
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

  const consumerUserId = resolveConsumerUserId(c);
  const institutionName = body.institutionName ?? 'Chase';
  const { cards: catalogCards } = await cardRepo.listCards({ limit: 210 });
  const catalogRefs = catalogCards.map((card) => ({
    id: card.card_id,
    issuer: card.issuer_name ?? card.issuer_slug ?? '',
    productName: card.name,
  }));

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

  const mappedAccounts = stubAccounts.map((account) => {
    const suggestion = suggestCatalogCardId({
      institutionName,
      accountName: account.accountName,
      catalog: catalogRefs,
    });
    return {
      ...account,
      mappedCardId: suggestion.cardId ?? undefined,
      mappingConfidence: suggestion.confidence || undefined,
    };
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
});

/** List linked bank accounts with catalog card mapping suggestions. */
plaidHandler.get('/accounts', async (c) => {
  const consumerUserId = resolveConsumerUserId(c);
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
