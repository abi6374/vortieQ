import { test, expect } from '@playwright/test'

/**
 * Deployed backend health — a smoke that will fail loudly if EC2 or the CORS
 * config regresses. Independent of the frontend so a bad build doesn't hide it.
 */
test('backend /health returns ok', async ({ request }) => {
  const res = await request.get('http://13.206.51.130/health')
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toMatchObject({ status: 'ok' })
})

test('protected endpoint rejects unauthenticated request with 401', async ({ request }) => {
  const res = await request.get('http://13.206.51.130/api/roadmap')
  expect([401, 403]).toContain(res.status())
})

test('CORS preflight allows the Vercel origin', async ({ request }) => {
  const res = await request.fetch('http://13.206.51.130/api/profile/', {
    method: 'OPTIONS',
    headers: {
      origin: 'https://vortie-q.vercel.app',
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'authorization,content-type',
    },
  })
  expect(res.status()).toBe(200)
  expect(res.headers()['access-control-allow-origin']).toBe('https://vortie-q.vercel.app')
})
