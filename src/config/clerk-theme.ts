import { dark } from "@clerk/themes";

export interface ClerkAppearanceOptions {
  hideSignUpLink?: boolean;
  isHomepageCard?: boolean;
}

/**
 * Generates theme-aware Clerk Appearance configuration for PyqVitAp.
 * Faithfully matches the custom Clerk Theme Editor tokens:
 *
 * Light Theme:
 * - Page/card background: #F7F8FD
 * - Foreground: #030712
 * - Input background: #F8F9FF
 * - Input foreground: #18181B
 * - Muted background: #EEEFF7
 * - Muted foreground: #64748B
 * - Border: #94A3B8
 * - Danger: #DC2626
 * - Success: #16A34A
 * - Warning: #D97706
 *
 * Dark Theme:
 * - Background: #030712
 * - Foreground: #F9FAFB
 * - Input background: #181033
 * - Input foreground: #FFFFFF
 * - Muted background: #181033
 * - Muted foreground: #9CA3AF
 * - Border: #FFFFFF
 * - Danger: #EF4444
 * - Success: #22C55E
 * - Warning: #F59E0B
 *
 * Shared Tokens:
 * - Primary: #7C3AED
 * - Primary foreground: #F9FAFB
 * - Ring: #7C3AED
 * - Shadow accent: #7C3AED
 * - Border radius: 0.375rem (md)
 * - Spacing: 1.125rem (lg)
 */
export function getPyqvitapClerkAppearance(
  isDark: boolean = true,
  options: ClerkAppearanceOptions = {}
) {
  const { hideSignUpLink = false, isHomepageCard = false } = options;

  return {
    baseTheme: isDark ? dark : undefined,
    variables: isDark
      ? {
          colorPrimary: "#7C3AED",
          colorPrimaryForeground: "#F9FAFB",
          colorDanger: "#EF4444",
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          colorNeutral: "#FFFFFF",
          colorForeground: "#F9FAFB",
          colorText: "#F9FAFB",
          colorBackground: "#030712",
          colorInput: "#181033",
          colorInputBackground: "#181033",
          colorInputForeground: "#FFFFFF",
          colorInputText: "#FFFFFF",
          colorRing: "#7C3AED",
          colorShimmer: "#ffffff",
          colorModalBackdrop: "#000000",
          colorMuted: "#181033",
          colorMutedForeground: "#9CA3AF",
          colorTextSecondary: "#9CA3AF",
          colorBorder: "#FFFFFF",
          colorShadow: "#7C3AED",
          borderRadius: "0.375rem",
          spacing: "1.125rem",
          fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
        }
      : {
          colorPrimary: "#7C3AED",
          colorPrimaryForeground: "#F9FAFB",
          colorDanger: "#DC2626",
          colorSuccess: "#16A34A",
          colorWarning: "#D97706",
          colorNeutral: "#000000",
          colorForeground: "#030712",
          colorText: "#030712",
          colorBackground: "#F7F8FD",
          colorInput: "#F8F9FF",
          colorInputBackground: "#F8F9FF",
          colorInputForeground: "#18181B",
          colorInputText: "#18181B",
          colorRing: "#7C3AED",
          colorShimmer: "#ffffff",
          colorModalBackdrop: "#0F0926",
          colorMuted: "#EEEFF7",
          colorMutedForeground: "#64748B",
          colorTextSecondary: "#64748B",
          colorBorder: "#94A3B8",
          colorShadow: "#7C3AED",
          borderRadius: "0.375rem",
          spacing: "1.125rem",
          fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
        },
    elements: {
      card: isHomepageCard
        ? {
            backgroundColor: "transparent",
            border: "none",
            boxShadow: "none",
            borderRadius: "0",
            width: "100%",
            maxWidth: "100%",
            padding: "0",
            paddingTop: "2px",
            marginTop: "0",
          }
        : {
            backgroundColor: isDark ? "#030712" : "#F7F8FD",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #94A3B8",
            boxShadow: isDark
              ? "0 20px 35px -5px rgba(0, 0, 0, 0.7), 0 0 25px -5px rgba(124, 58, 237, 0.18)"
              : "0 10px 30px -5px rgba(124, 58, 237, 0.12), 0 4px 6px -2px rgba(124, 58, 237, 0.04)",
            borderRadius: "0.375rem",
            width: "100%",
            maxWidth: "480px",
          },
      rootBox: {
        width: "100%",
        maxWidth: isHomepageCard ? "100%" : "480px",
      },
      cardBox: {
        width: "100%",
        maxWidth: isHomepageCard ? "100%" : "480px",
        boxShadow: "none",
        overflow: "visible",
      },
      header: isHomepageCard ? { display: "none" } : undefined,
      headerTitle: isHomepageCard
        ? { display: "none" }
        : {
            color: isDark ? "#F9FAFB" : "#030712",
            fontWeight: "700",
            fontSize: "1.375rem",
          },
      headerSubtitle: isHomepageCard
        ? { display: "none" }
        : {
            color: isDark ? "#9CA3AF" : "#64748B",
            fontSize: "0.875rem",
          },
      formButtonPrimary: {
        background: "linear-gradient(135deg, #7C3AED, #9333EA)",
        backgroundColor: "#7C3AED",
        color: "#F9FAFB",
        fontWeight: "600",
        fontSize: "0.875rem",
        height: "2.625rem",
        borderRadius: "0.375rem",
        boxShadow: "0 4px 14px 0 rgba(124, 58, 237, 0.35)",
        transition: "all 0.15s ease-in-out",
        "&:hover": {
          background: "linear-gradient(135deg, #6D28D9, #7E22CE)",
          backgroundColor: "#6D28D9",
          boxShadow: "0 6px 18px 0 rgba(124, 58, 237, 0.45)",
        },
        "&:focus": {
          borderColor: "#7C3AED",
          boxShadow: "0 0 0 2px rgba(124, 58, 237, 0.45)",
        },
        "&:focus-visible": {
          borderColor: "#7C3AED",
          boxShadow: "0 0 0 2px rgba(124, 58, 237, 0.45)",
          outline: "none",
        },
      },
      socialButtonsBlockButton: {
        backgroundColor: isDark ? "#181033" : "#F8F9FF",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #94A3B8",
        borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "#94A3B8",
        borderWidth: "1px",
        borderStyle: "solid",
        borderRadius: "0.375rem",
        color: isDark ? "#F9FAFB" : "#030712",
        boxShadow: "none",
        height: "2.625rem",
        fontSize: "0.875rem",
        fontWeight: "500",
        transition: "all 0.15s ease-in-out",
        "&:hover": {
          backgroundColor: isDark ? "#231849" : "#EEEFF7",
          borderColor: isDark ? "rgba(255, 255, 255, 0.4)" : "#64748B",
        },
        "&:focus": {
          borderColor: "#7C3AED",
          boxShadow: "0 0 0 2px rgba(124, 58, 237, 0.35)",
        },
        "&:focus-visible": {
          borderColor: "#7C3AED",
          boxShadow: "0 0 0 2px rgba(124, 58, 237, 0.35)",
          outline: "none",
        },
      },
      formFieldInput: {
        backgroundColor: isDark ? "#181033" : "#F8F9FF",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #94A3B8",
        borderColor: isDark ? "rgba(255, 255, 255, 0.2)" : "#94A3B8",
        color: isDark ? "#FFFFFF" : "#18181B",
        borderRadius: "0.375rem",
        height: "2.625rem",
        fontSize: "0.875rem",
        "&:focus": {
          borderColor: "#7C3AED",
          boxShadow: "0 0 0 2px rgba(124, 58, 237, 0.3)",
        },
      },
      formFieldLabel: {
        color: isDark ? "#F9FAFB" : "#030712",
        fontSize: "0.875rem",
        fontWeight: "500",
      },
      formFieldLabel__optional: {
        display: "none",
      },
      formFieldOptional: {
        display: "none",
      },
      dividerLine: {
        backgroundColor: isDark ? "rgba(255, 255, 255, 0.15)" : "#CBD5E1",
      },
      dividerText: {
        color: isDark ? "#9CA3AF" : "#64748B",
        fontSize: "0.75rem",
      },
      footer: isHomepageCard
        ? {
            backgroundColor: "transparent",
            paddingTop: "0.5rem",
            marginTop: "0.5rem",
          }
        : undefined,
      footerAction: hideSignUpLink ? { display: "none" } : undefined,
      footerActionText: {
        color: isDark ? "#9CA3AF" : "#64748B",
        fontSize: "0.875rem",
      },
      footerActionLink: hideSignUpLink
        ? { display: "none" }
        : {
            color: isDark ? "#A78BFA" : "#7C3AED",
            fontWeight: "600",
            fontSize: "0.875rem",
            "&:hover": {
              color: isDark ? "#C4B5FD" : "#6D28D9",
            },
          },
      identityPreviewText: {
        color: isDark ? "#F9FAFB" : "#030712",
      },
      identityPreviewEditButtonIcon: {
        color: isDark ? "#A78BFA" : "#7C3AED",
      },
    },
    userProfile: {
      elements: {
        rootBox: {
          width: "100%",
          maxWidth: "56rem",
        },
        cardBox: {
          width: "100%",
          maxWidth: "56rem",
          boxShadow: isDark
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px -5px rgba(124, 58, 237, 0.2)"
            : "0 20px 40px -10px rgba(124, 58, 237, 0.15)",
          borderRadius: "0.5rem",
        },
        card: {
          width: "100%",
          maxWidth: "56rem",
          minHeight: "560px",
          borderRadius: "0.5rem",
          backgroundColor: isDark ? "#030712" : "#F7F8FD",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #94A3B8",
        },
        modalContent: {
          width: "100%",
          maxWidth: "56rem",
        },
        scrollBox: {
          overflowX: "hidden",
        },
        pageScrollBox: {
          overflowX: "hidden",
        },
        navbar: {
          borderRight: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #CBD5E1",
        },
        navbarButton: {
          borderRadius: "0.375rem",
          "&:hover": {
            backgroundColor: isDark ? "#181033" : "#EEEFF7",
          },
          "&[data-active='true']": {
            backgroundColor: isDark ? "#231849" : "#E2E8F0",
            color: isDark ? "#A78BFA" : "#7C3AED",
          },
        },
      },
    },
  };
}

/**
 * Dedicated appearance configuration for Clerk's UserProfile modal component.
 * Provides full width (56rem / 896px), eliminates cramped layouts, and prevents horizontal scrolling.
 */
export function getPyqvitapUserProfileAppearance(isDark: boolean = true) {
  return {
    baseTheme: isDark ? dark : undefined,
    variables: isDark
      ? {
          colorPrimary: "#7C3AED",
          colorPrimaryForeground: "#F9FAFB",
          colorDanger: "#EF4444",
          colorSuccess: "#22C55E",
          colorWarning: "#F59E0B",
          colorNeutral: "#FFFFFF",
          colorForeground: "#F9FAFB",
          colorText: "#F9FAFB",
          colorBackground: "#030712",
          colorInput: "#181033",
          colorInputBackground: "#181033",
          colorInputForeground: "#FFFFFF",
          colorInputText: "#FFFFFF",
          colorRing: "#7C3AED",
          colorShimmer: "#ffffff",
          colorModalBackdrop: "#0F0926",
          colorMuted: "#181033",
          colorMutedForeground: "#9CA3AF",
          colorTextSecondary: "#9CA3AF",
          colorBorder: "rgba(255, 255, 255, 0.2)",
          colorShadow: "#7C3AED",
          borderRadius: "0.5rem",
          spacing: "1.125rem",
          fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
        }
      : {
          colorPrimary: "#7C3AED",
          colorPrimaryForeground: "#F9FAFB",
          colorDanger: "#DC2626",
          colorSuccess: "#16A34A",
          colorWarning: "#D97706",
          colorNeutral: "#000000",
          colorForeground: "#030712",
          colorText: "#030712",
          colorBackground: "#F7F8FD",
          colorInput: "#F8F9FF",
          colorInputBackground: "#F8F9FF",
          colorInputForeground: "#18181B",
          colorInputText: "#18181B",
          colorRing: "#7C3AED",
          colorShimmer: "#ffffff",
          colorModalBackdrop: "#0F0926",
          colorMuted: "#EEEFF7",
          colorMutedForeground: "#64748B",
          colorTextSecondary: "#64748B",
          colorBorder: "#94A3B8",
          colorShadow: "#7C3AED",
          borderRadius: "0.5rem",
          spacing: "1.125rem",
          fontFamily: "var(--font-geist-sans), system-ui, -apple-system, sans-serif",
        },
    elements: {
      rootBox: {
        width: "100%",
        maxWidth: "56rem",
      },
      cardBox: {
        width: "100%",
        maxWidth: "56rem",
        boxShadow: isDark
          ? "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 25px -5px rgba(124, 58, 237, 0.2)"
          : "0 20px 40px -10px rgba(124, 58, 237, 0.15)",
        borderRadius: "0.5rem",
      },
      card: {
        width: "100%",
        maxWidth: "56rem",
        minHeight: "560px",
        borderRadius: "0.5rem",
        backgroundColor: isDark ? "#030712" : "#F7F8FD",
        border: isDark ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid #94A3B8",
      },
      modalContent: {
        width: "100%",
        maxWidth: "56rem",
      },
      scrollBox: {
        overflowX: "hidden",
      },
      pageScrollBox: {
        overflowX: "hidden",
      },
      navbar: {
        borderRight: isDark ? "1px solid rgba(255, 255, 255, 0.15)" : "1px solid #CBD5E1",
      },
      navbarButton: {
        borderRadius: "0.375rem",
        "&:hover": {
          backgroundColor: isDark ? "#181033" : "#EEEFF7",
        },
        "&[data-active='true']": {
          backgroundColor: isDark ? "#231849" : "#E2E8F0",
          color: isDark ? "#A78BFA" : "#7C3AED",
        },
      },
    },
  };
}

/**
 * Default dark user profile appearance.
 */
export const pyqvitapUserProfileAppearance = getPyqvitapUserProfileAppearance(true);

/**
 * Default dark appearance for backwards compatibility.
 */
export const pyqvitapClerkAppearance = getPyqvitapClerkAppearance(true);
