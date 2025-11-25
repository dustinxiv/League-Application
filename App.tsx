
import React, { useState, useEffect, useCallback, useRef } from 'react';
import RiotService from './services/riotService';
import AbilitiesPanel from './components/AbilitiesPanel';
import ChampionDetailCard from './components/ChampionDetailCard';
import StatsPanel from './components/StatsPanel';
import MultiSearchPanel from './components/MultiSearchPanel';
import { ChampionDetail, Theme, EnrichedParticipant } from './types';

// Icons
const IconScout = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IconDetails = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" /></svg>;
const IconAbilities = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const IconStats = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>;
const IconMulti = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>;

type Tab = 'Scout' | 'Multi' | 'Details' | 'Abilities' | 'Stats';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Scout');
  const [theme, setTheme] = useState<Theme>('Piltover');
  const [championPool, setChampionPool] = useState<ChampionDetail[]>([]);
  const [scoutedParticipants, setScoutedParticipants] = useState<EnrichedParticipant[]>([]);
  const [globalHaste, setGlobalHaste] = useState<number>(0);
  
  // Inputs
  const [inputName, setInputName] = useState('');
  const [inputTag, setInputTag] = useState('');
  const [region, setRegion] = useState('NA');
  const [apiKey, setApiKey] = useState('RGAPI-0339b92e-ce0f-48b0-948c-af1b6b6c5224');
  const [manualSearch, setManualSearch] = useState('');
  
  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [enrichmentProgress, setEnrichmentProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<React.ReactNode>('');
  const [allChampsSimple, setAllChampsSimple] = useState<any[]>([]);
  const [currentVersion, setCurrentVersion] = useState('14.1.1');

  // Nav Ref
  const navScrollRef = useRef<HTMLDivElement>(null);

  // Init
  useEffect(() => {
    RiotService.init().then(() => {
      setCurrentVersion(RiotService.getVersion());
      const map = RiotService.getAllChampions();
      map.then(data => {
        setAllChampsSimple(Object.values(data).sort((a,b) => a.name.localeCompare(b.name)));
      });
    });
    
    // Load persisted
    const saved = localStorage.getItem('lol-gameboard-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.theme) setTheme(parsed.theme);
      if (parsed.apiKey) setApiKey(parsed.apiKey);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('lol-gameboard-state', JSON.stringify({ theme, apiKey }));
  }, [theme, apiKey]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes('#')) {
        const [name, tag] = val.split('#');
        setInputName(name);
        // Remove the # and any trailing/leading whitespace if present
        if (tag) setInputTag(tag.trim());
    } else {
        setInputName(val);
    }
  };

  const fetchLiveGame = async () => {
    if (!inputName || !inputTag) {
        setErrorMsg('Riot ID and Tag are required');
        return;
    }
    setIsLoading(true);
    setEnrichmentProgress(0);
    setErrorMsg('');
    setChampionPool([]);
    setScoutedParticipants([]);

    try {
      // 1. Get Account
      const account = await RiotService.getAccount(inputName, inputTag, region, apiKey);
      if (!account) throw new Error('Account not found');

      // 2. Get Active Game
      const game = await RiotService.getLiveGame(account.puuid, region, apiKey);
      if (!game) {
        setErrorMsg('Summoner is not currently in an active game.');
        setIsLoading(false);
        return;
      }

      // 3. Get Details for all participants (Champions)
      const champIdMap = RiotService.getChampionIdToNameMap();
      const promises = game.participants.map(p => {
         const champName = champIdMap[p.championId];
         return champName ? RiotService.getChampionDetail(champName) : null;
      });

      const details = await Promise.all(promises);
      const validDetails = details.filter((d): d is ChampionDetail => !!d);
      
      setChampionPool(validDetails);
      setActiveTab('Multi');

      // 4. Background: Get Rank and Mastery for Multi Panel
      // Initialize with basic data immediately so UI shows something
      const initialParticipants: EnrichedParticipant[] = game.participants.map(p => ({
          ...p,
          championName: champIdMap[p.championId],
          rankSolo: undefined,
          mastery: [],
          isLoaded: false
      }));
      setScoutedParticipants(initialParticipants);

      // Function to fetch Enriched data sequentially to avoid Rate Limiting (429) and Proxy Blocks
      const fetchEnrichedData = async () => {
          const updated = [...initialParticipants];
          
          for (let i = 0; i < updated.length; i++) {
              const p = updated[i];
              
              // 300ms delay between players to prevent rate limiting, especially if fallback calls are needed
              if (i > 0) await new Promise(r => setTimeout(r, 300));

              try {
                  const [entries, mastery] = await Promise.all([
                      // Pass both summonerId and puuid. Service will handle fallback if ID is undefined
                      RiotService.getLeagueEntries(p.summonerId, p.puuid, region, apiKey)
                        .catch(e => { console.warn(`Rank fetch failed for ${p.riotId}`, e); return []; }),
                      RiotService.getTopMastery(p.puuid, region, apiKey)
                        .catch(e => { console.warn(`Mastery fetch failed for ${p.riotId}`, e); return []; })
                  ]);
                  
                  updated[i] = {
                      ...p,
                      championName: champIdMap[p.championId],
                      rankSolo: entries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5'),
                      mastery,
                      isLoaded: true
                  };
                  
                  // Update progress and state incrementally
                  setEnrichmentProgress(Math.round(((i + 1) / updated.length) * 100));
                  setScoutedParticipants([...updated]);
              } catch (e) {
                  console.warn(`Failed to enrich participant ${i}`, e);
                  updated[i] = { ...updated[i], isLoaded: true };
                  setScoutedParticipants([...updated]);
              }
          }
          // Clear progress after a moment
          setTimeout(() => setEnrichmentProgress(0), 1000);
      };

      // Start fetching in background
      fetchEnrichedData();

    } catch (e: any) {
      console.error(e);
      const msg = e.message || 'Failed to fetch live game.';
      
      if (msg.includes('403')) {
          setErrorMsg(
            <span>
                API Key Expired or Invalid. <br/>
                <a href="https://developer.riotgames.com/" target="_blank" rel="noreferrer" className="underline text-amber-400">
                    Get a new key here
                </a>
            </span>
          );
      } else if (msg.includes('404')) {
          setErrorMsg('Account not found (Check Name#Tag or Region)');
      } else {
          setErrorMsg(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      fetchLiveGame();
    }
  };

  const addManualChampion = async (champId: string) => {
    setIsLoading(true);
    const detail = await RiotService.getChampionDetail(champId);
    if (detail) {
        setChampionPool(prev => {
            if (prev.find(p => p.id === detail.id)) return prev;
            return [...prev, detail];
        });
        setManualSearch('');
    }
    setIsLoading(false);
  };

  const removeChampion = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChampionPool(prev => prev.filter(c => c.id !== id));
  };

  const scrollToChampion = (champId: string) => {
    setActiveTab('Details');
    setTimeout(() => {
        const element = document.getElementById(`champ-${champId}`);
        if (element) {
            const headerOffset = 130; 
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth"
            });
        }
    }, 50);
  };

  const scrollNav = (direction: 'left' | 'right') => {
    if (navScrollRef.current) {
        const amount = direction === 'left' ? -150 : 150;
        navScrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
    }
  };

  const setPreset = (name: string, tag: string) => {
    setInputName(name);
    setInputTag(tag);
  };

  // Theme Classes
  const getThemeClasses = () => {
    switch(theme) {
        case 'Piltover': return 'bg-[#051b2c] text-amber-50 selection:bg-amber-500/30';
        case 'Shadow Isles': return 'bg-[#021212] text-teal-50 selection:bg-teal-500/30';
        case 'Bilgewater': return 'bg-[#1a0f0a] text-orange-50 selection:bg-orange-500/30';
        case 'Ionia': return 'bg-[#141020] text-rose-50 selection:bg-rose-500/30';
        case 'Shurima': return 'bg-[#161205] text-yellow-50 selection:bg-yellow-500/30';
        case 'Dark': return 'bg-zinc-950 text-gray-200 selection:bg-gray-500/30';
        case 'Light': return 'bg-slate-200 text-slate-900 selection:bg-blue-500/30';
        default: return 'bg-zinc-950 text-gray-100';
    }
  };

  const getAccentColor = () => {
      switch(theme) {
          case 'Piltover': return 'text-amber-400';
          case 'Shadow Isles': return 'text-teal-400';
          case 'Bilgewater': return 'text-orange-500';
          case 'Ionia': return 'text-rose-400';
          case 'Shurima': return 'text-yellow-400';
          case 'Light': return 'text-blue-600';
          default: return 'text-blue-400';
      }
  };

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-500 ${getThemeClasses()} pb-20`}>
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-black/50 border-b border-white/10 px-4 py-3 flex justify-between items-center safe-top shadow-lg">
        <h1 className="text-xl font-bold tracking-tighter uppercase flex items-center gap-2">
            <span className={getAccentColor()}>LoL</span> Gameboard
        </h1>
        <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value as Theme)}
            className="bg-black/40 text-xs border border-white/10 rounded px-2 py-1 outline-none focus:border-white/30 text-white"
        >
            <option value="Piltover">Piltover</option>
            <option value="Shadow Isles">Shadow Isles</option>
            <option value="Bilgewater">Bilgewater</option>
            <option value="Ionia">Ionia</option>
            <option value="Shurima">Shurima</option>
            <option value="Dark">Dark Mode</option>
        </select>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-3xl mx-auto">
        
        {/* SCOUT TAB */}
        {activeTab === 'Scout' && (
            <div className="space-y-6 animate-fade-in">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                    <h2 className="text-sm font-bold uppercase opacity-60 mb-4">Live Scouting</h2>
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="Name (or paste Name#Tag)"
                                className="w-2/3 bg-black/40 border border-white/10 rounded p-3 text-sm focus:border-white/30 outline-none placeholder:text-white/20"
                                value={inputName}
                                onChange={handleNameChange}
                                onKeyDown={handleKeyDown}
                            />
                            <input 
                                type="text" 
                                placeholder="#TAG"
                                className="w-1/3 bg-black/40 border border-white/10 rounded p-3 text-sm focus:border-white/30 outline-none placeholder:text-white/20"
                                value={inputTag}
                                onChange={e => setInputTag(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setPreset('dustinthewind', 'joeyc')} 
                                className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded hover:bg-white/10 opacity-50 hover:opacity-100 transition-all"
                            >
                                dustinthewind#joeyc
                            </button>
                             <button 
                                onClick={() => setPreset('dustbyte', 'joeyc')} 
                                className="text-[10px] bg-white/5 border border-white/5 px-2 py-1 rounded hover:bg-white/10 opacity-50 hover:opacity-100 transition-all"
                            >
                                dustbyte#joeyc
                            </button>
                        </div>

                        <div className="flex gap-2">
                             <select 
                                value={region}
                                onChange={e => setRegion(e.target.value)}
                                className="bg-black/40 border border-white/10 rounded p-3 text-sm outline-none text-white/80"
                             >
                                 <option value="NA">NA</option>
                                 <option value="EUW">EUW</option>
                                 <option value="KR">KR</option>
                             </select>
                            <button 
                                onClick={fetchLiveGame}
                                disabled={isLoading}
                                className={`flex-1 font-bold uppercase tracking-wide rounded text-sm transition-all shadow-lg ${
                                    isLoading ? 'bg-gray-700 cursor-not-allowed' : 'bg-gradient-to-r from-gray-700 to-gray-600 hover:brightness-110 border border-white/10'
                                }`}
                                style={{
                                    backgroundImage: !isLoading && theme === 'Piltover' ? 'linear-gradient(to right, #b45309, #d97706)' : 
                                                     !isLoading && theme === 'Shadow Isles' ? 'linear-gradient(to right, #0d9488, #14b8a6)' :
                                                     !isLoading && theme === 'Bilgewater' ? 'linear-gradient(to right, #c2410c, #ea580c)' :
                                                     !isLoading && theme === 'Ionia' ? 'linear-gradient(to right, #be123c, #e11d48)' :
                                                     !isLoading && theme === 'Shurima' ? 'linear-gradient(to right, #a16207, #ca8a04)' : undefined
                                }}
                            >
                                {isLoading ? 'Scanning...' : 'Scout Match'}
                            </button>
                        </div>
                        {errorMsg && <div className="text-red-400 text-xs p-2 bg-red-900/20 rounded border border-red-900/50">{errorMsg}</div>}
                    </div>
                </div>

                <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
                    <h2 className="text-sm font-bold uppercase opacity-60 mb-4">Manual Pool ({championPool.length})</h2>
                    <div className="relative mb-4">
                        <input 
                            type="text" 
                            placeholder="Add Champion (e.g. Ahri)"
                            className="w-full bg-black/40 border border-white/10 rounded p-3 text-sm outline-none placeholder:text-white/20"
                            value={manualSearch}
                            onChange={e => setManualSearch(e.target.value)}
                        />
                        {manualSearch.length > 1 && (
                            <div className="absolute z-10 w-full bg-gray-900 border border-white/10 max-h-48 overflow-y-auto mt-1 rounded shadow-xl">
                                {allChampsSimple
                                    .filter(c => c.name.toLowerCase().includes(manualSearch.toLowerCase()))
                                    .map(c => (
                                        <div 
                                            key={c.id}
                                            onClick={() => addManualChampion(c.id)}
                                            className="p-2 hover:bg-white/10 cursor-pointer flex items-center gap-2"
                                        >
                                            <img 
                                                src={`https://ddragon.leagueoflegends.com/cdn/${c.version || currentVersion}/img/champion/${c.image.full}`} 
                                                className="w-6 h-6 rounded-full"
                                                alt={c.name}
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                            <span>{c.name}</span>
                                        </div>
                                    ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {championPool.map(c => (
                            <div key={c.id} className="relative group cursor-pointer" onClick={() => scrollToChampion(c.id)}>
                                <img 
                                    src={`https://ddragon.leagueoflegends.com/cdn/${c.version || currentVersion}/img/champion/${c.image.full}`} 
                                    className="w-12 h-12 rounded border border-white/20 hover:border-white/60 transition-colors"
                                    alt={c.name}
                                />
                                <button 
                                    onClick={(e) => removeChampion(c.id, e)}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:scale-110 transition-transform shadow-sm"
                                >×</button>
                            </div>
                        ))}
                         {championPool.length === 0 && <span className="text-gray-500 text-sm italic">Pool is empty.</span>}
                    </div>
                </div>
            </div>
        )}

        {/* MULTI TAB */}
        {activeTab === 'Multi' && (
            <div className="animate-fade-in">
                <MultiSearchPanel participants={scoutedParticipants} progress={enrichmentProgress} />
            </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'Details' && (
            <div className="animate-fade-in relative">
                {/* Sticky Navigation Bar */}
                {championPool.length > 0 && (
                     <div className="sticky top-14 z-40 bg-gray-900/95 backdrop-blur border-b border-white/10 mb-4 shadow-md -mx-4 flex items-center">
                        <button 
                            onClick={() => scrollNav('left')}
                            className="p-3 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10 shrink-0 border-r border-white/5"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>

                        <div 
                            ref={navScrollRef}
                            className="flex gap-3 overflow-x-auto hide-scrollbar py-2 px-3 w-full scroll-smooth"
                        >
                            {championPool.map(c => (
                                <button 
                                    key={c.id} 
                                    onClick={() => scrollToChampion(c.id)}
                                    className="shrink-0 relative group"
                                >
                                    <img 
                                        src={`https://ddragon.leagueoflegends.com/cdn/${c.version || currentVersion}/img/champion/${c.image.full}`} 
                                        alt={c.name}
                                        className="w-10 h-10 rounded-full border-2 border-transparent group-hover:border-amber-400 transition-all opacity-80 group-hover:opacity-100"
                                    />
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={() => scrollNav('right')}
                            className="p-3 text-gray-400 hover:text-white hover:bg-white/10 transition-colors z-10 shrink-0 border-l border-white/5"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </button>
                     </div>
                )}

                {championPool.length === 0 ? (
                    <div className="text-center text-gray-500 mt-10">No champions loaded.</div>
                ) : (
                    championPool.map(c => (
                        <ChampionDetailCard key={c.id} id={`champ-${c.id}`} champion={c} globalHaste={globalHaste} />
                    ))
                )}
            </div>
        )}

        {/* ABILITIES TAB */}
        {activeTab === 'Abilities' && (
            <div className="animate-fade-in">
                <div className="sticky top-14 z-40 bg-gray-900/90 backdrop-blur border-b border-white/5 p-3 mb-4 rounded-b-xl shadow-lg -mx-4 px-8">
                     <div className="flex justify-between items-center mb-1">
                        <label className={`text-xs font-bold uppercase ${getAccentColor()}`}>Global Ability Haste</label>
                        <span className="text-lg font-mono font-bold">{globalHaste}</span>
                     </div>
                     <input 
                        type="range" 
                        min="0" 
                        max="150" 
                        value={globalHaste} 
                        onChange={(e) => setGlobalHaste(Number(e.target.value))}
                        className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-white"
                     />
                     <div className="flex justify-between text-[10px] opacity-60 mt-1">
                         <span>0 (Base)</span>
                         <span>~40% CDR (66 AH)</span>
                         <span>150 (URF)</span>
                     </div>
                </div>

                <AbilitiesPanel champions={championPool} globalHaste={globalHaste} />
            </div>
        )}

        {/* STATS TAB */}
        {activeTab === 'Stats' && (
            <div className="animate-fade-in">
                <StatsPanel champions={championPool} theme={theme} />
            </div>
        )}

      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center safe-bottom z-50">
        <button onClick={() => setActiveTab('Scout')} className={`flex flex-col items-center p-3 w-full ${activeTab === 'Scout' ? getAccentColor() : 'text-gray-500'}`}>
            <IconScout />
            <span className="text-[10px] mt-1 font-bold uppercase">Scout</span>
        </button>
        <button onClick={() => setActiveTab('Multi')} className={`flex flex-col items-center p-3 w-full ${activeTab === 'Multi' ? getAccentColor() : 'text-gray-500'}`}>
            <IconMulti />
            <span className="text-[10px] mt-1 font-bold uppercase">Multi</span>
        </button>
        <button onClick={() => setActiveTab('Details')} className={`flex flex-col items-center p-3 w-full ${activeTab === 'Details' ? getAccentColor() : 'text-gray-500'}`}>
            <IconDetails />
            <span className="text-[10px] mt-1 font-bold uppercase">Detail</span>
        </button>
        <button onClick={() => setActiveTab('Abilities')} className={`flex flex-col items-center p-3 w-full ${activeTab === 'Abilities' ? getAccentColor() : 'text-gray-500'}`}>
            <IconAbilities />
            <span className="text-[10px] mt-1 font-bold uppercase">Spells</span>
        </button>
        <button onClick={() => setActiveTab('Stats')} className={`flex flex-col items-center p-3 w-full ${activeTab === 'Stats' ? getAccentColor() : 'text-gray-500'}`}>
            <IconStats />
            <span className="text-[10px] mt-1 font-bold uppercase">Stats</span>
        </button>
      </nav>
    </div>
  );
}
