import { describe, it, expect } from '@jest/globals';
import { Repository } from '../src/git/repository.js';
import { InvalidOptionsError } from '../src/utils/errors.js';

describe('Repository', () => {
  describe('Input Validation', () => {
    it('should reject empty string path', () => {
      expect(() => new Repository('')).toThrow(InvalidOptionsError);
      expect(() => new Repository('')).toThrow('Repository path cannot be empty or whitespace');
    });

    it('should reject whitespace-only path', () => {
      expect(() => new Repository('   ')).toThrow(InvalidOptionsError);
      expect(() => new Repository('   ')).toThrow('Repository path cannot be empty or whitespace');
    });

    it('should reject extremely long paths', () => {
      const longPath = 'a'.repeat(5000);
      expect(() => new Repository(longPath)).toThrow(InvalidOptionsError);
      expect(() => new Repository(longPath)).toThrow('exceeds maximum length');
    });

    it('should trim whitespace from valid paths', () => {
      // This won't throw - it will resolve the path
      // The test is that it doesn't throw an error
      expect(() => new Repository('  /valid/path  ')).not.toThrow(InvalidOptionsError);
    });

    it('should accept valid paths without throwing', () => {
      // These should not throw validation errors
      // (They may throw InvalidRepositoryError later when checking if it's a git repo)
      expect(() => new Repository('.')).not.toThrow(InvalidOptionsError);
      expect(() => new Repository('/tmp')).not.toThrow(InvalidOptionsError);
      expect(() => new Repository('/home/user/some-repo')).not.toThrow(InvalidOptionsError);
    });
  });
});
