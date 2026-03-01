/**
 * Contract: Email Detail Rendering
 *
 * Defines rendering behavior for detail pane content normalization and URL token display.
 * This is a design-time contract for feature planning under specs/003-email-rendering.
 */

export interface DetailRenderRequest {
  body: string;
  htmlBody?: string;
  detailPaneWidth: number;
}

export type LinkDisplaySource = 'anchor' | 'hostname';

export interface UrlRenderRule {
  excludedTrailingPunctuation: string[];
  displaySource: LinkDisplaySource;
  maxLength: number;
  minimumLength: 12;
  ellipsisCountsInsideCap: true;
}

export interface DetailRenderResult {
  renderedBody: string;
  collapsedBlankLineCap: 2;
  replacedUrlCount: number;
  linkInteractionMetadata: null;
  usedCache: false;
}

export type RenderEmailDetail = (request: DetailRenderRequest) => DetailRenderResult;
