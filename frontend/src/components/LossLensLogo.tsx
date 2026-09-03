import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  collapsed?: boolean;
  showTagline?: boolean;
  className?: string;
}

export const LossLensLogo: React.FC<LogoProps> = ({
  size = 'md',
  collapsed = false,
  showTagline = true,
  className = ''
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11'
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl'
  };

  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Standalone Distinctive Logo Mark */}
      <div className={`relative flex items-center justify-center ${iconSizes[size]} bg-slate-900 rounded-xl shadow-sm border border-slate-800 transition-all duration-200 hover:border-blue-500/50 group`}>
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full p-1.5 text-white"
        >
          {/* Outer Lens Frame */}
          <circle cx="20" cy="20" r="16" stroke="currentColor" strokeWidth="2.2" strokeOpacity="0.3" />
          
          {/* Active Focus Aperture Arcs */}
          <path
            d="M20 6A14 14 0 0 1 34 20"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M20 34A14 14 0 0 1 6 20"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Connected Entity Nodes inside the Lens */}
          <line x1="13" y1="15" x2="27" y2="15" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="2 2" />
          <line x1="13" y1="15" x2="20" y2="27" stroke="#94a3b8" strokeWidth="1.5" />
          <line x1="27" y1="15" x2="20" y2="27" stroke="#94a3b8" strokeWidth="1.5" />

          {/* Entity Node Dots */}
          <circle cx="13" cy="15" r="2.5" fill="#3b82f6" />
          <circle cx="27" cy="15" r="2.5" fill="#9333ea" />
          <circle cx="20" cy="27" r="3" fill="#dc2626" />
          <circle cx="20" cy="27" r="1.2" fill="#ffffff" />
        </svg>

        {/* Subtle AI Pulse indicator */}
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white"></span>
      </div>

      {/* Wordmark (when expanded) */}
      {!collapsed && (
        <div className="flex flex-col justify-center">
          <div className={`font-bold tracking-tight text-slate-900 leading-none ${textSizes[size]}`}>
            Loss<span className="text-blue-600">Lens</span>
          </div>
          {showTagline && (
            <span className="text-[10px] font-semibold tracking-wider text-slate-500 uppercase mt-0.5">
              Risk Intelligence
            </span>
          )}
        </div>
      )}
    </div>
  );
};
