/**
 * Workflow Engine Contract
 *
 * Defines the interface for managing and executing saved query-action workflows.
 * Workflows combine natural language queries with actions (label, archive, delete)
 * for automated email organization.
 */

import type {
  Email,
  PaginatedResult,
  PaginationParams,
  Query,
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  WorkflowExecutionResult,
  WorkflowExecutionStatus,
} from './types.js';

// ============================================================================
// Workflow Engine
// ============================================================================

export interface WorkflowEngine {
  /**
   * Execute a workflow against emails.
   * This runs the query and applies the action to matching emails.
   *
   * @param workflowId - ID of the workflow to execute
   * @param options - Execution options
   * @returns Execution result with details of processed emails
   */
  executeWorkflow(
    workflowId: string,
    options?: WorkflowExecutionOptions
  ): Promise<WorkflowExecutionResult>;

  /**
   * Execute all enabled workflows in order.
   * Used when running saved workflows against new emails.
   */
  executeAllWorkflows(
    options?: BatchWorkflowOptions
  ): Promise<BatchWorkflowResult>;

  /**
   * Preview what a workflow would do without applying actions.
   * Useful for confirmation dialogs.
   */
  previewWorkflow(
    workflowId: string,
    options?: PreviewOptions
  ): Promise<WorkflowPreview>;

  /**
   * Get statistics for a workflow.
   */
  getWorkflowStats(workflowId: string): Promise<WorkflowStats>;
}

// ============================================================================
// Workflow Management
// ============================================================================

export interface WorkflowRepository {
  /** Create a new workflow */
  create(workflow: CreateWorkflowInput): Promise<Workflow>;

  /** Get a workflow by ID */
  getById(id: string): Promise<Workflow | null>;

  /** Get all workflows sorted by execution order */
  getAll(): Promise<Workflow[]>;

  /** Get only enabled workflows */
  getEnabled(): Promise<Workflow[]>;

  /** Update an existing workflow */
  update(id: string, updates: UpdateWorkflowInput): Promise<Workflow>;

  /** Delete a workflow */
  delete(id: string): Promise<void>;

  /** Reorder workflows by updating executionOrder */
  reorder(orderedIds: string[]): Promise<void>;
}

export interface CreateWorkflowInput {
  queryId: string;
  name: string;
  action: WorkflowAction;
  executionOrder?: number;
  isEnabled?: boolean;
}

export interface UpdateWorkflowInput {
  name?: string;
  action?: WorkflowAction;
  executionOrder?: number;
  isEnabled?: boolean;
}

// ============================================================================
// Workflow Execution
// ============================================================================

export interface WorkflowExecutionOptions {
  /** Session ID for tracking */
  sessionId: string;

  /** Only process emails newer than this date */
  newerThan?: Date;

  /** Require user confirmation before applying actions */
  confirmBeforeApply?: boolean;

  /** Callback for progress updates */
  onProgress?: (progress: WorkflowProgress) => void;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

export interface WorkflowProgress {
  /** Workflow being executed */
  workflowId: string;

  /** Execution ID */
  executionId: string;

  /** Current phase */
  phase: 'querying' | 'analyzing' | 'applying' | 'completed' | 'failed';

  /** Number of emails matching the query */
  emailsMatched: number;

  /** Number of emails processed so far */
  emailsProcessed: number;

  /** Number of actions successfully applied */
  actionsApplied: number;

  /** Current email being processed (if applicable) */
  currentEmail?: Email;
}

// ============================================================================
// Batch Workflow Execution
// ============================================================================

export interface BatchWorkflowOptions {
  /** Session ID for tracking */
  sessionId: string;

  /** Only process emails newer than this date */
  newerThan?: Date;

  /** Require confirmation for each workflow */
  confirmEach?: boolean;

  /** Stop on first failure */
  stopOnError?: boolean;

  /** Progress callback */
  onWorkflowStart?: (workflow: Workflow) => void;
  onWorkflowComplete?: (result: WorkflowExecutionResult) => void;
  onWorkflowError?: (workflow: Workflow, error: Error) => void;
}

export interface BatchWorkflowResult {
  /** Individual workflow results */
  results: WorkflowExecutionResult[];

  /** Total emails processed across all workflows */
  totalEmailsProcessed: number;

  /** Total actions applied */
  totalActionsApplied: number;

  /** Whether all workflows completed successfully */
  allSuccessful: boolean;

  /** Number of workflows that failed */
  failureCount: number;
}

// ============================================================================
// Workflow Preview
// ============================================================================

export interface PreviewOptions {
  /** Only preview emails newer than this date */
  newerThan?: Date;

  /** Maximum number of emails to preview */
  maxEmails?: number;
}

export interface WorkflowPreview {
  /** Workflow being previewed */
  workflow: Workflow;

  /** Query that will be executed */
  query: Query;

  /** Sample of emails that would be affected */
  sampleEmails: Email[];

  /** Total count of emails that would be affected */
  totalEmails: number;

  /** Action that would be applied */
  action: WorkflowAction;

  /** Human-readable description of what will happen */
  description: string;
}

// ============================================================================
// Workflow Statistics
// ============================================================================

export interface WorkflowStats {
  /** Workflow ID */
  workflowId: string;

  /** Total times this workflow has been executed */
  totalExecutions: number;

  /** Number of successful executions */
  successfulExecutions: number;

  /** Number of failed executions */
  failedExecutions: number;

  /** Average emails matched per execution */
  averageEmailsMatched: number;

  /** Average execution time in milliseconds */
  averageExecutionTimeMs: number;

  /** Total emails processed (all time) */
  totalEmailsProcessed: number;

  /** Last execution timestamp */
  lastExecutedAt?: Date;

  /** History of recent executions */
  recentExecutions: WorkflowExecution[];
}

// ============================================================================
// Execution History
// ============================================================================

export interface ExecutionRepository {
  /** Record a new workflow execution */
  create(execution: CreateExecutionInput): Promise<WorkflowExecution>;

  /** Update an execution (mark complete, failed, etc.) */
  update(id: string, updates: UpdateExecutionInput): Promise<WorkflowExecution>;

  /** Get an execution by ID */
  getById(id: string): Promise<WorkflowExecution | null>;

  /** Get executions for a workflow */
  getByWorkflowId(
    workflowId: string,
    options?: PaginationParams
  ): Promise<PaginatedResult<WorkflowExecution>>;

  /** Get executions for a session */
  getBySessionId(
    sessionId: string,
    options?: PaginationParams
  ): Promise<PaginatedResult<WorkflowExecution>>;

  /** Get recent executions across all workflows */
  getRecent(limit?: number): Promise<WorkflowExecution[]>;
}

export interface CreateExecutionInput {
  workflowId: string;
  sessionId: string;
  status: WorkflowExecutionStatus;
}

export interface UpdateExecutionInput {
  status?: WorkflowExecutionStatus;
  completedAt?: Date;
  emailsMatched?: number;
  emailsProcessed?: number;
  error?: string;
}

// ============================================================================
// Conflict Resolution
// ============================================================================

export interface ConflictResolutionStrategy {
  /**
   * Resolve conflicts when multiple workflows would apply different
   * actions to the same email.
   *
   * @param conflicts - Array of conflicting actions
   * @returns The resolved action to apply
   */
  resolve(conflicts: WorkflowConflict[]): ResolvedAction;
}

export interface WorkflowConflict {
  /** Email with conflicting actions */
  email: Email;

  /** Workflows that want to apply actions to this email */
  conflictingWorkflows: Array<{
    workflowId: string;
    workflowName: string;
    action: WorkflowAction;
  }>;
}

export interface ResolvedAction {
  /** The action to apply */
  action: WorkflowAction;

  /** Which workflow's action was chosen */
  sourceWorkflowId: string;

  /** Explanation of resolution */
  resolution: string;
}

// ============================================================================
// Error Types
// ============================================================================

export type WorkflowErrorCode =
  | 'WORKFLOW_NOT_FOUND'
  | 'QUERY_NOT_FOUND'
  | 'INVALID_ACTION'
  | 'EXECUTION_FAILED'
  | 'ALREADY_RUNNING'
  | 'CANCELLED'
  | 'LLM_UNAVAILABLE'
  | 'GMAIL_API_ERROR'
  | 'UNKNOWN';

export class WorkflowError extends Error {
  constructor(
    public readonly code: WorkflowErrorCode,
    message: string,
    public readonly workflowId?: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'WorkflowError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface WorkflowEngineConfig {
  /** Require confirmation before destructive actions */
  confirmDestructiveActions: boolean;

  /** Maximum emails to process in a single workflow execution */
  maxEmailsPerExecution: number;

  /** Enable conflict detection and resolution */
  enableConflictResolution: boolean;

  /** Default conflict resolution strategy */
  conflictStrategy: 'first-wins' | 'last-wins' | 'manual';

  /** Timeout for workflow execution in milliseconds */
  executionTimeoutMs: number;
}

export const DEFAULT_WORKFLOW_CONFIG: WorkflowEngineConfig = {
  confirmDestructiveActions: true,
  maxEmailsPerExecution: 1000,
  enableConflictResolution: true,
  conflictStrategy: 'first-wins',
  executionTimeoutMs: 5 * 60 * 1000, // 5 minutes
};
