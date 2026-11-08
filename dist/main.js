"use strict";
/* Diwali 2026 — a greeting from Deepak Yadav. Vanilla TypeScript, no dependencies. */
const $ = (s) => document.querySelector(s);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = innerWidth < 700;
const GOLD = ["#FFD700", "#FFE98A", "#FFB400"];
const PALETTES = [
    GOLD,
    ["#FF3131", "#FF8C00", "#FFD700"],
    ["#FF8C00", "#FFD700", "#FFF4DC"],
    ["#B66DFF", "#7A3CFF", "#FFF4DC"],
    ["#4DA3FF", "#3DE0FF", "#FFF4DC"],
    ["#FF4FA3", "#FF3131", "#FFD700"],
];
/* ---------- Sound (synthesised, starts only after a user gesture) ---------- */
class Sound {
    constructor() {
        this.on = true;
        this.ctx = null;
    }
    get c() {
        if (!this.ctx) {
            const A = window.AudioContext || window.webkitAudioContext;
            this.ctx = new A();
        }
        return this.ctx;
    }
    unlock() { if (this.on)
        void this.c.resume(); }
    noise(dur, freq, gain) {
        const c = this.c, n = Math.floor(c.sampleRate * dur);
        const buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < n; i++)
            d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
        const s = c.createBufferSource();
        s.buffer = buf;
        const f = c.createBiquadFilter();
        f.type = "lowpass";
        f.frequency.value = freq;
        const g = c.createGain();
        g.gain.value = gain;
        s.connect(f);
        f.connect(g);
        g.connect(c.destination);
        s.start();
    }
    boom(big = false) { if (this.on && this.ctx)
        this.noise(big ? 1.2 : 0.6, rand(500, 1400), big ? 0.7 : 0.35); }
    launch() {
        if (!this.on || !this.ctx)
            return;
        const c = this.c, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
        o.type = "sawtooth";
        o.frequency.setValueAtTime(220, t);
        o.frequency.exponentialRampToValueAtTime(900, t + 0.6);
        g.gain.setValueAtTime(0.04, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
        o.connect(g);
        g.connect(c.destination);
        o.start();
        o.stop(t + 0.6);
    }
    chime() {
        if (!this.on || !this.ctx)
            return;
        const c = this.c, t = c.currentTime;
        [880, 1318].forEach((f, i) => {
            const o = c.createOscillator(), g = c.createGain();
            o.type = "sine";
            o.frequency.value = f;
            g.gain.setValueAtTime(0.0001, t + i * 0.12);
            g.gain.exponentialRampToValueAtTime(0.12, t + i * 0.12 + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.12 + 0.9);
            o.connect(g);
            g.connect(c.destination);
            o.start(t + i * 0.12);
            o.stop(t + i * 0.12 + 1);
        });
    }
}
/* ---------- Particles, rockets, engine ---------- */
class Particle {
    constructor(x, y, vx, vy, color, decay, size, gravity = 0.04, drag = 0.985, twinkle = false, trail = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.decay = decay;
        this.size = size;
        this.gravity = gravity;
        this.drag = drag;
        this.twinkle = twinkle;
        this.trail = trail;
        this.life = 1;
    }
    update(dt) {
        this.vx *= this.drag;
        this.vy = this.vy * this.drag + this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.life -= this.decay * dt;
    }
    draw(ctx) {
        const a = Math.max(this.life, 0);
        ctx.globalAlpha = this.twinkle && Math.random() < 0.3 ? a * 0.3 : a;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * (0.5 + a * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }
}
class Rocket {
    constructor(sx, sy, tx, ty, shape, palette, scale) {
        this.tx = tx;
        this.ty = ty;
        this.shape = shape;
        this.palette = palette;
        this.scale = scale;
        this.dead = false;
        const frames = 70;
        this.x = sx;
        this.y = sy;
        this.vx = (tx - sx) / frames;
        this.vy = (ty - sy) / frames;
    }
    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (this.y <= this.ty)
            this.dead = true;
    }
}
class Engine {
    constructor(canvas, sound) {
        this.canvas = canvas;
        this.sound = sound;
        this.ambient = true;
        this.w = 0;
        this.h = 0;
        this.parts = [];
        this.rockets = [];
        this.fountains = [];
        this.last = performance.now();
        this.cap = isMobile ? 900 : 2000;
        this.loop = (t) => {
            const dt = Math.min((t - this.last) / 16.667, 3);
            this.last = t;
            if (!document.hidden) {
                const ctx = this.ctx;
                ctx.globalCompositeOperation = "destination-out";
                ctx.fillStyle = "rgba(0,0,0,0.22)";
                ctx.fillRect(0, 0, this.w, this.h);
                ctx.globalCompositeOperation = "lighter";
                if (this.ambient && !reduced && Math.random() < 0.12 * dt)
                    this.add(new Particle(rand(0, this.w), -5, rand(-.2, .2), rand(.4, 1), "#FFD27A", 0.0035, 1.6, 0, 1));
                let r = 0;
                for (const k of this.rockets) {
                    k.update(dt);
                    if (k.dead) {
                        this.explode(k.x, k.y, k.shape, k.palette, k.scale);
                        continue;
                    }
                    this.add(new Particle(k.x, k.y, rand(-.3, .3), rand(.2, .8), "#ffb347", 0.05, 1.4, 0.02));
                    ctx.globalAlpha = 1;
                    ctx.fillStyle = "#FFF4DC";
                    ctx.beginPath();
                    ctx.arc(k.x, k.y, 2.2 * Math.sqrt(k.scale), 0, Math.PI * 2);
                    ctx.fill();
                    this.rockets[r++] = k;
                }
                this.rockets.length = r;
                let f = 0;
                for (const fo of this.fountains) {
                    fo.ttl -= dt;
                    for (let i = 0; i < 3; i++)
                        this.add(new Particle(fo.x, this.h, rand(-1.4, 1.4), rand(-9.5, -5.5), Math.random() < 0.5 ? fo.color : "#FFD27A", 0.02, 1.6, 0.18, 0.99, true));
                    if (fo.ttl > 0)
                        this.fountains[f++] = fo;
                }
                this.fountains.length = f;
                let j = 0;
                for (const p of this.parts) {
                    p.update(dt);
                    if (p.trail && Math.random() < 0.25)
                        this.add(new Particle(p.x, p.y, 0, 0.1, p.color, 0.04, 1, 0, 1));
                    if (p.life > 0 && p.y < this.h + 20) {
                        p.draw(ctx);
                        this.parts[j++] = p;
                    }
                }
                this.parts.length = j;
                ctx.globalAlpha = 1;
            }
            requestAnimationFrame(this.loop);
        };
        this.ctx = canvas.getContext("2d");
        this.resize();
        addEventListener("resize", () => this.resize());
        requestAnimationFrame(this.loop);
    }
    get width() { return this.w; }
    get height() { return this.h; }
    resize() {
        const dpr = Math.min(devicePixelRatio || 1, isMobile ? 1.5 : 2);
        this.w = innerWidth;
        this.h = innerHeight;
        this.canvas.width = this.w * dpr;
        this.canvas.height = this.h * dpr;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    add(p) { if (this.parts.length < this.cap)
        this.parts.push(p); }
    launch(x, ty, shape = "circle", palette = pick(PALETTES), scale = 1, sx = x + rand(-80, 80)) {
        this.sound.launch();
        if (shape === "fountain") {
            this.fountains.push({ x, ttl: 150, color: pick(palette) });
            return;
        }
        this.rockets.push(new Rocket(sx, this.h, x, ty, shape, palette, scale));
    }
    explode(x, y, shape, palette, scale) {
        this.sound.boom(scale > 1.5);
        const n = Math.round((reduced ? 40 : isMobile ? 70 : 130) * scale);
        const k = Math.sqrt(scale);
        if (shape === "heart") {
            const m = Math.round(n * 1.2);
            for (const layer of [1, 0.6]) {
                for (let i = 0; i < m; i++) {
                    const t = (i / m) * Math.PI * 2;
                    const hx = 16 * Math.pow(Math.sin(t), 3);
                    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                    this.add(new Particle(x, y, hx * 0.26 * layer * scale, hy * 0.26 * layer * scale, pick(GOLD), 0.009, 2.2, 0.012, 0.96, true));
                }
            }
            return;
        }
        for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            if (shape === "ring") {
                const sp = 4.6 * k * rand(0.97, 1.03);
                this.add(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, palette[i % palette.length], 0.014, 2.2, 0.03, 0.975, true));
            }
            else if (shape === "willow") {
                const sp = rand(1, 4.6) * k;
                this.add(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, pick(GOLD), 0.006, 2, 0.05, 0.975, false, true));
            }
            else {
                const sp = rand(1.5, 5.4) * k;
                this.add(new Particle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, pick(palette), 0.012, rand(1.6, 2.6), 0.04, 0.975, true));
            }
        }
        // soft flash
        for (let i = 0; i < 6; i++)
            this.add(new Particle(x, y, rand(-.4, .4), rand(-.4, .4), "#FFF4DC", 0.09, 5 * k, 0, 1));
    }
}
/* ---------- Decorations ---------- */
function buildStars() {
    const box = $("#stars");
    const n = isMobile ? 90 : 170;
    for (let i = 0; i < n; i++) {
        const s = document.createElement("i");
        s.className = "star";
        const z = rand(1, 2.6);
        s.style.cssText = `left:${rand(0, 100)}%;top:${rand(0, 100)}%;width:${z}px;height:${z}px;--t:${rand(2, 6)}s;--d:${rand(-6, 0)}s`;
        box.appendChild(s);
    }
}
function buildLights() {
    const box = $("#lights"), w = innerWidth;
    box.innerHTML = "";
    const colors = ["#FF3131", "#FFD700", "#FF8C00", "#B66DFF", "#4DA3FF", "#FFF4DC"];
    const strings = [{ step: isMobile ? 28 : 36, amp: 16, fairy: false }, { step: isMobile ? 18 : 22, amp: 9, fairy: true }];
    let svg = `<svg viewBox="0 0 ${w} 60" preserveAspectRatio="none">`;
    let bulbs = "";
    strings.forEach((s, si) => {
        let pts = "";
        const seg = s.step * 5;
        for (let x = 0; x <= w + s.step; x += s.step) {
            const y = 6 + si * 16 + Math.abs(Math.sin(((x % seg) / seg) * Math.PI)) * s.amp;
            pts += `${x},${y} `;
            const i = Math.round(x / s.step);
            const col = s.fairy ? "#FFD27A" : colors[i % colors.length];
            bulbs += `<span class="bulb${s.fairy ? " fairy" : ""}" style="left:${x - 4}px;top:${y + 1}px;color:${col};--d:${(i % 7) * -0.25}s;--b:${1.2 + (i % 5) * 0.3}s"></span>`;
        }
        svg += `<polyline points="${pts}" fill="none" stroke="rgba(255,244,220,.28)" stroke-width="1.2"/>`;
    });
    box.innerHTML = svg + "</svg>" + bulbs;
    const tor = $("#torans");
    tor.innerHTML = "";
    const gap = isMobile ? 34 : 44;
    for (let x = 6, i = 0; x < w; x += gap, i++) {
        const d = document.createElement("div");
        d.className = "tor";
        d.style.cssText = `left:${x}px;--d:${(i % 6) * -0.6}s`;
        d.innerHTML = `<span class="leaf"></span><span class="fl"></span>`;
        tor.appendChild(d);
    }
}
function buildPetals() {
    if (reduced)
        return;
    const box = $("#petals"), cols = ["#FF8C00", "#FFB400", "#FF4FA3", "#FF6A3D"];
    for (let i = 0; i < (isMobile ? 10 : 18); i++) {
        const p = document.createElement("i");
        p.className = "petal";
        p.style.cssText = `left:${rand(0, 100)}%;--c:${pick(cols)};--t:${rand(9, 18)}s;--d:${rand(-18, 0)}s;--dx:${rand(-120, 120)}px`;
        box.appendChild(p);
    }
}
function buildRangoli() {
    const cols = ["#FF3131", "#FF8C00", "#FFD700", "#B66DFF", "#FF4FA3", "#4DA3FF"];
    const rings = [{ r: 88, n: 24, w: 5, l: 10 }, { r: 70, n: 18, w: 7, l: 16 }, { r: 48, n: 12, w: 9, l: 20 }, { r: 26, n: 8, w: 8, l: 14 }];
    let s = `<svg viewBox="-100 -100 200 200" fill="none">`;
    rings.forEach((g, ri) => {
        for (let i = 0; i < g.n; i++) {
            const a = (i * 360) / g.n + (ri % 2 ? 180 / g.n : 0);
            s += `<ellipse cx="0" cy="${-g.r}" rx="${g.w / 2}" ry="${g.l / 2}" transform="rotate(${a})" fill="${cols[(i + ri) % 6]}" opacity=".9"/>`;
            s += `<circle cx="0" cy="${-(g.r + g.l / 2 + 3)}" r="1.3" transform="rotate(${a})" fill="#FFF4DC"/>`;
        }
        s += `<circle r="${g.r + g.l / 2 + 7}" stroke="#FFD700" stroke-opacity=".4" stroke-dasharray="1 4"/>`;
    });
    $("#rangoli").innerHTML = s + `<circle r="7" fill="#FFD700"/></svg>`;
}
function buildOrbit() {
    const orbit = $("#orbit"), rad = (orbit.clientWidth || 300) / 2;
    const items = ["d", "s", "d", "s", "d", "s", "d", "s"];
    items.forEach((t, i) => {
        const slot = document.createElement("div");
        slot.style.cssText = `--r:${(i * 360) / items.length}deg;--rad:${rad}px`;
        slot.innerHTML = t === "d" ? `<span class="mini d"></span>` : `<span class="mini s">✦</span>`;
        orbit.appendChild(slot);
    });
}
/* ---------- Diyas ---------- */
const DIYA_SVG = `<svg class="bowl" viewBox="0 0 120 64" aria-hidden="true">
<path d="M4 20Q60 8 116 20Q112 58 60 62Q8 58 4 20Z" fill="url(#gold)"/>
<ellipse cx="60" cy="20" rx="56" ry="9" fill="#5a2a05"/><ellipse cx="60" cy="20" rx="44" ry="6" fill="#ff9a1a" opacity=".5"/>
<g fill="#8a4b05"><circle cx="30" cy="40" r="3"/><circle cx="45" cy="46" r="3"/><circle cx="60" cy="48" r="3"/><circle cx="75" cy="46" r="3"/><circle cx="90" cy="40" r="3"/></g>
<path d="M22 32Q60 44 98 32" fill="none" stroke="#8a4b05" stroke-width="2"/></svg>`;
const DIYA_COUNT = 7, START_LIT = 2;
const MSGS = [
    "Another diya, another wish coming true. ✨", "The darkness steps back a little more.", "Light shared is light doubled.",
    "Your glow just reached the whole sky.", "A new flame, a new hope.", "Prosperity just walked in.",
];
function buildDiyas() {
    const row = $("#diyas");
    row.innerHTML = "";
    for (let i = 0; i < DIYA_COUNT; i++) {
        const d = document.createElement("div");
        d.className = "diya" + (i < START_LIT ? " lit" : "");
        d.style.setProperty("--d", `${-rand(0, 2)}s`);
        d.innerHTML = `<div class="glow"></div>${DIYA_SVG}<div class="flame"></div>` +
            [-10, 0, 10].map((x) => `<i class="ember" style="--x:${x}px;--d:${-rand(0, 2.6)}s"></i>`).join("");
        row.appendChild(d);
    }
}
/* ---------- App ---------- */
const sound = new Sound();
const engine = new Engine($("#fx"), sound);
const intro = $("#intro"), main = $("#main"), overlay = $("#overlay"), wash = $("#wash"), toastEl = $("#toast");
let started = false, surpriseOpen = false, runId = 0, shapeIdx = 0, palIdx = 0;
function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("on");
    setTimeout(() => toastEl.classList.remove("on"), 2400);
}
function pulseWash() { wash.classList.remove("on"); void wash.offsetWidth; wash.classList.add("on"); }
function burstSky() {
    const w = engine.width, h = engine.height;
    const shapes = ["circle", "ring", "willow", "heart", "circle", "ring", "fountain", "circle"];
    shapes.forEach((s, i) => setTimeout(() => {
        const x = s === "fountain" ? rand(0.15, 0.85) * w : (0.08 + (i / shapes.length) * 0.84) * w;
        engine.launch(x, rand(0.12, 0.45) * h, s, s === "heart" ? GOLD : PALETTES[(palIdx++) % PALETTES.length]);
    }, i * 160));
    engine.launch(w * 0.2, h, "fountain");
    engine.launch(w * 0.8, h, "fountain");
}
function skyClick(x, y) {
    const order = ["circle", "ring", "willow", "circle", "fountain", "ring"];
    const heart = Math.random() < 1 / 6;
    const shape = heart ? "heart" : order[(shapeIdx++) % order.length];
    engine.launch(x, shape === "fountain" ? y : y, shape, heart ? GOLD : PALETTES[(palIdx++) % PALETTES.length], 1, x + rand(-40, 40));
}
function autoShow() {
    if (!document.hidden && !surpriseOpen) {
        const s = pick(["circle", "ring", "willow", "circle", "heart"]);
        engine.launch(rand(0.1, 0.9) * engine.width, rand(0.1, 0.5) * engine.height, s, s === "heart" ? GOLD : pick(PALETTES));
    }
    if (!reduced)
        setTimeout(autoShow, rand(1200, 2600));
}
/* intro */
const whisper = $("#whisper");
whisper.setAttribute("aria-label", whisper.textContent || "");
whisper.innerHTML = (whisper.textContent || "").split(" ").map((w, i) => `<span style="animation-delay:${0.8 + i * 0.35}s" aria-hidden="true">${w}</span>`).join(" ");
$("#start").addEventListener("click", () => {
    sound.unlock();
    started = true;
    burstSky();
    pulseWash();
    intro.classList.add("gone");
    main.hidden = false;
    requestAnimationFrame(() => main.classList.add("show"));
    document.body.classList.remove("locked");
    scrollTo(0, 0);
    setTimeout(buildOrbit, 50);
});
/* sky click */
document.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button,a,.glass,.frame-wrap"))
        return;
    sound.unlock();
    skyClick(e.clientX, e.clientY);
});
$("#burst").addEventListener("click", () => { sound.unlock(); burstSky(); });
/* diyas */
let msgIdx = 0;
$("#light").addEventListener("click", () => {
    sound.unlock();
    const diyas = Array.from(document.querySelectorAll(".diya"));
    const next = diyas.find((d) => !d.classList.contains("lit"));
    const msg = $("#diya-msg");
    pulseWash();
    sound.chime();
    if (next) {
        next.classList.add("lit");
        const r = next.getBoundingClientRect();
        engine.launch(r.left + r.width / 2, Math.max(120, r.top - 160), "ring", GOLD, 0.6, r.left + r.width / 2);
        const left = diyas.filter((d) => !d.classList.contains("lit")).length;
        msg.textContent = left === 0 ? "All seven diyas are glowing. Happy Diwali! 🪔" : MSGS[(msgIdx++) % MSGS.length];
    }
    else {
        msg.textContent = "Every diya is lit. Look up!";
        burstSky();
    }
});
/* surprise */
async function openSurprise() {
    const id = ++runId, w = engine.width, h = engine.height;
    surpriseOpen = true;
    sound.unlock();
    const parts = ["s1", "s2", "s3"].map((c) => $("." + c));
    const close = $("#close-surprise");
    [...parts, close].forEach((p) => p.classList.remove("in"));
    overlay.classList.remove("soft");
    overlay.classList.add("on");
    overlay.setAttribute("aria-hidden", "false");
    document.body.classList.add("locked");
    await wait(1000);
    if (id !== runId)
        return;
    engine.launch(w / 2, h * 0.32, "circle", GOLD, 2.4, w / 2);
    await wait(1350);
    if (id !== runId)
        return;
    overlay.classList.add("soft");
    pulseWash();
    engine.launch(w * 0.3, h * 0.3, "willow", GOLD, 1.3);
    engine.launch(w * 0.7, h * 0.3, "willow", GOLD, 1.3);
    parts[0].classList.add("in");
    await wait(2400);
    if (id !== runId)
        return;
    engine.launch(w / 2, h * 0.5, "heart", GOLD, 1.6);
    parts[1].classList.add("in");
    await wait(1500);
    if (id !== runId)
        return;
    parts[2].classList.add("in");
    await wait(900);
    if (id !== runId)
        return;
    close.classList.add("in");
}
function closeSurprise() {
    runId++;
    surpriseOpen = false;
    overlay.classList.remove("on", "soft");
    overlay.setAttribute("aria-hidden", "true");
    document.body.classList.remove("locked");
}
$("#surprise-btn").addEventListener("click", () => void openSurprise());
$("#close-surprise").addEventListener("click", closeSurprise);
addEventListener("keydown", (e) => { if (e.key === "Escape" && surpriseOpen)
    closeSurprise(); });
/* sharing */
const WISH = "🪔 Happy Diwali 2026! 🪔\n\nMay the lights of Diwali illuminate your life with happiness, prosperity, success, and endless beautiful memories.\n\n" +
    "Wishing you and your family a very Happy and Prosperous Diwali!\n\nWith love,\nDeepak Yadav ❤️";
const pageUrl = location.protocol.startsWith("http") ? location.href : "";
const fullWish = pageUrl ? `${WISH}\n\n${pageUrl}` : WISH;
async function copyWish() {
    try {
        await navigator.clipboard.writeText(fullWish);
        return true;
    }
    catch {
        const t = document.createElement("textarea");
        t.value = fullWish;
        t.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(t);
        t.select();
        const ok = document.execCommand("copy");
        t.remove();
        return ok;
    }
}
$("#wa").addEventListener("click", () => window.open("https://wa.me/?text=" + encodeURIComponent(fullWish), "_blank", "noopener"));
$("#copy").addEventListener("click", async () => toast((await copyWish()) ? "Diwali wishes copied 🪔" : "Could not copy. Please copy manually."));
$("#native").addEventListener("click", async () => {
    if (navigator.share) {
        try {
            await navigator.share({ title: "Happy Diwali 2026", text: WISH, ...(pageUrl ? { url: pageUrl } : {}) });
        }
        catch { /* cancelled */ }
    }
    else
        toast((await copyWish()) ? "Sharing isn't supported here, so the wishes were copied." : "Sharing isn't supported on this browser.");
});
$("#replay").addEventListener("click", () => {
    closeSurprise();
    buildDiyas();
    $("#diya-msg").textContent = "Two diyas are glowing. Light the rest.";
    main.classList.remove("show");
    main.hidden = true;
    intro.classList.remove("gone");
    document.body.classList.add("locked");
    scrollTo(0, 0);
    started = false;
    setTimeout(() => { burstSky(); pulseWash(); }, 300);
});
/* sound toggle */
const soundBtn = $("#sound");
soundBtn.addEventListener("click", () => {
    sound.on = !sound.on;
    soundBtn.textContent = sound.on ? "🔊" : "🔇";
    soundBtn.setAttribute("aria-pressed", String(sound.on));
    if (sound.on)
        sound.unlock();
});
/* init */
buildStars();
buildLights();
buildPetals();
buildRangoli();
buildDiyas();
let rz;
addEventListener("resize", () => { clearTimeout(rz); rz = window.setTimeout(buildLights, 200); });
setTimeout(() => engine.launch(engine.width * 0.5, engine.height * 0.3, "circle"), 600);
setTimeout(autoShow, 1400);
void started;
