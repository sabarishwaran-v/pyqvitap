import { cva, type VariantProps } from "class-variance-authority";

const capsule = cva(
  "inline-flex items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      theme: {
        blue: "bg-[#5258DB] text-white dark:bg-[#585CE5] dark:text-white",
        green: "bg-[#22c55e] text-white",
      },
    },
    defaultVariants: {
      theme: "blue",
    },
  }
);

export interface CapsuleProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof capsule> {}

export function Capsule({ children, theme, className, ...props }: CapsuleProps) {
  return (
    <div className={capsule({ theme, className })} {...props}>
      {children}
    </div>
  );
}
