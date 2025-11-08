import { openaiService } from './openai';
import type { ScrapedContent } from './scraper';

export interface AnalyzedContent {
  faqs: Array<{ question: string; answer: string; relevanceScore: number }>;
  keyTopics: string[];
  commonQuestions: string[];
  contentThemes: string[];
  seoInsights: {
    primaryKeywords: string[];
    semanticKeywords: string[];
    contentGaps: string[];
    recommendedTopics: string[];
  };
  summary: string;
  cta?: {
    text: string;
    url: string;
  };
}

export class ContentAnalyzerService {
  /**
   * Uses AI to analyze scraped content and extract FAQs, topics, and SEO insights
   */
  async analyzeContent(scrapedContent: ScrapedContent[], websiteUrl?: string): Promise<AnalyzedContent> {
    // Combine all scraped content
    const combinedText = scrapedContent
      .map(content => content.fullText)
      .join('\n\n---\n\n');
    
    const allFaqs = scrapedContent.flatMap(content => content.faqSections);
    const allHeadings = scrapedContent.flatMap(content => content.headings);
    const allParagraphs = scrapedContent.flatMap(content => content.paragraphs);
    const allCtaCandidates = scrapedContent.flatMap(content => content.ctaCandidates || []);

    const prompt = `You are an expert SEO content analyst. Analyze the following website content and extract valuable insights for content generation.

Website Content:
${combinedText.substring(0, 15000)} ${combinedText.length > 15000 ? '... (truncated)' : ''}

Existing FAQs Found:
${allFaqs.map(faq => `Q: ${faq.question}\nA: ${faq.answer}`).join('\n\n')}

Headings Found:
${allHeadings.join('\n')}

CTA Candidates Found:
${allCtaCandidates.map(cta => `Text: "${cta.text}" → URL: ${cta.href}`).join('\n')}

Your task:
1. Extract and enhance FAQs - identify questions that users commonly ask about this topic, even if not explicitly stated. Rate each FAQ's relevance (0-100).
2. Identify key topics and themes from the content
3. Generate common questions that potential readers might have
4. Provide SEO insights including:
   - Primary keywords (most important)
   - Semantic keywords (related terms)
   - Content gaps (topics not covered but should be)
   - Recommended topics for new articles
5. Suggest the best Call-to-Action (CTA) based on the CTA candidates found. Choose the most prominent and relevant CTA that would work well for blog articles. If no good CTA candidates are found, suggest a generic one like "Learn More" with the website's homepage URL.

Return your response as JSON with this exact structure:
{
  "faqs": [{"question": string, "answer": string, "relevanceScore": number}],
  "keyTopics": [string],
  "commonQuestions": [string],
  "contentThemes": [string],
  "seoInsights": {
    "primaryKeywords": [string],
    "semanticKeywords": [string],
    "contentGaps": [string],
    "recommendedTopics": [string]
  },
  "summary": "A 2-3 sentence summary of the website's main focus and content",
  "cta": {
    "text": "Suggested CTA text (e.g., 'Learn More', 'Get Started', 'Sign Up')",
    "url": "Full URL for the CTA (use homepage if no specific URL found)"
  }
}`;

    try {
      // Use the existing OpenAI service
      const OpenAI = (await import('openai')).default;
      
      if (!process.env.OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured');
      }
      
      console.log(`🤖 [OpenAI] Analyzing scraped content (${scrapedContent.length} pages)...`);
      console.log(`🤖 [OpenAI] Making API call to gpt-4o for content analysis...`);
      
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert SEO content analyst who extracts valuable insights from website content to improve SEO and content strategy. Always respond with valid JSON.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      });
      
      console.log(`✅ [OpenAI] Content analysis successful. Tokens used: ${response.usage?.total_tokens || 'unknown'}`);

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("No content generated from OpenAI");
      }

      const parsed = JSON.parse(content);
      
      // Merge existing FAQs with AI-generated ones, removing duplicates
      const existingFaqMap = new Map(
        allFaqs.map(faq => [faq.question.toLowerCase(), { ...faq, relevanceScore: 90 }])
      );
      
      const aiFaqs = (parsed.faqs || []).filter((faq: any) => {
        const key = faq.question.toLowerCase();
        return !existingFaqMap.has(key);
      });

      const allFaqsCombined = [
        ...Array.from(existingFaqMap.values()),
        ...aiFaqs,
      ].sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Extract base URL from website URL or scraped content for CTA fallback
      let baseUrl = '';
      if (websiteUrl) {
        try {
          baseUrl = new URL(websiteUrl).origin;
        } catch {
          // Invalid URL, try to extract from scraped content
        }
      }
      if (!baseUrl && scrapedContent.length > 0 && scrapedContent[0].links.length > 0) {
        try {
          baseUrl = new URL(scrapedContent[0].links[0].href).origin;
        } catch {
          baseUrl = '';
        }
      }

      // Helper to resolve relative URLs
      const resolveUrl = (href: string): string => {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return href;
        }
        if (href.startsWith('/')) {
          return `${baseUrl}${href}`;
        }
        return `${baseUrl}/${href}`;
      };

      // Get CTA from AI or use best candidate
      let cta = parsed.cta;
      if (!cta && allCtaCandidates.length > 0) {
        // Use the first CTA candidate as fallback
        const bestCta = allCtaCandidates[0];
        cta = {
          text: bestCta.text,
          url: resolveUrl(bestCta.href),
        };
      } else if (!cta) {
        // Generic fallback
        cta = {
          text: 'Learn More',
          url: baseUrl || websiteUrl || '/',
        };
      } else if (cta.url && !cta.url.startsWith('http')) {
        // Ensure CTA URL is absolute
        cta.url = resolveUrl(cta.url);
      }

      return {
        faqs: allFaqsCombined.slice(0, 20), // Top 20 most relevant
        keyTopics: parsed.keyTopics || [],
        commonQuestions: parsed.commonQuestions || [],
        contentThemes: parsed.contentThemes || [],
        seoInsights: parsed.seoInsights || {
          primaryKeywords: [],
          semanticKeywords: [],
          contentGaps: [],
          recommendedTopics: [],
        },
        summary: parsed.summary || '',
        cta,
      };
    } catch (error) {
      console.error('❌ [OpenAI] Error analyzing content:', error);
      console.error('❌ [OpenAI] Error details:', error instanceof Error ? error.message : String(error));
      console.error('❌ [OpenAI] Using fallback data instead of AI analysis');
      // Extract base URL for CTA fallback
      let baseUrl = '';
      if (websiteUrl) {
        try {
          baseUrl = new URL(websiteUrl).origin;
        } catch {
          // Invalid URL
        }
      }
      if (!baseUrl && scrapedContent.length > 0 && scrapedContent[0].links.length > 0) {
        try {
          baseUrl = new URL(scrapedContent[0].links[0].href).origin;
        } catch {
          baseUrl = '';
        }
      }

      const resolveUrl = (href: string): string => {
        if (href.startsWith('http://') || href.startsWith('https://')) {
          return href;
        }
        if (href.startsWith('/')) {
          return `${baseUrl}${href}`;
        }
        return `${baseUrl}/${href}`;
      };

      // Return fallback data
      let fallbackCta = {
        text: 'Learn More',
        url: baseUrl || websiteUrl || '/',
      };
      
      if (allCtaCandidates.length > 0) {
        const bestCta = allCtaCandidates[0];
        fallbackCta = {
          text: bestCta.text,
          url: resolveUrl(bestCta.href),
        };
      }

      return {
        faqs: allFaqs.map(faq => ({ ...faq, relevanceScore: 80 })),
        keyTopics: allHeadings.slice(0, 10),
        commonQuestions: [],
        contentThemes: [],
        seoInsights: {
          primaryKeywords: [],
          semanticKeywords: [],
          contentGaps: [],
          recommendedTopics: [],
        },
        summary: 'Content analysis unavailable',
        cta: fallbackCta,
      };
    }
  }
}

export const contentAnalyzerService = new ContentAnalyzerService();

