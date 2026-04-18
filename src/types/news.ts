export interface WeatherDaily {
  date: string;
  high: number;
  low: number;
  condition: string;
  precipitationMm: number;
}

export interface WeatherForecast {
  locationLabel: string;
  days: WeatherDaily[];
}

export interface FootballFixture {
  id: string;
  competition: string;
  kickoff: string;
  home: { name: string; score?: number };
  away: { name: string; score?: number };
  status: 'scheduled' | 'live' | 'finished';
  url?: string;
}

export interface FootballHeadline {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  source: string;
}

export interface AnthropicUpdate {
  id: string;
  title: string;
  url: string;
  publishedAt: string;
  summary?: string;
}

export interface CryptoMover {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePct24h: number;
  url?: string;
}

export interface StockMover {
  symbol: string;
  name?: string;
  price: number;
  changePct: number;
}
