import { OpenAI } from 'openai';
import { query } from '../config/database';
import { env } from '../config/env';
import type {
  ReadinessReport,
  SkillAreaScore,
  Strength,
  Weakness,
  QuestionFeedback,
  TimeAnalysis,
  Recommendation,
  ReadinessLevel,
  TrendReport,
  SkillAreaTrend,
} from '../types';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

export class ReportGeneratorService {
  async generateReport(sessionId: string): Promise<ReadinessReport> {
    // Fetch session data
    const sessionResult = await query(
      `SELECT s.*, c.id as candidate_id 
       FROM interview_sessions s 
       JOIN candidates c ON s.candidate_id = c.id 
       WHERE s.id = $1`,
      [sessionId]
    );

    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }

    const session = sessionResult.rows[0];

    // Fetch questions and responses
    const questionsResult = await query(
      `SELECT * FROM session_questions WHERE session_id = $1 ORDER BY question_index`,
      [sessionId]
    );

    const questions = questionsResult.rows;

    // Fetch performance metrics
    const metricsResult = await query(
      `SELECT * FROM performance_metrics WHERE session_id = $1`,
      [sessionId]
    );

    const metrics = metricsResult.rows;

    // Calculate overall score
    const overallScore = session.overall_score || 0;

    // Determine readiness level
    const readinessLevel = this.determineReadinessLevel(overallScore);

    // Calculate skill area breakdown
    const skillAreaBreakdown: SkillAreaScore[] = metrics.map((m: any) => ({
      skillArea: m.skill_area,
      score: parseFloat(m.score),
      questionsAsked: m.questions_count,
      averageTimeSpent: m.average_time,
    }));

    // Identify strengths and weaknesses
    const { strengths, weaknesses } = this.identifyStrengthsAndWeaknesses(skillAreaBreakdown);

    // Generate question-by-question feedback
    const questionFeedback: QuestionFeedback[] = questions.map((q: any) => ({
      question: q.question_data.text,
      yourResponse: q.response_data?.content || 'No response',
      score: q.evaluation_data?.score || 0,
      feedback: q.evaluation_data?.feedback || '',
      betterApproach: q.evaluation_data?.exampleBetterResponse,
    }));

    // Calculate time management analysis
    const timeManagement = this.calculateTimeManagement(questions);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(weaknesses);

    const report: ReadinessReport = {
      sessionId,
      candidateId: session.candidate_id,
      generatedAt: new Date(),
      overallScore,
      readinessLevel,
      skillAreaBreakdown,
      strengths,
      weaknesses,
      questionFeedback,
      timeManagement,
      recommendations,
    };

    // Store report in database
    await query(
      `INSERT INTO readiness_reports (session_id, report_data) VALUES ($1, $2)`,
      [sessionId, JSON.stringify(report)]
    );

    return report;
  }

  private determineReadinessLevel(score: number): ReadinessLevel {
    if (score >= 75) return 'Ready';
    if (score >= 50) return 'Needs Improvement';
    return 'Not Ready';
  }

  private identifyStrengthsAndWeaknesses(skillAreaBreakdown: SkillAreaScore[]): {
    strengths: Strength[];
    weaknesses: Weakness[];
  } {
    const sorted = [...skillAreaBreakdown].sort((a, b) => b.score - a.score);

    const strengths: Strength[] = sorted.slice(0, 3).map((skill) => ({
      area: skill.skillArea,
      description: `Strong performance in ${skill.skillArea}`,
      evidence: [
        `Scored ${skill.score.toFixed(1)} out of 100`,
        `Answered ${skill.questionsAsked} questions in this area`,
      ],
    }));

    const weaknesses: Weakness[] = sorted
      .slice(-3)
      .reverse()
      .map((skill) => ({
        area: skill.skillArea,
        description: `Needs improvement in ${skill.skillArea}`,
        impact: skill.score < 40 ? 'High' : skill.score < 60 ? 'Medium' : ('Low' as any),
        recommendations: [
          `Review fundamental concepts in ${skill.skillArea}`,
          `Practice more problems in this area`,
        ],
      }));

    return { strengths, weaknesses };
  }

  private calculateTimeManagement(questions: any[]): TimeAnalysis {
    const totalTime = questions.reduce((sum, q) => sum + (q.time_spent || 0), 0);
    const averageTimePerQuestion = totalTime / questions.length;
    const questionsOverTime = questions.filter(
      (q) => q.time_spent > q.question_data.timeLimit
    ).length;
    const timeEfficiencyScore = ((questions.length - questionsOverTime) / questions.length) * 100;

    return {
      totalTime,
      averageTimePerQuestion,
      questionsOverTime,
      timeEfficiencyScore,
    };
  }

  private async generateRecommendations(weaknesses: Weakness[]): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];

    for (const weakness of weaknesses) {
      const prompt = `Generate specific, actionable recommendations for improving in ${weakness.area}. 
      Current level: ${weakness.impact} impact weakness.
      
      Provide 2-3 concrete steps the candidate can take to improve.`;

      const response = await openai.chat.completions.create({
        model: env.OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a career coach providing actionable improvement recommendations.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 300,
      });

      const suggestion = response.choices[0].message.content || '';

      recommendations.push({
        area: weakness.area,
        suggestion,
        resources: [],
      });
    }

    return recommendations;
  }

  async generateTrendReport(candidateId: string): Promise<TrendReport> {
    // Fetch all sessions for candidate
    const sessionsResult = await query(
      `SELECT id, overall_score, created_at 
       FROM interview_sessions 
       WHERE candidate_id = $1 AND status = 'completed' 
       ORDER BY created_at DESC 
       LIMIT 10`,
      [candidateId]
    );

    const sessions = sessionsResult.rows;

    if (sessions.length < 2) {
      throw new Error('Not enough sessions for trend analysis');
    }

    // Calculate overall trend
    const scores = sessions.map((s: any) => s.overall_score);
    const overallTrend = this.calculateTrend(scores);

    // Calculate skill area trends
    const skillAreaTrends: SkillAreaTrend[] = [];

    // Fetch skill area scores for all sessions
    for (const session of sessions) {
      const metricsResult = await query(
        `SELECT skill_area, score FROM performance_metrics WHERE session_id = $1`,
        [session.id]
      );

      // Group by skill area
      for (const metric of metricsResult.rows) {
        let trend = skillAreaTrends.find((t) => t.skillArea === metric.skill_area);
        if (!trend) {
          trend = {
            skillArea: metric.skill_area,
            trend: 'Stable',
            scoreHistory: [],
          };
          skillAreaTrends.push(trend);
        }

        trend.scoreHistory.push({
          date: session.created_at,
          score: parseFloat(metric.score),
        });
      }
    }

    // Calculate trend for each skill area
    for (const trend of skillAreaTrends) {
      const scores = trend.scoreHistory.map((h) => h.score);
      trend.trend = this.calculateTrend(scores);
    }

    return {
      candidateId,
      sessionsAnalyzed: sessions.length,
      overallTrend,
      skillAreaTrends,
      recommendations: [],
    };
  }

  private calculateTrend(scores: number[]): 'Improving' | 'Stable' | 'Declining' {
    if (scores.length < 2) return 'Stable';

    const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

    const diff = secondAvg - firstAvg;

    if (diff > 5) return 'Improving';
    if (diff < -5) return 'Declining';
    return 'Stable';
  }
}

export const reportGeneratorService = new ReportGeneratorService();
