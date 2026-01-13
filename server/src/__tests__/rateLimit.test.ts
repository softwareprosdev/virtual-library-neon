import request from 'supertest';
import express, { Express } from 'express';

// Mocks must be defined BEFORE imports of the modules being mocked
jest.mock('../db', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../services/emailVerification', () => ({
  resendVerificationCode: jest.fn().mockImplementation((req, res) => {
    res.status(200).json({ message: 'Verification code sent' });
  }),
  enhancedSignup: jest.fn(),
  verifyEmailWithCode: jest.fn(),
}));

jest.mock('../middleware/validation', () => ({
  validateEmail: jest.fn().mockReturnValue(true),
  validatePasswordStrength: jest.fn().mockReturnValue({ valid: true }),
}));

jest.mock('../middleware/monitoring', () => ({
  logSecurityEvent: jest.fn(),
  trackFailedAuth: jest.fn(),
  resetFailedAuth: jest.fn(),
}));

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn(),
    },
  })),
}));

// Import routes AFTER mocks
import authRoutes from '../routes/auth';

describe('Auth API Rate Limiting', () => {
  let app: Express;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/auth', authRoutes);
  });

  it('should limit resend verification attempts', async () => {
    const email = 'test@example.com';

    // Send 3 requests - should succeed (assuming limit will be 3)
    // Currently limit is 20, so these will pass.
    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .post('/api/auth/resend-verification')
        .send({ email });

      expect(response.status).not.toBe(429);
    }

    // Send 4th request - should fail if limit is 3
    const response = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email });

    // This expectation is for the DESIRED behavior (limit 3).
    // Currently it is 20, so this test should FAIL initially.
    expect(response.status).toBe(429);
    expect(response.body.message).toBe('Too many verification attempts, please try again later.');
  });
});
