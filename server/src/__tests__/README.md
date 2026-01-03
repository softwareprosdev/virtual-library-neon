# Authentication Testing Suite

This directory contains comprehensive tests for the authentication API endpoints.

## Test Files

### 1. `auth.test.ts` - Automated Unit Tests

Jest-based unit tests with mocked database for testing auth endpoints in isolation.

**Run tests:**
```bash
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Run tests with coverage report
```

**What's tested:**
- ✅ User registration with validation
- ✅ Email format validation
- ✅ Password strength validation
- ✅ Age verification requirement
- ✅ Duplicate user detection
- ✅ User login with credentials
- ✅ Invalid credentials handling
- ✅ Protected route access with JWT
- ✅ Token validation (valid, invalid, expired)
- ✅ Error handling

**Coverage:**
- Auth routes: 95%+ statement and branch coverage
- Auth middleware: 100% coverage

### 2. `manual-test-api.ts` - Integration Testing Script

Manual testing script for testing against a running server (local or production).

**Test local development server:**
```bash
# Start the server first
npm run dev

# In another terminal, run the manual tests
npx ts-node src/__tests__/manual-test-api.ts
```

**Test production API:**
```bash
API_URL=https://api.indexbin.com/api npx ts-node src/__tests__/manual-test-api.ts
```

**Verbose output (show all responses):**
```bash
VERBOSE=true API_URL=https://api.indexbin.com/api npx ts-node src/__tests__/manual-test-api.ts
```

**What's tested:**
- ✅ Registration endpoint with real database
- ✅ Email validation
- ✅ Password validation
- ✅ Login with valid credentials
- ✅ Login with invalid credentials
- ✅ Protected route with valid token
- ✅ Protected route without token
- ✅ Protected route with invalid token

## Test Coverage Summary

Current test coverage for auth endpoints:

```
File        | % Stmts | % Branch | % Funcs | % Lines
------------|---------|----------|---------|--------
auth.ts     |   95.58 |    96.42 |     100 |   95.38
auth.ts     |     100 |      100 |     100 |     100
```

## Troubleshooting

### Tests fail with "Database error"

The unit tests mock the database, so this error in test output is expected for error-handling tests. As long as the test passes (✓), it's working correctly.

### Manual tests fail with CORS error

Make sure your `CLIENT_URL` environment variable includes the origin you're testing from.

### Manual tests fail with "Failed to fetch"

1. Check that the server is running
2. Verify the API_URL is correct
3. Check network connectivity
4. Look at server logs for errors

### Manual tests timeout

Increase the fetch timeout or check if your server is responding slowly:
```bash
# Check server health
curl https://api.indexbin.com/health
```

## Adding New Tests

### Unit Tests

Add new test cases to `auth.test.ts`:

```typescript
it('should handle new scenario', async () => {
  // Setup mocks
  (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

  // Make request
  const response = await request(app)
    .post('/api/auth/register')
    .send({ /* test data */ });

  // Assertions
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('token');
});
```

### Integration Tests

Add new test functions to `manual-test-api.ts`:

```typescript
async function testNewFeature() {
  try {
    const response = await makeRequest('/auth/new-endpoint', 'POST', {
      // test data
    });

    if (response.ok) {
      results.push({
        name: 'New Feature Test',
        success: true,
        message: '✅ Feature works',
      });
    }
  } catch (error) {
    results.push({
      name: 'New Feature Test',
      success: false,
      message: `❌ Error: ${error}`,
    });
  }
}
```

## Continuous Integration

To run tests in CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Run tests
  run: |
    cd server
    npm install
    npm test
```

## Related Documentation

- [Server Routes Documentation](../../README.md)
- [Auth Middleware](../middlewares/auth.ts)
- [Prisma Schema](../../prisma/schema.prisma)
