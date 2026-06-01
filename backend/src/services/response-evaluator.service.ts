import { OpenAI } from 'openai';
import { env } from '../config/env';
import type { Question, CandidateResponse, EvaluationResult, EvaluationDimensions } from '../types';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class ResponseEvaluatorService {
  async evaluateResponse(
    question: Question,
    response: CandidateResponse
  ): Promise<EvaluationResult> {
    // Preprocess response
    const processedResponse = this.preprocessResponse(response);

    // Calculate time efficiency
    const timeEfficiency = this.calculateTimeEfficiency(response.timeSpent, question.timeLimit);

    // Evaluate with LLM
    const llmEvaluation = await this.evaluateWithLLM(question, processedResponse);

    // Aggregate scores
    const dimensions: EvaluationDimensions = {
      ...llmEvaluation.dimensions,
      timeEfficiency,
    };

    const finalScore = this.aggregateScore(dimensions);

    return {
      score: finalScore,
      dimensions,
      feedback: llmEvaluation.feedback,
      strengths: llmEvaluation.strengths,
      improvements: llmEvaluation.improvements,
      exampleBetterResponse: llmEvaluation.exampleBetterResponse,
    };
  }

  private preprocessResponse(response: CandidateResponse): string {
    let processed = response.content.trim();

    // Extract code blocks if present
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = processed.match(codeBlockRegex);

    if (codeBlocks) {
      // Normalize code blocks
      processed = processed.replace(codeBlockRegex, (match) => {
        return match.replace(/```(\w+)?\n/, '').replace(/```$/, '').trim();
      });
    }

    return processed;
  }

  private calculateTimeEfficiency(timeSpent: number, timeLimit: number): number {
    const ratio = timeSpent / timeLimit;

    if (ratio <= 1.0) {
      // Within time limit - full score
      return 100;
    } else if (ratio <= 1.2) {
      // 10-20% overtime - 10% penalty
      return 90;
    } else {
      // >20% overtime - 25% penalty
      return 75;
    }
  }

  private async evaluateWithLLM(
    question: Question,
    response: string
  ): Promise<{
    dimensions: Omit<EvaluationDimensions, 'timeEfficiency'>;
    feedback: string;
    strengths: string[];
    improvements: string[];
    exampleBetterResponse?: string;
  }> {
    const prompt = `Evaluate the following interview response:

Question Type: ${question.type}
Difficulty: ${question.difficulty}
Skill Area: ${question.skillArea}

Question:
${question.text}

Candidate's Response:
${response}

Evaluation Criteria:
- Accuracy: ${question.evaluationCriteria.accuracy}
- Clarity: ${question.evaluationCriteria.clarity}
- Depth: ${question.evaluationCriteria.depth}
- Relevance: ${question.evaluationCriteria.relevance}

Provide a detailed evaluation in the following JSON format:
{
  "dimensions": {
    "accuracy": <score 0-100>,
    "clarity": <score 0-100>,
    "depth": <score 0-100>,
    "relevance": <score 0-100>
  },
  "feedback": "<overall feedback explaining the scores>",
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "exampleBetterResponse": "<optional: example of a better response if score is below 70>"
}

Be objective, constructive, and specific in your evaluation.`;

    const completion = await openai.chat.completions.create({
      model: env.OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert technical interviewer evaluating candidate responses. Provide fair, objective, and constructive feedback.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');

    return result;
  }

  private aggregateScore(dimensions: EvaluationDimensions): number {
    // Weighted average
    const weights = {
      accuracy: 0.3,
      clarity: 0.2,
      depth: 0.2,
      relevance: 0.2,
      timeEfficiency: 0.1,
    };

    const weightedScore =
      dimensions.accuracy * weights.accuracy +
      dimensions.clarity * weights.clarity +
      dimensions.depth * weights.depth +
      dimensions.relevance * weights.relevance +
      dimensions.timeEfficiency * weights.timeEfficiency;

    return Math.round(weightedScore);
  }
}

export const responseEvaluatorService = new ResponseEvaluatorService();
