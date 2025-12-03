import React from "react";

/**
 * Grid responsivo 12 colunas
 * props: colsSm=1, colsMd=2, colsLg=3, gap=4
 */
export default function Grid({
  colsSm = 1,
  colsMd = 2,
  colsLg = 3,
  gap = 4,
  className = "",
  children,
}) {
  const cls = [
    "grid",
    `gap-${gap}`,
    `grid-cols-${Math.min(12, Math.max(1, colsSm))}`,
    `md:grid-cols-${Math.min(12, Math.max(1, colsMd))}`,
    `lg:grid-cols-${Math.min(12, Math.max(1, colsLg))}`,
    className,
  ].join(" ");
  return <div className={cls}>{children}</div>;
}
