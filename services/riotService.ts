
import { ChampionSimple, ChampionDetail, RiotAccount, LiveGameInfo, RegionConfig, LeagueEntry, ChampionMastery, MatchV5DTO } from '../types';

const DEFAULT_API_KEY = 'RGAPI-0339b92e-ce0f-48b0-948c-af1b6b6c5224';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class RiotService {
  private static instance: RiotService;
  private version: string = '15.1.1';
  private championsCache: Record<string, ChampionSimple> | null = null;
  private championDetailsCache: Record<string, ChampionDetail> = {};
  private championKeyMap: Record<string, ChampionSimple> = {};
  private summonerIdCache: Record<string, string> = {};
  private runeMap: Record<number, string> = {};
  private summonerSpellMap: Record<number, string> = {};

  private constructor() {}

  public static getInstance(): RiotService {
    if (!RiotService.instance) {
      RiotService.instance = new RiotService();
    }
    return RiotService.instance;
  }

  public async init(): Promise<void> {
    try {
      const vResponse = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      if (vResponse.ok) {
        const versions = await vResponse.json();
        this.version = versions[0];
      }
      
      // Parallel fetch champions, runes, and summoner spells
      await Promise.all([
        this.getAllChampions(),
        this.initRunes(),
        this.initSummoners()
      ]);
    } catch (e) {
      console.warn('Failed to fetch DDragon data, using fallbacks');
      await this.getAllChampions();
    }
  }

  private async initRunes(): Promise<void> {
    try {
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/en_US/runesReforged.json`);
      if (!response.ok) return;
      const data = await response.json();
      
      const map: Record<number, string> = {};
      data.forEach((path: any) => {
          // Map the path (style) icon itself
          map[path.id] = path.icon;
          path.slots.forEach((slot: any) => {
              slot.runes.forEach((rune: any) => {
                  map[rune.id] = rune.icon;
              });
          });
      });
      this.runeMap = map;
    } catch (e) {
      console.error('Failed to init runes', e);
    }
  }

  private async initSummoners(): Promise<void> {
    try {
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/en_US/summoner.json`);
      if (!response.ok) return;
      const data = await response.json();
      
      Object.values(data.data).forEach((spell: any) => {
          this.summonerSpellMap[parseInt(spell.key)] = spell.image.full;
      });
    } catch (e) {
      console.error('Failed to init summoner spells', e);
    }
  }

  public getRuneIcon(id: number | undefined): string {
    if (!id || !this.runeMap[id]) return '';
    return `https://ddragon.leagueoflegends.com/cdn/img/${this.runeMap[id]}`;
  }
  
  public getSummonerSpellIcon(id: number | undefined): string | null {
      if (!id || !this.summonerSpellMap[id]) return null;
      return `https://ddragon.leagueoflegends.com/cdn/${this.version}/img/spell/${this.summonerSpellMap[id]}`;
  }

  public getKeystoneIcon(id: number | undefined): string {
    return this.getRuneIcon(id);
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

      if (!this.championKeyMap['221'] && this.championsCache && this.championsCache['Zeri']) {
          this.championKeyMap['221'] = this.championsCache['Zeri'];
      }

      return this.championsCache || {};
    } catch (e) {
      return {};
    }
  }

  public getChampionSummaryList(): {name: string, id: string, image: string}[] {
    if (!this.championsCache) return [];
    return Object.values(this.championsCache).map(c => ({
        name: c.name,
        id: c.id,
        image: c.image.full
    })).sort((a,b) => a.name.localeCompare(b.name));
  }

  public getChampionByKey(key: number | string): ChampionSimple | undefined {
    return this.championKeyMap[String(key)];
  }

  public async getChampionDetail(id: string): Promise<ChampionDetail | null> {
    if (this.championDetailsCache[id]) return this.championDetailsCache[id];
    try {
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${this.version}/data/en_US/champion/${id}.json`);
      if (!response.ok) return null;
      const data = await response.json();
      const detail = data.data[id] as ChampionDetail;
      if (!detail) return null;
      if (!detail.version) detail.version = this.version;
      this.championDetailsCache[id] = detail;
      return detail;
    } catch (e) {
      return null;
    }
  }

  private async request(url: string, apiKey: string, retries = 2): Promise<any> {
    const key = apiKey || DEFAULT_API_KEY;
    const separator = url.includes('?') ? '&' : '?';
    const targetUrl = `${url}${separator}api_key=${key}&_t=${Date.now()}`;
    const encodedTarget = encodeURIComponent(targetUrl);
    
    const proxies = [
        (target: string) => `https://corsproxy.io/?${target}`,
        (target: string) => `https://api.allorigins.win/raw?url=${target}`,
        (target: string) => `https://api.codetabs.com/v1/proxy?quest=${target}`
    ];

    let lastError: any;

    for (const createProxyUrl of proxies) {
        try {
            const proxyUrl = createProxyUrl(encodedTarget);
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 15000); 

            const res = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(id);

            if (res.status === 429) {
                if (retries > 0) {
                    await wait(2500);
                    return this.request(url, apiKey, retries - 1);
                } else {
                    throw new Error('429 Rate Limit Exceeded');
                }
            }

            if (res.status === 403) throw new Error('403 Forbidden');
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
            
            const text = await res.text();
            let data;
            try { data = JSON.parse(text); } catch (e) { throw new Error('Non-JSON'); }
            
            if (data && data.status && data.status.status_code) {
                 if (data.status.status_code === 404) return null;
                 if (data.status.status_code === 429) {
                     if (retries > 0) {
                        await wait(2500);
                        return this.request(url, apiKey, retries - 1);
                     }
                     throw new Error('Riot Rate Limit');
                 }
            }

            return data;
        } catch (e) { lastError = e; }
    }
    throw new Error('All proxies failed');
  }

  public async getAccount(gameName: string, tagLine: string, region: string, apiKey: string): Promise<RiotAccount> {
    const routing = this.getRegionRouting(region);
    const safeName = encodeURIComponent(gameName);
    const safeTag = encodeURIComponent(tagLine);
    const url = `https://${routing.region}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${safeName}/${safeTag}`;
    const data = await this.request(url, apiKey);
    if (!data) throw new Error('Account not found');
    return data;
  }

  public async getLiveGame(puuid: string, region: string, apiKey: string): Promise<LiveGameInfo | null> {
    const routing = this.getRegionRouting(region);
    const url = `https://${routing.platform}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${puuid}`;
    const data = await this.request(url, apiKey);
    if (data && Array.isArray(data.participants)) return data;
    return null;
  }

  public async getMatchIds(puuid: string, region: string, apiKey: string, start: number = 0, count: number = 10): Promise<string[]> {
    const routing = this.getRegionRouting(region);
    const url = `https://${routing.region}.api.riotgames.com/lol/match/v5/matches/by-puuid/${puuid}/ids?start=${start}&count=${count}`;
    try {
      const data = await this.request(url, apiKey);
      return Array.isArray(data) ? data : [];
    } catch (e) { return []; }
  }

  public async getMatchDetail(matchId: string, region: string, apiKey: string): Promise<MatchV5DTO | null> {
    const routing = this.getRegionRouting(region);
    const url = `https://${routing.region}.api.riotgames.com/lol/match/v5/matches/${matchId}`;
    try {
      const data = await this.request(url, apiKey);
      if (data && data.info) return data;
      return null;
    } catch (e) { return null; }
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

  public async imageUrlToBase64(url: string): Promise<string | null> {
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) { return null; }
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
    Object.values(this.championsCache).forEach(c => { map[c.key] = c.id; });
    return map;
  }
}

export default RiotService.getInstance();
