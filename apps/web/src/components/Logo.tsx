import Image from "next/image";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeMap = {
  sm: { width: 24, height: 24 },
  md: { width: 32, height: 32 },
  lg: { width: 48, height: 48 }
};

export function Logo({ size = 'md', className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="ALL VERSE GPT"
        width={40}
        height={40}
        unoptimized={true}
        className="object-contain rounded-lg"
      />
      <span className="font-bold text-white leading-tight">ALL VERSE GPT</span>
    </div>
  );
}
