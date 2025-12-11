
import React, { useState, useEffect, useCallback, useRef } from 'react';
import RiotService from './services/riotService';
import AbilitiesPanel from './components/AbilitiesPanel';
import ChampionDetailCard from './components/ChampionDetailCard';
import StatsPanel from './components/StatsPanel';
import MultiSearchPanel from './components/MultiSearchPanel';
import StudioPanel from './components/StudioPanel';
import ChangelogModal from './components/ChangelogModal';
import ConfirmationModal from './components/ConfirmationModal';
import { ChampionDetail, Theme, EnrichedParticipant, SavedGame, SavedAccount, ChampionListItem, Role, RecentSearch } from './types';

// Icons
const IconScout = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IconDetails = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5zM10 5a2 2 0 110-4 2 2 0 010 4z" /></svg>;
const IconStats = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconStudio = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const IconSettings = () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

type Tab = 'Scout' | 'Details' | 'Stats' | 'Studio';

const APP_VERSION = '1.5';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('Dark');
  const [activeTab, setActiveTab] = useState<Tab>('Scout');
  const [showChangelog, setShowChangelog] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Search State
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('NA');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [favorites, setFavorites] = useState<SavedAccount[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  
  // Settings State
  const [globalHaste, setGlobalHaste] = useState(0);

  // Notes & Session State
  const [activeSearchTimestamp, setActiveSearchTimestamp] = useState<number | null>(null);
  const [currentNote, setCurrentNote] = useState('');
  const [isLiveGame, setIsLiveGame] = useState(true);
  
  // Data State
  const [participants, setParticipants] = useState<EnrichedParticipant[]>([]);
  
  // Revised: championList stores enriched data (with role/team), champions prop derived from it for compatibility
  const [championList, setChampionList] = useState<ChampionListItem[]>([]);
  
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00');
  const [progress, setProgress] = useState(0);

  // Init
  useEffect(() => {
    RiotService.init();
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) setTheme(savedTheme);

    const savedHaste = localStorage.getItem('globalHaste');
    if (savedHaste) setGlobalHaste(parseInt(savedHaste));

    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== APP_VERSION) {
        setShowChangelog(true);
        localStorage.setItem('app_version', APP_VERSION);
    }

    const savedFavs = localStorage.getItem('favorites');
    if (savedFavs) {
        try {
            setFavorites(JSON.parse(savedFavs));
        } catch (e) { console.error('Failed to parse favorites'); }
    } else {
        // Default presets
        const presets: SavedAccount[] = [
            { gameName: 'dustinthewind', tagLine: 'joeyc', region: 'NA' },
            { gameName: 'dustbyte', tagLine: 'joeyc', region: 'NA' }
        ];
        setFavorites(presets);
        localStorage.setItem('favorites', JSON.stringify(presets));
    }

    const savedRecents = localStorage.getItem('recentSearches');
    if (savedRecents) {
        try {
            setRecentSearches(JSON.parse(savedRecents));
        } catch (e) { console.error('Failed to parse recents'); }
    }
  }, []);

  // Timer Logic
  useEffect(() => {
    if (!gameStartTime || gameStartTime === 0) {
        setElapsedTime(gameStartTime === 0 ? 'Loading' : '00:00');
        return;
    }
    
    // If viewing history (not live), show fixed duration at time of snapshot
    if (!isLiveGame && activeSearchTimestamp) {
        const diff = activeSearchTimestamp - gameStartTime;
        if (diff < 0) {
             setElapsedTime('00:00');
             return;
        }
        const seconds = Math.floor(diff / 1000);
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        setElapsedTime(`${mm}:${ss.toString().padStart(2, '0')}`);
        return;
    }
    
    const updateTimer = () => {
        const now = Date.now();
        const diff = now - gameStartTime;
        if (diff < 0) {
             setElapsedTime('00:00');
             return;
        }
        const seconds = Math.floor(diff / 1000);
        const mm = Math.floor(seconds / 60);
        const ss = seconds % 60;
        setElapsedTime(`${mm}:${ss.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [gameStartTime, isLiveGame, activeSearchTimestamp]);

  // Theme Logic
  const handleSetTheme = (t: Theme) => {
      setTheme(t);
      localStorage.setItem('theme', t);
  };

  const handleSetHaste = (val: number) => {
      setGlobalHaste(val);
      localStorage.setItem('globalHaste', val.toString());
  };

  const getThemeClasses = () => {
      switch (theme) {
          case 'Light': return 'bg-gray-100 text-gray-900';
          case 'Piltover': return 'bg-[#e8dec0] text-[#1e293b]';
          case 'Winter Wonder': return 'bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100 text-slate-800'; 
          case 'iOS 18 Glass': return 'bg-black text-white';
          case 'Shadow Isles': return 'bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0f2e2e] via-[#041212] to-[#020606] text-teal-100';
          case 'Bilgewater': return 'bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2d2016] via-[#1a120b] to-[#0c0805] text-[#e0d6c2]';
          case 'Ionia': return 'bg-gradient-to-br from-[#fdfbf7] via-[#f7eff2] to-[#e8f4f8] text-gray-800';
          case 'Shurima': return 'bg-gradient-to-b from-[#1f1a0e] via-[#141008] to-[#0a0804] text-[#e6d0a1]';
          default: return 'bg-gray-950 text-gray-100';
      }
  };

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  // Apply body background
  useEffect(() => {
    document.body.className = getThemeClasses().split(' ')[0]; // Apply bg to body for overscroll
  }, [theme]);

  const addToHistory = (search: RecentSearch) => {
      setRecentSearches(prev => {
          let filtered = prev;
          if (search.snapshot) {
             filtered = prev.filter(r => {
                 const sameGame = r.snapshot?.gameStartTime === search.snapshot?.gameStartTime;
                 const samePlayer = r.gameName.toLowerCase() === search.gameName.toLowerCase() && 
                                    r.tagLine.toLowerCase() === search.tagLine.toLowerCase();
                 return !(sameGame && samePlayer);
             });
          } else {
             filtered = prev.filter(r => 
                !(r.gameName.toLowerCase() === search.gameName.toLowerCase() && 
                  r.tagLine.toLowerCase() === search.tagLine.toLowerCase() && 
                  r.region === search.region)
             );
          }
          
          const newRecents = [search, ...filtered].slice(0, 10);
          localStorage.setItem('recentSearches', JSON.stringify(newRecents));
          return newRecents;
      });
  };

  const clearHistory = () => {
      setRecentSearches([]);
      localStorage.removeItem('recentSearches');
  };

  const updateActiveNote = (note: string) => {
      setCurrentNote(note);
      if (activeSearchTimestamp) {
          setRecentSearches(prev => {
              const updated = prev.map(r => {
                  if (r.timestamp === activeSearchTimestamp) {
                      return { ...r, notes: note };
                  }
                  return r;
              });
              localStorage.setItem('recentSearches', JSON.stringify(updated));
              return updated;
          });
      }
  };

  const formatTimeAgo = (timestamp: number) => {
      const seconds = Math.floor((Date.now() - timestamp) / 1000);
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
  };

  const loadChampionDetailsForList = async (parts: EnrichedParticipant[]) => {
      const detailPromises = parts.map(async (p, index) => {
          const champSimple = RiotService.getChampionByKey(p.championId);
          if (champSimple) {
              const detail = await RiotService.getChampionDetail(champSimple.id);
              if (!detail) return null;
              
              const roles: Role[] = ['Top', 'Jungle', 'Mid', 'Bot', 'Support'];
              const role = roles[index % 5];
              const team = index < 5 ? 'Blue' : 'Red';
              
              return {
                  detail,
                  role,
                  team
              } as ChampionListItem;
          }
          return null;
      });
      
      const detailsResults = await Promise.all(detailPromises);
      return detailsResults.filter((d): d is ChampionListItem => d !== null);
  };

  const handleScout = async (nameOverride?: string, tagOverride?: string) => {
      const targetName = nameOverride !== undefined ? nameOverride : gameName;
      const targetTag = tagOverride !== undefined ? tagOverride : tagLine;

      if (!targetName || !targetTag) {
          setError('Please enter Name and Tag');
          return;
      }
      setIsLoading(true);
      setIsLiveGame(true);
      setError('');
      setProgress(10);
      setParticipants([]);
      setChampionList([]);
      setGameStartTime(null);
      setActiveSearchTimestamp(null);
      setCurrentNote('');

      try {
          const account = await RiotService.getAccount(targetName, targetTag, region, '');
          setProgress(30);
          
          const liveGame = await RiotService.getLiveGame(account.puuid, region, '');
          if (!liveGame) {
              throw new Error('Player is not in a live game.');
          }
          setGameStartTime(liveGame.gameStartTime);
          setProgress(50);

          const enrichedParts: EnrichedParticipant[] = liveGame.participants.map(p => ({...p, isLoaded: false}));
          setParticipants(enrichedParts);
          setActiveTab('Scout');

          const newList = await loadChampionDetailsForList(liveGame.participants);
          setChampionList(newList);
          setProgress(70);

          const finalParts = [...enrichedParts];
          let loadedCount = 0;
          const rankPromises = enrichedParts.map(async (p, idx) => {
              const [ranks, mastery] = await Promise.all([
                  RiotService.getLeagueEntries(p.summonerId, p.puuid, region, ''),
                  RiotService.getTopMastery(p.puuid, region, '')
              ]);
              
              const soloRank = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');
              
              const updatedPart = {
                  ...p,
                  rankSolo: soloRank,
                  mastery: mastery,
                  isLoaded: true,
                  championName: RiotService.getChampionByKey(p.championId)?.name
              };

              finalParts[idx] = updatedPart;

              setParticipants(prev => {
                  const next = [...prev];
                  next[idx] = updatedPart;
                  return next;
              });
              loadedCount++;
              setProgress(70 + Math.floor((loadedCount / enrichedParts.length) * 30));
          });

          await Promise.all(rankPromises);
          setProgress(100);

          const selfP = finalParts.find(p => p.riotId?.toLowerCase().includes(targetName.toLowerCase()));
          const timestamp = Date.now();
          
          addToHistory({
              gameName: targetName,
              tagLine: targetTag,
              region,
              championId: selfP ? selfP.championId : 0,
              timestamp: timestamp,
              notes: '',
              snapshot: {
                  participants: finalParts,
                  gameStartTime: liveGame.gameStartTime
              }
          });
          
          setActiveSearchTimestamp(timestamp);

      } catch (e: any) {
          setError(e.message || 'Scouting Failed');
          setProgress(0);
      } finally {
          setIsLoading(false);
      }
  };

  const handleAddChampion = async (championId: string) => {
      if (championList.some(c => c.detail.id === championId)) return;
      setIsLoading(true);
      try {
          const detail = await RiotService.getChampionDetail(championId);
          if (detail) {
              setChampionList(prev => [...prev, {
                  detail,
                  role: 'Manual',
              }]);
              setActiveTab('Details');
          }
      } catch (e) {
          console.error(e);
      } finally {
          setIsLoading(false);
      }
  };

  const toggleFavorite = () => {
      if (!gameName || !tagLine) return;
      
      const exists = favorites.find(f => 
          f.gameName.toLowerCase() === gameName.toLowerCase() && 
          f.tagLine.toLowerCase() === tagLine.toLowerCase() &&
          f.region === region
      );

      let newFavs;
      if (exists) {
          newFavs = favorites.filter(f => f !== exists);
      } else {
          newFavs = [...favorites, { gameName, tagLine, region }];
      }
      
      setFavorites(newFavs);
      localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const loadFavorite = (fav: SavedAccount) => {
      setGameName(fav.gameName);
      setTagLine(fav.tagLine);
      setRegion(fav.region);
      handleScout(fav.gameName, fav.tagLine);
  };

  const removeFavorite = (e: React.MouseEvent, fav: SavedAccount) => {
      e.stopPropagation();
      const newFavs = favorites.filter(f => f !== fav);
      setFavorites(newFavs);
      localStorage.setItem('favorites', JSON.stringify(newFavs));
  };

  const isCurrentFavorite = favorites.some(f => 
      f.gameName.toLowerCase() === gameName.toLowerCase() && 
      f.tagLine.toLowerCase() === tagLine.toLowerCase() &&
      f.region === region
  );

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (text && text.includes('#')) {
      e.preventDefault();
      const [name, ...rest] = text.split('#');
      const tag = rest.join('').trim();
      const nameTrimmed = name.trim();
      setGameName(nameTrimmed);
      setTagLine(tag);
      handleScout(nameTrimmed, tag);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleScout();
  };

  const handleParticipantClick = (champName: string) => {
      const exists = championList.find(c => c.detail.name === champName);
      if (exists) {
          setActiveTab('Details');
          setTimeout(() => {
              const el = document.getElementById(`champ-${exists.detail.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
      }
  };

  const handleRecentClick = async (r: RecentSearch) => {
      setGameName(r.gameName);
      setTagLine(r.tagLine);
      setRegion(r.region);

      if (r.snapshot) {
          setIsLiveGame(false);
          setGameStartTime(r.snapshot.gameStartTime);
          setParticipants(r.snapshot.participants);
          setActiveTab('Scout');
          setProgress(100);
          setActiveSearchTimestamp(r.timestamp);
          setCurrentNote(r.notes || '');

          setIsLoading(true);
          try {
              const newList = await loadChampionDetailsForList(r.snapshot.participants);
              setChampionList(newList);
          } catch(e) {
              console.error("Failed to load details from snapshot", e);
          } finally {
              setIsLoading(false);
          }
      } else {
          handleScout(r.gameName, r.tagLine);
      }
  };

  const simpleChampions = championList.map(c => c.detail);

  return (
    <div className={`min-h-screen transition-colors duration-500 ${getThemeClasses()} pb-10`}>
        
        {/* Sticky Header Wrapper */}
        <div className="sticky top-0 z-50 flex flex-col">
            <header className={`p-4 backdrop-blur-xl border-b shadow-sm transition-colors duration-500 ${isLightTheme ? 'bg-white/60 border-gray-200/50' : 'bg-black/20 border-white/5'}`}>
                <div className="max-w-4xl mx-auto flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-sm">
                            LoL Gameboard
                        </h1>
                        
                        <div className="flex items-center gap-3">
                             {gameStartTime !== null && (
                                 <div className={`flex items-center gap-2 px-2 py-1 rounded-md border shadow-sm ${
                                     isLiveGame
                                     ? (isLightTheme ? 'bg-white/80 border-red-100 text-red-600' : 'bg-black/40 border-red-500/20 text-red-400')
                                     : (isLightTheme ? 'bg-white/80 border-gray-200 text-gray-500' : 'bg-black/40 border-white/10 text-gray-400')
                                 }`}>
                                     <div className={`w-2 h-2 rounded-full ${
                                         isLiveGame 
                                         ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]' 
                                         : 'bg-gray-400'
                                     }`} />
                                     <span className="font-mono font-bold text-sm tracking-wider">{elapsedTime}</span>
                                 </div>
                             )}
                            <button 
                                onClick={() => setShowSettings(!showSettings)}
                                className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-blue-500/20 text-blue-500' : 'opacity-60 hover:opacity-100'}`}
                            >
                                <IconSettings />
                            </button>
                            <button onClick={() => setShowChangelog(true)} className="text-xs font-bold opacity-60 hover:opacity-100">
                                v{APP_VERSION}
                            </button>
                        </div>
                    </div>

                    {/* Settings Panel (Collapsible) */}
                    {showSettings && (
                        <div className={`p-3 rounded-xl border animate-fade-in ${isLightTheme ? 'bg-white/50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
                             <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center">
                                    <label className={`text-xs font-bold uppercase tracking-wider ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
                                        Global Ability Haste
                                    </label>
                                    <span className="text-xs font-mono font-bold text-blue-500">{globalHaste} AH</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="150" 
                                    value={globalHaste} 
                                    onChange={(e) => handleSetHaste(Number(e.target.value))}
                                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${isLightTheme ? 'bg-gray-200 accent-blue-500' : 'bg-gray-700 accent-blue-500'}`}
                                />
                                <div className="flex justify-between text-[9px] opacity-60 font-mono">
                                    <span>0</span>
                                    <span>≈ {(globalHaste / (100 + globalHaste) * 100).toFixed(0)}% CDR</span>
                                    <span>150</span>
                                </div>
                             </div>
                        </div>
                    )}

                    {/* Search Bar */}
                    <div className="flex gap-2 items-center">
                        <select 
                            value={region} onChange={e => setRegion(e.target.value)}
                            className={`w-18 text-xs font-bold rounded-lg px-1 py-2 outline-none border transition-colors ${
                                isLightTheme 
                                ? 'bg-white/80 border-gray-300 text-gray-800' 
                                : 'bg-black/20 border-white/10 text-white backdrop-blur-sm focus:bg-black/40'
                            }`}
                        >
                            <option value="NA">NA</option>
                            <option value="EUW">EUW</option>
                            <option value="KR">KR</option>
                        </select>
                        <input 
                            type="text" placeholder="Name" value={gameName} onChange={e => setGameName(e.target.value)}
                            onPaste={handlePaste}
                            onKeyDown={handleKeyDown}
                            className={`flex-1 min-w-0 text-xs font-bold rounded-lg px-3 py-2 outline-none border transition-colors ${
                                isLightTheme 
                                ? 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-400' 
                                : 'bg-black/20 border-white/10 text-white placeholder-white/30 backdrop-blur-sm focus:bg-black/40'
                            }`}
                        />
                        <input 
                            type="text" placeholder="#Tag" value={tagLine} onChange={e => setTagLine(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={`w-16 text-xs font-bold rounded-lg px-2 py-2 outline-none border transition-colors ${
                                isLightTheme 
                                ? 'bg-white/80 border-gray-300 text-gray-800 placeholder-gray-400' 
                                : 'bg-black/20 border-white/10 text-white placeholder-white/30 backdrop-blur-sm focus:bg-black/40'
                            }`}
                        />
                        
                        <button 
                            onClick={toggleFavorite}
                            className={`p-2 rounded-lg border transition-all ${
                                isCurrentFavorite 
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' 
                                : isLightTheme ? 'bg-white/80 border-gray-300 text-gray-400' : 'bg-black/20 border-white/10 text-gray-400'
                            }`}
                            title="Save Account"
                        >
                            <svg className="w-5 h-5" fill={isCurrentFavorite ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                        </button>

                        <button 
                            onClick={() => handleScout()} 
                            disabled={isLoading}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 py-2 font-bold shadow-lg disabled:opacity-50 transition-transform active:scale-95"
                        >
                            {isLoading ? '...' : <IconScout />}
                        </button>
                    </div>

                    {/* Favorites List */}
                    {favorites.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                            {favorites.map((fav, i) => (
                                <div 
                                    key={i}
                                    onClick={() => loadFavorite(fav)}
                                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border cursor-pointer transition-colors ${
                                        isLightTheme 
                                        ? 'bg-white border-gray-300 hover:bg-gray-100 text-gray-700 shadow-sm' 
                                        : 'bg-white/5 border-white/10 hover:bg-white/15 text-gray-300 backdrop-blur-md'
                                    }`}
                                >
                                    <span>{fav.gameName} <span className="opacity-50">#{fav.tagLine}</span></span>
                                    <span className={`text-[9px] uppercase px-1 rounded ${isLightTheme ? 'bg-gray-200' : 'bg-black/30'}`}>{fav.region}</span>
                                    <button 
                                        onClick={(e) => removeFavorite(e, fav)}
                                        className="ml-1 hover:text-red-400 p-0.5"
                                    >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {error && <div className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-2 rounded border border-red-500/20">{error}</div>}
                
                    {/* Theme Selector */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar border-t border-gray-500/10 pt-2">
                        {['Dark', 'Light', 'Shadow Isles', 'Bilgewater', 'Shurima', 'Ionia', 'Piltover', 'Winter Wonder', 'iOS 18 Glass'].map(t => (
                            <button 
                                key={t}
                                onClick={() => handleSetTheme(t as Theme)}
                                className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                    theme === t 
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-md transform scale-105' 
                                    : isLightTheme ? 'bg-white text-gray-600 border-gray-300' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10'
                                }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            {/* Tabs */}
            <div className={`backdrop-blur-xl border-b transition-colors duration-500 ${isLightTheme ? 'bg-white/70 border-gray-200/50' : 'bg-black/30 border-white/5'}`}>
                <div className="max-w-4xl mx-auto flex justify-around p-1">
                    {[
                        { id: 'Scout', icon: <IconScout />, label: 'Live' },
                        { id: 'Details', icon: <IconDetails />, label: 'Details' },
                        { id: 'Stats', icon: <IconStats />, label: 'Graphs' },
                        { id: 'Studio', icon: <IconStudio />, label: 'Studio' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all duration-300 ${
                                activeTab === tab.id 
                                ? 'text-blue-500 bg-blue-500/10 scale-105' 
                                : isLightTheme ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5'
                            }`}
                        >
                            {tab.icon}
                            <span className="text-[10px] font-bold uppercase">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Content */}
        <main className="max-w-4xl mx-auto p-4 min-h-[50vh]">
            {activeTab === 'Scout' && (
                <div className="space-y-6">
                    {/* Recent History Panel */}
                    {recentSearches.length > 0 && (
                         <div className={`rounded-xl border p-3 ${
                             isLightTheme ? 'bg-white/60 border-gray-200' : 'bg-white/5 border-white/5'
                         }`}>
                             <div className="flex justify-between items-center mb-2 px-1">
                                 <h3 className={`text-xs font-bold uppercase tracking-widest ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                     Recent History
                                 </h3>
                                 <button onClick={clearHistory} className="text-[10px] opacity-50 hover:opacity-100 hover:text-red-400 transition-colors">
                                     Clear
                                 </button>
                             </div>
                             <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                                 {recentSearches.map((r, i) => {
                                     const champ = RiotService.getChampionByKey(r.championId);
                                     const img = champ 
                                         ? `https://ddragon.leagueoflegends.com/cdn/${RiotService.getVersion()}/img/champion/${champ.image.full}`
                                         : null;
                                     
                                     // Highlight active search
                                     const isActive = r.timestamp === activeSearchTimestamp;

                                     return (
                                        <button 
                                            key={i}
                                            onClick={() => handleRecentClick(r)}
                                            className={`shrink-0 flex items-center gap-3 p-2 pr-4 rounded-lg border transition-all text-left min-w-[140px] relative overflow-hidden ${
                                                isActive
                                                ? (isLightTheme ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400' : 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500')
                                                : (isLightTheme ? 'bg-white hover:bg-gray-50 border-gray-200' : 'bg-black/20 hover:bg-white/10 border-white/10')
                                            }`}
                                        >
                                            {r.notes && (
                                                <div className="absolute top-0 right-0 w-3 h-3">
                                                    <div className="absolute top-0 right-0 border-t-[12px] border-r-[12px] border-t-transparent border-r-yellow-500"></div>
                                                </div>
                                            )}

                                            {img ? (
                                                <img src={img} className="w-8 h-8 rounded-full border border-gray-500/30" alt="" />
                                            ) : (
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${isLightTheme ? 'bg-gray-200 text-gray-500' : 'bg-white/10 text-gray-400'}`}>
                                                    {r.gameName[0]}
                                                </div>
                                            )}
                                            <div className="flex flex-col min-w-0">
                                                <span className={`text-xs font-bold truncate w-20 ${isLightTheme ? 'text-gray-800' : 'text-gray-200'}`}>
                                                    {r.gameName}
                                                </span>
                                                <span className={`text-[9px] ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {formatTimeAgo(r.timestamp)}
                                                </span>
                                            </div>
                                        </button>
                                     );
                                 })}
                             </div>
                         </div>
                    )}
                    
                    {/* Game Notes - Visible if active session exists */}
                    {activeSearchTimestamp && (
                        <div className={`rounded-xl border p-3 transition-colors ${
                            isLightTheme ? 'bg-yellow-50/50 border-yellow-200' : 'bg-yellow-900/10 border-yellow-500/20'
                        }`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLightTheme ? 'text-yellow-700' : 'text-yellow-500'}`}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                    Match Notes
                                </h3>
                                <span className={`text-[9px] uppercase ${isLightTheme ? 'text-yellow-600/60' : 'text-yellow-500/60'}`}>Auto-saves to History</span>
                            </div>
                            <textarea
                                value={currentNote}
                                onChange={(e) => updateActiveNote(e.target.value)}
                                placeholder="Add scouting notes, strategy reminders, or cooldown tracking..."
                                className={`w-full text-xs min-h-[60px] p-3 rounded-lg outline-none resize-y ${
                                    isLightTheme 
                                    ? 'bg-white text-gray-800 placeholder-gray-400 border border-yellow-200 focus:border-yellow-400' 
                                    : 'bg-black/30 text-gray-200 placeholder-white/20 border border-yellow-500/20 focus:border-yellow-500/50'
                                }`}
                            />
                        </div>
                    )}

                    {/* Live Game Players */}
                    <MultiSearchPanel 
                        participants={participants} 
                        progress={progress} 
                        onParticipantClick={handleParticipantClick}
                        theme={theme}
                        region={region}
                    />
                    
                    {/* High Priority Abilities */}
                    {simpleChampions.length > 0 && (
                        <div>
                            <h2 className={`text-sm font-bold uppercase mb-3 px-1 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}>High Priority Spells</h2>
                            <AbilitiesPanel champions={simpleChampions} globalHaste={globalHaste} theme={theme} />
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'Details' && (
                <ChampionDetailCard 
                    items={championList} 
                    globalHaste={globalHaste} 
                    theme={theme} 
                    onAddChampion={handleAddChampion}
                />
            )}

            {activeTab === 'Stats' && (
                <StatsPanel champions={simpleChampions} theme={theme} />
            )}

            {activeTab === 'Studio' && (
                <StudioPanel champions={simpleChampions} participants={participants} theme={theme} />
            )}
        </main>

        <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} accentColor="text-blue-400" theme={theme} />
    </div>
  );
};

export default App;
