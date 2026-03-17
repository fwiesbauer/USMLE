'use client';

import { useState, useRef, useEffect } from 'react';

interface MultiSelectProps {
  id?: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelect({
  id,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const remove = (value: string) => {
    onChange(selected.filter((v) => v !== value));
  };

  return (
    <div ref={containerRef} className="relative w-full" id={id}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full min-h-[38px] items-center flex-wrap gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-brand-mid focus:border-brand-mid text-left"
      >
        {selected.length === 0 && (
          <span className="text-gray-400">{placeholder}</span>
        )}
        {selected.map((val) => (
          <span
            key={val}
            className="inline-flex items-center gap-1 rounded bg-brand-light/20 px-2 py-0.5 text-xs font-medium text-brand-dark"
          >
            {val}
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                remove(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  remove(val);
                }
              }}
              className="ml-0.5 cursor-pointer text-brand-dark/60 hover:text-red-500"
            >
              x
            </span>
          </span>
        ))}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {options.map((opt) => {
            const isSelected = selected.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => toggle(opt)}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-gray-50 ${
                  isSelected ? 'bg-brand-light/10 font-medium text-brand-dark' : 'text-gray-700'
                }`}
              >
                <span
                  className={`inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-xs ${
                    isSelected
                      ? 'border-brand-mid bg-brand-mid text-white'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected ? '\u2713' : ''}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
