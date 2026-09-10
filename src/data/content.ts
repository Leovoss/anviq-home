export const WORK = [
  {
    title: "Bespoke AI agents",
    body: "Agents and automation built for a specific workflow you already have, not a generic template retrofitted to fit.",
  },
  {
    title: "Integration",
    body: "Connect the new agent to the systems you already run: scheduling to billing, CRM to operations, wherever the handoff currently breaks.",
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
    ],
  },
  {
    href: null,
    tag: "Multi-tenant SaaS",
    name: "LV Matching",
    body: "Construction bill-of-quantities matching for multiple tenants, with a chat-and-grid interface, EU-hosted auth, and data handling built for GDPR from the schema up.",
    domain: null,
    screenshot: null,
    files: [
      {
        name: "README.md",
        body: [
          "Bill-of-quantities matching for construction estimators, multi-tenant from the schema up. A chat interface sits next to the grid for quick corrections.",
          "EU-hosted authentication; tenant data is isolated at the database level, not just filtered in application code.",
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
    files: [
      {
        name: "README.md",
        body: [
          "Cold-outreach sending infrastructure built for the German market, where outreach compliance isn't optional.",
          "Deliverability tooling and legal sequencing sit inside the send pipeline, not as a separate checklist someone can skip.",
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
    ],
  },
];

export const ENGAGEMENT = [
  {
    title: "Technical assessment",
    body: "A paid, fixed-scope review of the workflow and systems involved, ending in a written plan: what to build, what it connects to, what it costs to run.",
  },
  {
    title: "Build & deploy",
    body: "Fixed-scope delivery against the plan, deployed into the agreed environment, with documentation handed over at the end.",
  },
  {
    title: "Ongoing maintenance",
    body: "A retainer for teams who want the same engineer on call as the system evolves and the systems around it change.",
    wide: true,
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
