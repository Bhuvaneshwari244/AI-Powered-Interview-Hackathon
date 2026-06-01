import fs from 'fs/promises';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { OpenAI } from 'openai';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { generateFileHash } from '../utils/file-upload';
import type { ParsedResume, ParsedJobDescription } from '../types';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class DocumentParserService {
  private readonly CACHE_TTL = 30 * 24 * 60 * 60; // 30 days in seconds

  async parseResume(filePath: string): Promise<ParsedResume> {
    try {
      // Read file
      const fileBuffer = await fs.readFile(filePath);
      const fileHash = generateFileHash(fileBuffer);

      // Check cache
      const cacheKey = `document:resume:${fileHash}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('Resume found in cache');
        return JSON.parse(cached);
      }

      // Extract text
      const text = await this.extractText(filePath, fileBuffer);

      // Parse with LLM
      const parsed = await this.parseResumeWithLLM(text);

      // Cache result
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(parsed));

      return parsed;
    } finally {
      // Clean up uploaded file
      await fs.unlink(filePath).catch(() => {});
    }
  }

  async parseJobDescription(input: string | { filePath: string }): Promise<ParsedJobDescription> {
    try {
      let text: string;
      let fileHash: string;

      if (typeof input === 'string') {
        // Plain text input
        text = input;
        fileHash = generateFileHash(Buffer.from(text));
      } else {
        // File input
        const fileBuffer = await fs.readFile(input.filePath);
        fileHash = generateFileHash(fileBuffer);
        text = await this.extractText(input.filePath, fileBuffer);
      }

      // Check cache
      const cacheKey = `document:jd:${fileHash}`;
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        console.log('Job description found in cache');
        return JSON.parse(cached);
      }

      // Parse with LLM
      const parsed = await this.parseJobDescriptionWithLLM(text);

      // Cache result
      await redisClient.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(parsed));

      // Clean up file if it was uploaded
      if (typeof input !== 'string') {
        await fs.unlink(input.filePath).catch(() => {});
      }

      return parsed;
    } catch (error) {
      // Clean up file on error
      if (typeof input !== 'string') {
        await fs.unlink(input.filePath).catch(() => {});
      }
      throw error;
    }
  }

  private async extractText(filePath: string, buffer: Buffer): Promise<string> {
    const ext = filePath.toLowerCase().split('.').pop();

    try {
      if (ext === 'pdf') {
        const data = await pdfParse(buffer);
        return this.normalizeText(data.text);
      } else if (ext === 'docx' || ext === 'doc') {
        const result = await mammoth.extractRawText({ buffer });
        return this.normalizeText(result.value);
      } else if (ext === 'txt') {
        return this.normalizeText(buffer.toString('utf-8'));
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Failed to extract text from ${ext} file: ${error}`);
    }
  }

  private normalizeText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private async parseResumeWithLLM(text: string): Promise<ParsedResume> {
    const prompt = `Extract structured information from the following resume. Return a JSON object with this exact structure:

{
  "skills": [
    {
      "category": "Programming Languages",
      "skills": ["Python", "JavaScript"]
    }
  ],
  "experience": [
    {
      "title": "Software Engineer",
      "company": "Tech Corp",
      "duration": "2020-2023",
      "responsibilities": ["Developed features", "Led team"]
    }
  ],
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "technologies": ["React", "Node.js"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "University Name",
      "year": "2020"
    }
  ],
  "certifications": ["AWS Certified", "Google Cloud"]
}

Resume text:
${text}

Return only valid JSON, no additional text.`;

    const response = await this.callOpenAI(prompt);
    const parsed = JSON.parse(response);

    return {
      ...parsed,
      rawText: text,
    };
  }

  private async parseJobDescriptionWithLLM(text: string): Promise<ParsedJobDescription> {
    const prompt = `Extract structured information from the following job description. Return a JSON object with this exact structure:

{
  "requiredSkills": [
    {
      "category": "Programming Languages",
      "skills": ["Python", "Java"]
    }
  ],
  "preferredSkills": [
    {
      "category": "Frameworks",
      "skills": ["React", "Django"]
    }
  ],
  "responsibilities": ["Design and develop", "Collaborate with team"],
  "experienceLevel": "Mid",
  "minimumYears": 3
}

Valid experienceLevel values: "Entry", "Mid", "Senior", "Lead"

Job Description text:
${text}

Return only valid JSON, no additional text.`;

    const response = await this.callOpenAI(prompt);
    const parsed = JSON.parse(response);

    return {
      ...parsed,
      rawText: text,
    };
  }

  private async callOpenAI(prompt: string, retries = 3): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const completion = await openai.chat.completions.create({
          model: env.OPENAI_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that extracts structured information from documents. Always return valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 2000,
        });

        return completion.choices[0].message.content || '{}';
      } catch (error) {
        if (attempt === retries) {
          throw new Error(`OpenAI API call failed after ${retries} attempts: ${error}`);
        }
        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    throw new Error('OpenAI API call failed');
  }
}

export const documentParserService = new DocumentParserService();
