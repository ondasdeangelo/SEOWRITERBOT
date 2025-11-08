import OpenAI from "openai";
import type { Website } from "@shared/schema";

// Lazily initialize the OpenAI client. If OPENAI_API_KEY is missing we don't want the
// constructor to throw at import time — instead API calls will fail with a clear error.
let openai: OpenAI | null = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
} else {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn('OPENAI_API_KEY not set — OpenAI calls will fail (development).');
  }
}

export interface GeneratedIdea {
  headline: string;
  confidence: number;
  keywords: string[];
  estimatedWords: number;
  seoScore: number;
}

export interface GeneratedDraft {
  title: string;
  content: string;
  excerpt: string;
  wordCount: number;
  readabilityScore: number;
  keywordDensity: number;
  frontmatter: Record<string, any>;
  imageUrl?: string; // AI-generated image URL
}

export class OpenAIService {
  async generateArticleIdeas(
    website: Website,
    count: number = 5
  ): Promise<GeneratedIdea[]> {
    // Extract scraped data if available
    const scrapedData = (website as any).scrapedData as any;
    const faqs = scrapedData?.faqs || [];
    const keyTopics = scrapedData?.keyTopics || [];
    const seoInsights = scrapedData?.seoInsights || {};
    const commonQuestions = scrapedData?.commonQuestions || [];
    const recommendedTopics = seoInsights?.recommendedTopics || [];

    const scrapedContext = scrapedData ? `
REAL-WORLD DATA FROM WEBSITE ANALYSIS:
- Key Topics Found: ${keyTopics.join(", ")}
- Common Questions: ${commonQuestions.slice(0, 5).join(", ")}
- Recommended Topics: ${recommendedTopics.join(", ")}
- Primary SEO Keywords: ${seoInsights.primaryKeywords?.join(", ") || "N/A"}
- Semantic Keywords: ${seoInsights.semanticKeywords?.slice(0, 10).join(", ") || "N/A"}
- Content Gaps: ${seoInsights.contentGaps?.join(", ") || "None identified"}
- Top FAQs Found: ${faqs.slice(0, 3).map((f: any) => `Q: ${f.question}`).join("\n")}

Use this real-world data to generate article ideas that:
1. Address actual user questions and FAQs
2. Fill content gaps identified in the analysis
3. Target the primary and semantic keywords found
4. Cover recommended topics that will improve SEO
` : '';

    const prompt = `You are an expert SEO content strategist. Generate ${count} compelling article ideas for a blog with the following context:

Website: ${website.name}
URL: ${website.url}
Target Keywords: ${website.keywords.join(", ")}
Tone: ${website.tone || "Professional and informative"}
Target Audience: ${website.audience || "General audience"}
${scrapedContext}
For each article idea, provide:
1. A compelling, SEO-optimized headline that addresses real user questions
2. Confidence score (0-100) based on SEO potential and relevance to actual user needs
3. Primary keywords to target (3-5) - prioritize keywords from the real-world data
4. Estimated word count (1000-3000)
5. SEO score (0-100) based on keyword relevance, search intent, and alignment with user questions

${scrapedData ? 'IMPORTANT: Prioritize ideas that answer the FAQs and common questions found on the website. This will significantly improve SEO rankings.' : ''}

Return your response as a JSON array of objects with these exact fields: headline, confidence, keywords (array), estimatedWords, seoScore.`;

    if (!openai) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY to enable AI features.');
    }
    
    console.log(`🤖 [OpenAI] Generating ${count} article ideas for website: ${website.name}`);
    console.log(`🤖 [OpenAI] Making API call to gpt-4o...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO content strategist who generates high-quality article ideas optimized for search engines and user engagement. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.8,
    });
    
    console.log(`✅ [OpenAI] API call successful. Tokens used: ${response.usage?.total_tokens || 'unknown'}`);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }

    const parsed = JSON.parse(content);
    return parsed.ideas || parsed.articles || [];
  }

  async generateDraft(
    headline: string,
    website: Website,
    keywords: string[],
    estimatedWords: number
  ): Promise<GeneratedDraft> {
    // Extract scraped data if available
    const scrapedData = (website as any).scrapedData as any;
    const faqs = scrapedData?.faqs || [];
    const relevantFaqs = faqs
      .filter((faq: any) => 
        headline.toLowerCase().includes(faq.question.toLowerCase().split(' ')[0]) ||
        faq.question.toLowerCase().includes(headline.toLowerCase().split(' ')[0])
      )
      .slice(0, 5);

    const scrapedContext = scrapedData ? `
REAL-WORLD DATA TO INCORPORATE:
- Relevant FAQs to address: ${relevantFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}
- Key Topics: ${scrapedData.keyTopics?.join(", ") || "N/A"}
- SEO Insights: ${scrapedData.seoInsights?.primaryKeywords?.join(", ") || "N/A"}

CRITICAL: Naturally incorporate answers to the relevant FAQs into your content. This real-world data will significantly improve SEO and user engagement.
` : '';

    // Get CTA from website configuration
    const ctaText = (website as any).ctaText;
    const ctaUrl = (website as any).ctaUrl;
    
    const ctaInstruction = ctaText && ctaUrl ? `
CALL-TO-ACTION REQUIREMENT:
- CTA Text: "${ctaText}"
- CTA URL: ${ctaUrl}
- IMPORTANT: You MUST conclude the article with a call-to-action section that includes a link using the exact CTA text and URL provided above.
- Format the CTA as a prominent button or link at the end of the article.
- Example format: [${ctaText}](${ctaUrl}) or use MDX button component if available.
` : `
CALL-TO-ACTION REQUIREMENT:
- Conclude the article with a clear, compelling call-to-action that encourages readers to engage further.
- If no specific CTA is provided, create an appropriate CTA based on the article topic and website context.
`;

    const prompt = `You are an expert SEO content writer. Write a comprehensive, SEO-optimized blog post with the following specifications:

Headline: ${headline}
Website: ${website.name}
Target Keywords: ${keywords.join(", ")}
Additional Context Keywords: ${website.keywords.join(", ")}
Target Word Count: ${estimatedWords}
Tone: ${website.tone || "Professional and informative"}
Audience: ${website.audience || "General audience"}
${scrapedContext}
${ctaInstruction}

Requirements:
1. Write in MDX format (Markdown with optional JSX)
2. Include proper frontmatter with: title, description, date, keywords, author
3. Use headers (H2, H3) for structure
4. Naturally incorporate target keywords (aim for 2-3% density)
5. Write clear, engaging content optimized for readability
6. Include a compelling meta description (150-160 characters)
7. Add practical examples and actionable advice
8. ${ctaText && ctaUrl ? `MUST include the specified CTA at the end: "${ctaText}" linking to ${ctaUrl}` : 'Conclude with a clear, compelling call-to-action'}

Return your response as JSON with these fields:
- title: The article title
- content: The full MDX content (without frontmatter)
- frontmatter: Object with metadata
- excerpt: A 2-3 sentence summary
- readabilityScore: 0-100 based on clarity
- keywordDensity: percentage of keyword usage`;

    if (!openai) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY to enable AI features.');
    }
    
    console.log(`🤖 [OpenAI] Generating draft for headline: "${headline}"`);
    console.log(`🤖 [OpenAI] Making API call to gpt-4o...`);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are an expert SEO content writer who creates comprehensive, engaging blog posts optimized for search engines. Always respond with valid JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });
    
    console.log(`✅ [OpenAI] Draft generation successful. Tokens used: ${response.usage?.total_tokens || 'unknown'}`);

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }

    const parsed = JSON.parse(content);
    
    // Calculate word count
    const wordCount = parsed.content.split(/\s+/).length;

    // Generate image for the article
    let imageUrl: string | undefined;
    try {
      console.log(`🖼️ [OpenAI] Generating image for article: "${headline}"`);
      console.log(`🖼️ [OpenAI] Keywords: ${keywords.slice(0, 3).join(", ")}`);
      imageUrl = await this.generateImage(headline, keywords, website.name);
      console.log(`✅ [OpenAI] Image generated successfully: ${imageUrl}`);
    } catch (error) {
      console.error(`❌ [OpenAI] Failed to generate image:`, error);
      console.error(`❌ [OpenAI] Error details:`, error instanceof Error ? error.message : String(error));
      if (error instanceof Error && error.stack) {
        console.error(`❌ [OpenAI] Stack trace:`, error.stack);
      }
      // Continue without image if generation fails
    }

    const frontmatter = parsed.frontmatter || {
      title: parsed.title || headline,
      description: parsed.excerpt,
      date: new Date().toISOString(),
      keywords: keywords,
      author: "AI Content Generator",
    };

    // Add image URL to frontmatter if available
    if (imageUrl) {
      frontmatter.image = imageUrl;
      frontmatter.imageUrl = imageUrl;
    }

    // Ensure keywordDensity is a valid float (percentage as decimal)
    let keywordDensity: number = 2.5; // Default value
    if (parsed.keywordDensity !== undefined && parsed.keywordDensity !== null) {
      if (typeof parsed.keywordDensity === 'string') {
        // Remove % sign and parse
        const parsedValue = parseFloat(parsed.keywordDensity.replace('%', '').trim());
        if (!isNaN(parsedValue) && isFinite(parsedValue)) {
          keywordDensity = parsedValue;
        }
      } else if (typeof parsed.keywordDensity === 'number') {
        if (!isNaN(parsed.keywordDensity) && isFinite(parsed.keywordDensity)) {
          keywordDensity = parsed.keywordDensity;
        }
      }
    }
    // Ensure it's a valid float (not integer, not NaN, not Infinity)
    keywordDensity = Number(keywordDensity);
    if (isNaN(keywordDensity) || !isFinite(keywordDensity)) {
      keywordDensity = 2.5; // Fallback to default
    }

    return {
      title: parsed.title || headline,
      content: parsed.content,
      excerpt: parsed.excerpt,
      wordCount,
      readabilityScore: parsed.readabilityScore || 75,
      keywordDensity,
      frontmatter,
      imageUrl,
    };
  }

  /**
   * Generates an image using DALL-E based on the article topic
   */
  async generateImage(
    headline: string,
    keywords: string[],
    websiteName: string
  ): Promise<string> {
    if (!openai) {
      throw new Error('OpenAI API key not configured. Set OPENAI_API_KEY to enable AI features.');
    }

    // Create a descriptive prompt for image generation
    const imagePrompt = `A professional, high-quality, modern illustration or photograph related to: ${headline}. 
    Keywords: ${keywords.slice(0, 3).join(", ")}. 
    Style: Clean, modern, suitable for a blog article header image. 
    Aspect ratio: 16:9 landscape format. 
    No text overlays.`;

    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: imagePrompt,
        n: 1,
        size: "1024x1024", // DALL-E 3 supports 1024x1024, 1792x1024, or 1024x1792
        quality: "standard",
        response_format: "url",
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error("No image URL returned from DALL-E");
      }

      return imageUrl;
    } catch (error) {
      console.error("Error generating image with DALL-E:", error);
      throw error;
    }
  }
}

export const openaiService = new OpenAIService();
