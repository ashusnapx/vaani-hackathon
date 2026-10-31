import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sorted: one call, and it's sorted",
    short_name: "Sorted",
    description: "Call once with the job and your price. Sorted rings local service people, bargains, and calls you back.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f3ec",
    theme_color: "#1a1f24",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
