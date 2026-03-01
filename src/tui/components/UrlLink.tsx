import { Text } from 'ink';
import type { UrlInfo } from '../../core/rendering/url-parser.js';
import { calculateDisplayText } from '../../core/rendering/text-truncator.js';

interface UrlLinkProps {
  urlInfo: UrlInfo;
  terminalWidth: number;
}

export function UrlLink({ urlInfo, terminalWidth }: UrlLinkProps) {
  const displayText = calculateDisplayText(urlInfo.originalUrl, terminalWidth);

  return <Text color="cyan">{displayText}</Text>;
}
