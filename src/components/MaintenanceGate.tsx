"use client";

import React from "react";
import { usePathname } from "next/navigation";
import MaintenanceScreen from "@/components/MaintenanceScreen";

interface MaintenanceGateProps {
  children: React.ReactNode;
}

export default function MaintenanceGate({ children }: MaintenanceGateProps) {
  const pathname = usePathname();
  const isLegalPage =
    pathname === "/disclaimer" ||
    pathname === "/disclaimer/" ||
    pathname === "/terms" ||
    pathname === "/terms/" ||
    pathname === "/privacy" ||
    pathname === "/privacy/";

  if (isLegalPage) {
    return (
      <main className="flex-1">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center">
      <MaintenanceScreen />
    </main>
  );
}
