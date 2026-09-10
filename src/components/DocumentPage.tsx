import type { ReactNode } from "react";

export function DocumentPage({
  title,
  intro,
  children,
  className,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <article className={`document-page ${className ?? ""}`}>
      <h1>{title}</h1>
      {intro && <p className="intro">{intro}</p>}
      {children}
    </article>
  );
}
