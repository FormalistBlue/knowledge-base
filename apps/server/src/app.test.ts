import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalNodeEnv = process.env.NODE_ENV;
const originalCorsOrigin = process.env.CORS_ORIGIN;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
  if (originalCorsOrigin === undefined) {
    delete process.env.CORS_ORIGIN;
  } else {
    process.env.CORS_ORIGIN = originalCorsOrigin;
  }
});

const loadApp = async () => {
  vi.resetModules();
  const { createApp } = await import('./app.js');
  return createApp();
};

describe('app production hardening', () => {
  it('does not register dev routes in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CORS_ORIGIN;
    const app = await loadApp();

    await request(app).get('/api/dev/validate-demo?keyword=demo').expect(404);
  });

  it('uses configured CORS origins instead of wildcarding every origin', async () => {
    process.env.NODE_ENV = 'production';
    process.env.CORS_ORIGIN = 'https://kb.example.com,https://admin.example.com';
    const app = await loadApp();

    const allowed = await request(app).get('/api/health').set('Origin', 'https://kb.example.com').expect(200);
    expect(allowed.headers['access-control-allow-origin']).toBe('https://kb.example.com');

    const blocked = await request(app).get('/api/health').set('Origin', 'https://evil.example.com').expect(200);
    expect(blocked.headers['access-control-allow-origin']).toBeUndefined();
  });
});
