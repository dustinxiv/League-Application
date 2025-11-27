import React, { useEffect, useState, useRef } from 'react';
import Sortable from 'sortablejs';
import { ChampionDetail, ChampionSpell } from '../types';

interface AbilitiesPanelProps {
  champions: ChampionDetail[];
  globalHaste: number;
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
  parsedDescription: string;
}

// Updated Regex: Matches root words followed by any characters (e.g., 'charm' matches 'charms', 'charmed')
const CC_REGEX = /\b(stun|root|suppress|airborne|knock|sleep|charm|fear|taunt|suspen|ground|silence|blind|polymorph|slow|snare|flee|berserk|drowsy)\w*/i;

const AbilitiesPanel: React.FC<AbilitiesPanelProps> = ({ champions, globalHaste }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);
  const [items, setItems] = useState<AbilityItem[]>([]);

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
            
            let statColor = 'text-gray-400';
            let statName = v.link || '';
            
            if (statName.includes('attackdamage')) { statName = 'AD'; statColor = 'text-orange-400'; }
            else if (statName.includes('spelldamage')) { statName = 'AP'; statColor = 'text-purple-400'; }
            else if (statName.includes('health')) { statName = 'HP'; statColor = 'text-green-400'; }
            else if (statName.includes('armor')) { statName = 'Def'; statColor = 'text-yellow-400'; }
            else if (statName.includes('spellblock')) { statName = 'MR'; statColor = 'text-blue-400'; }

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

        // Is Ultimate?
        if (key === 'R') {
            isHighPriority = true;
            priority += 10;
        }

        // Has CC?
        // IMPORTANT: Only check description to avoid false positives in tooltips
        if (CC_REGEX.test(spell.description)) {
            isHighPriority = true;
            isCC = true;
            priority += 5;
        }

        if (isHighPriority) {
            newItems.push({
                id: `${champ.id}-${key}`,
                championName: champ.name,
                championImage: `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${champ.image.full}`,
                spell,
                spellKey: key,
                priorityScore: priority,
                attackRange: champ.stats.attackrange,
                version: v,
                isCC,
                parsedDescription: parseTooltip(spell)
            });
        }
      });
    });

    // Initial sort by priority
    newItems.sort((a, b) => b.priorityScore - a.priorityScore);
    setItems(newItems);

  }, [champions]);

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
    
    // Condense if all same
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
      return <div className="p-8 text-center text-gray-400">No high priority abilities found or no champions selected.</div>;
  }

  return (
    <div className="w-full space-y-2 pb-20" ref={listRef}>
      {items.map((item) => (
        <div key={item.id} className={`relative bg-white/5 border ${item.isCC ? 'border-red-500/40 bg-red-900/10' : 'border-white/10'} rounded-lg p-3 flex items-start gap-3 backdrop-blur-sm shadow-sm`}>
            {/* Drag Handle */}
            <div className="drag-handle cursor-move text-gray-600 py-4 pr-1 hover:text-gray-300">
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
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-white font-bold text-sm leading-tight">{item.spell.name}</h3>
                        {item.isCC && (
                            <span className="text-[9px] font-black uppercase tracking-widest text-red-200 bg-red-600/80 px-1.5 py-0.5 rounded shadow-sm">
                                CC
                            </span>
                        )}
                    </div>
                    <div className="text-right shrink-0 ml-2">
                        <span className="block text-sm text-yellow-400 font-mono font-bold leading-none">
                            {calculateCooldown(item.spell.cooldown)}s
                        </span>
                    </div>
                </div>
                
                {/* Parsed Description */}
                <div 
                    className="text-xs text-gray-300 leading-relaxed mb-2 opacity-90"
                    dangerouslySetInnerHTML={{ __html: item.parsedDescription }}
                />

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-y-1 gap-x-2 text-[10px] font-mono text-gray-400 bg-black/30 p-1.5 rounded border border-white/5">
                    <div className="flex items-center gap-1">
                        <span className="text-blue-400 font-bold">AA:</span> {item.attackRange}
                    </div>
                    <div className="flex items-center gap-1 col-span-2">
                        <span className="text-purple-400 font-bold">Rng:</span> {getFormatData(item.spell.range)}
                    </div>
                    <div className="flex items-center gap-1 col-span-3">
                         <span className="text-blue-300 font-bold">Cost:</span> {getFormatData(item.spell.cost)}
                    </div>
                </div>
            </div>
        </div>
      ))}
    </div>
  );
};

export default AbilitiesPanel;