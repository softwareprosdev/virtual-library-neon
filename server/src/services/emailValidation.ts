
import axios from 'axios';

class EmailValidationService {
  private hunterApiKey: string;
  private abstractApiKey: string;

  constructor() {
    this.hunterApiKey = process.env.HUNTER_API_KEY || '';
    this.abstractApiKey = process.env.ABSTRACT_API_KEY || '';
  }

  // Multiple validation methods for redundancy
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
      // Method 1: Hunter.io validation
      if (this.hunterApiKey) {
        const hunterResult = await this.validateWithHunter(email);
        if (hunterResult) {
          results.details.hunter = hunterResult;
          results.isDeliverable = results.isDeliverable && hunterResult.data.status === 'valid';
          results.isDisposable = results.isDisposable || hunterResult.data.disposable;
          results.score = Math.min(results.score, hunterResult.data.score || 100);
        }
      }

      // Method 2: Abstract API validation
      if (this.abstractApiKey) {
        const abstractResult = await this.validateWithAbstract(email);
        if (abstractResult) {
          results.details.abstract = abstractResult;
          results.isDeliverable = results.isDeliverable && abstractResult.deliverability === 'DELIVERABLE';
          results.isDisposable = results.isDisposable || abstractResult.is_disposable_email;
          results.score = Math.min(results.score, abstractResult.quality_score * 100);
        }
      }

      // Method 3: Basic MX record check
      const mxResult = await this.checkMXRecord(email);
      results.details.mx = mxResult;
      results.isDeliverable = results.isDeliverable && mxResult.hasMX;

      // Method 4: Common disposable email domains
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

      // Final validity based on all checks
      results.isValid = results.isDeliverable && !results.isDisposable && results.score > 30;

      return results;
    } catch (error) {
      console.error('Email validation error:', error);
      // If validation services fail, allow but with low confidence
      return {
        isValid: true,
        isDeliverable: false,
        isDisposable: false,
        score: 50,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  private async validateWithHunter(email: string) {
    try {
      const response = await axios.get(`https://api.hunter.io/v2/email-verifier`, {
        params: {
          email,
          api_key: this.hunterApiKey
        }
      });
      return response.data;
    } catch (error) {
      console.error('Hunter API error:', error);
      return null;
    }
  }

  private async validateWithAbstract(email: string) {
    try {
      const response = await axios.get(`https://emailvalidation.abstractapi.com/v1/`, {
        params: {
          api_key: this.abstractApiKey,
          email
        }
      });
      return response.data;
    } catch (error) {
      console.error('Abstract API error:', error);
      return null;
    }
  }

  private async checkMXRecord(email: string): Promise<{ hasMX: boolean; domain: string }> {
    const dns = require('dns').promises;
    const domain = email.split('@')[1];
    
    try {
      const mxRecords = await dns.resolveMx(domain);
      return {
        hasMX: mxRecords.length > 0,
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