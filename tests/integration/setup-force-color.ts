// Ensure chalk/ink produce ANSI escape codes in test environment.
// Must run before any chalk/ink imports to take effect.
process.env['FORCE_COLOR'] = '3';
