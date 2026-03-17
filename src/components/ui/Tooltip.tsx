'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Flip to top if too close to the bottom of the viewport
      setPosition(rect.bottom + 200 > window.innerHeight ? 'top' : 'bottom');
    }
  }, [visible]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 w-64 rounded-lg bg-gray-900 px-3 py-2 text-xs text-white shadow-lg left-1/2 -translate-x-1/2 ${
            position === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2'
          }`}
        >
          {content}
        </span>
      )}
    </span>
  );
}
