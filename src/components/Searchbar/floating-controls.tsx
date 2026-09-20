"use client";

export default function FloatingControls({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="top-17 fixed right-7 z-50 flex flex-col items-end">
      <div className="flex flex-col items-center gap-4 rounded-3xl bg-[#110F18] px-6 py-6 shadow-xl ring-1 ring-white/5">
        {children}
      </div>
    </div>
  );
}
