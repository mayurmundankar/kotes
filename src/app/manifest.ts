import type { MetadataRoute } from "next";

// Lets readers add kotes to their home screen and open it full-screen.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kotes",
    short_name: "kotes",
    description: "Endless quotes, tuned to what moves you.",
    start_url: "/feed",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fff6f7",
    theme_color: "#fff6f7",
    icons: [{ src: "/favicon.png", sizes: "77x77", type: "image/png" }],
  };
}
