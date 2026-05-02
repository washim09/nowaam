import { cn } from "@/lib/utils";

type IconProps = {
  className?: string;
};

export function SearchIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={cn("h-5 w-5", className)}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16L21 21" strokeLinecap="round" />
    </svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={cn("h-5 w-5", className)}>
      <path d="M3 5h2l2.2 9.2a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H7.1" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="19" r="1.3" />
      <circle cx="18" cy="19" r="1.3" />
    </svg>
  );
}

export function ProfileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={cn("h-5 w-5", className)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" strokeLinecap="round" />
    </svg>
  );
}

export function HeartIcon({ className, filled = false }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="1.9"
      className={cn("h-5 w-5", className)}
    >
      <path
        d="M12 20.5s-7-4.6-7-10.4A4.1 4.1 0 0 1 9.2 6a4.7 4.7 0 0 1 2.8 1.1A4.7 4.7 0 0 1 14.8 6 4.1 4.1 0 0 1 19 10.1c0 5.8-7 10.4-7 10.4Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" className={cn("h-5 w-5", className)}>
      <path d="M5 12h14" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" strokeLinejoin="round" />
      <path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" strokeLinejoin="round" />
      <path d="M5 15l.9 2.4L8.3 18l-2.4.9L5 21.3l-.9-2.4L1.7 18l2.4-.6L5 15Z" strokeLinejoin="round" />
    </svg>
  );
}

export function WalletIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6.5A2.5 2.5 0 0 1 4 15.5v-7Z" strokeLinejoin="round" />
      <path d="M4 9h16" />
      <circle cx="15.5" cy="13.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BeltIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M3 12h11.5a2.5 2.5 0 1 0 0-5H11" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11 7v10" strokeLinecap="round" />
      <path d="M14.5 9.5H21v5h-6.5" strokeLinejoin="round" />
      <circle cx="17.5" cy="12" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function AccessoriesIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <rect x="5" y="6" width="14" height="12" rx="3" />
      <path d="M9 10h6" strokeLinecap="round" />
      <path d="M10 6V4.8A2.8 2.8 0 0 1 12.8 2h.4A2.8 2.8 0 0 1 16 4.8V6" strokeLinecap="round" />
    </svg>
  );
}

export function FashionIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M8 4.5 10.5 3h3L16 4.5l2 3-2.5 2L14 7.5 12 10 10 7.5 8.5 9.5 6 7.5l2-3Z" strokeLinejoin="round" />
      <path d="M8.2 9.2 7 20h10L15.8 9.2" strokeLinejoin="round" />
    </svg>
  );
}

export function ElectronicsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <rect x="4" y="5" width="16" height="12" rx="2.5" />
      <path d="M10 19h4" strokeLinecap="round" />
      <path d="M8 22h8" strokeLinecap="round" />
    </svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M4 11.5 12 5l8 6.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 10.5V20h11v-9.5" strokeLinejoin="round" />
      <path d="M10 20v-5h4v5" strokeLinejoin="round" />
    </svg>
  );
}

export function BeautyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M9 4h6" strokeLinecap="round" />
      <path d="M10 4v4l-3.5 7.3A3 3 0 0 0 9.2 20h5.6a3 3 0 0 0 2.7-4.7L14 8V4" strokeLinejoin="round" />
      <path d="M8 13h8" strokeLinecap="round" />
    </svg>
  );
}

export function EssentialsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={cn("h-5 w-5", className)}>
      <path d="M6 6h12v12H6z" rx="2" />
      <path d="M9 9h6" strokeLinecap="round" />
      <path d="M9 12h6" strokeLinecap="round" />
      <path d="M9 15h4" strokeLinecap="round" />
    </svg>
  );
}
