
import React, { useState } from 'react';
import { RecentSearch, Theme, EnrichedParticipant } from '../types';
import RiotService from '../services/riotService';
import HistoryEditModal from './HistoryEditModal';

interface HistoryPanelProps {
  history: RecentSearch[];
  onLoad: (item: RecentSearch) => void;
  onUpdate: (item: RecentSearch) => void;
  onDelete: (timestamp: number) => void;
  theme: Theme;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onLoad, onUpdate, onDelete, theme }) => {
  const [search, setSearch] = useState('');
  const [editingItem, setEditingItem] = useState<RecentSearch | null>(null);
  const [expandedItems, setExpandedItems] = useState<number[]>([]);

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';
  const version = RiotService.getVersion();

  const toggleExpand = (timestamp: number) => {
      setExpandedItems(prev => prev.includes(timestamp) ? prev.filter(t => t !== timestamp) : [...prev, timestamp]);
  };

  const filteredHistory = history.filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      if (item.customTitle?.toLowerCase().includes(q)) return true;
      if (item.notes?.toLowerCase().includes(q)) return true;
      if (item.gameName.toLowerCase().includes(q)) return true;
      if (item.snapshot) {
          return item.snapshot.participants.some(p => {
             const cName = RiotService.getChampionByKey(p.championId)?.name.toLowerCase();
             const pName = (p.riotId || p.summonerId || '').toLowerCase();
             return cName?.includes(q) || pName.includes(q);
          });
      }
      return false;
  });

  const TeamPreview = ({ participants, teamId }: { participants: EnrichedParticipant[], teamId: number }) => {
      const team = participants.filter(p => p.teamId === teamId);
      return (
          <div className="flex -space-x-1">
              {team.map(p => {
                  const c = RiotService.getChampionByKey(p.championId);
                  if (!c) return <div key={p.puuid} className="w-3.5 h-3.5 bg-gray-700 rounded-full" />;
                  return (
                      <img 
                        key={p.puuid}
                        src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}`}
                        className={`w-3.5 h-3.5 rounded-full border ring-1 ring-black bg-gray-900 ${teamId === 100 ? 'border-blue-400' : 'border-red-400'}`}
                        alt={c.name}
                        title={c.name}
                      />
                  );
              })}
          </div>
      );
  };

  return (
    <div className={`pb-24 transition-colors`}>
      <div className={`sticky top-0 z-10 p-4 border-b mb-4 backdrop-blur-md rounded-xl ${isLightTheme ? 'bg-white/80 border-gray-200' : 'bg-black/40 border-white/5'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Memory Bank ({filteredHistory.length})
            </h3>
            <div className="relative w-full sm:w-auto">
                <input 
                    type="text" 
                    placeholder="Search player, champion, notes..." 
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className={`w-full sm:w-64 text-xs rounded-lg pl-8 pr-3 py-2 outline-none border transition-colors ${
                        isLightTheme 
                        ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500' 
                        : 'bg-black/20 border-white/10 text-white placeholder-white/30 focus:border-blue-500/50'
                    }`}
                />
                <svg className="w-3 h-3 absolute left-3 top-2.5 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
          </div>
      </div>

      <div className="space-y-3 px-1">
          {filteredHistory.length === 0 && (
              <div className={`text-center py-10 text-sm ${isLightTheme ? 'text-gray-500' : 'text-gray-500'}`}>
                  No matches found.
              </div>
          )}
          
          {filteredHistory.map((item) => {
              const date = new Date(item.timestamp);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const isExpanded = expandedItems.includes(item.timestamp);
              
              const mainChamp = RiotService.getChampionByKey(item.championId);
              const mainImg = mainChamp ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${mainChamp.image.full}` : null;

              return (
                  <div key={item.timestamp} className={`rounded-lg border transition-all ${
                      isLightTheme ? 'bg-white border-gray-200 hover:border-blue-300 shadow-sm' : 'bg-black/20 border-white/10 hover:border-white/20'
                  }`}>
                      <div className="p-3 flex items-center gap-2 sm:gap-4 overflow-hidden">
                          <div className="shrink-0 flex items-center">
                               <div className="relative z-20">
                                   {mainImg ? (
                                       <img src={mainImg} className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-gray-500/30 shadow-md" />
                                   ) : (
                                       <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-500/20 flex items-center justify-center font-bold text-xs">?</div>
                                   )}
                               </div>
                          </div>

                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onLoad(item)}>
                              <h4 className={`text-sm font-bold truncate mb-0.5 ${isLightTheme ? 'text-gray-800' : 'text-gray-200'}`}>
                                  {item.customTitle || `${item.gameName} (Scout)`}
                              </h4>
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] opacity-60 font-mono">
                                  <span>{dateStr}</span>
                                  <span>•</span>
                                  <span className="uppercase">{item.region}</span>
                              </div>
                              {item.notes && (
                                  <p className={`text-[10px] mt-1 italic truncate opacity-70 ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                      {item.notes}
                                  </p>
                              )}
                          </div>

                          {item.snapshot && (
                               <div className="flex flex-col gap-0.5 mr-2 opacity-70 shrink-0">
                                    <TeamPreview participants={item.snapshot.participants} teamId={100} />
                                    <TeamPreview participants={item.snapshot.participants} teamId={200} />
                               </div>
                          )}

                          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                              <button 
                                onClick={() => onLoad(item)}
                                className={`p-1.5 sm:p-2 rounded hover:bg-blue-500/10 hover:text-blue-500 transition-colors ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}
                                title="Load Match"
                              >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </button>
                              <button 
                                onClick={() => setEditingItem(item)}
                                className={`p-1.5 sm:p-2 rounded hover:bg-green-500/10 hover:text-green-500 transition-colors ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}
                                title="Edit Details"
                              >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button 
                                onClick={() => toggleExpand(item.timestamp)}
                                className={`p-1.5 sm:p-2 rounded hover:bg-gray-500/10 transition-colors ${isExpanded ? 'text-blue-500 bg-blue-500/5' : (isLightTheme ? 'text-gray-400' : 'text-gray-500')}`}
                                title="Show All Players"
                              >
                                  <svg className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                          </div>
                      </div>

                      {isExpanded && item.snapshot && (
                          <div className={`p-3 border-t text-xs ${isLightTheme ? 'bg-gray-50/50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                              <div className="grid grid-cols-2 gap-4">
                                  {/* Team List with Keystones */}
                                  {[100, 200].map(teamId => (
                                      <div key={teamId} className="space-y-2">
                                          <h5 className={`text-[10px] font-black uppercase mb-2 ${teamId === 100 ? 'text-blue-400' : 'text-red-400'}`}>
                                              {teamId === 100 ? 'Blue Team' : 'Red Team'}
                                          </h5>
                                          {item.snapshot!.participants.filter(p => p.teamId === teamId).map((p, i) => {
                                              const c = RiotService.getChampionByKey(p.championId);
                                              const img = c ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}` : null;
                                              
                                              const ksId = p.perks?.perkIds[0];
                                              const secondaryStyleId = p.perks?.perkSubStyle;
                                              
                                              const ksIcon = RiotService.getRuneIcon(ksId);
                                              const subIcon = RiotService.getRuneIcon(secondaryStyleId);
                                              const pName = p.riotId || p.summonerId;
                                              
                                              // Highlight logic for Memory Bank
                                              const isSearched = search && (pName.toLowerCase().includes(search.toLowerCase()) || (c?.name || '').toLowerCase().includes(search.toLowerCase()));

                                              return (
                                                  <div key={i} className={`flex items-center gap-2 transition-opacity ${search && !isSearched ? 'opacity-30' : 'opacity-100'}`}>
                                                      <div className="relative">
                                                          <img src={img || ''} className="w-8 h-8 rounded-full border border-white/10" />
                                                          <div className="absolute -top-1 -left-1 flex -space-x-1">
                                                              {ksIcon && (
                                                                  <div className="w-4 h-4 bg-black rounded-full p-0.5 border border-white/10 shadow-sm z-10">
                                                                      <img src={ksIcon} className="w-full h-full object-contain" />
                                                                  </div>
                                                              )}
                                                              {subIcon && (
                                                                  <div className="w-3 h-3 bg-black/80 rounded-full p-0.5 border border-white/5 shadow-xs translate-y-0.5 z-0">
                                                                      <img src={subIcon} className="w-full h-full object-contain grayscale-[0.3]" />
                                                                  </div>
                                                              )}
                                                          </div>
                                                      </div>
                                                      <span className={`truncate flex-1 ${isSearched ? 'text-blue-400 font-bold' : 'opacity-80'}`}>{p.championName}</span>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  ))}
                              </div>
                              
                              <div className="mt-3 flex justify-end">
                                  <button 
                                    onClick={() => onDelete(item.timestamp)}
                                    className="text-[10px] text-red-400 hover:text-red-500 hover:underline px-2"
                                  >
                                      Delete Record
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      <HistoryEditModal 
        isOpen={!!editingItem}
        onClose={() => setEditingItem(null)}
        item={editingItem}
        onSave={onUpdate}
        theme={theme}
      />
    </div>
  );
};

export default HistoryPanel;
