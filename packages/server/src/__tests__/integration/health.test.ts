import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

const app = createApp();

describe('Health Check API', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.timestamp).toBeDefined();
  });

  it('GET /api/health timestamp is valid ISO string', async () => {
    const res = await request(app).get('/api/health');
    const date = new Date(res.body.data.timestamp);
    expect(date.toISOString()).toBe(res.body.data.timestamp);
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Not Found');
  });

  it('returns 404 for unknown POST routes', async () => {
    const res = await request(app).post('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
