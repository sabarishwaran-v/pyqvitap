import React from "react";

interface ErrorProps {
  message?: string;
  filtersPulled?: boolean;
}

const Error = ({
  message = "Some error occured",
  filtersPulled,
}: ErrorProps) => {
  return (
    <div
      className={`flex h-[80%] flex-1 items-center justify-center ${filtersPulled ? "blur-xl" : ""}`}
    >
      <div className="-mt-48 text-center md:text-lg text-sm">{message}</div>
    </div>
  );
};

export default Error;
