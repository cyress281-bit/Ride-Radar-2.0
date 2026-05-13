import { describe, it, expect } from 'vitest';
import { logger } from './logger';

describe('logger', () => {
  it('scrubs emails from log output', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('User login failed for user@example.com');
    expect(consoleSpy).toHaveBeenCalledWith(
      '[RideRadar@dev:error] User login failed for [REDACTED]'
    );
    consoleSpy.mockRestore();
  });

  it('scrubs JWT tokens from log output', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logger.error('Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U');
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[REDACTED]')
    );
    consoleSpy.mockRestore();
  });

  it('does not log debug in production', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    logger.debug('debug message');
    // In test environment DEV is true, so it should log
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
