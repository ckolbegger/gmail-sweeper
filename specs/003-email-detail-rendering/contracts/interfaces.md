# Interface Contracts: Email Detail Rendering

**Feature**: 003-glm-email-detail-rendering  
**Date**: 2026-02-28

## EmailContentProcessor

Core service for processing email body text.

```typescript
/**
 * Represents a URL detected in email body
 */
export interface URLReference {
  /** The complete, unmodified URL */
  fullUrl: string;
  /** Truncated text for display (≤ half pane width) */
  displayText: string;
  /** Character position where URL starts in processed text */
  startIndex: number;
  /** Character position where URL ends in processed text */
  endIndex: number;
  /** True if displayText was truncated */
  isTruncated: boolean;
}

/**
 * Result of processing email body
 */
export interface ProcessedBody {
  /** Original email body text */
  originalText: string;
  /** Text with blank lines collapsed */
  processedText: string;
  /** All URLs found in the body */
  urls: URLReference[];
  /** Total number of URLs detected */
  urlCount: number;
}

/**
 * Options for body processing
 */
export interface ProcessOptions {
  /** Maximum display width for URL truncation */
  maxUrlWidth: number;
}

/**
 * Processes email body text for display
 */
export interface EmailContentProcessor {
  /**
   * Process email body text
   * @param body - Raw email body text
   * @param options - Processing options
   * @returns Processed body with collapsed blank lines and detected URLs
   */
  process(body: string, options: ProcessOptions): ProcessedBody;

  /**
   * Collapse sequences of 3+ blank lines to 2
   * @param text - Input text
   * @returns Text with collapsed blank lines
   */
  collapseBlankLines(text: string): string;

  /**
   * Detect all URLs in text
   * @param text - Input text
   * @param maxDisplayWidth - Maximum width for display text
   * @returns Array of URL references
   */
  detectUrls(text: string, maxDisplayWidth: number): URLReference[];

  /**
   * Truncate URL to fit display width
   * @param url - Full URL
   * @param maxWidth - Maximum display width
   * @returns Truncated URL with ellipsis if needed
   */
  truncateUrl(url: string, maxWidth: number): string;
}
```

## URLCyclingState

State management for URL selection in UI.

```typescript
/**
 * State for URL cycling in detail pane
 */
export interface URLCyclingState {
  /** Index of currently highlighted URL, null if none selected */
  selectedIndex: number | null;
  /** URLs available for cycling */
  urls: URLReference[];
  /** Message to display in status line */
  statusMessage: string | null;
}

/**
 * Actions for URL cycling
 */
export interface URLCyclingActions {
  /** Move to next URL (wraps to first) */
  nextUrl(): void;
  /** Move to previous URL (wraps to last) */
  prevUrl(): void;
  /** Copy current URL to clipboard */
  copyUrl(): Promise<boolean>;
  /** Open current URL in browser */
  openUrl(): Promise<boolean>;
  /** Exit URL cycling mode */
  exit(): void;
}
```

## EmailDetailProps (Extended)

Extended props for EmailDetail component.

```typescript
/**
 * Props for EmailDetail component (extended)
 */
export interface EmailDetailProps {
  /** Email to display */
  email: Email | null;
  /** Maximum body lines to show */
  maxBodyLines?: number;
  /** Maximum body columns */
  maxBodyColumns?: number;
  /** Scroll offset for body */
  scrollOffset?: number;
  /** URL cycling state (managed internally or externally) */
  urlCyclingEnabled?: boolean;
}
```

## ClipboardService

Abstraction for clipboard operations.

```typescript
/**
 * Service for clipboard operations
 */
export interface ClipboardService {
  /**
   * Copy text to clipboard
   * @param text - Text to copy
   * @returns true if successful
   */
  write(text: string): Promise<boolean>;

  /**
   * Check if clipboard is available
   */
  isAvailable(): boolean;
}
```

## BrowserService

Abstraction for browser operations.

```typescript
/**
 * Service for opening URLs in browser
 */
export interface BrowserService {
  /**
   * Open URL in default browser
   * @param url - URL to open
   * @returns true if successful
   */
  open(url: string): Promise<boolean>;
}
```
