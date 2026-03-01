import open from 'open';

export const BrowserService = {
  async open(url: string): Promise<boolean> {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return false;
    }
    try {
      await open(url);
      return true;
    } catch {
      return false;
    }
  },
};
