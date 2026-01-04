
import React, { useEffect, useState, useRef } from 'react';
import Sortable from 'sortablejs';
import { ChampionDetail, ChampionSpell, Theme } from '../types';

interface AbilitiesPanelProps {
  champions: ChampionDetail[];
  globalHaste: number;
  theme: Theme;
  prioritizedSpells: Record<string, string[]>;
  onTogglePriority: (championId: string, spellKey: string) => void;
}

interface AbilityItem {
  id: string; // unique id for sortable
  championName: string;
  championImage: string;
  spell: ChampionSpell;
  spellKey: 'P' | 'Q' | 'W' | 'E' | 'R';
  priorityScore: number;
  attackRange: number;
  version: string;
  isCC: boolean;
  isStarred: boolean;
  parsedDescription: string;
  championId: string;
}

// Updated Regex: Matches root words followed by any characters (e.g., 'charm' matches 'charms', 'charmed')
const CC_REGEX = /\b(stun|root|suppress|airborne|knock|sleep|charm|fear|taunt|suspen|ground|silence|blind|polymorph|slow|snare|flee|berserk|drowsy)\w*/i;

const AbilitiesPanel: React.FC<AbilitiesPanelProps> = ({ champions, globalHaste, theme, prioritizedSpells, onTogglePriority }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const [items, setItems] = useState<AbilityItem[]>([]);
  const [sortMode, setSortMode] = useState<'Priority' | 'RangeAsc' | 'RangeDesc'>('Priority');

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  // Helper to parse tooltip data {{ e1 }} and {{ a1 }}
  const parseTooltip = (spell: ChampionSpell) => {
    let text = spell.tooltip || spell.description;
    
    // 1. Replace effects {{ e1 }} -> value
    text = text.replace(/\{\{\s*e(\d+)\s*\}\}/gi, (match, index) => {
        const i = parseInt(index, 10);
        const val = spell.effect ? spell.effect[i] : null;
        if (!val) return '?';
        // Show max rank value for clarity in scouting
        return Array.isArray(val) ? String(val[val.length - 1]) : String(val);
    });

    // 2. Replace vars {{ a1 }} -> (Ratio % Stat)
    text = text.replace(/\{\{\s*([a-z])(\d+)\s*\}\}/gi, (match, char, index) => {
        const key = char + index; // e.g., a1, f1
        const v = spell.vars ? spell.vars.find(v => v.key === key) : null;
        if (v) {
            const c = Array.isArray(v.coeff) ? v.coeff[0] : v.coeff;
            const ratio = Math.round(c * 100);
            
            let statColor = isLightTheme ? 'text-gray-500' : 'text-gray-400';
            let statName = v.link || '';
            
            if (statName.includes('attackdamage')) { statName = 'AD'; statColor = 'text-orange-500'; }
            else if (statName.includes('spelldamage')) { statName = 'AP'; statColor = 'text-purple-500'; }
            else if (statName.includes('health')) { statName = 'HP'; statColor = 'text-green-600'; }
            else if (statName.includes('armor')) { statName = 'Def'; statColor = 'text-yellow-600'; }
            else if (statName.includes('spellblock')) { statName = 'MR'; statColor = 'text-blue-500'; }

            return `<span class="${statColor} font-bold">(${ratio}% ${statName})</span>`;
        }
        return match;
    });

    // 3. Simple HTML cleanup/formatting
    return text;
  };

  // Parse champions to find high priority abilities
  useEffect(() => {
    const newItems: AbilityItem[] = [];

    champions.forEach(champ => {
      const v = champ.version || '14.1.1';

      champ.spells.forEach((spell, index) => {
        const keyMap = ['Q', 'W', 'E', 'R'];
        const key = keyMap[index] as 'Q' | 'W' | 'E' | 'R';
        
        let isHighPriority = false;
        let priority = 0;
        let isCC = false;

        // Check if starred (prioritized)
        const isStarred = prioritizedSpells[champ.id]?.includes(key) || false;

        if (isStarred) {
            isHighPriority = true;
            priority += 100; // Starred items float to top
        }

        // Is Ultimate?
        if (key === 'R') {
            isHighPriority = true;
            priority += 10;
        }

        // Has CC?
        if (CC_REGEX.test(spell.description)) {
            isHighPriority = true;
            isCC = true;
            priority += 5;
        }

        if (isHighPriority) {
            newItems.push({
                id: `${champ.id}-${key}`,
                championName: champ.name,
                championId: champ.id,
                championImage: `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${champ.image.full}`,
                spell,
                spellKey: key,
                priorityScore: priority,
                attackRange: champ.stats.attackrange,
                version: v,
                isCC,
                isStarred,
                parsedDescription: parseTooltip(spell)
            });
        }
      });
    });

    // Initial sort
    if (sortMode === 'RangeAsc') {
        newItems.sort((a, b) => a.attackRange - b.attackRange);
    } else if (sortMode === 'RangeDesc') {
        newItems.sort((a, b) => b.attackRange - a.attackRange);
    } else {
        newItems.sort((a, b) => b.priorityScore - a.priorityScore);
    }
    
    setItems(newItems);

  }, [champions, theme, prioritizedSpells, sortMode]); 

  const handleSort = (mode: 'Priority' | 'RangeAsc' | 'RangeDesc') => {
      setSortMode(mode);
      setItems(prev => {
          const next = [...prev];
          if (mode === 'RangeAsc') {
              next.sort((a, b) => a.attackRange - b.attackRange);
          } else if (mode === 'RangeDesc') {
              next.sort((a, b) => b.attackRange - a.attackRange);
          } else {
              next.sort((a, b) => b.priorityScore - a.priorityScore);
          }
          return next;
      });
  };

  // Initialize Sortable
  useEffect(() => {
    if (listRef.current && !sortableInstance.current) {
        sortableInstance.current = new Sortable(listRef.current, {
            animation: 150,
            handle: '.drag-handle',
            ghostClass: 'opacity-50',
        });
    }
  }, [items]);

  const calculateCooldown = (baseCd: number | number[]) => {
    const cdList = Array.isArray(baseCd) ? baseCd : [baseCd];
    const reduced = cdList.map(c => (c / (1 + (globalHaste / 100))).toFixed(1));
    
    if (reduced.every(val => val === reduced[0])) return reduced[0];
    return reduced.join('/');
  };

  const getFormatData = (val: number | number[]) => {
      if (Array.isArray(val)) {
          if (val.every(v => v === val[0])) return val[0];
          return val.join('/');
      }
      return val;
  };

  if (items.length === 0) {
      return <div className={`p-8 text-center ${isLightTheme ? 'text-gray-400' : 'text-gray-600'}`}>No high priority abilities found or no champions selected.</div>;
  }

  return (
    <div className="w-full">
        {/* Sort Controls */}
        <div className="flex justify-end gap-2 mb-2">
            <span className={`text-[10px] self-center uppercase font-bold mr-1 ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}>Sort By:</span>
            <button 
                onClick={() => handleSort('Priority')}
                className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                    sortMode === 'Priority' 
                    ? (isLightTheme ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-500')
                    : (isLightTheme ? 'bg-white text-gray-500 border-gray-300' : 'bg-white/5 text-gray-400 border-white/10')
                }`}
            >
                Priority
            </button>
            <button 
                onClick={() => {
                    if (sortMode === 'RangeAsc') handleSort('RangeDesc');
                    else handleSort('RangeAsc');
                }}
                className={`text-[10px] px-2 py-1 rounded border transition-colors flex items-center gap-1 ${
                    sortMode.includes('Range')
                    ? (isLightTheme ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-600 text-white border-blue-500')
                    : (isLightTheme ? 'bg-white text-gray-500 border-gray-300' : 'bg-white/5 text-gray-400 border-white/10')
                }`}
            >
                Range {sortMode === 'RangeAsc' ? '(Low)' : sortMode === 'RangeDesc' ? '(High)' : ''}
                {sortMode === 'RangeAsc' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>}
                {sortMode === 'RangeDesc' && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>}
                {!sortMode.includes('Range') && <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>}
            </button>
        </div>

        <div className="w-full space-y-2 pb-20" ref={listRef}>
        {items.map((item) => (
            <div key={item.id} className={`relative rounded-lg p-3 flex items-start gap-3 backdrop-blur-md shadow-sm transition-colors border 
                ${item.isCC 
                    ? (isLightTheme ? 'border-red-300 bg-red-50/80' : 'border-red-500/40 bg-red-900/20') 
                    : (isLightTheme ? 'bg-white/70 border-gray-200' : 'bg-black/20 border-white/5')
                }
            `}>
                {/* Drag Handle */}
                <div className={`drag-handle cursor-move py-4 pr-1 hover:opacity-100 opacity-60 ${isLightTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" /></svg>
                </div>

                {/* Icons */}
                <div className="flex flex-col items-center gap-2 shrink-0 pt-1">
                    <img src={item.championImage} alt={item.championName} className="w-8 h-8 rounded-full border border-gray-600 opacity-80" />
                    <div className="relative">
                        <img 
                            src={`https://ddragon.leagueoflegends.com/cdn/${item.version}/img/spell/${item.spell.image.full}`} 
                            alt={item.spell.name} 
                            className={`w-12 h-12 rounded shadow-md ${item.isCC ? 'border-2 border-red-500' : 'border border-gray-600'}`}
                        />
                        <span className="absolute -bottom-1.5 -right-1.5 bg-black text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-gray-700 z-10">
                            {item.spellKey}
                        </span>
                    </div>
                    {/* Star Button */}
                    <button 
                        onClick={() => onTogglePriority(item.championId, item.spellKey)}
                        className={`p-1 rounded-full hover:bg-black/10 transition-transform active:scale-95 ${item.isStarred ? 'text-yellow-400' : (isLightTheme ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-400')}`}
                        title={item.isStarred ? "Unprioritize" : "Prioritize"}
                    >
                         {item.isStarred ? (
                             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                         ) : (
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                         )}
                    </button>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`font-bold text-sm leading-tight ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>{item.spell.name}</h3>
                            {item.isCC && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-red-200 bg-red-600/80 px-1.5 py-0.5 rounded shadow-sm">
                                    CC
                                </span>
                            )}
                            {item.isStarred && (
                                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-800 bg-yellow-400 px-1.5 py-0.5 rounded shadow-sm">
                                    PRIORITY
                                </span>
                            )}
                        </div>
                        <div className="text-right shrink-0 ml-2">
                            <span className="block text-sm text-yellow-500 font-mono font-bold leading-none">
                                {calculateCooldown(item.spell.cooldown)}s
                            </span>
                        </div>
                    </div>
                    
                    {/* Parsed Description */}
                    <div 
                        className={`text-xs leading-relaxed mb-2 opacity-90 ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}
                        dangerouslySetInnerHTML={{ __html: item.parsedDescription }}
                    />

                    {/* Stats Grid */}
                    <div className={`grid grid-cols-3 gap-y-1 gap-x-2 text-[10px] font-mono p-1.5 rounded border 
                        ${isLightTheme ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-black/30 text-gray-400 border-white/5'}`}>
                        <div className="flex items-center gap-1">
                            <span className="text-blue-400 font-bold">AA:</span> {item.attackRange}
                        </div>
                        <div className="flex items-center gap-1 col-span-2">
                            <span className="text-purple-400 font-bold">Rng:</span> {getFormatData(item.spell.range)}
                        </div>
                        <div className="flex items-center gap-1 col-span-3">
                            <span className="text-blue-400 font-bold">Cost:</span> {getFormatData(item.spell.cost)}
                        </div>
                    </div>
                </div>
            </div>
        ))}
        </div>
    </div>
  );
};

export default AbilitiesPanel;
