import * as cheerio from 'cheerio';

const MAX_CHARS = 16000; // ~4000 tokens

export function extractReadableText(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, nav, header, footer, aside, noscript, iframe, svg, form, [role="navigation"], [role="banner"], [role="contentinfo"]').remove();

  // Try to find main content area
  let content = '';
  const contentSelectors = ['article', 'main', '[role="main"]', '.content', '.post-content', '.article-body', '#content'];

  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length && el.text().trim().length > 200) {
      content = el.text();
      break;
    }
  }

  // Fall back to body
  if (!content) {
    content = $('body').text();
  }

  // Clean up whitespace
  content = content
    .replace(/\s+/g, ' ')
    .replace(/\n\s*\n/g, '\n')
    .trim();

  // Truncate to limit
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + '\n\n[Content truncated]';
  }

  return content;
}
