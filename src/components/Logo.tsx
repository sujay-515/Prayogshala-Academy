import React from 'react';

export type LogoVariant = 'mark' | 'academy' | 'badge' | 'app-icon' | 'horizontal';

interface LogoProps extends React.SVGProps<SVGSVGElement> {
  variant?: LogoVariant;
  size?: number | string;
  className?: string;
}

/**
 * Prayogshala Academy Brand Logo
 * Based on the iconic Devanagari 'प्र' Laboratory glyph.
 * Minimal replacement for long app names.
 */
export const Logo: React.FC<LogoProps> = ({
  variant = 'mark',
  size = 32,
  className = '',
  ...props
}) => {
  // Use public SVGs for maximum caching and lightness, or embed inline for instant paint
  const srcMap: Record<LogoVariant, string> = {
    mark: '/brand/svg/logo-mark-cyan.svg',
    academy: '/brand/svg/logo-academy.svg',
    badge: '/brand/svg/logo-academy-badge.svg',
    'app-icon': '/brand/svg/logo-app-icon.svg',
    horizontal: '/brand/svg/logo-horizontal.svg',
  };

  const src = srcMap[variant] || srcMap.mark;

  return (
    <img
      src={src}
      alt="Prayogshala Academy Logo"
      width={size}
      height={size}
      className={`select-none inline-block object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
};

export default Logo;
