import { useEffect } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "./Logo";

export function Legal({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  useEffect(() => {
    document.title = `${title} - Anviq`;
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [title]);
  return (
    <div className="legal-window">
      <a className="skip-link" href="#legal-content">
        Skip to content
      </a>
      <header className="legal-toolbar">
        <Link to="/" className="brand" aria-label="Anviq overview">
          <Logo />
          <span>Anviq</span>
        </Link>
        <Link to="/" className="quiet-link">
          <ArrowLeft size={17} aria-hidden="true" />
          Back to site
        </Link>
      </header>
      <main id="legal-content" className="legal-content">
        <h1>{title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        <div className="legal-copy">{children}</div>
      </main>
      <footer className="legal-footer">
        <Link to="/">Overview</Link>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/cookies">Cookie Policy</Link>
        <Link to="/terms">Terms &amp; Disclaimer</Link>
        <span>© 2026 Anviq</span>
      </footer>
    </div>
  );
}
