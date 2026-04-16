// ====== 初始資料 ======
const defaultNames = [
    "郭靖", "黃蓉", "楊過", "小龍女", "張無忌", "趙敏", "周芷若",
    "令狐沖", "任盈盈", "蕭峯", "段譽", "虛竹", "王語嫣", "韋小寶",
    "陳家洛", "胡斐", "苗若蘭", "黃藥師", "洪七公", "東方不敗",
    "岳靈珊", "阿朱", "郭芙", "小昭", "殷素素"
];

let pool = [];
let winners = [];
let drawnBallNumbers = new Set();
let isDrawing = false;
let isNameListVisible = true;
let settleTimer = 0;

// 音效控制
let audioEnabled = false;
let audioCtx = null;
let decorLightInterval = null;

// 物理設定
const svgConfig = {
    cx: 350, cy: 250, radius: 190,
    ballRadius: 15, ballCount: 49,
    tubeX: 350, tubeBottom: 430, tubeTop: 60
};
const markSixColors = ['#E23528', '#1D70B8', '#009045'];
let balls = [];
let animationFrameId;
let mixerAngle = 0;
let heartInterval = null;

// 效能：初始化時偵測手機一次
const isMobile = window.innerWidth < 768;

// 煙火尾跡顏色輔助（修正十六進制顏色變白的 bug）
function colorToRgba(color, alpha) {
    if (color.startsWith('#')) {
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    if (color.startsWith('hsl(')) return color.replace('hsl(', 'hsla(').replace(')', `,${alpha})`);
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
    return `rgba(255,255,255,${alpha})`;
}

// ====== 星空 Canvas ======
const starsCanvas = document.getElementById('starsCanvas');
const starsCtx = starsCanvas.getContext('2d');
let starsArr = [];

function initStars() {
    starsCanvas.width = window.innerWidth;
    starsCanvas.height = window.innerHeight;
    starsArr = [];
    for (let i = 0; i < (isMobile ? 50 : 120); i++) {
        starsArr.push({
            x: Math.random() * starsCanvas.width,
            y: Math.random() * starsCanvas.height * 0.7,
            r: Math.random() * 1.5 + 0.3,
            alpha: Math.random(),
            dAlpha: (Math.random() - 0.5) * 0.02,
            speed: Math.random() * 0.3 + 0.05
        });
    }
}

function drawStars() {
    starsCtx.clearRect(0, 0, starsCanvas.width, starsCanvas.height);
    starsArr.forEach(s => {
        s.alpha += s.dAlpha;
        if (s.alpha <= 0 || s.alpha >= 1) s.dAlpha *= -1;
        s.x -= s.speed;
        if (s.x < 0) s.x = starsCanvas.width;
        starsCtx.beginPath();
        starsCtx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        starsCtx.fillStyle = `rgba(255,255,255,${Math.max(0, Math.min(1, s.alpha))})`;
        starsCtx.fill();
    });
    // rAF 已由 mainLoop 驅動，此處不再自我排程
}

// ====== 煙火 / 彩帶 Canvas ======
const fwCanvas = document.getElementById('fireworksCanvas');
const fwCtx = fwCanvas.getContext('2d');
let fwParticles = [];
let confettiParticles = [];

// AUDIT FIX: reinitialise stars on resize so they don't disappear
function resizeCanvases() {
    fwCanvas.width = starsCanvas.width = window.innerWidth;
    fwCanvas.height = starsCanvas.height = window.innerHeight;
    initStars();
}
window.addEventListener('resize', resizeCanvases);

function launchFirework(x, y, color) {
    const count = 80 + Math.floor(Math.random() * 40);
    for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
        const speed = 3 + Math.random() * 6;
        fwParticles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            decay: 0.012 + Math.random() * 0.01,
            color: color || `hsl(${Math.random() * 360},100%,60%)`,
            size: 2 + Math.random() * 2,
            trail: []
        });
    }
}

function launchMultipleFireworks() {
    const colors = ['#ffd700', '#ff4444', '#44aaff', '#44ff88', '#ff88ff', '#ffaa44'];
    const positions = [
        [fwCanvas.width * 0.25, fwCanvas.height * 0.3],
        [fwCanvas.width * 0.75, fwCanvas.height * 0.25],
        [fwCanvas.width * 0.5, fwCanvas.height * 0.2],
        [fwCanvas.width * 0.2, fwCanvas.height * 0.45],
        [fwCanvas.width * 0.8, fwCanvas.height * 0.4],
    ];
    positions.forEach((pos, i) => {
        setTimeout(() => launchFirework(pos[0], pos[1], colors[i % colors.length]), i * 200);
    });
    setTimeout(() => {
        positions.forEach((pos, i) => {
            setTimeout(() => launchFirework(
                pos[0] + (Math.random() - 0.5) * 120,
                pos[1] + (Math.random() - 0.5) * 80,
                colors[(i + 3) % colors.length]
            ), i * 150);
        });
    }, 1200);
}

function launchConfetti() {
    const colors = ['#E23528', '#1D70B8', '#009045', '#fbbf24', '#f472b6', '#a78bfa', '#34d399'];
    for (let i = 0; i < 200; i++) {
        confettiParticles.push({
            x: fwCanvas.width * 0.3 + Math.random() * fwCanvas.width * 0.4,
            y: fwCanvas.height * 0.4,
            vx: (Math.random() - 0.5) * 12,
            vy: Math.random() * -14 - 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            w: 6 + Math.random() * 6,
            h: 10 + Math.random() * 8,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            life: 1,
            decay: 0.004 + Math.random() * 0.004
        });
    }
}

let fwWasActive = false;
function animateFireworks() {
    const isActive = fwParticles.length > 0 || confettiParticles.length > 0;
    // 無粒子時跳過整個 canvas 操作（效能優化）
    if (!isActive) {
        if (fwWasActive) fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);
        fwWasActive = false;
        return;
    }
    fwWasActive = true;
    fwCtx.clearRect(0, 0, fwCanvas.width, fwCanvas.height);

    fwParticles = fwParticles.filter(p => p.life > 0);
    fwParticles.forEach(p => {
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 5) p.trail.shift();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08;
        p.vx *= 0.98;
        p.life -= p.decay;

        p.trail.forEach((t, i) => {
            const alpha = (i / p.trail.length) * p.life * 0.5;
            fwCtx.beginPath();
            fwCtx.arc(t.x, t.y, p.size * 0.5, 0, Math.PI * 2);
            fwCtx.fillStyle = colorToRgba(p.color, alpha); // 修正：支援十六進制顏色
            fwCtx.fill();
        });

        fwCtx.globalAlpha = p.life;
        fwCtx.beginPath();
        fwCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        fwCtx.fillStyle = p.color;
        fwCtx.fill();
        fwCtx.globalAlpha = 1;
    });

    confettiParticles = confettiParticles.filter(p => p.life > 0);
    confettiParticles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.life -= p.decay;
        fwCtx.save();
        fwCtx.globalAlpha = p.life;
        fwCtx.translate(p.x, p.y);
        fwCtx.rotate(p.rotation);
        fwCtx.fillStyle = p.color;
        fwCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        fwCtx.restore();
    });
    // rAF 已由 mainLoop 驅動
}

// ====== 音頻引擎 ======
async function ensureAudioCtx() {
    // 若已 closed（例如被瀏覽器回收），重新建立
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // iOS Safari 必須 await resume，否則 currentTime 仍凍結
    if (audioCtx.state !== 'running') await audioCtx.resume();
    return audioCtx;
}

async function toggleAudio() {
    audioEnabled = !audioEnabled;
    syncAudioUI();
    if (audioEnabled) {
        try { await ensureAudioCtx(); } catch (e) { audioEnabled = false; syncAudioUI(); }
    } else {
        stopBgMusic();
        stopAudioKeepAlive();
    }
}

// ====== iOS AudioContext 保活 ======
// iOS 在無 active WebAudio node 時會 suspend context，導致 fanfare 靜音。
// 以一個幾乎靜音的振盪器（1Hz，增益極小）持續掛在 destination，
// 令 context 在整個抽獎過程保持 running 狀態。
let _keepAliveOsc = null;

function startAudioKeepAlive() {
    if (!audioCtx || _keepAliveOsc) return;
    try {
        const gain = audioCtx.createGain();
        gain.gain.value = 0.00001; // 人耳完全無法感知
        _keepAliveOsc = audioCtx.createOscillator();
        _keepAliveOsc.frequency.value = 1; // 1Hz 次聲波
        _keepAliveOsc.connect(gain);
        gain.connect(audioCtx.destination);
        _keepAliveOsc.start();
    } catch (e) { _keepAliveOsc = null; }
}

function stopAudioKeepAlive(delayMs = 0) {
    setTimeout(() => {
        try { if (_keepAliveOsc) { _keepAliveOsc.stop(); _keepAliveOsc = null; } }
        catch (e) { _keepAliveOsc = null; }
    }, delayMs);
}

// ====== MP3 背景音樂（淡入淡出）======
let bgFadeTimer = null;

function startBgMusic() {
    if (!audioEnabled) return;
    const el = document.getElementById('bgMusic');
    if (!el) return;
    clearInterval(bgFadeTimer); bgFadeTimer = null;
    el.currentTime = 0;
    el.volume = 0;
    el.play().catch(() => {}); // iOS 需在 user gesture 中呼叫
    startAudioKeepAlive(); // 啟動保活，防止 context 被 iOS suspend
    let vol = 0;
    bgFadeTimer = setInterval(() => {
        vol = Math.min(0.85, vol + 0.043); // ~1 秒淡入 (50ms × 20 步)
        el.volume = vol;
        if (vol >= 0.85) { clearInterval(bgFadeTimer); bgFadeTimer = null; }
    }, 50);
}

// fast=false: ~1 秒正常淡出；fast=true: ~250ms 快速淡出（得獎瞬間用）
function stopBgMusic(fast = false) {
    const el = document.getElementById('bgMusic');
    if (!el) return;
    clearInterval(bgFadeTimer);
    let vol = el.volume;
    const step = fast ? 0.17 : 0.043;
    bgFadeTimer = setInterval(() => {
        vol = Math.max(0, vol - step);
        el.volume = vol;
        if (vol <= 0) {
            el.pause();
            clearInterval(bgFadeTimer);
            bgFadeTimer = null;
        }
    }, 50);
}

function syncAudioUI() {
    const btn = document.getElementById('audioBtn');
    if (btn) {
        if (audioEnabled) {
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"></path></svg> 關閉音效`;
            btn.className = "w-full py-2 bg-green-500/50 hover:bg-green-500/80 rounded text-sm transition-colors border border-green-400 flex justify-center items-center gap-1 text-white";
        } else {
            btn.innerHTML = `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h2.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clip-rule="evenodd"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg> 開啟音效`;
            btn.className = "w-full py-2 bg-gray-500/50 hover:bg-gray-500/80 rounded text-sm transition-colors border border-gray-400 flex justify-center items-center gap-1 text-gray-200";
        }
    }
    const mainBtn = document.getElementById('audioBtnMain');
    if (mainBtn) {
        document.getElementById('audioIconOff').classList.toggle('hidden', audioEnabled);
        document.getElementById('audioIconOn').classList.toggle('hidden', !audioEnabled);
        mainBtn.classList.toggle('text-green-400', audioEnabled);
        mainBtn.classList.toggle('text-gray-300', !audioEnabled);
    }
}

// ====== 攪珠音樂（BPM=150 循環） ======
let drawMusicActive = false;
let drawMusicTimer = null;

function makeNoise(dur) {
    const ctx = audioCtx;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
}

function sched(freq, t, dur, vol, type = 'square', endFreq = null) {
    try {
        const ctx = audioCtx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(t); osc.stop(t + dur + 0.01);
    } catch (e) { }
}

function kick(t) { sched(110, t, 0.18, 0.35, 'sine', 28); }
function snare(t) {
    try {
        const ctx = audioCtx;
        const src = ctx.createBufferSource();
        src.buffer = makeNoise(0.14);
        const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.8;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
        src.connect(f); f.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + 0.15);
    } catch (e) { }
    sched(200, t, 0.1, 0.08, 'triangle', 80);
}
function hihat(t, vol = 0.055) {
    try {
        const ctx = audioCtx;
        const src = ctx.createBufferSource();
        src.buffer = makeNoise(0.04);
        const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 9000;
        const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        src.connect(f); f.connect(g); g.connect(ctx.destination);
        src.start(t); src.stop(t + 0.05);
    } catch (e) { }
}

function scheduleBar(barStart) {
    if (!drawMusicActive || !audioEnabled || !audioCtx) return;
    const B = 0.4; // 四分音符 (BPM 150)

    kick(barStart); kick(barStart + B * 2);
    snare(barStart + B); snare(barStart + B * 3);
    for (let i = 0; i < 8; i++) hihat(barStart + i * B * 0.5);

    const bass = [130.81, 196.00, 220.00, 196.00];
    bass.forEach((f, i) => sched(f, barStart + i * B, B * 0.85, 0.10, 'triangle'));

    const lead = [523.25, 659.25, 783.99, 1046.5, 783.99, 659.25, 880.00, 783.99];
    lead.forEach((f, i) => sched(f, barStart + i * B * 0.5, B * 0.4, 0.065, 'square'));

    sched(659.25, barStart, B * 1.8, 0.03, 'sine');
    sched(783.99, barStart + B * 2, B * 1.8, 0.03, 'sine');

    const nextBar = barStart + B * 4;
    const delay = (nextBar - audioCtx.currentTime) * 1000 - 60;
    drawMusicTimer = setTimeout(() => scheduleBar(nextBar), Math.max(10, delay));
}

function startDrawingMusic() {
    if (!audioEnabled) return;
    try { ensureAudioCtx(); } catch (e) { return; }
    stopDrawingMusic();
    drawMusicActive = true;
    scheduleBar(audioCtx.currentTime + 0.05);
}

function stopDrawingMusic() {
    drawMusicActive = false;
    if (drawMusicTimer) { clearTimeout(drawMusicTimer); drawMusicTimer = null; }
}

// ====== 得獎音樂（The_Final_Draw.mp3，首 20 秒，fade in/out）======
// 用 HTML <audio> 避免 iOS WebAudio context suspend 問題
let fanfareFadeTimer = null;
const FANFARE_MAX_VOL  = 0.92;
const FANFARE_PLAY_MS  = 5000;  // 播放總長（ms）
const FANFARE_FADEIN_MS  = 400;  // fade in 時長
const FANFARE_FADEOUT_MS = 1200; // fade out 時長，於結束前開始

function playFanfare() {
    if (!audioEnabled) return;
    const el = document.getElementById('fanfareMusic');
    if (!el) return;

    // iOS: 若 play() 在 user-gesture 之外被呼叫且 element 已預熱，仍可播放
    clearInterval(fanfareFadeTimer);
    el.currentTime = 0;
    el.volume = 0;
    el.play().catch(() => {});

    let elapsed = 0;
    fanfareFadeTimer = setInterval(() => {
        elapsed += 50;
        const fadeOutStart = FANFARE_PLAY_MS - FANFARE_FADEOUT_MS;

        if (elapsed <= FANFARE_FADEIN_MS) {
            // 淡入
            el.volume = Math.min(FANFARE_MAX_VOL, (elapsed / FANFARE_FADEIN_MS) * FANFARE_MAX_VOL);
        } else if (elapsed >= fadeOutStart) {
            // 淡出
            const pct = (elapsed - fadeOutStart) / FANFARE_FADEOUT_MS;
            el.volume = Math.max(0, FANFARE_MAX_VOL * (1 - pct));
        } else {
            el.volume = FANFARE_MAX_VOL;
        }

        if (elapsed >= FANFARE_PLAY_MS) {
            el.pause();
            el.currentTime = 0;
            el.volume = 0;
            clearInterval(fanfareFadeTimer);
            fanfareFadeTimer = null;
        }
    }, 50);
}

function stopFanfare() {
    const el = document.getElementById('fanfareMusic');
    if (!el) return;
    clearInterval(fanfareFadeTimer);
    fanfareFadeTimer = null;
    el.volume = 0;
    el.pause();
    el.currentTime = 0;
}

// ====== 裝飾燈跑馬燈 ======
function startDecoLights() {
    const lights = ['deco1', 'deco2', 'deco3', 'deco4', 'deco5', 'deco6'];
    let idx = 0;
    decorLightInterval = setInterval(() => {
        lights.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.setAttribute('opacity', '0.3');
        });
        const el = document.getElementById(lights[idx]);
        if (el) el.setAttribute('opacity', '1');
        idx = (idx + 1) % lights.length;
    }, 200);
}

// ====== 初始化 ======
window.onload = () => {
    resizeCanvases();
    loadState(); // 清除舊版遺留資料
    // 每次重載都使用預設25人名單，不保留上次紀錄
    document.getElementById('nameInput').value = defaultNames.join('\n');
    updatePool();
    initBalls();
    mainLoop(); // 單一主循環取代三個獨立 rAF
    startDecoLights();

    document.getElementById('winnerDisplay').addEventListener('click', closeWinner);
    document.getElementById('bigWinnerBall').addEventListener('click', e => e.stopPropagation());
};

// ====== 狀態持久化 ======
function saveState() {
    // 名單與得獎紀錄均不跨 session 保留，重載永遠從預設名單開始
}

function loadState() {
    try {
        // 清除舊版本可能遺留的 localStorage 資料
        localStorage.removeItem('luckydraw_names');
        localStorage.removeItem('luckydraw_winners');
    } catch (e) { }
}

// ====== 名單管理 ======
function updatePool() {
    if (isDrawing) return;
    const allNames = document.getElementById('nameInput').value
        .split('\n').map(n => n.trim()).filter(n => n !== '');

    // 按得獎次數去除（支援同名參與者）
    const wonCounts = {};
    winners.forEach(w => { wonCounts[w] = (wonCounts[w] || 0) + 1; });
    const remaining = [...allNames];
    for (const [name, count] of Object.entries(wonCounts)) {
        let removed = 0;
        for (let i = remaining.length - 1; i >= 0 && removed < count; i--) {
            if (remaining[i] === name) { remaining.splice(i, 1); removed++; }
        }
    }
    pool = remaining;

    const el = document.getElementById('poolCount');
    el.innerText = pool.length;
    el.classList.remove('pool-flash');
    void el.offsetWidth;
    el.classList.add('pool-flash');
    saveState();
    refreshNameDisplayList();
}

// ====== 名單顯示（已抽劃線、未抽白色）======
function refreshNameDisplayList() {
    const list = document.getElementById('nameDisplayList');
    if (!list) return;

    const allNames = document.getElementById('nameInput').value
        .split('\n').map(n => n.trim()).filter(n => n !== '');

    // 從後往前標記已抽者（與 updatePool 移除順序一致）
    const wonCounts = {};
    winners.forEach(w => { wonCounts[w] = (wonCounts[w] || 0) + 1; });
    const tempWon = { ...wonCounts };
    const drawn = new Array(allNames.length).fill(false);
    for (let i = allNames.length - 1; i >= 0; i--) {
        const n = allNames[i];
        if (tempWon[n] > 0) { drawn[i] = true; tempWon[n]--; }
    }

    list.innerHTML = '';
    allNames.forEach((name, i) => {
        const item = document.createElement('div');
        item.className = `name-item ${drawn[i] ? 'drawn' : 'remaining'}`;

        const dot = document.createElement('span');
        dot.className = 'name-status-dot';

        const label = document.createElement('span');
        label.className = 'name-label';
        label.textContent = name;

        item.appendChild(dot);
        item.appendChild(label);
        list.appendChild(item);
    });
}

// ====== 名單編輯模式切換 ======
function enterEditMode() {
    document.getElementById('nameDisplayList').classList.add('hidden');
    document.getElementById('nameInput').classList.remove('hidden');
    document.getElementById('editNamesBtn').classList.add('hidden');
    document.getElementById('confirmNamesBtn').classList.remove('hidden');
    document.getElementById('editHint').classList.remove('hidden');
    document.getElementById('nameInput').focus();
}

function confirmNames() {
    updatePool(); // 更新 pool 並刷新顯示列表
    document.getElementById('nameDisplayList').classList.remove('hidden');
    document.getElementById('nameInput').classList.add('hidden');
    document.getElementById('editNamesBtn').classList.remove('hidden');
    document.getElementById('confirmNamesBtn').classList.add('hidden');
    document.getElementById('editHint').classList.add('hidden');
}

function updateTitles() {
    const t1 = document.getElementById('titleInput1').value.trim();
    const t2 = document.getElementById('titleInput2').value.trim();
    if (t1) document.getElementById('mainTitle').textContent = t1;
    if (t2) document.getElementById('subTitle').textContent = t2;
}

function toggleHelp() {
    document.getElementById('helpModal').classList.toggle('open');
}

function toggleDrawer() {
    const panel = document.getElementById('sidePanel');
    const overlay = document.getElementById('drawerOverlay');
    const isHidden = panel.classList.contains('-translate-x-full');
    panel.classList.toggle('-translate-x-full', !isHidden);
    overlay.classList.toggle('hidden', !isHidden);
}

function toggleNameList() {
    isNameListVisible = !isNameListVisible;
    const container = document.getElementById('listContainer');
    const icon = document.getElementById('listToggleIcon');
    const panel = document.getElementById('listPanel');
    if (isNameListVisible) {
        container.style.display = 'flex';
        panel.classList.add('flex-1');
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>`;
    } else {
        container.style.display = 'none';
        panel.classList.remove('flex-1');
        icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>`;
    }
}

// ====== 初始化 SVG 小球 ======
function initBalls() {
    const group = document.getElementById('ballsGroup');
    group.innerHTML = '';
    balls = [];

    for (let i = 0; i < svgConfig.ballCount; i++) {
        const color = markSixColors[i % 3];
        const angle = Math.random() * Math.PI * 2;
        const r = Math.random() * (svgConfig.radius - svgConfig.ballRadius);
        const x = svgConfig.cx + r * Math.cos(angle);
        const y = svgConfig.cy + r * Math.sin(angle);

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', svgConfig.ballRadius);
        circle.setAttribute('fill', color);

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', '0'); text.setAttribute('y', '0');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', 'white');
        text.setAttribute('font-size', '14px');
        text.setAttribute('font-weight', 'bold');
        text.setAttribute('font-family', 'sans-serif');
        text.setAttribute('dy', '1px');
        text.textContent = i + 1;

        const highlight = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        highlight.setAttribute('r', svgConfig.ballRadius / 3);
        highlight.setAttribute('fill', 'rgba(255,255,255,0.4)');
        highlight.setAttribute('cx', -svgConfig.ballRadius / 3);
        highlight.setAttribute('cy', -svgConfig.ballRadius / 3);

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.appendChild(circle); g.appendChild(text); g.appendChild(highlight);
        group.appendChild(g);

        balls.push({
            x, y, vx: 0, vy: 0, color, number: i + 1,
            el: g, circleEl: circle, highlightEl: highlight, isWinning: false
        });
    }
    settleTimer = 180;
}

// ====== 物理動畫 ======
function animateBalls() {
    if (isDrawing) {
        mixerAngle += 20;
    } else if (settleTimer > 0) {
        settleTimer--;
    }

    const isFrozen = !isDrawing && settleTimer === 0;

    // 攪珠時才更新旋臂（減少非必要 DOM 寫入）
    if (isDrawing) {
        const mixer = document.getElementById('mixerArm');
        if (mixer) mixer.setAttribute('transform', `translate(${svgConfig.cx}, ${svgConfig.cy}) rotate(${mixerAngle})`);
    }

    // 靜止時跳過所有物理與 SVG 更新 — 最大效能節省
    if (isFrozen) return;

    balls.forEach(b => {
        if (b.isWinning) return;
        if (isDrawing) {
            b.vx += (Math.random() - 0.5) * 6;
            b.vy += (Math.random() - 0.5) * 6;
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
            if (speed > 16) { b.vx = (b.vx / speed) * 16; b.vy = (b.vy / speed) * 16; }
        } else {
            // 輕微重力（原 0.8 → 0.5）+ 水平擾動，自然下沉但不堆成緊密橫條
            b.vy += 0.5;
            b.vx += (Math.random() - 0.5) * 0.4;
            b.vx *= 0.87; b.vy *= 0.87;
        }

        b.x += b.vx; b.y += b.vy;
        const dx = b.x - svgConfig.cx;
        const dy = b.y - svgConfig.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > svgConfig.radius - svgConfig.ballRadius) {
            const nx = dx / dist, ny = dy / dist;
            const dot = b.vx * nx + b.vy * ny;
            if (dot > 0) {
                const r = isDrawing ? 0.9 : 0.1;
                b.vx -= (1 + r) * dot * nx;
                b.vy -= (1 + r) * dot * ny;
            }
            b.x = svgConfig.cx + nx * (svgConfig.radius - svgConfig.ballRadius);
            b.y = svgConfig.cy + ny * (svgConfig.radius - svgConfig.ballRadius);
        }
    });

    // 球與球碰撞：手機跳過以節省 CPU（O(n²) — acceptable for n=49 on desktop）
    if (!isMobile) {
        for (let i = 0; i < balls.length; i++) {
            for (let j = i + 1; j < balls.length; j++) {
                const b1 = balls[i], b2 = balls[j];
                if (b1.isWinning || b2.isWinning) continue;
                const dx = b2.x - b1.x, dy = b2.y - b1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const minD = svgConfig.ballRadius * 2;
                if (dist < minD && dist > 0) {
                    const overlap = minD - dist;
                    const nx = dx / dist, ny = dy / dist;
                    b1.x -= nx * overlap * 0.5; b1.y -= ny * overlap * 0.5;
                    b2.x += nx * overlap * 0.5; b2.y += ny * overlap * 0.5;
                    if (!isDrawing) {
                        const rvx = b2.vx - b1.vx, rvy = b2.vy - b1.vy;
                        const vel = rvx * nx + rvy * ny;
                        if (vel < 0) {
                            const imp = -(1 + 0.05) * vel / 2;
                            b1.vx -= imp * nx; b1.vy -= imp * ny;
                            b2.vx += imp * nx; b2.vy += imp * ny;
                        }
                    }
                }
            }
        }
    }

    balls.forEach(b => {
        if (!b.isWinning) b.el.setAttribute('transform', `translate(${b.x}, ${b.y})`);
    });
    // rAF 已由 mainLoop 驅動
}

// ====== 主循環（合三為一，減少 rAF 開銷）======
let _lastFrameTs = 0;
function mainLoop(ts) {
    // 手機限速 30fps（每幀至少間隔 33ms），桌面保持 60fps
    if (isMobile && ts - _lastFrameTs < 33) {
        animationFrameId = requestAnimationFrame(mainLoop);
        return;
    }
    _lastFrameTs = ts;
    drawStars();
    animateFireworks();
    animateBalls();
    animationFrameId = requestAnimationFrame(mainLoop);
}

// ====== 開始抽獎 ======
function startDraw() {
    updatePool();
    if (pool.length === 0) { alert("名單已空！請增加參與者。"); return; }

    balls.forEach(b => { if (!drawnBallNumbers.has(b.number)) b.isWinning = false; });
    isDrawing = true;

    const btn = document.getElementById('drawBtn');
    btn.disabled = true;
    btn.innerText = "攪珠中...";
    document.getElementById('machineLight').setAttribute('fill', '#fbbf24');

    const wrapper = document.getElementById('machineWrapper');
    wrapper.classList.add('machine-shaking', 'machine-glowing');
    document.getElementById('spotlightBeam').classList.remove('hidden');
    document.getElementById('decorRing1').setAttribute('opacity', '1');
    document.getElementById('decorRing2').setAttribute('opacity', '1');

    // 在 user gesture 中確保 AudioContext 恢復，並預熱 fanfare <audio> 元素
    // iOS 要求 play() 須在 user gesture 中首次呼叫，預熱後再 pause 即可解鎖
    if (audioEnabled) {
        ensureAudioCtx().catch(() => {});
        const fw = document.getElementById('fanfareMusic');
        if (fw) fw.play().then(() => fw.pause()).catch(() => {});
    }
    startBgMusic();

    heartInterval = setInterval(() => {
        const container = document.getElementById('heartsContainer');
        const heart = document.createElement('div');
        heart.innerText = ['❤️', '💖', '✨', '👍', '🎉', '🌟', '💫'][Math.floor(Math.random() * 7)];
        heart.className = 'heart-particle';
        heart.style.left = `${30 + Math.random() * 40}%`;
        heart.style.marginLeft = `${(Math.random() - 0.5) * 100}px`;
        container.appendChild(heart);
        setTimeout(() => heart.remove(), 2000);
    }, 150);

    setTimeout(() => extractBall(), 8000); // 搞珠時間延長至 8 秒（配合 MP3 前 ~10 秒）
}

// ====== 抽球動畫 ======
function extractBall() {
    isDrawing = false;
    settleTimer = 120;
    // 背景音樂繼續播放，製造緊張感直到得獎者揭曉——見 showResult()
    if (heartInterval) clearInterval(heartInterval);

    const wrapper = document.getElementById('machineWrapper');
    wrapper.classList.remove('machine-shaking', 'machine-glowing');
    document.getElementById('spotlightBeam').classList.add('hidden');
    document.getElementById('decorRing1').setAttribute('opacity', '0');
    document.getElementById('decorRing2').setAttribute('opacity', '0');

    const availableBalls = balls.filter(b => !drawnBallNumbers.has(b.number));

    if (availableBalls.length === 0) {
        drawnBallNumbers.clear();
        balls.forEach(b => { b.el.style.display = ''; });
        document.getElementById('drawnBallsBar').innerHTML = '';
        const btn = document.getElementById('drawBtn');
        btn.disabled = false;
        btn.innerText = "繼續攪珠";
        alert("49 個波已全部抽出，波號已重置，可繼續抽獎！");
        return;
    }

    const targetBall = availableBalls[Math.floor(Math.random() * availableBalls.length)];
    drawnBallNumbers.add(targetBall.number);
    targetBall.isWinning = true;
    // 立即隱藏球，避免「瞬移」到管底的視覺跳動
    targetBall.el.style.display = 'none';
    targetBall.x = svgConfig.tubeX;
    targetBall.y = svgConfig.tubeBottom;
    targetBall.el.setAttribute('transform', `translate(${targetBall.x}, ${targetBall.y})`);

    let upSpeed = 0, flashCount = 0;
    const suckInterval = setInterval(() => {
        targetBall.el.style.display = ''; // 開始移動時才顯示
        upSpeed += 0.5;
        targetBall.y -= upSpeed;
        targetBall.el.setAttribute('transform', `translate(${targetBall.x}, ${targetBall.y})`);

        if (audioEnabled && audioCtx && flashCount % 3 === 0) {
            const now = audioCtx.currentTime;
            const o = audioCtx.createOscillator();
            const g = audioCtx.createGain();
            o.type = 'sine';
            o.frequency.value = 400 + flashCount * 20;
            g.gain.setValueAtTime(0.05, now);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            o.connect(g); g.connect(audioCtx.destination);
            o.start(now); o.stop(now + 0.06);
        }
        flashCount++;

        if (targetBall.y < svgConfig.tubeTop) {
            clearInterval(suckInterval);
            showResult(targetBall.color, targetBall.number);
        }
    }, 20);
}

// ====== 顯示結果（姓名滾輪） ======
function showResult(ballColor, ballNumber) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const winnerName = pool[randomIndex];
    const winnerColor = ballColor;

    document.getElementById('winnerNumber').innerText = ballNumber;
    document.getElementById('winnerNumber').style.color =
        winnerColor === '#E23528' ? '#fca5a5' :
            winnerColor === '#1D70B8' ? '#93c5fd' : '#86efac';
    document.getElementById('bigWinnerBall').style.backgroundColor = winnerColor;
    document.getElementById('bigWinnerBall').style.color = winnerColor;

    document.getElementById('winnerDisplay').classList.add('active');

    const winnerTextEl = document.getElementById('winnerText');
    winnerTextEl.className = 'text-5xl md:text-7xl font-black text-center px-4 break-words leading-tight name-flashing';
    winnerTextEl.innerText = '???';

    let flashSpeed = 60, elapsed = 0;
    const totalFlashTime = 2000;
    const allNames = [...pool];

    function doFlash() {
        if (elapsed >= totalFlashTime) {
            winnerTextEl.classList.remove('name-flashing');
            winnerTextEl.classList.add('winner-name-reveal');
            winnerTextEl.innerText = winnerName;

            winners.push(winnerName);
            updatePool();
            updateWinnerList(winnerName, winnerColor, ballNumber);

            stopBgMusic(true); // 250ms 快速淡出，與得獎音樂 crossfade
            if (audioEnabled) playFanfare();
            stopAudioKeepAlive(FANFARE_PLAY_MS + 1000);
            launchMultipleFireworks();
            launchConfetti();

            const btn = document.getElementById('drawBtn');
            btn.disabled = false;
            btn.innerText = pool.length > 0 ? "繼續攪珠" : "攪珠結束";
            document.getElementById('machineLight').setAttribute('fill', '#ef4444');
            return;
        }
        const rnd = allNames[Math.floor(Math.random() * allNames.length)];
        winnerTextEl.innerText = rnd || '???';
        elapsed += flashSpeed;
        flashSpeed = Math.min(60 + elapsed * 0.08, 200);
        setTimeout(doFlash, flashSpeed);
    }
    setTimeout(doFlash, 300);
}

function closeWinner() {
    document.getElementById('winnerDisplay').classList.remove('active');
    stopFanfare(); // 關閉得獎畫面時淡出音樂
    balls.forEach(b => {
        if (drawnBallNumbers.has(b.number)) b.el.style.display = 'none';
    });
    refreshDrawnBallsBar();
    setTimeout(() => { fwParticles = []; confettiParticles = []; }, 3000);
}

function refreshDrawnBallsBar() {
    const bar = document.getElementById('drawnBallsBar');
    if (!bar) return;
    bar.innerHTML = '';
    drawnBallNumbers.forEach(num => {
        const ball = balls.find(b => b.number === num);
        if (!ball) return;
        const colorMap = { '#E23528': '#ef4444', '#1D70B8': '#3b82f6', '#009045': '#22c55e' };
        const hex = colorMap[ball.color] || ball.color;
        const el = document.createElement('div');
        el.style.cssText = `
            width:26px;height:26px;border-radius:50%;background:${hex};
            box-shadow:inset -3px -3px 6px rgba(0,0,0,0.5),inset 3px 3px 6px rgba(255,255,255,0.5);
            display:flex;align-items:center;justify-content:center;
            font-size:10px;font-weight:900;color:white;
            flex-shrink:0;border:1px solid rgba(255,255,255,0.4);
        `;
        el.textContent = num;
        el.title = `第 ${num} 號球`;
        bar.appendChild(el);
    });
}

// AUDIT FIX: use textContent for name to prevent XSS
function updateWinnerList(name, color, ballNumber) {
    const list = document.getElementById('winnerList');
    const li = document.createElement('li');
    li.className = 'bg-white/10 p-2 rounded flex items-center gap-3';
    const colorCode = color === '#E23528' ? 'bg-red-500' :
        color === '#1D70B8' ? 'bg-blue-600' : 'bg-green-600';

    const ball = document.createElement('div');
    ball.className = `w-7 h-7 rounded-full shadow-inner border border-white/50 flex-shrink-0 flex items-center justify-center ${colorCode}`;
    const ballNum = document.createElement('span');
    ballNum.className = 'text-white text-[10px] font-bold';
    ballNum.textContent = ballNumber;
    ball.appendChild(ballNum);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'font-bold text-lg';
    nameSpan.textContent = name; // textContent — safe against XSS

    li.appendChild(ball);
    li.appendChild(nameSpan);
    list.insertBefore(li, list.firstChild);
}

function clearWinners() {
    if (confirm("確定要清除所有中獎紀錄嗎？名單將會重置。")) {
        winners = [];
        drawnBallNumbers.clear();
        balls.forEach(b => { b.el.style.display = ''; b.isWinning = false; });
        document.getElementById('winnerList').innerHTML = '';
        document.getElementById('drawnBallsBar').innerHTML = '';
        updatePool();
        document.getElementById('drawBtn').innerText = "開始攪珠";
    }
}
