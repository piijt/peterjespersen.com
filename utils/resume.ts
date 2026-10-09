// Resume content (from CV_Peter_Hojer_Jespersen, Oct 2026). Phone number and personal email are deliberately
// left out of the public site; contact goes through pj@peterjespersen.com.

export interface Role {
  id: string;
  title: string;
  company: string;
  url?: string;
  period: string;
  place: string;
  note?: string;
  summary?: string;
  bullets: string[];
  stack: string[];
  /** accent for the timeline node */
  color: "cyan" | "mint" | "gold" | "violet" | "pink";
}

export const PROFILE =
  "Adaptable fullstack engineer with over six years of professional experience, and hands-on coding going back to 2016. " +
  "At ease switching between languages and stacks as a project demands, and not tied to any one corner of the stack. " +
  "Motivated by solving problems and building products end to end, quick to pick up new technologies, with a consistent " +
  "track record of shipping reliable software under tight deadlines.";

export const HIGHLIGHTS = [
  { value: "6+", label: "years professional" },
  { value: "2016", label: "writing code since" },
  { value: "5,000+", label: "field panels updated over the air" },
  { value: "10+", label: "services in one data pipeline" },
];

export const ROLES: Role[] = [
  {
    id: "makin3d",
    title: "Software Engineer",
    company: "Makin' 3D",
    period: "Dec 2023 – Present",
    place: "Odense, Denmark · Full-time",
    note: "Continuation of the Kinematic role after Makin' 3D's acquisition of Kinematic ApS",
    summary: "Platform engineering and distributed-systems development on a cloud platform.",
    bullets: [
      "Built an orchestration layer for containerised (Docker) applications, owning how platform services are deployed and run.",
      "Designed a near-real-time position-broadcast system: each machine publishes its location on a spatial grid to nearby machines within range, giving every device live awareness of surrounding equipment to calculate operating constraints on the fly.",
      "Built a custom release/versioning tool that orchestrates over-the-air rollout of the Android application to 5,000+ field panels simultaneously.",
      "Refactored and optimised legacy C++ applications, migrating them to C#.",
      "Refactored the custom C++ communication protocols underpinning the end-to-end Android application.",
    ],
    stack: ["C++", "C#", "Docker", "Distributed systems", "Android OTA", "Platform engineering"],
    color: "cyan",
  },
  {
    id: "kinematic",
    title: "Software Engineer",
    company: "Kinematic ApS",
    period: "Dec 2023 – Sep 2025",
    place: "Denmark · Full-time",
    summary: "Full-stack development on a cloud platform managing machines, projects and operations in the construction industry.",
    bullets: ["Refactored a complex PHP/C++/Node.js monolith to a standalone C++ backend with a Vue.js frontend."],
    stack: ["C++", "Vue 3", "Node.js", "PHP"],
    color: "violet",
  },
  {
    id: "trade-raid",
    title: "Software Engineer (Founding Developer)",
    company: "TRADE-RAID",
    url: "https://trade-raid.com",
    period: "Aug 2022 – Nov 2023",
    place: "Greater Copenhagen · Full-time",
    bullets: [
      "Led a backend refactor from a legacy PHP/PostgreSQL system to a Node.js/MongoDB stack.",
      "Built a real-time Steam trading service (WebSocket) and a pricing-optimisation algorithm from third-party and historical transaction data; added Stripe/OAuth e-commerce and CI/CD-integrated testing (Chai.js) on AWS EC2.",
    ],
    stack: ["Node.js", "MongoDB", "WebSocket", "Stripe", "AWS EC2", "Vue"],
    color: "gold",
  },
  {
    id: "cavea",
    title: "Software Engineer",
    company: "CAVEA.IO",
    url: "https://cavea.io",
    period: "Mar 2020 – Sep 2022",
    place: "Odense · Full-time",
    bullets: [
      "Built a high-frequency data pipeline using Kafka, Spark and Elasticsearch, and designed REST APIs and microservices for an analytics platform aggregating data across 10+ services.",
      "Ran large-scale data mining and optimised MongoDB/PostgreSQL (sharding, indexing); built the Partner Dashboard frontend (Vue.js).",
    ],
    stack: ["Kafka", "Spark", "Elasticsearch", "MongoDB", "PostgreSQL", "Vue"],
    color: "mint",
  },
];

export const SKILLS = [
  { group: "Languages", items: ["C++", "C#", "TypeScript", "JavaScript / Node.js"] },
  {
    group: "Platform & Infrastructure",
    items: ["Docker", "Docker Swarm", "Kubernetes", "Platform engineering", "Distributed systems", "Microservices", "CI/CD", "GitHub Actions", "AWS", "GCP"],
  },
  { group: "Data & Backend", items: ["Kafka", "MongoDB", "PostgreSQL", "REST APIs", "gRPC", "Near-real-time / streaming"] },
  { group: "Frontend", items: ["Vue 3 (~4 years)", "React", "Vitest", "Playwright"] },
];

export const AI_SKILL =
  "Claude Code as primary tool, orchestrating agentic coding workflows as a force multiplier — always in the pilot's seat and owning architecture, quality and the code.";

export const EDUCATION = [
  {
    degree: "Bachelor of Web Development",
    school: "International Business School Academy (IBA), Kolding",
    period: "2018 – 2020",
    detail: "Bachelor thesis on blockchain (“Start-off, Ethereum Blockchain”), grade 10 · OOP, databases, algorithms, APIs",
  },
  {
    degree: "AP Degree, Multimedia Design",
    school: "International Business School Academy (IBA), Kolding",
    period: "2016 – 2018",
    detail: "",
  },
];

export const LANGUAGES = [
  { name: "Danish", level: "Native" },
  { name: "English", level: "Fluent, professional working proficiency" },
];
