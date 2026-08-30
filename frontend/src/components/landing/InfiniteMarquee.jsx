import React from 'react'

/**
 * InfiniteMarquee (React Bits)
 * Hardware-accelerated continuous marquee ticker for tech stacks, tools, and skills.
 */
export default function InfiniteMarquee({
  items = [],
  speed = 28,
  direction = 'left',
  pauseOnHover = true,
  className = '',
}) {
  const repeated = [...items, ...items, ...items, ...items]

  return (
    <div className={`overflow-hidden relative w-full py-4 select-none ${className}`}>
      {/* Edge gradient fades for seamless blending */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#F5F5F7] dark:from-[#09090B] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#F5F5F7] dark:from-[#09090B] to-transparent" />

      <div
        className={`flex w-max items-center gap-4 ${
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right'
        } ${pauseOnHover ? 'hover:[animation-play-state:paused]' : ''}`}
        style={{
          animationDuration: `${speed}s`,
        }}
      >
        {repeated.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#E0E0E0] dark:border-[#27272F] bg-white/75 dark:bg-[#121216]/80 backdrop-blur-md shadow-xs hover:border-[#0066CC] dark:hover:border-[#C9D0D6] hover:shadow-md transition-all duration-200 group cursor-default"
          >
            {item.icon && (
              <span className="text-[#0066CC] dark:text-[#C9D0D6] group-hover:scale-110 transition-transform">
                {item.icon}
              </span>
            )}
            <span className="text-sm font-semibold text-[#1D1D1F] dark:text-[#E2E8F0] tracking-tight">
              {item.name}
            </span>
            {item.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EAF2FC] dark:bg-[#18181D] text-[#0066CC] dark:text-[#C9D0D6]">
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes marquee-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-right {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee-left {
          animation: marquee-left linear infinite;
        }
        .animate-marquee-right {
          animation: marquee-right linear infinite;
        }
      `}</style>
    </div>
  )
}
