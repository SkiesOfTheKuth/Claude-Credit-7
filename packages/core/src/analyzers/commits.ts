import type { Commit, CommitAnalysis, Author } from '../types/index.js';
import { AnalysisFailedError } from '../utils/errors.js';

/**
 * Analyzes commits to extract insights
 */
export class CommitAnalyzer {
  /**
   * Analyzes a list of commits and returns comprehensive statistics
   */
  analyze(commits: Commit[]): CommitAnalysis {
    if (!commits || commits.length === 0) {
      throw new AnalysisFailedError('No commits to analyze');
    }

    try {
      const authors = this.extractAuthors(commits);
      const topAuthors = this.getTopAuthors(authors, 10);
      const dateRange = this.calculateDateRange(commits);
      const commitsByDay = this.groupCommitsByDay(commits);
      const commitsByHour = this.groupCommitsByHour(commits);
      const averageCommitsPerDay = this.calculateAverageCommitsPerDay(
        commits.length,
        dateRange.spanDays
      );

      return {
        totalCommits: commits.length,
        dateRange,
        authors: Array.from(authors.values()),
        topAuthors,
        commitsByDay,
        commitsByHour,
        averageCommitsPerDay,
      };
    } catch (error) {
      throw new AnalysisFailedError(
        'Failed to analyze commits',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Extracts unique authors with their statistics
   */
  private extractAuthors(commits: Commit[]): Map<string, Author> {
    const authorMap = new Map<string, Author>();

    for (const commit of commits) {
      const key = `${commit.author}<${commit.email}>`;

      if (!authorMap.has(key)) {
        authorMap.set(key, {
          name: commit.author,
          email: commit.email,
          commitCount: 0,
          firstCommit: commit.date,
          lastCommit: commit.date,
        });
      }

      const author = authorMap.get(key)!;
      author.commitCount++;

      // Update first/last commit dates
      if (commit.date < author.firstCommit) {
        author.firstCommit = commit.date;
      }
      if (commit.date > author.lastCommit) {
        author.lastCommit = commit.date;
      }
    }

    return authorMap;
  }

  /**
   * Gets top N authors by commit count
   */
  private getTopAuthors(authors: Map<string, Author>, count: number): Author[] {
    return Array.from(authors.values())
      .sort((a, b) => b.commitCount - a.commitCount)
      .slice(0, count);
  }

  /**
   * Calculates the date range of commits
   */
  private calculateDateRange(commits: Commit[]) {
    const dates = commits.map((c) => c.date.getTime());
    const earliestCommitDate = new Date(Math.min(...dates));
    const latestCommitDate = new Date(Math.max(...dates));

    // Normalize to the start of the day (UTC)
    const startDay = new Date(earliestCommitDate);
    startDay.setUTCHours(0, 0, 0, 0);

    const endDay = new Date(latestCommitDate);
    endDay.setUTCHours(0, 0, 0, 0);

    const spanDays =
      Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return {
      earliest: earliestCommitDate,
      latest: latestCommitDate,
      spanDays: spanDays || 1, // Ensure at least 1 day to avoid division by zero
    };
  }

  /**
   * Groups commits by day (YYYY-MM-DD)
   */
  private groupCommitsByDay(commits: Commit[]): Map<string, number> {
    const byDay = new Map<string, number>();

    for (const commit of commits) {
      const day = commit.date.toISOString().split('T')[0] ?? 'unknown';
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }

    return byDay;
  }

  /**
   * Groups commits by hour of day (0-23)
   */
  private groupCommitsByHour(commits: Commit[]): Map<number, number> {
    const byHour = new Map<number, number>();

    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      byHour.set(i, 0);
    }

    for (const commit of commits) {
      const hour = commit.date.getHours();
      byHour.set(hour, (byHour.get(hour) || 0) + 1);
    }

    return byHour;
  }

  /**
   * Calculates average commits per day
   */
  private calculateAverageCommitsPerDay(totalCommits: number, spanDays: number): number {
    return parseFloat((totalCommits / spanDays).toFixed(2));
  }

  /**
   * Gets commit activity by day of week (0 = Sunday, 6 = Saturday)
   */
  getCommitsByDayOfWeek(commits: Commit[]): Map<number, number> {
    const byDayOfWeek = new Map<number, number>();

    // Initialize all days
    for (let i = 0; i < 7; i++) {
      byDayOfWeek.set(i, 0);
    }

    for (const commit of commits) {
      const day = commit.date.getDay();
      byDayOfWeek.set(day, (byDayOfWeek.get(day) || 0) + 1);
    }

    return byDayOfWeek;
  }

  /**
   * Gets commits for a specific author
   */
  getCommitsByAuthor(commits: Commit[], authorEmail: string): Commit[] {
    return commits.filter((c) => c.email === authorEmail);
  }

  /**
   * Gets commits within a date range
   */
  getCommitsInRange(commits: Commit[], start: Date, end: Date): Commit[] {
    return commits.filter((c) => c.date >= start && c.date <= end);
  }
}
