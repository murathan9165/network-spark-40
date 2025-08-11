export type CrawlResponse = {
  success?: boolean;
  status?: string;
  completed?: number;
  total?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: any[];
};

export class FirecrawlService {
  private static API_KEY_STORAGE_KEY = 'firecrawl_api_key'; // kept for compatibility (no longer used)

  static saveApiKey(apiKey: string): void {
    // Kept for backward compatibility; keys are now stored securely in Supabase Secrets
    localStorage.setItem(this.API_KEY_STORAGE_KEY, apiKey);
  }

  static getApiKey(): string | null {
    return localStorage.getItem(this.API_KEY_STORAGE_KEY);
  }

  static async testApiKey(_: string): Promise<boolean> {
    // No longer used on the client; keys live in Supabase
    return true;
  }

  static async crawlWebsite(url: string): Promise<{ success: boolean; error?: string; data?: any }>
  {
    try {
      const res = await fetch('/functions/v1/firecrawl-crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const txt = await res.text();
        return { success: false, error: txt || 'Failed to crawl website' };
      }

      const data = await res.json();
      return { success: true, data };
    } catch (error) {
      console.error('Error during crawl:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to backend',
      };
    }
  }
}
