import Image from "next/image";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { img: 20, text: 'text-sm'  },
  md: { img: 28, text: 'text-sm'  },
  lg: { img: 40, text: 'text-base' },
  xl: { img: 80, text: ''          },
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const { img, text } = sizeMap[size];
  const showText = size !== 'xl';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="AllVerse"
        width={img}
        height={img}
        unoptimized
        className="object-contain rounded-lg"
      />
      {showText && (
        <span
          className={`font-bold leading-tight text-white ${text}`}
          style={{ fontFamily: 'var(--font-display, var(--font-inter))' }}
        >
          All Verse
        </span>
      )}
    </div>
  );
}
