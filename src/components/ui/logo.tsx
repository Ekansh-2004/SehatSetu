import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  variant?: "icon" | "text" | "full";
  className?: string;
}

export function Logo({
  size = "md",
  variant = "full",
  className = "",
}: LogoProps) {
  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  const primaryTextSizes = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  const secondaryTextSizes = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  const icon = (
    <div className={sizeClasses[size]}>
      <Image
        src="/Logo1.svg"
        alt="SehatSetu by livconnect"
        width={size === "sm" ? 24 : size === "md" ? 32 : 48}
        height={size === "sm" ? 24 : size === "md" ? 32 : 48}
        className="w-full h-full"
      />
    </div>
  );

  const text = (
    <div className="flex flex-col leading-none">
      <span className={`font-black text-blue-600 tracking-tight ${primaryTextSizes[size]}`}>
        SehatSetu
      </span>
      <span className={`font-normal text-slate-500 tracking-wide ${secondaryTextSizes[size]} mt-0.5`}>
        by livconnect
      </span>
    </div>
  );

  if (variant === "icon") {
    return <div className={className}>{icon}</div>;
  }

  if (variant === "text") {
    return <div className={className}>{text}</div>;
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {icon}
      {text}
    </div>
  );
}
