import React from 'react';
import Image from 'next/image';

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
  const iconPixel = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-2xl' : 'text-xl';
  const subtitleSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';

  const isLight = variant === 'light' || variant === 'white';
  const textColor = isLight ? 'text-white' : 'text-[#0D1B3D]';
  const subColor = isLight ? 'text-[#96B5FE]' : 'text-[#687280]';

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Brand Logo Graphic */}
      <div className="relative shrink-0 flex items-center justify-center overflow-hidden rounded-xl">
        <Image
          src="/logo2.jpeg"
          width={iconPixel}
          height={iconPixel}
          alt="Alô mãe"
          className="object-contain rounded-lg"
          priority
        />
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

