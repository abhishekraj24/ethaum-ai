require("dotenv").config();
const express = require("express");
const cors = require("cors");
const pool = require("./db");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function askGroq(prompt, system = "You are an enterprise SaaS analyst.", maxTokens = 1024) {
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: maxTokens,
  });
  return completion.choices[0].message.content;
}

/* ── INIT TABLES ── */
app.get("/init", async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS startups (
        id SERIAL PRIMARY KEY, name VARCHAR(255), tagline TEXT,
        industry VARCHAR(100), stage VARCHAR(50), description TEXT,
        upvotes INTEGER DEFAULT 0, early_access BOOLEAN DEFAULT false,
        deal_text TEXT DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY, startup_id INTEGER REFERENCES startups(id) ON DELETE CASCADE,
        roi INTEGER, scalability INTEGER, security INTEGER, integration INTEGER,
        comment TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS eci_history (
        id SERIAL PRIMARY KEY, startup_id INTEGER REFERENCES startups(id) ON DELETE CASCADE,
        eci NUMERIC, score NUMERIC, upvotes INTEGER, review_count INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send("✅ Tables created");
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── MIGRATE ── */
app.get("/migrate", async (req, res) => {
  try {
    await pool.query(`
      ALTER TABLE startups ADD COLUMN IF NOT EXISTS early_access BOOLEAN DEFAULT false;
      ALTER TABLE startups ADD COLUMN IF NOT EXISTS deal_text TEXT DEFAULT NULL;
      CREATE TABLE IF NOT EXISTS eci_history (
        id SERIAL PRIMARY KEY, startup_id INTEGER REFERENCES startups(id) ON DELETE CASCADE,
        eci NUMERIC, score NUMERIC, upvotes INTEGER, review_count INTEGER,
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    res.send("✅ Migration complete");
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── GET ALL STARTUPS ── */
app.get("/startups", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, COUNT(r.id)::int AS review_count
      FROM startups s LEFT JOIN reviews r ON r.startup_id = s.id
      GROUP BY s.id ORDER BY s.upvotes DESC, s.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── TRENDING ── */
app.get("/startups/trending", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.*, COUNT(r.id)::int AS review_count,
        (s.upvotes * 2 + COUNT(r.id) * 5) AS trending_score
      FROM startups s LEFT JOIN reviews r ON r.startup_id = s.id
      GROUP BY s.id ORDER BY trending_score DESC LIMIT 5
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── AI: INTELLIGENCE FEED ── */
app.get("/ai/intelligence-feed", async (req, res) => {
  try {
    const startupsRes = await pool.query(`
      SELECT s.name, s.industry, s.stage, s.upvotes, COUNT(r.id)::int AS review_count,
        COALESCE(AVG(r.roi),0) AS avg_roi, COALESCE(AVG(r.scalability),0) AS avg_scalability
      FROM startups s LEFT JOIN reviews r ON r.startup_id = s.id
      GROUP BY s.id ORDER BY s.upvotes DESC LIMIT 10
    `);
    const startups = startupsRes.rows;
    if (startups.length === 0) return res.json({ feed: "No startups listed yet. Add startups to generate market intelligence." });

    const prompt = `You are EthAum's AI market intelligence engine. Analyze this SaaS marketplace data and generate a daily intelligence briefing:

${startups.map(s => `${s.name} (${s.industry}, ${s.stage}) — ${s.upvotes} upvotes, ${s.review_count} reviews, avg ROI: ${Number(s.avg_roi).toFixed(1)}/5`).join('\n')}

Write a concise market intelligence briefing with:
## 🔥 Hot Sectors Today
## 📈 Momentum Leaders
## ⚠️ Market Watch
## 💡 Investment Signal

Keep it under 200 words. Be specific with data. Write like a Bloomberg terminal alert.`;

    const feed = await askGroq(prompt, "You are a senior market intelligence analyst at a top VC firm.", 600);
    res.json({ feed, generatedAt: new Date().toISOString() });
  } catch (err) { res.status(500).json({ error: "Feed failed: " + err.message }); }
});

/* ── AI: COMPARE (POST) ── */
app.post("/ai/compare", async (req, res) => {
  const { id1, id2 } = req.body;
  try {
    const [s1, s2, r1, r2] = await Promise.all([
      pool.query("SELECT * FROM startups WHERE id = $1", [id1]),
      pool.query("SELECT * FROM startups WHERE id = $1", [id2]),
      pool.query("SELECT * FROM reviews WHERE startup_id = $1", [id1]),
      pool.query("SELECT * FROM reviews WHERE startup_id = $1", [id2]),
    ]);
    if (!s1.rows[0] || !s2.rows[0]) return res.status(404).json({ error: "Startup not found" });
    const avg = (rows, field) => rows.length ? (rows.reduce((s, r) => s + Number(r[field]), 0) / rows.length).toFixed(1) : "N/A";
    const A = s1.rows[0], B = s2.rows[0];
    const prompt = `Compare these two enterprise SaaS startups head-to-head:

STARTUP A: ${A.name} | ${A.industry} | ${A.stage} | Upvotes: ${A.upvotes} | Reviews: ${r1.rows.length}
ROI: ${avg(r1.rows,'roi')}/5 | Scalability: ${avg(r1.rows,'scalability')}/5 | Security: ${avg(r1.rows,'security')}/5 | Integration: ${avg(r1.rows,'integration')}/5

STARTUP B: ${B.name} | ${B.industry} | ${B.stage} | Upvotes: ${B.upvotes} | Reviews: ${r2.rows.length}
ROI: ${avg(r2.rows,'roi')}/5 | Scalability: ${avg(r2.rows,'scalability')}/5 | Security: ${avg(r2.rows,'security')}/5 | Integration: ${avg(r2.rows,'integration')}/5

## Head-to-Head Summary
## Where ${A.name} Wins
## Where ${B.name} Wins
## Enterprise Buyer Recommendation
## Final Verdict`;

    const analysis = await askGroq(prompt, "You are a Gartner-level enterprise technology analyst.");
    res.json({ analysis, startup1: A.name, startup2: B.name });
  } catch (err) { res.status(500).json({ error: "Compare failed: " + err.message }); }
});

/* ── AI: AUTO-COMPARE (nearest competitor) ── */
app.get("/startups/:id/auto-compare", async (req, res) => {
  const id = req.params.id;
  try {
    const startupRes = await pool.query("SELECT * FROM startups WHERE id = $1", [id]);
    const startup = startupRes.rows[0];
    if (!startup) return res.status(404).json({ error: "Not found" });

    // Find nearest competitor (same industry or stage, different id)
    const competitorRes = await pool.query(`
      SELECT * FROM startups 
      WHERE id != $1 AND (industry = $2 OR stage = $3)
      ORDER BY upvotes DESC LIMIT 1
    `, [id, startup.industry, startup.stage]);

    // Fallback: any other startup
    const fallbackRes = competitorRes.rows.length === 0
      ? await pool.query("SELECT * FROM startups WHERE id != $1 ORDER BY upvotes DESC LIMIT 1", [id])
      : competitorRes;

    const competitor = fallbackRes.rows[0];
    if (!competitor) return res.json({ analysis: "No competitor found yet. Add more startups to enable auto-comparison.", startup1: startup.name, startup2: null });

    const [r1, r2] = await Promise.all([
      pool.query("SELECT * FROM reviews WHERE startup_id = $1", [id]),
      pool.query("SELECT * FROM reviews WHERE startup_id = $1", [competitor.id]),
    ]);
    const avg = (rows, field) => rows.length ? (rows.reduce((s, r) => s + Number(r[field]), 0) / rows.length).toFixed(1) : "N/A";

    const prompt = `Compare these two enterprise SaaS startups:

${startup.name} | ${startup.industry} | ${startup.stage} | Upvotes: ${startup.upvotes} | Reviews: ${r1.rows.length}
ROI: ${avg(r1.rows,'roi')}/5 | Scalability: ${avg(r1.rows,'scalability')}/5 | Security: ${avg(r1.rows,'security')}/5

vs

${competitor.name} | ${competitor.industry} | ${competitor.stage} | Upvotes: ${competitor.upvotes} | Reviews: ${r2.rows.length}
ROI: ${avg(r2.rows,'roi')}/5 | Scalability: ${avg(r2.rows,'scalability')}/5 | Security: ${avg(r2.rows,'security')}/5

Give a 3-sentence competitive verdict. Who wins and why? Be direct.`;

    const analysis = await askGroq(prompt, "You are a Gartner enterprise analyst. Be direct and concise.", 300);
    res.json({ analysis, startup1: startup.name, startup2: competitor.name });
  } catch (err) { res.status(500).json({ error: "Auto-compare failed: " + err.message }); }
});

/* ── AI: CHAT ── */
app.post("/ai/chat", async (req, res) => {
  const { startupId, message, history = [] } = req.body;
  try {
    let context = "";
    if (startupId) {
      const sr = await pool.query("SELECT * FROM startups WHERE id = $1", [startupId]);
      const rr = await pool.query("SELECT * FROM reviews WHERE startup_id = $1", [startupId]);
      const s = sr.rows[0];
      if (s) context = `\nContext: ${s.name} | ${s.industry} | ${s.stage} | ${s.upvotes} upvotes | ${rr.rows.length} reviews.`;
    }
    const messages = [
      { role: "system", content: `You are EthAum AI — expert enterprise SaaS analyst. Be concise and professional.${context}` },
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: "user", content: message }
    ];
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", messages, temperature: 0.7, max_tokens: 512,
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (err) { res.status(500).json({ error: "Chat failed: " + err.message }); }
});

/* ── CREATE STARTUP ── */
app.post("/startups", async (req, res) => {
  const { name, tagline, industry, stage, description, early_access, deal_text } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO startups (name, tagline, industry, stage, description, early_access, deal_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, tagline, industry, stage, description, early_access || false, deal_text || null]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── UPVOTE ── */
app.post("/startups/:id/upvote", async (req, res) => {
  try {
    await pool.query("UPDATE startups SET upvotes = upvotes + 1 WHERE id = $1", [req.params.id]);
    res.json({ message: "Upvoted" });
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── ADD REVIEW ── */
app.post("/reviews", async (req, res) => {
  const { startup_id, roi, scalability, security, integration, comment } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO reviews (startup_id, roi, scalability, security, integration, comment)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [startup_id, roi, scalability, security, integration, comment]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── SCORE + QUADRANT + SAVE HISTORY ── */
app.get("/startups/:id/score", async (req, res) => {
  const id = req.params.id;
  try {
    const reviewsRes = await pool.query(`SELECT roi, scalability, security, integration FROM reviews WHERE startup_id = $1`, [id]);
    const startupRes = await pool.query("SELECT upvotes FROM startups WHERE id = $1", [id]);
    if (!startupRes.rows[0]) return res.status(404).json({ error: "Not found" });

    const upvotes = startupRes.rows[0].upvotes || 0;
    const reviews = reviewsRes.rows;

    if (reviews.length === 0) {
      return res.json({ score: 0, confidenceIndex: 0, adoptionMomentum: upvotes, reviewCount: 0, marketPosition: "Emerging", quadrantEmoji: "🌱", insight: "No enterprise reviews yet.", trendingScore: upvotes * 2 });
    }

    let total = { roi: 0, scalability: 0, security: 0, integration: 0 };
    reviews.forEach(r => { total.roi += Number(r.roi); total.scalability += Number(r.scalability); total.security += Number(r.security); total.integration += Number(r.integration); });
    const count = reviews.length;
    const baseScore = ((total.roi/count)/5)*25 + ((total.scalability/count)/5)*25 + ((total.security/count)/5)*25 + ((total.integration/count)/5)*25;
    const adoptionBoost = Math.min(upvotes * 1.5, 15);
    const reviewConfidence = Math.min(count * 2, 10);
    const confidenceIndex = Math.min(baseScore + adoptionBoost + reviewConfidence, 100);
    const trendingScore = upvotes * 2 + count * 5;

    let marketPosition, quadrantEmoji;
    if (confidenceIndex >= 70 && upvotes >= 5)     { marketPosition = "Leader";     quadrantEmoji = "🏆"; }
    else if (confidenceIndex >= 70 && upvotes < 5) { marketPosition = "Visionary";  quadrantEmoji = "🔭"; }
    else if (confidenceIndex < 70 && upvotes >= 5) { marketPosition = "Challenger"; quadrantEmoji = "⚡"; }
    else                                            { marketPosition = "Emerging";   quadrantEmoji = "🌱"; }

    const insight = confidenceIndex >= 80 ? "High enterprise confidence. Strong performance and market traction."
      : confidenceIndex >= 60 ? "Moderate enterprise confidence. Growing adoption momentum."
      : "Emerging enterprise profile. Requires validation and traction.";

    // Save to ECI history
    pool.query(`INSERT INTO eci_history (startup_id, eci, score, upvotes, review_count) VALUES ($1,$2,$3,$4,$5)`,
      [id, confidenceIndex.toFixed(0), baseScore.toFixed(0), upvotes, count]).catch(() => {});

    res.json({ score: baseScore.toFixed(0), confidenceIndex: confidenceIndex.toFixed(0), adoptionMomentum: upvotes, reviewCount: count, marketPosition, quadrantEmoji, trendingScore, insight });
  } catch (err) { res.status(500).json({ error: "Scoring failed: " + err.message }); }
});

/* ── ECI HISTORY ── */
app.get("/startups/:id/eci-history", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT eci, score, upvotes, review_count, recorded_at
      FROM eci_history WHERE startup_id = $1
      ORDER BY recorded_at ASC LIMIT 20
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: "History failed: " + err.message }); }
});

/* ── AI SUMMARY ── */
app.get("/startups/:id/ai-summary", async (req, res) => {
  try {
    const startupRes = await pool.query("SELECT * FROM startups WHERE id = $1", [req.params.id]);
    const reviewsRes = await pool.query("SELECT * FROM reviews WHERE startup_id = $1", [req.params.id]);
    const startup = startupRes.rows[0];
    if (!startup) return res.status(404).json({ error: "Not found" });
    if (reviewsRes.rows.length === 0) return res.json({ summary: "No reviews yet to summarize." });
    const reviewText = reviewsRes.rows.map((r, i) =>
      `Review ${i+1}: ROI=${r.roi}/5, Scalability=${r.scalability}/5, Security=${r.security}/5, Integration=${r.integration}/5. "${r.comment || 'No comment'}"`
    ).join("\n");
    const summary = await askGroq(
      `Summarize reviews for "${startup.name}" (${startup.industry}) in 2-3 sentences. Highlight strengths and concerns.\n\n${reviewText}`,
      "You are a senior enterprise analyst writing for C-suite executives.", 300
    );
    res.json({ summary });
  } catch (err) { res.status(500).json({ error: "Summary failed: " + err.message }); }
});

/* ── DUE DILIGENCE ── */
app.get("/startups/:id/due-diligence", async (req, res) => {
  try {
    const startupRes = await pool.query("SELECT * FROM startups WHERE id = $1", [req.params.id]);
    const reviewsRes = await pool.query("SELECT * FROM reviews WHERE startup_id = $1", [req.params.id]);
    const startup = startupRes.rows[0];
    if (!startup) return res.status(404).json({ error: "Not found" });
    const reviews = reviewsRes.rows;
    const avg = f => reviews.length ? (reviews.reduce((s,r) => s + Number(r[f]), 0) / reviews.length).toFixed(1) : "N/A";
    const report = await askGroq(
      `Generate investor due diligence for ${startup.name} (${startup.industry}, ${startup.stage}).
Tagline: ${startup.tagline} | Upvotes: ${startup.upvotes} | Reviews: ${reviews.length}
Scores: ROI ${avg('roi')}/5, Scalability ${avg('scalability')}/5, Security ${avg('security')}/5, Integration ${avg('integration')}/5

## Executive Summary
## Market Opportunity Assessment  
## Product & Technology Evaluation
## Risk Factors
## Investment Recommendation`,
      "You are a VC analyst writing investor due diligence reports."
    );
    res.json({ report, startup: startup.name });
  } catch (err) { res.status(500).json({ error: "Report failed: " + err.message }); }
});

/* ── UPDATE DEAL ── */
app.patch("/startups/:id/deal", async (req, res) => {
  const { early_access, deal_text } = req.body;
  try {
    const result = await pool.query(`UPDATE startups SET early_access=$1, deal_text=$2 WHERE id=$3 RETURNING *`, [early_access, deal_text, req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).send("Error: " + err.message); }
});

/* ── START ── */
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 EthAum AI Marketplace running on port ${PORT}`);
  console.log(`Groq API Key loaded: ${process.env.GROQ_API_KEY ? "YES ✅" : "NO ❌ — check .env!"}`);
});