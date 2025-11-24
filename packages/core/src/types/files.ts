/**
 * Type definitions for file-level analysis
 */

/**
 * Represents a file change in a commit
 */
export interface FileChange {
  /** File path */
  file: string;
  /** Total lines changed (insertions + deletions) */
  changes: number;
  /** Lines inserted */
  insertions: number;
  /** Lines deleted */
  deletions: number;
  /** Whether this is a binary file */
  binary: boolean;
}

/**
 * Statistics for a single file across all commits
 */
export interface FileStats {
  /** File path */
  path: string;
  /** Number of commits that modified this file */
  changeCount: number;
  /** Total lines changed across all commits */
  totalChanges: number;
  /** Total lines inserted */
  totalInsertions: number;
  /** Total lines deleted */
  totalDeletions: number;
  /** Authors who have modified this file */
  authors: Set<string>;
  /** First time this file was modified (in analyzed commits) */
  firstSeen: Date;
  /** Last time this file was modified */
  lastModified: Date;
}

/**
 * Analysis result for file changes
 */
export interface FileAnalysis {
  /** Total number of unique files changed */
  totalFiles: number;
  /** Total lines changed across all files */
  totalChanges: number;
  /** Total lines inserted across all files */
  totalInsertions: number;
  /** Total lines deleted across all files */
  totalDeletions: number;
  /** Net lines of code change */
  netChange: number;
  /** Hotspot files (most frequently changed) */
  hotspots: FileStats[];
  /** Largest files by total changes */
  largestChanges: FileStats[];
  /** All file statistics */
  files: FileStats[];
}

/**
 * Extended commit with file changes
 */
export interface CommitWithFiles {
  hash: string;
  author: string;
  email: string;
  date: Date;
  message: string;
  refs: string;
  body: string;
  /** Files changed in this commit */
  files: FileChange[];
  /** Summary statistics for this commit */
  diffSummary: {
    changed: number;
    insertions: number;
    deletions: number;
  };
}
