
import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Theme, MetaChampion } from '../types';
import RiotService from '../services/riotService';

interface MetaPanelProps {
  theme: Theme;
}

const MetaPanel: React.FC<MetaPanelProps> = ({ theme }) => {
  const [role, setRole] = useState('Top');
  const [sort, setSort] = useState<'Tier' | 'Win' | 'Pick' | 'Ban'>('Tier');
  const [data, setData] = useState<MetaChampion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  const fetchMetaData = async () => {
    setIsLoading(true);
    setError('');
    setData([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Generate a JSON object containing the top 15 meta champions for the League of Legends role: ${role}. 
      Return an array of objects. Each object must have:
      - name: Champion name (string)
      - tier: S+, S, A, B, etc. (string)
      - winRate: e.g. "52.4%" (string)
      - pickRate: e.g. "12.1%" (string)
      - banRate: e.g. "30.5%" (string)
      - role: "${role}" (string)
      Ensure the data reflects current high-elo meta trends.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        tier: { type: Type.STRING },
                        winRate: { type: Type.STRING },
                        pickRate: { type: Type.STRING },
                        banRate: { type: Type.STRING },
                        role: { type: Type.STRING },
                    }
                }
            }
        }
      });

      if (response && response.text) {
          const parsed = JSON.parse(response.text);
          if (Array.isArray(parsed)) {
              setData(parsed);
          } else {
              throw new Error('Invalid Data Format');
          }
      }
    } catch (e) {
      console.error(e);
      setError('Failed to load meta stats. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch on mount or role change
  useEffect(() => {
      fetchMetaData();
  }, [role]);

  const sortedData = [...data].sort((a, b) => {
      if (sort === 'Tier') {
          const tiers = ['S+', 'S', 'A', 'B', 'C', 'D'];
          const idxA = tiers.indexOf(a.tier.replace(/[^A-Z+]/g, '')) === -1 ? 99 : tiers.indexOf(a.tier.replace(/[^A-Z+]/g, ''));
          const idxB = tiers.indexOf(b.tier.replace(/[^A-Z+]/g, '')) === -1 ? 99 : tiers.indexOf(b.tier.replace(/[^A-Z+]/g, ''));
          return idxA - idxB;
      }
      const valA = parseFloat(a[sort === 'Win' ? 'winRate' : sort === 'Pick' ? 'pickRate' : 'banRate']);
      const valB = parseFloat(b[sort === 'Win' ? 'winRate' : sort === 'Pick' ? 'pickRate' : 'banRate']);
      return valB - valA;
  });

  const getTierColor = (tier: string) => {
      if (tier.includes('S')) return 'text-orange-400 border-orange-500/30 bg-orange-500/10';
      if (tier.includes('A')) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
      if (tier.includes('B')) return 'text-green-400 border-green-500/30 bg-green-500/10';
      return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
  };

  return (
    <div className="pb-24">
        {/* Header & Controls */}
        <div className={`sticky top-0 z-10 p-3 border-b mb-3 backdrop-blur-md rounded-xl shadow-sm transition-colors ${
            isLightTheme ? 'bg-white/90 border-gray-200' : 'bg-black/40 border-white/5'
        }`}>
            <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                    <h3 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
                        <span className="material-icons text-sm">poll</span>
                        Live Meta Trends (AI)
                    </h3>
                    <button 
                        onClick={fetchMetaData}
                        disabled={isLoading}
                        className={`text-[10px] px-2 py-1 rounded font-bold border transition-all flex items-center gap-1 ${
                            isLightTheme ? 'bg-gray-100 hover:bg-gray-200' : 'bg-white/5 hover:bg-white/10'
                        }`}
                    >
                        <svg className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        Refresh
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                    {(['Top', 'Jungle', 'Mid', 'Bot', 'Support'] as string[]).map(r => (
                        <button
                            key={r}
                            onClick={() => setRole(r)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border whitespace-nowrap transition-colors ${
                                role === r 
                                ? 'bg-purple-600 text-white border-purple-500 shadow-md' 
                                : isLightTheme ? 'bg-white text-gray-500 border-gray-200' : 'bg-white/5 text-gray-400 border-white/10'
                            }`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* Sorting Header */}
        <div className="grid grid-cols-5 gap-2 px-3 pb-2 text-[9px] font-black uppercase tracking-wider text-center opacity-60">
            <div className="col-span-2 text-left">Champion</div>
            <div className="cursor-pointer hover:text-blue-400" onClick={() => setSort('Win')}>Win %</div>
            <div className="cursor-pointer hover:text-blue-400" onClick={() => setSort('Pick')}>Pick %</div>
            <div className="cursor-pointer hover:text-blue-400" onClick={() => setSort('Ban')}>Ban %</div>
        </div>

        {/* Loading State */}
        {isLoading && data.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-60">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-mono">Analyzing Meta...</span>
            </div>
        )}

        {/* Data List */}
        <div className="space-y-1 px-1">
            {sortedData.map((champ, idx) => {
                const champData = Object.values(RiotService.getChampionIdToNameMap()).find(id => id === champ.name) 
                                  || { id: champ.name.replace(/\s+/g, '') }; // Fallback rough match
                // We need to match name to ID for image. 
                // Let's iterate champion summary list to be safe
                const summary = RiotService.getChampionSummaryList().find(c => c.name === champ.name);
                const img = summary ? `https://ddragon.leagueoflegends.com/cdn/${RiotService.getVersion()}/img/champion/${summary.image}` : '';

                return (
                    <div key={idx} className={`grid grid-cols-5 gap-2 items-center p-2 rounded-lg border transition-colors ${
                        isLightTheme 
                        ? 'bg-white border-gray-100 hover:border-gray-300' 
                        : 'bg-black/20 border-white/5 hover:bg-white/5'
                    }`}>
                        <div className="col-span-2 flex items-center gap-3">
                            <span className={`text-[10px] font-bold w-6 text-center border rounded px-1 py-0.5 ${getTierColor(champ.tier)}`}>
                                {champ.tier}
                            </span>
                            <div className="flex items-center gap-2">
                                <img src={img} className="w-8 h-8 rounded-full border border-gray-600" alt={champ.name} />
                                <span className={`text-xs font-bold truncate ${isLightTheme ? 'text-gray-800' : 'text-gray-200'}`}>{champ.name}</span>
                            </div>
                        </div>
                        <div className={`text-center text-xs font-mono font-bold ${
                            parseFloat(champ.winRate) >= 52 ? 'text-green-500' : parseFloat(champ.winRate) <= 48 ? 'text-red-500' : (isLightTheme ? 'text-gray-600' : 'text-gray-400')
                        }`}>
                            {champ.winRate}
                        </div>
                        <div className={`text-center text-xs font-mono opacity-80 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}>
                            {champ.pickRate}
                        </div>
                        <div className={`text-center text-xs font-mono opacity-80 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}>
                            {champ.banRate}
                        </div>
                    </div>
                );
            })}
        </div>

        {error && (
            <div className="p-4 text-center">
                <p className="text-red-400 text-xs mb-2">{error}</p>
                <button onClick={fetchMetaData} className="text-xs underline text-gray-500">Retry</button>
            </div>
        )}
        
        <div className={`mt-4 text-center text-[9px] opacity-40 italic ${isLightTheme ? 'text-gray-500' : 'text-gray-500'}`}>
            Data generated by Gemini AI. May not reflect exact real-time API stats.
        </div>
    </div>
  );
};

export default MetaPanel;
