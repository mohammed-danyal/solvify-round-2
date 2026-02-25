interface Scraper {
  url: string;
  prompt: string;
  userId: string;
}

export async function useScrapper({ url, prompt, userId }: Scraper): Promise<string> {

  try {
    // Extract the level slug from the target URL (e.g., 'do-not-tell' or 'baseline')
    const urlObj = new URL(url);
    const slug = urlObj.pathname.replace('/', '') || 'baseline';

    const form = new FormData();
    form.append('defender', slug);
    form.append('prompt', prompt);

    const t1 = Date.now();

    // Native Node.js Fetch to bypass Browser completely (No chromium memory limits and 3x faster response)
    const response = await fetch('https://gandalf-api.lakera.ai/api/send-message', {
      method: 'POST',
      body: form,
      headers: {
        'Accept': 'application/json'
        // 'User-Agent' mimicking can be added here if Lakera adds WAF rules in the future
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Lakera API returned an error: ${response.status} - ${errorText}`);
      throw new Error(`Lakera Server Error: ${response.status}`);
    }

    const data = await response.json();
    const t2 = Date.now();

    // The API returns { answer: "...", defender: "...", prompt: "..." }
    if (data && typeof data.answer === 'string') {
      return data.answer;
    }

    return "I'm sorry, I don't understand what you're trying to say.";

  } catch (error) {
    console.error(`Scraper Error for ${userId}:`, error);
    throw new Error("Failed to get response from the AI interface.");
  }
}