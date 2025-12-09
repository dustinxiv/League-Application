
import React, { useState, useEffect, useCallback } from 'react';
import RiotService from './services/riotService';
import AbilitiesPanel from './components/AbilitiesPanel';
import ChampionDetailCard from './components/ChampionDetailCard';
import StatsPanel from './components/StatsPanel';
import MultiSearchPanel from './components/MultiSearchPanel';
import StudioPanel from './components/StudioPanel';
import ChangelogModal from './components/ChangelogModal';
import ConfirmationModal from './components/ConfirmationModal';
import { ChampionDetail, Theme, EnrichedParticipant, SavedGame } from './types';

// Icons
const IconScout = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const IconDetails = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5zM10 5a2 2 0 110-4 2 2 0 010 4z" /></svg>;
const IconStats = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const IconStudio = () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;

type Tab = 'Scout' | 'Details' | 'Stats' | 'Studio';

const APP_VERSION = '1.2';

const App: React.FC = () => {
  const [theme, setTheme] = useState<Theme>('Dark');
  const [activeTab, setActiveTab] = useState<Tab>('Scout');
  const [showChangelog, setShowChangelog] = useState(false);
  
  // Search State
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [region, setRegion] = useState('NA');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Data State
  const [participants, setParticipants] = useState<EnrichedParticipant[]>([]);
  const [champions, setChampions] = useState<ChampionDetail[]>([]);
  const [progress, setProgress] = useState(0);

  // Init
  useEffect(() => {
    RiotService.init();
    const savedTheme = localStorage.getItem('theme') as Theme;
    if (savedTheme) setTheme(savedTheme);

    const lastVersion = localStorage.getItem('app_version');
    if (lastVersion !== APP_VERSION) {
        setShowChangelog(true);
        localStorage.setItem('app_version', APP_VERSION);
    }
  }, []);

  // Theme Logic
  const handleSetTheme = (t: Theme) => {
      setTheme(t);
      localStorage.setItem('theme', t);
  };

  const getThemeClasses = () => {
      switch (theme) {
          case 'Light': return 'bg-gray-100 text-gray-900';
          case 'Piltover': return 'bg-[#f0e6d2] text-[#1a3c5a]';
          case 'Winter Wonder': return 'bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-100 text-slate-800'; // Light Mode
          case 'iOS 18 Glass': return 'bg-black text-white';
          default: return 'bg-gray-950 text-gray-100';
      }
  };

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder';

  // Apply body background
  useEffect(() => {
    document.body.className = getThemeClasses().split(' ')[0]; // Apply bg to body for overscroll
  }, [theme]);

  // Scouting Logic
  const handleScout = async () => {
      if (!gameName || !tagLine) {
          setError('Please enter Name and Tag');
          return;
      }
      setIsLoading(true);
      setError('');
      setProgress(10);
      setParticipants([]);
      setChampions([]);

      try {
          const account = await RiotService.getAccount(gameName, tagLine, region, ''); // API Key handled in Service
          setProgress(30);
          
          const liveGame = await RiotService.getLiveGame(account.puuid, region, '');
          if (!liveGame) {
              throw new Error('Player is not in a live game.');
          }
          setProgress(50);

          // Enrich Participants
          const enrichedParts: EnrichedParticipant[] = liveGame.participants.map(p => ({...p, isLoaded: false}));
          setParticipants(enrichedParts);
          setActiveTab('Scout');

          // Fetch Details in Background
          let loadedCount = 0;
          const details: ChampionDetail[] = [];
          
          // Parallel fetch for champ details
          const detailPromises = liveGame.participants.map(async (p) => {
             const champSimple = RiotService.getChampionByKey(p.championId);
             if (champSimple) {
                 const detail = await RiotService.getChampionDetail(champSimple.id);
                 if (detail) details.push(detail);
             }
          });
          
          await Promise.all(detailPromises);
          setChampions(details);
          setProgress(70);

          // Fetch Ranks & Mastery (Slowly update UI)
          const rankPromises = enrichedParts.map(async (p, idx) => {
              const [ranks, mastery] = await Promise.all([
                  RiotService.getLeagueEntries(p.summonerId, p.puuid, region, ''),
                  RiotService.getTopMastery(p.puuid, region, '')
              ]);
              
              const soloRank = ranks.find(r => r.queueType === 'RANKED_SOLO_5x5');
              
              setParticipants(prev => {
                  const next = [...prev];
                  next[idx] = {
                      ...next[idx],
                      rankSolo: soloRank,
                      mastery: mastery,
                      isLoaded: true,
                      championName: RiotService.getChampionByKey(p.championId)?.name
                  };
                  return next;
              });
              loadedCount++;
              setProgress(70 + Math.floor((loadedCount / enrichedParts.length) * 30));
          });

          await Promise.all(rankPromises);
          setProgress(100);

      } catch (e: any) {
          setError(e.message || 'Scouting Failed');
          setProgress(0);
      } finally {
          setIsLoading(false);
      }
  };

  const handleParticipantClick = (champName: string) => {
      // Find champ
      const exists = champions.find(c => c.name === champName);
      if (exists) {
          setActiveTab('Details');
          // Scroll to element after render
          setTimeout(() => {
              const el = document.getElementById(`champ-${exists.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
      }
  };

  return (
    <div className={`min-h-screen transition-colors duration-500 ${getThemeClasses()} pb-10`}>
        {/* Header */}
        <header className={`p-4 sticky top-0 z-50 backdrop-blur-md border-b shadow-sm ${isLightTheme ? 'bg-white/70 border-gray-200' : 'bg-black/40 border-white/10'}`}>
            <div className="max-w-4xl mx-auto flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-xl font-black tracking-tighter uppercase italic bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                        LoL Gameboard
                    </h1>
                    <button onClick={() => setShowChangelog(true)} className="text-xs font-bold opacity-60 hover:opacity-100">
                        v{APP_VERSION}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="flex gap-2">
                    <select 
                        value={region} onChange={e => setRegion(e.target.value)}
                        className={`w-20 text-xs font-bold rounded-lg px-2 outline-none border ${isLightTheme ? 'bg-white border-gray-300 text-gray-800' : 'bg-gray-800 border-gray-700 text-white'}`}
                    >
                        <option value="NA">NA</option>
                        <option value="EUW">EUW</option>
                        <option value="KR">KR</option>
                    </select>
                    <input 
                        type="text" placeholder="Game Name" value={gameName} onChange={e => setGameName(e.target.value)}
                        className={`flex-1 text-xs font-bold rounded-lg px-3 py-2 outline-none border ${isLightTheme ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400' : 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'}`}
                    />
                     <input 
                        type="text" placeholder="#Tag" value={tagLine} onChange={e => setTagLine(e.target.value)}
                        className={`w-20 text-xs font-bold rounded-lg px-3 py-2 outline-none border ${isLightTheme ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400' : 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'}`}
                    />
                    <button 
                        onClick={handleScout} 
                        disabled={isLoading}
                        className="bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-4 font-bold shadow-lg disabled:opacity-50"
                    >
                        {isLoading ? '...' : <IconScout />}
                    </button>
                </div>

                {error && <div className="text-red-500 text-xs font-bold text-center bg-red-500/10 p-2 rounded">{error}</div>}
            
                {/* Theme Selector */}
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {['Dark', 'Light', 'Winter Wonder', 'Piltover', 'iOS 18 Glass'].map(t => (
                        <button 
                            key={t}
                            onClick={() => handleSetTheme(t as Theme)}
                            className={`whitespace-nowrap px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                                theme === t 
                                ? 'bg-blue-500 text-white border-blue-500' 
                                : isLightTheme ? 'bg-white text-gray-600 border-gray-300' : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>
        </header>

        {/* Tabs */}
        <div className={`sticky top-[148px] z-40 backdrop-blur-md border-b ${isLightTheme ? 'bg-white/80 border-gray-200' : 'bg-black/60 border-white/5'}`}>
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
                        className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
                            activeTab === tab.id 
                            ? 'text-blue-500 bg-blue-500/10' 
                            : isLightTheme ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-500 hover:bg-white/5'
                        }`}
                    >
                        {tab.icon}
                        <span className="text-[10px] font-bold uppercase">{tab.label}</span>
                    </button>
                ))}
            </div>
        </div>

        {/* Content */}
        <main className="max-w-4xl mx-auto p-4 min-h-[50vh]">
            {activeTab === 'Scout' && (
                <div className="space-y-6">
                    {/* Live Game Players */}
                    <MultiSearchPanel 
                        participants={participants} 
                        progress={progress} 
                        onParticipantClick={handleParticipantClick}
                        theme={theme}
                    />
                    
                    {/* High Priority Abilities */}
                    {champions.length > 0 && (
                        <div>
                            <h2 className={`text-sm font-bold uppercase mb-3 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}>High Priority Spells</h2>
                            <AbilitiesPanel champions={champions} globalHaste={0} theme={theme} />
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'Details' && (
                <div>
                     {/* Quick Nav */}
                     {champions.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                            {champions.map(c => (
                                <button 
                                    key={c.id} 
                                    onClick={() => {
                                        const el = document.getElementById(`champ-${c.id}`);
                                        if(el) el.scrollIntoView({behavior: 'smooth'});
                                    }}
                                    className="shrink-0 relative"
                                >
                                    <img src={`https://ddragon.leagueoflegends.com/cdn/${c.version}/img/champion/${c.image.full}`} className="w-10 h-10 rounded-full border-2 border-transparent hover:border-blue-500 transition-colors" />
                                </button>
                            ))}
                        </div>
                     )}

                     {champions.length > 0 ? champions.map(c => (
                        <ChampionDetailCard key={c.id} champion={c} globalHaste={0} id={`champ-${c.id}`} theme={theme} />
                     )) : (
                        <div className={`text-center py-20 ${isLightTheme ? 'text-gray-400' : 'text-gray-600'}`}>No champions loaded</div>
                     )}
                </div>
            )}

            {activeTab === 'Stats' && (
                <StatsPanel champions={champions} theme={theme} />
            )}

            {activeTab === 'Studio' && (
                <StudioPanel champions={champions} participants={participants} theme={theme} />
            )}
        </main>

        <ChangelogModal isOpen={showChangelog} onClose={() => setShowChangelog(false)} accentColor="text-blue-400" />
    </div>
  );
};

export default App;
