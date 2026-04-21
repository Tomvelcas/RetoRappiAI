"use client";

import { usePathname } from "next/navigation";

export function AppAmbient() {
  const pathname = usePathname();

  if (pathname === "/") {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-0 overflow-hidden"
    >
      <div className="mx-auto h-[180px] max-w-[1720px] px-4 sm:px-6 lg:px-8">
        <div className="relative h-full overflow-hidden rounded-b-[42px] border-x border-b border-[color:rgba(52,34,20,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.52),rgba(255,255,255,0.06))]">
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.28),transparent_44%)]" />
          <div className="absolute left-[8%] top-[-18%] h-[140px] w-[32%] rounded-full bg-[radial-gradient(circle,rgba(255,210,176,0.52),transparent_70%)] blur-3xl" />
          <div className="absolute right-[10%] top-[-24%] h-[150px] w-[24%] rounded-full bg-[radial-gradient(circle,rgba(255,90,0,0.16),transparent_72%)] blur-3xl" />
          <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_78px,rgba(38,22,12,0.03)_79px,transparent_80px)] opacity-70" />
        </div>
      </div>
    </div>
  );
}
