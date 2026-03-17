import Link from 'next/link';

interface LogoProps {
  /** Where the logo links to. Defaults to "/" */
  href?: string;
  /** Render size variant */
  size?: 'sm' | 'md' | 'lg';
}

const scales = {
  sm: 0.55,
  md: 0.75,
  lg: 1,
};

export function Logo({ href = '/', size = 'sm' }: LogoProps) {
  const scale = scales[size];

  return (
    <Link href={href} className="inline-flex items-center gap-1" style={{ transform: `scale(${scale})`, transformOrigin: 'left center' }}>
      {/* LITFL logo mark */}
      <svg width="32" height="36" viewBox="0 0 32 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
        {/* Cross */}
        <rect x="10" y="0" width="12" height="32" rx="2" fill="#D32F2F" />
        <rect x="0" y="8" width="32" height="12" rx="2" fill="#D32F2F" />
        {/* Swoosh */}
        <path d="M2 30 Q8 20 16 28 Q24 36 30 26" stroke="#1F4E79" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>

      {/* LITFL text */}
      <div className="flex flex-col leading-none mr-2">
        <span className="text-[11px] font-bold tracking-wide text-gray-800" style={{ fontStyle: 'italic' }}>
          LIFE IN THE
        </span>
        <span className="text-[22px] font-black tracking-tight text-gray-900" style={{ fontStyle: 'italic' }}>
          FASTLANE
        </span>
      </div>

      {/* DNA helix divider */}
      <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mx-1">
        <path d="M6 2 Q18 10 6 18 Q-6 26 6 34" stroke="#9E9E9E" strokeWidth="2" fill="none" />
        <path d="M18 2 Q6 10 18 18 Q30 26 18 34" stroke="#9E9E9E" strokeWidth="2" fill="none" />
        <line x1="7" y1="9" x2="17" y2="9" stroke="#BDBDBD" strokeWidth="1.5" />
        <line x1="7" y1="18" x2="17" y2="18" stroke="#BDBDBD" strokeWidth="1.5" />
        <line x1="7" y1="27" x2="17" y2="27" stroke="#BDBDBD" strokeWidth="1.5" />
      </svg>

      {/* Medmastery text */}
      <div className="flex items-baseline">
        <span className="text-[26px] font-black text-[#00B4D8] tracking-tight">MED</span>
        <svg width="20" height="24" viewBox="0 0 20 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0 mx-0.5 self-center">
          <rect x="6" y="0" width="8" height="24" rx="1" fill="#9E9E9E" opacity="0.5" />
          <rect x="0" y="8" width="20" height="8" rx="1" fill="#9E9E9E" opacity="0.5" />
        </svg>
        <div className="flex flex-col leading-none -ml-0.5">
          <span className="text-[26px] font-black text-[#00B4D8] tracking-tight">D</span>
        </div>
      </div>
      <span className="text-[14px] text-[#00B4D8] -ml-1 self-end mb-0.5" style={{ fontFamily: 'cursive' }}>
        mastery
      </span>
    </Link>
  );
}
