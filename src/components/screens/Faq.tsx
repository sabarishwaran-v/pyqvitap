"use client";

import React from "react";
import Link from 'next/link';
import RequestModal from "../ui/RequestModal";
import { useState } from "react";

function Faq() {
const faqs = [
    {
      question: "How do you source exam papers for the website?",
      answer:
        "Most of our exam papers are sourced directly from the university's DSpace repository. Additionally, users can contribute by uploading papers directly to our platform, helping us grow our collection.",
    },
    {
      question: "Is logging in required to download exam papers?",
      answer:
        "No login is needed! You can freely browse and download exam papers without creating an account.",
    },
    {
      question: 'What is meant by "flexible search" for exam papers?',
      answer:
        "Our flexible search feature allows you to filter exam papers using multiple criteria, such as exam type, slot, year, subject, and more, making it easy to find exactly what you need.",
    },
    {
      question: "How can I upload an exam paper to the website?",
      answer:
        <>
      Click the {" "}
        <Link
          href="/upload"
          rel="noopener noreferrer"
          className="text-[#562EE7] dark:text-[#A47DE5] underline"
        >
          Upload
        </Link>
      {" "}button at the top-right corner to submit your exam papers.
    </>
    },
    {
      question: "How do I reach out for support or assistance?",
      answer:
       <>
      For any queries or issues, you can mail us at{" "}
      <Link
        href="mailto:pyqvitap@gmail.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-[#562EE7] dark:text-[#A47DE5] underline"
      >
        pyqvitap@gmail.com
      </Link>
      .
    </>,
    },
    {
      question:
        "What should I do if I can’t find a specific exam paper on the website?",
      answer:
        <>
      If the paper you&apos;re looking for isn’t available, you can{" "}
      <span>
        <RequestModal section="faq"/>
      </span>
    </>,
    },
    {
      question: "Are uploaded papers immediately visible on the website?",
      answer:
        "Once uploaded, our AI system identifies and categorizes the paper by subject, slot, and other relevant tags. The paper then undergoes a quick manual review to ensure quality before it becomes visible on the site.",
    },
  ];


  const [faqActive, setFaqActive] = useState<number | null>(null);

  const handleClick = (index: number) => {
    setFaqActive(faqActive === index ? null : index);
  };

  return (
    <>
      <div
        id="faq"
        className="mb-8 w-full px-6 pt-16 text-center font-vipnabd text-4xl font-bold text-[#120020] dark:text-white lg:text-center lg:text-5xl"
      >
        Frequently Asked Questions
      </div>
      <div className="mx-auto mb-5 w-full max-w-5xl space-y-4 px-4 font-play sm:space-y-6 sm:px-6 md:px-8">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="cursor-pointer border-b border-[#453D60] px-2 py-3 sm:px-4 sm:py-4"
            onClick={() => handleClick(index)}
          >
            <div className="flex w-full items-start justify-between gap-4 sm:gap-6">
              <h2
                className={`w-full text-sm font-semibold leading-snug transition-colors sm:text-base md:text-lg ${
                  faqActive === index
                    ? "text-[#562EE7] dark:text-[#A47DE5] "
                    : "text-black dark:text-white"
                }`}
              >
                {faq.question}
              </h2>
              <button
                className={`flex h-6 w-8 shrink-0 items-center justify-center rounded-full text-base font-bold transition-all duration-200 sm:h-7 sm:w-9 sm:text-lg ${
                  faqActive === index
                    ? "bg-[#562EE7] dark:bg-[#A47DE5]  text-white"
                    : "bg-black text-white"
                }`}
              >
                {faqActive === index ? "−" : "+"}
              </button>
            </div>

            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out ${
                faqActive === index
                  ? "max-h-40 opacity-100"
                  : "max-h-0 opacity-0"
              }`}
            >
              <p className="mt-2 text-xs text-black dark:text-white sm:text-sm md:text-base">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default Faq;
