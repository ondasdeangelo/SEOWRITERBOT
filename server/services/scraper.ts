import { load } from 'cheerio';

export interface ScrapedContent {
  title: string;
  description: string;
  headings: string[];
  paragraphs: string[];
  links: Array<{ text: string; href: string }>;
  ctaCandidates: Array<{ text: string; href: string }>; // Potential CTA buttons/links
  faqSections: Array<{ question: string; answer: string }>;
  metadata: {
    keywords?: string;
    author?: string;
    publishedDate?: string;
  };
  fullText: string;
}

export class ScraperService {
  /**
   * Scrapes a website and extracts structured content
   */
  async scrapeWebsite(url: string): Promise<ScrapedContent> {
    try {
      // Fetch the website content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
      }

      const html = await response.text();
      const $ = load(html);

      // Extract title
      const title = $('title').text() || $('h1').first().text() || '';

      // Extract meta description
      const description = $('meta[name="description"]').attr('content') || 
                         $('meta[property="og:description"]').attr('content') || '';

      // Extract headings (h1-h6)
      const headings: string[] = [];
      $('h1, h2, h3, h4, h5, h6').each((_, el) => {
        const text = $(el).text().trim();
        if (text) headings.push(text);
      });

      // Extract paragraphs
      const paragraphs: string[] = [];
      $('p, article, .content, .post-content, main p').each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length > 50) { // Filter out very short paragraphs
          paragraphs.push(text);
        }
      });

      // Extract links
      const links: Array<{ text: string; href: string }> = [];
      $('a[href]').each((_, el) => {
        const text = $(el).text().trim();
        const href = $(el).attr('href') || '';
        if (text && href) {
          links.push({ text, href });
        }
      });

      // Extract CTA buttons and links (common CTA patterns)
      const ctaCandidates: Array<{ text: string; href: string }> = [];
      
      // Look for buttons with common CTA text
      const ctaKeywords = ['sign up', 'signup', 'get started', 'start free', 'try free', 
                          'learn more', 'read more', 'download', 'subscribe', 'join', 'register', 
                          'buy now', 'shop now', 'contact us', 'get in touch', 'book now', 'order now'];
      
      // Extract from links with CTA text (prioritize links as they have URLs)
      $('a[href]').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        const href = $(el).attr('href') || '';
        if (text && href && ctaKeywords.some(keyword => text.includes(keyword))) {
          const linkText = $(el).text().trim();
          // Resolve relative URLs
          let resolvedHref = href;
          if (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
            try {
              const baseUrl = new URL(url).origin;
              resolvedHref = href.startsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;
            } catch {
              resolvedHref = href;
            }
          }
          ctaCandidates.push({ text: linkText, href: resolvedHref });
        }
      });

      // Extract from buttons (look for parent link or use homepage)
      $('button, .btn, .button, [class*="button"], [class*="cta"], [id*="cta"]').each((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text && ctaKeywords.some(keyword => text.includes(keyword))) {
          const linkText = $(el).text().trim();
          // Try to find associated link
          let href = $(el).closest('a').attr('href') || 
                     $(el).attr('data-href') || 
                     $(el).attr('onclick')?.match(/['"](https?:\/\/[^'"]+)['"]/)?.[1] || '';
          
          // If no href found, use homepage
          if (!href) {
            try {
              href = new URL(url).origin;
            } catch {
              href = url;
            }
          } else if (!href.startsWith('http://') && !href.startsWith('https://')) {
            try {
              const baseUrl = new URL(url).origin;
              href = href.startsWith('/') ? `${baseUrl}${href}` : `${baseUrl}/${href}`;
            } catch {
              // Keep original href
            }
          }
          
          if (linkText && href) {
            ctaCandidates.push({ text: linkText, href });
          }
        }
      });

      // Try to find FAQ sections (common patterns)
      const faqSections: Array<{ question: string; answer: string }> = [];
      
      // Pattern 1: FAQ sections with dt/dd
      $('dl.faq, .faq dl, [class*="faq"] dl').each((_, dl) => {
        const questions = $(dl).find('dt');
        const answers = $(dl).find('dd');
        questions.each((i, dt) => {
          const question = $(dt).text().trim();
          const answer = $(answers.eq(i)).text().trim();
          if (question && answer) {
            faqSections.push({ question, answer });
          }
        });
      });

      // Pattern 2: FAQ sections with h3/h4 + following p
      $('[class*="faq"], [id*="faq"], section.faq').each((_, section) => {
        $(section).find('h3, h4').each((_, heading) => {
          const question = $(heading).text().trim();
          const answer = $(heading).nextUntil('h3, h4').text().trim();
          if (question && answer) {
            faqSections.push({ question, answer });
          }
        });
      });

      // Extract metadata
      const metadata: ScrapedContent['metadata'] = {
        keywords: $('meta[name="keywords"]').attr('content') || undefined,
        author: $('meta[name="author"]').attr('content') || 
                $('[rel="author"]').text().trim() || undefined,
        publishedDate: $('meta[property="article:published_time"]').attr('content') ||
                      $('time[datetime]').attr('datetime') || undefined,
      };

      // Combine all text content
      const fullText = [
        title,
        description,
        ...headings,
        ...paragraphs,
      ].join('\n\n');

      return {
        title,
        description,
        headings,
        paragraphs,
        links,
        ctaCandidates,
        faqSections,
        metadata,
        fullText,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Don't log 404s as errors - they're expected for missing pages
      if (!errorMessage.includes('404')) {
        console.error(`Error scraping website ${url}:`, errorMessage);
      }
      throw new Error(`Failed to scrape website: ${errorMessage}`);
    }
  }

  /**
   * Scrapes multiple pages from a website (homepage + common pages)
   */
  async scrapeWebsiteDeep(url: string, maxPages: number = 5): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    const visited = new Set<string>();
    
    try {
      // Start with homepage
      const baseUrl = new URL(url).origin;
      const homepage = await this.scrapeWebsite(url);
      results.push(homepage);
      visited.add(url);

      // Find common page links (about, blog, contact, etc.)
      const commonPaths = ['/about', '/blog', '/contact', '/faq', '/help', '/support'];
      
      for (const path of commonPaths.slice(0, maxPages - 1)) {
        try {
          const pageUrl = `${baseUrl}${path}`;
          if (!visited.has(pageUrl)) {
            const content = await this.scrapeWebsite(pageUrl);
            results.push(content);
            visited.add(pageUrl);
            console.log(`✓ Successfully scraped: ${pageUrl}`);
          }
        } catch (error) {
          // Continue if a page fails (404s are expected for pages that don't exist)
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.includes('404')) {
            // Silently skip 404s - these are expected for pages that don't exist
          } else {
            console.warn(`⚠ Failed to scrape ${path}:`, errorMessage);
          }
        }
      }
    } catch (error) {
      console.error('Error in deep scrape:', error);
      // Return at least homepage if available
      if (results.length > 0) return results;
      throw error;
    }

    return results;
  }
}

export const scraperService = new ScraperService();

