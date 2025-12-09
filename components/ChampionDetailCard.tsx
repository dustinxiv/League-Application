
import React from 'react';
import { ChampionDetail, ChampionSpell, Theme } from '../types';

interface ChampionDetailCardProps {
  champion: ChampionDetail;
  globalHaste: number;
  id?: string;
  theme: Theme;
}

// Regex reused for display consistency
// Matches root words followed by any characters (e.g., 'charm' matches 'charms', 'charmed')
const CC_REGEX = /\b(stun|root|suppress|airborne|knock|sleep|charm|fear|taunt|suspen|ground|silence|blind|polymorph|slow|snare|flee|berserk|drowsy)\w*/i;

const SpellRow: React.FC<{ spell: ChampionSpell; hotkey: string; haste: number; version: string; isLightTheme: boolean }> = ({ spell, hotkey, haste, version, isLightTheme }) => {
  const isCC = CC_REGEX.test(spell.description);

  const getValueDisplay = (val: number | number[]) => {
    if (Array.isArray(val)) {
        if (val.every(v => v === val[0])) return val[0];
        return val.join('/');
    }
    return val;
  };

  const getCooldownDisplay = (baseCd: number | number[]) => {
    const cdList = Array.isArray(baseCd) ? baseCd : [baseCd];
    const reduced = cdList.map(c => (c / (1 + (haste / 100))).toFixed(1));
    if (reduced.every(val => val === reduced[0])) return reduced[0];
    return reduced.join('/');
  };

  // Tooltip Parser
  const parseTooltip = () => {
    let text = spell.tooltip || spell.description;
    
    // Replace effects
    text = text.replace(/\{\{\s*e(\d+)\s*\}\}/gi, (match, index) => {
        const i = parseInt(index, 10);
        const val = spell.effect ? spell.effect[i] : null;
        if (!val) return '?';
        return Array.isArray(val) ? String(val.join('/')) : String(val);
    });

    // Replace vars
    text = text.replace(/\{\{\s*([a-z])(\d+)\s*\}\}/gi, (match, char, index) => {
        const key = char + index;
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

    return text;
  };

  return (
    <div className={`p-3 rounded-lg border flex gap-3 mb-2 shadow-sm transition-colors ${
        isLightTheme 
        ? (isCC ? 'bg-red-50 border-red-200' : 'bg-gray-100 border-gray-200') 
        : (isCC ? 'bg-red-900/10 border-red-500/30' : 'bg-black/20 border-white/5')
    }`}>
        <div className="relative shrink-0">
            <img 
                src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/spell/${spell.image.full}`} 
                alt={spell.name} 
                className={`w-12 h-12 rounded shadow-sm ${isCC ? 'border border-red-500' : 'border border-white/10'}`} 
            />
            <span className="absolute -top-1.5 -left-1.5 bg-gray-800 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-gray-600 shadow-lg z-10">
                {hotkey}
            </span>
        </div>
        <div className="flex-1 min-w-0">
             <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold truncate ${isLightTheme ? 'text-gray-900' : 'text-gray-100'}`}>{spell.name}</span>
                    {isCC && <span className="text-[9px] bg-red-600 text-white px-1 rounded font-bold tracking-wider">CC</span>}
                </div>
                <div className={`text-xs font-mono font-bold px-1 rounded ${isLightTheme ? 'text-yellow-700 bg-yellow-100' : 'text-yellow-500 bg-yellow-500/10'}`}>
                    {getCooldownDisplay(spell.cooldown)}s
                </div>
             </div>
             
             {/* Rich Description */}
             <div 
                className={`text-xs leading-relaxed mb-2 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}
                dangerouslySetInnerHTML={{ __html: parseTooltip() }}
             />

             {/* Footer Stats */}
             <div className={`flex gap-3 text-[10px] font-mono pt-1 mt-1 border-t ${isLightTheme ? 'text-gray-500 border-gray-200' : 'text-gray-500 border-white/5'}`}>
                 <div>
                    <span className="text-purple-400">Rng:</span> {getValueDisplay(spell.range)}
                 </div>
                 <div>
                    <span className="text-blue-400">Cost:</span> {getValueDisplay(spell.cost)}
                 </div>
             </div>
        </div>
    </div>
  );
};

const ChampionDetailCard: React.FC<ChampionDetailCardProps> = ({ champion, globalHaste, id, theme }) => {
  if (!champion) return null;

  const version = champion.version || '14.1.1';
  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  return (
    <div id={id} className={`rounded-xl overflow-hidden border shadow-lg mb-4 scroll-mt-32 transition-colors ${
        isLightTheme ? 'bg-white border-gray-200' : 'bg-black/40 border-white/10 backdrop-blur-md'
    }`}>
      {/* Header Splash */}
      <div className="relative h-32 overflow-hidden group">
        <img 
            src={`https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`} 
            alt={champion.name} 
            className="w-full h-full object-cover object-top opacity-60 mask-image-gradient transition-all duration-700 ease-out group-hover:scale-105 group-hover:opacity-100 group-hover:brightness-110"
        />
        <div className={`absolute bottom-0 left-0 w-full p-3 bg-gradient-to-t ${isLightTheme ? 'from-white via-white/80 to-transparent' : 'from-black/80 to-transparent'}`}>
            <h2 className={`text-2xl font-bold tracking-wide drop-shadow-md ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>{champion.name}</h2>
            <p className={`text-sm drop-shadow ${isLightTheme ? 'text-gray-500' : 'text-gray-300'}`}>{champion.title}</p>
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
      </div>
    </div>
  );
};

export default ChampionDetailCard;
