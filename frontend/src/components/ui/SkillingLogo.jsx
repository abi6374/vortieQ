import React from 'react'

/**
 * SkillingLogo
 * The distinctive "S" shaped winding roadmap path leading to an achievement trophy.
 * Used consistently across Navbar, TopBar, Sidebar, Footer, Auth, and Onboarding screens.
 */
export default function SkillingLogo({
  size = 20,
  className = '',
  color = 'currentColor',
  style = {},
  ...props
}) {
  return (
    <svg
      width={size}
      height={Math.round(size * 1.25)}
      viewBox="0 0 100 135"
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true"
      {...props}
    >
      {/* 5 Radiant Rays above Trophy */}
      <line x1="68" y1="10" x2="68" y2="16" stroke={color} strokeWidth="4.5" />
      <line x1="52" y1="14" x2="57" y2="19" stroke={color} strokeWidth="4.5" />
      <line x1="84" y1="14" x2="79" y2="19" stroke={color} strokeWidth="4.5" />
      <line x1="44" y1="24" x2="50" y2="26" stroke={color} strokeWidth="4.5" />
      <line x1="92" y1="24" x2="86" y2="26" stroke={color} strokeWidth="4.5" />

      {/* Trophy Cup */}
      <path d="M57 23 H79 V33 C79 39.5 74 44.5 68 44.5 C62 44.5 57 39.5 57 33 Z" fill={color} stroke="none" />
      {/* Trophy Handles */}
      <path d="M57 26 H53 C49.5 26 47 28.5 47 31.5 C47 34.5 49.5 37 53 37 H57" stroke={color} strokeWidth="3.8" fill="none" />
      <path d="M79 26 H83 C86.5 26 89 28.5 89 31.5 C89 34.5 86.5 37 83 37 H79" stroke={color} strokeWidth="3.8" fill="none" />
      {/* Trophy Pedestal Base */}
      <path d="M64 44.5 H72 V48.5 H64 Z" fill={color} stroke="none" />
      <path d="M59 48.5 H77 V52.5 H59 Z" fill={color} stroke="none" />

      {/* S-Shaped Winding Roadmap Path */}
      <path
        d="M68 57 C68 65 62 70 46 70.5 C24 71 17 79 17 88.5 C17 98 30 101.5 56 101.5 C78 101.5 84 109 84 117 C84 125 70 128 52 128 C35 128 23 128 23 130"
        stroke={color}
        strokeWidth="6.5"
        fill="none"
      />

      {/* Milestone Nodes Along the S Roadmap */}
      <circle cx="46" cy="70.5" r="5.5" fill={color} stroke="none" />
      <circle cx="17" cy="88.5" r="6" fill={color} stroke="none" />
      <circle cx="84" cy="111" r="6" fill={color} stroke="none" />
      <circle cx="52" cy="122" r="5.5" fill={color} stroke="none" />
      <circle cx="23" cy="129" r="6.5" fill={color} stroke="none" />
    </svg>
  )
}
