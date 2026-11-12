import { cva, type VariantProps } from "class-variance-authority";

const capsule = cva(
  "inline-flex items-center justify-center rounded-md p-1 px-3 text-sm font-medium transition-colors",
  {
    variants: {
      theme: {
        blue: "rounded-sm bg-[#B2B8FF] text-[#1e1b4b] dark:bg-[#7480FFCC] dark:text-white",
        green: "bg-[#3cc923] text-white",
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
