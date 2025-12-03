import React from "react";
import "../../styles/helpers.css";

export default function Section({
  id,
  title,
  description,
  right,
  children,
  className = "",
  padded = true,
}) {
  const pad = padded ? "p-4 md:p-6 lg:p-8" : "";
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined}
      className={`card shadow-soft ${pad} ${className}`}>
      <header className="mb-4 md:mb-6 flex items-start justify-between gap-4">
        <div className="w-full">
          {title && (
            <h2 id={id ? `${id}-title` : undefined}
                className="title-center text-lg md:text-xl font-bold text-primary">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-2 text-center text-sm text-muted">{description}</p>
          )}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </header>
      <div className="mt-2">{children}</div>
    </section>
  );
}
