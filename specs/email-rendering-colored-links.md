# Email Rendering: Colored Links Implementation Plan

## Overview
Extend the email body formatter to support colored rendering of links in the detail pane. Links (both link text from HTML and shortened URLs) should be visually distinct from regular body text.

## Requirements

### Functional Requirements
1. **Track Link Positions**: The formatter must track where links appear in the formatted text
2. **Color Rendering**: Links rendered in a distinct color (suggested: `cyan` or `blue`)
3. **Preserve Existing Behavior**: Blank line collapsing and URL shortening remain unchanged

### UX Requirements
- Links should be immediately recognizable as interactive/clickable elements
- Color must be visible in both light and dark terminal themes (verified in T006)
- Final color choice documented in spec after T006 verification
- **Decision**: Use `cyan` as primary, `blue` as fallback

## Technical Design

### 1. New Types

```typescript
// src/cli/utils/email-body-formatter.ts

export interface LinkSegment {
  /** Start index in the formatted text */
  start: number;
  /** End index in the formatted text */
  end: number;
  /** The link text/URL that will be displayed */
  text: string;
  /** The original URL (for potential future copy/open functionality) */
  url: string;
}

export interface FormattedEmailBody {
  /** The fully formatted text content */
  text: string;
  /** Array of link segments with positions */
  links: LinkSegment[];
}
```

### 2. Updated Formatter Functions

#### New Function: `formatEmailBodyWithLinks()`

```typescript
export function formatEmailBodyWithLinks(
  textBody: string,
  options: FormatOptions
): FormattedEmailBody;
```

**Implementation approach:**
1. Process blank line collapsing first (doesn't affect link positions)
2. Track URL positions BEFORE replacement
3. Replace URLs with link text/shortened versions
4. Calculate final positions of each link segment
5. Return both formatted text and link position array

#### Position Tracking Strategy

**Challenge**: Text length changes when URLs are replaced with shorter link text, affecting position calculations.

**Solution**: Two-pass approach

```typescript
// Pass 1: Identify all URLs and their positions
const urlMatches = findAllUrls(text);

// Pass 2: Build result with position tracking
let result = '';
let positionOffset = 0;
const links: LinkSegment[] = [];

for (const match of urlMatches) {
  // Add text before this URL
  result += text.slice(positionOffset, match.start);
  
  // Get replacement text (link text or shortened URL)
  const replacement = getReplacement(match.url, linkMap, maxWidth);
  
  // Track link segment
  links.push({
    start: result.length,
    end: result.length + replacement.length,
    text: replacement,
    url: match.url,
  });
  
  // Add replacement text
  result += replacement;
  positionOffset = match.end;
}

// Add remaining text
result += text.slice(positionOffset);
```

### 3. Updated EmailDetail Component

#### Modified Rendering Logic

```typescript
// Instead of:
visibleLines.map((line, index) =>
  React.createElement(Box, { key: scrollOffset + index, height: 1 },
    React.createElement(Text, null, line || ' ')
  )
)

// Render line with link segments colored:
visibleLines.map((line, lineIndex) => {
  const lineLinks = getLinksForLine(links, scrollOffset + lineIndex);
  return React.createElement(Box, { key: scrollOffset + lineIndex, height: 1 },
    renderLineWithLinks(line, lineLinks)
  );
})
```

#### Helper: `renderLineWithLinks()`

```typescript
function renderLineWithLinks(
  line: string,
  links: LinkSegment[]
): React.ReactElement {
  if (lineLinks.length === 0) {
    return React.createElement(Text, null, line || ' ');
  }

  const segments: React.ReactElement[] = [];
  let position = 0;

  for (const link of lineLinks) {
    // Text before link
    if (link.start > position) {
      segments.push(
        React.createElement(Text, { key: `text-${position}` },
          line.slice(position, link.start)
        )
      );
    }
    // Link text (colored)
    segments.push(
      React.createElement(Text, { 
        key: `link-${link.start}`,
        color: 'cyan' // or 'blue'
      }, link.text)
    );
    position = link.end;
  }

  // Remaining text after last link
  if (position < line.length) {
    segments.push(
      React.createElement(Text, { key: `text-${position}` },
        line.slice(position)
      )
    );
  }

  return React.createElement(Text, null, ...segments);
}
```

### 4. Handling Line Wrapping

**Challenge**: Links may span across wrapped lines or be broken by wrapping.

**Solutions:**

**Option A: Apply coloring BEFORE wrapping** (Recommended)
- Format body → Get links with positions
- Apply wrapping to formatted text
- Adjust link positions based on wrapping
- Render each wrapped line with link segments

**Option B: Track links per wrapped line**
- After wrapping, scan each line for link text
- Simple but may have edge cases with truncated links

**Recommended: Option A** - More complex but accurate

```typescript
function adjustLinksForWrapping(
  links: LinkSegment[],
  wrappedLines: string[],
  maxWidth: number
): Map<number, LinkSegment[]> {
  // Map from line index to links on that line
  const lineLinks = new Map<number, LinkSegment[]>();
  
  let charCount = 0;
  for (let lineIndex = 0; lineIndex < wrappedLines.length; lineIndex++) {
    const line = wrappedLines[lineIndex];
    const lineStart = charCount;
    const lineEnd = charCount + line.length;
    
    // Find links that intersect with this line
    for (const link of links) {
      if (link.end > lineStart && link.start < lineEnd) {
        const adjustedLink: LinkSegment = {
          start: Math.max(0, link.start - lineStart),
          end: Math.min(line.length, link.end - lineStart),
          text: link.text,
          url: link.url,
        };
        
        if (!lineLinks.has(lineIndex)) {
          lineLinks.set(lineIndex, []);
        }
        lineLinks.get(lineIndex)!.push(adjustedLink);
      }
    }
    
    charCount += line.length + 1; // +1 for newline
  }
  
  return lineLinks;
}
```

## Code Structure

```typescript
// src/cli/utils/email-body-formatter.ts

export interface LinkSegment {
  start: number;
  end: number;
  text: string;
  url: string;
}

export interface FormattedEmailBody {
  text: string;
  links: LinkSegment[];
}

export function formatEmailBodyWithLinks(
  textBody: string,
  options: FormatOptions
): FormattedEmailBody {
  // Implementation
}
```

```typescript
// src/cli/components/email-detail.tsx

import { 
  formatEmailBodyWithLinks, 
  type LinkSegment,
  type FormattedEmailBody 
} from '../utils/email-body-formatter.js';

// ... component code

function renderLineWithLinks(
  line: string,
  links: LinkSegment[]
): React.ReactElement {
  // Implementation
}
```

## Acceptance Criteria
- [ ] `formatEmailBodyWithLinks()` returns formatted text with accurate link positions
- [ ] Links rendered in cyan color (or final chosen color) distinct from body text
- [ ] Works correctly with line wrapping
- [ ] Works correctly with scrolling
- [ ] All existing tests pass
- [ ] All new unit tests for position tracking pass
- [ ] All new component tests for colored rendering pass
- [ ] Visible in both light and dark terminal themes
- [ ] Blank line collapsing still works
- [ ] URL shortening still works
- [ ] Link text from HTML still works
- [ ] Integration tests cover end-to-end flow

### Resolved Decisions

1. **Color choice**: `cyan` (primary), `blue` (fallback if cyan not visible in specific terminal)

2. **Underlined links**: Color alone is sufficient (ink has limited text decoration options)

3. **Truncated links**: Yes, the entire replacement text including `...` is rendered in the link color

## Open Questions

None - all decisions resolved.
