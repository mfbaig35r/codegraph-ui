'use client';

import { useState, useRef, type ReactNode } from 'react';
import { CYBERPUNK } from '@/lib/graph/types';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 200);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      {children}
      {visible && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 pointer-events-none"
          style={{
            width: 220,
            fontSize: 11,
            lineHeight: '1.4',
            padding: '6px 10px',
            borderRadius: 6,
            backgroundColor: CYBERPUNK.surface,
            border: `1px solid ${CYBERPUNK.borderHi}`,
            color: CYBERPUNK.text,
            boxShadow: CYBERPUNK.glow,
            whiteSpace: 'normal',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
