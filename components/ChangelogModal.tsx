
import React from 'react';

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose, accentColor }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-md w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
          <h2 className={`text-lg font-bold uppercase tracking-wider ${accentColor}`}>
            Patch Notes: v1.2
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-6 text-sm text-gray-300 leading-relaxed">
          
          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <span className="text-cyan-400">●</span> Winter Wonder Theme
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li><strong>New Look:</strong> Winter Wonder is now a bright, icy "Light Mode" theme.</li>
              <li><strong>UI Update:</strong> Adjusted card backgrounds and text contrast for better visibility on light backgrounds.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <span className="text-green-400">●</span> Stats Panel 2.0
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li><strong>Visual Upgrade:</strong> Champion portraits now appear directly on the charts for instant recognition.</li>
              <li><strong>Smart Sorting:</strong> Graphs now automatically sort from Largest to Smallest by default.</li>
            </ul>
          </section>

          <section>
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <span className="text-purple-400">●</span> Logic & Styling Updates
            </h3>
            <ul className="list-disc pl-5 space-y-1 text-gray-400">
              <li><strong>CC Detection Fix:</strong> Improved Regex to correctly identify CC abilities.</li>
              <li><strong>New Theme:</strong> Added "iOS 18 Glass" theme.</li>
            </ul>
          </section>

          <div className="bg-white/5 p-3 rounded border border-white/5 text-xs font-mono text-gray-500">
             Github Commit Message:<br/>
             "Update Winter Wonder to light mode, v1.2 bump."
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/20 text-center">
          <button 
            onClick={onClose}
            className={`px-6 py-2 rounded-lg font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-all w-full`}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChangelogModal;
