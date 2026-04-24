const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const mini = document.getElementById("minimap");
const miniCtx = mini.getContext("2d");

const ui = {
  menu: document.getElementById("menu"),
  upgrade: document.getElementById("upgrade"),
  gameOver: document.getElementById("gameOver"),
  startBtn: document.getElementById("startBtn"),
  restartBtn: document.getElementById("restartBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  muteBtn: document.getElementById("muteBtn"),
  cards: document.getElementById("upgradeCards"),
  hpFill: document.getElementById("hpFill"),
  xpFill: document.getElementById("xpFill"),
  hpText: document.getElementById("hpText"),
  xpText: document.getElementById("xpText"),
  timer: document.getElementById("timer"),
  kills: document.getElementById("kills"),
  rank: document.getElementById("rank"),
  upgradeRank: document.getElementById("upgradeRank"),
  statDamage: document.getElementById("statDamage"),
  statRate: document.getElementById("statRate"),
  statSpeed: document.getElementById("statSpeed"),
  statMagnet: document.getElementById("statMagnet"),
  skillToast: document.getElementById("skillToast"),
  touchStick: document.getElementById("touchStick"),
  loadout: document.getElementById("loadout"),
  skillSlots: {},
};

const spriteNames = [
  "player_idle", "player_fire", "player_walk_0", "player_walk_1", "player_walk_2", "player_walk_3",
  "spider", "spider_dash", "spider_walk_0", "spider_walk_1", "spider_walk_2", "spider_walk_3", "roller", "roller_dash",
  "shield_bot", "shield_bot_swing", "medic_drone", "medic_drone_fire", "turret", "turret_fire",
  "xp_crystal", "medkit", "scrap", "power_cell", "magnet", "shield_pickup",
  "chest", "reactor", "green_crystal", "drone_chip", "armor_plate", "fuel",
  "health_orb", "keycard", "crate", "barrel", "generator", "obelisk", "console",
  "barricade", "cannon", "cable", "junk", "wrecked_spider", "antenna", "lamp",
  "sandbags", "locked_chest", "warning_sign", "tile_metal", "tile_sand",
  "tile_hazard", "cracked_slab", "acid_pool", "crater", "road_slab", "rocks",
  "rubble", "arena_floor_tile", "ice_beam", "blast_small", "blast_big", "lightning", "rocket",
  "spark", "portal", "ui_bolt", "ui_blast", "ui_med", "ui_target", "ui_rocket", "ui_reactor"
];

const sprites = {};
const keys = new Set();
const pointer = { active: false, id: null, x: 0, y: 0, dx: 0, dy: 0 };
let DPR = 1;
let W = 0;
let H = 0;
let last = 0;
let raf = 0;
let state = null;

const rand = (min, max) => min + Math.random() * (max - min);
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angleTo = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);
const PLAYER_FRAMES = ["player_walk_0", "player_walk_1", "player_walk_2", "player_walk_3"];
const PLAYER_FRAME_ANCHORS = {
  player_idle: { bottom: 620 },
  player_walk_0: { bottom: 620 },
  player_walk_1: { bottom: 620 },
  player_walk_2: { bottom: 620 },
  player_walk_3: { bottom: 620 },
};
const PLAYER_BASELINE = 620;
const SPIDER_FRAMES = ["spider_walk_0", "spider_walk_1", "spider_walk_2", "spider_walk_3"];
const AUDIO_MUTE_KEY = "scavenger.muted";
const audio = {
  ctx: null,
  master: null,
  music: null,
  musicEl: null,
  samples: {},
  musicTimer: 0,
  step: 0,
  last: {},
  muted: (() => { try { return localStorage.getItem(AUDIO_MUTE_KEY) === "1"; } catch { return false; } })(),
};
const AUDIO_FILES = {
  bolt: "assets/audio/bolt.mp3",
  blast: "assets/audio/blast.mp3",
  rocket: "assets/audio/rocket.mp3",
  taser: "assets/audio/taser.mp3",
  hit: "assets/audio/hit.mp3",
  kill: "assets/audio/kill.mp3",
  pickup: "assets/audio/pickup.mp3",
  upgrade: "assets/audio/upgrade.mp3",
  hurt: "assets/audio/hurt.mp3",
  over: "assets/audio/over.mp3",
};
const AUDIO_VOLUME = {
  bolt: 0.2,
  blast: 0.28,
  rocket: 0.24,
  taser: 0.2,
  hit: 0.13,
  kill: 0.26,
  pickup: 0.2,
  upgrade: 0.28,
  hurt: 0.24,
  over: 0.3,
};
const fmtTime = (seconds) => {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

function loadSprites() {
  return Promise.all(spriteNames.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      sprites[name] = img;
      resolve();
    };
    img.onerror = resolve;
    img.src = `assets/sprites/${name}.png`;
  })));
}

function setMuted(flag) {
  audio.muted = !!flag;
  try { localStorage.setItem(AUDIO_MUTE_KEY, audio.muted ? "1" : "0"); } catch {}
  if (audio.musicEl) {
    if (audio.muted) {
      audio.musicEl.pause();
    } else if (state && state.mode !== "menu" && state.mode !== "over") {
      audio.musicEl.volume = state.mode === "pause" ? 0.1 : 0.26;
      audio.musicEl.play().catch(() => {});
    }
  }
  if (audio.master) {
    audio.master.gain.setTargetAtTime(audio.muted ? 0 : 0.42, audio.ctx.currentTime, 0.05);
  }
  if (ui.muteBtn) {
    ui.muteBtn.classList.toggle("muted", audio.muted);
    ui.muteBtn.setAttribute("aria-pressed", audio.muted ? "true" : "false");
    ui.muteBtn.setAttribute("aria-label", audio.muted ? "Unmute audio" : "Mute audio");
  }
}

function initAudio() {
  setupSampleAudio();
  if (!audio.ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    audio.ctx = new AudioCtx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.42;
    audio.master.connect(audio.ctx.destination);
    audio.music = audio.ctx.createGain();
    audio.music.gain.value = 0.2;
    audio.music.connect(audio.master);
  }
  audio.ctx.resume?.();
  startMusic();
}

function setupSampleAudio() {
  for (const [name, src] of Object.entries(AUDIO_FILES)) {
    if (audio.samples[name]) continue;
    const sample = new Audio(src);
    sample.preload = "auto";
    sample.volume = AUDIO_VOLUME[name] || 0.35;
    audio.samples[name] = sample;
  }
  if (!audio.musicEl) {
    audio.musicEl = new Audio("assets/audio/music_loop.mp3");
    audio.musicEl.preload = "auto";
    audio.musicEl.loop = true;
    audio.musicEl.volume = 0.26;
  }
}

function playSample(name, minGap) {
  if (audio.muted) return true;
  const now = performance.now() / 1000;
  if (now - (audio.last[name] || 0) < minGap) return true;
  const sample = audio.samples[name];
  if (!sample) return false;
  audio.last[name] = now;
  const voice = sample.cloneNode(true);
  voice.volume = AUDIO_VOLUME[name] || 0.35;
  voice.playbackRate = 0.96 + Math.random() * 0.08;
  voice.play().catch(() => {});
  return true;
}

function tone(freq, duration, type = "sine", volume = 0.16, dest = audio.master, slide = 1) {
  if (!audio.ctx || !dest) return;
  const t = audio.ctx.currentTime;
  const osc = audio.ctx.createOscillator();
  const gain = audio.ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(24, freq * slide), t + duration);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + duration + 0.03);
}

function noise(duration, volume = 0.12, filterFreq = 900, dest = audio.master) {
  if (!audio.ctx || !dest) return;
  const t = audio.ctx.currentTime;
  const frames = Math.max(1, Math.floor(audio.ctx.sampleRate * duration));
  const buffer = audio.ctx.createBuffer(1, frames, audio.ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = rand(-1, 1) * (1 - i / frames);
  const source = audio.ctx.createBufferSource();
  const filter = audio.ctx.createBiquadFilter();
  const gain = audio.ctx.createGain();
  source.buffer = buffer;
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  filter.Q.value = 0.9;
  gain.gain.setValueAtTime(volume, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  source.start(t);
}

function playSfx(name, minGap = 0.04) {
  if (audio.muted) return;
  if (playSample(name, minGap)) return;
  if (!audio.ctx) return;
  const now = audio.ctx.currentTime;
  if (now - (audio.last[name] || 0) < minGap) return;
  audio.last[name] = now;
  if (name === "bolt") {
    tone(620, 0.055, "sawtooth", 0.055, audio.master, 1.9);
    tone(1180, 0.04, "triangle", 0.035, audio.master, 0.72);
  } else if (name === "blast") {
    tone(130, 0.24, "sawtooth", 0.12, audio.master, 0.32);
    noise(0.16, 0.16, 420);
  } else if (name === "rocket") {
    tone(180, 0.18, "sawtooth", 0.08, audio.master, 1.55);
    noise(0.2, 0.08, 520);
  } else if (name === "taser") {
    tone(900, 0.05, "square", 0.06, audio.master, 0.58);
    tone(460, 0.06, "square", 0.04, audio.master, 1.8);
  } else if (name === "hit") {
    tone(190, 0.06, "triangle", 0.045, audio.master, 0.7);
  } else if (name === "kill") {
    noise(0.18, 0.13, 260);
    tone(92, 0.24, "sine", 0.08, audio.master, 0.45);
  } else if (name === "pickup") {
    tone(720, 0.06, "triangle", 0.07, audio.master, 1.28);
    tone(1080, 0.055, "sine", 0.04, audio.master, 1.12);
  } else if (name === "upgrade") {
    tone(420, 0.11, "triangle", 0.08, audio.master, 1.45);
    setTimeout(() => tone(640, 0.12, "triangle", 0.08, audio.master, 1.35), 80);
    setTimeout(() => tone(920, 0.16, "sine", 0.07, audio.master, 1.12), 160);
  } else if (name === "hurt") {
    tone(90, 0.18, "sawtooth", 0.11, audio.master, 0.62);
    noise(0.09, 0.12, 180);
  } else if (name === "over") {
    tone(180, 0.35, "sawtooth", 0.1, audio.master, 0.42);
  }
}

function startMusic() {
  if (audio.muted) return;
  if (audio.musicEl) {
    audio.musicEl.volume = state?.mode === "pause" ? 0.1 : 0.26;
    audio.musicEl.play().catch(() => {});
    return;
  }
  if (!audio.ctx || audio.musicTimer) return;
  const bass = [55, 55, 65.41, 49, 73.42, 65.41, 55, 41.2];
  const lead = [220, 246.94, 261.63, 196, 220, 293.66, 261.63, 196];
  const schedule = () => {
    if (!audio.ctx || state?.mode === "menu" || state?.mode === "over") return;
    const i = audio.step++ % bass.length;
    const musicGain = state?.mode === "pause" ? 0.08 : 0.2;
    audio.music.gain.setTargetAtTime(musicGain, audio.ctx.currentTime, 0.08);
    tone(bass[i], 0.42, "sawtooth", 0.045, audio.music, 0.98);
    if (i % 2 === 0) tone(lead[i], 0.18, "triangle", 0.025, audio.music, 1.01);
    if (i % 4 === 0) noise(0.04, 0.025, 1600, audio.music);
  };
  schedule();
  audio.musicTimer = window.setInterval(schedule, 360);
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.floor(window.innerWidth);
  H = Math.floor(window.innerHeight);
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

function newState() {
  const player = {
    x: 0,
    y: 0,
    r: 24,
    hp: 140,
    maxHp: 140,
    speed: 245,
    xp: 0,
    nextXp: 8,
    level: 1,
    damage: 1,
    magnet: 240,
    armor: 0,
    regen: 0,
    fireRate: 1,
    lastHit: 0,
    facing: 0,
    invuln: 0,
    moving: false,
    walkTime: 0,
    weapons: { bolt: 1, blast: 0, drone: 0, target: 0 },
    skills: { bolt: 1, blast: 0, drone: 0, target: 0, speed: 0, damage: 0, rate: 0, magnet: 0, hull: 0, regen: 0, armor: 0 },
  };

  return {
    mode: "menu",
    time: 0,
    shake: 0,
    slow: 1,
    kills: 0,
    spawnClock: 0,
    bossClock: 74,
    chestClock: 0,
    player,
    enemies: [],
    bullets: [],
    enemyBullets: [],
    pickups: [],
    particles: [],
    props: [],
    decals: [],
    drones: [],
    upgradesSeen: 0,
  };
}

function startRun() {
  initAudio();
  state = newState();
  state.mode = "play";
  if (audio.musicEl && !audio.muted) {
    audio.musicEl.currentTime = 0;
    audio.musicEl.volume = 0.26;
    audio.musicEl.play().catch(() => {});
  }
  if (audio.music && !audio.muted) audio.music.gain.setTargetAtTime(0.2, audio.ctx.currentTime, 0.08);
  ui.menu.classList.add("hidden");
  ui.gameOver.classList.add("hidden");
  ui.upgrade.classList.add("hidden");
  ui.pauseBtn.textContent = "II";
  ui.skillToast.classList.remove("show");
  ui.skillToast.textContent = "";
  updateHud();
  last = performance.now();
}

function pauseToggle() {
  if (!state || state.mode === "menu" || state.mode === "upgrade" || state.mode === "over") return;
  state.mode = state.mode === "pause" ? "play" : "pause";
  ui.pauseBtn.textContent = state.mode === "pause" ? ">" : "II";
  if (audio.musicEl && !audio.muted) audio.musicEl.volume = state.mode === "pause" ? 0.1 : 0.26;
  if (audio.music && !audio.muted) audio.music.gain.setTargetAtTime(state.mode === "pause" ? 0.08 : 0.2, audio.ctx.currentTime, 0.08);
}

function spawnEnemy(kind = "spider", boss = false) {
  const p = state.player;
  const margin = Math.max(W, H) * 0.62 + 120;
  const side = Math.floor(rand(0, 4));
  let sx = p.x;
  let sy = p.y;
  if (side === 0) { sx += rand(-margin, margin); sy -= margin; }
  if (side === 1) { sx += margin; sy += rand(-margin, margin); }
  if (side === 2) { sx += rand(-margin, margin); sy += margin; }
  if (side === 3) { sx -= margin; sy += rand(-margin, margin); }

  const t = state.time;
  const scaling = 1 + t / 170;
  const table = {
    spider: { sprite: "spider", r: 22, hp: 26, speed: 88, damage: 13, xp: 3 },
    roller: { sprite: "roller", r: 25, hp: 42, speed: 118, damage: 16, xp: 5 },
    shield: { sprite: "shield_bot", r: 32, hp: 95, speed: 58, damage: 23, xp: 10 },
    medic: { sprite: "medic_drone", r: 24, hp: 38, speed: 74, damage: 10, xp: 7 },
    turret: { sprite: "turret", r: 27, hp: 64, speed: 40, damage: 15, xp: 8 },
  };
  const base = table[kind];
  state.enemies.push({
    kind,
    x: sx,
    y: sy,
    r: base.r * (boss ? 1.75 : 1),
    hp: base.hp * scaling * (boss ? 8 : 1),
    maxHp: base.hp * scaling * (boss ? 8 : 1),
    speed: base.speed * rand(0.9, 1.12) * (boss ? 0.78 : 1),
    damage: base.damage * (boss ? 1.5 : 1),
    xp: base.xp * (boss ? 10 : 1),
    sprite: base.sprite,
    boss,
    cd: rand(0.4, 1.6),
    phase: rand(0, 100),
    knock: 0,
  });
}

function spawnWave(dt) {
  const density = clamp(0.72 - state.time / 700, 0.22, 0.72);
  state.spawnClock -= dt;
  if (state.spawnClock <= 0) {
    const t = state.time;
    const count = Math.floor(1 + t / 50);
    for (let i = 0; i < count; i++) {
      const roll = Math.random();
      let kind = "spider";
      if (t > 25 && roll > 0.64) kind = "roller";
      if (t > 55 && roll > 0.82) kind = "medic";
      if (t > 80 && roll > 0.88) kind = "shield";
      if (t > 115 && roll > 0.92) kind = "turret";
      spawnEnemy(kind);
    }
    state.spawnClock = density;
  }

  state.bossClock -= dt;
  if (state.bossClock <= 0) {
    spawnEnemy(state.time > 150 ? "shield" : "roller", true);
    state.bossClock = 80;
  }
}

function movePlayer(dt) {
  const p = state.player;
  let ix = 0;
  let iy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) iy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) iy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) ix -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) ix += 1;
  ix += pointer.dx;
  iy += pointer.dy;
  const len = Math.hypot(ix, iy);
  p.moving = len > 0.01;
  if (len > 0.01) {
    ix /= len;
    iy /= len;
    p.x += ix * p.speed * dt;
    p.y += iy * p.speed * dt;
    p.facing = Math.atan2(iy, ix);
    p.walkTime += dt * clamp(p.speed / 210, 0.85, 1.5);
  }
  p.invuln = Math.max(0, p.invuln - dt);
  p.weaponFlash = Math.max(0, (p.weaponFlash || 0) - dt);
  if (p.regen > 0) p.hp = Math.min(p.maxHp, p.hp + p.regen * dt);
}

function nearestEnemy(maxRange = Infinity) {
  let best = null;
  let bestD = maxRange;
  for (const e of state.enemies) {
    const d = dist(state.player, e);
    if (d < bestD) {
      best = e;
      bestD = d;
    }
  }
  return best;
}

function fireWeapons(dt) {
  const p = state.player;
  p.boltCd = (p.boltCd || 0) - dt;
  p.blastCd = (p.blastCd || 0) - dt;
  p.droneCd = (p.droneCd || 0) - dt;
  p.targetCd = (p.targetCd || 0) - dt;

  if (p.boltCd <= 0) {
    const level = p.weapons.bolt;
    for (let i = 0; i < level; i++) {
      const target = nearestEnemy(680);
      const angle = target ? angleTo(p, target) + (i - (level - 1) / 2) * 0.14 : p.facing;
      shootFromShoulder(angle, 560, 18 * p.damage, 520, "bolt", "ice_beam", 0.22);
    }
    playSfx("bolt", 0.12);
    p.boltCd = 0.72 / p.fireRate;
  }

  if (p.weapons.blast > 0 && p.blastCd <= 0) {
    const n = 6 + p.weapons.blast * 2;
    for (let i = 0; i < n; i++) {
      addBullet(p.x, p.y, (Math.PI * 2 * i) / n, 300, 12 * p.damage, 260, "blast", "spark", 0.26);
    }
    pulse(p.x, p.y, "#f7a735", 48);
    playSfx("blast", 0.5);
    p.blastCd = 3.4 / p.fireRate;
  }

  if (p.weapons.drone > 0 && p.droneCd <= 0) {
    const target = nearestEnemy(720);
    if (target) {
      const a = angleTo(p, target);
      shootFromShoulder(a, 430, 30 * p.damage, 650, "rocket", "rocket", 0.22, 16);
      playSfx("rocket", 0.22);
      p.droneCd = Math.max(0.55, 1.6 - p.weapons.drone * 0.16) / p.fireRate;
    }
  }

  if (p.weapons.target > 0 && p.targetCd <= 0) {
    const target = nearestEnemy(520);
    if (target) {
      damageEnemy(target, 34 * p.damage * p.weapons.target, 0.5);
      chainLightning(target, Math.min(2 + p.weapons.target, 6), 28 * p.damage);
      p.weaponFlash = 0.12;
      p.fireAngle = angleTo(p, target);
      playSfx("taser", 0.34);
      p.targetCd = 2.25 / p.fireRate;
    }
  }
}

function playerMuzzleOrigin(angle) {
  const p = state.player;
  return {
    x: p.x + Math.cos(angle) * 32,
    y: p.y + Math.sin(angle) * 32 - 34,
  };
}

function shootFromShoulder(angle, speed, damage, range, type, sprite, scale, radius = 14) {
  const origin = playerMuzzleOrigin(angle);
  state.player.weaponFlash = 0.14;
  state.player.fireAngle = angle;
  addBullet(origin.x, origin.y, angle, speed, damage, range, type, sprite, scale, radius);
}

function addBullet(x, y, angle, speed, damage, range, type, sprite, scale, radius = 14) {
  state.bullets.push({
    x, y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    angle,
    damage,
    range,
    traveled: 0,
    r: radius,
    type,
    sprite,
    scale,
    pierce: type === "blast" ? 2 : 1,
  });
}

function updateBullets(dt) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.traveled += Math.hypot(b.vx * dt, b.vy * dt);
    if (b.traveled > b.range) {
      state.bullets.splice(i, 1);
      continue;
    }
    for (const e of state.enemies) {
      if (Math.hypot(b.x - e.x, b.y - e.y) < b.r + e.r) {
        damageEnemy(e, b.damage, b.type === "rocket" ? 1.1 : 0.35);
        b.pierce -= 1;
        if (b.type === "rocket") explode(b.x, b.y, 96, b.damage * 0.8);
        if (b.pierce <= 0) {
          state.bullets.splice(i, 1);
        }
        break;
      }
    }
  }

  for (let i = state.enemyBullets.length - 1; i >= 0; i--) {
    const b = state.enemyBullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    if (b.life <= 0) {
      state.enemyBullets.splice(i, 1);
      continue;
    }
    if (Math.hypot(b.x - state.player.x, b.y - state.player.y) < b.r + state.player.r) {
      hurtPlayer(b.damage);
      state.enemyBullets.splice(i, 1);
    }
  }
}

function damageEnemy(enemy, amount, knock) {
  enemy.hp -= amount;
  enemy.knock = Math.max(enemy.knock, knock);
  state.particles.push({ x: enemy.x, y: enemy.y, life: 0.22, max: 0.22, r: enemy.r * 1.5, color: "rgba(78,238,230,0.5)" });
  playSfx("hit", 0.05);
  if (enemy.hp <= 0) killEnemy(enemy);
}

function explode(x, y, radius, damage) {
  state.shake = Math.max(state.shake, 5);
  state.decals.push({ x, y, sprite: radius > 110 ? "blast_big" : "blast_small", scale: radius / 360, life: 0.9 });
  for (const e of state.enemies) {
    if (Math.hypot(e.x - x, e.y - y) < radius + e.r) damageEnemy(e, damage, 1.4);
  }
}

function chainLightning(origin, jumps, damage) {
  let from = origin;
  const hit = new Set([origin]);
  for (let i = 0; i < jumps; i++) {
    let best = null;
    let bestD = 260;
    for (const e of state.enemies) {
      if (hit.has(e)) continue;
      const d = Math.hypot(e.x - from.x, e.y - from.y);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
    if (!best) break;
    state.particles.push({ x: (from.x + best.x) / 2, y: (from.y + best.y) / 2, x2: best.x, y2: best.y, x1: from.x, y1: from.y, life: 0.14, max: 0.14, line: true });
    damageEnemy(best, damage, 0.8);
    hit.add(best);
    from = best;
  }
}

function killEnemy(enemy) {
  const idx = state.enemies.indexOf(enemy);
  if (idx >= 0) state.enemies.splice(idx, 1);
  state.kills += 1;
  playSfx("kill", 0.08);
  state.decals.push({ x: enemy.x, y: enemy.y, sprite: "crater", scale: enemy.boss ? 0.42 : 0.24, life: 9 });
  dropPickup(enemy.x, enemy.y, enemy.xp, "xp_crystal");
  if (Math.random() < 0.05 || enemy.boss) dropPickup(enemy.x + rand(-18, 18), enemy.y + rand(-18, 18), 0, enemy.boss ? "chest" : "scrap");
  if (Math.random() < 0.025) dropPickup(enemy.x, enemy.y, 0, "medkit");
}

function dropPickup(x, y, value, sprite) {
  state.pickups.push({
    x: x + rand(-16, 16),
    y: y + rand(-16, 16),
    vx: rand(-70, 70),
    vy: rand(-70, 70),
    r: sprite === "chest" ? 24 : 13,
    value,
    sprite,
    life: 80,
  });
}

function updateEnemies(dt) {
  const p = state.player;
  for (const e of state.enemies) {
    e.phase += dt;
    e.cd -= dt;
    const a = angleTo(e, p);
    const d = Math.hypot(p.x - e.x, p.y - e.y);
    const lateral = e.kind === "roller" ? Math.sin(e.phase * 4) * 0.75 : 0;
    const speed = e.speed * (e.kind === "roller" && d > 120 ? 1.35 : 1);
    e.x += Math.cos(a + lateral) * speed * dt;
    e.y += Math.sin(a + lateral) * speed * dt;
    if (e.knock > 0) {
      e.x -= Math.cos(a) * e.knock * 90 * dt;
      e.y -= Math.sin(a) * e.knock * 90 * dt;
      e.knock = Math.max(0, e.knock - dt * 3);
    }
    if (d < e.r + p.r) hurtPlayer(e.damage * dt * 1.8);
    if ((e.kind === "turret" || e.kind === "medic") && e.cd <= 0 && d < 620) {
      const ba = angleTo(e, p);
      state.enemyBullets.push({ x: e.x, y: e.y, vx: Math.cos(ba) * 245, vy: Math.sin(ba) * 245, r: 9, life: 2.5, damage: e.damage });
      e.cd = e.kind === "turret" ? 1.65 : 2.1;
    }
    if (e.kind === "medic" && e.cd > 1.8) {
      for (const ally of state.enemies) {
        if (ally !== e && Math.hypot(ally.x - e.x, ally.y - e.y) < 130) {
          ally.hp = Math.min(ally.maxHp, ally.hp + 6 * dt);
        }
      }
    }
  }
}

function hurtPlayer(amount) {
  const p = state.player;
  if (p.invuln > 0 && amount > 6) return;
  const reduced = Math.max(1, amount - p.armor);
  p.hp -= reduced;
  p.invuln = 0.08;
  state.shake = Math.max(state.shake, 4);
  playSfx("hurt", 0.38);
  if (p.hp <= 0) endRun(false);
}

function updatePickups(dt) {
  const p = state.player;
  for (let i = state.pickups.length - 1; i >= 0; i--) {
    const item = state.pickups[i];
    item.life -= dt;
    item.x += item.vx * dt;
    item.y += item.vy * dt;
    item.vx *= 0.92;
    item.vy *= 0.92;
    const d = Math.hypot(item.x - p.x, item.y - p.y);
    const pull = item.sprite === "chest" ? p.magnet * 0.75 : p.magnet;
    if (d < pull || item.sprite === "magnet") {
      const a = angleTo(item, p);
      const speed = clamp((pull - d) * 8, 120, 700);
      item.x += Math.cos(a) * speed * dt;
      item.y += Math.sin(a) * speed * dt;
    }
    if (d < item.r + p.r) {
      collect(item);
      playSfx(item.sprite === "medkit" || item.sprite === "chest" ? "upgrade" : "pickup", 0.05);
      state.pickups.splice(i, 1);
    } else if (item.life <= 0) {
      state.pickups.splice(i, 1);
    }
  }
}

function collect(item) {
  const p = state.player;
  if (item.sprite === "xp_crystal") {
    p.xp += item.value;
    while (p.xp >= p.nextXp) {
      p.xp -= p.nextXp;
      p.level += 1;
      p.nextXp = Math.floor(p.nextXp * 1.28 + 7);
      showUpgrades();
    }
  } else if (item.sprite === "medkit") {
    p.hp = Math.min(p.maxHp, p.hp + 38);
  } else if (item.sprite === "chest") {
    p.xp += Math.ceil(p.nextXp * 0.45);
    applyUpgrade(randomUpgrade(true));
  } else {
    p.xp += 2;
  }
}

const upgrades = [
  { id: "bolt", icon: "ui_bolt", label: "ARC", title: "Arc Rifle", desc: "Add another auto-targeting plasma bolt.", apply: (p) => p.weapons.bolt += 1 },
  { id: "blast", icon: "ui_blast", label: "MINE", title: "Pulse Mine", desc: "Emit a radial blast every few seconds.", apply: (p) => p.weapons.blast += 1 },
  { id: "drone", icon: "ui_rocket", label: "RKT", title: "Rocket Drone", desc: "Launch homing rockets at distant targets.", apply: (p) => p.weapons.drone += 1 },
  { id: "target", icon: "ui_target", label: "TAS", title: "Chain Taser", desc: "Shock one target and arc to nearby enemies.", apply: (p) => p.weapons.target += 1 },
  { id: "speed", icon: "fuel", label: "SPD", title: "Servo Oil", desc: "Increase movement speed by 12%.", apply: (p) => p.speed *= 1.12 },
  { id: "damage", icon: "power_cell", label: "DMG", title: "Overcharge", desc: "Increase all weapon damage by 18%.", apply: (p) => p.damage *= 1.18 },
  { id: "rate", icon: "ui_reactor", label: "RATE", title: "Hot Reactor", desc: "Weapons cycle 14% faster.", apply: (p) => p.fireRate *= 1.14 },
  { id: "magnet", icon: "magnet", label: "PULL", title: "Magnet Clamp", desc: "Pull pickups from farther away.", apply: (p) => p.magnet += 70 },
  { id: "hull", icon: "armor_plate", label: "HULL", title: "Hull Plate", desc: "Add max hull and repair immediately.", apply: (p) => { p.maxHp += 30; p.hp += 30; } },
  { id: "regen", icon: "medkit", label: "REGEN", title: "Nano Meds", desc: "Regenerate hull over time.", apply: (p) => p.regen += 0.9 },
  { id: "armor", icon: "shield_pickup", label: "SHLD", title: "Kinetic Shield", desc: "Reduce incoming contact damage.", apply: (p) => p.armor += 1.1 },
];

function randomUpgrade(rare = false) {
  const bag = rare ? upgrades.filter((u) => ["damage", "rate", "hull", "bolt", "drone", "target"].includes(u.id)) : upgrades;
  return bag[Math.floor(rand(0, bag.length))];
}

function showUpgrades() {
  if (state.mode === "over") return;
  state.mode = "upgrade";
  ui.upgrade.classList.remove("hidden");
  ui.upgradeRank.textContent = `Rank ${state.player.level}`;
  ui.cards.textContent = "";
  const picked = [];
  while (picked.length < 3) {
    const u = randomUpgrade();
    if (!picked.includes(u)) picked.push(u);
  }
  for (const upgrade of picked) {
    const current = upgradeLevel(upgrade.id);
    const button = document.createElement("button");
    button.className = "upgrade-card";
    button.type = "button";
    button.innerHTML = `<img src="assets/sprites/${upgrade.icon}.png" alt=""><strong>${upgrade.title}</strong><span>${upgrade.desc}</span><small>Lv ${current} -> ${current + 1}</small>`;
    button.addEventListener("click", () => {
      applyUpgrade(upgrade);
      ui.upgrade.classList.add("hidden");
      state.mode = "play";
      last = performance.now();
    });
    ui.cards.append(button);
  }
}

function applyUpgrade(upgrade) {
  upgrade.apply(state.player);
  state.player.skills[upgrade.id] = (state.player.skills[upgrade.id] || 0) + 1;
  state.upgradesSeen += 1;
  pulse(state.player.x, state.player.y, "#7be14b", 76);
  playSfx("upgrade", 0.2);
  showSkillToast(upgrade);
  updateHud();
}

function upgradeLevel(id) {
  const p = state.player;
  if (id === "bolt") return p.weapons.bolt;
  if (id === "blast") return p.weapons.blast;
  if (id === "drone") return p.weapons.drone;
  if (id === "target") return p.weapons.target;
  return p.skills[id] || 0;
}

function showSkillToast(upgrade) {
  ui.skillToast.textContent = `${upgrade.title} Lv ${upgradeLevel(upgrade.id)}`;
  ui.skillToast.classList.add("show");
  clearTimeout(ui.skillToastTimer);
  ui.skillToastTimer = setTimeout(() => ui.skillToast.classList.remove("show"), 1400);
}

function pulse(x, y, color, r) {
  state.particles.push({ x, y, life: 0.32, max: 0.32, r, color });
}

function updateParticles(dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    state.particles[i].life -= dt;
    if (state.particles[i].life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.decals.length - 1; i >= 0; i--) {
    state.decals[i].life -= dt;
    if (state.decals[i].life <= 0) state.decals.splice(i, 1);
  }
}

function endRun(won) {
  state.mode = "over";
  if (audio.musicEl && !audio.muted) audio.musicEl.volume = 0.06;
  if (audio.music && !audio.muted) audio.music.gain.setTargetAtTime(0.04, audio.ctx.currentTime, 0.12);
  playSfx(won ? "upgrade" : "over", 0.2);
  ui.gameOver.classList.remove("hidden");
  document.getElementById("endTitle").textContent = won ? "Reactor Secured" : "Scavenger Down";
  document.getElementById("endStats").textContent = `${fmtTime(state.time)} survived - ${state.kills} machines salvaged - Rank ${state.player.level}`;
}

function update(dt) {
  if (!state || state.mode !== "play") return;
  dt = Math.min(dt, 0.033);
  state.time += dt;
  if (state.time >= 600) endRun(true);
  movePlayer(dt);
  fireWeapons(dt);
  spawnWave(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updatePickups(dt);
  updateParticles(dt);
  state.shake = Math.max(0, state.shake - dt * 18);
  updateHud();
}

function updateHud() {
  const p = state.player;
  ui.hpFill.style.transform = `scaleX(${clamp(p.hp / p.maxHp, 0, 1)})`;
  ui.xpFill.style.transform = `scaleX(${clamp(p.xp / p.nextXp, 0, 1)})`;
  ui.hpText.textContent = `${Math.ceil(clamp(p.hp, 0, p.maxHp))} / ${p.maxHp}`;
  ui.xpText.textContent = `${Math.floor(p.xp)} / ${p.nextXp}`;
  ui.timer.textContent = fmtTime(state.time);
  ui.kills.textContent = `${state.kills} Scrap`;
  ui.rank.textContent = `Rank ${p.level}`;
  ui.statDamage.textContent = `x${p.damage.toFixed(2)}`;
  ui.statRate.textContent = `x${p.fireRate.toFixed(2)}`;
  ui.statSpeed.textContent = Math.round(p.speed);
  ui.statMagnet.textContent = Math.round(p.magnet);
  updateSkillBar(p);
}

function ensureSkillBar() {
  if (ui.loadout.childElementCount === upgrades.length) return;
  ui.loadout.textContent = "";
  ui.skillSlots = {};
  for (const upgrade of upgrades) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.title = upgrade.title;
    slot.innerHTML = `<img src="assets/sprites/${upgrade.icon}.png" alt=""><b>${upgrade.label}</b><span>Lv 0</span>`;
    ui.loadout.append(slot);
    ui.skillSlots[upgrade.id] = slot;
  }
}

function updateSkillBar(p) {
  ensureSkillBar();
  for (const upgrade of upgrades) {
    const slot = ui.skillSlots[upgrade.id];
    const level = upgradeLevel(upgrade.id);
    slot.querySelector("span").textContent = `Lv ${level}`;
    slot.classList.toggle("active", level > 0);
    slot.classList.toggle("new", state.upgradesSeen > 0 && level > 0);
  }
}

function camera() {
  const sx = state.shake ? rand(-state.shake, state.shake) : 0;
  const sy = state.shake ? rand(-state.shake, state.shake) : 0;
  return { x: state.player.x - W / 2 + sx, y: state.player.y - H / 2 + sy };
}

function drawSprite(name, x, y, size, rot = 0, flip = false, alpha = 1, scaleX = 1, scaleY = 1) {
  const img = sprites[name];
  if (!img) return;
  const ratio = img.width / img.height;
  const dw = size * ratio * scaleX;
  const dh = size * scaleY;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function drawPlayerSprite(name, x, y, size, flip, alpha) {
  const img = sprites[name];
  if (!img) return;
  const ratio = img.width / img.height;
  const dw = size * ratio;
  const dh = size;
  const anchor = PLAYER_FRAME_ANCHORS[name] || PLAYER_FRAME_ANCHORS.player_idle;
  const baselineCorrection = ((PLAYER_BASELINE - anchor.bottom) / img.height) * dh;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y + baselineCorrection);
  ctx.scale(flip ? -1 : 1, 1);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

function enemyRenderState(enemy) {
  const walk = enemy.phase;
  const firePulse = enemy.kind === "turret" && enemy.cd > 1.42;
  const healPulse = enemy.kind === "medic" && enemy.cd > 1.8;
  const swingPulse = enemy.kind === "shield" && Math.sin(walk * 5.5) > 0.25;
  const render = {
    sprite: enemy.sprite,
    x: 0,
    y: 0,
    rot: angleTo(enemy, state.player) * 0.08,
    scaleX: 1,
    scaleY: 1,
  };

  if (enemy.kind === "spider") {
    render.sprite = SPIDER_FRAMES[Math.floor(walk * 8) % SPIDER_FRAMES.length];
  } else if (enemy.kind === "roller") {
    render.sprite = Math.sin(walk * 16) > 0 ? "roller_dash" : "roller";
    render.rot += Math.sin(walk * 18) * 0.045;
    render.y += Math.sin(walk * 18) * 2.5;
    render.scaleX = 1 + Math.sin(walk * 18) * 0.025;
    render.scaleY = 1 - Math.sin(walk * 18) * 0.018;
  } else if (enemy.kind === "shield") {
    render.sprite = swingPulse ? "shield_bot_swing" : "shield_bot";
    render.rot += Math.sin(walk * 6) * 0.035;
    render.x += Math.sin(walk * 8) * 1.8;
    render.y += Math.abs(Math.sin(walk * 5.5)) * 2.4;
  } else if (enemy.kind === "medic") {
    render.sprite = healPulse ? "medic_drone_fire" : "medic_drone";
    render.rot += Math.sin(walk * 4.8) * 0.055;
    render.y += Math.sin(walk * 7) * 4.5;
    render.scaleY = 1 + Math.sin(walk * 7) * 0.025;
  } else if (enemy.kind === "turret") {
    render.sprite = firePulse ? "turret_fire" : "turret";
    render.rot += Math.sin(walk * 7) * 0.026;
    render.x -= firePulse ? Math.cos(angleTo(enemy, state.player)) * 5 : 0;
    render.y += Math.sin(walk * 9) * 2;
    render.scaleX = firePulse ? 1.04 : 1 + Math.sin(walk * 9) * 0.018;
    render.scaleY = firePulse ? 0.98 : 1 - Math.sin(walk * 9) * 0.014;
  }

  return render;
}

function drawWorld(cam) {
  ctx.fillStyle = "#d7e4e9";
  ctx.fillRect(0, 0, W, H);

  const floor = sprites.arena_floor_tile;
  const tile = 836;
  const startX = Math.floor(cam.x / tile) * tile;
  const startY = Math.floor(cam.y / tile) * tile;
  if (floor) {
    for (let x = startX - tile; x < cam.x + W + tile; x += tile) {
      for (let y = startY - tile; y < cam.y + H + tile; y += tile) {
        ctx.drawImage(floor, x - cam.x, y - cam.y, tile + 1, tile + 1);
      }
    }
  }

  ctx.fillStyle = "rgba(15, 28, 32, 0.08)";
  ctx.fillRect(0, 0, W, H);

  const vignette = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.18, W / 2, H / 2, Math.max(W, H) * 0.72);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(5,12,18,0.20)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(75, 232, 224, 0.035)";
  ctx.lineWidth = 1;
  const grid = 320;
  const gridX = Math.floor(cam.x / grid) * grid;
  const gridY = Math.floor(cam.y / grid) * grid;
  for (let x = gridX; x < cam.x + W + grid; x += grid) {
    ctx.beginPath();
    ctx.moveTo(x - cam.x, 0);
    ctx.lineTo(x - cam.x, H);
    ctx.stroke();
  }
  for (let y = gridY; y < cam.y + H + grid; y += grid) {
    ctx.beginPath();
    ctx.moveTo(0, y - cam.y);
    ctx.lineTo(W, y - cam.y);
    ctx.stroke();
  }
}

function draw() {
  if (!state) return;
  const cam = camera();
  drawWorld(cam);

  const visible = (o, pad = 220) => o.x > cam.x - pad && o.x < cam.x + W + pad && o.y > cam.y - pad && o.y < cam.y + H + pad;

  for (const d of state.decals) {
    if (visible(d, 260)) drawSprite(d.sprite, d.x - cam.x, d.y - cam.y, 240 * d.scale, 0, false, clamp(d.life / 1.2, 0.15, 0.75));
  }

  for (const item of state.pickups) {
    if (!visible(item, 120)) continue;
    const bob = Math.sin(performance.now() / 180 + item.x) * 4;
    drawSprite(item.sprite, item.x - cam.x, item.y - cam.y + bob, item.sprite === "chest" ? 64 : 38);
  }

  for (const b of state.bullets) {
    drawSprite(b.sprite, b.x - cam.x, b.y - cam.y, b.r * 3.6 * (b.scale || 1), b.angle);
  }

  ctx.fillStyle = "#ff6a42";
  for (const b of state.enemyBullets) {
    ctx.beginPath();
    ctx.arc(b.x - cam.x, b.y - cam.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const p = state.player;
  const actors = [
    ...state.enemies.filter((enemy) => visible(enemy, 200)).map((enemy) => ({ type: "enemy", y: enemy.y, enemy })),
    { type: "player", y: p.y, player: p },
  ].sort((a, b) => a.y - b.y);

  for (const actor of actors) {
    if (actor.type === "enemy") {
      const e = actor.enemy;
      const x = e.x - cam.x;
      const y = e.y - cam.y;
      const render = enemyRenderState(e);
      drawSprite(
        render.sprite,
        x + render.x,
        y + render.y,
        e.r * (e.boss ? 5.3 : 4.2),
        render.rot,
        state.player.x < e.x,
        1,
        render.scaleX,
        render.scaleY
      );
      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(x - e.r, y - e.r - 20, e.r * 2, 4);
      ctx.fillStyle = e.boss ? "#f0523d" : "#d99c42";
      ctx.fillRect(x - e.r, y - e.r - 20, e.r * 2 * clamp(e.hp / e.maxHp, 0, 1), 4);
    } else {
      const gait = p.walkTime * 5;
      const step = Math.floor(gait) % PLAYER_FRAMES.length;
      const frame = p.moving ? PLAYER_FRAMES[step] : "player_idle";
      const stride = p.moving ? Math.sin(gait * Math.PI) : 0;
      drawPlayerSprite(
        frame,
        W / 2,
        H / 2 - Math.abs(stride) * 1.25,
        132,
        Math.cos(p.facing) < 0,
        p.invuln > 0 ? 0.62 : 1
      );
    }
  }

  for (const part of state.particles) {
    const life = part.life / part.max;
    if (part.line) {
      ctx.strokeStyle = `rgba(79, 238, 255, ${life})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(part.x1 - cam.x, part.y1 - cam.y);
      ctx.lineTo(part.x2 - cam.x, part.y2 - cam.y);
      ctx.stroke();
    } else {
      ctx.strokeStyle = part.color || `rgba(255, 210, 64, ${life})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(part.x - cam.x, part.y - cam.y, part.r * (1 - life), 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  if (state.mode === "pause") {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#f8e8c8";
    ctx.font = "800 32px system-ui";
    ctx.textAlign = "center";
    ctx.fillText("Paused", W / 2, H / 2);
  }

  drawMinimap();
}

function drawMinimap() {
  miniCtx.clearRect(0, 0, mini.width, mini.height);
  miniCtx.fillStyle = "rgba(6, 17, 17, 0.82)";
  miniCtx.fillRect(0, 0, mini.width, mini.height);
  miniCtx.strokeStyle = "rgba(70, 230, 220, 0.22)";
  miniCtx.strokeRect(8, 8, mini.width - 16, mini.height - 16);
  const scale = 0.028;
  const cx = mini.width / 2;
  const cy = mini.height / 2;
  miniCtx.fillStyle = "#45eef1";
  miniCtx.beginPath();
  miniCtx.moveTo(cx, cy - 6);
  miniCtx.lineTo(cx + 5, cy + 6);
  miniCtx.lineTo(cx - 5, cy + 6);
  miniCtx.closePath();
  miniCtx.fill();
  miniCtx.fillStyle = "#ee5a42";
  for (const e of state.enemies.slice(0, 90)) {
    const x = cx + (e.x - state.player.x) * scale;
    const y = cy + (e.y - state.player.y) * scale;
    if (x > 8 && x < mini.width - 8 && y > 8 && y < mini.height - 8) miniCtx.fillRect(x - 2, y - 2, 4, 4);
  }
  miniCtx.fillStyle = "#e8b64a";
  for (const item of state.pickups) {
    const x = cx + (item.x - state.player.x) * scale;
    const y = cy + (item.y - state.player.y) * scale;
    if (x > 8 && x < mini.width - 8 && y > 8 && y < mini.height - 8) miniCtx.fillRect(x - 1, y - 1, 2, 2);
  }
}

function loop(now) {
  const dt = (now - last) / 1000 || 0;
  last = now;
  update(dt);
  draw();
  raf = requestAnimationFrame(loop);
}

function setupInput() {
  window.addEventListener("keydown", (e) => {
    keys.add(e.code);
    if (e.code === "Escape" || e.code === "KeyP") pauseToggle();
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));

  window.addEventListener("pointerdown", (e) => {
    if (state?.mode !== "play" || e.target.closest("button")) return;
    pointer.active = true;
    pointer.id = e.pointerId;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.dx = 0;
    pointer.dy = 0;
    ui.touchStick.classList.add("active");
    ui.touchStick.style.left = `${pointer.x - 59}px`;
    ui.touchStick.style.top = `${pointer.y - 59}px`;
  });
  window.addEventListener("pointermove", (e) => {
    if (!pointer.active || e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    const len = Math.hypot(dx, dy);
    const max = 45;
    pointer.dx = clamp(dx / max, -1, 1);
    pointer.dy = clamp(dy / max, -1, 1);
    if (len > max) {
      pointer.dx = dx / len;
      pointer.dy = dy / len;
    }
    ui.touchStick.firstElementChild.style.transform = `translate(${pointer.dx * max}px, ${pointer.dy * max}px)`;
  });
  const endPointer = (e) => {
    if (e.pointerId !== pointer.id) return;
    pointer.active = false;
    pointer.id = null;
    pointer.dx = 0;
    pointer.dy = 0;
    ui.touchStick.classList.remove("active");
    ui.touchStick.firstElementChild.style.transform = "translate(0, 0)";
  };
  window.addEventListener("pointerup", endPointer);
  window.addEventListener("pointercancel", endPointer);
}

ui.startBtn.addEventListener("click", startRun);
ui.restartBtn.addEventListener("click", startRun);
ui.pauseBtn.addEventListener("click", pauseToggle);
ui.muteBtn.addEventListener("click", () => setMuted(!audio.muted));
setMuted(audio.muted);
window.addEventListener("resize", resize);

resize();
setupInput();
state = newState();
loadSprites().then(() => {
  last = performance.now();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(loop);
  updateHud();
});
