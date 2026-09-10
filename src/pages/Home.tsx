import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
import { ContributionCalendar } from "@/components/ContributionCalendar";
import { useContributionsTotal } from "@/lib/useContributionsTotal";
import { FilesBrowse, FilesOverview, FilesProjects, FilesTabBar, FilesToolbar, type FilesSort, type FilesView } from "@/components/FilesNavigation";

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
const SLUGS = ["steadyward", "lv-matching", "addreach"];
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

function FolderImage({ small = false }: { small?: boolean }) {
  return (
    <img
      className={small ? "folder-image folder-small" : "folder-image"}
      src="/images/folder.png"
      alt=""
      width="128"
      height="128"
      draggable="false"
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
  const groups = [
    { title: "Explore", items: NAV.slice(0, 4) },
    { title: "Information", items: NAV.slice(4) },
  ];
  return (
    <nav aria-label="Explore Anviq" className="explorer-nav">
      {groups.map(({ title, items }) => (
        <div className="nav-group" key={title}>
          <p className="nav-group-label">{title}</p>
          {items.map(({ id, label, icon: Icon, href }) => (
            <Link
              key={id}
              to={href}
              className={`nav-link ${active === id ? "is-selected" : ""}`}
              aria-current={active === id ? "page" : undefined}
            >
              <Icon size={20} strokeWidth={1.7} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          ))}
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
          <FileText size={31} strokeWidth={1.35} aria-hidden="true" />
          <span>Welcome to Anviq</span>
        </div>
        <h1 id="welcome-title">Systems built to hold.</h1>
        <p className="intro">
          Independent AI engineering. Bespoke agents, integration, and
          infrastructure — one engineer, end-to-end accountability.
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
              <FolderImage />
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
                <Icon size={23} strokeWidth={1.65} aria-hidden="true" />
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
function ProjectBrowser({ slug, filesLayout, view, setView, sort, setSort }: { slug?: string; filesLayout: boolean; view: FilesView; setView: (view: FilesView) => void; sort: FilesSort; setSort: (sort: FilesSort) => void }) {
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
          <FolderImage />
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
              href="mailto:lvoss@anviq.net?subject=LV%20Matching"
              className="external-link"
            >
              <Mail size={19} aria-hidden="true" />
              Ask about LV Matching
            </a>
          )}
          <p className="project-note">
            A sample of independent builds. Client engagements are covered by
            discretion; these are products built and operated end to end.
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
              <Icon aria-hidden="true" size={26} strokeWidth={1.6} />
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
function Approach() {
  return (
    <DocumentPage
      title="Own the delivery."
      intro="I work inside your team to build agents, automate workflows, and connect existing systems. I own delivery from the first technical assessment through deployment and documentation."
    >
      <p>
        Hosting, access controls, and data handling are agreed before
        implementation.
      </p>
      <ol className="process-list">
        {PROCESS.map((step) => (
          <li key={step.n}>
            <span className="step-number">{step.n}</span>
            <div>
              <h2>{step.title}</h2>
              <p>{step.body}</p>
            </div>
          </li>
        ))}
      </ol>
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
      <h2>One letter away from “anvil.”</h2>
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
      <details className="brand-notes">
        <summary>Brand and writing notes</summary>
        <p>
          A forged mark, a disciplined grid, a restrained signal color. No robot
          hands, no glowing neural clouds, no purple swirls, no sparks.
        </p>
        <h3>From claim to commitment</h3>
        <p>
          Avoid: “We harness cutting-edge AI to revolutionize your business with
          seamless, future-proof automation.”
        </p>
        <p>
          Anviq voice: I work inside your team to build agents, automate
          workflows, and connect existing systems. I own delivery from the first
          technical assessment through deployment and documentation. Hosting,
          access controls, and data handling are agreed before implementation.
        </p>
        <p>
          Use: build, integrate, deploy, maintain — engineer, system, workflow —
          tested, documented, measured.
        </p>
        <p>
          Avoid: revolutionize, disrupt, supercharge — AI wizard, magic,
          ecosystem — seamless, flawless, effortless.
        </p>
      </details>
    </DocumentPage>
  );
}
function MissingPage() {
  return (
    <DocumentPage
      title="This page isn’t here."
      intro="The link may have changed. You can browse Anviq’s services and projects from the overview."
    >
      <Link className="external-link" to="/">
        <ArrowLeft size={18} aria-hidden="true" />
        Back to overview
      </Link>
    </DocumentPage>
  );
}
function SearchResults({ query }: { query: string }) {
  const entries = [
    ...NAV.filter((item) => item.id !== "overview").map((item) => ({
      title: item.label,
      href: item.href,
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
      body: `${item.tag}. ${item.body}`,
    })),
    {
      title: "About Anviq",
      href: "/explore/about",
      body: "Independent AI engineering practice. One engineer, full accountability.",
    },
  ];
  const words = query.toLocaleLowerCase().trim().split(/\s+/);
  const matches = query.trim()
    ? entries.filter((item) =>
        words.every((word) =>
          `${item.title} ${item.body}`.toLocaleLowerCase().includes(word),
        ),
      )
    : [];
  return (
    <DocumentPage
      title="Search Anviq"
      intro={
        query.trim()
          ? `${matches.length} ${matches.length === 1 ? "result" : "results"} for “${query.trim()}”`
          : "Search services, projects, and information using the field above."
      }
    >
      {query.trim() && !matches.length && (
        <div className="empty-state">
          <Search size={32} aria-hidden="true" />
          <h2>No matching pages</h2>
          <p>
            Try a project name or a topic such as “agents”, “hosting”, or
            “assessment”.
          </p>
          <Link className="external-link" to="/">
            Browse the overview <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}
      <div className="search-results">
        {matches.map((item) => (
          <Link to={item.href} key={item.href}>
            <FileText size={24} aria-hidden="true" />
            <div>
              <h2>{item.title}</h2>
              <p>{item.body}</p>
            </div>
            <ChevronRight size={18} aria-hidden="true" />
          </Link>
        ))}
      </div>
    </DocumentPage>
  );
}
function SearchControl({ query }: { query: string }) {
  const [search, setSearch] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current)
        document.getElementById("main-content")?.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    navigate(`/explore/search?q=${encodeURIComponent(search.trim())}`);
  };
  return (
    <form className="search-field" role="search" onSubmit={submit}>
      <button type="submit" aria-label="Search Anviq">
        <Search size={18} aria-hidden="true" />
      </button>
      <input
        ref={inputRef}
        type="search"
        name="q"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search Anviq…"
        aria-label="Search Anviq"
        autoComplete="off"
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
  const contributionsTotal = useContributionsTotal();
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
    search: "Search",
    browse: "Browse",
    about: "About Anviq",
  };
  const label =
    NAV.find((item) => item.id === active)?.label ??
    specialLabels[active] ??
    "Page not found";
  const query = new URLSearchParams(location.search).get("q") ?? "";
  useEffect(() => {
    document.title = `${currentProject?.name ?? label} — Anviq`;
    if (lastLocation.current !== location.key) {
      lastLocation.current = location.key;
      mainRef.current?.focus({ preventScroll: true });
      if (location.hash)
        document
          .getElementById(location.hash.slice(1))
          ?.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [location.key, location.hash, currentProject?.name, label]);
  let content: ReactNode;
  switch (active) {
    case "overview":
      content = filesLayout ? <FilesOverview /> : <Overview />;
      break;
    case "projects":
      content = <ProjectBrowser slug={slug} filesLayout={filesLayout} view={fileView} setView={setFileView} sort={fileSort} setSort={setFileSort} />;
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
          intro="This pulls live from GitHub. The calendar and list below show public repositories only; client work is under NDA."
        >
          {contributionsTotal !== null && (
            <p className="activity-total-stat">
              {contributionsTotal} contributions in the past year, across public and private work.
            </p>
          )}
          <ContributionCalendar username="Leovoss" />
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
    case "search":
      content = <SearchResults query={query} />;
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
            <BookOpen size={17} aria-hidden="true" />
            About Anviq
          </Link>
        </aside>
        {filesLayout ? <FilesToolbar title={currentProject?.name ?? (active === "overview" ? "Anviq" : label)} phone={mobile} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} back={filesBack}><SearchControl key={query} query={query} /></FilesToolbar> : <header className="explorer-toolbar">
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
          <SearchControl key={query} query={query} />
          <ContactLink compact>Get in touch</ContactLink>
        </header>}
        <main
          id="main-content"
          className="explorer-main"
          ref={mainRef}
          tabIndex={-1}
        >
          {content}
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
              ? "3 projects"
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
        <a href="mailto:lvoss@anviq.net">lvoss@anviq.net</a>
      </footer>
      {mobile && <FilesTabBar active={active} />}
    </div>
  );
}
