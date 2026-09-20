"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-8 w-16 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent bg-gray-300 transition-colors dark:bg-gray-600",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded-full border bg-black bg-inherit shadow-lg ring-0 transition-transform duration-150 dark:bg-white",
        "data-[state=checked]:translate-x-8 data-[state=unchecked]:translate-x-1",
      )}
    >
      {props.checked ? (
        <Moon className="h-4 w-4 text-black" />
      ) : (
        <Sun className="black h-4 w-4 text-black" />
      )}
    </SwitchPrimitives.Thumb>
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
