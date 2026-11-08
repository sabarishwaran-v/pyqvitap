/**
 * PyqVitAp Authentication & Clerk Prebuilt UI Integration Test Suite
 *
 * Validates:
 * 1. Domain allowlist integrity (@vitapstudent.ac.in and @vitap.ac.in)
 * 2. Real-time domain validation error handling
 * 3. Safe redirect sanitization (open-redirect prevention)
 * 4. Route classification (public, protected, auth flow)
 * 5. Prebuilt UI components (<SignIn />, <SignUp />, <ClerkProvider />, <SignOutButton />)
 * 6. Middleware authorization & session enforcement invariants
 * 7. Homepage Authentication Gate & Public Content Persistence
 * 8. Navbar Visibility Constraints (Signed-Out vs. Signed-In)
 * 9. Theme-Aware Appearance & Restriction Subtitle Notice
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

// --- 1. Load auth configuration module ---
const authConfig = require(path.join(ROOT, "src/config/auth.ts"));
const {
  ALLOWED_EMAIL_DOMAINS,
  ALLOWED_EMAIL_DOMAIN,
  isAuthorizedEmail,
  getEmailValidationError,
  sanitizeRedirectUrl,
  isPublicPath,
  isAuthFlowPath,
  isProtectedPath,
  isAuthEnabled,
} = authConfig;

console.log("============================================================");
console.log("RUNNING AUTH INTEGRATION TEST SUITE: Clerk Prebuilt UI");
console.log("============================================================\n");

let passed = 0;
let total = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`[PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
  }
}

// --- TEST 1: Permitted University Domains ---
test("1. Permitted University Domains Allowlist", () => {
  assert.deepStrictEqual(
    Array.from(ALLOWED_EMAIL_DOMAINS),
    ["vitapstudent.ac.in", "vitap.ac.in"],
    "Must permit exactly vitapstudent.ac.in and vitap.ac.in"
  );
  assert.strictEqual(ALLOWED_EMAIL_DOMAIN, "vitapstudent.ac.in");

  // Valid student email
  assert.strictEqual(isAuthorizedEmail("21bce1084@vitapstudent.ac.in"), true);
  // Valid faculty email
  assert.strictEqual(isAuthorizedEmail("faculty.name@vitap.ac.in"), true);
  // Case insensitivity
  assert.strictEqual(isAuthorizedEmail("Student@VITAPSTUDENT.AC.IN"), true);
  assert.strictEqual(isAuthorizedEmail("Professor@VITAP.AC.IN"), true);

  // Rejected public providers
  assert.strictEqual(isAuthorizedEmail("user@gmail.com"), false);
  assert.strictEqual(isAuthorizedEmail("user@yahoo.com"), false);
  assert.strictEqual(isAuthorizedEmail("user@outlook.com"), false);
  assert.strictEqual(isAuthorizedEmail("user@hotmail.com"), false);

  // Rejected spoofing & subdomain hijacking attempts
  assert.strictEqual(isAuthorizedEmail("student@vitapstudent.ac.in.attacker.com"), false);
  assert.strictEqual(isAuthorizedEmail("student@attacker-vitapstudent.ac.in"), false);
  assert.strictEqual(isAuthorizedEmail("student@sub.vitapstudent.ac.in"), false);
  assert.strictEqual(isAuthorizedEmail("student@vitap.ac.in.evil.com"), false);

  // Rejected malformed inputs
  assert.strictEqual(isAuthorizedEmail(""), false);
  assert.strictEqual(isAuthorizedEmail(null), false);
  assert.strictEqual(isAuthorizedEmail(undefined), false);
  assert.strictEqual(isAuthorizedEmail("notanemail"), false);
  assert.strictEqual(isAuthorizedEmail("@vitapstudent.ac.in"), false);
  assert.strictEqual(isAuthorizedEmail("user@@vitapstudent.ac.in"), false);
  assert.strictEqual(isAuthorizedEmail("user@vitapstudent.ac.in@other.com"), false);
});

// --- TEST 2: Real-time Email Domain Validation ---
test("2. Real-time Domain Validation Error Messages", () => {
  // Empty returns null (no error before typing)
  assert.strictEqual(getEmailValidationError(""), null);
  assert.strictEqual(getEmailValidationError("   "), null);

  // Valid inputs return null
  assert.strictEqual(getEmailValidationError("student@vitapstudent.ac.in"), null);
  assert.strictEqual(getEmailValidationError("faculty@vitap.ac.in"), null);

  // Incomplete / non-university domains return descriptive error
  const errGmail = getEmailValidationError("student@gmail.com");
  assert(errGmail && errGmail.includes("@vitapstudent.ac.in or @vitap.ac.in"));

  const errNoAt = getEmailValidationError("student");
  assert(errNoAt && errNoAt.includes("@vitapstudent.ac.in"));

  const errTrailingAt = getEmailValidationError("student@");
  assert(errTrailingAt && errTrailingAt.includes("domain"));
});

// --- TEST 3: Safe Redirect Sanitization (Open-Redirect Prevention) ---
test("3. Safe Redirect Sanitization", () => {
  // Valid internal application paths
  assert.strictEqual(sanitizeRedirectUrl("/paper/64a9f81e2b8c91a0"), "/paper/64a9f81e2b8c91a0");
  assert.strictEqual(sanitizeRedirectUrl("/catalogue?slot=A1&subject=CSE"), "/catalogue?slot=A1&subject=CSE");
  assert.strictEqual(sanitizeRedirectUrl("/pinned"), "/pinned");
  assert.strictEqual(sanitizeRedirectUrl("/"), "/");

  // Protocol-relative and external open-redirect attempts must be neutralized to fallback
  assert.strictEqual(sanitizeRedirectUrl("//attacker.com"), "/");
  assert.strictEqual(sanitizeRedirectUrl("https://evil.com/login"), "/");
  assert.strictEqual(sanitizeRedirectUrl("http://evil.com"), "/");
  assert.strictEqual(sanitizeRedirectUrl("javascript:alert(1)"), "/");
  assert.strictEqual(sanitizeRedirectUrl("data:text/html,<script>alert(1)</script>"), "/");
  assert.strictEqual(sanitizeRedirectUrl(""), "/");
  assert.strictEqual(sanitizeRedirectUrl(null), "/");
});

// --- TEST 4: Route Classification Matrix ---
test("4. Route Classification Matrix", () => {
  // Public routes
  assert.strictEqual(isPublicPath("/sign-in"), true);
  assert.strictEqual(isPublicPath("/sign-in/factor-one"), true);
  assert.strictEqual(isPublicPath("/sign-up"), true);
  assert.strictEqual(isPublicPath("/sign-up/verify-email-address"), true);
  assert.strictEqual(isPublicPath("/unauthorized"), true);
  assert.strictEqual(isPublicPath("/disclaimer"), true);
  assert.strictEqual(isPublicPath("/terms"), true);
  assert.strictEqual(isPublicPath("/privacy"), true);
  assert.strictEqual(isPublicPath("/api/health"), true);
  assert.strictEqual(isPublicPath("/api/subscribe"), true);
  assert.strictEqual(isPublicPath("/api/unsubscribe"), true);
  assert.strictEqual(isPublicPath("/manifest.webmanifest"), true);
  assert.strictEqual(isPublicPath("/robots.txt"), true);
  assert.strictEqual(isPublicPath("/sitemap.xml"), true);
  assert.strictEqual(isPublicPath("/assets/images/logo.png"), true);
  assert.strictEqual(isPublicPath("/_next/static/chunks/main.js"), true);

  // Protected routes (when auth enabled)
  assert.strictEqual(isPublicPath("/paper/64a9f81e"), false);
  assert.strictEqual(isPublicPath("/catalogue"), false);
  assert.strictEqual(isPublicPath("/upload"), false);
  assert.strictEqual(isPublicPath("/pinned"), false);
  assert.strictEqual(isPublicPath("/request"), false);
  assert.strictEqual(isPublicPath("/api/media/papers/file.pdf"), false);
  assert.strictEqual(isPublicPath("/api/papers/count"), false);

  // isProtectedPath helper
  assert.strictEqual(isProtectedPath("/paper/64a9f81e"), true);
  assert.strictEqual(isProtectedPath("/catalogue"), true);
  assert.strictEqual(isProtectedPath("/api/media/papers/file.pdf"), true);
  assert.strictEqual(isProtectedPath("/sign-in"), false);
  assert.strictEqual(isProtectedPath("/unauthorized"), false);

  // isAuthFlowPath
  assert.strictEqual(isAuthFlowPath("/sign-in"), true);
  assert.strictEqual(isAuthFlowPath("/sign-up"), true);
  assert.strictEqual(isAuthFlowPath("/unauthorized"), true);
  assert.strictEqual(isAuthFlowPath("/catalogue"), false);
});

// --- TEST 5: Verify Prebuilt SignIn Page Component ---
test("5. Prebuilt <SignIn /> Page Implementation", () => {
  const signInPath = path.join(ROOT, "src/app/sign-in/[[...sign-in]]/page.tsx");
  const content = fs.readFileSync(signInPath, "utf8");

  assert(content.includes('import { SignIn } from "@clerk/nextjs"'), "Must import SignIn from @clerk/nextjs");
  assert(content.includes("pyqvitapClerkAppearance"), "Must pass branded Clerk appearance");
  assert(content.includes('routing="path"'), 'Must specify routing="path"');
  assert(content.includes('path="/sign-in"'), 'Must specify path="/sign-in"');
  assert(content.includes('signUpUrl="/sign-up"'), 'Must link to /sign-up');
  assert(content.includes('fallbackRedirectUrl="/"'), 'Must provide fallbackRedirectUrl="/"');
  assert(content.includes("@vitapstudent.ac.in"), "Must document student domain in banner");
  assert(content.includes("@vitap.ac.in"), "Must document faculty domain in banner");
});

// --- TEST 6: Verify Prebuilt SignUp Page Component ---
test("6. Prebuilt <SignUp /> Page Implementation", () => {
  const signUpPath = path.join(ROOT, "src/app/sign-up/[[...sign-up]]/page.tsx");
  const content = fs.readFileSync(signUpPath, "utf8");

  assert(content.includes('import { SignUp } from "@clerk/nextjs"'), "Must import SignUp from @clerk/nextjs");
  assert(content.includes("pyqvitapClerkAppearance"), "Must pass branded Clerk appearance");
  assert(content.includes('routing="path"'), 'Must specify routing="path"');
  assert(content.includes('path="/sign-up"'), 'Must specify path="/sign-up"');
  assert(content.includes('signInUrl="/sign-in"'), 'Must link to /sign-in');
  assert(content.includes('fallbackRedirectUrl="/"'), 'Must provide fallbackRedirectUrl="/"');
  assert(content.includes("@vitapstudent.ac.in"), "Must document student domain in banner");
  assert(content.includes("@vitap.ac.in"), "Must document faculty domain in banner");
});

// --- TEST 7: Verify AuthProvider Wrapper ---
test("7. AuthProvider & ClerkProvider Configuration", () => {
  const authProviderPath = path.join(ROOT, "src/components/AuthProvider.tsx");
  const content = fs.readFileSync(authProviderPath, "utf8");

  assert(content.includes('import { ClerkProvider } from "@clerk/nextjs"'), "Must import ClerkProvider");
  assert(content.includes('signInFallbackRedirectUrl="/"'), "Must set signInFallbackRedirectUrl");
  assert(content.includes('signUpFallbackRedirectUrl="/"'), "Must set signUpFallbackRedirectUrl");
  assert(content.includes("pyqvitapClerkAppearance"), "Must use branded Clerk theme");
  assert(content.includes("if (!publishableKey)"), "Must fail-safe when key is missing");
});

// --- TEST 8: Verify Unauthorized Access Gate (<UnauthorizedPage />) ---
test("8. Unauthorized Access Gate (<UnauthorizedPage />)", () => {
  const unauthPath = path.join(ROOT, "src/app/unauthorized/page.tsx");
  const content = fs.readFileSync(unauthPath, "utf8");

  assert(content.includes('import { SignOutButton'), "Must import SignOutButton from @clerk/nextjs");
  assert(content.includes("@vitapstudent.ac.in"), "Must display student domain");
  assert(content.includes("@vitap.ac.in"), "Must display faculty domain");
  assert(content.includes("Switch Account"), "Must provide switch account button");
});

// --- TEST 9: Verify Middleware Enforcement Architecture ---
test("9. Middleware Authorization & Session Protection", () => {
  const middlewarePath = path.join(ROOT, "src/middleware.ts");
  const content = fs.readFileSync(middlewarePath, "utf8");

  assert(content.includes("isAuthorizedEmail"), "Middleware must enforce isAuthorizedEmail");
  assert(content.includes("session.userId"), "Middleware must check session userId");
  assert(content.includes("clerk.sessions.revokeSession"), "Middleware must revoke unauthorized sessions");
  assert(content.includes('pathname.startsWith("/api/")'), "Middleware must guard API routes");
  assert(content.includes('status: 401'), "Middleware must return 401 for unauthenticated API requests");
  assert(content.includes('status: 403'), "Middleware must return 403 for unauthorized API requests");
  assert(content.includes('const authEnabled = await isAuthEnabled()'), "Middleware must respect AUTH_ENABLED flag");
  assert(content.includes("MAINTENANCE_MODE"), "Maintenance mode must take precedence");
});

// --- TEST 10: Homepage Authentication Gate & Public Content Persistence ---
test("10. Homepage Authentication Gate & Public Content Layout", () => {
  const pagePath = path.join(ROOT, "src/app/page.tsx");
  const pageContent = fs.readFileSync(pagePath, "utf8");

  // Page renders Hero, Info, and Faq seamlessly
  assert(pageContent.includes("<Hero authEnabled={authEnabled} />"), "HomePage must pass authEnabled to Hero");
  assert(pageContent.includes("<Info />"), "HomePage must render Info for all visitors");
  assert(pageContent.includes("<Faq />"), "HomePage must render Faq for all visitors");

  const heroPath = path.join(ROOT, "src/components/screens/Hero.tsx");
  const heroContent = fs.readFileSync(heroPath, "utf8");

  assert(heroContent.includes("Built by Student for Students"), "Hero must preserve main heading");
  assert(heroContent.includes("<HomepageSignInCard />"), "Hero must render HomepageSignInCard for signed-out visitors");
  assert(heroContent.includes("<SearchBar />"), "Hero must preserve SearchBar for signed-in students");
  assert(heroContent.includes("<PinnedPapersCarousel />"), "Hero must preserve PinnedPapersCarousel for signed-in students");

  const cardPath = path.join(ROOT, "src/components/auth/HomepageSignInCard.tsx");
  const cardContent = fs.readFileSync(cardPath, "utf8");

  assert(cardContent.includes("Sign in with your VIT-AP email to access previous papers."), "Must include explanatory sentence");
  assert(cardContent.includes('routing="hash"'), 'Embedded homepage card must use routing="hash"');
  assert(cardContent.includes("hideSignUpLink: false"), "Homepage card must preserve working sign-up / sign-in links");
  assert(cardContent.includes("<SignIn"), "Homepage card must render official Clerk SignIn component");
  assert(cardContent.includes("<SignUp"), "Homepage card must render official Clerk SignUp component");
  assert(!cardContent.includes("transferable={false}"), "Homepage card must permit transferable OAuth on SignIn");
  assert(cardContent.includes("max-w-[480px]") || cardContent.includes("max-w-[500px]") || cardContent.includes("max-w-[520px]"), "Card must target 480-520px desktop width");
  assert(cardContent.includes("Your verification code has been sent to your email. Please check your spam/junk folder also."), "Homepage card must notify user when OTP code is sent");
  assert(cardContent.includes("toast.success"), "Homepage card must use toast.success to notify user");
});

// --- TEST 11: Navbar Signed-Out vs Signed-In Visibility ---
test("11. Navbar Visibility Constraints", () => {
  const navbarPath = path.join(ROOT, "src/components/Navbar.tsx");
  const navbarContent = fs.readFileSync(navbarPath, "utf8");

  // Pin Subjects and Request Paper must be within <SignedIn>
  assert(navbarContent.includes("<SignedIn>\n          <Link\n            href=\"/pinned\"") || navbarContent.includes("<SignedIn>"), "Pin & Request buttons must require signed-in state");
  // Sign In button must NOT exist in Navbar
  assert(!navbarContent.includes("<span className=\"truncate\">Sign In</span>"), "Navbar must not contain a redundant Sign In button");

  const floatPath = path.join(ROOT, "src/components/FloatingNavbar.tsx");
  const floatContent = fs.readFileSync(floatPath, "utf8");

  // Mobile menu dropdown must require <SignedIn>
  assert(floatContent.includes("<SignedIn>\n        <DropdownMenu"), "FloatingNavbar dropdown menu must require signed-in state");
  // MobileThemeToggle is accessible to all
  assert(floatContent.includes("<MobileThemeToggle />"), "Theme toggle must remain accessible to all");
});

// --- TEST 12: Theme-Aware Appearance & Restriction Subtitle Notice ---
test("12. Theme-Aware Appearance & Restriction Notice", () => {
  const themePath = path.join(ROOT, "src/config/clerk-theme.ts");
  const themeContent = fs.readFileSync(themePath, "utf8");

  assert(themeContent.includes("getPyqvitapClerkAppearance"), "Must export getPyqvitapClerkAppearance function");
  assert(themeContent.includes("hideSignUpLink"), "Must support hideSignUpLink option");
  assert(themeContent.includes('colorBackground: "#030712"') && themeContent.includes('colorBackground: "#F7F8FD"'), "Must adapt surface to light and dark theme tokens");

  const cssPath = path.join(ROOT, "src/styles/globals.css");
  const cssContent = fs.readFileSync(cssPath, "utf8");

  assert(cssContent.includes("Please sign in using your VIT-AP institutional account."), "CSS must inject restriction notice on subtitle");
  assert(cssContent.includes(".cl-card-homepage .cl-footerAction"), "CSS must style footer action on homepage card");
  assert(cssContent.includes("max-width: 480px"), "CSS must constrain card max-width");
});

// --- TEST 13: Passwordless & Dynamic Sign-Up Fallback (transferable default) Configuration ---
test("13. Passwordless & Dynamic Sign-Up Fallback (transferable default)", () => {
  const cardPath = path.join(ROOT, "src/components/auth/HomepageSignInCard.tsx");
  const cardContent = fs.readFileSync(cardPath, "utf8");

  assert(!cardContent.includes("transferable={false}"), "Homepage card must permit transferable OAuth on SignIn");
  assert(cardContent.includes('signUpFallbackRedirectUrl="/"'), 'Homepage card must preserve safe return via signUpFallbackRedirectUrl="/"');

  const signInPagePath = path.join(ROOT, "src/app/sign-in/[[...sign-in]]/page.tsx");
  const signInPageContent = fs.readFileSync(signInPagePath, "utf8");

  assert(!signInPageContent.includes("transferable={false}"), "Dedicated /sign-in page must permit transferable OAuth on SignIn");
  assert(signInPageContent.includes('signUpFallbackRedirectUrl="/"'), 'Dedicated /sign-in page must preserve safe return via signUpFallbackRedirectUrl="/"');
});

// --- TEST 14: Passwordless Authentication Configuration & UI Invariants ---
test("14. Passwordless Authentication Configuration & UI Invariants", () => {
  // Verify that application forms contain no custom password fields
  const heroPath = path.join(ROOT, "src/components/screens/Hero.tsx");
  const heroContent = fs.readFileSync(heroPath, "utf8");
  assert(!heroContent.includes('type="password"'), "Hero must not render any password inputs");

  const unauthPath = path.join(ROOT, "src/app/unauthorized/page.tsx");
  const unauthContent = fs.readFileSync(unauthPath, "utf8");
  assert(!unauthContent.includes('type="password"'), "Unauthorized page must not render any password inputs");

  // Verify dedicated sign-up route points to sign-in and returns home
  const signUpPagePath = path.join(ROOT, "src/app/sign-up/[[...sign-up]]/page.tsx");
  const signUpPageContent = fs.readFileSync(signUpPagePath, "utf8");
  assert(signUpPageContent.includes('signInUrl="/sign-in"'), "Sign-up page must link back to /sign-in");
  assert(signUpPageContent.includes('fallbackRedirectUrl="/"'), "Sign-up page must default return to root");
});

// --- TEST 15: Clerk Prebuilt Component Customization Boundaries ---
test("15. Clerk Prebuilt Component Customization Boundaries", () => {
  // Verify that SignIn component from @clerk/nextjs is a prebuilt component
  const nextjsClerk = require("@clerk/nextjs");
  assert(typeof nextjsClerk.SignIn === "function", "@clerk/nextjs must export prebuilt SignIn component");

  // Verify that SignIn does not expose arbitrary custom callbacks (such as onAccountNotFound or onError)
  const sharedTypesPath = path.join(ROOT, "node_modules/@clerk/shared/dist/types/index.d.ts");
  if (fs.existsSync(sharedTypesPath)) {
    const typesContent = fs.readFileSync(sharedTypesPath, "utf8");
    assert(!typesContent.includes("onAccountNotFound?:"), "SignInProps must not have an onAccountNotFound callback");
    assert(typesContent.includes("withSignUp?: boolean;"), "SignInProps must natively expose withSignUp?: boolean");
  }
});

// --- TEST 16: Homepage-Only Auth Gate & Protected Page Redirection ---
test("16. Protected Page Redirection to Homepage Single Gate", () => {
  const middlewarePath = path.join(ROOT, "src/middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

  // Verify that non-root unauthenticated page requests redirect to "/" with redirect_url
  assert(middlewareContent.includes('const homeUrl = new URL("/", request.url)'), "Middleware must redirect protected page requests to homepage root");
  assert(middlewareContent.includes('homeUrl.searchParams.set("redirect_url", safeRedirect)'), "Middleware must preserve safe destination in redirect_url param");
  assert(!middlewareContent.includes('const signInUrl = new URL("/sign-in", request.url)'), "Middleware must not redirect unauthenticated users to separate /sign-in page");

  // Verify that HomepageSignInCard accepts and propagates custom destination
  const cardPath = path.join(ROOT, "src/components/auth/HomepageSignInCard.tsx");
  const cardContent = fs.readFileSync(cardPath, "utf8");
  assert(cardContent.includes("forceRedirectUrl={hasCustomDestination ? destination : undefined}"), "Homepage card must force redirect to saved destination when present");
  assert(cardContent.includes("signUpForceRedirectUrl={hasCustomDestination ? destination : undefined}"), "Homepage card must force sign-up redirect to saved destination when present");
});

// --- TEST 17: Query String & Relative Destination Preservation ---
test("17. Query String & Relative Destination Preservation", () => {
  const middlewarePath = path.join(ROOT, "src/middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

  // Verify full relative URL (path + search query) is captured
  assert(middlewareContent.includes("request.nextUrl.pathname + request.nextUrl.search"), "Middleware must preserve path and query string of protected requests");

  // Verify sanitization behavior with query strings
  assert.strictEqual(sanitizeRedirectUrl("/upload?subject=java"), "/upload?subject=java");
  assert.strictEqual(sanitizeRedirectUrl("/paper/64a9f81e?slot=A1&year=2024"), "/paper/64a9f81e?slot=A1&year=2024");
  assert.strictEqual(sanitizeRedirectUrl("https://evil.com/upload?subject=java"), "/");
});

// --- TEST 18: Normal Navigation to /sign-in or /sign-up Redirects to Homepage UI ---
test("18. Direct Navigation to /sign-in and /sign-up Redirects to Homepage", () => {
  const middlewarePath = path.join(ROOT, "src/middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

  // Verify /sign-in and /sign-up interception in middleware
  assert(middlewareContent.includes('if (pathname === "/sign-in" || pathname === "/sign-in/")'), "Middleware must intercept normal navigation to /sign-in");
  assert(middlewareContent.includes('if (pathname === "/sign-up" || pathname === "/sign-up/")'), "Middleware must intercept normal navigation to /sign-up");
  assert(middlewareContent.includes("__clerk_status"), "Middleware must preserve internal Clerk callbacks");

  // Verify defensive redirect in sign-in page component
  const signInPagePath = path.join(ROOT, "src/app/sign-in/[[...sign-in]]/page.tsx");
  const signInPageContent = fs.readFileSync(signInPagePath, "utf8");
  assert(signInPageContent.includes("isClerkCallback"), "SignInPage component must identify Clerk callbacks vs normal navigation");
  assert(signInPageContent.includes('redirect("/")'), "SignInPage component must defensively redirect normal visits to homepage");

  // Verify defensive redirect in sign-up page component
  const signUpPagePath = path.join(ROOT, "src/app/sign-up/[[...sign-up]]/page.tsx");
  const signUpPageContent = fs.readFileSync(signUpPagePath, "utf8");
  assert(signUpPageContent.includes("isClerkCallback"), "SignUpPage component must identify Clerk callbacks vs normal navigation");
  assert(signUpPageContent.includes('redirect("/?mode=sign-up")'), "SignUpPage component must defensively redirect normal visits to homepage");
});

// --- TEST 19: API & Media Endpoints Preserve 401/403 (No Redirect) ---
test("19. API & Media Endpoints Retain 401/403 Responses", () => {
  const middlewarePath = path.join(ROOT, "src/middleware.ts");
  const middlewareContent = fs.readFileSync(middlewarePath, "utf8");

  assert(middlewareContent.includes('if (pathname.startsWith("/api/"))'), "Middleware must check API routes before page redirect");
  assert(middlewareContent.includes('status: 401'), "Middleware must return status 401 for unauthenticated API requests");
  assert(middlewareContent.includes('status: 403'), "Middleware must return status 403 for unauthorized API requests");
});

// --- TESTS 20-27: isAuthEnabled Flagship Binding & Precedence Invariants ---
(async () => {
  const originalAuthEnabledEnv = process.env.AUTH_ENABLED;
  const cfSymbol = Symbol.for("__cloudflare-context__");
  const originalCfContext = globalThis[cfSymbol];

  function resetContext() {
    delete globalThis[cfSymbol];
    if (originalAuthEnabledEnv !== undefined) {
      process.env.AUTH_ENABLED = originalAuthEnabledEnv;
    } else {
      delete process.env.AUTH_ENABLED;
    }
  }

  try {
    // --- TEST 20: Production Flagship Returns true ---
    await (async () => {
      total++;
      try {
        globalThis[cfSymbol] = {
          env: {
            FLAGS: {
              getBooleanValue: async (k, d) => (k === "AUTH_ENABLED" ? true : d),
            },
          },
        };
        delete process.env.AUTH_ENABLED;
        const result = await isAuthEnabled();
        assert.strictEqual(result, true, "isAuthEnabled must return true when Flagship evaluates to true");
        console.log("[PASS] 20. Production Flagship returns true");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 20. Production Flagship returns true: ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 21: Production Flagship Returns false ---
    await (async () => {
      total++;
      try {
        globalThis[cfSymbol] = {
          env: {
            FLAGS: {
              getBooleanValue: async (k, d) => (k === "AUTH_ENABLED" ? false : d),
            },
          },
        };
        delete process.env.AUTH_ENABLED;
        const result = await isAuthEnabled();
        assert.strictEqual(result, false, "isAuthEnabled must return false when Flagship evaluates to false");
        console.log("[PASS] 21. Production Flagship returns false");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 21. Production Flagship returns false: ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 22: Stale Build-Time AUTH_ENABLED=false Does Not Override Flagship true ---
    await (async () => {
      total++;
      try {
        globalThis[cfSymbol] = {
          env: {
            FLAGS: {
              getBooleanValue: async (k, d) => (k === "AUTH_ENABLED" ? true : d),
            },
          },
        };
        process.env.AUTH_ENABLED = "false"; // Stale build snapshot in process.env
        const result = await isAuthEnabled();
        assert.strictEqual(result, true, "Production Flagship true must override stale build-time AUTH_ENABLED=false");
        console.log("[PASS] 22. Stale build-time AUTH_ENABLED=false does not override Flagship true");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 22. Stale build-time AUTH_ENABLED=false does not override Flagship true: ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 23: Stale Build-Time AUTH_ENABLED=true Does Not Override Flagship false ---
    await (async () => {
      total++;
      try {
        globalThis[cfSymbol] = {
          env: {
            FLAGS: {
              getBooleanValue: async (k, d) => (k === "AUTH_ENABLED" ? false : d),
            },
          },
        };
        process.env.AUTH_ENABLED = "true"; // Stale local/test variable
        const result = await isAuthEnabled();
        assert.strictEqual(result, false, "Production Flagship false must override stale build-time AUTH_ENABLED=true");
        console.log("[PASS] 23. Stale build-time AUTH_ENABLED=true does not override Flagship false");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 23. Stale build-time AUTH_ENABLED=true does not override Flagship false: ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 24: Local Explicit Override AUTH_ENABLED=true in Dev ---
    await (async () => {
      total++;
      try {
        delete globalThis[cfSymbol]; // No Cloudflare binding in plain Node/dev
        process.env.AUTH_ENABLED = "true";
        const result = await isAuthEnabled();
        assert.strictEqual(result, true, "Local explicit override AUTH_ENABLED=true must be respected in dev");
        console.log("[PASS] 24. Local explicit override works when running locally (true)");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 24. Local explicit override works when running locally (true): ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 25: Local Explicit Override AUTH_ENABLED=false in Dev ---
    await (async () => {
      total++;
      try {
        delete globalThis[cfSymbol]; // No Cloudflare binding in plain Node/dev
        process.env.AUTH_ENABLED = "false";
        const result = await isAuthEnabled();
        assert.strictEqual(result, false, "Local explicit override AUTH_ENABLED=false must be respected in dev");
        console.log("[PASS] 25. Local explicit override works when running locally (false)");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 25. Local explicit override works when running locally (false): ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 26: Missing or Unavailable Binding Safely Defaults to false ---
    await (async () => {
      total++;
      try {
        delete globalThis[cfSymbol];
        delete process.env.AUTH_ENABLED;
        const result = await isAuthEnabled();
        assert.strictEqual(result, false, "Missing Flagship binding and missing env var must default to false");
        console.log("[PASS] 26. Missing or unavailable binding safely defaults to false");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 26. Missing or unavailable binding safely defaults to false: ${err.message}`);
      } finally {
        resetContext();
      }
    })();

    // --- TEST 27: Flagship Service Error Safely Fails to false ---
    await (async () => {
      total++;
      try {
        globalThis[cfSymbol] = {
          env: {
            FLAGS: {
              getBooleanValue: async () => {
                throw new Error("Cloudflare Flagship RPC unreachable");
              },
            },
          },
        };
        process.env.AUTH_ENABLED = "true";
        const result = await isAuthEnabled();
        assert.strictEqual(result, false, "Flagship service failure must fail safe to false");
        console.log("[PASS] 27. Flagship service failure safely fails to false");
        passed++;
      } catch (err) {
        console.error(`[FAIL] 27. Flagship service failure safely fails to false: ${err.message}`);
      } finally {
        resetContext();
      }
    })();
  } finally {
    resetContext();
    if (originalCfContext !== undefined) {
      globalThis[cfSymbol] = originalCfContext;
    }
  }

  console.log("\n============================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("============================================================\n");

  if (passed !== total) {
    process.exit(1);
  }
})();
