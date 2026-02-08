export interface CliOptions {
  sender?: string;
  label?: string;
  category?: string;
  dateFrom?: number;
  dateTo?: number;
  pageLimit: number;
  pageSize: number;
  limit: number;
  tokenPath: string;
  authCode?: string;
  printAuthUrl: boolean;
  help: boolean;
}

const DEFAULT_OPTIONS: CliOptions = {
  pageLimit: 5,
  pageSize: 50,
  limit: 25,
  tokenPath: '.gmail-sweeper/tokens.json',
  printAuthUrl: false,
  help: false
};

function parseNumber(value: string, flag: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric value for ${flag}: ${value}`);
  }
  return parsed;
}

function parseDate(value: string, flag: string): number {
  if (/^\d+$/.test(value)) {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  const parsed = Date.parse(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }

  throw new Error(`Invalid date value for ${flag}: ${value}`);
}

function getValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

export function parseCliArgs(args: string[]): CliOptions {
  const options: CliOptions = { ...DEFAULT_OPTIONS };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    switch (arg) {
      case '--sender':
        options.sender = getValue(args, index, arg);
        index += 1;
        break;
      case '--label':
        options.label = getValue(args, index, arg);
        index += 1;
        break;
      case '--category':
        options.category = getValue(args, index, arg);
        index += 1;
        break;
      case '--date-from':
        options.dateFrom = parseDate(getValue(args, index, arg), arg);
        index += 1;
        break;
      case '--date-to':
        options.dateTo = parseDate(getValue(args, index, arg), arg);
        index += 1;
        break;
      case '--page-limit':
        options.pageLimit = parseNumber(getValue(args, index, arg), arg);
        index += 1;
        break;
      case '--page-size':
        options.pageSize = parseNumber(getValue(args, index, arg), arg);
        index += 1;
        break;
      case '--limit':
        options.limit = parseNumber(getValue(args, index, arg), arg);
        index += 1;
        break;
      case '--token-path':
        options.tokenPath = getValue(args, index, arg);
        index += 1;
        break;
      case '--auth-code':
        options.authCode = getValue(args, index, arg);
        index += 1;
        break;
      case '--print-auth-url':
        options.printAuthUrl = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}
