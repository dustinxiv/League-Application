
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList, CartesianGrid } from 'recharts';
import { ChampionDetail, Theme } from '../types';

interface StatsPanelProps {
  champions: ChampionDetail[];
  theme: Theme;
}

type FilterType = 'All' | 'Blue' | 'Red' | 'Top' | 'Jungle' | 'Mid' | 'Bot' | 'Support';
type SortType = 'Alphabetical' | 'Value';

const StatsPanel: React.FC<StatsPanelProps> = ({ champions, theme }) => {
  const [activeCategory, setActiveCategory] = useState<'Ultimates' | 'Combat' | 'Defense'>('Ultimates');
  const [filterType, setFilterType] = useState<FilterType>('All');
  const [sortType, setSortType] = useState<SortType>('Value');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  const getThemeColor = (idx: number) => {
    const bases: Record<string, string[]> = {
        'Dark': ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'],
        'Light': ['#0ea5e9', '#6366f1', '#d946ef', '#ef4444', '#f59e0b'],
        'Piltover': ['#c8aa6e', '#1a3c5a', '#cdbe91', '#052c52', '#f0e6d2'],
        'Shadow Isles': ['#2dd4bf', '#0d9488', '#5eead4', '#115e59', '#ccfbf1'], // Teal/Mint ghosts
        'Bilgewater': ['#ef4444', '#f59e0b', '#78350f', '#b91c1c', '#d97706'], // Red/Gold/Rust
        'Ionia': ['#f472b6', '#34d399', '#60a5fa', '#fb7185', '#818cf8'], // Pink/Teal/Pastel
        'Shurima': ['#fbbf24', '#d97706', '#fcd34d', '#92400e', '#fef3c7'], // Bright Gold/Amber
        'iOS 18 Glass': ['#0a84ff', '#5e5ce6', '#bf5af2', '#ff375f', '#64d2ff'],
        'Winter Wonder': ['#0891b2', '#0ea5e9', '#0284c7', '#2563eb', '#7c3aed'], 
    };
    const palette = bases[theme] || bases['Dark'];
    return palette[idx % palette.length];
  };

  if (champions.length === 0) {
      return <div className={`p-10 text-center ${isLightTheme ? 'text-gray-500' : 'text-gray-500'}`}>No champions to compare.</div>;
  }

  // Map data and preserve original index for Lane filtering
  const rawData = champions.map((c, index) => {
    const rSpell = c.spells[3]; 
    const rCds = rSpell ? rSpell.cooldown : [];
    
    const getRCd = (i: number) => {
        if (rCds.length === 0) return 0;
        if (i < rCds.length) return rCds[i];
        return rCds[rCds.length - 1];
    };

    return {
      originalIndex: index, // Crucial for identifying Blue/Red/Lane
      name: c.name,
      image: c.image.full,
      version: c.version,
      HP: c.stats.hp,
      Range: c.stats.attackrange,
      MS: c.stats.movespeed,
      AD: c.stats.attackdamage,
      Armor: c.stats.armor,
      MR: c.stats.spellblock,
      'R CD 1': getRCd(0),
      'R CD 2': getRCd(1),
      'R CD 3': getRCd(2),
    };
  });

  const getMetrics = () => {
      switch(activeCategory) {
          case 'Ultimates': return ['R CD 1', 'R CD 2', 'R CD 3'];
          case 'Combat': return ['HP', 'AD', 'Range', 'MS'];
          case 'Defense': return ['Armor', 'MR'];
          default: return [];
      }
  };

  const metrics = getMetrics();

  // Reset sort defaults when category changes
  useEffect(() => {
    setSortType('Value');
    setSortDirection('desc');
  }, [activeCategory]);

  // --- 1. FILTERING LOGIC ---
  const filteredData = rawData.filter(item => {
      if (filterType === 'All') return true;
      
      const idx = item.originalIndex;
      
      // Team Filters
      if (filterType === 'Blue') return idx < 5;
      if (filterType === 'Red') return idx >= 5;

      // Lane Filters (Assumes standard API ordering: 0/5=Top, 1/6=Jg, etc.)
      const normalizedPos = idx % 5;
      switch(filterType) {
          case 'Top': return normalizedPos === 0;
          case 'Jungle': return normalizedPos === 1;
          case 'Mid': return normalizedPos === 2;
          case 'Bot': return normalizedPos === 3;
          case 'Support': return normalizedPos === 4;
          default: return true;
      }
  });

  const dynamicHeight = Math.max(150, filteredData.length * 55);

  const CustomYAxisTick = ({ x, y, payload }: any) => {
      const champ = rawData.find(c => c.name === payload.value);
      if (!champ) return null;
      
      const imgUrl = `https://ddragon.leagueoflegends.com/cdn/${champ.version || '14.1.1'}/img/champion/${champ.image}`;

      return (
        <g transform={`translate(${x},${y})`}>
            <foreignObject x={-28} y={-10} width={20} height={20}>
                <div style={{ width: 20, height: 20 }}>
                    <img 
                        src={imgUrl} 
                        style={{ width: '100%', height: '100%', borderRadius: '50%', border: '1px solid #9ca3af' }} 
                        alt=""
                    />
                </div>
            </foreignObject>
            <text x={-35} y={4} dy={0} textAnchor="end" fill={isLightTheme ? "#374151" : "#9ca3af"} fontSize={10} fontWeight="bold">
                {payload.value}
            </text>
        </g>
      );
  };

  // Helper to sort data for a specific metric
  const getSortedDataForMetric = (metric: string) => {
      return [...filteredData].sort((a, b) => {
          if (sortType === 'Alphabetical') {
              return sortDirection === 'asc' 
                ? a.name.localeCompare(b.name) 
                : b.name.localeCompare(a.name);
          }

          // Numeric Sort (Value)
          // @ts-ignore
          const valA = a[metric] || 0;
          // @ts-ignore
          const valB = b[metric] || 0;
          return sortDirection === 'asc' ? valA - valB : valB - valA;
      });
  };

  return (
    <div className="w-full pb-24 space-y-4">
      {/* Controls Container */}
      <div className={`p-3 rounded-xl border flex flex-col gap-3 shadow-sm transition-colors ${
          isLightTheme 
          ? 'bg-white/70 border-gray-200' 
          : 'bg-black/20 border-white/5 backdrop-blur-md'
      }`}>
          
          {/* Top Row: Category & Filter */}
          <div className={`flex flex-wrap items-center justify-between border-b pb-2 gap-2 ${isLightTheme ? 'border-gray-200' : 'border-white/5'}`}>
            
            {/* Category */}
            <div className="flex items-center gap-2">
                <label className={`text-xs font-bold uppercase tracking-wide hidden sm:block ${isLightTheme ? 'text-gray-500' : 'text-gray-300'}`}>View:</label>
                <select 
                    value={activeCategory}
                    onChange={(e) => setActiveCategory(e.target.value as any)}
                    className={`text-xs font-bold rounded border px-3 py-1.5 outline-none cursor-pointer transition-colors ${
                        isLightTheme 
                        ? 'bg-white text-gray-800 border-gray-200' 
                        : 'bg-black/30 text-white border-white/10'
                    }`}
                >
                    <option value="Ultimates">Ultimates</option>
                    <option value="Combat">Combat Stats</option>
                    <option value="Defense">Defenses</option>
                </select>
            </div>

            {/* Lane Filter */}
            <div className="flex items-center gap-2">
                <label className={`text-xs font-bold uppercase tracking-wide hidden sm:block ${isLightTheme ? 'text-gray-500' : 'text-gray-300'}`}>Filter:</label>
                <select 
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as FilterType)}
                    className={`text-xs font-bold rounded border px-3 py-1.5 outline-none cursor-pointer transition-colors ${
                        isLightTheme 
                        ? 'bg-white text-gray-800 border-gray-200' 
                        : 'bg-black/30 text-white border-white/10'
                    }`}
                >
                    <option value="All">All Players</option>
                    <option disabled>──────────</option>
                    <option value="Blue">Blue Team</option>
                    <option value="Red">Red Team</option>
                    <option disabled>──────────</option>
                    <option value="Top">Top Lane</option>
                    <option value="Jungle">Jungle</option>
                    <option value="Mid">Mid Lane</option>
                    <option value="Bot">Bot Lane</option>
                    <option value="Support">Support</option>
                </select>
            </div>
          </div>

          {/* Bottom Row: Sorting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                <label className={`text-xs font-bold uppercase tracking-wide ${isLightTheme ? 'text-gray-500' : 'text-gray-300'}`}>Sort:</label>
            </div>
            
            <div className="flex gap-2">
                {/* Simplified Metric Selector */}
                <select 
                    value={sortType}
                    onChange={(e) => setSortType(e.target.value as SortType)}
                    className={`text-xs font-bold rounded border px-3 py-1.5 outline-none cursor-pointer transition-colors ${
                        isLightTheme 
                        ? 'bg-white text-gray-800 border-gray-200' 
                        : 'bg-black/30 text-white border-white/10'
                    }`}
                >
                    <option value="Value">By Value</option>
                    <option value="Alphabetical">Alphabetical</option>
                </select>

                {/* Direction Toggle */}
                <button 
                    onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className={`border rounded px-2 py-1.5 transition-colors ${
                        isLightTheme 
                        ? 'bg-white hover:bg-gray-100 border-gray-200' 
                        : 'bg-black/30 hover:bg-white/10 border-white/10'
                    }`}
                    title={sortDirection === 'asc' ? "Ascending" : "Descending"}
                >
                    {sortDirection === 'asc' ? (
                        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                    ) : (
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
                    )}
                </button>
            </div>
          </div>
      </div>

      <div className="space-y-8">
        {metrics.map((metric) => {
            // Sort data specifically for THIS graph based on the global sort settings
            const sortedData = getSortedDataForMetric(metric);
            
            return (
                <div key={metric} className={`rounded-xl p-3 border animate-fade-in shadow-md transition-colors duration-300 ${
                    isLightTheme 
                    ? 'bg-white/70 border-gray-200' 
                    : sortType === 'Value' ? 'border-white/10 bg-black/20 backdrop-blur-sm' : 'border-white/5 bg-black/10 backdrop-blur-sm'
                }`}>
                    <div className="flex items-center justify-between mb-3 px-2">
                        <h3 className={`text-[10px] font-black uppercase tracking-[0.2em] ${isLightTheme ? 'text-gray-400' : 'text-gray-500'}`}>{metric}</h3>
                        {sortType === 'Value' && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${isLightTheme ? 'bg-gray-100 text-gray-500' : 'bg-white/10 text-gray-300'}`}>Sorted</span>
                        )}
                    </div>
                    {sortedData.length > 0 ? (
                        <div style={{ height: dynamicHeight, width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={sortedData} layout="vertical" margin={{ left: 20, right: 45, top: 0, bottom: 0 }} barGap={4}>
                                <CartesianGrid horizontal={false} stroke={isLightTheme ? "#000000" : "#ffffff"} strokeOpacity={0.05} />
                                <XAxis type="number" hide />
                                <YAxis 
                                    dataKey="name" 
                                    type="category" 
                                    width={90} 
                                    tick={<CustomYAxisTick />}
                                    axisLine={false}
                                    tickLine={false}
                                    interval={0} 
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: isLightTheme ? '#ffffff' : '#111827', 
                                        borderColor: isLightTheme ? '#e5e7eb' : '#374151', 
                                        color: isLightTheme ? '#111827' : '#f3f4f6', 
                                        borderRadius: '0.5rem', 
                                        fontSize: '12px' 
                                    }}
                                    itemStyle={{ color: isLightTheme ? '#374151' : '#e5e7eb' }}
                                    cursor={{fill: isLightTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'}}
                                />
                                <Bar dataKey={metric} barSize={20} radius={[0, 4, 4, 0]} animationDuration={500}>
                                    {sortedData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={getThemeColor(index)} opacity={sortType === 'Value' ? 1 : 0.8} />
                                    ))}
                                    <LabelList dataKey={metric} position="right" fill={isLightTheme ? "#4b5563" : "#9ca3af"} fontSize={11} fontWeight="bold" />
                                </Bar>
                            </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className={`h-20 flex items-center justify-center text-xs italic border border-dashed rounded ${isLightTheme ? 'text-gray-400 border-gray-200' : 'text-gray-500 border-white/10'}`}>
                            No champions match this filter.
                        </div>
                    )}
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default StatsPanel;
