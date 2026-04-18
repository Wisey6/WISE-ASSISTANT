import type {
  AnthropicUpdate,
  CryptoMover,
  FootballFixture,
  FootballHeadline,
  StockMover,
  WeatherDaily,
  WeatherForecast,
} from '@/types/news';

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=51.5074&longitude=-0.1278&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto&forecast_days=7';

const BBC_ARSENAL_RSS =
  'https://feeds.bbci.co.uk/sport/football/teams/arsenal/rss.xml';

const ANTHROPIC_NEWS_URL = 'https://www.anthropic.com/news';

const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

/** ------------------------------- weather ------------------------------- */

interface OpenMeteoResponse {
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
  };
  timezone?: string;
}

export async function fetchWeather(label = 'London'): Promise<WeatherForecast> {
  const res = await fetch(WEATHER_URL);
  if (!res.ok) throw new Error(`Weather ${res.status}`);
  const data = (await res.json()) as OpenMeteoResponse;
  const days: WeatherDaily[] = data.daily.time.map((d, i) => ({
    date: d,
    high: Math.round(data.daily.temperature_2m_max[i]),
    low: Math.round(data.daily.temperature_2m_min[i]),
    condition: weatherLabel(data.daily.weathercode[i]),
    precipitationMm: data.daily.precipitation_sum[i],
  }));
  return { locationLabel: label, days };
}

function weatherLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Partly cloudy';
  if (code <= 48) return 'Foggy';
  if (code <= 67) return 'Rain';
  if (code <= 77) return 'Snow';
  if (code <= 82) return 'Showers';
  if (code <= 99) return 'Thunderstorm';
  return 'Mixed';
}

/** -------------------------- football (Arsenal) -------------------------- */

export async function fetchArsenalHeadlines(
  limit = 6,
): Promise<FootballHeadline[]> {
  try {
    const res = await fetch(BBC_ARSENAL_RSS);
    if (!res.ok) return [];
    const xml = await res.text();
    return parseRssItems(xml).slice(0, limit).map((it, idx) => ({
      id: it.guid || `bbc-${idx}`,
      title: it.title,
      url: it.link,
      publishedAt: it.pubDate || new Date().toISOString(),
      source: 'BBC Sport',
    }));
  } catch {
    return [];
  }
}

/**
 * Champions League fixtures (and live scores when available). Requires
 * a free football-data.org API key; without one we just return [].
 */
export async function fetchChampionsLeagueFixtures(
  limit = 5,
): Promise<FootballFixture[]> {
  const key = process.env.EXPO_PUBLIC_FOOTBALL_DATA_KEY;
  if (!key) return [];
  try {
    const res = await fetch(
      `${FOOTBALL_DATA_BASE}/competitions/CL/matches?status=SCHEDULED,LIVE,IN_PLAY`,
      { headers: { 'X-Auth-Token': key } },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as {
      matches?: {
        id: number;
        competition?: { name?: string };
        utcDate: string;
        status: string;
        homeTeam: { name: string };
        awayTeam: { name: string };
        score?: { fullTime?: { home: number | null; away: number | null } };
      }[];
    };
    return (data.matches ?? []).slice(0, limit).map((m) => ({
      id: `fd-${m.id}`,
      competition: m.competition?.name ?? 'Champions League',
      kickoff: m.utcDate,
      home: { name: m.homeTeam.name, score: m.score?.fullTime?.home ?? undefined },
      away: { name: m.awayTeam.name, score: m.score?.fullTime?.away ?? undefined },
      status:
        m.status === 'FINISHED'
          ? 'finished'
          : m.status === 'LIVE' || m.status === 'IN_PLAY'
          ? 'live'
          : 'scheduled',
    }));
  } catch {
    return [];
  }
}

/** ------------------------------- Anthropic ------------------------------ */

export async function fetchAnthropicUpdates(
  limit = 5,
): Promise<AnthropicUpdate[]> {
  // Anthropic's /news page doesn't publish a stable RSS endpoint.
  // Best-effort scrape of the news landing HTML + a defensive fallback
  // that reads the Anthropic blog's OG tags.
  try {
    const res = await fetch(ANTHROPIC_NEWS_URL);
    if (!res.ok) return [];
    const html = await res.text();
    const matches = Array.from(
      html.matchAll(
        /<a[^>]+href="(\/news\/[^"]+)"[^>]*>[\s\S]*?<h[23][^>]*>([^<]+)<\/h[23]>/g,
      ),
    );
    const seen = new Set<string>();
    const out: AnthropicUpdate[] = [];
    for (const m of matches) {
      const slug = m[1];
      if (seen.has(slug)) continue;
      seen.add(slug);
      out.push({
        id: slug,
        title: m[2].trim(),
        url: `https://www.anthropic.com${slug}`,
        publishedAt: '',
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch {
    return [];
  }
}

/** ---------------------------- crypto / stocks --------------------------- */

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=10&page=1&price_change_percentage=24h';

const ALPHA_MOVERS_URL =
  'https://www.alphavantage.co/query?function=TOP_GAINERS_LOSERS&apikey=';

export async function fetchCryptoMovers(limit = 5): Promise<CryptoMover[]> {
  try {
    const res = await fetch(COINGECKO_URL);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      id: string;
      symbol: string;
      name: string;
      current_price: number;
      price_change_percentage_24h: number;
    }[];
    // Interleave top gainers + top losers to give a real "biggest movers" view.
    const gainers = data.slice(0, limit);
    const losersRes = await fetch(
      COINGECKO_URL.replace('desc', 'asc'),
    ).catch(() => null);
    const losers =
      losersRes && losersRes.ok
        ? ((await losersRes.json()) as typeof data).slice(0, limit)
        : [];
    return [...gainers, ...losers].map((c) => ({
      id: c.id,
      symbol: c.symbol.toUpperCase(),
      name: c.name,
      price: c.current_price,
      changePct24h: c.price_change_percentage_24h ?? 0,
      url: `https://www.coingecko.com/en/coins/${c.id}`,
    }));
  } catch {
    return [];
  }
}

export async function fetchStockMovers(limit = 5): Promise<StockMover[]> {
  const key = process.env.EXPO_PUBLIC_ALPHA_VANTAGE_KEY;
  if (!key) return [];
  try {
    const res = await fetch(`${ALPHA_MOVERS_URL}${encodeURIComponent(key)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as {
      top_gainers?: { ticker: string; price: string; change_percentage: string }[];
      top_losers?: { ticker: string; price: string; change_percentage: string }[];
    };
    const toMover = (
      r: { ticker: string; price: string; change_percentage: string },
    ): StockMover => ({
      symbol: r.ticker,
      price: Number(r.price),
      changePct: Number(String(r.change_percentage).replace('%', '')),
    });
    const gainers = (data.top_gainers ?? []).slice(0, limit).map(toMover);
    const losers = (data.top_losers ?? []).slice(0, limit).map(toMover);
    return [...gainers, ...losers];
  } catch {
    return [];
  }
}

/** --------------------------- tiny RSS parser ---------------------------- */

interface RssItem {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
}

function parseRssItems(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    items.push({
      title: firstTag(block, 'title'),
      link: firstTag(block, 'link'),
      pubDate: firstTag(block, 'pubDate'),
      guid: firstTag(block, 'guid'),
    });
  }
  return items;
}

function firstTag(block: string, tag: string): string {
  const m = new RegExp(`<${tag}(?:[^>]*)>([\\s\\S]*?)<\\/${tag}>`).exec(block);
  if (!m) return '';
  return m[1]
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
