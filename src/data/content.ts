export const WORK = [
  {
    title: "Software & automation",
    body: "Custom software and automation built for a workflow you already have, using AI where it earns its place, not by default.",
  },
  {
    title: "Integration",
    body: "Connect what gets built to the systems you already run: scheduling to billing, CRM to operations, wherever the handoff currently breaks.",
  },
  {
    title: "Infrastructure",
    body: "Hosting region, access controls and data handling agreed with you before a line of implementation starts.",
  },
];

export const IDEA = [
  {
    title: "Precision engineering",
    body: "Make dimensions, decisions and outcomes explicit.",
  },
  { title: "Quiet confidence", body: "Let evidence carry the claim." },
  { title: "Trust", body: "State responsibilities and boundaries." },
  { title: "Discretion", body: "Protect client information." },
];

export const PROCESS = [
  {
    n: "01",
    title: "Assess",
    body: "Map the workflow, the systems involved, and where the work actually breaks down today.",
  },
  {
    n: "02",
    title: "Build",
    body: "Build and integrate the agent against your real systems, not a demo environment.",
  },
  {
    n: "03",
    title: "Deploy",
    body: "Ship into the agreed hosting environment, under the agreed access controls.",
  },
  {
    n: "04",
    title: "Document & maintain",
    body: "Hand over what changed and who owns it. Stay on for maintenance if you want it.",
  },
];

export const WORK_SELECTED = [
  {
    href: "https://steadyward.com",
    tag: "Retention infrastructure",
    name: "Steadyward",
    body: "A read-only behavioural retention layer for MT4/MT5 brokers: pattern detection on live trading accounts, white-label trader alerts, no execution access.",
    domain: "steadyward.com",
    screenshot: "/images/steadyward-shot.png",
    ships: [] as { date: string; title: string }[],
    files: [
      {
        name: "README.md",
        body: [
          "Behavioural retention layer for MT4/MT5 brokers. Watches live trading accounts for churn patterns and surfaces white-label alerts to the broker's retention team.",
          "Read-only against the trading platform: it observes account activity, it never places or modifies a trade.",
        ],
      },
      {
        name: "architecture.md",
        body: [
          "Ingests account activity from the broker's MT4/MT5 bridge on a polling schedule, scores it against known churn patterns, and writes alerts to a queue the broker's own retention tooling consumes.",
          "No direct connection between Steadyward and the trading engine's order execution path.",
        ],
      },
      {
        name: "constraints.md",
        body: [
          "No execution access, by design: the retention layer cannot place, close, or modify a trade.",
          "Hosting region and data retention are agreed per broker before onboarding.",
        ],
      },
      {
        name: "proof.md",
        body: [],
        boundary:
          "What broke: retention teams found out a trader was about to churn from a spreadsheet updated once a week, well after it mattered.",
        proof: [
          ["Signal", "3 consecutive high-risk sessions"],
          ["Alert latency", "Under 5 minutes from pattern match"],
          ["Access level", "Read-only, no trade endpoints called"],
        ],
      },
    ],
  },
  {
    href: null,
    tag: "Multi-tenant SaaS",
    name: "LV Matching",
    body: "Construction bill-of-quantities matching for multiple tenants, with a chat-and-grid interface, EU-hosted auth, and data handling built for GDPR from the schema up.",
    domain: null,
    screenshot: null,
    ships: [] as { date: string; title: string }[],
    files: [
      {
        name: "README.md",
        body: [
          "Bill-of-quantities matching for construction estimators, multi-tenant from the schema up. A chat interface sits next to the grid for quick corrections.",
          "EU-hosted authentication; tenant data is isolated at the database level, not just filtered in application code.",
        ],
      },
      {
        name: "proof.md",
        body: [],
        boundary:
          "What broke: estimators matched bill-of-quantities line items by hand across spreadsheets per tenant, with no shared audit trail.",
        proof: [
          ["Match confidence", "Surfaced per line item, not hidden"],
          ["Tenant isolation", "Separate schema per tenant, not a shared table with a tenant_id filter"],
          ["Audit", "Every accepted match logged with who and when"],
        ],
      },
    ],
  },
  {
    href: "https://addreach.addvert.de",
    tag: "Outbound automation",
    name: "Addreach",
    body: "Cold-outreach product for a German market: automated sending infrastructure with deliverability and compliance built into the pipeline, not bolted on after.",
    domain: "addreach.addvert.de",
    screenshot: "/images/addreach-shot.png",
    ships: [] as { date: string; title: string }[],
    files: [
      {
        name: "README.md",
        body: [
          "Cold-outreach sending infrastructure built for the German market, where outreach compliance isn't optional.",
          "Deliverability tooling and legal sequencing sit inside the send pipeline, not as a separate checklist someone can skip.",
        ],
      },
      {
        name: "proof.md",
        body: [],
        boundary:
          "What broke: outreach sequencing lived in a spreadsheet no compliance review ever saw before sends went out.",
        proof: [
          ["Send eligibility", "Checked against opt-out and sequencing rules before queueing"],
          ["Deliverability", "Domain and sender reputation monitored per campaign"],
          ["Compliance gate", "A send blocks automatically if the legal window hasn't passed"],
        ],
      },
    ],
  },
  {
    href: null,
    tag: "Recruitment platform",
    name: "Automated Recruitment CRM",
    body: "Runs the full loop from ad-sourced CV intake to legally-sequenced outreach to placement, for a German recruitment operation. Matching is deterministic code, not AI, by design: the EU AI Act was the reason, not a missing feature.",
    domain: null,
    screenshot: null,
    ships: [] as { date: string; title: string }[],
    files: [
      {
        name: "README.md",
        body: [
          "Runs the full recruitment loop: ad-sourced CV intake, legally-sequenced candidate outreach, placement tracking, for a German recruitment operation.",
          "Matching is deterministic code, not a model. That was a legal decision, not a technical shortcut.",
        ],
      },
      {
        name: "architecture.md",
        body: [
          "Intake pulls CVs from job-board ad responses into a normalized candidate record. A rules engine scores fit against open roles; outreach is queued only once the legally required sequencing window has passed.",
          "Candidate and company data are separated at the database role level so a compromised outreach worker can't read company-side records.",
        ],
      },
      {
        name: "constraints.md",
        body: [
          "No AI in the matching path: under the EU AI Act, an automated match with legal or similarly significant effect on a candidate carries obligations this system is built to avoid entirely.",
          "Outreach ordered to UWG §7 Abs. 2, not to whatever is fastest to send.",
        ],
      },
      {
        name: "proof.md",
        body: [],
        boundary:
          "What broke: candidate outreach went out whenever a recruiter had time, not when the law required a gap since the ad response.",
        proof: [
          ["Matching", "Deterministic rules engine, not a model"],
          ["Outreach timing", "Blocked until the UWG §7 Abs. 2 window has passed"],
          ["Data isolation", "Candidate and company records separated at the database role level"],
        ],
      },
    ],
  },
];

export const CONSTRAINTS = [
  {
    title: "Hosting",
    body: "EU hosting by default. Region and provider are agreed with you before implementation starts, not decided after the fact.",
  },
  {
    title: "Access",
    body: "Access controls are scoped per project: who can see what, set and logged from day one.",
  },
  {
    title: "GDPR",
    body: "Retention, deletion, and processing basis are built into the schema up front, not added on after a request.",
  },
  {
    title: "AI Act boundary",
    body: "No automated decision with legal or similarly significant effect on a person. Where that boundary applies, the logic is deterministic code, not a model.",
  },
  {
    title: "Discretion",
    body: "Client details and internal builds stay covered by discretion unless you choose to be named.",
  },
];

export const DACH = [
  {
    label: "UWG §7",
    note: "Outreach ordered to the statutory sequencing window, not convenience.",
  },
  {
    label: "AML / KYC",
    note: "Source-of-Wealth and KYC discipline carried over from financial services work.",
  },
  { label: "EU hosting", note: "Data stays in-region unless you choose otherwise." },
  {
    label: "AI Act",
    note: "Deterministic code where a decision would have legal effect on a person, not a model.",
  },
  {
    label: "German-native delivery",
    note: "Native German speaker with deep DACH market experience.",
  },
];

export const ENGAGEMENT = [
  {
    id: "assessment",
    title: "Assessment",
    body: "A paid, fixed-scope review of the workflow and systems involved, ending in a written plan: what to build, what it connects to, what it costs to run.",
    in: [
      "Workflow and systems mapped end to end",
      "Written plan: what to build, what it connects to",
      "Fixed scope, fixed price",
    ],
    out: ["No code changes", "No infrastructure changes"],
    next: "You get the plan and decide whether to move to Build.",
  },
  {
    id: "build",
    title: "Build",
    body: "Fixed-scope delivery against the plan, deployed into the agreed environment, with documentation handed over at the end.",
    in: [
      "Delivery against the agreed plan",
      "Deployed into your agreed environment",
      "Documentation handed over at the end",
    ],
    out: ["No maintenance included", "No scope beyond the assessment plan"],
    next: "System goes live in your environment, documented and handed over.",
  },
  {
    id: "retain",
    title: "Retain",
    body: "A retainer for teams who want the same engineer on call as the system evolves and the systems around it change.",
    in: [
      "Same engineer on call as the system evolves",
      "Fixes and small changes as needed",
      "Priority response",
    ],
    out: ["Not a retainer for unrelated new features", "No fixed minimum hours"],
    next: "Month to month, cancel anytime.",
  },
];

export const FAQ = [
  {
    q: "Who actually does the work?",
    a: "I do. Anviq is an independent practice, not an agency with a rotating bench. The engineer you talk to in the assessment is the one who builds and deploys the system.",
  },
  {
    q: "Where is data hosted?",
    a: "Hosting region, access controls and data handling are agreed with you as part of the technical assessment, before implementation starts.",
  },
  {
    q: "Do I own what gets built?",
    a: "Yes. Code, configuration and documentation are handed over as part of delivery, per the agreed scope.",
  },
  {
    q: "How does a technical assessment start?",
    a: "Email a short description of the workflow you want automated or connected, and I will reply with scope and timing for the assessment.",
  },
];
