
import React from 'react';
import { Theme } from '../types';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  theme?: Theme;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, accentColor, theme }) => {
  if (!isOpen) return null;

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder' || theme === 'Ionia';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`border rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh] ${
          isLightTheme 
          ? 'bg-white border-gray-200 text-gray-800' 
          : 'bg-gray-900 border-white/10 text-gray-300'
      }`}>
        {/* Header */}
        <div className={`p-4 border-b flex justify-between items-center ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <h2 className={`text-lg font-bold uppercase tracking-wider ${accentColor}`}>
            Patch Notes: v1.5
          </h2>
          <button onClick={onClose} className={`transition-colors ${isLightTheme ? 'text-gray-400 hover:text-gray-600' : 'text-gray-400 hover:text-white'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className={`p-5 overflow-y-auto space-y-6 text-sm leading-relaxed ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>
          
          <section>
            <h3 className={`font-bold mb-2 flex items-center gap-2 ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>
              <span className="text-green-400">●</span> Layout Fixes
            </h3>
            <ul className={`list-disc pl-5 space-y-1 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}>
              <li><strong>Sticky Header Logic:</strong> Consolidated the Search Header and Tab Bar into a single sticky container. This resolves the issue where the menu bar would cover content (like OP.GG buttons) or leave gaps on certain screen sizes.</li>
            </ul>
          </section>

          <section>
            <h3 className={`font-bold mb-2 flex items-center gap-2 ${isLightTheme ? 'text-gray-900' : 'text-white'}`}>
              <span className="text-cyan-400">●</span> Region Themes Expansion (Previous)
            </h3>
            <p className="mb-2">Immerse yourself in Runeterra with 4 new region-inspired themes:</p>
            <ul className={`list-disc pl-5 space-y-1 ${isLightTheme ? 'text-gray-600' : 'text-gray-400'}`}>
              <li><strong>Shadow Isles:</strong> Dark teal mists and spectral greens.</li>
              <li><strong>Bilgewater:</strong> Deep rusty wood tones and pirate gold.</li>
              <li><strong>Ionia:</strong> Spiritual white, pastel pinks, and calming teal (Light Mode).</li>
              <li><strong>Shurima:</strong> Dark imperial gold and desert sands.</li>
            </ul>
          </section>

          <div className={`p-3 rounded border text-xs font-mono ${
              isLightTheme ? 'bg-gray-100 border-gray-200 text-gray-500' : 'bg-white/5 border-white/5 text-gray-500'
          }`}>
             Github Commit Message:<br/>
             "Fixed sticky layout offset issues to prevent content overlap."
          </div>

        </div>

        {/* Footer */}
        <div className={`p-4 border-t text-center ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/10'}`}>
          <button 
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-bold text-sm transition-all w-full ${
                isLightTheme 
                ? 'bg-white border border-gray-300 hover:bg-gray-50 text-gray-700' 
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
