import Image from "next/image";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 },
  xl: { width: 96, height: 96 }
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const dimensions = sizeMap[size];
  const showText = size !== 'xl'; // Don't show text for extra large logo
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="ALL VERSE GPT"
        width={dimensions.width}
        height={dimensions.height}
        unoptimized={true}
        className="object-contain rounded-lg"
      />
      {showText && <span className="font-bold text-white leading-tight">ALL VERSE GPT</span>}
    </div>
  );
}
