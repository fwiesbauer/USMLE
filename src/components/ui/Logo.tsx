import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  /** Where the logo links to. Defaults to "/" */
  href?: string;
  /** Render size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: { width: 200, height: 40 },
  md: { width: 280, height: 56 },
  lg: { width: 360, height: 72 },
};

export function Logo({ href = '/', size = 'sm' }: LogoProps) {
  const { width, height } = sizes[size];

  const img = (
    <Image
      src="/LITFL_logo_Medmastery.png"
      alt="Life in the Fast Lane × Medmastery"
      width={width}
      height={height}
      priority
      className="h-auto"
    />
  );

  return (
    <Link href={href} className="inline-block">
      {img}
    </Link>
  );
}
