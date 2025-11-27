
import { ChampionSimple, ChampionDetail, RiotAccount, LiveGameInfo, RegionConfig, LeagueEntry, ChampionMastery } from '../types';

const DEFAULT_API_KEY = 'RGAPI-0339b92e-ce0f-48b0-948c-af1b6b6c5224';

class RiotService {
  private static instance: RiotService;
  private version: string = '14.1.1';
  private championsCache: Record<string, ChampionSimple> | null = null;
  private championDetailsCache: Record<string, ChampionDetail> = {};
  private championKeyMap: Record<string, ChampionSimple> = {};
  private summonerIdCache: Record<string, string> = {};

  private constructor() {}

  public static getInstance(): RiotService {
    if (!RiotService.instance) {
      RiotService.instance = new RiotService();
    }
    return RiotService.instance;
  }

  public async init(): Promise<void> {
    try {
      const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      if (response.ok) {
        const versions = await response.json();
        this.version = versions[0];
      }
      await this.getAllChampions();
    } catch (e) {
      console.warn('Failed to fetch DDragon version, using fallback:', this.version);
    }
  }

  public getVersion(): string {
    return this.version;
  }

  public async getAllChampions(): Promise<Record<string, ChampionSimple>> {
    if (this.championsCache) return this.championsCache;
    try {
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/en_US/champion.json`);
      const data = await response.json();
      this.championsCache = data.data;
      Object.values(this.championsCache || {}).forEach(c => {
        this.championKeyMap[c.key] = c;
      });
      return this.championsCache || {};
    } catch (e) {
      return {};
    }
  }

  public getChampionByKey(key: number | string): ChampionSimple | undefined {
    return this.championKeyMap[String(key)];
  }

  public async getChampionDetail(id: string): Promise<ChampionDetail | null> {
    if (this.championDetailsCache[id]) return this.championDetailsCache[id];
    try {
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/en_US/champion/${id}.json`);
      const data = await response.json();
      const detail = data.data[id] as ChampionDetail;
      if (!detail.version) detail.version = this.version;
      this.championDetailsCache[id] = detail;
      return detail;
    } catch (e) {
      return null;
    }
  }

  // --- HYBRID REQUEST HANDLER (Direct + Proxy Fallback) ---
  private async request(url: string, apiKey: string): Promise<any> {
    const key = apiKey || DEFAULT_API_KEY;
    const separator = url.includes('?') ? '&' : '?';
    const targetUrl = `${url}${separator}api_key=${key}`;
    const encodedTarget = encodeURIComponent(targetUrl);
    
    // In Electron with webSecurity:false, we can hit this DIRECTLY.
    // This is much faster than using a proxy.
    try {
        const res = await fetch(targetUrl);
        if (res.status === 403) throw new Error('403 Forbidden (Check API Key)');
        if (res.status === 404) return null;
        if (res.status === 429) throw new Error('429 Rate Limit');
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        return await res.json();
    } catch (directError: any) {
        // If direct fetch fails (e.g. Rate limit or weird network issue), we *could* fallback to proxy,
        // but typically if direct fails in Electron, the proxy won't save us from API Key issues.
        // We will try one proxy just in case it's a specific routing issue.
        console.warn('Direct fetch failed, attempting proxy fallback...', directError);
        
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodedTarget}&disableCache=${Date.now()}`;
            const res = await fetch(proxyUrl);
            if (!res.ok) throw new Error('Proxy Failed');
            return await res.json();
        } catch (proxyError) {
             throw directError; // Throw original error as it's likely more relevant
        }
    }
  }

  public async getAccount(gameName: string, tagLine: string, region: string, apiKey: string): Promise<RiotAccount> {
    const routing = this.getRegionRouting(region);
    const safeName = encodeURIComponent(gameName);
    const safeTag = encodeURIComponent(tagLine);
    const url = `https://${routing.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${safeName}/${safeTag}`;
    
    const data = await this.request(url, apiKey);
    if (!data) throw new Error('Account not found (404)');
    return data;
  }

  public async getLiveGame(puuid: string, region: string, apiKey: string): Promise<LiveGameInfo | null> {
    const routing = this.getRegionRouting(region);
    const url = `https://${routing.platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
    return await this.request(url, apiKey);
  }

  public async getSummonerByPuuid(puuid: string, region: string, apiKey: string): Promise<{id: string, accountId: string} | null> {
    if (this.summonerIdCache[puuid]) return { id: this.summonerIdCache[puuid], accountId: '' };
    const routing = this.getRegionRouting(region);
    const url = `https://${routing.platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    try {
        const data = await this.request(url, apiKey);
        if (data && data.id) {
            this.summonerIdCache[puuid] = data.id;
            return data;
        }
        return null;
    } catch (e) { return null; }
  }

  public async getLeagueEntries(summonerId: string | undefined, puuid: string, region: string, apiKey: string): Promise<LeagueEntry[]> {
    const routing = this.getRegionRouting(region);
    let targetId = summonerId;

    if (!targetId || targetId === 'undefined') {
        const summoner = await this.getSummonerByPuuid(puuid, region, apiKey);
        if (summoner) targetId = summoner.id;
        else return [];
    }

    const url = `https://${routing.platform}.api.riotgames.com/lol/league/v4/entries/by-summoner/${targetId}`;
    try {
      const data = await this.request(url, apiKey);
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  public async getTopMastery(puuid: string, region: string, apiKey: string): Promise<ChampionMastery[]> {
    const routing = this.getRegionRouting(region);
    const url = `https://${routing.platform}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;
    try {
        const data = await this.request(url, apiKey);
        return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  private getRegionRouting(regionCode: string): RegionConfig {
    switch (regionCode) {
      case 'NA': return { region: 'americas', platform: 'na1' };
      case 'EUW': return { region: 'europe', platform: 'euw1' };
      case 'EUNE': return { region: 'europe', platform: 'eun1' };
      case 'KR': return { region: 'asia', platform: 'kr' };
      default: return { region: 'americas', platform: 'na1' };
    }
  }

  public getChampionIdToNameMap(): Record<string, string> {
    const map: Record<string, string> = {};
    if (!this.championsCache) return map;
    Object.values(this.championsCache).forEach(c => {
      map[c.key] = c.id;
    });
    return map;
  }
}

export default RiotService.getInstance();
