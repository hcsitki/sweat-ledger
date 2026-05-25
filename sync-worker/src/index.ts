import type { Env } from './types';
import { handlePush } from './push';
import { handlePull } from './pull';

function unauthorized(): Response {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

function notFound(): Response {
  return Response.json({ error: 'Not found' }, { status: 404 });
}

function isAuthorized(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization') ?? '';
  return auth === `Bearer ${env.AUTH_TOKEN}`;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!isAuthorized(request, env)) return unauthorized();

    const url = new URL(request.url);
    const { pathname, method } = Object.assign(url, { method: request.method });

    if (method === 'POST' && pathname === '/sync/push') {
      return handlePush(request, env);
    }

    if (method === 'GET' && pathname === '/sync/pull') {
      return handlePull(request, env);
    }

    if (method === 'DELETE') {
      const match = pathname.match(/^\/sync\/session\/(\d+)$/);
      if (match) {
        const sessionId = Number(match[1]);
        const url2 = new URL(request.url);
        const deviceId = url2.searchParams.get('deviceId');
        if (!deviceId) {
          return Response.json({ error: 'Missing deviceId' }, { status: 400 });
        }
        await env.DB.batch([
          env.DB.prepare(
            `DELETE FROM sets WHERE workout_exercise_id IN (SELECT id FROM workout_exercises WHERE session_id = ?)`
          ).bind(sessionId),
          env.DB.prepare(
            `DELETE FROM workout_exercises WHERE session_id = ?`
          ).bind(sessionId),
          env.DB.prepare(
            `DELETE FROM workout_sessions WHERE id = ? AND device_id = ?`
          ).bind(sessionId, deviceId),
        ]);
        return Response.json({ ok: true });
      }
    }

    return notFound();
  },
} satisfies ExportedHandler<Env>;
