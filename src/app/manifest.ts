import type { MetadataRoute } from "next";

interface ExtendedScreenshot {
  src: string;
  sizes?: string;
  type?: string;
  form_factor?: string;
}

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PyqVitAp",
    short_name: "PyqVitAp",
    description:
      "Prepare and ace your CAT and FAT exams with PyqVitAp. Search 5k+ question papers across all branches, slots, and years in seconds.",
    start_url: "/",
    display: "standalone",
    background_color: "#10011a",
    theme_color: "#10011a",
    categories: [
      "education",
      "reference",
      "productivity",
      "technology"
    ],
    shortcuts: [
      {
        "name": "Upload",
        "short_name": "Upload",
        "description": "Upload a paper",
        "url": "/upload",
        "icons": [
          {
            "src": "/assets/icons/icon-192x192.webp",
            "sizes": "192x192",
            "type": "image/webp"
          }
        ]
      },
    ],
    icons: [
      { src: "/assets/icons/icon-192x192.png?v=3", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icons/icon-192x192.png?v=3", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/assets/icons/icon-512x512.png?v=3", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/icons/icon-512x512.png?v=3", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/assets/icons/icon-192x192.webp?v=3", sizes: "192x192", type: "image/webp", purpose: "any" },
      { src: "/assets/icons/icon-196x196.webp?v=3", sizes: "196x196", type: "image/webp" },
      { src: "/assets/icons/icon-228x228.webp?v=3", sizes: "228x228", type: "image/webp" },
      { src: "/assets/icons/icon-256x256.webp?v=3", sizes: "256x256", type: "image/webp" },
      { src: "/assets/icons/icon-384x384.webp?v=3", sizes: "384x384", type: "image/webp" },
      { src: "/assets/icons/icon-512x512.webp?v=3", sizes: "512x512", type: "image/webp", purpose: "any" },
    ],
    screenshots: [
      {
        src: "/screenshots/screenshot-hero.avif?v=2",
        sizes: "638x1380",
        type: "image/avif",
      },
      {
        src: "/screenshots/screenshot-prepare.avif?v=2",
        sizes: "638x1380",
        type: "image/avif",
      },
      {
        src: "/screenshots/screenshot-faq.avif?v=2",
        sizes: "638x1380",
        type: "image/avif",
      },
      {
        src: "/screenshots/screenshot-hero-wide.avif?v=2",
        sizes: "2880x1556",
        type: "image/avif",
        form_factor: "wide",
      },
      {
        src: "/screenshots/screenshot-prepare-wide.avif?v=2",
        sizes: "2880x1556",
        type: "image/avif",
        form_factor: "wide",
      },
      {
        src: "/screenshots/screenshot-faq-wide.avif?v=2",
        sizes: "2880x1556",
        type: "image/avif",
        form_factor: "wide",
      },
    ] as ExtendedScreenshot[],
  };
}
