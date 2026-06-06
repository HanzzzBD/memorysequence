  // ── STATE ────────────────────────────────────────────────
  let sequence=[], playerIdx=0, score=0, level=1, lives=3, maxLives=3;
  let isPlaying=false, gameOver=false, soundOn=true;
  let username='';
  const SPEED=700, GAP=280;

  // ── AUDIO ────────────────────────────────────────────────
  const ctx = window.AudioContext ? new AudioContext() : null;
  function beep(freq=440, dur=0.12, type='sine', vol=0.3) {
    if (!soundOn || !ctx) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  function soundLit()     { beep(520, 0.15, 'sine'); }
  function soundCorrect() { beep(660, 0.1,  'sine'); }
  function soundWrong()   { beep(220, 0.3,  'sawtooth'); }
  function soundLevelUp() { [523,659,784].forEach((f,i)=>setTimeout(()=>beep(f,0.15),i*120)); }

  function toggleSound() {
    soundOn = !soundOn;
    document.getElementById('soundBtn').textContent = soundOn ? '🔊' : '🔇';
  }

  // ── GRID ─────────────────────────────────────────────────
  const grid = document.getElementById('grid');
  for (let i = 0; i < 9; i++) {
    const b = document.createElement('div');
    b.className = 'box no-hover';
    b.dataset.i = i;
    b.onclick = () => playerClick(i);
    grid.appendChild(b);
  }

  // ── HIGH SCORE ───────────────────────────────────────────
  function getHS() { return parseInt(localStorage.getItem('msq_hs')||'0'); }
  function setHS(v){ localStorage.setItem('msq_hs', v); }
  function refreshHS() {
    const hs = getHS();
    ['hsDisplay','hsDisplay2'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = hs;
    });
  }
  refreshHS();

  // ── START ─────────────────────────────────────────────────
  function startGame() {
    if (ctx && ctx.state === 'suspended') ctx.resume();
    const raw = document.getElementById('usernameInput').value;
    const name = raw.trim();
    if (!name) {  ('Username tidak boleh kosong!'); return; }
    if (name.length < 3) { showErr('Username minimal 3 karakter.'); return; }
    showErr('');

    username = name;
    maxLives = parseInt(document.getElementById('livesSelect').value);
    lives = maxLives; score = 0; level = 1; sequence = [];

    document.getElementById('usernameInput').disabled = true;
    document.getElementById('nameDisplay').textContent = name;
    document.getElementById('setupSection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'flex';

    renderLives();
    initLevel();
  }

  function showErr(msg) { document.getElementById('errMsg').textContent = msg; }

  // ── LEVEL ─────────────────────────────────────────────────
  function initLevel() {
    document.getElementById('levelDisplay').textContent = level;
    document.getElementById('scoreDisplay').textContent = score;
    setProgress(0);
    renderDots();
    setStatus('⏳ Get ready for Level ' + level + '...');
    setTimeout(nextSequence, 900);
  }

  function nextSequence() {
    sequence.push(Math.floor(Math.random() * 9));
    renderDots();
    playSequence();
  }

  // ── SEQUENCE PLAYBACK ─────────────────────────────────────
  async function playSequence() {
    isPlaying = true;
    setClickable(false);
    setStatus('👀 Watch carefully...');

    for (let i = 0; i < sequence.length; i++) {
      updateDot(i, 'current');
      await lightBox(sequence[i]);
      updateDot(i, 'done');
    }

    playerIdx = 0;
    renderDots();
    setClickable(true);
    setStatus('🖱️ Your turn! (' + sequence.length + ' langkah)');
    isPlaying = false;
  }

  function lightBox(idx) {
    return new Promise(res => {
      const b = boxes()[idx];
      b.classList.add('lit'); b.textContent = idx+1;
      soundLit();
      setTimeout(() => {
        b.classList.remove('lit'); b.textContent = '';
        setTimeout(res, GAP);
      }, SPEED);
    });
  }

  // ── PLAYER INPUT ──────────────────────────────────────────
  function playerClick(idx) {
    if (isPlaying || gameOver) return;
    const b = boxes()[idx];

    if (idx === sequence[playerIdx]) {
      b.classList.add('correct'); b.textContent = '✓';
      soundCorrect();
      setTimeout(() => { b.classList.remove('correct'); b.textContent=''; }, 300);

      playerIdx++;
      setProgress((playerIdx / sequence.length) * 100);

      if (playerIdx === sequence.length) {
        score += 10;
        level++;
        soundLevelUp();
        if (score > getHS()) setHS(score);
        refreshHS();
        setClickable(false);
        setStatus('✅ Mantap! Lanjut ke level ' + level + '...');
        setTimeout(() => {
          document.getElementById('levelDisplay').textContent = level;
          document.getElementById('scoreDisplay').textContent = score;
          setProgress(0);
          setTimeout(nextSequence, 400);
        }, 900);
      }
    } else {
      b.classList.add('wrong'); b.textContent = '✗';
      soundWrong();
      setTimeout(() => { b.classList.remove('wrong'); b.textContent=''; }, 500);

      lives--;
      renderLives();

      if (lives <= 0) {
        triggerGameOver();
      } else {
        setClickable(false);
        setStatus('❌ Salah! Sisa nyawa: ' + lives + ' — Sequence diulang...');
        playerIdx = 0;
        setProgress(0);
        setTimeout(() => playSequence(), 1200);
      }
    }
  }

  // ── GAME OVER ─────────────────────────────────────────────
  function triggerGameOver() {
    gameOver = true;
    setClickable(false);
    if (score > getHS()) setHS(score);
    refreshHS();

    document.getElementById('goName').textContent   = username;
    document.getElementById('goLevel').textContent  = level;
    document.getElementById('goScore').textContent  = score;
    document.getElementById('goHS').textContent     = 'High Score: ' + getHS();
    document.getElementById('goOverlay').classList.add('show');
    document.getElementById('restartBtn').style.display = 'block';
  }

  // ── RESTART / MENU ────────────────────────────────────────
  function restartGame() {
    sequence=[]; playerIdx=0; score=0; level=1;
    lives=maxLives; isPlaying=false; gameOver=false;
    document.getElementById('goOverlay').classList.remove('show');
    document.getElementById('restartBtn').style.display='none';
    document.getElementById('scoreDisplay').textContent=0;
    document.getElementById('levelDisplay').textContent=1;
    setProgress(0);
    renderLives();
    renderDots();
    initLevel();
  }

  function backToMenu() {
    document.getElementById('goOverlay').classList.remove('show');
    document.getElementById('gameSection').style.display='none';
    document.getElementById('setupSection').style.display='flex';
    document.getElementById('usernameInput').disabled=false;
    sequence=[]; playerIdx=0; score=0; level=1;
    lives=maxLives; isPlaying=false; gameOver=false;
    refreshHS();
  }

  // ── UI HELPERS ─────────────────────────────────────────────
  function boxes() { return grid.querySelectorAll('.box'); }

  function setClickable(on) {
    boxes().forEach(b => {
      b.style.pointerEvents = on ? 'auto' : 'none';
      b.classList.toggle('no-hover', !on);
    });
  }

  function setStatus(msg) { document.getElementById('statusBar').textContent = msg; }

  function setProgress(pct) {
    document.getElementById('progressBar').style.width = pct + '%';
  }

  function renderLives() {
    const el = document.getElementById('livesDisplay');
    el.innerHTML = '';
    for (let i=0;i<maxLives;i++){
      const span=document.createElement('span');
      span.textContent = i < lives ? '❤️' : '🖤';
      el.appendChild(span);
    }
  }

  function renderDots() {
    const el = document.getElementById('seqDots');
    el.innerHTML = '';
    for (let i=0;i<sequence.length;i++){
      const d=document.createElement('div');
      d.className='dot';
      el.appendChild(d);
    }
  }
    
  function updateDot(idx, state) {
    const dots = document.querySelectorAll('.dot');
    if (!dots[idx]) return;
    dots.forEach(d => d.classList.remove('current'));
    dots[idx].className = 'dot ' + state;
  }
