import OpenAI from "openai";
import type { Website } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
}

export class OpenAIService {
  async generateArticleIdeas(
    website: Website,
    count: number = 5
  ): Promise<GeneratedIdea[]> {
    const prompt = `You are an expert SEO content strategist. Generate ${count} compelling article ideas for a blog with the following context:

Website: ${website.name}
URL: ${website.url}
Target Keywords: ${website.keywords.join(", ")}
Tone: ${website.tone || "Professional and informative"}
Target Audience: ${website.audience || "General audience"}

For each article idea, provide:
1. A compelling, SEO-optimized headline
2. Confidence score (0-100) based on SEO potential and relevance
3. Primary keywords to target (3-5)
4. Estimated word count (1000-3000)
5. SEO score (0-100) based on keyword relevance and search intent

Return your response as a JSON array of objects with these exact fields: headline, confidence, keywords (array), estimatedWords, seoScore.`;

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
    const prompt = `You are an expert SEO content writer. Write a comprehensive, SEO-optimized blog post with the following specifications:

Headline: ${headline}
Website: ${website.name}
Target Keywords: ${keywords.join(", ")}
Additional Context Keywords: ${website.keywords.join(", ")}
Target Word Count: ${estimatedWords}
Tone: ${website.tone || "Professional and informative"}
Audience: ${website.audience || "General audience"}

Requirements:
1. Write in MDX format (Markdown with optional JSX)
2. Include proper frontmatter with: title, description, date, keywords, author
3. Use headers (H2, H3) for structure
4. Naturally incorporate target keywords (aim for 2-3% density)
5. Write clear, engaging content optimized for readability
6. Include a compelling meta description (150-160 characters)
7. Add practical examples and actionable advice
8. Conclude with a clear call-to-action

Return your response as JSON with these fields:
- title: The article title
- content: The full MDX content (without frontmatter)
- frontmatter: Object with metadata
- excerpt: A 2-3 sentence summary
- readabilityScore: 0-100 based on clarity
- keywordDensity: percentage of keyword usage`;

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

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error("No content generated from OpenAI");
    }

    const parsed = JSON.parse(content);
    
    // Calculate word count
    const wordCount = parsed.content.split(/\s+/).length;

    return {
      title: parsed.title || headline,
      content: parsed.content,
      excerpt: parsed.excerpt,
      wordCount,
      readabilityScore: parsed.readabilityScore || 75,
      keywordDensity: parsed.keywordDensity || 2.5,
      frontmatter: parsed.frontmatter || {
        title: parsed.title || headline,
        description: parsed.excerpt,
        date: new Date().toISOString(),
        keywords: keywords,
        author: "AI Content Generator",
      },
    };
  }
}

export const openaiService = new OpenAIService();
