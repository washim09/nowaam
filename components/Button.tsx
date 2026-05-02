import type { ButtonHTMLAttributes, ReactNode } from "react";

import { ArrowRightIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "icon";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "button-primary",
  secondary: "button-secondary",
  ghost: "button-ghost",
  icon: "icon-button",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-4 py-2.5 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-sm",
};

export function buttonStyles({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(variantClasses[variant], variant !== "icon" && sizeClasses[size], className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  withArrow?: boolean;
};

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  withArrow = false,
  ...props
}: ButtonProps) {
  return (
    <button className={buttonStyles({ variant, size, className })} {...props}>
      <span className="inline-flex items-center gap-2">
        {children}
        {withArrow ? <ArrowRightIcon className="h-4 w-4" /> : null}
      </span>
    </button>
  );
}
