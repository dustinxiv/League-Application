
import React, { useState } from 'react';
import { RecentSearch, Theme } from '../types';
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
      
      // Match Title/Notes
      if (item.customTitle?.toLowerCase().includes(q)) return true;
      if (item.notes?.toLowerCase().includes(q)) return true;
      if (item.gameName.toLowerCase().includes(q)) return true;
      
      // Match any participant champion name
      if (item.snapshot) {
          return item.snapshot.participants.some(p => {
             const cName = RiotService.getChampionByKey(p.championId)?.name.toLowerCase();
             return cName?.includes(q);
          });
      }
      return false;
  });

  return (
    <div className={`rounded-xl border p-4 mb-6 transition-colors ${
        isLightTheme ? 'bg-white/60 border-gray-200' : 'bg-white/5 border-white/5'
    }`}>
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Recent History
          </h3>
          <div className="relative w-full sm:w-auto">
              <input 
                  type="text" 
                  placeholder="Search champs, notes..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className={`w-full sm:w-64 text-xs rounded-lg pl-8 pr-3 py-1.5 outline-none border transition-colors ${
                      isLightTheme 
                      ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-black/20 border-white/10 text-white placeholder-white/30 focus:border-blue-500/50'
                  }`}
              />
              <svg className="w-3 h-3 absolute left-3 top-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
      </div>

      {/* List */}
      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {filteredHistory.length === 0 && (
              <div className="text-center py-4 text-xs opacity-50">No matches found.</div>
          )}
          
          {filteredHistory.map((item) => {
              const date = new Date(item.timestamp);
              const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
              const isExpanded = expandedItems.includes(item.timestamp);
              
              // Main Icon (Searched Player)
              const mainChamp = RiotService.getChampionByKey(item.championId);
              const mainImg = mainChamp ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${mainChamp.image.full}` : null;

              return (
                  <div key={item.timestamp} className={`rounded-lg border transition-all ${
                      isLightTheme ? 'bg-white border-gray-200 hover:border-blue-300' : 'bg-black/20 border-white/10 hover:border-white/20'
                  }`}>
                      {/* Condensed View */}
                      <div className="p-3 flex items-center gap-3">
                          {/* Main Avatar */}
                          <div className="shrink-0 relative">
                               {mainImg ? (
                                   <img src={mainImg} className="w-10 h-10 rounded-full border border-gray-500/30" />
                               ) : (
                                   <div className="w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center font-bold text-xs">?</div>
                               )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onLoad(item)}>
                              <h4 className={`text-sm font-bold truncate ${isLightTheme ? 'text-gray-800' : 'text-gray-200'}`}>
                                  {item.customTitle || `${item.gameName} (Scout)`}
                              </h4>
                              <div className="flex items-center gap-2 text-[10px] opacity-60 font-mono">
                                  <span>{dateStr}</span>
                                  <span>•</span>
                                  <span>{item.region}</span>
                              </div>
                              
                              {/* Tagged Champions Row */}
                              {item.tags && item.tags.length > 0 && (
                                  <div className="flex items-center gap-1 mt-1.5">
                                      {item.tags.map((tag, idx) => {
                                          const c = RiotService.getChampionByKey(tag.championId);
                                          if(!c) return null;
                                          return (
                                              <img 
                                                key={idx}
                                                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}`}
                                                className={`w-5 h-5 rounded-full border ${tag.teamId === 100 ? 'border-blue-500' : 'border-red-500'}`}
                                                title={c.name}
                                              />
                                          );
                                      })}
                                  </div>
                              )}
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                              <button 
                                onClick={() => onLoad(item)}
                                className={`p-2 rounded hover:bg-blue-500/10 hover:text-blue-500 transition-colors ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}
                                title="Load Match"
                              >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              </button>
                              <button 
                                onClick={() => setEditingItem(item)}
                                className={`p-2 rounded hover:bg-green-500/10 hover:text-green-500 transition-colors ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}
                                title="Edit Details"
                              >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </button>
                              <button 
                                onClick={() => toggleExpand(item.timestamp)}
                                className={`p-2 rounded hover:bg-gray-500/10 transition-colors ${isExpanded ? 'text-blue-500 bg-blue-500/5' : (isLightTheme ? 'text-gray-400' : 'text-gray-500')}`}
                                title="Show All Players"
                              >
                                  <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                              </button>
                          </div>
                      </div>

                      {/* Expanded View */}
                      {isExpanded && item.snapshot && (
                          <div className={`p-3 border-t text-xs ${isLightTheme ? 'bg-gray-50/50 border-gray-200' : 'bg-black/20 border-white/5'}`}>
                              <div className="grid grid-cols-5 gap-2 mb-3">
                                  {item.snapshot.participants.map((p, i) => {
                                      const c = RiotService.getChampionByKey(p.championId);
                                      const img = c ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${c.image.full}` : null;
                                      return (
                                          <div key={i} className="flex flex-col items-center gap-1">
                                              <img 
                                                src={img || ''} 
                                                className={`w-8 h-8 rounded-full border-2 ${p.teamId === 100 ? 'border-blue-500/60' : 'border-red-500/60'}`} 
                                                title={p.riotId}
                                              />
                                              <span className={`text-[9px] truncate w-full text-center ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                                                  {p.championName}
                                              </span>
                                          </div>
                                      )
                                  })}
                              </div>
                              
                              {item.notes && (
                                  <div className={`p-2 rounded italic ${isLightTheme ? 'bg-yellow-50 text-gray-600 border border-yellow-100' : 'bg-yellow-900/10 text-yellow-100/60 border border-yellow-500/10'}`}>
                                      <span className="font-bold mr-1">Notes:</span> {item.notes}
                                  </div>
                              )}
                              
                              <div className="mt-2 flex justify-end">
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
