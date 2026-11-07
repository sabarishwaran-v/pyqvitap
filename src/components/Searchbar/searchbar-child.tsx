"use client";

import { useState, useRef, useEffect } from "react";
import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import Fuse from "fuse.js";
import { type ICourseWithCount } from "@/interface";
import { rankCourses } from "@/lib/utils/search-ranking";
import { trackEvent } from "@/lib/telemetry";
import { useCourses } from "@/context/courseContext";

function SearchBarChild({
  initialSubjects,
  filtersNotPulled,
}: {
  initialSubjects: ICourseWithCount[];
  filtersNotPulled?: () => void;
}) {
  const router = useRouter();
  const { courses, loading, refetch } = useCourses();
  const effectiveSubjects = initialSubjects && initialSubjects.length > 0 ? initialSubjects : courses;

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState<ICourseWithCount[]>([]);
  const suggestionsRef = useRef<HTMLUListElement | null>(null);
  const [fuzzy, setFuzzy] = useState(
    () =>
      new Fuse<ICourseWithCount>([], {
        keys: ["name"],
        threshold: 0.3,
        ignoreLocation: true,
      }),
  );
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const ensureCoursesLoaded = () => {
    if (effectiveSubjects.length === 0 && !loading) {
      void refetch();
    }
  };

  useEffect(() => {
    if (effectiveSubjects && effectiveSubjects.length > 0) {
      const newFuse = new Fuse(effectiveSubjects, {
        keys: ["name"],
        threshold: 0.3,
        ignoreLocation: true,
      });
      setFuzzy(newFuse);

      // Automatically re-evaluate suggestions if user typed before course data arrived
      if (searchText.length > 1) {
        const filteredSuggestions = rankCourses(effectiveSubjects, searchText, newFuse).slice(0, 10);
        setSuggestions(filteredSuggestions);
      }
    }
  }, [effectiveSubjects, searchText]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setSearchText(text);

    if (effectiveSubjects.length === 0) {
      ensureCoursesLoaded();
    }

    if (text.length > 1 && effectiveSubjects.length > 0) {
      const filteredSuggestions = rankCourses(effectiveSubjects, text, fuzzy).slice(0, 10);
      setSuggestions(filteredSuggestions);
      trackEvent("search_performed", {
        query_length: text.trim().length,
        results_count: filteredSuggestions.length,
        source: "hero_search",
      });
    } else {
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (suggestion: ICourseWithCount, rankIndex?: number) => {
    const codeMatch = /\[([^\]]+)\]$/.exec(suggestion.name);
    trackEvent("search_result_selected", {
      course_name: suggestion.name,
      course_code: codeMatch ? codeMatch[1] : undefined,
      rank_index: rankIndex ?? (highlightedIndex >= 0 ? highlightedIndex : 0),
      paper_count: suggestion.count,
    });
    router.push(`/catalogue?subject=${encodeURIComponent(suggestion.name)}`);
    setSearchText("");
    setSuggestions([]);
    filtersNotPulled?.();
    setHighlightedIndex(-1);
  };

  const handleClickOutside = (event: MouseEvent) => {
    if (
      suggestionsRef.current &&
      !suggestionsRef.current.contains(event.target as Node)
    ) {
      setSuggestions([]);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="w-full max-w-xl font-play md:mx-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (searchText) {
            trackEvent("search_performed", {
              query_length: searchText.trim().length,
              results_count: suggestions.length,
              source: "hero_search_submit",
            });
            router.push(`/catalogue?subject=${encodeURIComponent(searchText)}`);
            setSuggestions([]);
          }
        }}
      >
        <div className="relative w-full">
          <Input
            type="text"
            value={searchText}
            onFocus={ensureCoursesLoaded}
            onChange={handleSearchChange}
            placeholder="Search by subject..."
            className={`text-md rounded-lg bg-[#B2B8FF] px-4 py-6 pr-10 font-play tracking-wider text-black shadow-sm ring-0 placeholder:text-black focus:outline-none focus:ring-0 dark:bg-[#7480FF66] dark:text-white placeholder:dark:text-white ${suggestions.length > 0 ? "rounded-b-none" : ""}`}
            onKeyDown={(e) => {
              if (suggestions.length === 0) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setHighlightedIndex(
                  (prev) =>
                    (prev - 1 + suggestions.length) % suggestions.length,
                );
              } else if (e.key === "Enter") {
                e.preventDefault();
                if (
                  highlightedIndex >= 0 &&
                  highlightedIndex < suggestions.length &&
                  suggestions[highlightedIndex] !== undefined
                ) {
                  handleSelectSuggestion(suggestions[highlightedIndex], highlightedIndex);
                } else {
                  router.push(
                    `/catalogue?subject=${encodeURIComponent(searchText)}`,
                  );
                  setSuggestions([]);
                }
              } else if (e.key === "Tab") {
                e.preventDefault();
                if (highlightedIndex == -1) {
                  if (suggestions.length > 0 && suggestions[0] != undefined) {
                    setSearchText(suggestions[0].name || "");
                    setSuggestions([]);
                  }
                } else {
                  if (
                    highlightedIndex >= 0 &&
                    highlightedIndex < suggestions.length &&
                    suggestions[highlightedIndex] !== undefined
                  ) {
                    setSearchText(suggestions[highlightedIndex].name || "");
                    setHighlightedIndex(-1);
                    setSuggestions([]);
                  }
                }
              }
            }}
          />
          <button
            type="submit"
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            title="Search"
          >
            <Search className="h-5 w-5 text-black dark:text-white" />
          </button>
          {suggestions.length > 0 && (
            <ul
              ref={suggestionsRef}
              className={`absolute z-20 w-full max-w-xl overflow-y-auto rounded-md rounded-t-none border border-t-0 bg-white text-center shadow-lg dark:bg-[#303771] md:mx-0`}
              style={{ maxHeight: "400px" }}
            >
              {suggestions.map((suggestion: ICourseWithCount, index) => (
                <li
                  key={suggestion._id}
                  onClick={() => handleSelectSuggestion(suggestion, index)}
                  className={`flex cursor-pointer items-center rounded p-2 ${
                    index === highlightedIndex
                      ? "bg-gray-200 dark:bg-gray-800"
                      : "hover:bg-gray-200 dark:hover:bg-gray-800"
                  }`}
                >
                  <div
                    id="paper_count"
                    className="mr-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#171720] text-xs font-semibold text-white"
                  >
                    {suggestion.count > 0 ? suggestion.count : "—"}
                  </div>

                  <span
                    id="subject"
                    className="flex-1 min-w-0 flex items-center text-sm tracking-wide text-black dark:text-white sm:text-base"
                  >
                    {(() => {
                      const codeMatch = /\[[^\]]+\]$/.exec(suggestion.name);
                      const code = codeMatch ? codeMatch[0] : "";
                      const title = suggestion.name.replace(
                        /\s\[[^\]]+\]$/,
                        "",
                      );

                      let displayTitle = title;
                      const isMobile =
                        typeof window !== "undefined" &&
                        window.innerWidth < 640;

                      if (isMobile) {
                        if (title.length > 25) {
                          const start = title.slice(0, 15).trim();
                          const end = title.slice(-8).trim();
                          displayTitle = `${start}.....${end}`;
                        }
                      } else {
                        if (title.length > 40) {
                          const start = title.slice(0, 25).trim();
                          const end = title.slice(-15).trim();
                          displayTitle = `${start}.....${end}`;
                        }
                      }

                      return (
                        <>
                          <span className="truncate">{displayTitle}</span>
                          <span className="ml-2 shrink-0">{code}</span>
                        </>
                      );
                    })()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>
    </div>
  );
}

export default SearchBarChild;
