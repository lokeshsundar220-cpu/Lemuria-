const assert = require('assert');

/**
 * URL resolution logic mirroring frontend getApiBaseUrl implementation
 */
function resolveApiBaseUrl(env = {}) {
  const isProd = env.PROD === true || env.NODE_ENV === 'production';
  const rawEnv = env.VITE_API_URL || env.VITE_API_BASE_URL || env.VITE_BACKEND_URL || '';
  let trimmed = String(rawEnv).trim().replace(/\/+$/, '');

  if (isProd) {
    if (!trimmed || trimmed.includes('localhost') || trimmed.includes('127.0.0.1')) {
      return 'https://lemuria.onrender.com/api';
    }
  }

  if (!trimmed) {
    return 'http://localhost:5000/api';
  }

  if (trimmed.toLowerCase().endsWith('/api')) {
    return trimmed;
  }

  return `${trimmed}/api`;
}

function buildEndpointUrl(baseUrl, endpoint) {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}

function runTests() {
  console.log('--- Testing Frontend API URL Resolution Logic ---');

  // Test 1: VITE_API_URL configured on Vercel without /api
  const t1 = resolveApiBaseUrl({ VITE_API_URL: 'https://lemuria.onrender.com' });
  assert.strictEqual(t1, 'https://lemuria.onrender.com/api', 'Test 1 Failed');
  console.log('✓ Test 1 Passed: VITE_API_URL="https://lemuria.onrender.com" -> ' + t1);

  // Test 2: VITE_API_URL configured with trailing slash
  const t2 = resolveApiBaseUrl({ VITE_API_URL: 'https://lemuria.onrender.com/' });
  assert.strictEqual(t2, 'https://lemuria.onrender.com/api', 'Test 2 Failed');
  console.log('✓ Test 2 Passed: VITE_API_URL="https://lemuria.onrender.com/" -> ' + t2);

  // Test 3: VITE_API_URL configured with /api
  const t3 = resolveApiBaseUrl({ VITE_API_URL: 'https://lemuria.onrender.com/api' });
  assert.strictEqual(t3, 'https://lemuria.onrender.com/api', 'Test 3 Failed');
  console.log('✓ Test 3 Passed: VITE_API_URL="https://lemuria.onrender.com/api" -> ' + t3);

  // Test 4: VITE_API_BASE_URL configured with /api/
  const t4 = resolveApiBaseUrl({ VITE_API_BASE_URL: 'https://lemuria.onrender.com/api/' });
  assert.strictEqual(t4, 'https://lemuria.onrender.com/api', 'Test 4 Failed');
  console.log('✓ Test 4 Passed: VITE_API_BASE_URL="https://lemuria.onrender.com/api/" -> ' + t4);

  // Test 5: Local development fallback
  const t5 = resolveApiBaseUrl({ VITE_API_BASE_URL: 'http://localhost:5000/api', PROD: false });
  assert.strictEqual(t5, 'http://localhost:5000/api', 'Test 5 Failed');
  console.log('✓ Test 5 Passed: Local development URL -> ' + t5);

  // Test 5b: Production build with local .env containing localhost
  const t5b = resolveApiBaseUrl({ VITE_API_BASE_URL: 'http://localhost:5000/api', PROD: true });
  assert.strictEqual(t5b, 'https://lemuria.onrender.com/api', 'Test 5b Failed');
  console.log('✓ Test 5b Passed: Production build ignoring localhost -> ' + t5b);

  // Test 6: Production default fallback (no env vars provided)
  const t6 = resolveApiBaseUrl({ PROD: true });
  assert.strictEqual(t6, 'https://lemuria.onrender.com/api', 'Test 6 Failed');
  console.log('✓ Test 6 Passed: Production mode default fallback -> ' + t6);

  // Test 7: Dev default fallback (no env vars provided)
  const t7 = resolveApiBaseUrl({ PROD: false });
  assert.strictEqual(t7, 'http://localhost:5000/api', 'Test 7 Failed');
  console.log('✓ Test 7 Passed: Development mode default fallback -> ' + t7);

  // Test 8: Full endpoint construction
  const base = resolveApiBaseUrl({ VITE_API_URL: 'https://lemuria.onrender.com' });
  const hotelUrl = buildEndpointUrl(base, '/hotels');
  assert.strictEqual(hotelUrl, 'https://lemuria.onrender.com/api/hotels');
  console.log('✓ Test 8 Passed: Hotel endpoint -> ' + hotelUrl);

  const loginUrl = buildEndpointUrl(base, 'auth/guest/login');
  assert.strictEqual(loginUrl, 'https://lemuria.onrender.com/api/auth/guest/login');
  console.log('✓ Test 9 Passed: Guest login endpoint -> ' + loginUrl);

  const bookUrl = buildEndpointUrl(base, '/reservations/book');
  assert.strictEqual(bookUrl, 'https://lemuria.onrender.com/api/reservations/book');
  console.log('✓ Test 10 Passed: Reservations book endpoint -> ' + bookUrl);

  console.log('\nAll API URL resolution tests passed successfully!\n');
}

runTests();
