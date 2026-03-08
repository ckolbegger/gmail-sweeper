/**
 * T002: Unit tests for readPrecomputeConfig() and effectiveDepth helper.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { readPrecomputeConfig } from '../../../src/core/summary/precompute-worker.js';

function effectiveDepth(config: { coverageLimit: number; maxDepth: number }): number {
  return Math.min(config.coverageLimit, config.maxDepth);
}

describe('readPrecomputeConfig()', () => {
  afterEach(() => {
    delete process.env['SUMMARY_PRECOMPUTE_LIMIT'];
    delete process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'];
  });

  it('returns coverageLimit=500 by default', () => {
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(500);
  });

  it('returns maxDepth=500 by default', () => {
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(500);
  });

  it('SUMMARY_PRECOMPUTE_LIMIT overrides coverageLimit', () => {
    process.env['SUMMARY_PRECOMPUTE_LIMIT'] = '100';
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(100);
  });

  it('SUMMARY_PRECOMPUTE_MAX_DEPTH overrides maxDepth', () => {
    process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'] = '200';
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(200);
  });

  it('invalid string for SUMMARY_PRECOMPUTE_LIMIT falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_LIMIT'] = 'not-a-number';
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(500);
  });

  it('invalid string for SUMMARY_PRECOMPUTE_MAX_DEPTH falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'] = 'not-a-number';
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(500);
  });

  it('negative integer for SUMMARY_PRECOMPUTE_LIMIT falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_LIMIT'] = '-10';
    const config = readPrecomputeConfig();
    expect(config.coverageLimit).toBe(500);
  });

  it('negative integer for SUMMARY_PRECOMPUTE_MAX_DEPTH falls back to 500', () => {
    process.env['SUMMARY_PRECOMPUTE_MAX_DEPTH'] = '-5';
    const config = readPrecomputeConfig();
    expect(config.maxDepth).toBe(500);
  });
});

describe('effectiveDepth()', () => {
  it('returns maxDepth when maxDepth < coverageLimit', () => {
    expect(effectiveDepth({ coverageLimit: 500, maxDepth: 100 })).toBe(100);
  });

  it('returns coverageLimit when maxDepth >= coverageLimit', () => {
    expect(effectiveDepth({ coverageLimit: 300, maxDepth: 500 })).toBe(300);
  });

  it('returns either when maxDepth === coverageLimit', () => {
    expect(effectiveDepth({ coverageLimit: 500, maxDepth: 500 })).toBe(500);
  });
});
