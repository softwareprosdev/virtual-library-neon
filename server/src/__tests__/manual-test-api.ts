/**
 * Manual API Testing Script
 *
 * This script can be used to manually test the auth endpoints against your production or local server.
 *
 * Usage:
 *   npx ts-node src/__tests__/manual-test-api.ts
 *
 * Set the API_URL environment variable to test against different environments:
 *   API_URL=https://api.indexbin.com/api npx ts-node src/__tests__/manual-test-api.ts
 */

const API_URL = process.env.API_URL || 'http://localhost:4000/api';

interface TestResult {
  name: string;
  success: boolean;
  message: string;
  response?: unknown;
}

const results: TestResult[] = [];

async function makeRequest(
  endpoint: string,
  method: string = 'GET',
  body?: object,
  token?: string
) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  return {
    status: response.status,
    ok: response.ok,
    data,
  };
}

async function testRegistration() {
  console.log('\n🔍 Testing Registration...\n');

  // Test 1: Successful registration
  try {
    const timestamp = Date.now();
    const response = await makeRequest('/auth/register', 'POST', {
      email: `test${timestamp}@example.com`,
      password: 'SecurePass123',
      name: 'Test User',
    });

    if (response.ok && response.data?.token) {
      results.push({
        name: 'Registration - Success',
        success: true,
        message: '✅ User registered successfully',
        response: response.data,
      });
      return response.data.token; // Return token for later tests
    } else {
      results.push({
        name: 'Registration - Success',
        success: false,
        message: `❌ Failed: ${JSON.stringify(response.data)}`,
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Registration - Success',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  // Test 2: Invalid email format
  try {
    const response = await makeRequest('/auth/register', 'POST', {
      email: 'invalid-email',
      password: 'SecurePass123',
      name: 'Test User',
    });

    if (response.status === 400 && response.data?.message === 'Invalid email format') {
      results.push({
        name: 'Registration - Invalid Email',
        success: true,
        message: '✅ Correctly rejected invalid email',
      });
    } else {
      results.push({
        name: 'Registration - Invalid Email',
        success: false,
        message: '❌ Should reject invalid email format',
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Registration - Invalid Email',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  // Test 3: Short password
  try {
    const response = await makeRequest('/auth/register', 'POST', {
      email: 'test@example.com',
      password: 'short',
      name: 'Test User',
    });

    if (response.status === 400 && response.data?.message?.includes('8 characters')) {
      results.push({
        name: 'Registration - Short Password',
        success: true,
        message: '✅ Correctly rejected short password',
      });
    } else {
      results.push({
        name: 'Registration - Short Password',
        success: false,
        message: '❌ Should reject password less than 8 characters',
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Registration - Short Password',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  return null;
}

async function testLogin(testEmail: string, testPassword: string) {
  console.log('\n🔍 Testing Login...\n');

  // Test 1: Successful login
  try {
    const response = await makeRequest('/auth/login', 'POST', {
      email: testEmail,
      password: testPassword,
    });

    if (response.ok && response.data?.token) {
      results.push({
        name: 'Login - Success',
        success: true,
        message: '✅ Login successful',
        response: response.data,
      });
      return response.data.token;
    } else {
      results.push({
        name: 'Login - Success',
        success: false,
        message: `❌ Failed: ${JSON.stringify(response.data)}`,
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Login - Success',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  // Test 2: Invalid credentials
  try {
    const response = await makeRequest('/auth/login', 'POST', {
      email: testEmail,
      password: 'WrongPassword123',
    });

    if (response.status === 400 && response.data?.message === 'Invalid credentials') {
      results.push({
        name: 'Login - Invalid Password',
        success: true,
        message: '✅ Correctly rejected invalid password',
      });
    } else {
      results.push({
        name: 'Login - Invalid Password',
        success: false,
        message: '❌ Should reject invalid credentials',
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Login - Invalid Password',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  return null;
}

async function testProtectedRoute(token: string) {
  console.log('\n🔍 Testing Protected Route (/auth/me)...\n');

  // Test 1: Valid token
  try {
    const response = await makeRequest('/auth/me', 'GET', undefined, token);

    if (response.ok && response.data?.email) {
      results.push({
        name: 'Protected Route - Valid Token',
        success: true,
        message: '✅ Access granted with valid token',
        response: response.data,
      });
    } else {
      results.push({
        name: 'Protected Route - Valid Token',
        success: false,
        message: `❌ Failed: ${JSON.stringify(response.data)}`,
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Protected Route - Valid Token',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  // Test 2: No token
  try {
    const response = await makeRequest('/auth/me', 'GET');

    if (response.status === 401) {
      results.push({
        name: 'Protected Route - No Token',
        success: true,
        message: '✅ Correctly rejected request without token',
      });
    } else {
      results.push({
        name: 'Protected Route - No Token',
        success: false,
        message: '❌ Should reject request without token',
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Protected Route - No Token',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }

  // Test 3: Invalid token
  try {
    const response = await makeRequest('/auth/me', 'GET', undefined, 'invalid-token');

    if (response.status === 403) {
      results.push({
        name: 'Protected Route - Invalid Token',
        success: true,
        message: '✅ Correctly rejected invalid token',
      });
    } else {
      results.push({
        name: 'Protected Route - Invalid Token',
        success: false,
        message: '❌ Should reject invalid token',
        response: response.data,
      });
    }
  } catch (error) {
    results.push({
      name: 'Protected Route - Invalid Token',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(80) + '\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  results.forEach(result => {
    console.log(`${result.success ? '✅' : '❌'} ${result.name}`);
    if (!result.success || process.env.VERBOSE) {
      console.log(`   ${result.message}`);
      if (result.response && process.env.VERBOSE) {
        console.log(`   Response:`, JSON.stringify(result.response, null, 2));
      }
    }
    console.log('');
  });

  console.log('='.repeat(80));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('='.repeat(80) + '\n');

  if (failed > 0) {
    process.exit(1);
  }
}

async function runTests() {
  console.log('\n🚀 Starting API Tests...');
  console.log(`🌐 Testing API at: ${API_URL}\n`);

  try {
    // Test registration and get a token
    const token = await testRegistration();

    if (token) {
      // If registration succeeded, test login with the same credentials
      const timestamp = Date.now();
      await testLogin(`test${timestamp}@example.com`, 'SecurePass123');

      // Test protected routes
      await testProtectedRoute(token);
    } else {
      console.log('\n⚠️  Skipping login and protected route tests due to registration failure\n');
    }

    printResults();
  } catch (error) {
    console.error('\n❌ Fatal error during testing:', error);
    process.exit(1);
  }
}

// Run the tests
runTests();
