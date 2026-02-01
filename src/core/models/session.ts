/**
 * Session Model Types and Validation
 *
 * Defines the Session entity for tracking app sessions.
 */

import { z } from 'zod';
import type { Session } from '../contracts/types.js';

// ============================================================================
// Schemas
// ============================================================================

export const SessionSchema = z.object({
  id: z.string().uuid(),
  startedAt: z.date(),
  endedAt: z.date().optional(),
  lastEmailCheckAt: z.date().optional(),
  lastHistoryId: z.string().optional(),
  deviceInfo: z.string().optional(),
});

// ============================================================================
// Types
// ============================================================================

// Types are exported from contracts/types.ts to avoid duplication
// Use: import type { Session } from '@core/contracts/types.js'

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate a session object
 */
export function validateSession(data: unknown): Session {
  return SessionSchema.parse(data);
}

/**
 * Safely validate a session object
 */
export function safeValidateSession(data: unknown): {
  success: boolean;
  data?: Session;
  error?: z.ZodError;
} {
  const result = SessionSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}

/**
 * Validate session creation input
 */
export function validateSessionInput(data: unknown): Omit<Session, 'id' | 'startedAt'> {
  return SessionSchema.omit({ id: true, startedAt: true }).parse(data);
}

// ============================================================================
// Session State Helpers
// ============================================================================

export type SessionState = 'active' | 'ended';

/**
 * Get the current state of a session
 */
export function getSessionState(session: Session): SessionState {
  return session.endedAt ? 'ended' : 'active';
}

/**
 * Check if a session is active
 */
export function isSessionActive(session: Session): boolean {
  return getSessionState(session) === 'active';
}

/**
 * Get session duration in milliseconds
 */
export function getSessionDuration(session: Session): number | undefined {
  if (!session.endedAt) {
    return undefined;
  }
  return session.endedAt.getTime() - session.startedAt.getTime();
}
