"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface AccordionSection {
  title: string;
  body: React.ReactNode;
  openByDefault?: boolean;
}

export function Accordion({ sections }: { sections: AccordionSection[] }) {
  const [openTitle, setOpenTitle] = useState<string | null>(sections.find((s) => s.openByDefault)?.title ?? null);

  return (
    <div className="border-t border-border">
      {sections.map((section) => {
        const isOpen = openTitle === section.title;
        return (
          <div key={section.title} className="border-b border-border">
            <button
              type="button"
              onClick={() => setOpenTitle(isOpen ? null : section.title)}
              className="group flex min-h-11 w-full items-center justify-between px-0.5 py-[15px] text-left"
            >
              <h4 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">{section.title}</h4>
              <ChevronDown className={`h-[18px] w-[18px] text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>
            {isOpen && <div className="px-0.5 pb-4 text-[13px] leading-relaxed text-muted-foreground">{section.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
