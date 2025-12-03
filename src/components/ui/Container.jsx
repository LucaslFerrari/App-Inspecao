import React from "react";
import "../../styles/helpers.css";

export default function Container({ className = "", children }) {
  return (
    <div
      className={[
        "w-full",
        "max-w-7xl",
        "mx-auto",
        "px-3 sm:px-4 md:px-6",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
