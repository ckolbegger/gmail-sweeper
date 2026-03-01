import { useState, useCallback } from 'react';

interface UseUrlActionsReturn {
  copyToClipboard: (url: string) => Promise<boolean>;
  openInBrowser: (url: string) => Promise<boolean>;
  lastCopiedUrl: string | null;
}

export function useUrlActions(): UseUrlActionsReturn {
  const [lastCopiedUrl, setLastCopiedUrl] = useState<string | null>(null);

  const copyToClipboard = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Try to use clipboard API first (works in some Node environments)
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url);
        setLastCopiedUrl(url);
        setTimeout(() => setLastCopiedUrl(null), 2000);
        return true;
      }

      // Fallback to exec-based clipboard
      const { execSync } = await import('child_process');
      const platform = process.platform;

      if (platform === 'darwin') {
        execSync(`printf '%s' "${url}" | pbcopy`, { stdio: 'ignore' });
      } else if (platform === 'win32') {
        execSync(`echo ${url} | clip`, { stdio: 'ignore' });
      } else {
        execSync(`printf '%s' "${url}" | xclip -selection clipboard`, { stdio: 'ignore' });
      }

      setLastCopiedUrl(url);
      setTimeout(() => setLastCopiedUrl(null), 2000);
      return true;
    } catch {
      return false;
    }
  }, []);

  const openInBrowser = useCallback(async (url: string): Promise<boolean> => {
    try {
      const { exec } = await import('child_process');
      const platform = process.platform;

      if (platform === 'darwin') {
        exec(`open "${url}"`);
      } else if (platform === 'win32') {
        exec(`start "" "${url}"`);
      } else {
        exec(`xdg-open "${url}"`);
      }
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    copyToClipboard,
    openInBrowser,
    lastCopiedUrl,
  };
}
