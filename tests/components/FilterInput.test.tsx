import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { FilterInput } from '../../src/components/Shared/FilterInput';

describe('FilterInput', () => {
  it('should render the input field with label', () => {
    const { lastFrame } = render(<FilterInput onSubmit={vi.fn()} onCancel={vi.fn()} />);
    expect(lastFrame()).toContain('Smart Filter:');
  });

  it('should call onSubmit when Enter is pressed with non-empty value', async () => {
    const onSubmit = vi.fn();
    const { stdin } = render(<FilterInput onSubmit={onSubmit} onCancel={vi.fn()} />);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    stdin.write('receipts');
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(onSubmit).toHaveBeenCalledWith('receipts');
  });

  it('should call onCancel when Escape is pressed', async () => {
    const onCancel = vi.fn();
    const { stdin } = render(<FilterInput onSubmit={vi.fn()} onCancel={onCancel} />);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\x1B'); // Escape
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('should not call onSubmit when empty value is submitted', async () => {
    const onSubmit = vi.fn();
    const { stdin } = render(<FilterInput onSubmit={onSubmit} onCancel={vi.fn()} />);
    
    await new Promise(resolve => setTimeout(resolve, 50));
    stdin.write('\r');
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
