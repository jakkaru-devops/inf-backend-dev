import puppeteer from 'puppeteer';

class BrowserService {
  public browser: puppeteer.Browser;

  constructor() {
    this._init();
  }

  private _init = async () => {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', 'disable-setuid-sandbox', 'disable-dev-shm-usage'],
      executablePath: '/usr/bin/chromium',
    });
  };
}

export const browserService = new BrowserService();
