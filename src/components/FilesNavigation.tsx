import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Activity, ArrowRight, BookOpen, ChevronLeft, ChevronRight, CircleHelp, Compass, FileText, Folder, House, Layers, LayoutGrid, List, Mail, PanelLeft, Server, Workflow } from "lucide-react";
import { WORK, WORK_SELECTED } from "@/data/content";
import { Logo } from "@/components/Logo";

const projectSlugs = ["steadyward", "lv-matching", "addreach", "recruitment-crm", "anviq-forge"];
const serviceIcons = [Workflow, Layers, Server];

export function FilesArtwork({ document = false }: { document?: boolean }) {
  return document ? <span className="files-document-icon" aria-hidden="true"><FileText size={31} strokeWidth={1.75} /></span> : <img className="files-folder-art" src="/images/folder.png" width="112" height="112" alt="" draggable="false" />;
}

export function FilesToolbar({ title, phone, sidebarOpen, onToggleSidebar, back, children }: {
  title: string;
  phone: boolean;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  back: { href: string; label: string };
  children: ReactNode;
}) {
  return <header className="files-toolbar">
    <div className="files-toolbar-row">
      {phone ? <Link to={back.href} className="files-back"><ChevronLeft size={24} aria-hidden="true" /><span>{back.label}</span></Link> : <div className="files-toolbar-leading"><button className="icon-button" aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"} aria-expanded={sidebarOpen} aria-controls="desktop-sidebar" onClick={onToggleSidebar}><PanelLeft size={23} aria-hidden="true" /></button>{back.href !== "/explore/browse" && <Link to={back.href} className="files-back"><ChevronLeft size={22} aria-hidden="true" /><span>{back.label}</span></Link>}</div>}
      <span className="files-toolbar-title">{title}</span>
      <a href="https://calendly.com/lvoss-anviq/30min?month=2026-09" target="_blank" rel="noopener noreferrer" className="files-contact" aria-label="Contact Anviq"><Mail size={22} strokeWidth={1.75} aria-hidden="true" /><span>Contact</span></a>
    </div>
    <div className="files-search-row">{children}</div>
  </header>;
}

export function FilesTabBar({ active }: { active: string }) {
  const selected = active === "overview" ? "overview" : active === "activity" ? "activity" : "browse";
  return <nav className="files-tab-bar" aria-label="Main navigation">
    {[{ id: "overview", href: "/", label: "Overview", Icon: House }, { id: "browse", href: "/explore/browse", label: "Browse", Icon: Folder }, { id: "activity", href: "/explore/activity", label: "Activity", Icon: Activity }].map(({ id, href, label, Icon }) => <Link key={id} to={href} aria-current={selected === id ? "page" : undefined}><Icon size={23} strokeWidth={selected === id ? 2 : 1.6} aria-hidden="true" /><span>{label}</span></Link>)}
  </nav>;
}

export function FilesOverview() {
  return <div className="files-overview files-screen">
    <div className="files-page-heading"><h1 className="sr-only">Anviq</h1><Logo /><p>Independent AI engineering</p></div>
    <section className="files-welcome-document" aria-labelledby="files-welcome-title">
      <div className="files-document-heading"><FilesArtwork document /><div><span>Read me</span><h2 id="files-welcome-title">Systems built to hold.</h2></div></div>
      <p>Bespoke agents, integration, and infrastructure. One engineer, end-to-end accountability.</p>
      <a href="https://calendly.com/lvoss-anviq/30min?month=2026-09" target="_blank" rel="noopener noreferrer">Start a conversation <ArrowRight size={17} aria-hidden="true" /></a>
    </section>
    <section className="files-overview-work" aria-labelledby="files-work-title"><div className="files-section-heading"><h2 id="files-work-title">Selected work</h2><Link to="/explore/projects">See all<ChevronRight size={16} aria-hidden="true" /></Link></div>
      <div className="files-grid">{WORK_SELECTED.map((project, index) => <Link className="files-item" key={project.name} to={`/projects/${projectSlugs[index]}`}><FilesArtwork /><span className="files-item-name">{project.name}</span><span className="files-item-kind">Project</span></Link>)}</div>
    </section>
    <section className="files-services" aria-labelledby="files-services-title"><h2 id="files-services-title">Services</h2><div className="files-grouped-list">{WORK.map((item, index) => { const Icon = serviceIcons[index]; return <Link key={item.title} to={`/explore/services#service-${index}`}><Icon size={22} strokeWidth={1.75} aria-hidden="true" /><span>{item.title}</span><ChevronRight size={17} aria-hidden="true" /></Link> })}</div></section>
  </div>;
}

export function FilesBrowse() {
  const groups = [
    { title: "Locations", items: [{ label: "Anviq", note: "Independent engineering practice", href: "/", Icon: Folder }] },
    { title: "Favorites", items: [{ label: "Selected work", note: "3 projects", href: "/explore/projects", Icon: Folder }, { label: "Services", href: "/explore/services", Icon: Layers }, { label: "Approach", href: "/explore/approach", Icon: Compass }] },
    { title: "Information", items: [{ label: "Engagement", href: "/explore/engagement", Icon: FileText }, { label: "Questions", href: "/explore/questions", Icon: CircleHelp }, { label: "Activity", href: "/explore/activity", Icon: Activity }, { label: "About Anviq", href: "/explore/about", Icon: BookOpen }] },
  ];
  return <div className="files-browse files-screen"><div className="files-page-heading"><h1>Browse</h1></div>{groups.map(({ title, items }) => <section className="files-browse-group" key={title}><h2>{title}</h2><nav className="files-grouped-list" aria-label={title}>{items.map(({ label, href, Icon, ...rest }) => <Link to={href} key={href}><Icon size={23} strokeWidth={1.75} aria-hidden="true" /><span>{label}{"note" in rest && <small>{rest.note}</small>}</span><ChevronRight size={17} aria-hidden="true" /></Link>)}</nav></section>)}</div>;
}

export type FilesView = "icons" | "list";
export type FilesSort = "name" | "kind";
export function FilesProjects({ view, setView, sort, setSort }: { view: FilesView; setView: (view: FilesView) => void; sort: FilesSort; setSort: (sort: FilesSort) => void }) {
  const projects = WORK_SELECTED.map((item, index) => ({ ...item, slug: projectSlugs[index] })).sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : a.tag.localeCompare(b.tag)));
  return <section className="files-projects files-screen" aria-labelledby="files-projects-title"><div className="files-page-heading"><h1 id="files-projects-title">Selected work</h1><p>Independent builds, end to end.</p></div>
    <div className="files-view-toolbar"><label className="files-sort">Sort by <select aria-label="Sort projects" value={sort} onChange={event => setSort(event.target.value as FilesSort)}><option value="name">Name</option><option value="kind">Type</option></select></label><div className="files-view-switch" role="group" aria-label="Project view"><button aria-label="Icon view" aria-pressed={view === "icons"} onClick={() => setView("icons")}><LayoutGrid size={19} aria-hidden="true" /></button><button aria-label="List view" aria-pressed={view === "list"} onClick={() => setView("list")}><List size={22} aria-hidden="true" /></button></div></div>
    <nav className={view === "icons" ? "files-grid" : "files-project-rows"} aria-label="Projects">{projects.map(project => <Link className="files-item" key={project.slug} to={`/projects/${project.slug}`}><FilesArtwork /><span className="files-item-name">{project.name}</span><span className="files-item-kind">{project.tag}</span>{view === "list" && <ChevronRight size={17} aria-hidden="true" />}</Link>)}</nav>
    <p className="files-item-count">3 projects</p>
    <p className="files-collection-note">Client engagements are covered by discretion. These are independent products built and operated end to end.</p>
  </section>;
}
