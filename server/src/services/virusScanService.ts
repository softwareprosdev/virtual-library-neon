import FormData from 'form-data';
import fs from 'fs';

interface VirusTotalResponse {
  data: {
    type: string;
    id: string;
    links: {
      self: string;
    };
  };
}

interface AnalysisResponse {
  data: {
    attributes: {
      status: string;
      stats: {
        malicious: number;
        suspicious: number;
        undetected: number;
        harmless: number;
        timeout: number;
      };
    };
  };
}

class VirusScanService {
  private apiKey: string;
  private baseUrl = 'https://www.virustotal.com/api/v3';
  private enabled: boolean;

  constructor() {
    this.apiKey = process.env.VIRUSTOTAL_API_KEY || '';
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      console.warn('⚠️  VirusTotal API key not configured. File scanning disabled.');
    }
  }

  /**
   * Scan a file for malware using VirusTotal
   * @param filePath Path to the file to scan
   * @returns Scan result with malicious/suspicious counts
   */
  async scanFile(filePath: string): Promise<{
    safe: boolean;
    malicious: number;
    suspicious: number;
    scanId?: string;
    error?: string;
  }> {
    // If VirusTotal is not enabled, allow all files (dev mode)
    if (!this.enabled) {
      console.log('ℹ️  VirusTotal disabled - skipping scan for:', filePath);
      return {
        safe: true,
        malicious: 0,
        suspicious: 0
      };
    }

    try {
      // Step 1: Upload file
      const uploadResult = await this.uploadFile(filePath);

      if (!uploadResult.success || !uploadResult.scanId) {
        return {
          safe: false,
          malicious: 0,
          suspicious: 0,
          error: 'Failed to upload file to VirusTotal'
        };
      }

      console.log(`🔍 File uploaded to VirusTotal. Scan ID: ${uploadResult.scanId}`);

      // Step 2: Wait for analysis (with retry logic)
      const analysis = await this.waitForAnalysis(uploadResult.scanId);

      if (!analysis) {
        return {
          safe: false,
          malicious: 0,
          suspicious: 0,
          error: 'Analysis timeout or failed'
        };
      }

      const { malicious, suspicious } = analysis.stats;

      // File is safe if no malicious or suspicious detections
      const isSafe = malicious === 0 && suspicious === 0;

      console.log(`${isSafe ? '✅' : '🚨'} Scan complete: Malicious=${malicious}, Suspicious=${suspicious}`);

      return {
        safe: isSafe,
        malicious,
        suspicious,
        scanId: uploadResult.scanId
      };
    } catch (error) {
      console.error('❌ VirusTotal scan error:', error);
      return {
        safe: false,
        malicious: 0,
        suspicious: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Upload file to VirusTotal
   */
  private async uploadFile(filePath: string): Promise<{
    success: boolean;
    scanId?: string;
  }> {
    try {
      const formData = new FormData();
      formData.append('file', fs.createReadStream(filePath));

      const response = await fetch(`${this.baseUrl}/files`, {
        method: 'POST',
        headers: {
          'x-apikey': this.apiKey
        },
        body: formData as any
      });

      if (!response.ok) {
        console.error('VirusTotal upload failed:', response.statusText);
        return { success: false };
      }

      const result: VirusTotalResponse = await response.json();

      return {
        success: true,
        scanId: result.data.id
      };
    } catch (error) {
      console.error('VirusTotal upload error:', error);
      return { success: false };
    }
  }

  /**
   * Wait for analysis to complete (with retries)
   */
  private async waitForAnalysis(
    scanId: string,
    maxAttempts = 10,
    delayMs = 5000
  ): Promise<{ stats: AnalysisResponse['data']['attributes']['stats'] } | null> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/analyses/${scanId}`, {
          headers: {
            'x-apikey': this.apiKey
          }
        });

        if (!response.ok) {
          console.warn(`Attempt ${attempt + 1}: Analysis not ready yet`);
          await this.delay(delayMs);
          continue;
        }

        const result: AnalysisResponse = await response.json();
        const status = result.data.attributes.status;

        if (status === 'completed') {
          return {
            stats: result.data.attributes.stats
          };
        }

        console.log(`Attempt ${attempt + 1}: Status = ${status}. Waiting...`);
        await this.delay(delayMs);
      } catch (error) {
        console.error(`Attempt ${attempt + 1} failed:`, error);
        await this.delay(delayMs);
      }
    }

    console.error('❌ Analysis timeout after', maxAttempts, 'attempts');
    return null;
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a file hash is already known to VirusTotal
   * (More efficient than uploading if file is common)
   */
  async checkFileHash(sha256: string): Promise<{
    safe: boolean;
    malicious: number;
    suspicious: number;
  }> {
    if (!this.enabled) {
      return { safe: true, malicious: 0, suspicious: 0 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/files/${sha256}`, {
        headers: {
          'x-apikey': this.apiKey
        }
      });

      if (!response.ok) {
        // File not found in VirusTotal database
        return { safe: true, malicious: 0, suspicious: 0 };
      }

      const result: any = await response.json();
      const stats = result.data.attributes.last_analysis_stats;

      return {
        safe: stats.malicious === 0 && stats.suspicious === 0,
        malicious: stats.malicious || 0,
        suspicious: stats.suspicious || 0
      };
    } catch (error) {
      console.error('VirusTotal hash check error:', error);
      return { safe: true, malicious: 0, suspicious: 0 };
    }
  }
}

export default new VirusScanService();
