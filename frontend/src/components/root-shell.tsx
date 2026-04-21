"use client";

import { usePathname } from "next/navigation";

import { AppAmbient } from "@/components/app-ambient";
import { SiteNav } from "@/components/site-nav";

type RootShellProps = {
  children: React.ReactNode;
};

export function RootShell({ children }: RootShellProps) {
  const pathname = usePathname();

  if (pathname === "/") {
    return <>{children}</>;
  }

  return (
    <div className="relative min-h-screen">
      <AppAmbient />
      <SiteNav />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
