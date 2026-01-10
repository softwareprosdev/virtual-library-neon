import validator from 'validator';
import axios from 'axios';

class EmailValidationService {
  constructor() {}

  // Simplified validation without external APIs
  async validateEmail(email: string): Promise<{
    isValid: boolean;
    isDeliverable: boolean;
    isDisposable: boolean;
    score: number;
    details: any;
  }> {
    const results = {
      isValid: true,
      isDeliverable: true,
      isDisposable: false,
      score: 100,
      details: {} as any
    };

    try {
      // Basic format validation
      if (!validator.isEmail(email)) {
        return {
          isValid: false,
          isDeliverable: false,
          isDisposable: false,
          score: 0,
          details: { error: 'Invalid email format' }
        };
      }

      // Method 1: Basic MX record check
      const mxResult = await this.checkMXRecord(email);
      results.details.mx = mxResult;
      results.isDeliverable = mxResult.hasMX;

      // Method 2: Common disposable email domains
      const disposableDomains = [
        '10minutemail.com', 'tempmail.org', 'guerrillamail.com',
        'mailinator.com', 'yopmail.com', 'temp-mail.org',
        'throwaway.email', 'maildrop.cc', 'temp-mail.io'
      ];
      const domain = email.split('@')[1]?.toLowerCase();
      if (domain && disposableDomains.includes(domain)) {
        results.isDisposable = true;
        results.score = 0;
      }

      // Final validity based on format and disposal check
      results.isValid = !results.isDisposable && validator.isEmail(email);
      
      return results;
    } catch (error) {
      console.error('Email validation error:', error);
      return {
        isValid: validator.isEmail(email),
        isDeliverable: false,
        isDisposable: false,
        score: 50,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async checkMXRecord(email: string): Promise<{ hasMX: boolean; domain: string }> {
    const dns = require('dns').promises;
    const domain = email.split('@')[1];
    if (!domain) return { hasMX: false, domain: '' };
    
    try {
      const mxRecords = await dns.resolveMx(domain);
      return {
        hasMX: mxRecords && mxRecords.length > 0,
        domain
      };
    } catch (error) {
      return {
        hasMX: false,
        domain
      };
    }
  }
}

export const emailValidationService = new EmailValidationService();