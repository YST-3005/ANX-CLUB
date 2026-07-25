export type Roadmap = {
  id: string;
  title: string;
  description: string;
  isPremium: boolean;
  url: string;
  steps?: { id: string; title: string }[];
};

export const ROADMAPS: Roadmap[] = [
  { 
    id: "web-dev", 
    title: "Full Stack Web Development", 
    description: "Learn frontend to backend and databases. Master React, Node.js, and system design.", 
    isPremium: false, 
    url: "https://roadmap.sh/full-stack",
    steps: [
      { id: "html", title: "HTML/CSS Basics" },
      { id: "js", title: "JavaScript Fundamentals" },
      { id: "react", title: "React & Component Architecture" },
      { id: "node", title: "Node.js & Express API" },
      { id: "db", title: "Database & ORMs (PostgreSQL/Prisma)" },
      { id: "deploy", title: "Deployment (Vercel/Render)" }
    ]
  },
  { 
    id: "ai-ml", 
    title: "Applied AI & ML", 
    description: "Build real world AI applications using LLMs, LangChain, and vector databases.", 
    isPremium: true, 
    url: "https://roadmap.sh/ai-data-scientist" 
  },
  { 
    id: "ui-ux", 
    title: "UI/UX Design", 
    description: "Master Figma and design principles to craft beautiful user experiences.", 
    isPremium: false, 
    url: "https://roadmap.sh/ux-design" 
  },
  { 
    id: "app-dev", 
    title: "Mobile App Development", 
    description: "Learn to build cross-platform mobile apps with React Native or Flutter.", 
    isPremium: false, 
    url: "https://roadmap.sh/react-native" 
  },
  { 
    id: "cloud-devops", 
    title: "Cloud & DevOps", 
    description: "Master AWS, Docker, Kubernetes, and CI/CD pipelines.", 
    isPremium: true, 
    url: "https://roadmap.sh/devops" 
  },
  { 
    id: "data-science", 
    title: "Data Science", 
    description: "Learn Python, pandas, machine learning algorithms, and data visualization.", 
    isPremium: true, 
    url: "https://roadmap.sh/data-analyst" 
  },
  { 
    id: "product", 
    title: "Product Management", 
    description: "Learn to manage and ship successful products from ideation to launch.", 
    isPremium: true, 
    url: "https://roadmap.sh/product-manager" 
  },
  {
    id: "backend",
    title: "Backend Development",
    description: "Deep dive into server-side programming, APIs, databases, and microservices architecture.",
    isPremium: false,
    url: "https://roadmap.sh/backend"
  },
  {
    id: "blockchain",
    title: "Blockchain / Web3",
    description: "Learn smart contracts, Solidity, Ethereum, and decentralized application (dApp) development.",
    isPremium: true,
    url: "https://roadmap.sh/blockchain"
  },
  {
    id: "cyber-security",
    title: "Cyber Security",
    description: "Master ethical hacking, network security, and secure coding practices.",
    isPremium: true,
    url: "https://roadmap.sh/cyber-security"
  },
  {
    id: "game-dev",
    title: "Game Development",
    description: "Build 2D and 3D games using Unity, Unreal Engine, and C++.",
    isPremium: false,
    url: "https://roadmap.sh/game-developer"
  },
  {
    id: "qa",
    title: "QA & Software Testing",
    description: "Learn manual testing, test automation (Selenium/Cypress), and continuous integration.",
    isPremium: false,
    url: "https://roadmap.sh/qa"
  }
];

export function getRoadmapById(id: string): Roadmap | undefined {
  return ROADMAPS.find(r => r.id === id);
}
