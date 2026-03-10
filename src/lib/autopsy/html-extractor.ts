import * as cheerio from 'cheerio';

const MAX_CHARS = 24000; // ~6000 tokens — more room for rich pages

export function extractReadableText(html: string): string {
  const $ = cheerio.load(html);

  // Remove non-content elements
  $('script, style, noscript, iframe, svg, link, meta').remove();
  $('[style*="display:none"], [style*="display: none"], [hidden], .hidden').remove();

  // Remove nav/footer but be less aggressive — some sites put content in unusual places
  $('nav, [role="navigation"]').remove();

  // Try to find main content area first
  let content = '';
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.post-content',
    '.article-body',
    '.article-content',
    '.entry-content',
    '.page-content',
    '#main-content',
    '#content',
    '.content',
    '.review-content',
    '.reviews-section',
  ];

  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length && el.text().trim().length > 100) {
      content = el.text();
      break;
    }
  }

  // Fall back to body — but strip header/footer for cleaner output
  if (!content || content.trim().length < 100) {
    $('header, footer, [role="banner"], [role="contentinfo"]').remove();
    // Also remove obvious sidebar elements
    $('aside, [role="complementary"], .sidebar, #sidebar').remove();
    content = $('body').text();
  }

  // If still nothing, try the raw HTML text (some pages have very flat structure)
  if (!content || content.trim().length < 50) {
    content = $.text();
  }

  // Clean up whitespace — collapse multiple spaces/newlines but preserve paragraph breaks
  content = content
    .replace(/[ \t]+/g, ' ')           // Collapse horizontal whitespace
    .replace(/\n[ \t]*/g, '\n')        // Clean whitespace after newlines
    .replace(/\n{3,}/g, '\n\n')        // Max 2 consecutive newlines
    .trim();

  // Truncate to limit
  if (content.length > MAX_CHARS) {
    content = content.slice(0, MAX_CHARS) + '\n\n[Content truncated at ~6000 tokens]';
  }

  return content;
}
