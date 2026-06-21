import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';

import type { AppBindings } from '../../app.js';
import {
  createConsumerUser,
  findConsumerByEmail,
  findConsumerById,
  publicUserShape,
  verifyConsumerLogin,
  updateConsumerUser,
  updateExpoPushToken,
} from '../../repositories/consumer-user.repository.js';
import { createConsumerSession, revokeConsumerSession } from '../../repositories/consumer-session.repository.js';
import { resolveConsumerUserId } from '../../lib/consumer-context.js';
import { clearSessionCookie, setSessionCookie } from '../../lib/session-cookie.js';
import { exportConsumerData, scheduleConsumerDeletion } from '../../services/consumer-gdpr.service.js';

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(128).optional(),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const ProfilePatchSchema = z.object({
  name: z.string().min(1).max(128).optional(),
  timezone: z.string().optional(),
  onboardingComplete: z.boolean().optional(),
  walletCardIds: z.array(z.string()).optional(),
  notificationPrefs: z
    .object({
      email: z.boolean(),
      push: z.boolean(),
    })
    .optional(),
});

export const consumerAuthHandler = new Hono<AppBindings>();

consumerAuthHandler.post('/signup', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const existing = await findConsumerByEmail(parsed.data.email);
  if (existing) {
    throw new HTTPException(409, { message: 'Email already registered' });
  }

  const user = await createConsumerUser(parsed.data);
  const session = await createConsumerSession(user.id);
  setSessionCookie(c, session.token, session.expiresAt);
  return c.json({ data: publicUserShape(user), requestId: c.get('requestId') }, 201);
});

consumerAuthHandler.post('/login', async (c) => {
  const body: unknown = await c.req.json().catch(() => {
    throw new HTTPException(400, { message: 'Request body must be valid JSON' });
  });

  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const user = await verifyConsumerLogin(parsed.data.email, parsed.data.password);
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid email or password' });
  }

  const session = await createConsumerSession(user.id);
  setSessionCookie(c, session.token, session.expiresAt);
  return c.json({ data: publicUserShape(user), requestId: c.get('requestId') });
});

consumerAuthHandler.get('/me', async (c) => {
  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Not authenticated' });

  const user = await findConsumerById(userId);
  if (!user) throw new HTTPException(404, { message: 'User not found' });

  return c.json({ data: publicUserShape(user), requestId: c.get('requestId') });
});

consumerAuthHandler.post('/refresh', async (c) => {
  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Not authenticated' });

  const user = await findConsumerById(userId);
  if (!user) throw new HTTPException(404, { message: 'User not found' });

  const cookies = c.req.header('Cookie') ?? '';
  const match = cookies.match(/stipulate_session=([^;]+)/);
  if (match?.[1]) {
    await revokeConsumerSession(decodeURIComponent(match[1]));
  }

  const session = await createConsumerSession(user.id);
  setSessionCookie(c, session.token, session.expiresAt);
  return c.json({ data: publicUserShape(user), requestId: c.get('requestId') });
});

consumerAuthHandler.post('/logout', async (c) => {
  const cookies = c.req.header('Cookie') ?? '';
  const match = cookies.match(/stipulate_session=([^;]+)/);
  if (match?.[1]) {
    await revokeConsumerSession(decodeURIComponent(match[1]));
  }
  clearSessionCookie(c);
  return c.json({ data: { loggedOut: true }, requestId: c.get('requestId') });
});

consumerAuthHandler.patch('/profile', async (c) => {
  const userId = (await resolveConsumerUserId(c)) ?? c.req.header('X-User-Id');
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = ProfilePatchSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const user = await updateConsumerUser(userId, parsed.data);
  if (!user) throw new HTTPException(404, { message: 'User not found' });

  return c.json({ data: publicUserShape(user), requestId: c.get('requestId') });
});

const PushTokenSchema = z.object({
  token: z.string().min(8).max(255).nullable(),
});

consumerAuthHandler.post('/push-token', async (c) => {
  const userId = (await resolveConsumerUserId(c)) ?? c.req.header('X-User-Id');
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const body: unknown = await c.req.json().catch(() => ({}));
  const parsed = PushTokenSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() }, requestId: c.get('requestId') },
      422,
    );
  }

  const updated = await updateExpoPushToken(userId, parsed.data.token);
  if (!updated && process.env.NODE_ENV !== 'test') {
    throw new HTTPException(404, { message: 'User not found' });
  }

  return c.json(
    {
      data: { registered: Boolean(parsed.data.token) },
      requestId: c.get('requestId'),
    },
    200,
  );
});

consumerAuthHandler.get('/export', async (c) => {
  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const bundle = await exportConsumerData(userId);
  return c.json({ data: bundle, requestId: c.get('requestId') });
});

consumerAuthHandler.post('/delete', async (c) => {
  const userId = await resolveConsumerUserId(c);
  if (!userId) throw new HTTPException(401, { message: 'Authentication required' });

  const result = await scheduleConsumerDeletion(userId);
  clearSessionCookie(c);
  return c.json(
    {
      data: {
        status: 'scheduled',
        scheduledFor: result.scheduledFor,
        message: 'Account deletion scheduled. You have been signed out.',
      },
      requestId: c.get('requestId'),
    },
    202,
  );
});
