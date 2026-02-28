require("dotenv").config();
const pool = require("./db");

const startups = [
  {
    name: "DataSift AI",
    tagline: "Real-time enterprise data intelligence for Fortune 500 teams",
    industry: "Data & Analytics",
    stage: "Series B",
    description: "DataSift AI provides real-time data pipeline orchestration and AI-powered analytics for enterprise teams. Trusted by 120+ Fortune 500 companies to process over 2TB of data daily.",
    upvotes: 18,
    early_access: false,
    deal_text: null,
  },
  {
    name: "SecureVault Pro",
    tagline: "Zero-trust security infrastructure for cloud-native enterprises",
    industry: "CyberSecurity",
    stage: "Series C",
    description: "SecureVault Pro delivers zero-trust network architecture, real-time threat detection, and compliance automation for enterprises operating in regulated industries.",
    upvotes: 24,
    early_access: false,
    deal_text: null,
  },
  {
    name: "FlowHR",
    tagline: "AI-powered HR automation platform for scaling teams",
    industry: "HR Tech",
    stage: "Series A",
    description: "FlowHR automates onboarding, performance reviews, payroll compliance, and workforce analytics using AI. Reduces HR overhead by 60% for companies between 100-2000 employees.",
    upvotes: 9,
    early_access: true,
    deal_text: "40% off annual plan for first 50 enterprise customers",
  },
  {
    name: "LogiChain",
    tagline: "Blockchain-powered supply chain transparency for global enterprises",
    industry: "Supply Chain",
    stage: "Series B",
    description: "LogiChain brings end-to-end supply chain visibility using distributed ledger technology. Integrates with SAP, Oracle, and 40+ ERP systems out of the box.",
    upvotes: 14,
    early_access: false,
    deal_text: null,
  },
  {
    name: "MedSync AI",
    tagline: "Clinical intelligence platform for hospitals and health networks",
    industry: "HealthTech",
    stage: "Series C",
    description: "MedSync AI processes clinical data in real-time to support diagnosis, reduce readmissions, and optimize resource allocation. FDA cleared and HIPAA compliant.",
    upvotes: 31,
    early_access: false,
    deal_text: null,
  },
  {
    name: "RevenueOS",
    tagline: "Unified revenue operations platform for B2B SaaS companies",
    industry: "FinTech",
    stage: "Series A",
    description: "RevenueOS unifies CRM, billing, forecasting, and commission management into a single revenue intelligence layer. Helps revenue teams close 35% more deals with AI-driven insights.",
    upvotes: 7,
    early_access: true,
    deal_text: "Free implementation + 3 months free for Series A companies",
  },
  {
    name: "CloudOps360",
    tagline: "Intelligent cloud cost optimization and DevOps automation",
    industry: "DevOps",
    stage: "Series B",
    description: "CloudOps360 uses ML to predict cloud spend, auto-scale infrastructure, and enforce security policies. Average customer saves 42% on cloud costs within 90 days.",
    upvotes: 19,
    early_access: false,
    deal_text: null,
  },
  {
    name: "LegalMind",
    tagline: "AI contract analysis and legal risk intelligence for enterprises",
    industry: "LegalTech",
    stage: "Series A",
    description: "LegalMind reviews contracts in seconds using fine-tuned LLMs trained on 10M+ legal documents. Reduces legal review time by 80% and flags risk clauses automatically.",
    upvotes: 11,
    early_access: true,
    deal_text: "60-day free trial + dedicated legal AI specialist",
  },
  {
    name: "EduScale",
    tagline: "Enterprise learning management powered by adaptive AI",
    industry: "EdTech",
    stage: "Series D",
    description: "EduScale delivers personalized learning paths for enterprise workforces using adaptive AI. Used by 200+ companies to upskill 500,000+ employees across 40 countries.",
    upvotes: 38,
    early_access: false,
    deal_text: null,
  },
  {
    name: "PropelCX",
    tagline: "AI customer experience platform built for enterprise scale",
    industry: "CX & Support",
    stage: "Series B",
    description: "PropelCX combines AI chat, sentiment analysis, and omnichannel routing to deliver enterprise-grade customer support. Reduces ticket resolution time by 55% with zero agent burnout.",
    upvotes: 16,
    early_access: false,
    deal_text: null,
  },
];

const reviewSets = [
  // DataSift AI - high performer
  [{ roi:5,scalability:5,security:4,comment:"Transformed our data operations. ROI was visible in 60 days." },
   { roi:4,scalability:5,security:5,comment:"Best in class scalability. Handles our peak loads without issues." },
   { roi:5,scalability:4,security:4,comment:"Strong product. Integration with our stack was smooth." }],
  // SecureVault Pro - top security
  [{ roi:4,scalability:4,security:5,comment:"Zero-trust implementation is the best we've evaluated." },
   { roi:5,scalability:5,security:5,comment:"Passed our enterprise security audit with flying colors." },
   { roi:4,scalability:5,security:5,comment:"Compliance automation alone saves us 20hrs/week." }],
  // FlowHR - emerging
  [{ roi:4,scalability:3,security:4,comment:"Great onboarding automation. Still maturing on scalability." },
   { roi:3,scalability:4,security:4,comment:"Promising product. Support team is very responsive." }],
  // LogiChain
  [{ roi:4,scalability:4,security:4,comment:"SAP integration worked first try. Visibility is excellent." },
   { roi:5,scalability:4,security:3,comment:"Massive ROI on supply chain visibility. Security could improve." },
   { roi:4,scalability:5,security:4,comment:"Handles our global logistics complexity well." }],
  // MedSync AI - leader
  [{ roi:5,scalability:5,security:5,comment:"FDA cleared and the clinical AI is genuinely impressive." },
   { roi:5,scalability:5,security:5,comment:"Reduced readmissions by 18% in first quarter. Remarkable." },
   { roi:4,scalability:5,security:5,comment:"HIPAA compliance was seamless. Strong integration layer." },
   { roi:5,scalability:4,security:5,comment:"Best clinical intelligence platform we've piloted." }],
  // RevenueOS - early stage
  [{ roi:4,scalability:3,security:3,comment:"Great concept, still building out enterprise features." }],
  // CloudOps360
  [{ roi:5,scalability:5,security:4,comment:"42% cost reduction claim is real. We hit 38% in 3 months." },
   { roi:5,scalability:5,security:4,comment:"Auto-scaling policies have been rock solid." },
   { roi:4,scalability:4,security:5,comment:"Security policy enforcement is excellent." }],
  // LegalMind
  [{ roi:5,scalability:4,security:4,comment:"80% faster contract review is not an exaggeration." },
   { roi:4,scalability:4,security:5,comment:"Risk flagging is accurate. Saved us from a bad clause last month." }],
  // EduScale - leader
  [{ roi:5,scalability:5,security:5,comment:"500k users and zero performance issues. Exceptional scale." },
   { roi:5,scalability:5,security:4,comment:"Adaptive learning paths have improved retention by 40%." },
   { roi:4,scalability:5,security:5,comment:"Best enterprise LMS we've deployed globally." },
   { roi:5,scalability:5,security:5,comment:"Series D growth is well deserved. Category leader." }],
  // PropelCX
  [{ roi:4,scalability:4,security:4,comment:"55% resolution time improvement is accurate in our case." },
   { roi:5,scalability:4,security:4,comment:"Omnichannel routing works beautifully. Agents love it." },
   { roi:4,scalability:5,security:4,comment:"Scales well during peak support periods." }],
];

async function seed() {
  try {
    console.log("🌱 Seeding EthAum marketplace...\n");

    for (let i = 0; i < startups.length; i++) {
      const s = startups[i];

      // Insert startup
      const result = await pool.query(
        `INSERT INTO startups (name, tagline, industry, stage, description, upvotes, early_access, deal_text)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [s.name, s.tagline, s.industry, s.stage, s.description, s.upvotes, s.early_access, s.deal_text]
      );
      const id = result.rows[0].id;

      // Insert reviews
      const reviews = reviewSets[i];
      for (const r of reviews) {
        const integration = Math.floor(Math.random() * 2) + 3; // 3-4
        await pool.query(
          `INSERT INTO reviews (startup_id, roi, scalability, security, integration, comment)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [id, r.roi, r.scalability || 4, r.security, integration, r.comment]
        );
      }

      console.log(`✅ ${s.name} — ${reviews.length} reviews, ${s.upvotes} upvotes`);
    }

    console.log("\n🚀 Seeding complete! 10 startups loaded.");
    console.log("Open http://localhost:5173 to see your marketplace.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed error:", err.message);
    process.exit(1);
  }
}

seed();