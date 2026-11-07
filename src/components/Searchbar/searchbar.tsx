"use client";

import React from "react";
import SearchBarChild from "./searchbar-child";
import PinnedSearchBar from "./pinned-searchbar";
import { useCourses } from "@/context/courseContext";
import { type IUpcomingPaper } from "@/interface";

export default function SearchBar({
  type = "default",
  displayPapers,
  setDisplayPapers,
}: {
  type?: "default" | "pinned",
  displayPapers?:IUpcomingPaper[]
  setDisplayPapers?: React.Dispatch<React.SetStateAction<IUpcomingPaper[]>> 
}) {
  const { courses, loading, refetch } = useCourses();

  // If SearchBar mounts (e.g. user just authenticated) and courses are empty, fetch immediately
  React.useEffect(() => {
    if (courses.length === 0 && !loading) {
      void refetch();
    }
  }, [courses.length, loading, refetch]);

  return type === "pinned" && setDisplayPapers !== undefined && displayPapers !== undefined ? (
    <PinnedSearchBar initialSubjects={courses} setDisplayPapers={setDisplayPapers} displayPapers={displayPapers} />
  ) : (
    <SearchBarChild initialSubjects={courses} />
  );
}
