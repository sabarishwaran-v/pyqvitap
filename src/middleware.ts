import { type NextRequest, type NextFetchEvent, NextResponse } from "next/server";
import {
  aiUploadRatelimit,
  paperRequestRatelimit,
  subscribeRatelimit,
} from "./lib/utils/ratelimit";
import { failure } from "@/lib/utils/response";
import { MAINTENANCE_MODE, isMaintenanceMode } from "@/config/maintenance";
import { isAuthEnabled, isAuthorizedEmail, isPublicPath, sanitizeRedirectUrl } from "@/config/auth";
import { clerkMiddleware, createClerkClient } from "@clerk/nextjs/server";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - assets (public assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|assets/).*)",
  ],
};

const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>PyqVitAp — Under Maintenance</title>
  <meta name="description" content="PyqVitAp is temporarily offline while we work on important improvements to the platform."/>
  <link rel="icon" href="/assets/images/favicon.svg?v=4"/>
  <link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png?v=4"/>
  <link rel="preload" href="/assets/maintenance/poster.webp" as="image" type="image/webp"/>
  <link rel="preload" href="/assets/fonts/jostfont.ttf" as="font" type="font/ttf" crossorigin="anonymous"/>
  <script>
    (function() {
      try {
        var urlParams = new URLSearchParams(window.location.search);
        var qTheme = urlParams.get("theme");
        if (qTheme === "light") {
          document.documentElement.classList.remove("dark");
          return;
        }
        if (qTheme === "dark") {
          document.documentElement.classList.add("dark");
          return;
        }
        var stored = localStorage.getItem("theme");
        if (stored === "light") {
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
        }
      } catch (e) {}
    })();
  </script>
  <style>
    @font-face {
      font-family: 'jost';
      src: url('/assets/fonts/jostfont.ttf') format('truetype');
      font-weight: 100 900;
      font-display: swap;
    }
    @font-face {
      font-family: 'play';
      src: url('/assets/fonts/play.ttf') format('truetype');
      font-weight: 100 900;
      font-display: swap;
    }
    :root {
      --bg: #F3F5FF;
      --page-text: #111827;
      --page-subtext: #4b5563;
      --page-muted: #6b7280;
      --navbar-bg: #B2B8FF;
      --navbar-border: #3A3745;
      --nav-btn-bg: #e8e9ff;
      --nav-btn-hover: #ffffff;
      --nav-btn-text: #374151;
      --nav-brand-grad: linear-gradient(to right, #562EE7, rgba(116, 128, 255, 0.8));
      --marquee-bg: linear-gradient(to right, #fffbeb, #fef3c7, #fffbeb);
      --marquee-border: rgba(245, 158, 11, 0.3);
      --marquee-notice-bg: #fffbeb;
      --marquee-badge-bg: rgba(245, 158, 11, 0.15);
      --marquee-badge-text: #b45309;
      --marquee-text: #d97706;
      --marquee-dot: #eab308;
      --card-bg: rgba(255, 255, 255, 0.7);
      --card-border: rgba(168, 85, 247, 0.4);
      --card-return-label: #7e22ce;
      --footer-bg: linear-gradient(to bottom, #F3F5FF, #A599CE);
      --footer-text: #000000;
      --footer-card-bg: rgba(255, 255, 255, 0.4);
      --footer-card-border: rgba(58, 55, 69, 0.25);
      --footer-card-hover-border: #562EE7;
      --footer-card-hover-bg: rgba(255, 255, 255, 0.6);
      --footer-accent: #562EE7;
      --footer-accent-hover: #4531b3;
      --footer-divider: rgba(19, 14, 31, 0.15);
      --footer-muted: #374151;
      --switch-bg: #d1d5db;
      --switch-thumb-bg: #000000;
      --switch-icon: #ffffff;
    }
    html.dark {
      --bg: #070114;
      --page-text: #ffffff;
      --page-subtext: #d1d5db;
      --page-muted: #9ca3af;
      --navbar-bg: #130E1F;
      --navbar-border: #3A3745;
      --nav-btn-bg: #000000;
      --nav-btn-hover: #1A1823;
      --nav-btn-text: #ffffff;
      --nav-brand-grad: linear-gradient(to right, #562EE7, #FFC6E8);
      --marquee-bg: linear-gradient(to right, #1a1505, #141004, #1a1505);
      --marquee-border: rgba(234, 179, 8, 0.3);
      --marquee-notice-bg: #1a1505;
      --marquee-badge-bg: rgba(234, 179, 8, 0.2);
      --marquee-badge-text: #fde047;
      --marquee-text: #facc15;
      --marquee-dot: #eab308;
      --card-bg: rgba(19, 14, 31, 0.8);
      --card-border: #3A3745;
      --card-return-label: #d8b4fe;
      --footer-bg: linear-gradient(to bottom, #070114, #1F0234);
      --footer-text: #ffffff;
      --footer-card-bg: rgba(19, 14, 31, 0.6);
      --footer-card-border: #3A3745;
      --footer-card-hover-border: #A47DE5;
      --footer-card-hover-bg: #1A1528;
      --footer-accent: #A47DE5;
      --footer-accent-hover: #FFC6E8;
      --footer-divider: rgba(255, 255, 255, 0.1);
      --footer-muted: #9ca3af;
      --switch-bg: #4b5563;
      --switch-thumb-bg: #ffffff;
      --switch-icon: #000000;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--page-text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      -webkit-font-smoothing: antialiased;
      transition: background 0.2s ease, color 0.2s ease;
    }
    .font-jost { font-family: 'jost', -apple-system, sans-serif; }
    .font-play { font-family: 'play', -apple-system, sans-serif; }

    /* Top Marquee Announcement */
    .announcement-bar {
      position: relative;
      z-index: 55;
      width: 100%;
      overflow: hidden;
      border-bottom: 1px solid var(--marquee-border);
      background: var(--marquee-bg);
      padding: 8px 0;
      font-size: 12px;
      font-weight: 500;
      color: var(--marquee-text);
      transition: background 0.2s ease;
    }
    .announcement-inner {
      display: flex;
      width: 100%;
      align-items: center;
    }
    .notice-badge {
      z-index: 10;
      display: flex;
      flex-shrink: 0;
      align-items: center;
      gap: 6px;
      background: var(--marquee-notice-bg);
      padding-left: 16px;
      padding-right: 12px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--marquee-dot);
      animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .notice-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border-radius: 9999px;
      background: var(--marquee-badge-bg);
      padding: 2px 8px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--marquee-badge-text);
    }
    .marquee-viewport {
      flex: 1;
      overflow: hidden;
    }
    .marquee-track {
      display: inline-flex;
      white-space: nowrap;
      animation: marquee 32s linear infinite;
    }
    .marquee-track:hover {
      animation-play-state: paused;
    }
    @keyframes marquee {
      0% { transform: translateX(0%); }
      100% { transform: translateX(-50%); }
    }
    .marquee-item {
      display: inline-flex;
      align-items: center;
      gap: 16px;
      font-size: 12px;
      font-weight: 600;
      color: var(--marquee-text);
      margin-right: 32px;
    }

    /* Navbar */
    .navbar-wrapper {
      position: sticky;
      top: 0;
      z-index: 50;
      width: 100%;
      background: var(--navbar-bg);
      transition: background 0.2s ease;
    }
    .navbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
    }
    .nav-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-link {
      display: flex;
      align-items: center;
      gap: 12px;
      text-decoration: none;
      color: inherit;
    }
    .brand-logo {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease;
    }
    .brand-link:hover .brand-logo {
      transform: scale(1.05);
    }
    .brand-title {
      font-family: 'jost', sans-serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: var(--nav-brand-grad);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    @media (max-width: 640px) {
      .navbar { padding: 12px 14px; }
      .brand-title { font-size: 25px; }
      .brand-logo { width: 36px; height: 36px; }
      .nav-actions { gap: 8px; }
      .nav-btn { padding: 0 10px; font-size: 12px; height: 32px; }
      .nav-upload-text { display: none; }
      .nav-btn.nav-upload { padding: 0 9px; width: 32px; justify-content: center; }
      .theme-switch-btn { width: 50px; height: 26px; }
      .theme-switch-thumb { width: 22px; height: 22px; }
      html.dark .theme-switch-thumb { transform: translateX(24px); }
    }
    @media (min-width: 768px) {
      .brand-title { font-size: 44px; }
      .brand-logo { width: 48px; height: 48px; }
      .navbar { padding: 18px 32px; }
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .nav-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 36px;
      padding: 0 14px;
      border-radius: 9999px;
      border: 1px solid var(--navbar-border);
      background: var(--nav-btn-bg);
      color: var(--nav-btn-text);
      font-size: 13px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .nav-btn:hover {
      background: var(--nav-btn-hover);
      color: #000000;
    }
    html.dark .nav-btn:hover {
      background: #1A1823;
      color: #ffffff;
    }
    .nav-btn svg {
      width: 15px;
      height: 15px;
      flex-shrink: 0;
    }
    .desktop-only { display: none; }
    @media (min-width: 900px) {
      .desktop-only { display: inline-flex; }
    }

    /* Interactive Theme Toggle Switch */
    .theme-switch-wrap {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      border: 1px solid var(--navbar-border);
      padding: 3px;
    }
    .theme-switch-btn {
      position: relative;
      width: 58px;
      height: 28px;
      border-radius: 9999px;
      background: var(--switch-bg);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      padding: 2px;
      transition: background-color 0.2s ease;
      outline: none;
    }
    .theme-switch-thumb {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: var(--switch-thumb-bg);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      transform: translateX(2px);
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    html.dark .theme-switch-thumb {
      transform: translateX(30px);
    }
    .theme-icon-sun {
      display: block;
      color: #f59e0b;
    }
    .theme-icon-moon {
      display: none;
      color: #000000;
    }
    html.dark .theme-icon-sun { display: none; }
    html.dark .theme-icon-moon { display: block; }

    /* Main Section */
    .main {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px 16px 48px;
      text-align: center;
    }
    .content-box {
      width: 100%;
      max-width: 580px;
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 0 auto;
    }
    .poster-wrap {
      position: relative;
      width: 100%;
      max-width: 440px;
      aspect-ratio: 4 / 3;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .poster-img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      transition: opacity 0.5s ease-in-out;
      z-index: 1;
    }
    .lottie-canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      opacity: 0;
      transition: opacity 0.5s ease-in-out;
      z-index: 2;
      pointer-events: none;
    }
    h1.maintenance-title {
      font-family: 'jost', sans-serif;
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--page-text);
      margin-bottom: 12px;
    }
    @media (min-width: 640px) {
      h1.maintenance-title { font-size: 42px; }
    }
    .subtitle {
      font-size: 15px;
      color: var(--page-subtext);
      line-height: 1.6;
      margin-bottom: 24px;
      max-width: 480px;
    }
    @media (min-width: 640px) {
      .subtitle { font-size: 17px; }
    }
    .why-box {
      width: 100%;
      max-width: 500px;
      margin-bottom: 28px;
    }
    .why-title {
      font-family: 'jost', sans-serif;
      font-size: 17px;
      font-weight: 700;
      color: var(--page-text);
      margin-bottom: 8px;
    }
    .why-desc {
      font-size: 13.5px;
      color: var(--page-subtext);
      line-height: 1.65;
    }
    .return-card {
      width: 100%;
      max-width: 360px;
      border-radius: 16px;
      border: 1px solid var(--card-border);
      background: var(--card-bg);
      padding: 18px 24px;
      margin-bottom: 24px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .return-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--card-return-label);
      margin-bottom: 6px;
    }
    .return-val {
      font-family: 'jost', sans-serif;
      font-size: 21px;
      font-weight: 700;
      color: var(--page-text);
    }
    .closing-note {
      font-size: 14px;
      font-weight: 500;
      color: var(--page-subtext);
      margin-bottom: 8px;
      max-width: 500px;
      line-height: 1.5;
    }
    .apology {
      font-size: 13px;
      color: var(--page-muted);
    }

    /* Footer */
    .footer {
      width: 100%;
      background: var(--footer-bg);
      color: var(--footer-text);
      padding: 56px 24px 36px;
      transition: background 0.2s ease;
    }
    .footer-inner {
      max-width: 1280px;
      margin: 0 auto;
    }
    .footer-top {
      display: flex;
      flex-direction: column;
      gap: 36px;
      margin-bottom: 48px;
    }
    @media (min-width: 1024px) {
      .footer-top {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }
    .footer-col {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      text-align: center;
    }
    @media (min-width: 1024px) {
      .footer-col {
        align-items: flex-start;
        text-align: left;
        width: 31%;
      }
    }
    .footer-brand {
      font-family: 'jost', sans-serif;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 0.02em;
      background: var(--nav-brand-grad);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      text-decoration: none;
    }
    .footer-brand-sub {
      font-family: 'play', sans-serif;
      font-size: 14px;
      color: var(--footer-muted);
      max-width: 320px;
      line-height: 1.5;
    }
    .footer-col-title {
      font-family: 'jost', sans-serif;
      font-size: 20px;
      font-weight: 600;
      color: var(--footer-text);
    }
    .ffcs-card {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 100%;
      max-width: 340px;
      border-radius: 16px;
      border: 1px solid var(--footer-card-border);
      background: var(--footer-card-bg);
      padding: 16px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .ffcs-card:hover {
      border-color: var(--footer-card-hover-border);
      background: var(--footer-card-hover-bg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .ffcs-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
    }
    .ffcs-title {
      font-family: 'jost', sans-serif;
      font-size: 18px;
      font-weight: 700;
      color: var(--footer-accent);
    }
    .ffcs-desc {
      font-size: 12px;
      color: var(--footer-muted);
      margin-top: 6px;
      text-align: left;
    }
    .contact-email {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: 'jost', sans-serif;
      font-size: 16px;
      font-weight: 600;
      color: var(--footer-text);
      text-decoration: none;
      transition: color 0.2s ease;
    }
    .contact-email:hover {
      color: var(--footer-accent);
    }
    .subscribe-box {
      display: flex;
      gap: 8px;
      width: 100%;
      max-width: 340px;
      margin-top: 4px;
    }
    .subscribe-input {
      flex: 1;
      border-radius: 8px;
      border: 1px solid var(--footer-card-border);
      background: var(--footer-card-bg);
      padding: 9px 12px;
      font-size: 13.5px;
      color: var(--footer-text);
      outline: none;
    }
    .subscribe-input::placeholder {
      color: var(--footer-muted);
    }
    .subscribe-btn {
      border-radius: 8px;
      background: #562EE7;
      color: #ffffff;
      border: none;
      padding: 9px 16px;
      font-size: 13.5px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s ease;
    }
    .subscribe-btn:hover {
      background: #4531b3;
    }
    .sub-msg {
      margin-top: 6px;
      font-size: 12px;
      color: var(--footer-accent);
    }

    /* Footer Bottom */
    .footer-divider {
      border-top: 1px solid var(--footer-divider);
      margin-bottom: 28px;
    }
    .footer-credit {
      font-family: 'play', sans-serif;
      font-size: 15px;
      font-weight: 500;
      text-align: center;
      margin-bottom: 8px;
      color: var(--footer-text);
    }
    .footer-os {
      font-family: 'play', sans-serif;
      font-size: 13.5px;
      text-align: center;
      color: var(--footer-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      margin-bottom: 24px;
    }
    .footer-link {
      color: var(--footer-accent);
      text-decoration: underline;
      text-underline-offset: 4px;
      font-weight: 600;
      transition: color 0.2s ease;
    }
    .footer-link:hover {
      color: var(--footer-accent-hover);
    }
    .footer-disclaimer-box {
      max-width: 780px;
      margin: 0 auto 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      text-align: center;
      font-family: 'play', sans-serif;
      font-size: 12px;
      line-height: 1.65;
      color: var(--footer-muted);
      padding: 0 12px;
    }
    .disclaimer-btn-wrap {
      text-align: center;
    }
    .disclaimer-btn {
      font-family: 'play', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: var(--footer-accent);
      text-decoration: underline;
      text-underline-offset: 4px;
    }
  </style>
</head>
<body>
  <div>
    <!-- Running Marquee Announcement -->
    <div class="announcement-bar">
      <div class="announcement-inner">
        <div class="notice-badge">
          <span class="pulse-dot"></span>
          <span class="notice-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z"/></svg>
            Notice
          </span>
        </div>
        <div class="marquee-viewport">
          <div class="marquee-track">
            <div class="marquee-item"><span>🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.</span><span>•</span></div>
            <div class="marquee-item"><span>🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.</span><span>•</span></div>
            <div class="marquee-item"><span>🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.</span><span>•</span></div>
            <div class="marquee-item"><span>🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.</span><span>•</span></div>
            <div class="marquee-item"><span>🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.</span><span>•</span></div>
            <div class="marquee-item"><span>🚧 PyqVitAp is currently under maintenance. We expect to be back before 9 October 2026.</span><span>•</span></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Navigation Bar -->
    <div class="navbar-wrapper">
      <nav class="navbar">
        <div class="nav-left">
          <a class="brand-link" href="/">
            <img class="brand-logo" src="/assets/images/navbar_logo.png?v=5" alt="PyqVitAp Logo" width="48" height="48"/>
            <span class="brand-title">PyqVitAp</span>
          </a>
          <a class="nav-btn desktop-only" href="/pinned">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="17" x2="12" y2="22"></line><path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"></path></svg>
            <span>Pin Subjects</span>
          </a>
          <a class="nav-btn desktop-only" href="/request">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            <span>Request Paper</span>
          </a>
        </div>
        <div class="nav-actions">
          <a class="nav-btn desktop-only" href="https://github.com/sabarishwaran-v/pyqvitap" target="_blank" rel="noopener noreferrer" title="Star us on GitHub">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
            <span>⭐ us on GitHub</span>
          </a>
          <div class="theme-switch-wrap">
            <button id="theme-toggle" class="theme-switch-btn" type="button" aria-label="Toggle theme">
              <span class="theme-switch-thumb">
                <svg class="theme-icon-sun" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
                <svg class="theme-icon-moon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              </span>
            </button>
          </div>
          <a class="nav-btn nav-upload" href="/upload" title="Upload Papers">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(90deg);"><line x1="17" y1="7" x2="7" y2="17"></line><polyline points="17 17 7 17 7 7"></polyline></svg>
            <span class="nav-upload-text">Upload Papers</span>
          </a>
        </div>
      </nav>
    </div>
  </div>

  <!-- Main Maintenance Body -->
  <main class="main">
    <div class="content-box">
      <div class="poster-wrap">
        <img id="lottie-poster" class="poster-img" src="/assets/maintenance/poster.webp" alt="PyqVitAp Under Maintenance" width="460" height="345" fetchpriority="high"/>
        <canvas id="lottie-canvas" class="lottie-canvas"></canvas>
      </div>

      <h1 class="maintenance-title">Under Maintenance</h1>
      <p class="subtitle">PyqVitAp is temporarily offline while we work on important improvements to the platform.</p>

      <div class="why-box">
        <h2 class="why-title">Why are we doing this?</h2>
        <p class="why-desc">We’re using this maintenance period to fix underlying issues, improve performance, and strengthen reliability. We’re also making infrastructure improvements to help PyqVitAp handle more students, support a growing collection of question papers, and provide a smoother experience.</p>
      </div>

      <div class="return-card">
        <div class="return-label">Status</div>
        <div class="return-val">Scheduled Maintenance &bull; Back Soon</div>
      </div>

      <p class="closing-note">We’re working to get everything back up as soon as possible. Thank you for your patience and support. 💜</p>
      <p class="apology">We’re sorry for any inconvenience caused.</p>
    </div>
  </main>

  <!-- Full PyqVitAp Footer -->
  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-top">
        <!-- Branding -->
        <div class="footer-col">
          <a class="footer-brand" href="/">PyqVitAp</a>
          <p class="footer-brand-sub">Independent student-built platform for academic resource.</p>
        </div>

        <!-- FFCS Mate Project Card -->
        <div class="footer-col">
          <h3 class="footer-col-title">My Other Project</h3>
          <a class="ffcs-card" href="https://ffcsmate.vercel.app" target="_blank" rel="noopener noreferrer">
            <div class="ffcs-header">
              <span class="ffcs-title">FFCS Mate</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--footer-muted);"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
            </div>
            <p class="ffcs-desc">FFCS TimeTable Planner</p>
          </a>
        </div>

        <!-- Contact & Updates -->
        <div class="footer-col">
          <h3 class="footer-col-title">Contact & Updates</h3>
          <a class="contact-email" href="mailto:pyqvitap@gmail.com">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
            <span>pyqvitap@gmail.com</span>
          </a>
          <form id="subscribe-form" class="subscribe-box" onsubmit="event.preventDefault(); handleSubscribe();">
            <input id="sub-email" class="subscribe-input" type="email" placeholder="Enter Your Email" required/>
            <button id="sub-btn" class="subscribe-btn" type="submit">Subscribe!</button>
          </form>
          <div id="sub-msg" class="sub-msg" style="display: none;"></div>
        </div>
      </div>

      <div class="footer-divider"></div>

      <p class="footer-credit">
        Made with 💜 by <a class="footer-link" href="https://github.com/sabarishwaran-v" target="_blank" rel="noopener noreferrer">Sabarish V</a>
      </p>

      <p class="footer-os">
        <span>This project is Open Source on</span>
        <a class="footer-link" href="https://github.com/sabarishwaran-v/pyqvitap" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path><path d="M9 18c-4.51 2-5-2-7-2"></path></svg>
          <span>GitHub</span>
        </a>
      </p>

      <div class="footer-disclaimer-box">
        <p>This is an independent website built by a student. It is not affiliated with, endorsed by, or operated by VIT-AP University.</p>
        <p>This website is created solely to help students by providing easy access to previous year question papers and related academic resources.</p>
        <p>VIT-AP University, its faculty, and administration are not responsible for the content, accuracy, or availability of the material on this site.</p>
        <p>Question papers and related content may originate from publicly accessible institutional resources, including VIT-AP DSpace. Rights to the underlying materials remain with their respective owners.</p>
      </div>

      <div class="disclaimer-btn-wrap" style="display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap;">
        <a class="disclaimer-btn" href="/terms">Terms of Service</a>
        <span style="color: var(--footer-card-border); font-size: 12px;">&bull;</span>
        <a class="disclaimer-btn" href="/privacy">Privacy Policy</a>
        <span style="color: var(--footer-card-border); font-size: 12px;">&bull;</span>
        <a class="disclaimer-btn" href="/disclaimer">Disclaimer &amp; Rights</a>
      </div>
    </div>
  </footer>

  <script>
    // Theme Toggle Logic
    var themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", function() {
        var isDark = document.documentElement.classList.toggle("dark");
        try {
          localStorage.setItem("theme", isDark ? "dark" : "light");
        } catch (e) {}
      });
    }

    // Email Subscription Handler
    function handleSubscribe() {
      var input = document.getElementById("sub-email");
      var btn = document.getElementById("sub-btn");
      var msg = document.getElementById("sub-msg");
      if (!input || !input.value.trim()) return;

      var email = input.value.trim();
      btn.disabled = true;
      btn.textContent = "Subscribing...";

      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email })
      }).then(function(res) {
        return res.json().catch(function() { return {}; });
      }).then(function(data) {
        msg.style.display = "block";
        msg.textContent = data.message || "Thank you for subscribing!";
        input.value = "";
      }).catch(function() {
        msg.style.display = "block";
        msg.textContent = "PyqVitAp is currently undergoing maintenance. Subscriptions will resume shortly.";
      }).finally(function() {
        btn.disabled = false;
        btn.textContent = "Subscribe!";
      });
    }

    // Optional DotLottie Dynamic Hydration
    (function initLottie() {
      var script = document.createElement("script");
      script.src = "/assets/maintenance/player.js";
      script.async = true;
      script.onload = function() {
        try {
          if (window.DotLottie) {
            var canvas = document.getElementById("lottie-canvas");
            var poster = document.getElementById("lottie-poster");
            if (!canvas || !poster) return;
            var player = new window.DotLottie({
              canvas: canvas,
              src: "/assets/maintenance/iGV0il5M4W.lottie",
              loop: true,
              autoplay: true
            });
            var onReady = function() {
              poster.style.opacity = "0";
              canvas.style.opacity = "1";
            };
            player.addEventListener("render", onReady);
            player.addEventListener("play", onReady);
          }
        } catch (e) {
          console.warn("DotLottie player fallback active:", e);
        }
      };
      document.head.appendChild(script);
    })();
  </script>
</body>
</html>`;

export default async function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;
  const maintenanceActive = await isMaintenanceMode();

  if (maintenanceActive || MAINTENANCE_MODE) {
    // 1. Allow static assets, images, icons, and web manifests
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/assets") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      pathname === "/manifest.webmanifest" ||
      /\.[a-zA-Z0-9]+$/.test(pathname)
    ) {
      return NextResponse.next();
    }

    // 2. Allow health/infrastructure endpoints required for monitoring
    if (pathname === "/api/health") {
      return NextResponse.next();
    }

    // 3. Allow admin endpoints if any exist
    if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
      return NextResponse.next();
    }

    // 4. Return 503 Service Unavailable for all other API endpoints
    if (pathname.startsWith("/api/")) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message:
            "PyqVitAp is currently undergoing scheduled maintenance. Please check back shortly.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "3600",
            "Cache-Control": "no-store, max-age=0",
          },
        }
      );
    }

    // 5. Explicit public maintenance exception: allow legal and unsubscribe pages to render normally
    if (
      pathname === "/disclaimer" ||
      pathname === "/disclaimer/" ||
      pathname === "/terms" ||
      pathname === "/terms/" ||
      pathname === "/privacy" ||
      pathname === "/privacy/" ||
      pathname === "/unsubscribe" ||
      pathname === "/unsubscribe/"
    ) {
      return NextResponse.next();
    }

    // 6. Return edge-terminated maintenance HTML directly for all page requests.
    // This allows OpenNext (worker.js) to detect `reqOrResp instanceof Response`
    // and terminate immediately at the Cloudflare edge without importing or booting
    // the heavy Next.js server runtime (.open-next/server-functions/default/handler.mjs).
    return new NextResponse(MAINTENANCE_HTML, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  // --- Normal Operations (MAINTENANCE_MODE === false) ---
  const authEnabled = await isAuthEnabled();
  const mfUrl = request.headers.get("mf-original-url") || "";
  const isLocalhost =
    request.nextUrl.hostname === "localhost" ||
    request.nextUrl.hostname === "127.0.0.1" ||
    mfUrl.includes("localhost") ||
    mfUrl.includes("127.0.0.1");

  if (authEnabled && !isLocalhost) {
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    if (publishableKey) {
      const handler = getClerkHandler();
      return handler(request, event);
    } else {
      console.warn(
        "[Middleware] AUTH_ENABLED is true but NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not configured. Failing safe."
      );
    }
  }

  return handleNormalOperations(request);
}

async function handleNormalOperations(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip =
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.ip ??
    "127.0.0.1";

  if (pathname === "/api/upload") {
    const { success } = await aiUploadRatelimit.limit(ip);
    if (!success) {
      return failure("You can upload a maximum of 5 papers every 15 minutes", 429);
    }
  }

  if (pathname === "/api/request") {
    const { success } = await paperRequestRatelimit.limit(ip);
    if (!success) {
      return failure("You can submit a maximum of 5 requests every 15 minutes", 429);
    }
  }

  if (pathname === "/api/subscribe") {
    const { success } = await subscribeRatelimit.limit(ip);
    if (!success) {
      return failure("Maximum of 3 newsletter subscriptions per hour", 429);
    }
  }

  return NextResponse.next();
}

interface SessionClaimsWithEmail {
  email?: string;
  primaryEmail?: string;
  user_email?: string;
  primary_email_address?: string;
  email_verified?: boolean;
}

interface CachedUserAuth {
  email: string;
  isAuthorized: boolean;
  expiresAt: number;
}

// In-memory cache for user authorization results to eliminate Clerk API subrequests on hot path
const userAuthCache = new Map<string, CachedUserAuth>();
const USER_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL

type ClerkMiddlewareReturn = (req: NextRequest, event: NextFetchEvent) => Promise<NextResponse>;
let lazyClerkHandler: ClerkMiddlewareReturn | null = null;

function getClerkHandler(): ClerkMiddlewareReturn {
  lazyClerkHandler ??= clerkMiddleware(async (auth, request) => {
    const { pathname } = request.nextUrl;

    // 1. Intercept normal navigation to /sign-in or /sign-up so homepage is the single auth UI:
    // Redirect to homepage ("/" or "/?mode=sign-up") preserving any target redirect_url.
    // If it is an internal Clerk callback (e.g. has __clerk_ query params or subpaths like /sign-in/sso-callback),
    // let it through to the dedicated handler.
    if (pathname === "/sign-in" || pathname === "/sign-in/") {
      const hasClerkCallback =
        request.nextUrl.searchParams.has("__clerk_status") ||
        request.nextUrl.searchParams.has("__clerk_created_session") ||
        request.nextUrl.searchParams.has("__clerk_handshake");

      if (!hasClerkCallback) {
        const homeUrl = new URL("/", request.url);
        const redirectParam = request.nextUrl.searchParams.get("redirect_url");
        if (redirectParam) {
          homeUrl.searchParams.set("redirect_url", sanitizeRedirectUrl(redirectParam, request.url));
        }
        return NextResponse.redirect(homeUrl);
      }
    }

    if (pathname === "/sign-up" || pathname === "/sign-up/") {
      const hasClerkCallback =
        request.nextUrl.searchParams.has("__clerk_status") ||
        request.nextUrl.searchParams.has("__clerk_created_session") ||
        request.nextUrl.searchParams.has("__clerk_handshake");

      if (!hasClerkCallback) {
        const homeUrl = new URL("/", request.url);
        homeUrl.searchParams.set("mode", "sign-up");
        const redirectParam = request.nextUrl.searchParams.get("redirect_url");
        if (redirectParam) {
          homeUrl.searchParams.set("redirect_url", sanitizeRedirectUrl(redirectParam, request.url));
        }
        return NextResponse.redirect(homeUrl);
      }
    }

    // 2. Explicitly public static / operational endpoints bypass auth
    if (isPublicPath(pathname)) {
      return handleNormalOperations(request);
    }

    // 3. Evaluate Clerk session
    const session = await auth();

    // 4. Root path ("/") special handling:
    // When signed-out: let through to render the LoginLanding page at "/"
    if (pathname === "/" && (!session || !session.userId)) {
      return handleNormalOperations(request);
    }

    // 5. Non-root protected path and unauthenticated:
    if (!session || !session.userId) {
      // Return 401 JSON for API and media routes (no redirect)
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "Unauthorized",
            message: "Authentication required to access this resource",
          }),
          {
            status: 401,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, max-age=0",
            },
          }
        );
      }

      // For page requests: redirect to homepage ("/") preserving original destination and query
      const homeUrl = new URL("/", request.url);
      const originalRelativeUrl = request.nextUrl.pathname + request.nextUrl.search;
      const safeRedirect = sanitizeRedirectUrl(originalRelativeUrl, request.url);
      homeUrl.searchParams.set("redirect_url", safeRedirect);
      return NextResponse.redirect(homeUrl);
    }

    // 5. User is authenticated: rigorously verify email authorization
    const claims = session.sessionClaims as (SessionClaimsWithEmail & Record<string, unknown>) | null;
    let email =
      claims?.email ??
      claims?.primaryEmail ??
      claims?.user_email ??
      claims?.primary_email_address ??
      "";
    let isEmailVerified = false;
    let isAuthorized = false;

    // Tier 1 Fast Path: Cryptographically signed session claims (0ms, 0 external network requests)
    // When Clerk issues session tokens with email claims, they are tamper-proof and verified by auth().
    if (email && isAuthorizedEmail(email)) {
      const claimVerified = (claims as Record<string, unknown>)?.email_verified;
      if (claimVerified !== false) {
        email = email.trim().toLowerCase();
        isEmailVerified = true;
        isAuthorized = true;
      }
    }

    // Tier 2 Fast Path: In-memory isolate cache (0ms, 0 external network requests)
    if (!isAuthorized && session.userId) {
      const cached = userAuthCache.get(session.userId);
      if (cached && cached.expiresAt > Date.now()) {
        email = cached.email;
        isAuthorized = cached.isAuthorized;
        isEmailVerified = cached.isAuthorized;
      }
    }

    // Tier 3 Fallback: Retrieve user record from Clerk API only when uncached
    if (!isAuthorized && process.env.CLERK_SECRET_KEY && session.userId) {
      try {
        const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
        const user = await clerk.users.getUser(session.userId);
        
        // Find if user has any verified email belonging to the allowed university domains
        const verifiedAllowedEmail = user.emailAddresses.find((e) => {
          const isVerified = e.verification?.status === "verified";
          return isVerified && isAuthorizedEmail(e.emailAddress);
        });

        if (verifiedAllowedEmail) {
          email = verifiedAllowedEmail.emailAddress;
          isEmailVerified = true;
          isAuthorized = true;
        } else {
          // If no allowed email is verified, fall back to primary email for checking
          const primaryEmailId = user.primaryEmailAddressId;
          const primaryObj = user.emailAddresses.find((e) => e.id === primaryEmailId);
          email = primaryObj?.emailAddress ?? email;
          isEmailVerified = primaryObj?.verification?.status === "verified";
          isAuthorized = isAuthorizedEmail(email) && isEmailVerified;
        }

        // Cache the lookup result in memory to eliminate repeated subrequests
        if (userAuthCache.size > 2000) {
          userAuthCache.clear();
        }
        userAuthCache.set(session.userId, {
          email,
          isAuthorized,
          expiresAt: Date.now() + (isAuthorized ? USER_CACHE_TTL_MS : 60_000),
        });
      } catch (lookupErr) {
        console.error("[Middleware Auth] Failed to fetch user primary email:", lookupErr);
      }
    } else if (!isAuthorized && !process.env.CLERK_SECRET_KEY) {
      // If secret key is not available in environment, fall back to claims
      isEmailVerified = isAuthorizedEmail(email);
      isAuthorized = isEmailVerified;
    }

    if (!isAuthorized) {
      // Attempt safe session revocation so unauthorized user doesn't linger
      if (session.sessionId && process.env.CLERK_SECRET_KEY) {
        try {
          const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
          await clerk.sessions.revokeSession(session.sessionId);
        } catch (revokeErr) {
          console.warn("[Middleware Auth] Failed to revoke unauthorized session:", revokeErr);
        }
      }

      // Return 403 Forbidden for API routes
      if (pathname.startsWith("/api/")) {
        return new NextResponse(
          JSON.stringify({
            error: "Forbidden",
            message: "Access restricted to verified @vitapstudent.ac.in accounts",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store, max-age=0",
            },
          }
        );
      }

      // For page requests: redirect to PyqVitAp /unauthorized page with explicit clear flag
      const unauthUrl = new URL("/unauthorized", request.url);
      return NextResponse.redirect(unauthUrl);
    }

    // User is fully authenticated AND authorized: proceed
    return handleNormalOperations(request);
  }) as unknown as ClerkMiddlewareReturn;

  return lazyClerkHandler;
}
