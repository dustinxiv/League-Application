import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { ChampionDetail, Theme } from '../types';

interface StatsPanelProps {
  champions: ChampionDetail[];
  theme: Theme;
}

const StatsPanel: React.FC<StatsPanelProps> = ({ champions, theme }) => {
  const getThemeColor = (idx: number) => {
    // Simple palette generator based on index
    const bases: Record<string, string[]> = {
        'Dark': ['#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'],
        'Light': ['#0ea5e9', '#6366f1', '#d946ef', '#ef4444', '#f59e0b'],
        'Piltover': ['#c8aa6e', '#1a3c5a', '#cdbe91', '#052c52', '#f0e6d2'],
        'Shadow Isles': ['#0ac8b9', '#1a4140', '#005a56', '#9efcf6', '#2d6d6a'],
        'Bilgewater': ['#bf3b3b', '#d9a338', '#1c1815', '#6e2c2c', '#a67b2d'],
        'Ionia': ['#d63031', '#ff7675', '#dfe6e9', '#636e72', '#b2bec3'],
        'Shurima': ['#f1c40f', '#e67e22', '#f39c12', '#d35400', '#2c3e50'],
    };
    const palette = bases[theme] || bases['Dark'];
    return palette[idx % palette.length];
  };

  if (champions.length === 0) {
      return <div className="p-10 text-center text-gray-500">No champions to compare.</div>;
  }

  const data = champions.map(c => {
    // R is usually the 4th spell (index 3)
    const rSpell = c.spells[3]; 
    const rCds = rSpell ? rSpell.cooldown : [];
    
    // Helper to get CD at rank, falling back to last known if specific rank doesn't exist (e.g. Jayce)
    const getRCd = (index: number) => {
        if (rCds.length === 0) return 0;
        if (index < rCds.length) return rCds[index];
        return rCds[rCds.length - 1];
    };

    return {
      name: c.name,
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

  const metrics = ['HP', 'Range', 'MS', 'AD', 'Armor', 'MR', 'R CD 1', 'R CD 2', 'R CD 3'];

  return (
    <div className="w-full pb-24 space-y-8">
      {metrics.map((metric) => (
          <div key={metric} className="bg-black/20 rounded-lg p-2 border border-white/5">
            <h3 className="text-sm font-bold text-gray-400 mb-2 px-2 uppercase tracking-widest">{metric} Comparison</h3>
            <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ left: 0, right: 45, top: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis 
                        dataKey="name" 
                        type="category" 
                        width={60} 
                        tick={{fill: '#9ca3af', fontSize: 10}} 
                        axisLine={false}
                        tickLine={false}
                        interval={0} 
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
                        itemStyle={{ color: '#f3f4f6' }}
                        cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey={metric} barSize={16} radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getThemeColor(index)} />
                        ))}
                        <LabelList dataKey={metric} position="right" fill="#9ca3af" fontSize={10} fontWeight="bold" />
                    </Bar>
                </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
      ))}
    </div>
  );
};

export default StatsPanel;