import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "outline" | "secondary" | "link" | "destructive";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "rounded-full bg-accent text-on-accent hover:bg-accent-press disabled:bg-fill-2 disabled:text-label-3",
  outline:
    "rounded-full text-link shadow-[inset_0_0_0_1px_var(--accent)] hover:bg-accent hover:text-on-accent disabled:text-label-3 disabled:shadow-[inset_0_0_0_1px_var(--separator)] disabled:hover:bg-transparent",
  secondary: "rounded-full bg-fill text-label hover:bg-fill-2",
  link: "text-link hover:underline disabled:text-label-3",
  destructive: "text-red hover:underline",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-4 text-sm gap-1",
  md: "h-11 px-[22px] text-[1.0625rem] gap-1.5",
};

const LINK_SIZES: Record<Size, string> = {
  sm: "text-sm gap-0.5",
  md: "text-[1.0625rem] gap-1",
};

export function Button({
  variant = "secondary",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  const isLink = variant === "link" || variant === "destructive";
  return (
    <button
      type={type}
      className={`pressable inline-flex items-center justify-center whitespace-nowrap disabled:cursor-not-allowed ${VARIANTS[variant]} ${
        isLink ? LINK_SIZES[size] : SIZES[size]
      } ${className}`}
      {...rest}
    />
  );
}
