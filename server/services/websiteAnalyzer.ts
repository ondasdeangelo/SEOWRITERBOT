import { scraperService } from './scraper';
import { contentAnalyzerService } from './contentAnalyzer';
import type { AnalyzedContent } from './contentAnalyzer';

export interface WebsiteAnalysis {
  analyzedContent: AnalyzedContent;
  scrapedAt: Date;
  url: string;
}

export class WebsiteAnalyzerService {
  /**
   * Scrapes a website and analyzes its content using AI
   */
  async analyzeWebsite(url: string): Promise<WebsiteAnalysis> {
    try {
      console.log(`Starting website analysis for: ${url}`);
      
      // Step 1: Scrape the website (homepage + common pages)
      const scrapedContent = await scraperService.scrapeWebsiteDeep(url, 5);
      console.log(`✓ Scraped ${scrapedContent.length} pages from ${url}`);

      // Step 2: Analyze the scraped content with AI
      const analyzedContent = await contentAnalyzerService.analyzeContent(scrapedContent, url);
      console.log(`✓ Analysis complete: Found ${analyzedContent.faqs.length} FAQs, ${analyzedContent.keyTopics.length} key topics`);
      if (analyzedContent.cta) {
        console.log(`✓ CTA generated: "${analyzedContent.cta.text}" → ${analyzedContent.cta.url}`);
      }

      return {
        analyzedContent,
        scrapedAt: new Date(),
        url,
      };
    } catch (error) {
      console.error(`Error analyzing website ${url}:`, error);
      throw new Error(`Failed to analyze website: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export const websiteAnalyzerService = new WebsiteAnalyzerService();

