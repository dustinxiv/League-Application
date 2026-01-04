
import { SavedAccount, RecentSearch, Theme } from '../types';

// --- CONFIGURATION ---
// CHANGE THIS TO YOUR UPLOADED PHP FILE URL
// Example: 'https://www.hosting.com/api.php'
const SERVER_URL = ''; 

// SINGLE USER ID
// We use a fixed ID so all devices share the same data on the server.
const SHARED_USER_ID = 'global_admin_user';

interface UserData {
    theme: Theme;
    globalHaste: number;
    favorites: SavedAccount[];
    recentSearches: RecentSearch[];
    appVersion: string;
    prioritizedSpells: Record<string, string[]>;
}

const DEFAULT_DATA: UserData = {
    theme: 'Dark',
    globalHaste: 0,
    favorites: [
        { gameName: 'dustinthewind', tagLine: 'joeyc', region: 'NA' },
        { gameName: 'dustbyte', tagLine: 'joeyc', region: 'NA' }
    ],
    recentSearches: [],
    appVersion: '1.0',
    prioritizedSpells: {}
};

class StorageService {
    private userId: string;
    private cache: UserData;
    private saveTimeout: any;

    constructor() {
        this.userId = SHARED_USER_ID;
        this.cache = { ...DEFAULT_DATA };
    }

    public async init(): Promise<UserData> {
        // 1. Try LocalStorage first (Instant load)
        const local = localStorage.getItem('lol_user_data');
        if (local) {
            try {
                this.cache = { ...DEFAULT_DATA, ...JSON.parse(local) };
            } catch (e) {
                console.error("Local data corrupted");
            }
        }

        // 2. If Server URL is set, try to fetch fresh data
        if (SERVER_URL) {
            try {
                const response = await fetch(SERVER_URL, {
                    method: 'GET',
                    headers: { 'X-User-ID': this.userId }
                });
                if (response.ok) {
                    const serverData = await response.json();
                    this.cache = { ...this.cache, ...serverData };
                    // Sync server data back to local for offline support
                    localStorage.setItem('lol_user_data', JSON.stringify(this.cache));
                }
            } catch (e) {
                console.warn("Failed to reach server, using local data.");
            }
        }

        return this.cache;
    }

    // Debounced Save
    public save(key: keyof UserData, value: any) {
        this.cache = { ...this.cache, [key]: value };
        
        // Immediate Local Save
        localStorage.setItem('lol_user_data', JSON.stringify(this.cache));

        // Delayed Server Save (to prevent spamming API on slider drag)
        if (SERVER_URL) {
            if (this.saveTimeout) clearTimeout(this.saveTimeout);
            this.saveTimeout = setTimeout(() => this.pushToServer(), 1000);
        }
    }

    private async pushToServer() {
        try {
            await fetch(SERVER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-ID': this.userId
                },
                body: JSON.stringify(this.cache)
            });
        } catch (e) {
            console.error("Failed to save to server");
        }
    }

    public get<K extends keyof UserData>(key: K): UserData[K] {
        return this.cache[key];
    }
}

export default new StorageService();
