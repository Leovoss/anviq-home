import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { FormEvent, ReactNode } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Compass,
  ExternalLink,
  FileText,
  Folder,
  House,
  Layers,
  Mail,
  PanelLeft,
  Search,
  Server,
  Workflow,
  X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  WORK,
  WORK_SELECTED,
  PROCESS,
  ENGAGEMENT,
  FAQ,
  IDEA,
} from "@/data/content";
import { PublicActivity } from "@/components/PublicActivity";
import { ExplorerPane } from "@/components/ExplorerPane";
import { ScreenshotLightbox } from "@/components/ScreenshotLightbox";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Variants } from "motion/react";
import { GitHubActivity } from "@/components/ui/github-activity";
import { FilesBrowse, FilesOverview, FilesProjects, FilesTabBar, FilesToolbar, type FilesSort, type FilesView } from "@/components/FilesNavigation";

const NAV_PILL_SPRING = { type: "spring", bounce: 0, duration: 0.32 } as const;
// Shared across FolderImage (Home.tsx) and FilesArtwork (FilesNavigation.tsx) -
// both use layoutId={`project-folder-${slug}`}, so opening a project from
// either grid morphs into the same preview image.
const FOLDER_LAYOUT_TRANSITION = { type: "spring", bounce: 0.1, duration: 0.42 } as const;
const NAV = [
  { id: "overview", label: "Overview", icon: House, href: "/" },
  {
    id: "services",
    label: "Services",
    icon: Layers,
    href: "/explore/services",
  },
  {
    id: "projects",
    label: "Selected work",
    icon: Folder,
    href: "/explore/projects",
  },
  {
    id: "approach",
    label: "Approach",
    icon: Compass,
    href: "/explore/approach",
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: FileText,
    href: "/explore/engagement",
  },
  {
    id: "questions",
    label: "Questions",
    icon: CircleHelp,
    href: "/explore/questions",
  },
  {
    id: "activity",
    label: "Activity",
    icon: Activity,
    href: "/explore/activity",
  },
];
const SLUGS = ["steadyward", "lv-matching", "addreach", "recruitment-crm"];
const FOUNDER_BIO = [
  "I work where customers, product, and regulated environments meet. Four years across forex brokerage, fintech, and iGaming, turning what customers struggle with into requirements engineering, compliance, and risk teams can act on: AML, KYC, and Source-of-Wealth for the German market, and a 200+ VIP portfolio generating roughly €10M a year at 82% retention.",
  "Anviq is that same approach applied directly: sit with the customer, find the real problem, own it through to something shipped and running. I build and run production systems for companies without engineers of their own, custom software, automation, integrations, GDPR-compliant infrastructure, using AI tools daily to move faster.",
  "Native German speaker with deep DACH market experience, studying computer science at Uninettuno alongside the work. Open to remote roles and relocation to Australia, the US, or Switzerland.",
];
const SEARCH_ENTRIES = [
  ...NAV.filter((item) => item.id !== "overview").map((item) => ({
    title: item.label,
    href: item.href,
    group: "Explore" as const,
    body:
      item.id === "services"
        ? WORK.map((s) => s.body).join(" ")
        : item.id === "approach"
          ? PROCESS.map((s) => s.body).join(" ")
          : item.id === "engagement"
            ? ENGAGEMENT.map((s) => s.body).join(" ")
            : item.id === "questions"
              ? FAQ.map((s) => s.q + " " + s.a).join(" ")
              : item.label,
  })),
  ...WORK_SELECTED.map((item, index) => ({
    title: item.name,
    href: `/projects/${SLUGS[index]}`,
    group: "Projects" as const,
    body: `${item.tag}. ${item.body}`,
  })),
  {
    title: "About Anviq",
    href: "/explore/about",
    group: "Explore" as const,
    body: "Independent AI engineering practice. One engineer, full accountability.",
  },
];
function searchEntries(query: string) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return SEARCH_ENTRIES.filter((item) =>
    words.every((word) =>
      `${item.title} ${item.body}`.toLocaleLowerCase().includes(word),
    ),
  );
}
const SERVICE_ICONS = [Workflow, Layers, Server];
const PROJECT_DETAILS = [
  [
    ["Focus", "Pattern detection on live trading accounts"],
    ["Delivery", "White-label trader alerts"],
    ["Boundary", "No execution access"],
  ],
  [
    ["Focus", "Construction bill-of-quantities matching"],
    ["Interface", "Chat and grid"],
    [
      "Infrastructure",
      "EU-hosted authentication and multi-tenant data handling",
    ],
  ],
  [
    ["Focus", "Cold outreach for the German market"],
    ["Delivery", "Automated sending infrastructure"],
    ["Infrastructure", "Deliverability and compliance within the pipeline"],
  ],
  [
    ["Focus", "Intake, matching, and legally-sequenced outreach"],
    ["Compliance", "Outreach ordered to UWG §7 Abs. 2, not convenience"],
    ["Data isolation", "Candidate and company data separated at the database role level"],
  ],
];
const subscribeMobile = (callback: () => void) => {
  const media = window.matchMedia("(max-width: 760px)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getMobile = () => window.matchMedia("(max-width: 760px)").matches;
const getServerMobile = () => false;
const filesQuery = "(max-width: 1180px), (pointer: coarse)";
const subscribeFiles = (callback: () => void) => {
  const media = window.matchMedia(filesQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getFilesLayout = () => window.matchMedia(filesQuery).matches;

function LinkedinLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.446-2.136 2.94v5.666H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452z" />
    </svg>
  );
}
function XLogo() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
function FolderImage({ small = false, slug }: { small?: boolean; slug?: string }) {
  const reducedMotion = useReducedMotion();
  const className = small ? "folder-image folder-small" : "folder-image";
  if (!slug)
    return (
      <img
        className={className}
        src="/images/folder.png"
        alt=""
        width="128"
        height="128"
        draggable="false"
      />
    );
  return (
    <motion.img
      layoutId={`project-folder-${slug}`}
      className={className}
      src="/images/folder.png"
      alt=""
      width="128"
      height="128"
      draggable="false"
      transition={reducedMotion ? { duration: 0 } : FOLDER_LAYOUT_TRANSITION}
    />
  );
}
function ContactLink({
  children = "Start a conversation",
  compact = false,
  href = "https://calendly.com/lvoss-anviq/30min?month=2026-09",
}: {
  children?: ReactNode;
  compact?: boolean;
  href?: string;
}) {
  return (
    <a
      className={`primary-button ${compact ? "compact-button" : ""}`}
      href={href}
      target={href.startsWith("mailto:") ? undefined : "_blank"}
      rel={href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
    >
      {children}
      {!compact && <ArrowRight size={18} aria-hidden="true" />}
    </a>
  );
}
function Navigation({ active }: { active: string }) {
  const reducedMotion = useReducedMotion();
  const pillTransition = reducedMotion ? { duration: 0 } : NAV_PILL_SPRING;
  const groups = [
    { title: "Explore", items: NAV.slice(0, 4) },
    { title: "Information", items: NAV.slice(4) },
  ];
  return (
    <nav aria-label="Explore Anviq" className="explorer-nav">
      {groups.map(({ title, items }) => (
        <div className="nav-group" key={title}>
          <p className="nav-group-label">{title}</p>
          {items.map(({ id, label, icon: Icon, href }) => {
            const selected = active === id;
            return (
              <Link
                key={id}
                to={href}
                className={`nav-link ${selected ? "is-selected" : ""}`}
                aria-current={selected ? "page" : undefined}
              >
                {selected && (
                  <motion.span
                    layoutId="explorer-nav-active"
                    className="nav-pill"
                    transition={pillTransition}
                  />
                )}
                <span className="nav-link-content">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  <span>{label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
function Overview() {
  return (
    <div className="overview-page">
      <section className="welcome-section" aria-labelledby="welcome-title">
        <div className="welcome-label">
          <FileText size={31} strokeWidth={1.75} aria-hidden="true" />
          <span>Welcome to Anviq</span>
        </div>
        <h1 id="welcome-title">Systems built to hold.</h1>
        <p className="intro">
          Independent AI engineering. Bespoke agents, integration, and
          infrastructure. One engineer, end-to-end accountability.
        </p>
        <ContactLink />
      </section>
      <section className="overview-projects" aria-labelledby="projects-title">
        <div className="section-heading">
          <h2 id="projects-title">Selected work</h2>
          <Link className="quiet-link" to="/explore/projects">
            Browse all <ChevronRight size={16} aria-hidden="true" />
          </Link>
        </div>
        <div className="folder-grid">
          {WORK_SELECTED.map((project, index) => (
            <Link
              className="project-folder"
              key={project.name}
              to={`/projects/${SLUGS[index]}`}
            >
              <span className="folder-image-lift">
                <FolderImage slug={SLUGS[index]} />
              </span>
              <h3>{project.name}</h3>
              <p>{project.tag}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="overview-services" aria-labelledby="services-title">
        <h2 id="services-title">How I can help</h2>
        <div className="service-links">
          {WORK.map((service, index) => {
            const Icon = SERVICE_ICONS[index];
            return (
              <Link
                key={service.title}
                to={`/explore/services#service-${index}`}
              >
                <Icon size={23} strokeWidth={1.75} aria-hidden="true" />
                <span>{service.title}</span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
function ProjectBrowser({ slug, filesLayout, mobile, view, setView, sort, setSort }: { slug?: string; filesLayout: boolean; mobile: boolean; view: FilesView; setView: (view: FilesView) => void; sort: FilesSort; setSort: (sort: FilesSort) => void }) {
  const selected = slug ? SLUGS.indexOf(slug) : filesLayout ? -1 : 0;
  if (slug && selected === -1) return <MissingPage />;
  const project = WORK_SELECTED[selected];
  return (
    <div className={`project-browser ${slug ? "has-project" : ""}`}>
      {filesLayout ? (!slug && <FilesProjects view={view} setView={setView} sort={sort} setSort={setSort} />) : <section className="project-list" aria-labelledby="project-list-title">
        <h1 id="project-list-title">Selected work</h1>
        <p>Independent builds</p>
        <nav aria-label="Projects">
          {WORK_SELECTED.map((item, index) => (
            <Link
              key={item.name}
              to={`/projects/${SLUGS[index]}`}
              aria-current={index === selected ? "page" : undefined}
              className={`project-row ${index === selected ? "is-selected" : ""}`}
            >
              <FolderImage small />
              <span>
                <strong>{item.name}</strong>
                <span>{item.tag}</span>
              </span>
              <ChevronRight size={17} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </section>}
      {project && (
        <article
          className="project-preview"
          aria-labelledby="project-title"
          key={project.name}
        >
          <Link className="mobile-back quiet-link" to="/explore/projects">
            <ChevronLeft size={19} aria-hidden="true" />
            Selected work
          </Link>
          <p className="document-label">Project overview</p>
          <FolderImage slug={SLUGS[selected]} />
          {filesLayout ? (
            <h1 id="project-title">{project.name}</h1>
          ) : (
            <h2 id="project-title">{project.name}</h2>
          )}
          <p className="project-category">{project.tag}</p>
          <p className="project-description">{project.body}</p>
          <dl className="project-details">
            {PROJECT_DETAILS[selected].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {project.screenshot && mobile && (
            <img
              className="project-screenshot project-screenshot-static"
              src={project.screenshot}
              alt={`${project.name} landing page`}
              loading="lazy"
            />
          )}
          {project.screenshot && !mobile && (
            <ScreenshotLightbox
              src={project.screenshot}
              alt={`${project.name} landing page`}
              label={`${project.name} screenshot`}
            />
          )}
          {project.href ? (
            <a
              href={project.href}
              className="external-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink size={19} aria-hidden="true" />
              Visit {project.domain}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          ) : (
            <a
              href={`mailto:lvoss@anviq.net?subject=${encodeURIComponent(project.name)}`}
              className="external-link"
            >
              <Mail size={19} aria-hidden="true" />
              Ask about {project.name}
            </a>
          )}
          <p className="project-note">
            A sample of independent builds, operated end to end. Some are
            covered by discretion, built for internal use. Others are sold
            as products with their own landing page, where more detail is
            shared.
          </p>
        </article>
      )}
    </div>
  );
}
function DocumentPage({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="document-page">
      <h1>{title}</h1>
      {intro && <p className="intro">{intro}</p>}
      {children}
    </article>
  );
}
function Services() {
  return (
    <DocumentPage
      title="Three things, one point of contact."
      intro="Bespoke AI agents, integration with what you already run, and infrastructure with agreed access controls."
    >
      <div className="document-sections">
        {WORK.map((item, index) => {
          const Icon = SERVICE_ICONS[index];
          return (
            <section
              id={`service-${index}`}
              key={item.title}
              className="service-detail"
            >
              <Icon aria-hidden="true" size={26} strokeWidth={1.75} />
              <div>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
              </div>
            </section>
          );
        })}
      </div>
      <p>
        One engineer embeds with your team and owns delivery from the first
        technical assessment through deployment and documentation.
      </p>
      <Link className="external-link" to="/explore/approach">
        See the approach <ArrowRight size={18} aria-hidden="true" />
      </Link>
      <ContactLink />
    </DocumentPage>
  );
}
const PROCESS_LIST_VARIANTS = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
} satisfies Variants;
const PROCESS_ITEM_VARIANTS = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] as const },
  },
} satisfies Variants;

function Approach() {
  const listRef = useRef<HTMLOListElement>(null);
  const [focusedStep, setFocusedStep] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const items = listRef.current
      ? [...listRef.current.querySelectorAll<HTMLLIElement>("li")]
      : [];
    if (!items.length) return;
    const ratios = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const step = entry.target.getAttribute("data-step");
          if (step) ratios.set(step, entry.intersectionRatio);
        }
        let best: string | null = null;
        let bestRatio = 0.1;
        for (const [step, ratio] of ratios) {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = step;
          }
        }
        setFocusedStep(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-35% 0px -35% 0px" },
    );
    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return (
    <DocumentPage
      title="Own the delivery."
      intro="I work inside your team to build agents, automate workflows, and connect existing systems. I own delivery from the first technical assessment through deployment and documentation."
    >
      <p>
        Hosting, access controls, and data handling are agreed before
        implementation.
      </p>
      <motion.ol
        ref={listRef}
        className={`process-list ${focusedStep ? "has-focus" : ""}`}
        initial={reducedMotion ? undefined : "hidden"}
        whileInView={reducedMotion ? undefined : "visible"}
        viewport={{ once: true, amount: 0.3 }}
        variants={reducedMotion ? undefined : PROCESS_LIST_VARIANTS}
      >
        {PROCESS.map((step) => (
          <motion.li
            key={step.n}
            data-step={step.n}
            className={focusedStep === step.n ? "is-focused" : ""}
            variants={reducedMotion ? undefined : PROCESS_ITEM_VARIANTS}
          >
            <span className="step-number">{step.n}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </div>
          </motion.li>
        ))}
      </motion.ol>
      <Link className="external-link" to="/explore/engagement">
        How an engagement works <ArrowRight size={18} aria-hidden="true" />
      </Link>
    </DocumentPage>
  );
}
function Engagement() {
  return (
    <DocumentPage
      title="Working together."
      intro="Every engagement starts with a scoped technical assessment before any commitment to build. From there, I quote a fixed scope or an ongoing arrangement, whichever fits the work."
    >
      <div className="document-sections">
        {ENGAGEMENT.map((item) => (
          <section key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </section>
        ))}
      </div>
      <ContactLink />
    </DocumentPage>
  );
}
function Questions() {
  return (
    <DocumentPage
      title="Common questions."
      intro="A few things to know before we get started."
    >
      <div className="faq-list">
        {FAQ.map((item) => (
          <details key={item.q}>
            <summary>
              {item.q}
              <ChevronRight size={18} aria-hidden="true" />
            </summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
      <p>Something else on your mind?</p>
      <ContactLink />
    </DocumentPage>
  );
}
function About() {
  return (
    <DocumentPage
      title="About Anviq."
      intro="Anviq is an independent forward deployed AI engineering practice. One engineer, full accountability."
    >
      <p>
        Built for European enterprises. Hosting and access controls agreed
        upfront. Documented decisions, clear responsibilities.
      </p>
      <h2>One letter away from "anvil."</h2>
      <p>
        The metaphor is construction, testing and accountability, not spectacle.
        What gets built is meant to be inspected, not marveled at.
      </p>
      <div className="document-sections">
        {IDEA.map((item) => (
          <section key={item.title}>
            <h2>{item.title}</h2>
            <p>{item.body}</p>
          </section>
        ))}
      </div>
      <h2 className="founder-heading">Founder</h2>
      <div className="founder-card">
        <img
          className="founder-photo"
          src="/images/founder.png"
          alt="Leonardo Voss"
        />
        <h2>Leonardo Voss</h2>
        <p className="founder-role">Founder, Anviq</p>
        <div className="founder-bio">
          {FOUNDER_BIO.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </DocumentPage>
  );
}
function MissingPage() {
  return (
    <DocumentPage
      title="This page isn't here."
      intro="The link may have changed. You can browse Anviq's services and projects from the overview."
    >
      <Link className="external-link" to="/">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to overview
      </Link>
    </DocumentPage>
  );
}
const PALETTE_FADE = { duration: 0.15 } as const;
const SEARCH_GROUPS = ["Explore", "Projects"] as const;
type SearchEntry = (typeof SEARCH_ENTRIES)[number];

function groupSuggestions(suggestions: SearchEntry[]) {
  return SEARCH_GROUPS.map((label) => ({
    label,
    items: suggestions.filter((item) => item.group === label),
  })).filter((group) => group.items.length > 0);
}

function SuggestionGroups({
  groups,
  suggestions,
  highlighted,
  setHighlighted,
  goTo,
}: {
  groups: ReturnType<typeof groupSuggestions>;
  suggestions: SearchEntry[];
  highlighted: number;
  setHighlighted: (index: number) => void;
  goTo: (href: string) => void;
}) {
  return (
    <>
      {groups.map((group) => (
        <li key={group.label} role="presentation" className="palette-group">
          <div role="group" aria-label={group.label}>
            <p className="palette-group-label" aria-hidden="true">
              {group.label}
            </p>
            {group.items.map((item) => {
              const index = suggestions.indexOf(item);
              return (
                <button
                  key={item.href}
                  type="button"
                  id={`search-suggestion-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                  className={index === highlighted ? "is-highlighted" : ""}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => goTo(item.href)}
                >
                  <span className="suggestion-icon">
                    <FileText size={17} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.body}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </li>
      ))}
    </>
  );
}

function SearchControl({
  variant = "palette",
}: {
  variant?: "palette" | "inline";
}) {
  return variant === "inline" ? <InlineSearch /> : <CommandPalette />;
}

function InlineSearch() {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const suggestions = search.trim() ? searchEntries(search).slice(0, 8) : [];
  const groups = groupSuggestions(suggestions);
  const showSuggestions = focused && suggestions.length > 0;

  useEffect(() => {
    setHighlighted(0);
  }, [search]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const goTo = (href: string) => {
    setFocused(false);
    setSearch("");
    navigate(href);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (suggestions[highlighted]) goTo(suggestions[highlighted].href);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions) {
      if (event.key === "Escape") inputRef.current?.blur();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (event.key === "Escape") {
      setFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="search-field-wrap" ref={wrapRef}>
      <form className="search-field" role="search" onSubmit={submit}>
        <Search size={18} aria-hidden="true" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          placeholder="Search Anviq..."
          aria-label="Search Anviq"
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions}
          aria-controls="search-suggestions"
          aria-activedescendant={
            showSuggestions ? `search-suggestion-${highlighted}` : undefined
          }
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setSearch("");
              inputRef.current?.focus();
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </form>
      {showSuggestions && (
        <ul className="search-suggestions" id="search-suggestions" role="listbox">
          <SuggestionGroups
            groups={groups}
            suggestions={suggestions}
            highlighted={highlighted}
            setHighlighted={setHighlighted}
            goTo={goTo}
          />
        </ul>
      )}
    </div>
  );
}

function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();

  const suggestions = search.trim() ? searchEntries(search).slice(0, 8) : [];
  const groups = groupSuggestions(suggestions);

  useEffect(() => {
    setHighlighted(0);
  }, [search]);

  // Global Cmd/Ctrl+K opens the palette from anywhere. Ctrl+K is reserved by
  // Chrome/Edge on Windows for the omnibox and never reaches page JS there,
  // so "/" (used by GitHub, Slack, Notion) is a reliable fallback - guarded
  // so it doesn't hijack typing in a real text field.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
        return;
      }
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const target = event.target as HTMLElement | null;
        const isTyping =
          target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (isTyping) return;
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus the input on open; trap Tab and handle Escape while open; restore
  // focus to the trigger on close.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      const focusable = dialog
        ? [
            ...dialog.querySelectorAll<HTMLElement>(
              'button, input, [href], [tabindex]:not([tabindex="-1"])',
            ),
          ]
        : [];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      triggerRef.current?.focus();
    };
  }, [open]);

  const goTo = (href: string) => {
    setOpen(false);
    setSearch("");
    navigate(href);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (suggestions[highlighted]) goTo(suggestions[highlighted].href);
  };

  const onInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!suggestions.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    }
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="icon-button search-trigger"
        aria-label="Search Anviq (press / or Cmd+K)"
        onClick={() => setOpen(true)}
      >
        <Search size={18} aria-hidden="true" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
          <motion.div
            className="command-palette-backdrop"
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reducedMotion ? { duration: 0 } : PALETTE_FADE}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label="Search Anviq"
              className="command-palette-dialog"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={reducedMotion ? { duration: 0 } : PALETTE_FADE}
            >
              <form className="search-field" role="search" onSubmit={submit}>
                <Search size={18} aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="search"
                  name="q"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={onInputKeyDown}
                  placeholder="Search Anviq..."
                  aria-label="Search Anviq"
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={suggestions.length > 0}
                  aria-controls="search-suggestions"
                  aria-activedescendant={
                    suggestions.length
                      ? `search-suggestion-${highlighted}`
                      : undefined
                  }
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={() => {
                      setSearch("");
                      inputRef.current?.focus();
                    }}
                  >
                    <X size={16} aria-hidden="true" />
                  </button>
                )}
              </form>
              {groups.length > 0 ? (
                <ul
                  className="search-suggestions palette-results"
                  id="search-suggestions"
                  role="listbox"
                >
                  <SuggestionGroups
                    groups={groups}
                    suggestions={suggestions}
                    highlighted={highlighted}
                    setHighlighted={setHighlighted}
                    goTo={goTo}
                  />
                </ul>
              ) : (
                search.trim() && (
                  <p className="palette-empty">No results for "{search}"</p>
                )
              )}
            </motion.div>
          </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
export function Home() {
  const { section, project: slug } = useParams();
  const location = useLocation();
  const mobile = useSyncExternalStore(
    subscribeMobile,
    getMobile,
    getServerMobile,
  );
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const reducedMotion = useReducedMotion();
  const aboutPillTransition = reducedMotion ? { duration: 0 } : NAV_PILL_SPRING;
  const filesLayout = useSyncExternalStore(subscribeFiles, getFilesLayout, getServerMobile);
  const [fileView, setFileView] = useState<FilesView>("icons");
  const [fileSort, setFileSort] = useState<FilesSort>("name");
  const mainRef = useRef<HTMLElement>(null);
  const lastLocation = useRef(location.key);
  const isProject = location.pathname.startsWith("/projects/");
  const active = isProject
    ? "projects"
    : (section ?? (location.pathname === "/" ? "overview" : "missing"));
  const currentProject = isProject
    ? WORK_SELECTED[SLUGS.indexOf(slug ?? "")]
    : undefined;
  const specialLabels: Record<string, string> = {
    browse: "Browse",
    about: "About Anviq",
  };
  const label =
    NAV.find((item) => item.id === active)?.label ??
    specialLabels[active] ??
    "Page not found";
  const syncScrollAndFocus = () => {
    mainRef.current?.focus({ preventScroll: true });
    if (location.hash) {
      document
        .getElementById(location.hash.slice(1))
        ?.scrollIntoView({ block: "start" });
      return;
    }
    // Desktop scrolls inside .explorer-main (boxed window); files-layout
    // scrolls the page itself (.explorer-main is overflow:visible there).
    // Reset whichever one actually owns the scroll - the other is a no-op.
    if (mainRef.current) mainRef.current.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  useEffect(() => {
    document.title = `${currentProject?.name ?? label} - Anviq`;
    if (lastLocation.current !== location.key) {
      lastLocation.current = location.key;
      // Handles same-pane hash jumps (e.g. switching #service-N anchors)
      // immediately. When the active section/project itself changes, the
      // new pane hasn't mounted yet under AnimatePresence mode="wait" - this
      // call is a harmless no-op then, and ExplorerPane's onEnter (below)
      // re-runs the same logic once the new content is actually in the DOM.
      syncScrollAndFocus();
    }
  }, [location.key, location.hash, currentProject?.name, label]);
  let content: ReactNode;
  switch (active) {
    case "overview":
      content = filesLayout ? <FilesOverview /> : <Overview />;
      break;
    case "projects":
      content = <ProjectBrowser slug={slug} filesLayout={filesLayout} mobile={mobile} view={fileView} setView={setFileView} sort={fileSort} setSort={setFileSort} />;
      break;
    case "services":
      content = <Services />;
      break;
    case "approach":
      content = <Approach />;
      break;
    case "engagement":
      content = <Engagement />;
      break;
    case "questions":
      content = <Questions />;
      break;
    case "activity":
      content = (
        <DocumentPage
          title="Public activity."
          intro="This pulls live from GitHub. The calendar shows public and private activity; the linked list below is public repositories only."
        >
          <div className="activity-calendar-scroll">
            <GitHubActivity
              username="Leovoss"
              showMonths
              cellSize={filesLayout ? 14 : 11}
              className="anviq-github-activity"
            />
          </div>
          <PublicActivity />
          <a
            className="external-link"
            href="https://github.com/Leovoss"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={18} aria-hidden="true" />
            View Leovoss on GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </DocumentPage>
      );
      break;
    case "about":
      content = <About />;
      break;
    case "browse":
      content = filesLayout ? <FilesBrowse /> : (
        <DocumentPage title="Browse Anviq">
          <Navigation active="browse" />
          <Link className="external-link" to="/explore/about">
            <BookOpen size={18} aria-hidden="true" />
            About Anviq
          </Link>
        </DocumentPage>
      );
      break;
    default:
      content = <MissingPage />;
  }
  const legacy: Record<string, string> = {
    "#work": "/explore/services",
    "#work-selected": "/explore/projects",
    "#approach": "/explore/approach",
    "#engagement": "/explore/engagement",
    "#faq": "/explore/questions",
    "#activity": "/explore/activity",
    "#contact": "/explore/engagement",
  };
  if (location.pathname === "/" && legacy[location.hash])
    return <Navigate to={legacy[location.hash]} replace />;
  const filesBack = isProject
    ? { href: "/explore/projects", label: "Selected work" }
    : active === "browse"
      ? { href: "/", label: "Anviq" }
      : { href: "/explore/browse", label: "Browse" };
  return (
    <div className={filesLayout ? `files-layout ${mobile ? "phone-layout" : "tablet-layout"}` : "desktop-layout"}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <div
        className={`explorer-window ${!sidebarOpen ? "sidebar-hidden" : ""}`}
      >
        <aside
          className="explorer-sidebar"
          id="desktop-sidebar"
          hidden={!sidebarOpen || mobile}
        >
          {filesLayout && <p className="files-sidebar-title">Browse</p>}
          <Link to="/" className="brand" aria-label="Anviq overview">
            <Logo />
            <span>Anviq</span>
          </Link>
          <Navigation active={active} />
          <Link
            className={`about-link ${active === "about" ? "is-selected" : ""}`}
            aria-current={active === "about" ? "page" : undefined}
            to="/explore/about"
          >
            {active === "about" && (
              <motion.span
                layoutId="explorer-nav-active"
                className="nav-pill"
                transition={aboutPillTransition}
              />
            )}
            <span className="nav-link-content">
              <BookOpen size={17} aria-hidden="true" />
              About Anviq
            </span>
          </Link>
        </aside>
        {filesLayout ? <FilesToolbar title={currentProject?.name ?? (active === "overview" ? "Anviq" : label)} phone={mobile} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} back={filesBack}><SearchControl variant="inline" /></FilesToolbar> : <header className="explorer-toolbar">
          {mobile ? (
            <Link
              className="browse-button"
              to={active === "browse" ? "/" : "/explore/browse"}
            >
              <PanelLeft size={21} aria-hidden="true" />
              <span>{active === "browse" ? "Overview" : "Browse"}</span>
            </Link>
          ) : (
            <button
              className="icon-button"
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              aria-expanded={sidebarOpen}
              aria-controls="desktop-sidebar"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <PanelLeft size={21} aria-hidden="true" />
            </button>
          )}
          <nav className="toolbar-path" aria-label="Breadcrumb">
            <Link to="/">Anviq</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{label}</span>
          </nav>
          <SearchControl />
          <ContactLink compact>Get in touch</ContactLink>
        </header>}
        <main
          id="main-content"
          className="explorer-main"
          ref={mainRef}
          tabIndex={-1}
        >
          <ExplorerPane
            animKey={`${active}-${slug ?? ""}`}
            onEnter={syncScrollAndFocus}
          >
            {content}
          </ExplorerPane>
        </main>
        <footer className="explorer-status">
          <nav aria-label="Current location">
            <Link to="/">Anviq</Link>
            <ChevronRight size={14} aria-hidden="true" />
            <Link
              to={
                NAV.find((item) => item.id === active)?.href ??
                `${location.pathname}${location.search}`
              }
            >
              {label}
            </Link>
            {currentProject && (
              <>
                <ChevronRight size={14} aria-hidden="true" />
                <span>{currentProject.name}</span>
              </>
            )}
          </nav>
          <span>
            {active === "projects" || active === "overview"
              ? `${WORK_SELECTED.length} projects`
              : "Independent practice"}
          </span>
        </footer>
      </div>
      <footer className="site-footer">
        <span>© 2026 Anviq</span>
        <nav aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/cookies">Cookies</Link>
          <Link to="/terms">Terms &amp; disclaimer</Link>
        </nav>
        <div className="site-footer-right">
          <nav className="social-links" aria-label="Social">
            <a
              href="https://www.linkedin.com/in/v-leonardo/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Leonardo Voss on LinkedIn"
            >
              <LinkedinLogo />
            </a>
            <a
              href="https://x.com/thereallvoss"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Leonardo Voss on X"
            >
              <XLogo />
            </a>
          </nav>
          <a href="mailto:lvoss@anviq.net">lvoss@anviq.net</a>
        </div>
      </footer>
      {mobile && <FilesTabBar active={active} />}
    </div>
  );
}
