
import React, { useState, useEffect } from 'react';
import { RecentSearch, EnrichedParticipant, Theme, SearchTag } from '../types';
import RiotService from '../services/riotService';

interface HistoryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: RecentSearch) => void;
  item: RecentSearch | null;
  theme: Theme;
}

const HistoryEditModal: React.FC<HistoryEditModalProps> = ({ isOpen, onClose, onSave, item, theme }) => {
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [selectedTags, setSelectedTags] = useState<SearchTag[]>([]);

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  useEffect(() => {
    if (item) {
        setTitle(item.customTitle || `${item.gameName}'s Game`);
        // ISO Date String for input type="datetime-local"
        const date = new Date(item.timestamp);
        // Format to YYYY-MM-DDTHH:MM
        const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setDateStr(localIso);
        setSelectedTags(item.tags || []);
    }
  }, [item, isOpen]);

  if (!isOpen || !item || !item.snapshot) return null;

  const handleSave = () => {
      onSave({
          ...item,
          customTitle: title,
          timestamp: new Date(dateStr).getTime(),
          tags: selectedTags
      });
      onClose();
  };

  const toggleTag = (p: EnrichedParticipant) => {
      const exists = selectedTags.find(t => t.championId === p.championId);
      if (exists) {
          setSelectedTags(prev => prev.filter(t => t.championId !== p.championId));
      } else {
          setSelectedTags(prev => [...prev, { championId: p.championId, teamId: p.teamId }]);
      }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`border rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${
          isLightTheme 
          ? 'bg-white border-gray-200 text-gray-800' 
          : 'bg-gray-900 border-white/10 text-gray-300'
      }`}>
        
        {/* Header */}
        <div className={`p-4 border-b ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <h2 className="text-sm font-bold uppercase tracking-wider">Edit Match Details</h2>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4 overflow-y-auto">
            <div>
                <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">Match Title</label>
                <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    className={`w-full p-2 rounded text-sm font-bold border outline-none focus:ring-2 ring-blue-500/50 ${
                        isLightTheme ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/10'
                    }`} 
                />
            </div>
            
            <div>
                <label className="block text-[10px] uppercase font-bold opacity-60 mb-1">Date & Time</label>
                <input 
                    type="datetime-local" 
                    value={dateStr} 
                    onChange={e => setDateStr(e.target.value)}
                    className={`w-full p-2 rounded text-sm font-bold border outline-none focus:ring-2 ring-blue-500/50 ${
                        isLightTheme ? 'bg-gray-50 border-gray-300' : 'bg-black/30 border-white/10'
                    }`} 
                />
            </div>

            <div>
                <label className="block text-[10px] uppercase font-bold opacity-60 mb-2">Tag Key Champions (Blue = Ally, Red = Enemy)</label>
                <div className="grid grid-cols-5 gap-2">
                    {item.snapshot.participants.map(p => {
                        const isSelected = selectedTags.some(t => t.championId === p.championId);
                        const champ = RiotService.getChampionByKey(p.championId);
                        const img = champ ? `https://ddragon.leagueoflegends.com/cdn/${RiotService.getVersion()}/img/champion/${champ.image.full}` : '';
                        
                        return (
                            <button
                                key={p.puuid}
                                onClick={() => toggleTag(p)}
                                className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                    isSelected
                                    ? (p.teamId === 100 ? 'border-blue-500 scale-105 shadow-lg shadow-blue-500/20' : 'border-red-500 scale-105 shadow-lg shadow-red-500/20')
                                    : 'border-transparent opacity-60 hover:opacity-100'
                                }`}
                            >
                                <img src={img} className="w-full h-full object-cover" />
                                <div className={`absolute bottom-0 inset-x-0 h-1 ${p.teamId === 100 ? 'bg-blue-500' : 'bg-red-500'}`} />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className={`p-4 border-t flex gap-3 ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
            <button onClick={onClose} className="flex-1 py-2 rounded text-xs font-bold opacity-60 hover:opacity-100">Cancel</button>
            <button 
                onClick={handleSave}
                className="flex-1 py-2 rounded bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 shadow-lg"
            >
                Save Changes
            </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryEditModal;
