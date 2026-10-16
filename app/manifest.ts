import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * A kezdőképernyőre kitehető alkalmazás leírója. iPhone-on ez (és a
 * kezdőképernyőre tétel) a feltétele annak, hogy egyáltalán kapjon push
 * értesítést a felület — lásd README „Értesítések".
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name} — üzenet-asszisztens`,
    short_name: BRAND.name,
    description: "Beszélgetések, átadások és beállítások egy helyen.",
    // a felület az /admin, nem a nyilvános főoldal
    start_url: "/admin",
    scope: "/",
    display: "standalone",
    background_color: "#F4F2ED",
    theme_color: "#1F6F5C",
    lang: "hu",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
