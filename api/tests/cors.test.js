describe('CORS', () => {
  const ORIGINAL_ENV = process.env.CORS_ALLOWED_ORIGINS;

  afterEach(() => {
    process.env.CORS_ALLOWED_ORIGINS = ORIGINAL_ENV;
    jest.resetModules();
  });

  it('reflects an allowed origin when CORS_ALLOWED_ORIGINS is set', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://cef-pip.vercel.app';
    jest.resetModules();
    const request = require('supertest');
    const app = require('../src/app');

    const res = await request(app).get('/health').set('Origin', 'https://cef-pip.vercel.app');
    expect(res.headers['access-control-allow-origin']).toBe('https://cef-pip.vercel.app');
  });

  it('rejects a disallowed origin when CORS_ALLOWED_ORIGINS is set', async () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://cef-pip.vercel.app';
    jest.resetModules();
    const request = require('supertest');
    const app = require('../src/app');

    const res = await request(app).get('/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('allows any origin when CORS_ALLOWED_ORIGINS is unset', async () => {
    delete process.env.CORS_ALLOWED_ORIGINS;
    jest.resetModules();
    const request = require('supertest');
    const app = require('../src/app');

    const res = await request(app).get('/health').set('Origin', 'https://anything.example');
    expect(res.headers['access-control-allow-origin']).toBe('*');
  });
});
