
import React, { useState } from 'react';
import { EnrichedParticipant } from '../types';
import RiotService from '../services/riotService';

interface MultiSearchPanelProps {
  participants: EnrichedParticipant[];
  progress: number;
  onParticipantClick?: (championName: string) => void;
}

const RankBadge: React.FC<{ tier: string; rank: string; lp: number }> = ({ tier, rank, lp }) => {
  const getColor = (t: string) => {
    switch (t.toLowerCase()) {
      case 'iron': return 'text-gray-500 border-gray-600';
      case 'bronze': return 'text-orange-700 border-orange-800';
      case 'silver': return 'text-gray-400 border-gray-400';
      case 'gold': return 'text-yellow-500 border-yellow-600';
      case 'platinum': return 'text-cyan-400 border-cyan-500';
      case 'emerald': return 'text-emerald-400 border-emerald-500';
      case 'diamond': return 'text-blue-400 border-blue-500';
      case 'master': return 'text-purple-400 border-purple-500';
      case 'grandmaster': return 'text-red-400 border-red-500';
      case 'challenger': return 'text-yellow-300 border-yellow-400';
      default: return 'text-gray-400 border-gray-600';
    }
  };

  const style = getColor(tier);

  return (
    <div className={`text-[10px] font-bold uppercase border px-1.5 py-0.5 rounded ${style} bg-black/40`}>
      {tier} {rank} <span className="text-white opacity-60 ml-1">{lp}LP</span>
    </div>
  );
};

const PlayerCard: React.FC<{ p: EnrichedParticipant, onClick?: (name: string) => void }> = ({ p, onClick }) => {
  const version = RiotService.getVersion();
  // Get Champion Image from ID
  const champData = RiotService.getChampionByKey(p.championId);
  const champImg = champData ? `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${champData.image.full}` : '';

  const rank = p.rankSolo;
  const winRate = rank ? Math.round((rank.wins / (rank.wins + rank.losses)) * 100) : 0;
  const totalGames = rank ? rank.wins + rank.losses : 0;

  return (
    <div 
        className="flex items-center gap-3 p-2 bg-white/5 border border-white/5 rounded-lg mb-2 cursor-pointer hover:bg-white/10 transition-colors active:scale-95 transform"
        onClick={() => onClick && p.championName && onClick(p.championName)}
    >
      {/* Champ Icon */}
      <div className="relative shrink-0">
        <img src={champImg} alt="Champ" className="w-10 h-10 rounded-full border border-white/20" />
        <div className="absolute -bottom-1 -right-1 bg-black text-white text-[9px] px-1 rounded border border-gray-700">
          {winRate > 0 ? `${winRate}%` : '-'}
        </div>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <div className="truncate text-xs font-bold text-gray-200">
            {p.riotId}
          </div>
          {p.isLoaded ? (
            rank ? (
                <RankBadge tier={rank.tier} rank={rank.rank} lp={rank.leaguePoints} />
            ) : (
                <span className="text-[10px] text-gray-500">Unranked</span>
            )
          ) : (
            <span className="text-[10px] text-gray-400 animate-pulse">Loading...</span>
          )}
        </div>
        
        <div className="flex justify-between items-center">
            {/* W/L */}
            <div className="text-[10px] text-gray-400">
               {p.isLoaded ? (
                   rank ? `${rank.wins}W ${rank.losses}L (${totalGames} Games)` : 'No recent ranked data'
               ) : (
                   <span className="opacity-50">...</span>
               )}
            </div>
            
            {/* Mastery Icons */}
            <div className="flex -space-x-1">
               {p.mastery?.map(m => {
                   const mChamp = RiotService.getChampionByKey(m.championId);
                   if (!mChamp) return null;
                   return (
                       <img 
                          key={m.championId}
                          src={`https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${mChamp.image.full}`}
                          alt={mChamp.name}
                          className="w-5 h-5 rounded-full border border-gray-900"
                          title={`${mChamp.name} - ${m.championPoints.toLocaleString()} pts`}
                       />
                   )
               })}
            </div>
        </div>
      </div>
    </div>
  );
};

const MultiSearchPanel: React.FC<MultiSearchPanelProps> = ({ participants, progress, onParticipantClick }) => {
  const [copied, setCopied] = useState(false);
  
  const blueTeam = participants.filter(p => p.teamId === 100);
  const redTeam = participants.filter(p => p.teamId === 200);

  if (participants.length === 0) return <div className="text-center p-8 text-gray-500">No live game data available.</div>;

  const handleCopyOpGg = () => {
      // Create a comma separated list of Riot IDs with format: "Name #Tag,Name #Tag"
      const text = participants
        .map(p => {
            if (!p.riotId) return '';
            // Insert space before hash if it exists
            return p.riotId.includes('#') ? p.riotId.replace('#', ' #') : p.riotId;
        })
        .filter(id => id) // Ensure no empties
        .join(',');

      navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }).catch(err => {
          console.error('Failed to copy', err);
      });
  };

  return (
    <div className="w-full pb-20">
      {/* Progress Bar */}
      {progress > 0 && progress < 100 && (
        <div className="mb-4">
             <div className="flex justify-between text-[10px] text-gray-400 mb-1 uppercase tracking-wide font-bold">
                 <span>Loading Rank & Mastery Data...</span>
                 <span>{progress}%</span>
             </div>
             <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                />
             </div>
        </div>
      )}
      
      {/* OP.GG Quick Actions */}
      <div className="flex gap-2 mb-6">
        <button 
            onClick={handleCopyOpGg}
            className={`flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wide border transition-all flex items-center justify-center gap-2 ${
                copied 
                ? 'bg-green-500/20 border-green-500 text-green-400' 
                : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10 hover:text-white'
            }`}
        >
            {copied ? (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    <span>Copied!</span>
                </>
            ) : (
                <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                    <span>Copy for OP.GG</span>
                </>
            )}
        </button>
        
        <a 
            href="https://op.gg/lol/multisearch" 
            target="_blank" 
            rel="noreferrer"
            className="flex-1 py-3 px-2 rounded-lg text-xs font-bold uppercase tracking-wide bg-[#5383E8]/20 border border-[#5383E8]/50 text-[#5383E8] hover:bg-[#5383E8]/30 transition-all flex items-center justify-center gap-2"
        >
            <span>Open OP.GG</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Blue Team */}
        <div>
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-3 border-b border-blue-500/20 pb-1">Blue Team</h3>
            {blueTeam.map(p => <PlayerCard key={p.puuid} p={p} onClick={onParticipantClick} />)}
        </div>

        {/* Red Team */}
        <div>
            <h3 className="text-xs font-bold text-red-400 uppercase tracking-widest mb-3 border-b border-red-500/20 pb-1">Red Team</h3>
            {redTeam.map(p => <PlayerCard key={p.puuid} p={p} onClick={onParticipantClick} />)}
        </div>
      </div>
    </div>
  );
};

export default MultiSearchPanel;
