import { headers } from "next/headers";

import { HomeScene } from "@/components/home/home-scene";

function resolveLocale(acceptLanguage: string | null): "en" | "es" {
  if (!acceptLanguage) {
    return "es";
  }

  const preferredLocale = acceptLanguage
    .split(",")
    .map((part) => part.trim().split(";")[0]?.toLowerCase())
    .find(Boolean);

  return preferredLocale?.startsWith("en") ? "en" : "es";
}

export default async function HomePage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));

  return <HomeScene locale={locale} />;
}
