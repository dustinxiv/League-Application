
export type Theme = 'Dark' | 'Light' | 'Piltover' | 'Shadow Isles' | 'Bilgewater' | 'Ionia' | 'Shurima' | 'iOS 18 Glass' | 'Winter Wonder';

export interface ChampionSimple {
  version: string;
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  info: {
    attack: number;
    defense: number;
    magic: number;
    difficulty: number;
  };
  image: {
    full: string;
    sprite: string;
    group: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  tags: string[];
  partype: string;
  stats: ChampionStats;
}

export interface ChampionStats {
  hp: number;
  hpperlevel: number;
  mp: number;
  mpperlevel: number;
  movespeed: number;
  armor: number;
  armorperlevel: number;
  spellblock: number;
  spellblockperlevel: number;
  attackrange: number;
  hpregen: number;
  hpregenperlevel: number;
  mpregen: number;
  mpregenperlevel: number;
  crit: number;
  critperlevel: number;
  attackdamage: number;
  attackdamageperlevel: number;
  attackspeedperlevel: number;
  attackspeed: number;
}

export interface ChampionSpell {
  id: string;
  name: string;
  description: string;
  tooltip: string;
  leveltip?: {
    label: string[];
    effect: string[];
  };
  maxrank: number;
  cooldown: number[];
  cooldownBurn: string;
  cost: number[];
  costBurn: string;
  datavalues: any;
  effect: (number[] | null)[];
  effectBurn: (string | null)[];
  vars: any[];
  costType: string;
  maxammo: string;
  range: number[];
  rangeBurn: string;
  image: {
    full: string;
    sprite: string;
    group: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  resource?: string;
}

export interface ChampionPassive {
  name: string;
  description: string;
  image: {
    full: string;
    sprite: string;
    group: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
}

export interface ChampionDetail extends ChampionSimple {
  skins: any[];
  lore: string;
  spells: ChampionSpell[];
  passive: ChampionPassive;
  recommended: any[];
}

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface LiveGameParticipant {
  puuid: string;
  summonerId: string;
  championId: number; // This maps to the 'key' in ChampionSimple (stats.id is string name, key is string number)
  teamId: number;
  riotId: string;
}

export interface LiveGameInfo {
  gameId: number;
  mapId: number;
  gameMode: string;
  gameType: string;
  participants: LiveGameParticipant[];
}

export interface RegionConfig {
  region: string; // e.g., 'americas'
  platform: string; // e.g., 'na1'
}

// --- NEW TYPES FOR MULTI-SEARCH ---

export interface LeagueEntry {
  leagueId: string;
  queueType: string; // RANKED_SOLO_5x5
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  veteran: boolean;
  inactive: boolean;
  freshBlood: boolean;
  hotStreak: boolean;
}

export interface ChampionMastery {
  championId: number;
  championLevel: number;
  championPoints: number;
}

export interface EnrichedParticipant extends LiveGameParticipant {
  championName?: string; // Derived from ID
  rankSolo?: LeagueEntry;
  mastery?: ChampionMastery[];
  isLoaded?: boolean;
}

export interface SavedGame {
  id: string;
  title: string;
  notes: string;
  date: string;
  pool: ChampionDetail[];
}