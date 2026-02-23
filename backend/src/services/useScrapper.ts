import puppeteer, { Browser, BrowserContext, HTTPRequest, Page } from "puppeteer";

interface Scraper {
  url: string;
  prompt: string;
  userId: string;
}

let globalBrowser: Browser | null = null;
let browserLaunchPromise: Promise<Browser> | null = null;

async function getLocalBrowser() {
  if (globalBrowser) return globalBrowser;

  if (!browserLaunchPromise) {
    browserLaunchPromise = (async () => {
      console.log("Launching local fallback browser...");
      globalBrowser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
      });
      return globalBrowser;
    })();
  }

  return browserLaunchPromise;
}

export async function useScrapper({ url, prompt, userId }: Scraper): Promise<string> {
  let isBrowserless = false;
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    console.log(`Starting scrapper for user ${userId}...`);

    if (process.env.BAAS_WS_ENDPOINT) {
      try {
        let endpoint = process.env.BAAS_WS_ENDPOINT;
        if (!endpoint.startsWith('ws://') && !endpoint.startsWith('wss://')) {
          endpoint = `wss://${endpoint}`;
        }
        const wsUrl = new URL(endpoint);
        // Browserless session persistence & keepalive (e.g. 5 minutes)
        wsUrl.searchParams.set("sessionId", userId);
        wsUrl.searchParams.set("keepalive", "300000");

        console.log(`Connecting to remote browserless session for ${userId}...`);
        browser = await puppeteer.connect({
          browserWSEndpoint: wsUrl.toString(),
        });
        isBrowserless = true;
      } catch (err) {
        console.warn("Failed to connect to remote browser, falling back to local browser...", err);
      }
    }

    if (!isBrowserless) {
      browser = await getLocalBrowser();
      // Isolate context locally so parallel users don't share Gandalf sessions
      context = await browser.createBrowserContext();
      page = await context.newPage();
    } else {
      // Browserless completely isolates sessions by sessionId. 
      // We explicitly MUST use the default context here so Gandalf's level progression persists between runs.
      page = await browser!.newPage();
    }

    // Standard bandwidth & tracking optimization
    await page.setRequestInterception(true);
    const blockedDomains = ['google-analytics.com', 'googletagmanager.com', 'sentry.io'];
    page.on("request", (req: HTTPRequest) => {
      const reqUrl = req.url();
      const isBlocked = blockedDomains.some(domain => reqUrl.includes(domain));
      if (isBlocked || ["image", "font", "media", "stylesheet", "other"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    console.log(`Setting up Gandalf session for ${url}...`);
    // Extract the level slug from the target URL (e.g., 'do-not-tell' or 'baseline')
    const urlObj = new URL(url);
    const slug = urlObj.pathname.replace('/', '') || 'baseline';

    // Inject level progression into LocalStorage BEFORE the page even executes its React scripts.
    // This entirely removes the need for a secondary page route!
    await page.evaluateOnNewDocument((levelSlug) => {
      localStorage.setItem("last_normal_level", levelSlug);
      localStorage.setItem("last_level", levelSlug);
      localStorage.setItem("default_max_level", "8"); // Max unlock
    }, slug);

    console.log(`Navigating to validated URL: ${url}`);
    // 'domcontentloaded' prevents hanging on infinite websockets/tracking scripts
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    const inputSelector = "#comment, textarea, input[type='text']";
    console.log(`Waiting for input selector...`);
    await page.waitForSelector(inputSelector, { timeout: 10000 });

    console.log("Instantly injecting prompt...");
    // Direct DOM text injection bypassing human typing delays
    await page.evaluate((sel, text) => {
      const el = document.querySelector(sel) as HTMLInputElement | HTMLTextAreaElement;
      if (el) {
        // Native setter overrides React's event listener blocks
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype, "value"
        )?.set;
        const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, "value"
        )?.set;

        if (el.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
          nativeTextAreaValueSetter.call(el, text);
        } else if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, text);
        } else {
          el.value = text;
        }

        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, inputSelector, prompt);

    // CLICK THE SUBMIT BUTTON directly because #comment is a textarea now, Enter just adds a newline!
    await page.click('button[type="submit"]');

    const responseSelector = ".answer";
    console.log(`Waiting for response selector: ${responseSelector}`);

    // Wait for either the answer or an error message indicating the prompt failed
    await page.waitForFunction(
      (sel: string) => {
        const el = document.querySelector(sel);
        const errorEl = document.querySelector('.text-red-500'); // Gandalf error messages are often red
        if (errorEl && errorEl.textContent?.trim().length) return true;
        return el && el.textContent.trim().length > 0;
      },
      { timeout: 30000 },
      responseSelector
    );

    const answer = await page.evaluate((sel: string) => {
      const errorEl = document.querySelector('.text-red-500');
      // If there's an error message block (e.g. "Prompt must be at least 10 characters long")
      if (errorEl && errorEl.textContent?.trim().length) {
        return "Error: " + errorEl.textContent.trim();
      }
      const elements = document.querySelectorAll(sel);
      return elements[elements.length - 1]?.textContent?.trim() || "";
    }, responseSelector);

    console.log(`Got answer for ${userId}:`, answer.substring(0, 50) + "...");
    return answer || "I'm sorry, I don't understand what you're trying to say.";

  } catch (error) {
    console.error(`Scraper Error for ${userId}:`, error);
    throw new Error("Failed to get response from the AI interface.");
  } finally {
    if (page) await page.close().catch(() => { });

    if (isBrowserless && browser) {
      // Detach without killing the browser to keep the session alive
      await browser.disconnect();
    } else if (context) {
      // Hard close context on local fallback
      await context.close().catch(() => { });
    }
  }
}