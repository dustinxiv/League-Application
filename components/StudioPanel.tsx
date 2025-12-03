import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { ChampionDetail, Theme, EnrichedParticipant } from '../types';

interface StudioPanelProps {
  champions: ChampionDetail[];
  participants: EnrichedParticipant[];
  theme: Theme;
}

const StudioPanel: React.FC<StudioPanelProps> = ({ champions, participants, theme }) => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setGeneratedImage(null);

    // 1. Construct the Prompt Automatically
    let prompt = "";
    
    // Check if we have team data (Live Game)
    const blueTeam = participants.filter(p => p.teamId === 100);
    const redTeam = participants.filter(p => p.teamId === 200);

    if (blueTeam.length > 0 || redTeam.length > 0) {
        const blueNames = blueTeam.map(p => p.championName || 'Unknown').join(', ');
        const redNames = redTeam.map(p => p.championName || 'Unknown').join(', ');
        
        prompt = `A cinematic, high-fidelity 3D render of a chaotic 5v5 team battle in League of Legends Summoner's Rift. 
        On the left side (Blue Team): ${blueNames}. 
        On the right side (Red Team): ${redNames}. 
        They are clashing in the middle lane. Dynamic action shots, magical abilities flying, explosions, dramatic lighting, detailed textures, 8k resolution, masterpiece.`;
    } else if (champions.length > 0) {
        // Manual Pool (No teams)
        const names = champions.map(c => c.name).join(', ');
        prompt = `A cinematic, epic group poster of League of Legends champions: ${names}. 
        They are standing in a heroic pose on Summoner's Rift. High detailed, dramatic lighting, 8k resolution, masterpiece, video game art style.`;
    } else {
        setErrorMsg("No champions selected. Please Scout a game or add champions manually.");
        setIsLoading(false);
        return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] }
      });

      // Extract image from response
      let foundImage = false;
      if (response && response.candidates && response.candidates[0].content.parts) {
          for (const part of response.candidates[0].content.parts) {
              if (part.inlineData) {
                  const base64EncodeString = part.inlineData.data;
                  setGeneratedImage(`data:image/png;base64,${base64EncodeString}`);
                  foundImage = true;
                  break;
              }
          }
      }

      if (!foundImage) {
          throw new Error('No image returned from Gemini.');
      }

    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Failed to generate image.');
    } finally {
      setIsLoading(false);
    }
  };

  const getThemeBorder = () => {
      switch(theme) {
          case 'iOS 18 Glass': return 'border-blue-500/50';
          default: return 'border-amber-500/50';
      }
  };

  return (
    <div className="space-y-6 pb-24 animate-fade-in">
      <div className="bg-white/5 p-4 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 mb-4 border-b border-white/10 pb-2">
             <span className="material-icons text-2xl text-purple-400">✨</span>
             <div>
                <h2 className="text-sm font-bold uppercase opacity-80">Nano Banana Studio</h2>
                <p className="text-[10px] text-gray-400">Powered by Gemini 2.5 Flash Image</p>
             </div>
        </div>

        {/* Content Preview */}
        <div className="space-y-4">
            <div className="bg-black/40 rounded-lg p-3 border border-white/5">
                <h3 className="text-xs font-bold text-gray-400 uppercase mb-2">Matchup Preview</h3>
                {participants.length > 0 ? (
                    <div className="flex justify-between items-start gap-4">
                        {/* Blue */}
                        <div className="flex-1">
                            <h4 className="text-[10px] text-blue-400 font-bold uppercase mb-1">Blue Team</h4>
                            <div className="flex flex-wrap gap-1">
                                {participants.filter(p => p.teamId === 100).map((p, i) => (
                                    <span key={i} className="text-[10px] bg-blue-900/30 text-blue-200 px-1.5 py-0.5 rounded border border-blue-500/20">
                                        {p.championName || 'Unknown'}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {/* VS */}
                        <div className="text-xs font-black text-gray-600 self-center">VS</div>
                        {/* Red */}
                        <div className="flex-1 text-right">
                            <h4 className="text-[10px] text-red-400 font-bold uppercase mb-1">Red Team</h4>
                            <div className="flex flex-wrap gap-1 justify-end">
                                {participants.filter(p => p.teamId === 200).map((p, i) => (
                                    <span key={i} className="text-[10px] bg-red-900/30 text-red-200 px-1.5 py-0.5 rounded border border-red-500/20">
                                        {p.championName || 'Unknown'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-center">
                        <h4 className="text-[10px] text-gray-400 font-bold uppercase mb-1">Manual Pool</h4>
                        <div className="flex flex-wrap gap-1 justify-center">
                             {champions.length > 0 ? champions.map(c => (
                                <span key={c.id} className="text-[10px] bg-gray-700 text-gray-200 px-1.5 py-0.5 rounded border border-gray-600">
                                    {c.name}
                                </span>
                             )) : <span className="text-xs text-gray-600 italic">No champions selected</span>}
                        </div>
                    </div>
                )}
            </div>

            {/* Generate Button */}
            <button 
                onClick={handleGenerate}
                disabled={isLoading || champions.length === 0}
                className={`w-full py-4 rounded-lg font-black text-sm uppercase tracking-widest transition-all shadow-xl relative overflow-hidden group ${
                    isLoading 
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-yellow-600 to-amber-600 hover:brightness-110 text-white'
                }`}
            >
                <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                        <>Processing...</>
                    ) : (
                        <>
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                           Generate Epic 5v5 Scene
                        </>
                    )}
                </span>
                {!isLoading && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>}
            </button>
            
            {errorMsg && <div className="text-red-400 text-xs text-center bg-red-900/20 p-2 rounded border border-red-500/20">{errorMsg}</div>}
        </div>
      </div>

      {/* Output Section */}
      {generatedImage && (
          <div className={`bg-white/5 p-1 rounded-xl border shadow-2xl animate-fade-in ${getThemeBorder()}`}>
              <div className="relative rounded-lg overflow-hidden">
                  <img src={generatedImage} alt="Generated" className="w-full h-auto" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex justify-between items-end">
                       <span className="text-[10px] text-gray-300 bg-black/50 px-2 py-1 rounded backdrop-blur-sm">Generated by Gemini 2.5 Flash</span>
                       <a 
                            href={generatedImage} 
                            download="lol-5v5-epic.png"
                            className="text-xs bg-white text-black font-bold px-3 py-1.5 rounded hover:bg-gray-200 transition-colors shadow-lg"
                       >
                           Download 4K
                       </a>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudioPanel;