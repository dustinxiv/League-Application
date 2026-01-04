
import React, { useEffect, useState } from 'react';
import RiotService from '../services/riotService';
import { Theme, MatchV5DTO, MatchParticipantV5, RecentSearch } from '../types';

interface MatchHistoryPanelProps {
  puuid: string | null;
  region: string;
  theme: Theme;
  history: RecentSearch[];
  onLoadMatch: (matchId: string, info: MatchV5DTO) => void;
  onSaveMatch: (matchId: string, info: MatchV5DTO, note?: string) => void;
}

type FilterType = 'All' | 'Ranked Solo' | 'Ranked Flex' | 'ARAM' | 'Swiftplay' | 'Custom';
type DetailTab = 'Overview' | 'Team analysis' | 'Build' | 'Etc.';

const MatchHistoryPanel: React.FC<MatchHistoryPanelProps> = ({ puuid, region, theme, history, onLoadMatch, onSaveMatch }) => {
  const [matches, setMatches] = useState<MatchV5DTO[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('Overview');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';
  const version = RiotService.getVersion();

  useEffect(() => {
    if (!puuid) return;

    const fetchMatches = async () => {
      setIsLoading(true);
      setError('');
      setMatches([]);
      setOffset(0);
      setHasMore(true);
      try {
        const ids = await RiotService.getMatchIds(puuid, region, '', 0, 10);
        if (ids.length < 10) setHasMore(false);
        if (ids.length === 0) {
            setError('No recent matches found.');
            return;
        }

        const detailsPromises = ids.map(id => RiotService.getMatchDetail(id, region, ''));
        const results = await Promise.all(detailsPromises);
        setMatches(results.filter((m): m is MatchV5DTO => m !== null));
        setOffset(10);
        
      } catch (e) {
        setError('Failed to load match history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchMatches();
  }, [puuid, region]);

  const handleLoadMore = async () => {
      if (isLoading || !hasMore) return;
      setIsLoading(true);
      try {
          const ids = await RiotService.getMatchIds(puuid, region, '', offset, 10);
          if (ids.length === 0) {
              setHasMore(false);
              setIsLoading(false);
              return;
          }
          if (ids.length < 10) setHasMore(false);

          const detailsPromises = ids.map(id => RiotService.getMatchDetail(id, region, ''));
          const results = await Promise.all(detailsPromises);
          const newMatches = results.filter((m): m is MatchV5DTO => m !== null);
          
          setMatches(prev => [...prev, ...newMatches]);
          setOffset(prev => prev + 10);
      } catch (e) {
          // Silent fail for load more, just stop loading state
      } finally {
          setIsLoading(false);
      }
  };

  const getQueueType = (queueId: number, gameMode: string): FilterType | 'Other' => {
      if (queueId === 420) return 'Ranked Solo';
      if (queueId === 440) return 'Ranked Flex';
      if (queueId === 450 || queueId === 100) return 'ARAM';
      if (queueId === 0) return 'Custom';
      if (gameMode === 'SWIFTPLAY' || queueId === 490 || queueId === 1900) return 'Swiftplay';
      return 'Other';
  };

  const filteredMatches = matches.filter(m => {
      // 1. Filter by Queue Type
      let typeMatch = true;
      if (filter !== 'All') {
          const type = getQueueType(m.info.queueId, m.info.gameMode);
          typeMatch = type === filter;
      }

      // 2. Filter by Search Query (Player Name or Champion)
      let searchMatch = true;
      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          searchMatch = m.info.participants.some(p => {
              const name = (p.riotIdGameName || '').toLowerCase();
              const tag = (p.riotIdTagline || '').toLowerCase();
              const summoner = (p.summonerId || '').toLowerCase();
              const champ = (p.championName || '').toLowerCase();
              const fullRiot = `${name}#${tag}`;
              
              return name.includes(q) || 
                     fullRiot.includes(q) ||
                     summoner.includes(q) || 
                     champ.includes(q);
          });
      }

      return typeMatch && searchMatch;
  });

  if (!puuid) {
      return (
          <div className={`text-center py-20 ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}>
              Search for a player to view match history.
          </div>
      );
  }

  const ItemIcon: React.FC<{ itemId: number, size?: string }> = ({ itemId, size = "w-6 h-6" }) => {
      if (itemId === 0) return <div className={`${size} rounded ${isLightTheme ? 'bg-gray-200' : 'bg-white/10'}`} />;
      return (
          <img 
            src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/item/${itemId}.png`} 
            className={`${size} rounded border border-gray-600/50`} 
            alt={`Item ${itemId}`}
          />
      );
  };

  const SummonerList: React.FC<{ participants: MatchParticipantV5[] }> = ({ participants }) => {
      const blueTeam = participants.filter(p => p.teamId === 100);
      const redTeam = participants.filter(p => p.teamId === 200);

      const PlayerRow: React.FC<{ p: MatchParticipantV5 }> = ({ p }) => {
          const c = RiotService.getChampionByKey(p.championId);
          const name = p.riotIdGameName || p.summonerId;
          const isSearched = searchQuery && (name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.championName || '').toLowerCase().includes(searchQuery.toLowerCase()));

          return (
             <div className={`flex items-center gap-1 w-24 sm:w-28 truncate transition-opacity ${searchQuery && !isSearched ? 'opacity-30' : 'opacity-100'}`}>
                 <img 
                    src={c ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}` : ''} 
                    className="w-3.5 h-3.5 rounded-sm border border-gray-600"
                    alt={c?.name}
                 />
                 <span className={`text-[9px] truncate ${p.puuid === puuid ? 'font-bold text-yellow-500' : (isLightTheme ? 'text-gray-600' : 'text-gray-400')} ${isSearched ? 'text-blue-500 font-bold' : ''}`}>
                     {name}
                 </span>
             </div>
          );
      };

      return (
          <div className="flex gap-2 text-[9px]">
              <div className="flex flex-col gap-0.5">
                  {blueTeam.map(p => <PlayerRow key={p.puuid} p={p} />)}
              </div>
              <div className="flex flex-col gap-0.5">
                  {redTeam.map(p => <PlayerRow key={p.puuid} p={p} />)}
              </div>
          </div>
      );
  };

  // --- Internal Components for Extended View ---

  const OverviewTab: React.FC<{ match: MatchV5DTO }> = ({ match }) => {
    const maxDmg = Math.max(...match.info.participants.map(p => p.totalDamageDealtToChampions));
    
    const TeamTable: React.FC<{ teamId: number, name: string }> = ({ teamId, name }) => {
        const teamParticipants = match.info.participants.filter(p => p.teamId === teamId);
        const win = teamParticipants[0].win;
        const totalKills = teamParticipants.reduce((acc, p) => acc + p.kills, 0);
        const totalGold = teamParticipants.reduce((acc, p) => acc + p.goldEarned, 0);

        return (
            <div className="mb-4">
                <div className={`flex justify-between items-center px-2 py-1 border-b text-xs font-bold ${
                    win ? 'text-blue-500 border-blue-500/30' : 'text-red-500 border-red-500/30'
                }`}>
                    <span>{win ? 'Victory' : 'Defeat'} <span className={`text-[10px] ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>({name})</span></span>
                    <div className="flex gap-4 text-[10px]">
                         <span>Total Kills: {totalKills}</span>
                         <span>Total Gold: {totalGold.toLocaleString()}</span>
                    </div>
                </div>
                <div className="w-full overflow-x-auto">
                    <table className={`w-full text-left text-[10px] whitespace-nowrap ${isLightTheme ? 'text-gray-700' : 'text-gray-300'}`}>
                        <thead className={`opacity-60 ${isLightTheme ? 'bg-gray-100' : 'bg-white/5'}`}>
                            <tr>
                                <th className="p-2">Champion</th>
                                <th className="p-2">KDA</th>
                                <th className="p-2">Damage</th>
                                <th className="p-2">Wards</th>
                                <th className="p-2">CS</th>
                                <th className="p-2">Items</th>
                            </tr>
                        </thead>
                        <tbody>
                            {teamParticipants.map(p => {
                                const c = RiotService.getChampionByKey(p.championId);
                                const img = c ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}` : '';
                                const kda = ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);
                                const dmgPct = Math.round((p.totalDamageDealtToChampions / maxDmg) * 100);
                                const csPerMin = (p.totalMinionsKilled + p.neutralMinionsKilled) / (match.info.gameDuration / 60);
                                const spell1 = RiotService.getSummonerSpellIcon(p.summoner1Id);
                                const spell2 = RiotService.getSummonerSpellIcon(p.summoner2Id);
                                const keystone = RiotService.getRuneIcon(p.perks.styles[0]?.selections[0]?.perk);
                                const subStyle = RiotService.getRuneIcon(p.perks.styles[1]?.style);
                                
                                const pName = p.riotIdGameName || p.summonerId;
                                const isSearched = searchQuery && (pName.toLowerCase().includes(searchQuery.toLowerCase()) || (p.championName || '').toLowerCase().includes(searchQuery.toLowerCase()));

                                return (
                                    <tr key={p.puuid} className={`border-b ${isLightTheme ? 'border-gray-100' : 'border-white/5'} ${p.puuid === puuid ? (isLightTheme ? 'bg-yellow-50' : 'bg-yellow-900/10') : ''} ${isSearched ? (isLightTheme ? 'bg-blue-50' : 'bg-blue-900/20') : ''}`}>
                                        <td className="p-2 flex items-center gap-2">
                                            <div className="relative">
                                                <img src={img} className="w-8 h-8 rounded-full" />
                                                <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[8px] w-4 h-4 flex items-center justify-center rounded-full">{p.champLevel}</div>
                                            </div>
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex gap-0.5">
                                                    {spell1 && <img src={spell1} className="w-3.5 h-3.5 rounded" />}
                                                    {spell2 && <img src={spell2} className="w-3.5 h-3.5 rounded" />}
                                                </div>
                                                <div className="flex gap-0.5">
                                                    {keystone && <img src={keystone} className="w-3.5 h-3.5 bg-black rounded-full" />}
                                                    {subStyle && <img src={subStyle} className="w-3.5 h-3.5 bg-gray-700 rounded-full" />}
                                                </div>
                                            </div>
                                            <div className="flex flex-col ml-1">
                                                <span className={`font-bold ${p.puuid === puuid ? 'text-yellow-600' : ''} ${isSearched ? 'text-blue-500' : ''}`}>{p.riotIdGameName || p.summonerId}</span>
                                                <span className="opacity-50 text-[9px]">{c?.name}</span>
                                            </div>
                                        </td>
                                        <td className="p-2">
                                            <div className="font-bold">{p.kills}/{p.deaths}/{p.assists}</div>
                                            <div className="opacity-60">{kda}:1</div>
                                        </td>
                                        <td className="p-2 w-24">
                                            <div className="text-[9px] mb-0.5">{p.totalDamageDealtToChampions.toLocaleString()}</div>
                                            <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-red-500" style={{ width: `${dmgPct}%` }} />
                                            </div>
                                        </td>
                                        <td className="p-2 text-[9px]">
                                            <div title="Control Wards" className="text-pink-400">{p.visionWardsBoughtInGame}</div>
                                            <div title="Placed / Killed" className="opacity-60">{p.wardsPlaced} / {p.wardsKilled}</div>
                                        </td>
                                        <td className="p-2 text-[9px]">
                                            <div className="font-bold">{p.totalMinionsKilled + p.neutralMinionsKilled}</div>
                                            <div className="opacity-60">{csPerMin.toFixed(1)}/m</div>
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-0.5">
                                                {[p.item0, p.item1, p.item2, p.item3, p.item4, p.item5].map((it, i) => (
                                                    <ItemIcon key={i} itemId={it} size="w-5 h-5" />
                                                ))}
                                                <ItemIcon itemId={p.item6} size="w-5 h-5" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fade-in">
             <TeamTable teamId={100} name="Blue Team" />
             <TeamTable teamId={200} name="Red Team" />
        </div>
    );
  };

  const TeamAnalysisTab: React.FC<{ match: MatchV5DTO }> = ({ match }) => {
     const blue = match.info.participants.filter(p => p.teamId === 100);
     const red = match.info.participants.filter(p => p.teamId === 200);

     const calculateTotal = (arr: MatchParticipantV5[], key: keyof MatchParticipantV5) => arr.reduce((acc, p) => acc + (p[key] as number), 0);
     
     const blueKills = calculateTotal(blue, 'kills');
     const redKills = calculateTotal(red, 'kills');
     
     const blueGold = calculateTotal(blue, 'goldEarned');
     const redGold = calculateTotal(red, 'goldEarned');
     
     const blueDmg = calculateTotal(blue, 'totalDamageDealtToChampions');
     const redDmg = calculateTotal(red, 'totalDamageDealtToChampions');

     const ComparisonBar: React.FC<{ label: string, blueVal: number, redVal: number, color: string }> = ({ label, blueVal, redVal, color }) => {
         const total = blueVal + redVal;
         const bluePct = total > 0 ? (blueVal / total) * 100 : 50;
         return (
             <div className="mb-4">
                 <div className="flex justify-between text-[10px] font-bold mb-1 opacity-80">
                     <span>{blueVal.toLocaleString()}</span>
                     <span className="uppercase">{label}</span>
                     <span>{redVal.toLocaleString()}</span>
                 </div>
                 <div className={`w-full h-3 rounded-full flex overflow-hidden ${isLightTheme ? 'bg-gray-200' : 'bg-gray-800'}`}>
                     <div style={{ width: `${bluePct}%` }} className={`h-full bg-blue-500`} />
                     <div className="flex-1 h-full bg-red-500" />
                 </div>
             </div>
         );
     };

     return (
         <div className={`p-4 rounded border ${isLightTheme ? 'bg-white border-gray-200' : 'bg-black/20 border-white/5'}`}>
             <h4 className="text-center text-xs font-bold uppercase mb-4 opacity-70">Team Comparison</h4>
             <ComparisonBar label="Total Kills" blueVal={blueKills} redVal={redKills} color="blue" />
             <ComparisonBar label="Total Gold" blueVal={blueGold} redVal={redGold} color="yellow" />
             <ComparisonBar label="Total Damage" blueVal={blueDmg} redVal={redDmg} color="red" />
             <div className="text-center text-[10px] opacity-50 mt-4 italic">More stats coming soon...</div>
         </div>
     );
  };

  const BuildTab: React.FC<{ match: MatchV5DTO }> = ({ match }) => {
      // Show builds for the SEARCHED player (puuid)
      const p = match.info.participants.find(part => part.puuid === puuid);
      if (!p) return <div>Player not found in match.</div>;

      const perkPrimary = p.perks.styles.find(s => s.description === 'primaryStyle');
      const perkSub = p.perks.styles.find(s => s.description === 'subStyle');
      const shards = p.perks.styles.find(s => s.description === 'defense'); // Usually shards are implicit in API structure now? Actually style stats are mod 3

      return (
          <div className="p-4 space-y-4">
              <div className={`p-3 rounded border ${isLightTheme ? 'bg-white border-gray-200' : 'bg-black/20 border-white/5'}`}>
                  <h4 className="text-xs font-bold uppercase mb-3 opacity-70">Runes Reforged</h4>
                  <div className="flex gap-8 justify-center">
                      {/* Primary Tree */}
                      <div className="flex flex-col items-center gap-2">
                           {perkPrimary?.selections.map((rune, i) => (
                               <img 
                                key={i} 
                                src={RiotService.getRuneIcon(rune.perk)} 
                                className={`rounded-full bg-black border border-gray-600 ${i === 0 ? 'w-10 h-10 mb-2' : 'w-8 h-8'}`} 
                                title={`Rune ID: ${rune.perk}`}
                               />
                           ))}
                      </div>
                      <div className="w-px bg-gray-500/20" />
                      {/* Secondary Tree */}
                      <div className="flex flex-col items-center gap-2 pt-12">
                           {perkSub?.selections.map((rune, i) => (
                               <img 
                                key={i} 
                                src={RiotService.getRuneIcon(rune.perk)} 
                                className="w-6 h-6 rounded-full bg-black border border-gray-600 grayscale opacity-80" 
                               />
                           ))}
                      </div>
                  </div>
              </div>
              <div className="text-center text-[10px] opacity-50 italic">
                  Timeline and Skill Order require additional data fetches.
              </div>
          </div>
      );
  };

  // --- Main Render ---

  return (
    <div className="pb-20">
      {/* Sticky Header with Search and Filters */}
      <div className={`sticky top-0 z-10 p-3 border-b mb-3 backdrop-blur-md rounded-xl shadow-sm transition-colors ${isLightTheme ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/5'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-3">
            <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                Matches ({filteredMatches.length})
            </h3>
            <div className="relative w-full sm:w-64">
                <input 
                    type="text" 
                    placeholder="Search player, champion..." 
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full text-xs rounded-lg pl-8 pr-3 py-2 outline-none border transition-colors ${
                        isLightTheme 
                        ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-black/20 border-white/10 text-white placeholder-white/30 focus:border-blue-500/50'
                    }`}
                />
                <svg className="w-3 h-3 absolute left-3 top-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {(['All', 'Ranked Solo', 'Ranked Flex', 'ARAM', 'Swiftplay', 'Custom'] as FilterType[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide whitespace-nowrap transition-colors border ${
                        filter === f 
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm' 
                        : isLightTheme ? 'bg-white text-gray-500 border-gray-200' : 'bg-white/5 text-gray-400 border-white/10'
                    }`}
                  >
                      {f}
                  </button>
              ))}
          </div>
      </div>

      {isLoading && matches.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
               <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
      )}

      {error && <div className="text-center py-20 text-red-400 font-bold">{error}</div>}

      <div className="space-y-2">
          {filteredMatches.map((match) => {
              const participant = match.info.participants.find(p => p.puuid === puuid);
              if (!participant) return null;

              const isWin = participant.win;
              const isExpanded = expandedMatchId === match.metadata.matchId;
              const champ = RiotService.getChampionByKey(participant.championId);
              const img = champ ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champ.image.full}` : null;
              
              const now = Date.now();
              const gameEnd = match.info.gameEndTimestamp || (match.info.gameStartTimestamp + match.info.gameDuration * 1000);
              const timeAgo = Math.floor((now - gameEnd) / (1000 * 60 * 60)); // hours
              const daysAgo = Math.floor(timeAgo / 24);
              
              let timeDisplay = '';
              if (daysAgo > 0) timeDisplay = `${daysAgo} day${daysAgo > 1 ? 's' : ''} ago`;
              else if (timeAgo > 0) timeDisplay = `${timeAgo} hour${timeAgo > 1 ? 's' : ''} ago`;
              else timeDisplay = 'Just now';

              const durationM = Math.floor(match.info.gameDuration / 60);
              const durationS = match.info.gameDuration % 60;
              
              const primaryStyle = participant.perks.styles.find(s => s.description === 'primaryStyle');
              const subStyle = participant.perks.styles.find(s => s.description === 'subStyle');
              const keystoneIcon = RiotService.getRuneIcon(primaryStyle?.selections[0]?.perk);
              const subStyleIcon = RiotService.getRuneIcon(subStyle?.style);

              const kda = ((participant.kills + participant.assists) / Math.max(1, participant.deaths)).toFixed(2);
              const teamKills = match.info.participants.filter(p => p.teamId === participant.teamId).reduce((acc, p) => acc + p.kills, 0);
              const pKill = teamKills > 0 ? Math.round(((participant.kills + participant.assists) / teamKills) * 100) : 0;
              const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;
              const csPerMin = (cs / (match.info.gameDuration / 60)).toFixed(1);

              let badge = null;
              let badgeColor = 'bg-gray-500';
              if (participant.pentaKills > 0) { badge = 'Penta Kill'; badgeColor = 'bg-red-600 text-white'; }
              else if (participant.quadraKills > 0) { badge = 'Quadra Kill'; badgeColor = 'bg-red-500 text-white'; }
              else if (participant.tripleKills > 0) { badge = 'Triple Kill'; badgeColor = 'bg-orange-500 text-white'; }
              else if (participant.doubleKills > 0) { badge = 'Double Kill'; badgeColor = 'bg-blue-500 text-white'; }

              const queueName = getQueueType(match.info.queueId, match.info.gameMode);

              return (
                  <div key={match.metadata.matchId} className="flex flex-col">
                    <div 
                        className={`relative rounded-t-lg ${!isExpanded ? 'rounded-b-lg' : ''} border flex overflow-hidden transition-all ${
                            isWin 
                            ? (isLightTheme ? 'bg-blue-50/80 border-blue-200' : 'bg-blue-900/10 border-blue-500/20') 
                            : (isLightTheme ? 'bg-red-50/80 border-red-200' : 'bg-red-900/10 border-red-500/20')
                        }`}
                    >
                        {/* Left Stripe */}
                        <div className={`w-1.5 shrink-0 ${isWin ? 'bg-blue-500' : 'bg-red-500'}`} />

                        {/* Main Content Grid */}
                        <div className="flex-1 p-2 sm:p-3 flex flex-col sm:flex-row gap-3 items-center sm:items-start">
                            
                            {/* Col 1: Game Info (Type, Result, Time) */}
                            <div className="w-full sm:w-24 shrink-0 flex flex-row sm:flex-col justify-between sm:justify-center gap-1 text-[10px] sm:text-xs">
                                <div className={`font-bold ${isWin ? 'text-blue-500' : 'text-red-500'}`}>
                                    {queueName}
                                </div>
                                <div className={`font-black ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {timeDisplay}
                                </div>
                                <div className="sm:border-t sm:border-gray-500/20 sm:my-1 sm:pt-1">
                                    <div className={`font-black uppercase ${isWin ? 'text-blue-600' : 'text-red-600'}`}>
                                        {isWin ? 'Victory' : 'Defeat'}
                                    </div>
                                    <div className={`font-mono ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {durationM}m {durationS}s
                                    </div>
                                </div>
                            </div>

                            {/* Col 2: Champ & Runes */}
                            <div className="flex items-center gap-2 shrink-0">
                                    <div className="relative">
                                        <img 
                                            src={img || ''} 
                                            className="w-12 h-12 rounded-full border border-gray-500/30" 
                                        />
                                        <div className="absolute -bottom-1 -right-1 bg-gray-800 text-white text-[9px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-gray-600">
                                            {participant.champLevel}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        {keystoneIcon && <img src={keystoneIcon} className="w-6 h-6 bg-black rounded-full p-0.5" />}
                                        {subStyleIcon && <img src={subStyleIcon} className="w-4 h-4 bg-gray-700 rounded-full p-0.5 opacity-80" />}
                                    </div>
                            </div>

                            {/* Col 3: KDA & Stats */}
                            <div className="flex flex-col items-center sm:items-start justify-center min-w-[80px]">
                                <div className={`text-sm font-black tracking-wide ${isLightTheme ? 'text-gray-800' : 'text-gray-100'}`}>
                                    {participant.kills} <span className="text-gray-500">/</span> <span className="text-red-500">{participant.deaths}</span> <span className="text-gray-500">/</span> {participant.assists}
                                </div>
                                <div className={`text-[10px] font-bold ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {kda}:1 KDA
                                </div>
                                <div className={`text-[9px] mt-1 ${isLightTheme ? 'text-red-600' : 'text-red-400'}`}>
                                    P/Kill {pKill}%
                                </div>
                            </div>

                            {/* Col 4: Items & CS */}
                            <div className="flex flex-col gap-2 shrink-0">
                                <div className="flex gap-0.5">
                                    {[participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5].map((id, i) => (
                                        <ItemIcon key={i} itemId={id} />
                                    ))}
                                    <div className="ml-1">
                                        <ItemIcon itemId={participant.item6} />
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2">
                                    {badge ? (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${badgeColor}`}>
                                            {badge}
                                        </span>
                                    ) : (
                                        <span className="h-4"></span>
                                    )}
                                    <div className={`text-[10px] ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                        CS {cs} ({csPerMin})
                                    </div>
                                </div>
                            </div>

                            {/* Col 5: Summoner Lists (Hidden on very small screens, shown on md+) */}
                            <div className="hidden md:flex flex-1 justify-end">
                                <SummonerList participants={match.info.participants} />
                            </div>
                            
                            {/* Mobile Actions */}
                            <div className="flex sm:hidden w-full gap-2 mt-2">
                                <button 
                                    onClick={() => setExpandedMatchId(isExpanded ? null : match.metadata.matchId)}
                                    className={`flex-1 py-1.5 rounded text-xs font-bold border ${isLightTheme ? 'bg-white border-gray-300 text-gray-700' : 'bg-white/10 border-white/10 text-white'}`}
                                >
                                    {isExpanded ? 'Close' : 'Details'}
                                </button>
                                <button 
                                    onClick={() => onLoadMatch(match.metadata.matchId, match)}
                                    className={`px-3 py-1.5 rounded border font-bold text-xs ${isLightTheme ? 'bg-purple-50 text-purple-600 border-purple-200' : 'bg-purple-900/20 text-purple-400 border-purple-500/30'}`}
                                >
                                    Analyze
                                </button>
                                <button 
                                    onClick={() => onSaveMatch(match.metadata.matchId, match, notes[match.metadata.matchId])}
                                    className="px-3 py-1.5 rounded border border-gray-500 text-gray-500"
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Desktop Actions (Right Side Hover) */}
                        <div className={`hidden sm:flex w-10 shrink-0 flex-col items-center justify-center gap-2 border-l ${isLightTheme ? 'border-gray-200 bg-gray-50' : 'border-white/5 bg-black/20'}`}>
                            <button 
                                onClick={() => onLoadMatch(match.metadata.matchId, match)}
                                className={`p-1.5 rounded transition-colors ${isLightTheme ? 'hover:bg-purple-100 text-purple-500' : 'hover:bg-purple-900/30 text-purple-400'}`}
                                title="Analyze Match (Load into Details)"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                            </button>
                            <button 
                                onClick={() => setExpandedMatchId(isExpanded ? null : match.metadata.matchId)}
                                className={`p-1.5 rounded transition-colors ${isExpanded ? (isLightTheme ? 'bg-blue-100 text-blue-600' : 'bg-blue-900/50 text-blue-400') : (isLightTheme ? 'hover:bg-gray-100 text-gray-400' : 'hover:bg-white/10 text-gray-500')}`}
                                title={isExpanded ? "Collapse" : "Expand"}
                            >
                                <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* EXPANDED CONTENT */}
                    {isExpanded && (
                        <div className={`border-x border-b rounded-b-lg overflow-hidden animate-fade-in ${isLightTheme ? 'bg-white border-gray-200' : 'bg-black/30 border-white/5'}`}>
                            {/* Tabs */}
                            <div className={`flex border-b ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
                                {(['Overview', 'Team analysis', 'Build', 'Etc.'] as DetailTab[]).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                                            activeTab === tab 
                                            ? (isLightTheme ? 'bg-white text-blue-600 border-t-2 border-t-blue-500' : 'bg-black/20 text-blue-400 border-t-2 border-t-blue-500')
                                            : (isLightTheme ? 'text-gray-500 hover:bg-gray-100' : 'text-gray-400 hover:bg-white/5')
                                        }`}
                                    >
                                        {tab}
                                    </button>
                                ))}
                            </div>
                            
                            {/* Tab Content */}
                            <div className="p-0">
                                {activeTab === 'Overview' && <OverviewTab match={match} />}
                                {activeTab === 'Team analysis' && <TeamAnalysisTab match={match} />}
                                {activeTab === 'Build' && <BuildTab match={match} />}
                                {activeTab === 'Etc.' && (
                                    <div className={`p-8 text-center text-xs italic opacity-60 ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Advanced graphs require additional timeline data.
                                    </div>
                                )}
                            </div>
                            
                            {/* NOTE INPUT SECTION */}
                            <div className={`p-3 border-t ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
                                <label className={`block text-[10px] font-bold uppercase mb-2 ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Memory Bank Note
                                </label>
                                <div className="flex gap-2">
                                    <textarea 
                                        value={notes[match.metadata.matchId] || ''}
                                        onChange={(e) => setNotes({...notes, [match.metadata.matchId]: e.target.value})}
                                        placeholder="Add notes before saving to Memory Bank..."
                                        className={`flex-1 text-xs p-2 rounded border outline-none resize-none h-16 ${
                                            isLightTheme 
                                            ? 'bg-white border-gray-300 text-gray-800 focus:border-blue-500' 
                                            : 'bg-black/20 border-white/10 text-gray-200 focus:border-blue-500/50'
                                        }`}
                                    />
                                    <button 
                                        onClick={() => onSaveMatch(match.metadata.matchId, match, notes[match.metadata.matchId])}
                                        className={`px-4 rounded font-bold text-xs uppercase tracking-wider transition-all hover:brightness-110 shadow-lg ${
                                            isLightTheme ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white'
                                        }`}
                                    >
                                        Save Note
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                  </div>
              );
          })}
      </div>
      
      {/* Load More Button */}
      {matches.length > 0 && hasMore && (
          <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className={`w-full py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  isLightTheme 
                  ? 'bg-gray-100 hover:bg-gray-200 text-gray-600' 
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white'
              }`}
          >
              {isLoading ? 'Loading...' : 'Load 10 more games'}
          </button>
      )}
    </div>
  );
};

export default MatchHistoryPanel;
