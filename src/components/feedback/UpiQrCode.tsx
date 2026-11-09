"use client";

import React from "react";
import { useQRCode } from "next-qrcode";

interface UpiQrCodeProps {
  upiUrl: string;
  size?: number;
}

export default function UpiQrCode({ upiUrl, size = 180 }: UpiQrCodeProps) {
  const { Canvas } = useQRCode();

  return (
    <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
      <Canvas
        text={upiUrl}
        options={{
          errorCorrectionLevel: "M",
          margin: 2,
          scale: 4,
          width: size,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        }}
      />
    </div>
  );
}
