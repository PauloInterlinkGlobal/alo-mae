import React from 'react';

interface LogoProps {
  variant?: 'dark' | 'light' | 'white';
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'dark',
  size = 'md',
  showSubtitle = true,
  className = '',
}) => {
  const iconSize = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subtitleSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';

  const isLight = variant === 'light' || variant === 'white';
  const textColor = isLight ? 'text-white' : 'text-[#0D1B3D]';
  const subColor = isLight ? 'text-[#96B5FE]' : 'text-[#687280]';
  const bubbleFill = isLight ? '#143A7B' : '#0D1B3D';
  const bubbleStroke = isLight ? '#96B5FE' : '#143A7B';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Stylized Speech Bubble with Mother & Child Heart Silhouette */}
      <div className="relative shrink-0 flex items-center justify-center">
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-sm transition-transform hover:scale-105 duration-200"
        >
          {/* Speech bubble outline */}
          <path
            d="M24 4C12.9543 4 4 12.5066 4 23C4 28.5 6.5 33.4 10.5 36.8L8.5 44L17 40.5C19.2 41.5 21.5 42 24 42C35.0457 42 44 33.4934 44 23C44 12.5066 35.0457 4 24 4Z"
            fill={bubbleFill}
            stroke={bubbleStroke}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Mother holding child forming heart */}
          {/* Mother head */}
          <circle cx="21" cy="16" r="3.2" fill="#FFFFFF" />
          {/* Child head */}
          <circle cx="28.5" cy="22.5" r="2.4" fill="#96B5FE" />
          {/* Mother arms/body wrapping baby in a loving embrace */}
          <path
            d="M16 31C16 26.5 19 23 23 23C25.5 23 27 24.5 28 26C29 25 31 25.5 32 27.5C32.8 29 32.5 31 31.5 32C29.5 34 25 35 22 34C18.5 33 16 32 16 31Z"
            fill="#FFFFFF"
          />
          {/* Subtle heart accent */}
          <path
            d="M27 15C27 13.8 28 13 29.2 13C30.2 13 31 13.6 31.5 14.5C32 13.6 32.8 13 33.8 13C35 13 36 13.8 36 15C36 17 31.5 19.5 31.5 19.5C31.5 19.5 27 17 27 15Z"
            fill="#FF4D6D"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <span
          className={`font-['Poppins',sans-serif] font-bold ${textSize} ${textColor} tracking-tight leading-tight`}
        >
          Alô mãe
        </span>
        {showSubtitle && (
          <span className={`font-['Inter',sans-serif] font-medium ${subtitleSize} ${subColor} tracking-wide`}>
            Conexão que cuida.
          </span>
        )}
      </div>
    </div>
  );
};
