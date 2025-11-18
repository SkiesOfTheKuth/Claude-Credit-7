import { AnalysisErrorType } from '../types/index.js';

/**
 * Base error class for all analysis-related errors
 */
export class AnalysisError extends Error {
  public readonly type: AnalysisErrorType;

  constructor(
    type: AnalysisErrorType,
    message: string,
    cause?: Error
  ) {
    super(message, { cause });
    this.type = type;
    this.name = 'AnalysisError';

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AnalysisError);
    }
  }
}

/**
 * Thrown when the provided path is not a valid git repository
 */
export class InvalidRepositoryError extends AnalysisError {
  constructor(path: string, cause?: Error) {
    super(
      AnalysisErrorType.INVALID_REPOSITORY,
      `Invalid git repository: ${path}`,
      cause
    );
    this.name = 'InvalidRepositoryError';
  }
}

/**
 * Thrown when a git operation fails
 */
export class GitOperationError extends AnalysisError {
  constructor(operation: string, message: string, cause?: Error) {
    super(
      AnalysisErrorType.GIT_OPERATION_FAILED,
      `Git operation '${operation}' failed: ${message}`,
      cause
    );
    this.name = 'GitOperationError';
  }
}

/**
 * Thrown when analysis options are invalid
 */
export class InvalidOptionsError extends AnalysisError {
  constructor(message: string) {
    super(AnalysisErrorType.INVALID_OPTIONS, `Invalid options: ${message}`);
    this.name = 'InvalidOptionsError';
  }
}

/**
 * Thrown when analysis process fails
 */
export class AnalysisFailedError extends AnalysisError {
  constructor(message: string, cause?: Error) {
    super(AnalysisErrorType.ANALYSIS_FAILED, `Analysis failed: ${message}`, cause);
    this.name = 'AnalysisFailedError';
  }
}
