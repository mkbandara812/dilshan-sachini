const express = require("express");
const fs       = require("fs");
const path     = require("path");

const app       = express();
const PORT      = process.env.PORT || 3000;
const RSVP_FILE = path.join(__dirname, "rsvps.json");

// ── Middleware ──────────────────────────────────────────────
app.use(express.json({ limit: "20kb" }));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.static(path.join(__dirname, "public")));

// ── Ensure RSVP file exists ─────────────────────────────────
if (!fs.existsSync(RSVP_FILE)) {
  fs.writeFileSync(RSVP_FILE, JSON.stringify([], null, 2), "utf8");
}

// ── Simple in-memory rate limiter ───────────────────────────
const rateLimitMap = new Map(); // ip → { count, resetAt }
const RATE_LIMIT     = 5;             // max submissions
const RATE_WINDOW_MS = 15 * 60 * 1000; // per 15 minutes

function isRateLimited(ip) {
  const now   = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT) return true;
  return false;
}

// Clean up old entries every 30 minutes
setInterval(() => {
  const now = Date.now();
  rateLimitMap.forEach((v, k) => { if (now > v.resetAt) rateLimitMap.delete(k); });
}, 30 * 60 * 1000);

// ── Helper: sanitise string ─────────────────────────────────
function sanitise(str, maxLen = 200) {
  if (typeof str !== "string") return "";
  return str.trim().slice(0, maxLen);
}

// ── POST /api/rsvp ──────────────────────────────────────────
app.post("/api/rsvp", (req, res) => {
  try {
    const ip = req.ip || req.connection.remoteAddress || "unknown";

    if (isRateLimited(ip)) {
      return res.status(429).json({
        success: false,
        message: "Too many submissions. Please try again later.",
      });
    }

    const name     = sanitise(req.body.name,     80);
    const phone    = sanitise(req.body.phone,     20);
    const guests   = sanitise(req.body.guests,    4) || "1";
    const attending= sanitise(req.body.attending, 4);
    const message  = sanitise(req.body.message,  500);

    // Required fields
    if (!name || !phone || !attending) {
      return res.status(400).json({
        success: false,
        message: "Please fill in all required fields.",
      });
    }

    // Valid attending value
    if (!["Yes", "No"].includes(attending)) {
      return res.status(400).json({
        success: false,
        message: "Invalid attendance value.",
      });
    }

    // Phone must contain at least 9 digits
    if (phone.replace(/\D/g, "").length < 9) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number.",
      });
    }

    // Guests must be a number 1–10
    const guestsNum = parseInt(guests, 10);
    if (isNaN(guestsNum) || guestsNum < 1 || guestsNum > 10) {
      return res.status(400).json({
        success: false,
        message: "Number of guests must be between 1 and 10.",
      });
    }

    // Read, check duplicate by phone, write
    const existing = JSON.parse(fs.readFileSync(RSVP_FILE, "utf8"));

    const duplicate = existing.find(
      r => r.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")
    );
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: `We already have an RSVP from ${duplicate.name}. Thank you!`,
      });
    }

    const newRsvp = {
      id:        Date.now(),
      name,
      phone,
      guests:    String(guestsNum),
      attending,
      message,
      createdAt: new Date().toISOString(),
    };

    existing.push(newRsvp);
    fs.writeFileSync(RSVP_FILE, JSON.stringify(existing, null, 2), "utf8");

    return res.json({
      success: true,
      message: "Thank you! Your RSVP has been received. We look forward to seeing you!",
    });

  } catch (err) {
    console.error("[RSVP Error]", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again.",
    });
  }
});

// ── GET /api/rsvps (Admin view) ─────────────────────────────
app.get("/api/rsvps", (req, res) => {
  try {
    const data = JSON.parse(fs.readFileSync(RSVP_FILE, "utf8"));
    const summary = {
      total:       data.length,
      attending:   data.filter(r => r.attending === "Yes").length,
      notAttending:data.filter(r => r.attending === "No").length,
      totalGuests: data.filter(r => r.attending === "Yes")
                       .reduce((sum, r) => sum + parseInt(r.guests || 1, 10), 0),
      entries: data,
    };
    res.json(summary);
  } catch (err) {
    console.error("[RSVP Read Error]", err);
    res.status(500).json({ success: false, message: "Failed to read RSVPs." });
  }
});

// ── 404 fallback ────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).send("Not found");
});

// ── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  🌸 Wedding Invitation Server`);
  console.log(`  ➜ Local: http://localhost:${PORT}\n`);
});
