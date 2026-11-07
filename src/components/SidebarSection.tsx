"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import SidebarButton from "./SidebarButton";

interface SidebarSectionProps {
  label: string;
  data: { label: string; value: string }[];
  selected: string[];
  updater: (newVal: string[]) => void;
  note?: React.ReactNode;
  inDrawer?: boolean;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  label,
  data,
  selected,
  updater,
  note,
  inDrawer = false,
}) => {
  const isActive = selected.length > 0;

  return (
    <div className="flex w-full flex-col items-baseline justify-between border-b-2 border-[#36266d] px-[10px]">
      <Accordion
        className="w-full"
        type="single"
        collapsible
      >
        <AccordionItem
          className="border-none"
          value={label} // ✅ IMPORTANT: stable value
        >
          <AccordionTrigger
            className={`w-full -mx-[10px] px-[10px] transition-colors duration-200 ${
              isActive ? "bg-[#562EE7]/5 dark:bg-[#7480FF]/10" : ""
            }`}
          >
            <div className="flex flex-1 items-center justify-between mr-2.5">
              <div className="font-play text-sm text-gray-900 dark:text-white">
                {label}
              </div>
              {isActive && (
                <span
                  className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0 shadow-[0_0_4px_rgba(16,185,129,0.4)]"
                  aria-label={`${label} filter active`}
                />
              )}
            </div>
          </AccordionTrigger>

          <AccordionContent>
            <div className="my-2 flex w-full flex-wrap items-center">
              {data.map((item) => (
                <SidebarButton
                  key={item.value}
                  selected={selected.includes(item.value)}
                  onClick={() => {
                    const newValues = selected.includes(item.value)
                      ? selected.filter((v) => v !== item.value)
                      : [...selected, item.value];
                    updater(newValues);
                  }}
                  className="mb-2 mr-2"
                >
                  {item.label}
                </SidebarButton>
              ))}
            </div>
            {note && (
              <div className="mt-2 w-full pb-1">
                <p className="font-play text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {note}
                </p>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
};

export default SidebarSection;