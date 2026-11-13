import type { MetadataRoute } from "next";

// Lets StudentOS be added to the Home Screen. On iPhone, alerts only work from the Home Screen app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudentOS",
    short_name: "StudentOS",
    description: "Plans, debates and people from your campus.",
    id: "/",
    start_url: "/start",
    display: "standalone",
    background_color: "#0b0b10",
    theme_color: "#0b0b10",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
