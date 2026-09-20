"use client";

import { usePathname } from "next/navigation";
import React from "react";

function ChildrenWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/catalogue")) {
    return <>{children}</>;
  }

  return <div className="mx-auto max-w-[1440px]">{children}</div>;
}

export default ChildrenWrapper;
