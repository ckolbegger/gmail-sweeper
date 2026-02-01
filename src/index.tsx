import React from 'react';
import { render } from 'ink';
import App from './app';

const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
let limit = 10;

if (limitIdx !== -1 && args[limitIdx + 1]) {
    const parsed = parseInt(args[limitIdx + 1], 10);
    if (!isNaN(parsed)) {
        limit = parsed;
    }
}

render(<App limit={limit} />);
