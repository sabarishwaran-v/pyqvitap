# PyqVitAp

> **5,000+ VIT-AP Previous Year Papers**

PyqVitAp is an independent, student-developed platform for discovering, searching, filtering, previewing, and downloading VIT-AP previous-year question papers.

Built by students for students, PyqVitAp aggregates **5,000+ past exam papers** across engineering, sciences, humanities, and management courses to help students understand examination patterns, review syllabus topics, and prepare effectively for CATs and FATs.

🌐 **Live Website:** [https://pyqvitap.vercel.app](https://pyqvitap.vercel.app)

---

## 📌 Important Positioning & Disclaimer

> **PyqVitAp is an independent student-developed project.**
> 
> It is **NOT** affiliated with, endorsed by, sponsored by, or operated by Vellore Institute of Technology Andhra Pradesh (VIT-AP) or any of its constituent schools or administrations.
> 
> Question papers, course syllabi, and related academic documents accessible through the platform remain subject to their respective copyright and intellectual property rights. PyqVitAp does not claim ownership or authorship of exam papers created by university course instructors.

---

## 📖 About

Studying for Continuous Assessment Tests (CAT-1, CAT-2) and Final Assessment Tests (FAT) requires access to past exam papers to understand question patterns, marks distribution, and recurring problem types. 

While many papers exist across university archives (such as institutional DSpace repositories) and student networks, finding the exact paper for a specific course code, slot, and exam term was previously fragmented and time-consuming.

**PyqVitAp** solves this by providing a unified, lightning-fast catalogue where students can search across **260+ courses** in seconds, preview high-fidelity PDFs in their browser without downloading, and filter by exam type, academic year, semester, and slot.

---

## ✨ Features

- **Instant Course Discovery:** Real-time search across 260+ university courses by course title or code (e.g., `CSE1001`, `MAT2002`).
- **Multi-Faceted Filtering:** Narrow down papers by:
  - **Exam Type:** CAT-1, CAT-2, FAT, Model Exams
  - **Academic Year:** 2021-22 through 2025-26
  - **Semester:** Fall, Winter, Summer, Freshers, Fast-track
  - **Slot:** Theory and Lab slots (A1, B1, C1, etc.)
- **Interactive In-Browser PDF Preview:** Seamless document viewer powered by EmbedPDF featuring smooth scrolling, wheel zoom, full-screen view, and distraction-free Reading Mode.
- **Direct PDF Downloads:** One-click downloads with standardized, human-readable file naming.
- **Pin & Batch Selection:** Pin important papers for quick access during revision or select multiple papers to download together as a compressed ZIP.
- **Upcoming Exam Schedule:** Integrated course slot matching to help students quickly locate papers for upcoming test timetables.
- **Student Upload Pipeline:** Students can upload new question papers (PDF or images) with background Gemini AI analysis for automated course code and exam tag extraction.
- **Tag Reporting & Quality Control:** Community-driven reporting system allowing students to flag misclassified exam slots, years, or course codes.
- **Progressive Web App (PWA):** Installable on mobile devices (Android/iOS) and desktop for an app-like experience.

---

## 📚 Paper Collection

- The live collection contains **5,000+ question papers**.
- Materials are assembled from publicly accessible institutional sources, including the university's public **DSpace** digital repository, as well as voluntary student contributions.
- **Intellectual Property Notice:** Examination papers remain the intellectual property of their original authors, instructors, and the university. PyqVitAp provides organized indexing and access solely for non-commercial educational study and exam preparation.

---

## 📸 Screenshots

| Catalogue & Filters | Paper Viewer & Reading Mode |
| :---: | :---: |
| ![Catalogue Preview](/public/screenshots/screenshot-hero-wide.png) | ![Viewer Preview](/public/screenshots/screenshot-prepare-wide.png) |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router, Server Actions, Server Components)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **UI & Styling:** [React 18](https://react.dev/), [Tailwind CSS](https://tailwindcss.com/), Radix UI primitives, Lucide Icons
- **Database:** [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Asset Storage & CDN:** [Cloudinary](https://cloudinary.com/) (Direct CDN delivery for PDFs and WebP thumbnails)
- **Rate Limiting & Abuse Prevention:** [Upstash Redis](https://upstash.com/) with `@upstash/ratelimit`
- **AI Tagging & Metadata Detection:** [Google Gemini AI](https://ai.google.dev/) (`gemini-3.6-flash` via `@google/genai`)
- **PDF Engine:** `@embedpdf/core`, `pdf-lib`, `pdfjs-dist`
- **Deployment Platform:** [Vercel](https://vercel.com/) (Serverless Functions, Edge CDN Caching)

---

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────┐
│                     Student Browser                    │
│   (Catalog Search, Interactive Filters, PDF Viewer)    │
└─────────────────────────┬──────────────────────────────┘
                          │
                          ▼
┌────────────────────────────────────────────────────────┐
│                   Next.js 14 (Vercel)                  │
│       - Edge CDN Caching (s-maxage=60, SWR=120)        │
│       - Upstash Rate Limiting Middleware               │
│       - Server Actions & App Router Handlers           │
└───────────────┬────────────────────────┬───────────────┘
                │                        │
                ▼                        ▼
┌──────────────────────────────┐ ┌───────────────────────┐
│       MongoDB Atlas          │ │    Cloudinary CDN     │
│  - Papers & Course Metadata  │ │  - Unsigned Raw PDFs  │
│  - Admin Staging Collection  │ │  - WebP Thumbnails    │
│  - Tag Reports & Email Subs  │ │  (Direct Delivery)    │
└──────────────────────────────┘ └───────────────────────┘
                ▲
                │ Background Auto-Tagging
┌───────────────┴──────────────┐
│       Google Gemini AI       │
│    (Metadata Extraction)     │
└──────────────────────────────┘
```

> **Note on Storage:** Question paper PDFs are served directly through Cloudinary CDN to ensure fast delivery and avoid storing multi-gigabyte binary blobs inside the Git source repository.

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v20 or v22 recommended)
- [pnpm](https://pnpm.io/) (v9.x recommended)
- A MongoDB database (MongoDB Atlas free cluster or local MongoDB instance)

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/sabarish-v/pyqvitap.git
   cd pyqvitap
   ```

2. **Install dependencies:**
   ```bash
   pnpm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   Open `.env` and fill in your connection details (see [Environment Variables](#-environment-variables)).

4. **Start the development server:**
   ```bash
   pnpm dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Build for production:**
   ```bash
   pnpm run build
   pnpm start
   ```

---

## 🔐 Environment Variables

The application requires the following environment variables (template available in [`.env.example`](.env.example)):

| Variable | Description | Example / Note |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/papers` |
| `SERVER_URL` | Base URL of the application | `http://localhost:3000` or `https://pyqvitap.vercel.app` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud identifier | Used for PDF and thumbnail CDN delivery |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Required for server upload processing |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Required for server upload processing |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Required for IP-based rate limiting |
| `UPSTASH_REDIS_REST_TOKEN`| Upstash Redis REST Token | Required for IP-based rate limiting |
| `GEMINI_API_KEY` | Google Gemini API Key | Used for AI metadata extraction on student uploads |

> **Security Warning:** Never commit `.env` or real API credentials to version control.

---

## 📁 Project Structure

```text
pyqvitap/
├── public/                 # Static assets, brand icons, PWA manifest, screenshots
├── src/
│   ├── app/                # Next.js App Router routes & API endpoints
│   │   ├── api/            # Backend route handlers (papers, course-list, upload, health, etc.)
│   │   ├── catalogue/      # Catalogue discovery & paper browsing view
│   │   ├── disclaimer/     # Attribution, rights notice, and takedown policy
│   │   ├── paper/[id]/     # Individual paper view with embedded PDF reader
│   │   ├── request/        # Missing paper request interface
│   │   └── upload/         # Student paper submission page
│   ├── components/         # React UI components (Card, Sidebar, Navbar, PdfViewer, etc.)
│   ├── context/            # React context providers (CourseContext, FilterContext)
│   ├── db/                 # Mongoose schemas & database models
│   ├── lib/                # Backend utilities, services, rate limiter, and storage clients
│   │   ├── database/       # Mongoose singleton connection pooling
│   │   ├── services/       # Core business logic (paper aggregation, AI analyzer, uploads)
│   │   ├── storage/        # Cloudinary integration and PDF compression
│   │   └── utils/          # Formatting helpers, string sanitizers, response wrappers
│   └── styles/             # Tailwind CSS global styles
├── .env.example            # Placeholder environment template
├── CONTRIBUTING.md         # Open-source contribution guidelines
├── LICENSE                 # MIT source code license with content notice
├── next.config.js          # Next.js configuration & CDN caching headers
└── vercel.json             # Vercel edge caching rules
```

---

## 🛠️ Development & Quality Checks

- **Run TypeScript Type Check:**
  ```bash
  npx tsc --noEmit
  ```
- **Run Linter:**
  ```bash
  pnpm lint
  ```
- **Health Check Endpoint:**
  The server exposes a lightweight uptime probe at `/api/health` returning:
  ```json
  { "status": "ok", "timestamp": "2026-09-20T12:37:38.014Z" }
  ```

---

## 🤝 Contributing

We welcome contributions from fellow students and developers! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide for details on:
- How to fork and set up feature branches
- Coding standards and type safety expectations
- Submitting Pull Requests

Please note that this repository is strictly for **website source code**. Do not commit binary PDFs or private datasets in pull requests.

---

## 🛡️ Security

If you discover a security vulnerability or credential leak, please review our [SECURITY.md](SECURITY.md) policy and email us directly at **pyqvitap@gmail.com**. Please do not disclose vulnerabilities in public GitHub issues.

---

## ⚖️ Disclaimer & Rights

1. **Independent Project:** PyqVitAp is an independent student-run resource. It is not affiliated with, endorsed by, sponsored by, or operated by VIT-AP University.
2. **Trademarks:** All institutional names, marks, course titles, and codes remain the property of their respective owners.
3. **Third-Party Content:** Question papers and examination documents accessible through the platform remain subject to their respective intellectual property rights.
4. **No Warranty:** While efforts are made to ensure papers are indexed correctly by course code and slot, materials are provided on an *"as-is"* basis without warranty. Students should verify syllabus requirements and exam patterns with their course instructors.
5. **Copyright Inquiries & Takedowns:** If you are a copyright holder or authorized institutional representative and wish to request the modification or removal of any document, please email **pyqvitap@gmail.com** with details.

---

## 📄 License

The **PyqVitAp website source code** is licensed under the [MIT License](LICENSE).

> **Important License Boundary:**
> 
> The MIT License applies **only** to the original software source code contained within this repository. 
> 
> It **does NOT** apply to, grant rights to, or claim ownership over:
> - University question papers, answer keys, or syllabus documents.
> - University logos, trademarks, or institutional names.
> - Third-party PDFs or assets hosted on external content delivery networks.

---

## 📬 Contact

- **Project Email:** [pyqvitap@gmail.com](mailto:pyqvitap@gmail.com)
- **Live Platform:** [https://pyqvitap.vercel.app](https://pyqvitap.vercel.app)
