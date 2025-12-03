
import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  accentColor: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  accentColor 
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-gray-900 border border-white/10 rounded-xl max-w-sm w-full shadow-2xl overflow-hidden transform transition-all scale-100">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 bg-white/5">
          <h2 className={`text-lg font-bold uppercase tracking-wider ${accentColor}`}>
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
            <p className="text-gray-300 text-sm leading-relaxed">{message}</p>
        </div>

        {/* Footer / Actions */}
        <div className="p-4 border-t border-white/10 bg-black/20 flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg font-bold text-sm bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
