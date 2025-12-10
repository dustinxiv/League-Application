
import React, { useState, useEffect, useRef } from 'react';
import { ChampionDetail, ChampionSpell, Theme, ChampionListItem, Role } from '../types';
import RiotService from '../services/riotService';

// Regex reused for display consistency
const CC_REGEX = /\b(stun|root|suppress|airborne|knock|sleep|charm|fear|taunt|suspen|ground|silence|blind|polymorph|slow|snare|flee|berserk|drowsy)\w*/i;

interface SingleChampionCardProps {
  champion: ChampionDetail;
  globalHaste: number;
  id?: string;
  theme: Theme;
}

// --- NEW COMPONENT: RANGE VISUALIZER ---
const RangeVisualizer: React.FC<{ range: number[]; isLightTheme: boolean }> = ({ range, isLightTheme }) => {
    // Determine max range from array (usually last rank)
    const maxRange = (range && range.length > 0) ? Math.max(...range) : 0;
    
    // Safety for "Self" (0 or null)
    const effectiveRange = (!maxRange || maxRange <= 0) ? 0 : maxRange;
    const isGlobal = effectiveRange > 5500;
    const isSelf = effectiveRange <= 0;

    // Viewbox configuration
    // We want the circle to fit. Standard AA is 550.
    // If range is 600, diameter is 1200. Viewbox 1400.
    
    // Dynamic Zoom: Fit the spell, but don't zoom in closer than standard AA range context
    const displayRadius = isGlobal ? 20000 : (isSelf ? 100 : effectiveRange);
    
    // If Global, we set view size to something manageable but show huge circle
    // If Self, we zoom into ~800 width
    // Else, we fit range * 2.5
    const viewSize = isGlobal ? 3000 : Math.max(displayRadius * 2.6, 1500);
    const center = viewSize / 2;
    
    // AA Range for context (550)
    const aaRadius = 550;

    return (
        <div className={`mt-3 p-3 rounded-lg border flex flex-col items-center gap-2 animate-fade-in ${
            isLightTheme ? 'bg-slate-50 border-gray-200' : 'bg-white/5 border-white/5'
        }`}>
            <div className="w-full flex justify-between items-center text-[10px] font-mono opacity-70 border-b pb-1 border-dashed border-gray-500/30">
                <span className="uppercase tracking-wider font-bold">Range Diagram</span>
                <span>{isGlobal ? 'GLOBAL' : (isSelf ? 'SELF' : `${effectiveRange} Units`)}</span>
            </div>
            
            <div className="relative w-full aspect-[2/1] rounded bg-grid-pattern overflow-hidden flex items-center justify-center border border-gray-500/10">
                 {/* Map Background Hint */}
                 <div className={`absolute inset-0 opacity-10 ${
                     isLightTheme 
                     ? 'bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]' 
                     : 'bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]'
                 }`} />
                 
                 <svg viewBox={`0 0 ${viewSize} ${viewSize}`} className="w-full h-full max-w-[400px]">
                     {/* Crosshair Center */}
                     <line x1={center} y1={0} x2={center} y2={viewSize} stroke={isLightTheme ? "#cbd5e1" : "#334155"} strokeWidth={viewSize/400} strokeDasharray="10 10" />
                     <line x1={0} y1={center} x2={viewSize} y2={center} stroke={isLightTheme ? "#cbd5e1" : "#334155"} strokeWidth={viewSize/400} strokeDasharray="10 10" />

                     {/* AA Reference Ring (550) */}
                     <circle 
                        cx={center} cy={center} r={aaRadius} 
                        fill="none" 
                        stroke={isLightTheme ? "#94a3b8" : "#64748b"} 
                        strokeWidth={viewSize/300} 
                        strokeDasharray="20 10"
                        opacity="0.5"
                     />
                     <text 
                        x={center} y={center - aaRadius - (viewSize * 0.02)} 
                        textAnchor="middle" 
                        fontSize={viewSize * 0.04} 
                        fill={isLightTheme ? "#94a3b8" : "#64748b"} 
                        className="font-mono font-bold"
                     >
                        AA (550)
                     </text>

                     {/* Spell Range */}
                     {!isSelf && (
                         <circle 
                            cx={center} cy={center} r={displayRadius} 
                            fill={isLightTheme ? "rgba(59, 130, 246, 0.1)" : "rgba(96, 165, 250, 0.15)"}
                            stroke={isLightTheme ? "#3b82f6" : "#60a5fa"}
                            strokeWidth={viewSize/200}
                            className="animate-pulse"
                         />
                     )}

                     {/* Champion Dot */}
                     <circle cx={center} cy={center} r={viewSize * 0.015} fill={isLightTheme ? "#2563eb" : "#3b82f6"} stroke="white" strokeWidth={viewSize/500} />
                     
                     {/* Self Indicator */}
                     {isSelf && (
                         <text x={center} y={center + (viewSize * 0.08)} textAnchor="middle" fontSize={viewSize * 0.06} fontWeight="bold" fill={isLightTheme ? "#2563eb" : "#60a5fa"}>SELF</text>
                     )}
                 </svg>
            </div>
            
            <p className={`text-[9px] w-full text-right italic opacity-50 ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                *Visualizes cast radius relative to standard AA range.
            </p>
        </div>
    );
};

const SpellRow: React.FC<{ spell: ChampionSpell; hotkey: string; haste: number; version: string; isLightTheme: boolean }> = ({ spell, hotkey, haste, version, isLightTheme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const isCC = CC_REGEX.test(spell.description);

  // Helper for stat colors
  const getStatColor = (link: string) => {
    if (link.includes('attackdamage')) return isLightTheme ? 'text-orange-600' : 'text-orange-400';
    if (link.includes('spelldamage')) return isLightTheme ? 'text-purple-600' : 'text-purple-400';
    if (link.includes('health')) return isLightTheme ? 'text-green-600' : 'text-green-400';
    if (link.includes('armor')) return isLightTheme ? 'text-yellow-600' : 'text-yellow-500';
    if (link.includes('spellblock')) return isLightTheme ? 'text-blue-600' : 'text-blue-400';
    return isLightTheme ? 'text-gray-600' : 'text-gray-400';
  };

  const getStatLabel = (link: string) => {
      if (link.includes('attackdamage')) return 'AD';
      if (link.includes('spelldamage')) return 'AP';
      if (link.includes('health')) return 'HP';
      if (link.includes('armor')) return 'Armor';
      if (link.includes('spellblock')) return 'MR';
      return link;
  };

  const formatArray = (arr: number[] | number) => {
    if (!Array.isArray(arr)) return arr;
    if (arr.every(v => v === arr[0])) return arr[0];
    return arr.join(' / ');
  };

  const cooldowns = spell.cooldown || [0];
  const currentCooldowns = cooldowns.map(cd => (cd / (1 + (haste / 100))).toFixed(1).replace(/\.0$/, ''));
  const cdString = currentCooldowns.every(c => c === currentCooldowns[0]) ? currentCooldowns[0] : currentCooldowns.join(' / ');

  const costs = spell.cost || [0];
  const costString = formatArray(costs);
  const costType = spell.costType === 'No Cost' || !spell.costType ? '' : spell.costType;

  // Use rangeBurn if available for cleaner display (handles 'self', scaling, etc. natively)
  const rangeDisplay = spell.rangeBurn || formatArray(spell.range);

  // Tooltip Parser
  const parseTooltip = () => {
    let text = spell.tooltip || spell.description;
    
    // Replace effects {{ e1 }}
    text = text.replace(/\{\{\s*e(\d+)\s*\}\}/gi, (match, index) => {
        const i = parseInt(index, 10);
        const val = spell.effect ? spell.effect[i] : null;
        if (!val) return '?';
        const valStr = Array.isArray(val) ? val.join('/') : String(val);
        return `<span class="font-bold ${isLightTheme ? 'text-gray-800' : 'text-gray-200'}">${valStr}</span>`;
    });

    // Replace vars {{ a1 }} or {{ f1 }}
    text = text.replace(/\{\{\s*([af])(\d+)\s*\}\}/gi, (match, char, index) => {
        const key = char + index;
        const v = spell.vars ? spell.vars.find(v => v.key === key) : null;
        if (v) {
            const c = Array.isArray(v.coeff) ? v.coeff[0] : v.coeff;
            const ratio = Math.round(c * 100);
            const link = v.link || '';
            const color = getStatColor(link);
            const label = getStatLabel(link);
            return `<span class="${color} font-bold">(${ratio}% ${label})</span>`;
        }
        return match;
    });

    return text;
  };

  return (
    <div className={`p-3 rounded-lg border flex gap-3 mb-2 shadow-sm transition-colors ${
        isLightTheme 
        ? (isCC ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200') 
        : (isCC ? 'bg-red-900/10 border-red-500/30' : 'bg-black/20 border-white/5')
    }`}>
        <div className="relative shrink-0 flex flex-col items-center gap-1">
            <div className="relative">
                <img 
                    src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`} 
                    alt={spell.name} 
                    className={`w-12 h-12 rounded shadow-sm ${isCC ? 'border border-red-500' : 'border border-white/10'}`} 
                />
                <span className="absolute -top-1.5 -left-1.5 bg-gray-800 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-gray-600 shadow-lg z-10">
                    {hotkey}
                </span>
            </div>
        </div>
        
        <div className="flex-1 min-w-0 flex flex-col">
             {/* Header: Name & Cost */}
             <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold truncate ${isLightTheme ? 'text-gray-900' : 'text-gray-100'}`}>{spell.name}</span>
                    {isCC && <span className="text-[9px] bg-red-600 text-white px-1 rounded font-bold tracking-wider">CC</span>}
                </div>
                {costString !== 0 && (
                     <div className={`text-[10px] font-mono ${isLightTheme ? 'text-blue-600' : 'text-blue-400'}`}>
                         <span className="font-bold">{costString}</span> {costType}
                     </div>
                )}
             </div>

             {/* Cooldown Bar */}
             <div className={`text-[10px] font-mono mb-2 flex items-center gap-1 ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                 <svg className="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 <span className="font-bold">{cdString}s</span>
             </div>
             
             {/* Rich Description */}
             <div 
                className={`text-xs leading-relaxed mb-2 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}
                dangerouslySetInnerHTML={{ __html: parseTooltip() }}
             />

             {/* Detailed Scaling Breakdown (if available in vars) */}
             {spell.vars && spell.vars.length > 0 && (
                 <div className="flex flex-wrap gap-2 mb-2">
                     {spell.vars.map((v, idx) => {
                         const coeff = Array.isArray(v.coeff) ? v.coeff[0] : v.coeff;
                         const ratio = Math.round(coeff * 100);
                         const link = v.link || '';
                         if (!link) return null; // Skip if no link (usually internal vars)
                         
                         const color = getStatColor(link);
                         const label = getStatLabel(link);
                         
                         return (
                            <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded border font-bold ${
                                isLightTheme ? 'bg-white border-gray-200 text-gray-700' : 'bg-black/30 border-white/10 text-gray-300'
                            }`}>
                                <span className={color}>+{ratio}% {label}</span>
                            </span>
                         );
                     })}
                 </div>
             )}

             {/* Footer Stats: Range & Visualizer Toggle */}
             <div className={`flex gap-3 text-[10px] font-mono pt-1 mt-auto border-t items-center justify-between ${isLightTheme ? 'text-gray-500 border-gray-200' : 'text-gray-500 border-white/5'}`}>
                 <div>
                    <span className="text-purple-400 font-bold">Range:</span> {rangeDisplay}
                 </div>
                 
                 <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`flex items-center gap-1 px-2 py-0.5 rounded transition-all ${
                        isExpanded 
                        ? (isLightTheme ? 'bg-blue-100 text-blue-600 shadow-inner' : 'bg-blue-900/40 text-blue-300 shadow-inner')
                        : (isLightTheme ? 'hover:bg-gray-200 text-gray-500' : 'hover:bg-white/10 text-gray-400')
                    }`}
                 >
                    <svg className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    {isExpanded ? 'Hide Range' : 'View Range'}
                 </button>
             </div>

             {/* Expandable Visualizer */}
             {isExpanded && <RangeVisualizer range={spell.range} isLightTheme={isLightTheme} />}
        </div>
    </div>
  );
};

const SingleChampionCard: React.FC<SingleChampionCardProps> = ({ champion, globalHaste, id, theme }) => {
  const [activeSkin, setActiveSkin] = useState<any>(null);

  useEffect(() => {
    if (champion && champion.skins) {
        setActiveSkin(champion.skins[0]);
    }
  }, [champion]);

  if (!champion || !activeSkin) return null;

  const version = champion.version || '14.1.1';
  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  return (
    <div id={id} className={`rounded-xl overflow-hidden border shadow-lg mb-4 scroll-mt-32 transition-colors ${
        isLightTheme ? 'bg-white border-gray-200' : 'bg-black/40 border-white/10 backdrop-blur-md'
    }`}>
      {/* Header Splash (Interactive) */}
      <div className="relative h-48 md:h-64 overflow-hidden group">
        <img 
            src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_${activeSkin.num}.jpg`} 
            alt={activeSkin.name} 
            className="w-full h-full object-cover object-top transition-all duration-700 ease-out group-hover:scale-105"
        />
        <div className={`absolute bottom-0 left-0 w-full p-4 bg-gradient-to-t ${isLightTheme ? 'from-white via-white/80 to-transparent' : 'from-black/90 via-black/60 to-transparent'}`}>
            <h2 className={`text-2xl font-black tracking-wide drop-shadow-md ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>
                {activeSkin.name === 'default' ? champion.name : activeSkin.name}
            </h2>
            <p className={`text-sm font-bold ${isLightTheme ? 'text-gray-500' : 'text-gray-300'}`}>
                {activeSkin.name === 'default' ? champion.title : champion.name}
            </p>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {/* Basic Stats */}
        <div className={`grid grid-cols-4 gap-2 text-[10px] font-mono p-2 rounded border ${
            isLightTheme ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-black/40 border-white/5 text-gray-400'
        }`}>
            <div className="text-center"><span className="block opacity-60 uppercase text-[9px]">Range</span><span className={`text-xs ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>{champion.stats.attackrange}</span></div>
            <div className="text-center"><span className="block opacity-60 uppercase text-[9px]">Move</span><span className={`text-xs ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>{champion.stats.movespeed}</span></div>
            <div className="text-center"><span className="block opacity-60 uppercase text-[9px]">AD</span><span className={`text-xs ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>{champion.stats.attackdamage}</span></div>
            <div className="text-center"><span className="block opacity-60 uppercase text-[9px]">HP</span><span className={`text-xs ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>{champion.stats.hp}</span></div>
        </div>

        {/* Passive */}
        <div className={`flex gap-3 p-3 rounded border ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/5'}`}>
             <img 
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/passive/${champion.passive.image.full}`} 
                alt="Passive" 
                className="w-10 h-10 rounded-full border-2 border-yellow-600/50" 
            />
            <div>
                <span className="text-xs font-bold text-yellow-500 block uppercase tracking-wide mb-0.5">Passive</span>
                <p className={`text-xs leading-snug ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>{champion.passive.description.replace(/<[^>]*>?/gm, '')}</p>
            </div>
        </div>

        {/* Spells */}
        <div className="space-y-2">
            {champion.spells.map((spell, idx) => (
                <SpellRow 
                    key={spell.id} 
                    spell={spell} 
                    hotkey={['Q','W','E','R'][idx]} 
                    haste={globalHaste}
                    version={version}
                    isLightTheme={isLightTheme}
                />
            ))}
        </div>

        {/* Skins Gallery */}
        <div className="pt-2 border-t border-dashed border-gray-500/20 mt-2">
            <h3 className={`text-xs font-bold uppercase tracking-widest mb-3 ${isLightTheme ? 'text-gray-500' : 'text-gray-400'}`}>
                Skins ({champion.skins.length})
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 no-scrollbar snap-x">
                {champion.skins.map((skin: any) => (
                    <button 
                        key={skin.id}
                        onClick={() => setActiveSkin(skin)}
                        className={`shrink-0 relative group snap-start rounded-lg overflow-hidden transition-all duration-300 ${
                            activeSkin.id === skin.id 
                            ? 'ring-2 ring-blue-500 scale-105 shadow-xl z-10' 
                            : 'opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        style={{ width: '85px', height: '130px' }}
                    >
                        <img 
                            src={`https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${champion.id}_${skin.num}.jpg`} 
                            alt={skin.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                        {/* Gradient Overlay for Name */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-2 pt-6">
                            <p className={`text-[9px] font-bold leading-tight text-center truncate ${activeSkin.id === skin.id ? 'text-blue-300' : 'text-gray-200'}`}>
                                {skin.name === 'default' ? 'Base' : skin.name}
                            </p>
                        </div>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

interface ChampionDetailListProps {
    items: ChampionListItem[]; // Updated from ChampionDetail[]
    globalHaste: number;
    theme: Theme;
    onAddChampion: (id: string) => void;
}

const ChampionDetailList: React.FC<ChampionDetailListProps> = ({ items, globalHaste, theme, onAddChampion }) => {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState<Role>('Manual'); // Changed default to show 'All' logic later
    const [roleFilterUI, setRoleFilterUI] = useState<string>('All');
    
    // Add Search State
    const [addSearch, setAddSearch] = useState('');
    const [showAddResults, setShowAddResults] = useState(false);
    const [allChampions, setAllChampions] = useState<{name: string, id: string, image: string}[]>([]);
    
    const wrapperRef = useRef<HTMLDivElement>(null);
    const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

    // Init All Champions for Add Search
    useEffect(() => {
        setAllChampions(RiotService.getChampionSummaryList());
    }, []);

    // Click outside to close add search
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowAddResults(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelectChampion = (id: string) => {
        onAddChampion(id);
        setAddSearch('');
        setShowAddResults(false);
    };

    // Filter Logic
    const filtered = items.filter(item => {
        const nameMatch = item.detail.name.toLowerCase().includes(search.toLowerCase());
        
        if (roleFilterUI === 'All') return nameMatch;
        if (roleFilterUI === 'Manual') return nameMatch && item.role === 'Manual';
        
        return nameMatch && item.role === roleFilterUI;
    });

    const addSearchResults = allChampions.filter(c => c.name.toLowerCase().includes(addSearch.toLowerCase())).slice(0, 10);

    return (
        <div className="animate-fade-in pb-20">
             
             <div className="mb-4 space-y-3">
                 {/* Add Champion Search */}
                 <div className="relative z-20" ref={wrapperRef}>
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input 
                                type="text" 
                                placeholder="Add Champion..." 
                                value={addSearch}
                                onFocus={() => setShowAddResults(true)}
                                onChange={(e) => {
                                    setAddSearch(e.target.value);
                                    setShowAddResults(true);
                                }}
                                className={`w-full text-xs font-bold rounded-lg pl-3 pr-8 py-2.5 outline-none border transition-colors ${
                                    isLightTheme 
                                    ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-green-500' 
                                    : 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:bg-black/40 focus:border-green-500/50'
                                }`}
                            />
                            <div className="absolute right-3 top-2.5 text-gray-500">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showAddResults && addSearch && (
                        <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg border shadow-xl max-h-60 overflow-y-auto ${
                            isLightTheme ? 'bg-white border-gray-200' : 'bg-gray-900 border-white/10'
                        }`}>
                            {addSearchResults.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleSelectChampion(c.id)}
                                    className={`w-full text-left px-3 py-2 flex items-center gap-3 hover:bg-opacity-10 transition-colors ${
                                        isLightTheme ? 'hover:bg-black text-gray-800' : 'hover:bg-white text-gray-200'
                                    }`}
                                >
                                    <img src={`https://ddragon.leagueoflegends.com/cdn/15.1.1/img/champion/${c.image}`} className="w-8 h-8 rounded-full" />
                                    <span className="text-sm font-bold">{c.name}</span>
                                </button>
                            ))}
                            {addSearchResults.length === 0 && (
                                <div className="p-3 text-xs text-gray-500 text-center">No champions found</div>
                            )}
                        </div>
                    )}
                 </div>

                 {/* Filter Bar */}
                 {items.length > 0 && (
                    <div className="relative">
                        <span className={`absolute left-3 top-2.5 ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </span>
                        <input 
                            type="text" 
                            placeholder="Filter list..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={`w-full text-xs font-bold rounded-lg pl-9 pr-8 py-2.5 outline-none border transition-colors ${
                                isLightTheme 
                                ? 'bg-white border-gray-300 text-gray-800 placeholder-gray-400 focus:border-blue-500' 
                                : 'bg-white/5 border-white/10 text-white placeholder-gray-500 focus:bg-black/40 focus:border-blue-500/50'
                            }`}
                        />
                         {search && (
                            <button 
                                onClick={() => setSearch('')}
                                className={`absolute right-3 top-2.5 ${isLightTheme ? 'text-gray-400 hover:text-gray-600' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        )}
                    </div>
                 )}

                 {/* Role Filters */}
                 {items.length > 0 && (
                     <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {(['All', 'Top', 'Jungle', 'Mid', 'Bot', 'Support', 'Manual'] as string[]).map((role) => (
                            <button
                                key={role}
                                onClick={() => setRoleFilterUI(role)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all whitespace-nowrap ${
                                    roleFilterUI === role
                                    ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                                    : isLightTheme 
                                        ? 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100' 
                                        : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200'
                                }`}
                            >
                                {role}
                            </button>
                        ))}
                     </div>
                 )}
             </div>

             {/* Quick Nav */}
             {filtered.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                    {filtered.map(c => (
                        <button 
                            key={c.detail.id} 
                            onClick={() => {
                                const el = document.getElementById(`champ-${c.detail.id}`);
                                if(el) el.scrollIntoView({behavior: 'smooth'});
                            }}
                            className="shrink-0 relative group"
                        >
                            <div className={`absolute inset-0 rounded-full border-2 border-transparent transition-colors z-10 ${
                                c.team === 'Blue' ? 'group-hover:border-blue-500' : c.team === 'Red' ? 'group-hover:border-red-500' : 'group-hover:border-green-500'
                            }`}></div>
                            <img src={`https://ddragon.leagueoflegends.com/cdn/${c.detail.version}/img/champion/${c.detail.image.full}`} className="w-10 h-10 rounded-full shadow-lg" />
                            {/* Role Indicator Mini */}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[8px] bg-black/80 text-white px-1 rounded">
                                {c.role.substring(0,3)}
                            </div>
                        </button>
                    ))}
                </div>
             )}

             {filtered.length > 0 ? filtered.map(c => (
                <SingleChampionCard key={c.detail.id} champion={c.detail} globalHaste={globalHaste} id={`champ-${c.detail.id}`} theme={theme} />
             )) : (
                <div className={`text-center py-20 ${isLightTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                    {items.length === 0 ? 'Start by searching or adding a champion.' : 'No champions match filter'}
                </div>
             )}
        </div>
    );
};

export default ChampionDetailList;
