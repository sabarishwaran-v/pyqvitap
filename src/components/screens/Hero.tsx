"use client";

import React, { useState, useEffect } from "react";
import SearchBar from "../Searchbar/searchbar";
import PapersCarousel from "../PapersCarousel";
import PinnedPapersCarousel from "../PinnedPapersCarousel";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import HomepageSignInCard from "@/components/auth/HomepageSignInCard";

interface HeroProps {
  authEnabled?: boolean;
}

const Hero = ({ authEnabled = false }: HeroProps) => {
  const [isTestAuth, setIsTestAuth] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsTestAuth(params.get("test_auth") === "true");
    }
  }, []);

  return (
    <div id="hero" className="flex flex-col justify-between">
      <h1 className="mx-auto my-8 text-center font-vipnabd text-3xl font-extrabold md:block">
        Built by Student for Students
      </h1>

      {isTestAuth ? (
        <HomepageSignInCard />
      ) : authEnabled ? (
        <>
          <SignedIn>
            <div className="mt-5 px-[14vw] md:px-6">
              <SearchBar />
            </div>
            <p className="my-8 text-center font-play text-lg font-semibold">
              Pinned Subjects
            </p>
            <PinnedPapersCarousel />
            <PapersCarousel />
          </SignedIn>

          <SignedOut>
            <HomepageSignInCard />
          </SignedOut>
        </>
      ) : (
        <>
          <div className="mt-5 px-[14vw] md:px-6">
            <SearchBar />
          </div>
          <p className="my-8 text-center font-play text-lg font-semibold">
            Pinned Subjects
          </p>
          <PinnedPapersCarousel />
          <PapersCarousel />
        </>
      )}
    </div>
  );
};

export default Hero;
