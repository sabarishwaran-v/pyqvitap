"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";
import { type IPaper, type Filters, type ApiResponse } from "@/interface";
import Card from "@/components/Card";
import Loader from "@/components/ui/loader";
import { Button } from "./ui/button";
import { trackEvent } from "@/lib/telemetry";

interface RelatedPapersProps {
  initialSubject?: string;
  initialPaperId?: string;
  initialExam?: string;
}

const RelatedPapers = ({
  initialSubject,
  initialPaperId,
  initialExam,
}: RelatedPapersProps = {}) => {
  const params = useParams();
  const id = initialPaperId ?? (params?.id as string);

  const [subject, setSubject] = useState<string | null>(initialSubject ?? null);
  const [exam, setExam] = useState<string | null>(initialExam ?? null);
  const [relatedPapers, setRelatedPapers] = useState<IPaper[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTriggeredRef = useRef(false);

  useEffect(() => {
    if (initialSubject) setSubject(initialSubject);
    if (initialExam) setExam(initialExam);
  }, [initialSubject, initialExam]);

  // Defer query so it never competes with initial PDF and viewer startup
  useEffect(() => {
    if (hasTriggeredRef.current) return;

    const startLoading = () => {
      if (hasTriggeredRef.current) return;
      hasTriggeredRef.current = true;
      setHasStarted(true);
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined" && containerRef.current) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            startLoading();
            observer?.disconnect();
          }
        },
        { rootMargin: "300px" }
      );
      observer.observe(containerRef.current);
    }

    let idleId: number | null = null;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleId = (
        window as unknown as {
          requestIdleCallback: (cb: () => void, opts: { timeout: number }) => number;
        }
      ).requestIdleCallback(startLoading, { timeout: 3500 });
    } else {
      timerId = setTimeout(startLoading, 2500);
    }

    return () => {
      observer?.disconnect();
      if (
        idleId !== null &&
        typeof window !== "undefined" &&
        "cancelIdleCallback" in window
      ) {
        (
          window as unknown as { cancelIdleCallback: (id: number) => void }
        ).cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasStarted) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        let currentSubject = subject;
        let currentExam = exam;

        if (!currentSubject && id) {
          const getpaper = await axios.get<ApiResponse<IPaper>>(`/api/paper-by-id/${id}`);
          if (getpaper.data.data) {
            currentSubject = getpaper.data.data.subject;
            currentExam = getpaper.data.data.exam;
            if (isMounted) {
              setSubject(currentSubject);
              setExam(currentExam);
            }
          }
        }

        if (!currentSubject) {
          if (isMounted) setLoading(false);
          return;
        }

        const allPapersBySubject = await axios.get<ApiResponse<Filters>>(
          "/api/papers",
          {
            params: { subject: currentSubject },
          },
        );

        const all = allPapersBySubject.data.data?.papers ?? [];

        const sameExam = all
          .filter(
            (p) =>
              p._id !== id &&
              (currentExam ? p.exam === currentExam : true),
          )
          .slice(0, 4);

        let finalPapers = [...sameExam];

        if (finalPapers.length < 4) {
          const additional = all.filter(
            (p) =>
              p._id !== id &&
              (!currentExam || p.exam !== currentExam) &&
              !finalPapers.some((fp) => fp._id === p._id),
          );

          finalPapers = [
            ...finalPapers,
            ...additional.slice(0, 4 - finalPapers.length),
          ];
        }

        if (isMounted) {
          setRelatedPapers(finalPapers);
        }
      } catch (err) {
        console.error("Error fetching related papers:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchData();

    return () => {
      isMounted = false;
    };
  }, [hasStarted, id, subject, exam]);

  return (
    <div ref={containerRef} className="space-y-4 p-6 font-vipna">
      {loading ? (
        <Loader />
      ) : relatedPapers.length === 0 ? (
        hasStarted ? null : <div className="h-10" />
      ) : (
        <>
          <div className="flex items-center justify-between">
            <h2 className="my-6 font-play text-3xl font-semibold">Explore More</h2>

            {subject && (
              <Link
                href={`/catalogue?subject=${encodeURIComponent(subject)}`}
                passHref
              >
                <Button
                  variant="outline"
                  className="flex gap-2 border-2 border-black font-sans font-semibold hover:bg-slate-800 hover:text-white dark:border-[#434dba] dark:hover:border-white dark:hover:bg-slate-900"
                >
                  View All
                </Button>
              </Link>
            )}
          </div>
          <div className="cursor-pointer grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {relatedPapers.map((paper) => (
              <div
                key={paper._id}
                onClick={() => {
                  trackEvent("related_paper_opened", {
                    current_paper_id: id,
                    target_paper_id: paper._id,
                    subject: paper.subject,
                    exam: paper.exam,
                  });
                }}
              >
                <Card
                  paper={paper}
                  onSelect={() => {
                    ("");
                  }}
                  isSelected={false}
                  isShow={false}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default RelatedPapers;
