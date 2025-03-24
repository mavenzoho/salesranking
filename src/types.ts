export interface SalesPerson {
  rank: number;
  name: string;
}

export interface RankingsState {
  lastUpdated: string;
  rankings: SalesPerson[];
}