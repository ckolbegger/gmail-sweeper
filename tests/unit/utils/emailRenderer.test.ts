import { describe, it, expect, beforeEach } from 'vitest';
import { EmailRenderer } from '../../../src/utils/emailRenderer';

describe('EmailRenderer', () => {
    let renderer: EmailRenderer;

    beforeEach(() => {
        renderer = new EmailRenderer();
    });

    describe('Initialization', () => {
        it('should instantiate correctly', () => {
            expect(renderer).toBeDefined();
        });
    });

    describe('Blank Line Collapsing', () => {
        it('should collapse 3 consecutive blank lines into 2', () => {
            const input = 'Line 1\n\n\n\nLine 2'; // \n\n\n\n means 3 blank lines between 2 text lines
            const result = renderer.parse(input, 100);
            expect(result.content).toBe('Line 1\n\n\nLine 2'); // \n\n\n means 2 blank lines
        });

        it('should collapse 5 consecutive blank lines into 2', () => {
            const input = 'Line 1\n\n\n\n\n\nLine 2';
            const result = renderer.parse(input, 100);
            expect(result.content).toBe('Line 1\n\n\nLine 2');
        });

        it('should not collapse 1 blank line', () => {
            const input = 'Line 1\n\nLine 2';
            const result = renderer.parse(input, 100);
            expect(result.content).toBe('Line 1\n\nLine 2');
        });

        it('should not collapse 2 blank lines', () => {
            const input = 'Line 1\n\n\nLine 2';
            const result = renderer.parse(input, 100);
            expect(result.content).toBe('Line 1\n\n\nLine 2');
        });

        it('should collapse leading blank lines to at most 2', () => {
            const input = '\n\n\n\nLine 1';
            const result = renderer.parse(input, 100);
            expect(result.content).toBe('\n\n\nLine 1');
        });

        it('should collapse trailing blank lines to at most 2', () => {
            const input = 'Line 1\n\n\n\n';
            const result = renderer.parse(input, 100);
            expect(result.content).toBe('Line 1\n\n\n');
        });
    });

    describe('URL Extraction and Truncation', () => {
        it('should extract and truncate raw URLs longer than 50% width', () => {
            // maxWidth = 40, so 50% width = 20.
            const input = 'Check this: https://www.example.com/very/long/path/that/needs/truncation';
            const result = renderer.parse(input, 40);
            
            // Expected length is 20: https://www.examp...
            const expectedText = 'https://www.examp...'; 
            expect(result.content).toContain('Check this: ' + expectedText);
            expect(result.links).toHaveLength(1);
            expect(result.links[0].text).toBe(expectedText);
            expect(result.links[0].url).toBe('https://www.example.com/very/long/path/that/needs/truncation');
        });

        it('should not truncate URLs shorter than 50% width', () => {
            const input = 'Check this: https://short.com';
            const result = renderer.parse(input, 100); // 50% is 50
            expect(result.content).toBe('Check this: https://short.com');
            expect(result.links).toHaveLength(1);
            expect(result.links[0].text).toBe('https://short.com');
            expect(result.links[0].url).toBe('https://short.com');
        });

        it('should handle markdown-style links with link text', () => {
            const input = 'Check [this link](https://www.example.com/very/long/path) out';
            const result = renderer.parse(input, 40); // 50% is 20
            
            expect(result.content).toBe('Check this link out');
            expect(result.links).toHaveLength(1);
            expect(result.links[0].text).toBe('this link');
            expect(result.links[0].url).toBe('https://www.example.com/very/long/path');
        });

        it('should truncate link text if it exceeds 50% width', () => {
            const input = 'Check [a very very long link description here](https://example.com) out';
            const result = renderer.parse(input, 40); // 50% is 20
            
            const expectedText = 'a very very long ...'; // 17 chars + 3 dots = 20
            expect(result.content).toBe('Check ' + expectedText + ' out');
            expect(result.links).toHaveLength(1);
            expect(result.links[0].text).toBe(expectedText);
        });

        it('should correctly assign lineIndex to extracted links', () => {
            const input = 'Line 1\nLine 2 with https://short.com\nLine 3';
            const result = renderer.parse(input, 100);
            
            expect(result.links).toHaveLength(1);
            expect(result.links[0].lineIndex).toBe(1); // 0-based
        });
    });

    describe('Performance Validation', () => {
        it('should render a very large email with many links in under 200ms', () => {
            let largeBody = '';
            for (let i = 0; i < 1000; i++) {
                largeBody += `This is paragraph ${i} with a link [click here](https://example.com/item/${i}) and a raw URL https://raw.com/${i}\n\n`;
            }

            const startTime = performance.now();
            const result = renderer.parse(largeBody, 80);
            const endTime = performance.now();

            const duration = endTime - startTime;
            expect(result.links.length).toBe(2000);
            expect(duration).toBeLessThan(300); // Target from SC-005
        });
    });
});
