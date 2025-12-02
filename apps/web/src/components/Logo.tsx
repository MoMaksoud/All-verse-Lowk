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
  const dimensions = sizeMap[size];
  
  return (
    <section className={`h-[48px] w-[48px] flex items-center justify-center shrink-0 ${className}`}>
      <Image
        src="/logo.png"
        alt="ALL VERSE GPT"
        width={dimensions.width}
        height={dimensions.height}
        unoptimized={true}
        className="object-contain rounded-lg"
      />
    </section>
  );
}
