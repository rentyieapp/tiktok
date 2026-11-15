import { afterEach, describe, expect, it } from 'vitest';
import type { BuiltApp } from '../server/src/app';
import { makeApp, uniqueEmail } from './helpers';

let built: BuiltApp | null = null;

afterEach(async () => {
  if (built) {
    await built.app.close();
    built = null;
  }
});

describe('e-posta doğrulama ve şifre sıfırlama', () => {
  it('doğrulanmamış kullanıcı giriş yapamaz, doğrulama sonrası yapar', async () => {
    built = await makeApp({
      requireEmailVerification: true,
      adminEmail: 'admin@test.local',
      adminPassword: 'Admin1234',
    });
    const { app: server } = built;
    const email = uniqueEmail('verify');
    const register = await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'Test1234', displayName: 'Doğrulama Testi' },
    });
    expect(register.statusCode).toBe(201);
    const debugUrl = register.json().debugVerificationUrl as string;
    expect(debugUrl).toContain('token=');

    const blocked = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'Test1234' },
    });
    expect(blocked.statusCode).toBe(403);

    const verified = await server.inject({
      method: 'POST',
      url: '/api/auth/verify-email',
      payload: { token: decodeURIComponent(debugUrl.split('token=')[1]!) },
    });
    expect(verified.statusCode).toBe(200);

    const login = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'Test1234' },
    });
    expect(login.statusCode).toBe(200);
  });

  it('şifre sıfırlama bağlantısı tek kullanımlıktır', async () => {
    built = await makeApp({ adminEmail: 'admin@test.local', adminPassword: 'Admin1234' });
    const { app: server } = built;
    const email = uniqueEmail('reset');
    await server.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { email, password: 'Test1234', displayName: 'Reset Testi' },
    });
    const forgot = await server.inject({
      method: 'POST',
      url: '/api/auth/forgot-password',
      payload: { email },
    });
    expect(forgot.statusCode).toBe(200);
    const debugUrl = forgot.json().debugResetUrl as string;
    const token = decodeURIComponent(debugUrl.split('token=')[1]!);

    const reset = await server.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token, password: 'YeniSifre123' },
    });
    expect(reset.statusCode).toBe(200);

    const oldLogin = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'Test1234' },
    });
    expect(oldLogin.statusCode).toBe(401);
    const newLogin = await server.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email, password: 'YeniSifre123' },
    });
    expect(newLogin.statusCode).toBe(200);

    const reused = await server.inject({
      method: 'POST',
      url: '/api/auth/reset-password',
      payload: { token, password: 'BaskaSifre123' },
    });
    expect(reused.statusCode).toBe(400);
  });
});
