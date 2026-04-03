/* ============================================================
   WEDDING INVITATION — script.js
   ============================================================ */

// ── DOM ────────────────────────────────────────────────────
const openingScreen  = document.getElementById("openingScreen");
const mainContent    = document.getElementById("mainContent");
const envelope       = document.getElementById("envelope");
const music          = document.getElementById("bgMusic");
const form           = document.getElementById("rsvpForm");
const formMessage    = document.getElementById("formMessage");
const musicToggle    = document.getElementById("musicToggle");
const petalsContainer= document.getElementById("petalsContainer");
const particleCanvas = document.getElementById("particleCanvas");

// ── STATE ──────────────────────────────────────────────────
const WEDDING_DATE = new Date(2026, 4, 17, 10, 0, 0).getTime();
let invitationOpened = false;
let musicMuted       = false;
let prevValues       = { days: "", hours: "", minutes: "", seconds: "" };

// ── BODY LOCK ─────────────────────────────────────────────
document.body.classList.add("no-scroll");

/* ==========================================================
   PARTICLE CANVAS (Opening Screen)
   ========================================================= */
let ctx, particles = [], rafId;

function initParticles() {
  ctx = particleCanvas.getContext("2d");
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });
  buildParticles();
  tickParticles();
}

function resizeCanvas() {
  particleCanvas.width  = window.innerWidth;
  particleCanvas.height = window.innerHeight;
}

function buildParticles() {
  particles = [];
  const count = Math.min(60, Math.floor(window.innerWidth / 14));
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.3,
      vy: Math.random() * 0.35 + 0.12,
      drift: (Math.random() - 0.5) * 0.55,
      angle: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.45 + 0.12,
      pulse: Math.random() * 0.025 + 0.008,
      offset: Math.random() * Math.PI * 2,
      gold: Math.random() > 0.5,
    });
  }
}

function tickParticles() {
  if (!ctx) return;
  ctx.clearRect(0, 0, particleCanvas.width, particleCanvas.height);
  const now = Date.now() / 1000;

  particles.forEach(p => {
    p.y -= p.vy;
    p.x += Math.sin(p.angle + now * 0.28) * p.drift;
    p.angle += 0.005;
    if (p.y < -8) { p.y = particleCanvas.height + 8; p.x = Math.random() * particleCanvas.width; }

    const alpha = p.opacity * (0.68 + 0.32 * Math.sin(now * p.pulse * 60 + p.offset));
    const color = p.gold ? `rgba(252,215,140,${alpha})` : `rgba(240,168,192,${alpha})`;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  });

  rafId = requestAnimationFrame(tickParticles);
}

function stopParticles() {
  cancelAnimationFrame(rafId);
}

/* ==========================================================
   FLOATING PETALS (Main Page)
   ========================================================= */
const PETAL_COLORS = [
  "rgba(255,210,195,0.72)",
  "rgba(255,228,215,0.62)",
  "rgba(255,200,210,0.68)",
  "rgba(255,222,230,0.58)",
  "rgba(242,212,172,0.58)",
];

function spawnPetal() {
  const el    = document.createElement("div");
  el.className = "petal";
  const dur   = Math.random() * 13 + 10;
  const delay = Math.random() * 2;
  const size  = Math.random() * 9 + 8;
  const left  = Math.random() * 100;
  const color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
  const br    = Math.random() > 0.5 ? "50% 0 50% 0" : "50% 50% 0 50%";

  Object.assign(el.style, {
    left: `${left}%`,
    width:  `${size}px`,
    height: `${size * 1.3}px`,
    background: color,
    borderRadius: br,
    animationDuration: `${dur}s`,
    animationDelay: `${delay}s`,
    filter: `blur(${(Math.random() * 0.5).toFixed(1)}px)`,
  });

  petalsContainer.appendChild(el);
  setTimeout(() => el.remove(), (dur + delay + 1) * 1000);
}

function startPetals() {
  // Initial burst
  for (let i = 0; i < 14; i++) setTimeout(spawnPetal, i * 500);
  // Continuous drizzle
  setInterval(spawnPetal, 2400);
}

/* ==========================================================
   OPEN INVITATION
   ========================================================= */
function openInvitation() {
  if (invitationOpened) return;
  invitationOpened = true;

  openingScreen.classList.add("opened");
  document.body.classList.remove("no-scroll");

  // Play music after a short delay
  setTimeout(() => {
    music.volume = 0;
    music.play().catch(() => {});
    fadeInMusic();
  }, 280);

  // Fade out opening screen
  setTimeout(() => {
    openingScreen.style.opacity = "0";
    openingScreen.style.pointerEvents = "none";
    mainContent.classList.remove("hidden");

    setTimeout(() => {
      openingScreen.style.display = "none";
      stopParticles();
    }, 900);

    // Show music button
    setTimeout(() => musicToggle.classList.add("visible"), 1200);

    // Start petals & init page features
    startPetals();
    initScrollReveal();
    startCountdown();
  }, 1300);
}

function fadeInMusic() {
  if (music.volume < 0.85) {
    music.volume = Math.min(music.volume + 0.04, 0.85);
    setTimeout(fadeInMusic, 160);
  }
}

// Envelope events
envelope.addEventListener("click", openInvitation);
envelope.addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openInvitation(); }
});

/* ==========================================================
   MUSIC TOGGLE
   ========================================================= */
const iconOn  = document.getElementById("musicIconOn");
const iconOff = document.getElementById("musicIconOff");

musicToggle.addEventListener("click", () => {
  musicMuted = !musicMuted;
  music.muted = musicMuted;
  musicToggle.classList.toggle("muted", musicMuted);
  iconOn.style.display  = musicMuted ? "none"  : "block";
  iconOff.style.display = musicMuted ? "block" : "none";
  musicToggle.setAttribute("aria-label", musicMuted ? "Unmute music" : "Mute music");
});

/* ==========================================================
   COUNTDOWN
   ========================================================= */
function startCountdown() {
  updateCountdown();
  setInterval(updateCountdown, 1000);
}

function updateCountdown() {
  const distance = WEDDING_DATE - Date.now();
  const grid     = document.getElementById("countdownGrid");
  const msg      = document.getElementById("weddingDayMsg");

  if (distance <= 0) {
    grid.classList.add("hidden");
    msg.classList.remove("hidden");
    return;
  }

  const d = Math.floor(distance / 86400000);
  const h = Math.floor((distance % 86400000) / 3600000);
  const m = Math.floor((distance % 3600000)  / 60000);
  const s = Math.floor((distance % 60000)    / 1000);

  const vals = {
    days:    String(d).padStart(2, "0"),
    hours:   String(h).padStart(2, "0"),
    minutes: String(m).padStart(2, "0"),
    seconds: String(s).padStart(2, "0"),
  };

  Object.entries(vals).forEach(([key, val]) => {
    if (val !== prevValues[key]) {
      const el = document.getElementById(key);
      el.classList.remove("flip");
      void el.offsetWidth; // force reflow
      el.classList.add("flip");
      el.textContent = val;
      prevValues[key] = val;
    }
  });
}

/* ==========================================================
   SCROLL REVEAL (IntersectionObserver)
   ========================================================= */
function initScrollReveal() {
  const els = document.querySelectorAll(".reveal-up");
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.11, rootMargin: "0px 0px -55px 0px" });

  els.forEach(el => obs.observe(el));
}

/* ==========================================================
   RSVP FORM
   ========================================================= */
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = document.getElementById("submitBtn");
  const btnText   = document.getElementById("btnText");

  // Basic client-side validation
  const name     = form.querySelector("[name='name']").value.trim();
  const phone    = form.querySelector("[name='phone']").value.trim();
  const attending= form.querySelector("[name='attending']").value;

  if (!name || !phone || !attending) {
    showFormMsg("Please fill in all required fields.", "#f08888");
    return;
  }

  if (phone.replace(/\D/g, "").length < 9) {
    showFormMsg("Please enter a valid phone number.", "#f08888");
    return;
  }

  // Loading state
  submitBtn.disabled = true;
  btnText.textContent = "Sending…";
  formMessage.textContent = "";

  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const res = await fetch("https://script.google.com/macros/s/AKfycbyoLTR4suveah-DF_q1NVhtmRkvKlwfL-iBowkLqWkkctU_J4CaR3sM-Vua25IdfiDz/exec", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(data),
    });

    // When mode is "no-cors", we can't read the response properly, but if fetch resolves, it means it was sent
    showFormMsg("🎉 Thank you! Your RSVP has been received. We look forward to seeing you!", "#82e8b0");
    form.reset();
    launchConfetti();
  } catch {
    showFormMsg("Network error. Please check your connection and try again.", "#f08888");
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = "Send RSVP";
  }
});

function showFormMsg(text, color) {
  formMessage.textContent = text;
  formMessage.style.color = color;
}

/* ==========================================================
   CONFETTI (RSVP success)
   ========================================================= */
function launchConfetti() {
  if (typeof confetti === "undefined") return;
  const colors = ["#f0cb78", "#f5d88e", "#ffa5bb", "#ffffff", "#ffe0a0"];
  confetti({ particleCount: 100, spread: 70, origin: { y: 0.7 }, colors });
  setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.6 }, colors }), 400);
}

/* ==========================================================
   INIT PARTICLES ON LOAD
   ========================================================= */
initParticles();
