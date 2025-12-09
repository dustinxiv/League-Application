
import React from 'react';
import { Theme } from '../types';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  accentColor: string;
  theme?: Theme;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  accentColor,
  theme
}) => {
  if (!isOpen) return null;

  const isLightTheme = theme === 'Light' || theme === 'Piltover' || theme === 'Winter Wonder';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className={`border rounded-xl max-w-sm w-full shadow-2xl overflow-hidden transform transition-all scale-100 ${
          isLightTheme 
          ? 'bg-white border-gray-200' 
          : 'bg-gray-900 border-white/10'
      }`}>
        
        {/* Header */}
        <div className={`p-4 border-b ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-white/5 border-white/10'}`}>
          <h2 className={`text-lg font-bold uppercase tracking-wider ${accentColor}`}>
            {title}
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
            <p className={`text-sm leading-relaxed ${isLightTheme ? 'text-gray-600' : 'text-gray-300'}`}>{message}</p>
        </div>

        {/* Footer / Actions */}
        <div className={`p-4 border-t flex gap-3 ${isLightTheme ? 'bg-gray-50 border-gray-200' : 'bg-black/20 border-white/10'}`}>
          <button 
            onClick={onCancel}
            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                isLightTheme 
                ? 'bg-white border border-gray-300 hover:bg-gray-100 text-gray-600' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400'
            }`}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-bold text-sm transition-colors border ${
                isLightTheme
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-transparent'
                : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
