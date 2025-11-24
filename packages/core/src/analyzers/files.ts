import type { CommitWithFiles, FileAnalysis, FileStats } from '../types/index.js';
import { AnalysisFailedError } from '../utils/errors.js';

/**
 * Analyzes file changes to extract insights about code evolution
 */
export class FileAnalyzer {
  /**
   * Analyzes commits with file changes and returns comprehensive file statistics
   */
  analyze(commits: CommitWithFiles[]): FileAnalysis {
    if (!commits || commits.length === 0) {
      throw new AnalysisFailedError('No commits to analyze');
    }

    try {
      const fileStatsMap = this.buildFileStats(commits);
      const files = Array.from(fileStatsMap.values());

      // Calculate totals
      const totalFiles = files.length;
      let totalChanges = 0;
      let totalInsertions = 0;
      let totalDeletions = 0;

      for (const file of files) {
        totalChanges += file.totalChanges;
        totalInsertions += file.totalInsertions;
        totalDeletions += file.totalDeletions;
      }

      const netChange = totalInsertions - totalDeletions;

      // Get hotspots (most frequently changed files)
      const hotspots = this.getHotspots(files, 10);

      // Get largest changes (files with most total line changes)
      const largestChanges = this.getLargestChanges(files, 10);

      return {
        totalFiles,
        totalChanges,
        totalInsertions,
        totalDeletions,
        netChange,
        hotspots,
        largestChanges,
        files,
      };
    } catch (error) {
      throw new AnalysisFailedError(
        'Failed to analyze file changes',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Builds file statistics from commits
   */
  private buildFileStats(commits: CommitWithFiles[]): Map<string, FileStats> {
    const fileStatsMap = new Map<string, FileStats>();

    for (const commit of commits) {
      for (const fileChange of commit.files) {
        const path = fileChange.file;

        if (!fileStatsMap.has(path)) {
          fileStatsMap.set(path, {
            path,
            changeCount: 0,
            totalChanges: 0,
            totalInsertions: 0,
            totalDeletions: 0,
            authors: new Set<string>(),
            firstSeen: commit.date,
            lastModified: commit.date,
          });
        }

        const stats = fileStatsMap.get(path)!;
        stats.changeCount++;
        stats.totalChanges += fileChange.changes;
        stats.totalInsertions += fileChange.insertions;
        stats.totalDeletions += fileChange.deletions;
        stats.authors.add(commit.email);

        // Update first/last seen dates
        if (commit.date < stats.firstSeen) {
          stats.firstSeen = commit.date;
        }
        if (commit.date > stats.lastModified) {
          stats.lastModified = commit.date;
        }
      }
    }

    return fileStatsMap;
  }

  /**
   * Gets hotspot files (most frequently changed)
   */
  private getHotspots(files: FileStats[], count: number): FileStats[] {
    return files
      .sort((a, b) => b.changeCount - a.changeCount)
      .slice(0, count);
  }

  /**
   * Gets files with largest total changes
   */
  private getLargestChanges(files: FileStats[], count: number): FileStats[] {
    return files
      .sort((a, b) => b.totalChanges - a.totalChanges)
      .slice(0, count);
  }

  /**
   * Gets files modified by a specific author
   */
  getFilesByAuthor(files: FileStats[], authorEmail: string): FileStats[] {
    return files.filter((f) => f.authors.has(authorEmail));
  }

  /**
   * Gets files changed within a date range
   */
  getFilesInRange(files: FileStats[], start: Date, end: Date): FileStats[] {
    return files.filter((f) => f.lastModified >= start && f.firstSeen <= end);
  }

  /**
   * Gets files by change frequency (changes per day)
   */
  getFilesByChurnRate(files: FileStats[], count: number = 10): Array<FileStats & { churnRate: number }> {
    const now = new Date();

    return files
      .map((file) => {
        const daysSinceFirstSeen = Math.max(
          1,
          Math.ceil((now.getTime() - file.firstSeen.getTime()) / (1000 * 60 * 60 * 24))
        );
        const churnRate = file.changeCount / daysSinceFirstSeen;
        return { ...file, churnRate };
      })
      .sort((a, b) => b.churnRate - a.churnRate)
      .slice(0, count);
  }

  /**
   * Gets files touched by multiple authors (collaboration hotspots)
   */
  getCollaborationHotspots(files: FileStats[], minAuthors: number = 2): FileStats[] {
    return files
      .filter((f) => f.authors.size >= minAuthors)
      .sort((a, b) => b.authors.size - a.authors.size);
  }

  /**
   * Calculates code churn per file (insertions + deletions)
   */
  getChurnMetrics(files: FileStats[]): Map<string, number> {
    const churnMap = new Map<string, number>();

    for (const file of files) {
      const churn = file.totalInsertions + file.totalDeletions;
      churnMap.set(file.path, churn);
    }

    return churnMap;
  }
}
