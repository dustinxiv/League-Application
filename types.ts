
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
  skins: { id: string; num: number; name: string; chromas: boolean }[];
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
  championId: number;
  teamId: number;
  riotId: string;
  perks?: {
    perkIds: number[];
    perkStyle: number;
    perkSubStyle: number;
  };
}

export interface LiveGameInfo {
  gameId: number;
  mapId: number;
  gameMode: string;
  gameType: string;
  gameStartTime: number;
  participants: LiveGameParticipant[];
}

export interface RegionConfig {
  region: string;
  platform: string;
}

export interface LeagueEntry {
  leagueId: string;
  queueType: string;
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
  championName?: string;
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

export interface SavedAccount {
  gameName: string;
  tagLine: string;
  region: string;
}

export interface SearchTag {
    championId: number;
    teamId: number;
}

export interface RecentSearch {
  gameName: string;
  tagLine: string;
  region: string;
  championId: number;
  timestamp: number;
  notes?: string;
  customTitle?: string;
  tags?: SearchTag[];
  snapshot?: {
      participants: EnrichedParticipant[];
      gameStartTime: number;
  };
}

// Match V5 Types
export interface MatchV5DTO {
    metadata: {
        matchId: string;
        participants: string[];
    };
    info: {
        gameCreation: number;
        gameDuration: number;
        gameStartTimestamp: number;
        gameEndTimestamp?: number;
        gameMode: string;
        queueId: number;
        participants: MatchParticipantV5[];
    };
}

export interface MatchParticipantV5 {
    puuid: string;
    summonerId: string;
    championId: number;
    championName: string;
    teamId: number;
    riotIdGameName: string;
    riotIdTagline: string;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    item0: number;
    item1: number;
    item2: number;
    item3: number;
    item4: number;
    item5: number;
    item6: number;
    summoner1Id: number;
    summoner2Id: number;
    totalDamageDealtToChampions: number;
    totalDamageTaken: number;
    goldEarned: number;
    wardsPlaced: number;
    wardsKilled: number;
    visionWardsBoughtInGame: number;
    detectorWardsPlaced?: number;
    totalMinionsKilled: number;
    neutralMinionsKilled: number;
    champLevel: number;
    doubleKills: number;
    tripleKills: number;
    quadraKills: number;
    pentaKills: number;
    perks: {
        styles: {
            description: string;
            selections: { perk: number }[];
            style: number;
        }[];
    };
}

export type Role = 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support' | 'Manual';

export interface ChampionListItem {
    detail: ChampionDetail;
    role: Role;
    team?: 'Blue' | 'Red';
}

export interface MetaChampion {
    name: string;
    tier: string;
    winRate: string;
    pickRate: string;
    banRate: string;
    role: string;
}
