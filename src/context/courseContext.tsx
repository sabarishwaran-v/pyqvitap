"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import {
  type ICourse,
  type ICourseCount,
  type ICourseWithCount,
} from "@/interface";

import { type ApiResponse } from '@/interface'
import { MAINTENANCE_MODE } from "@/config/maintenance";
import { useAuth } from "@clerk/nextjs";
import { useAuthMode } from "@/context/AuthModeContext";

interface CoursesContextType {
  courses: ICourseWithCount[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const CoursesContext = createContext<CoursesContextType | undefined>(undefined);

function ClerkAuthMonitor({ onAuthChange }: { onAuthChange: (signedIn: boolean) => void }) {
  const auth = useAuth();
  useEffect(() => {
    onAuthChange(Boolean(auth.isSignedIn));
  }, [auth.isSignedIn, onAuthChange]);
  return null;
}

export function CoursesProvider({ children }: { children: React.ReactNode }) {
  const { authEnabled } = useAuthMode();
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [courses, setCourses] = useState<ICourseWithCount[]>([]);
  const [loading, setLoading] = useState(!MAINTENANCE_MODE);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    if (MAINTENANCE_MODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // Parallelize course-list and papers/count fetching to eliminate sequential waterfall
    const [coursesResult, countResult] = await Promise.allSettled([
      axios.get<ApiResponse<ICourse[]>>("/api/course-list"),
      axios.get<ApiResponse<ICourseCount[]>>("/api/papers/count"),
    ]);

    if (coursesResult.status === "rejected") {
      const err = coursesResult.reason;
      if (axios.isAxiosError<ApiResponse<never>>(err)) {
        setError(err.response?.data?.message ?? err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred");
      }
      setLoading(false);

      // If user is authenticated, retry after a short delay in case session cookie was still settling
      if (isSignedIn) {
        setTimeout(() => {
          void fetchCourses();
        }, 600);
      }
      return;
    }

    const rawCourses = coursesResult.value.data.data ?? [];
    let countMap = new Map<string, number>();

    if (countResult.status === "fulfilled") {
      countMap = new Map<string, number>(
        (countResult.value.data.data ?? []).map((c) => [c.name, c.count]),
      );
    } else {
      console.warn(
        "Failed to fetch paper counts, retaining course list with default counts:",
        countResult.reason,
      );
    }

    const mergedCourses: ICourseWithCount[] = rawCourses.map((course) => ({
      _id: course._id,
      name: course.name,
      count: countMap.get(course.name) ?? 0,
    }));

    setCourses(mergedCourses);
    setLoading(false);
  }, [isSignedIn]);

  useEffect(() => {
    if (MAINTENANCE_MODE) {
      setLoading(false);
      return;
    }
    void fetchCourses();
  }, [fetchCourses]);

  // When user signs in, immediately refetch courses
  useEffect(() => {
    if (isSignedIn) {
      void fetchCourses();
    }
  }, [isSignedIn, fetchCourses]);

  // When window gains focus and courses are empty, try refetching
  useEffect(() => {
    function onFocus() {
      if (courses.length === 0 && !loading && !MAINTENANCE_MODE) {
        void fetchCourses();
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [courses.length, loading, fetchCourses]);

  const value = useMemo(
    () => ({ courses, loading, error, refetch: fetchCourses }),
    [courses, loading, error, fetchCourses],
  );

  return (
    <CoursesContext.Provider value={value}>
      {authEnabled && <ClerkAuthMonitor onAuthChange={setIsSignedIn} />}
      {children}
    </CoursesContext.Provider>
  );
}

export function useCourses() {
  const context = useContext(CoursesContext);
  if (!context) {
    throw new Error("useCourses must be used within a CoursesProvider");
  }
  return context;
}
