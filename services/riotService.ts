import { ChampionSimple, ChampionDetail, RiotAccount, LiveGameInfo, RegionConfig, LeagueEntry, ChampionMastery } from '../types';

const DEFAULT_API_KEY = 'RGAPI-0339b92e-ce0f-48b0-948c-af1b6b6c5224';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  // --- WEB REQUEST HANDLER (PROXY ROTATION + RETRY) ---
  private async request(url: string, apiKey: string, retries = 2): Promise<any> {
    const key = apiKey || DEFAULT_API_KEY;
    const separator = url.includes('?') ? '&' : '?';
    const targetUrl = `${url}${separator}api_key=${key}`;
    const encodedTarget = encodeURIComponent(targetUrl);
    
    // Updated Proxy Order for better stability with Names/Spaces
    const proxies = [
        // AllOrigins - Raw mode is currently most reliable for Riot IDs with spaces
        (target: string) => `https://api.allorigins.win/raw?url=${target}&timestamp=${Date.now()}`,
        // CodeTabs - Good backup, handles headers well
        (target: string) => `https://api.codetabs.com/v1/proxy?quest=${target}`,
        // ThingProxy - Last resort
        (target: string) => `https://thingproxy.freeboard.io/fetch/${targetUrl}`
    ];

    let lastError: any;

    for (const createProxyUrl of proxies) {
        try {
            const proxyUrl = createProxyUrl(encodedTarget);
            
            const controller = new AbortController();
            // Increased timeout to 10s for complex requests
            const id = setTimeout(() => controller.abort(), 10000); 

            const res = await fetch(proxyUrl, { signal: controller.signal });
            clearTimeout(id);

            // Handle Rate Limiting (429) - Retry logic
            if (res.status === 429) {
                if (retries > 0) {
                    console.warn(`Rate Limit hit. Retrying in 2s... (${retries} left)`);
                    await wait(2000);
                    return this.request(url, apiKey, retries - 1);
                } else {
                    throw new Error('429 Rate Limit Exceeded');
                }
            }

            if (res.status === 403) throw new Error('403 Forbidden (Check API Key)');
            if (res.status === 404) return null; // Not found is valid (e.g. not in game)
            
            if (!res.ok) throw new Error(`Proxy HTTP ${res.status}`);
            
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonError) {
                // If proxy returns HTML error page (502/504), treat as failure and rotate
                throw new Error('Proxy returned non-JSON response');
            }
            
            // Validate inner status from proxy wrappers (if any)
            if (data && data.status && data.status.status_code) {
                 if (data.status.status_code === 404) return null;
                 if (data.status.status_code === 429) {
                     if (retries > 0) {
                        await wait(2000);
                        return this.request(url, apiKey, retries - 1);
                     }
                     throw new Error('Riot API Rate Limit');
                 }
                 if (data.status.status_code >= 400) throw new Error(`Riot API Error: ${data.status.message}`);
            }

            // Check for generic proxy error strings
            if (data.Error || (data.contents && data.status?.url)) {
                 throw new Error('Invalid Proxy Response');
            }

            return data;
        } catch (e) {
            lastError = e;
            // console.warn('Proxy attempt failed, trying next...', e);
        }
    }

    // console.error('All proxies failed.', lastError);
    throw lastError;
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
    const data = await this.request(url, apiKey);
    
    // Strict validation: Must contain participants array
    if (data && Array.isArray(data.participants)) {
        return data;
    }
    return null;
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

  // --- Helper for Gemini Image Editing ---
  public async imageUrlToBase64(url: string): Promise<string | null> {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to fetch image');
        const blob = await response.blob();
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                // Remove the "data:image/jpeg;base64," part
                const base64Data = base64String.split(',')[1];
                resolve(base64Data);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (e) {
        // Fallback: Use proxy if direct fetch failed (CORS)
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const base64String = reader.result as string;
                    const base64Data = base64String.split(',')[1];
                    resolve(base64Data);
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (innerE) {
            console.error('Failed to convert image to base64', innerE);
            return null;
        }
    }
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