'use client';

import { useEffect } from 'react';

/** Subtle fur-layer parallax on primary buttons and fur surfaces */
export function FurEnhancer() {
  useEffect(() => {
    const surfaces = document.querySelectorAll<HTMLElement>('.fur-btn, .fur-chip, .fur-bar');

    const handlers = new Map<HTMLElement, (e: MouseEvent) => void>();

    surfaces.forEach((el) => {
      const fn = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
        el.style.setProperty('--fur-x', `${x}px`);
        el.style.setProperty('--fur-y', `${y}px`);
      };
      handlers.set(el, fn);
      el.addEventListener('mousemove', fn);
      el.addEventListener('mouseleave', () => {
        el.style.setProperty('--fur-x', '0px');
        el.style.setProperty('--fur-y', '0px');
      });
    });

    return () => {
      handlers.forEach((fn, el) => el.removeEventListener('mousemove', fn));
    };
  }, []);

  return (
    <svg className="pointer-events-none absolute h-0 w-0" aria-hidden>
      <defs>
        <filter id="fur-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75 0.35"
            numOctaves="4"
            seed="8"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" in="noise" result="mono" />
          <feComponentTransfer in="mono" result="soft">
            <feFuncA type="table" tableValues="0 0.15 0.35 0.2 0.45 0.25 0.5" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="soft" mode="soft-light" />
        </filter>
        <filter id="fur-deep" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="turbulence"
            baseFrequency="0.02 0.12"
            numOctaves="3"
            seed="4"
            result="wave"
          />
          <feDisplacementMap in="SourceGraphic" in2="wave" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
