const SEARCH_TIMEOUT_MS = 8000;
const MAX_RESULTS = 3;

function tidyText(value, max = 700) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function decodeEntities(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;|&#x27;/gi, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => { try { return String.fromCodePoint(Number(n)); } catch { return ""; } })
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => { try { return String.fromCodePoint(parseInt(n, 16)); } catch { return ""; } });
}

function stripMarkup(value) {
  return tidyText(decodeEntities(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]*>/g, " "), 700);
}

function safeSourceUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || !url.hostname) return "";
    url.hash = "";
    return url.toString().slice(0, 1200);
  } catch {
    return "";
  }
}

const SEARCH_STOPWORDS = new Set("what is are was were how why when where who does do did can could would should the a an and or to of for in on about explain tell me please today latest current recent best define definition".split(" "));
function queryTokens(value) {
  return new Set((String(value || "").toLowerCase().match(/[a-z0-9]+|[\u0980-\u09FF]+/g) || [])
    .map((word) => word.length > 4 && word.endsWith("s") ? word.slice(0, -1) : word)
    .filter((word) => word.length > 1 && !SEARCH_STOPWORDS.has(word)));
}

function compactQuery(value) {
  return [...queryTokens(value)].join(" ").slice(0, 240) || tidyText(value, 240);
}

function relevance(item, terms) {
  const title = queryTokens(item.title);
  const body = queryTokens(item.excerpt);
  let score = 0;
  for (const term of terms) score += title.has(term) ? 3 : body.has(term) ? 1 : 0;
  return score;
}

function xmlValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? match[1] : "";
}

async function bingSearch(query) {
  const url = new URL("https://www.bing.com/search");
  url.searchParams.set("q", compactQuery(query));
  url.searchParams.set("format", "rss");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "application/rss+xml, application/xml, text/xml",
        "accept-language": /[\u0980-\u09FF]/.test(query) ? "bn,en;q=0.8" : "en,bn;q=0.5",
        "user-agent": "Mozilla/5.0 (compatible; TajulPortfolioOnlineSearch/1.0)"
      }
    });
    if (!response.ok) return [];
    const xml = await response.text();
    const items = [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
    const seen = new Set();
    return items.slice(0, 8).map((match) => {
      const item = match[1];
      return {
        title: stripMarkup(xmlValue(item, "title" )).slice(0, 160),
        url: safeSourceUrl(stripMarkup(xmlValue(item, "link"))),
        excerpt: stripMarkup(xmlValue(item, "description"))
      };
    }).filter((item) => item.title && item.url && item.excerpt.length >= 25 && !seen.has(item.url) && seen.add(item.url)).slice(0, 8);
  } finally {
    clearTimeout(timeout);
  }
}

async function wikipediaSearch(query) {
  const language = /[\u0980-\u09FF]/.test(query) ? "bn" : "en";
  const url = new URL(`https://${language}.wikipedia.org/w/api.php`);
  const params = {
    action: "query", generator: "search", gsrsearch: compactQuery(query),
    gsrnamespace: "0", gsrlimit: String(MAX_RESULTS), prop: "extracts",
    exintro: "1", explaintext: "1", exsentences: "3", inprop: "url",
    format: "json", utf8: "1"
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "TajulPortfolioOnlineSearch/1.0 (portfolio assistant)" }
    });
    if (!response.ok) return [];
    const data = await response.json();
    const pages = Object.values(data?.query?.pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    return pages.map((page) => ({
      title: tidyText(page.title, 160),
      url: safeSourceUrl(page.fullurl || `https://${language}.wikipedia.org/wiki/${encodeURIComponent(String(page.title || "").replace(/ /g, "_"))}`),
      excerpt: tidyText(page.extract, 700)
    })).filter((item) => item.title && item.url && item.excerpt.length >= 25).slice(0, MAX_RESULTS);
  } finally {
    clearTimeout(timeout);
  }
}

export function isAboutTajul(question) {
  const q = String(question || "").toLowerCase();
  if (/(tajul|redwan|তাজুল|রেদ্বওয়ান|রেদওয়ান)/i.test(q)) return true;
  if (/\b(?:about (?:him|the owner|me)|who (?:is|was) he|who are you|who is this person|what(?:'s| is) your name|the portfolio owner|my (?:profile|projects?|skills?|experience|cv|resume|career|email|phone|contact|name))\b/i.test(q)) return true;
  const profileFact = /\b(?:education|study|studies|graduate|degree|projects?|skills?|experience|career|work|cv|resume|contact|email|phone|whatsapp|social|certificates?|languages?|background|age|family|salary|address|school|college|major|based|live|hometown|name)\b/i;
  if (/\b(?:he|him|his|you|your|i|me|my)\b/i.test(q) && profileFact.test(q)) return true;
  return /(?:তিনি|তাঁর|তার|আপনি|আপনার|তোমার|আমার).{0,60}(?:কে|পড়াশোনা|শিক্ষা|প্রজেক্ট|প্রকল্প|দক্ষতা|অভিজ্ঞতা|কাজ|সিভি|যোগাযোগ|সার্টিফিকেট|ভাষা|জীবনী|বয়স|বয়স|ঠিকানা|বাড়ি|বাসা)/i.test(q);
}

export async function searchOnline(query) {
  const [webResults, encyclopediaResults] = await Promise.all([
    bingSearch(query).catch(() => []),
    wikipediaSearch(query).catch(() => [])
  ]);
  const terms = [...queryTokens(query)];
  const seen = new Set();
  const candidates = [...webResults, ...encyclopediaResults]
    .filter((item) => !/\b(?:film|movie|disambiguation|category|list of)\b/i.test(item.title))
    .map((item) => ({ ...item, score: relevance(item, terms) }))
    .filter((item) => !terms.length || item.score >= 3)
    .sort((a, b) => b.score - a.score);
  const merged = [];
  for (const item of candidates) {
    if (!item.url || seen.has(item.url)) continue;
    seen.add(item.url);
    const { score, ...source } = item;
    merged.push(source);
    if (merged.length >= 5) break;
  }
  return merged;
}
