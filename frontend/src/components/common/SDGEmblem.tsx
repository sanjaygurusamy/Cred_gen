import React from 'react';

export interface SDGEmblemProps {
  sdgNumber: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showLabel?: boolean;
  className?: string;
}

interface SDGMeta {
  number: number;
  title: string;
  shortName: string;
  bgColor: string;
  textColor: string;
}

export const SDG_METADATA: Record<number, SDGMeta> = {
  6: {
    number: 6,
    title: 'Clean Water & Sanitation',
    shortName: 'Water & Sanitation',
    bgColor: '#26BDE2',
    textColor: '#ffffff',
  },
  7: {
    number: 7,
    title: 'Affordable & Clean Energy',
    shortName: 'Clean Energy',
    bgColor: '#FCC30B',
    textColor: '#1e293b',
  },
  11: {
    number: 11,
    title: 'Sustainable Cities & Communities',
    shortName: 'Sustainable Communities',
    bgColor: '#FD9D24',
    textColor: '#ffffff',
  },
  12: {
    number: 12,
    title: 'Responsible Consumption & Production',
    shortName: 'Responsible Consumption',
    bgColor: '#BF8B2E',
    textColor: '#ffffff',
  },
  13: {
    number: 13,
    title: 'Climate Action',
    shortName: 'Climate Action',
    bgColor: '#3F7E44',
    textColor: '#ffffff',
  },
  15: {
    number: 15,
    title: 'Life on Land',
    shortName: 'Life on Land',
    bgColor: '#56C02B',
    textColor: '#ffffff',
  },
};

// Vector SVG icons for the UN SDGs
const SDGVectorIcon: React.FC<{ sdgNumber: number; color?: string }> = ({ sdgNumber, color = '#ffffff' }) => {
  switch (sdgNumber) {
    case 6:
      // SDG 6: Clean Water & Sanitation (droplet + ripple waves)
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          {/* Droplet */}
          <path
            d="M32 10C32 10 20 25.5 20 35C20 41.6 25.4 47 32 47C38.6 47 44 41.6 44 35C44 25.5 32 10 32 10Z"
            fill={color}
            fillOpacity="0.9"
          />
          {/* Water ripples below */}
          <path
            d="M14 51C18 49 22 49 26 51C30 53 34 53 38 51C42 49 46 49 50 51"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M18 57C22 55.5 26 55.5 30 57C34 58.5 38 58.5 42 57C46 55.5 48 55.5 50 56.5"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        </svg>
      );

    case 7:
      // SDG 7: Affordable & Clean Energy (sunburst + energy spark)
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          {/* Sun center */}
          <circle cx="32" cy="32" r="14" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="3" />
          {/* Sun rays */}
          <path d="M32 8V14M32 50V56M8 32H14M50 32H56M15 15L19.5 19.5M44.5 44.5L49 49M15 49L19.5 44.5M44.5 19.5L49 15" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
          {/* Energy bolt */}
          <path
            d="M34 22L26 34H33L30 44L40 31H32L34 22Z"
            fill={color}
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 11:
      // SDG 11: Sustainable Cities & Communities (skyline buildings + tree + roof)
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          {/* Base ground line */}
          <path d="M10 52H54" stroke={color} strokeWidth="3" strokeLinecap="round" />
          {/* Tall center tower */}
          <rect x="25" y="16" width="14" height="36" rx="1.5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
          {/* Left building */}
          <rect x="13" y="27" width="10" height="25" rx="1.5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
          {/* Right building */}
          <rect x="41" y="22" width="10" height="30" rx="1.5" fill={color} fillOpacity="0.3" stroke={color} strokeWidth="2.5" />
          {/* Roof gable on center */}
          <path d="M22 16L32 8L42 16" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {/* Window grids */}
          <circle cx="32" cy="24" r="1.5" fill={color} />
          <circle cx="32" cy="31" r="1.5" fill={color} />
          <circle cx="32" cy="38" r="1.5" fill={color} />
          <circle cx="18" cy="35" r="1.5" fill={color} />
          <circle cx="18" cy="42" r="1.5" fill={color} />
          <circle cx="46" cy="30" r="1.5" fill={color} />
          <circle cx="46" cy="37" r="1.5" fill={color} />
        </svg>
      );

    case 12:
      // SDG 12: Responsible Consumption & Production (Infinity circulation loop)
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          <path
            d="M21 23C15 23 11 27 11 32C11 37 15 41 21 41C27 41 32 32 32 32C32 32 37 23 43 23C49 23 53 27 53 32C53 37 49 41 43 41C37 41 32 32 32 32C32 32 27 23 21 23Z"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Circulating Arrowheads */}
          <path d="M26 19L21 23L26 27" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M38 45L43 41L38 37" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );

    case 13:
      // SDG 13: Climate Action (globe + climate action eye/canopy)
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          {/* Globe circle */}
          <circle cx="32" cy="32" r="15" fill={color} fillOpacity="0.25" stroke={color} strokeWidth="3" />
          <ellipse cx="32" cy="32" rx="7" ry="15" stroke={color} strokeWidth="2" strokeDasharray="3 2" />
          <path d="M17 32H47" stroke={color} strokeWidth="2" />
          {/* Protecting eye/canopy curve above */}
          <path
            d="M10 32C16 18 48 18 54 32"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          {/* Action arcs */}
          <path
            d="M12 40C18 50 46 50 52 40"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeOpacity="0.75"
          />
        </svg>
      );

    case 15:
      // SDG 15: Life on Land (healthy tree canopy + mountain landscape)
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          {/* Ground & mountain line */}
          <path d="M10 52H54" stroke={color} strokeWidth="3" strokeLinecap="round" />
          <path d="M36 52L46 36L56 52" stroke={color} strokeWidth="2.5" strokeLinejoin="round" />
          {/* Tree trunk */}
          <path d="M24 52V36" stroke={color} strokeWidth="4.5" strokeLinecap="round" />
          {/* Tree foliage */}
          <path
            d="M24 16C17 16 13 21 13 26C13 31 17 34 21 34H27C31 34 35 31 35 26C35 21 31 16 24 16Z"
            fill={color}
            fillOpacity="0.85"
            stroke={color}
            strokeWidth="2"
          />
          {/* Little flying bird */}
          <path d="M38 20C40 18 42 20 44 19C46 20 48 18 50 20" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );

    default:
      // General SDG Emblem
      return (
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" stroke={color}>
          <circle cx="32" cy="32" r="20" stroke={color} strokeWidth="3" />
          <path d="M32 12V52M12 32H52" stroke={color} strokeWidth="2" />
        </svg>
      );
  }
};

const SIZE_MAP = {
  xs: { container: 'w-7 h-7 rounded-md p-1', text: 'text-[9px]', icon: 'w-4 h-4' },
  sm: { container: 'w-10 h-10 rounded-lg p-1.5', text: 'text-xs', icon: 'w-5 h-5' },
  md: { container: 'w-14 h-14 rounded-xl p-2', text: 'text-sm', icon: 'w-7 h-7' },
  lg: { container: 'w-20 h-20 rounded-2xl p-2.5', text: 'text-base', icon: 'w-10 h-10' },
  xl: { container: 'w-28 h-28 rounded-2xl p-3.5', text: 'text-xl', icon: 'w-16 h-16' },
};

export const SDGEmblem: React.FC<SDGEmblemProps> = ({
  sdgNumber,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const meta = SDG_METADATA[sdgNumber] || {
    number: sdgNumber,
    title: `SDG ${sdgNumber}`,
    shortName: `Goal ${sdgNumber}`,
    bgColor: '#10B981',
    textColor: '#ffffff',
  };

  const sz = SIZE_MAP[size];

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      {/* Official UN SDG Emblem Box */}
      <div
        className={`${sz.container} flex flex-col items-center justify-between shadow-md transition-transform duration-200 hover:scale-105 border border-white/10`}
        style={{ backgroundColor: meta.bgColor, color: meta.textColor }}
        title={`SDG ${meta.number}: ${meta.title}`}
      >
        {/* SDG Number Header */}
        <div className="w-full flex items-center justify-between font-black tracking-tight leading-none">
          <span className={`${sz.text} font-mono font-extrabold drop-shadow-sm`}>
            {meta.number}
          </span>
          <span className="text-[8px] uppercase tracking-tighter opacity-80 font-bold hidden sm:inline">
            SDG
          </span>
        </div>

        {/* Vector Glyph */}
        <div className="w-full flex-1 flex items-center justify-center p-0.5">
          <SDGVectorIcon sdgNumber={sdgNumber} color={meta.textColor} />
        </div>
      </div>

      {showLabel && (
        <span className="text-[10px] font-semibold text-slate-300 mt-1.5 text-center line-clamp-1 max-w-[100px]">
          {meta.shortName}
        </span>
      )}
    </div>
  );
};
