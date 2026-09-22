import {
  PDFDocument,
  rgb,
  StandardFonts,
  PDFName,
  PDFString,
  PDFArray,
  degrees,
} from "pdf-lib";

// 72x72 optimized PNG of the official PyqVitAp rounded app badge
const PYQVITAP_LOGO_PNG_BASE64 =
  "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";

/**
 * Universal base64 decoder that works across Browser and Node environments.
 */
function decodeBase64(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(base64, "base64"));
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Applies the finalized visual branding design to downloaded question papers:
 * 1. A subtle diagonal watermark ("pyqvitap / Your PYQs, All in One Place.") across every page.
 * 2. On Page 1 ONLY: A modern, rounded card container with the PyqVitAp logo badge, branding,
 *    clickable website link (https://pyqvitap.vercel.app), separator line, and exact disclaimer.
 * 3. On Page 2+: Diagonal watermark only (no footer, no disclaimer, no bottom website line).
 *
 * If an unexpected error occurs during transformation, it safely falls back to returning the original unmodified bytes.
 */
export async function applyWatermarkAndDisclaimer(
  pdfBuffer: ArrayBuffer | Uint8Array,
  filename?: string,
  url?: string,
): Promise<Uint8Array> {
  const originalBytes =
    pdfBuffer instanceof Uint8Array ? pdfBuffer : new Uint8Array(pdfBuffer);

  try {
    const pdfDoc = await PDFDocument.load(originalBytes, {
      ignoreEncryption: true,
    });

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed the PyqVitAp rounded badge logo
    let logoImage: any = null;
    try {
      logoImage = await pdfDoc.embedPng(decodeBase64(PYQVITAP_LOGO_PNG_BASE64));
    } catch {
      // Graceful fallback if image embedding encounters issues
    }

    const pages = pdfDoc.getPages();
    const totalPages = pages.length;

    for (let i = 0; i < totalPages; i++) {
      const page = pages[i];
      if (!page) continue;
      const { width, height } = page.getSize();

      // Safety check: skip if page dimensions are abnormally small
      if (width < 250 || height < 300) {
        continue;
      }

      // --- 1. Subtle Diagonal Background Watermark (Every Page) ---
      const diagAngle = 35;
      const diagCenterX = width * 0.52;
      const diagCenterY = height * 0.44;
      const titleText = "pyqvitap";
      const titleSize = height >= 700 ? 34 : 26;
      const tagText = "Your PYQs, All in One Place.";
      const tagSize = height >= 700 ? 13.5 : 10.5;

      page.drawText(titleText, {
        x: diagCenterX,
        y: diagCenterY,
        size: titleSize,
        font: fontBold,
        color: rgb(0.48, 0.42, 0.7),
        opacity: 0.13,
        rotate: degrees(diagAngle),
      });

      const rad = (diagAngle * Math.PI) / 180;
      const lineSpacing = height >= 700 ? 18 : 14;
      const tagX = diagCenterX + lineSpacing * Math.sin(rad);
      const tagY = diagCenterY - lineSpacing * Math.cos(rad);

      page.drawText(tagText, {
        x: tagX,
        y: tagY,
        size: tagSize,
        font: font,
        color: rgb(0.48, 0.42, 0.7),
        opacity: 0.13,
        rotate: degrees(diagAngle),
      });

      // --- 2. Page 1 ONLY: Final Footer Card Container ---
      if (i === 0) {
        if (height >= 400 && width >= 300) {
          const cardMarginX = Math.max(18, Math.min(24, width * 0.04));
          const cardWidth = width - cardMarginX * 2;
          const cardHeight = 52;
          const cardY = Math.max(10, Math.min(14, height * 0.015)); // conservative bottom margin
          const r = 8; // rounded corners
          const w = cardWidth;
          const h = cardHeight;

          // Draw rounded container card background and border using SVG path
          const path = `M ${r} 0 H ${w - r} Q ${w} 0 ${w} ${r} V ${h - r} Q ${w} ${h} ${w - r} ${h} H ${r} Q 0 ${h} 0 ${h - r} V ${r} Q 0 0 ${r} 0 Z`;
          page.drawSvgPath(path, {
            x: cardMarginX,
            y: cardY + cardHeight,
            color: rgb(0.975, 0.972, 0.995), // subtle cool lavender/white tint
            borderColor: rgb(0.78, 0.72, 0.96), // soft purple border
            borderWidth: 0.8,
          });

          // Content padding inside card
          const contentPadX = 14;
          const topRowY = cardY + cardHeight - 20;

          // Left: PyqVitAp Logo Badge
          const logoSize = 19;
          if (logoImage) {
            page.drawImage(logoImage, {
              x: cardMarginX + contentPadX,
              y: topRowY - 3,
              width: logoSize,
              height: logoSize,
            });
          }

          // Left text: "pyqvitap" (prominent) and tagline (lighter)
          const brandX = cardMarginX + contentPadX + (logoImage ? logoSize + 8 : 0);
          page.drawText("pyqvitap", {
            x: brandX,
            y: topRowY + 5,
            size: 11.5,
            font: fontBold,
            color: rgb(0.08, 0.08, 0.14),
          });

          page.drawText("Your PYQs, All in One Place.", {
            x: brandX,
            y: topRowY - 5,
            size: 7,
            font: font,
            color: rgb(0.42, 0.42, 0.52),
          });

          // Right: Website Link with Vector Globe Icon
          const webText = "pyqvitap.vercel.app";
          const webSize = 9;
          const webWidth = fontBold.widthOfTextAtSize(webText, webSize);
          const globeRadius = 4.5;
          const rightContentWidth = globeRadius * 2 + 5 + webWidth;
          const rightStartX = cardMarginX + cardWidth - contentPadX - rightContentWidth;

          // Draw vector globe icon
          const globeCenterX = rightStartX + globeRadius;
          const globeCenterY = topRowY + 1.5;
          const globeColor = rgb(0.12, 0.44, 0.92);

          page.drawCircle({
            x: globeCenterX,
            y: globeCenterY,
            size: globeRadius,
            borderColor: globeColor,
            borderWidth: 0.8,
          });
          page.drawLine({
            start: { x: globeCenterX - globeRadius, y: globeCenterY },
            end: { x: globeCenterX + globeRadius, y: globeCenterY },
            color: globeColor,
            thickness: 0.65,
          });
          page.drawEllipse({
            x: globeCenterX,
            y: globeCenterY,
            xScale: globeRadius * 0.42,
            yScale: globeRadius,
            borderColor: globeColor,
            borderWidth: 0.65,
          });

          // Website URL text
          const webTextX = rightStartX + globeRadius * 2 + 5;
          page.drawText(webText, {
            x: webTextX,
            y: topRowY - 2,
            size: webSize,
            font: fontBold,
            color: globeColor,
          });

          // Clickable Link Annotation over the entire right website area
          try {
            const linkRect = [
              rightStartX - 3,
              topRowY - 5,
              rightStartX + rightContentWidth + 3,
              topRowY + 9,
            ];
            const linkAnnot = pdfDoc.context.obj({
              Type: "Annot",
              Subtype: "Link",
              Rect: linkRect,
              Border: [0, 0, 0],
              A: {
                Type: "Action",
                S: "URI",
                URI: PDFString.of("https://pyqvitap.vercel.app"),
              },
            });
            const linkRef = pdfDoc.context.register(linkAnnot);
            const annotsRef = page.node.get(PDFName.of("Annots"));
            let annots: PDFArray | null = null;
            if (annotsRef) {
              const lookedUp = pdfDoc.context.lookup(annotsRef);
              if (lookedUp instanceof PDFArray) {
                annots = lookedUp;
              }
            }
            if (!annots) {
              annots = pdfDoc.context.obj([]);
              page.node.set(PDFName.of("Annots"), annots);
            }
            annots.push(linkRef);
          } catch (annotErr) {
            console.warn("Failed to attach PDF link annotation:", annotErr);
          }

          // Subtle horizontal separator line
          const sepY = cardY + 22;
          page.drawLine({
            start: { x: cardMarginX + contentPadX, y: sepY },
            end: { x: cardMarginX + cardWidth - contentPadX, y: sepY },
            color: rgb(0.86, 0.85, 0.92),
            thickness: 0.6,
          });

          // Disclaimer text (centered horizontally inside card)
          const d1 =
            "This is not an official university website. A student-built platform to help you easily find and access past question papers.";
          const d2 =
            "All copyrights of this paper belong to their respective owner(s).";
          const d1Size = 5.7;
          const d2Size = 5.3;
          const d1Width = font.widthOfTextAtSize(d1, d1Size);
          const d2Width = font.widthOfTextAtSize(d2, d2Size);

          page.drawText(d1, {
            x: (width - d1Width) / 2,
            y: cardY + 12,
            size: d1Size,
            font: font,
            color: rgb(0.32, 0.32, 0.38),
          });

          page.drawText(d2, {
            x: (width - d2Width) / 2,
            y: cardY + 4.5,
            size: d2Size,
            font: font,
            color: rgb(0.42, 0.42, 0.48),
          });
        }
      }
    }

    const savedBytes = await pdfDoc.save();
    return savedBytes;
  } catch (err) {
    console.error("Failed to apply watermark/disclaimer to PDF:", err);
    return originalBytes;
  }
}
