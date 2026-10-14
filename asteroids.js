/**
 * ASTEROIDS ARCADE (Standalone pure JS)
 * Para incluir no HTML: <script src="asteroids.js"></script>
 */

(function () {
  // -------------------------------------------------------------
  // 1. INJEÇÃO DE ESTILOS CSS
  // -------------------------------------------------------------
  const style = document.createElement('style');
  style.textContent = `
    * {
      box-sizing: border-box;
      user-select: none;
      -webkit-user-select: none;
      touch-action: manipulation;
    }
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #000;
      font-family: 'Courier New', Courier, monospace;
    }
    #asteroids-container {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      background: #050505;
    }
    #asteroids-canvas {
      background: #000;
      display: block;
      box-shadow: 0 0 20px rgba(0, 255, 204, 0.15);
    }
    .fs-btn {
      position: absolute;
      top: 15px;
      right: 15px;
      z-index: 100;
      background: rgba(0, 255, 204, 0.1);
      border: 1px solid #00ffcc;
      color: #00ffcc;
      padding: 8px 14px;
      font-family: monospace;
      font-size: 14px;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
    }
    .fs-btn:hover {
      background: #00ffcc;
      color: #000;
      box-shadow: 0 0 10px #00ffcc;
    }
    /* Touch UI Controls */
    #touch-controls {
      position: absolute;
      bottom: 15px;
      left: 0;
      width: 100%;
      display: none;
      justify-content: space-between;
      padding: 0 20px;
      pointer-events: none;
      z-index: 90;
    }
    .touch-group {
      display: flex;
      gap: 10px;
      pointer-events: auto;
    }
    .t-btn {
      width: 55px;
      height: 55px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(0, 255, 204, 0.5);
      color: #00ffcc;
      font-size: 18px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      touch-action: none;
    }
    .t-btn:active {
      background: rgba(0, 255, 204, 0.4);
      transform: scale(0.95);
    }
  `;
  document.head.appendChild(style);

  // -------------------------------------------------------------
  // 2. ESTRUTURA DOM DO JOGO
  // -------------------------------------------------------------
  const container = document.createElement('div');
  container.id = 'asteroids-container';

  const canvas = document.createElement('canvas');
  canvas.id = 'asteroids-canvas';

  const fsBtn = document.createElement('button');
  fsBtn.className = 'fs-btn';
  fsBtn.innerText = '⛶ FULLSCREEN';

  const touchControls = document.createElement('div');
  touchControls.id = 'touch-controls';
  touchControls.innerHTML = `
    <div class="touch-group">
      <div class="t-btn" id="btn-left">◄</div>
      <div class="t-btn" id="btn-right">►</div>
    </div>
    <div class="touch-group">
      <div class="t-btn" id="btn-thrust" style="border-color:#ffcc00; color:#ffcc00;">▲</div>
      <div class="t-btn" id="btn-fire" style="border-color:#ff3366; color:#ff3366;">●</div>
      <div class="t-btn" id="btn-hyperspace" style="font-size:10px;">HYPER</div>
    </div>
  `;

  container.appendChild(canvas);
  container.appendChild(fsBtn);
  container.appendChild(touchControls);

  // Anexa ao body ou substitui elemento alvo caso exista
  document.body.appendChild(container);

  const ctx = canvas.getContext('2d');

  // Detecta tela sensível ao toque
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    touchControls.style.display = 'flex';
  }

  // -------------------------------------------------------------
  // 3. SINTETIZADOR DE ÁUDIO (Web Audio API - Sem arquivos externos)
  // -------------------------------------------------------------
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playSound(type) {
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (type === 'laser') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === 'explode') {
      // Ruído branco sintetizado
      const bufferSize = audioCtx.sampleRate * 0.4;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(30, now + 0.4);

      noise.connect(filter);
      filter.connect(gain);

      gain.gain.setValueAtTime(0.4, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.4);

      noise.start(now);
      noise.stop(now + 0.4);
    } else if (type === 'thrust') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.linearRampToValueAtTime(40, now + 0.08);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'beat1') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'beat2') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(85, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    }
  }

  // -------------------------------------------------------------
  // 4. LÓGICA E ESTADOS DO JOGO
  // -------------------------------------------------------------
  const FPS = 60;
  const SHIP_SIZE = 24; // tamanho em pixels
  const ROTATE_SPEED = 360; // graus por segundo
  const SHIP_THRUST = 6; // aceleração
  const FRICTION = 0.985; // fricção espacial
  const LASER_SPEED = 700; // velocidade dos tiros
  const LASER_MAX = 8; // tiros máximos simultâneos
  const SHIP_EXPLODE_DUR = 0.3; // duração da explosão em seg.
  const SHIP_INV_DUR = 3; // duração da invulnerabilidade (seg)

  let score = 0;
  let highScore = localStorage.getItem('asteroids_highscore') || 0;
  let lives = 3;
  let level = 0;
  let gameState = 'START'; // 'START', 'PLAYING', 'GAMEOVER'
  let beatTimer = 0;
  let beatLow = true;

  // Objetos
  let ship;
  let asteroids = [];
  let lasers = [];
  let particles = [];

  // Teclas ativas
  const keys = {
    left: false,
    right: false,
    thrust: false,
    fire: false
  };

  // Redimensionamento de Tela / Responsive Fullscreen
  function resizeCanvas() {
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Fullscreen Handler
  function toggleFullscreen() {
    initAudio();
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.log(`Erro ao ativar tela cheia: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  }
  fsBtn.addEventListener('click', toggleFullscreen);

  // Criar Nave
  function newShip() {
    return {
      x: canvas.width / 2,
      y: canvas.height / 2,
      r: SHIP_SIZE / 2,
      a: (90 * Math.PI) / 180, // apontando para cima
      rot: 0,
      thrusting: false,
      thrust: { x: 0, y: 0 },
      explodeTime: 0,
      invulnerableTime: SHIP_INV_DUR * FPS,
      blinkTime: Math.ceil(0.1 * FPS),
      blinkNum: Math.ceil(SHIP_INV_DUR / 0.1)
    };
  }

  // Criar Campo de Asteroides
  function createAsteroidBelt() {
    asteroids = [];
    let numAsteroids = 4 + level * 2;
    let x, y;
    for (let i = 0; i < numAsteroids; i++) {
      do {
        x = Math.floor(Math.random() * canvas.width);
        y = Math.floor(Math.random() * canvas.height);
      } while (distBetweenPoints(canvas.width / 2, canvas.height / 2, x, y) < 150 + SHIP_SIZE);
      asteroids.push(newAsteroid(x, y, Math.ceil(SHIP_SIZE * 2)));
    }
  }

  function newAsteroid(x, y, r) {
    let lvlMult = 1 + level * 0.1;
    let speed = Math.random() * 50 * lvlMult + 20;
    let angle = Math.random() * Math.PI * 2;
    let vert = Math.floor(Math.random() * 6) + 8; // vértices
    let offsets = [];
    for (let i = 0; i < vert; i++) {
      offsets.push(Math.random() * 0.4 + 0.8);
    }

    return {
      x: x,
      y: y,
      xv: (speed * Math.cos(angle)) / FPS,
      yv: (speed * Math.sin(angle)) / FPS,
      r: r,
      a: angle,
      vert: vert,
      offsets: offsets
    };
  }

  function distBetweenPoints(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  // Disparo
  function shootLaser() {
    if (lasers.length < LASER_MAX && ship.explodeTime === 0) {
      lasers.push({
        x: ship.x + (4 / 3) * ship.r * Math.cos(ship.a),
        y: ship.y - (4 / 3) * ship.r * Math.sin(ship.a),
        xv: (LASER_SPEED * Math.cos(ship.a)) / FPS,
        yv: (-LASER_SPEED * Math.sin(ship.a)) / FPS,
        life: FPS * 1.2
      });
      playSound('laser');
    }
  }

  // Hiperespaço
  function hyperspace() {
    if (gameState !== 'PLAYING' || ship.explodeTime > 0) return;
    ship.x = Math.random() * canvas.width;
    ship.y = Math.random() * canvas.height;
    ship.thrust.x = 0;
    ship.thrust.y = 0;
    playSound('thrust');
  }

  // Criar partículas de explosão
  function createExplosion(x, y, count = 15) {
    for (let i = 0; i < count; i++) {
      let angle = Math.random() * Math.PI * 2;
      let speed = Math.random() * 100 + 20;
      particles.push({
        x: x,
        y: y,
        xv: (speed * Math.cos(angle)) / FPS,
        yv: (speed * Math.sin(angle)) / FPS,
        life: Math.random() * 30 + 10,
        maxLife: 40
      });
    }
    playSound('explode');
  }

  // Iniciar Novo Jogo
  function startGame() {
    score = 0;
    lives = 3;
    level = 0;
    ship = newShip();
    nextLevel();
    gameState = 'PLAYING';
  }

  function nextLevel() {
    level++;
    createAsteroidBelt();
  }

  function gameOver() {
    gameState = 'GAMEOVER';
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('asteroids_highscore', highScore);
    }
  }

  // -------------------------------------------------------------
  // 5. CONTROLES DE ENTRADA (Teclado e Touch)
  // -------------------------------------------------------------
  window.addEventListener('keydown', e => {
    initAudio();
    if (e.repeat) return;
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': keys.left = true; break;
      case 'ArrowRight': case 'KeyD': keys.right = true; break;
      case 'ArrowUp': case 'KeyW': keys.thrust = true; break;
      case 'Space':
        if (gameState === 'PLAYING') shootLaser();
        else if (gameState === 'START' || gameState === 'GAMEOVER') startGame();
        break;
      case 'ShiftLeft': case 'KeyH': hyperspace(); break;
      case 'KeyF': toggleFullscreen(); break;
    }
  });

  window.addEventListener('keyup', e => {
    switch (e.code) {
      case 'ArrowLeft': case 'KeyA': keys.left = false; break;
      case 'ArrowRight': case 'KeyD': keys.right = false; break;
      case 'ArrowUp': case 'KeyW': keys.thrust = false; break;
    }
  });

  // Eventos Touch nos botões na tela
  const bindTouch = (id, action) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    const start = (e) => { e.preventDefault(); initAudio(); action(true); };
    const end = (e) => { e.preventDefault(); action(false); };
    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
  };

  bindTouch('btn-left', val => keys.left = val);
  bindTouch('btn-right', val => keys.right = val);
  bindTouch('btn-thrust', val => keys.thrust = val);
  bindTouch('btn-fire', val => {
    if (val) {
      if (gameState === 'PLAYING') shootLaser();
      else startGame();
    }
  });
  bindTouch('btn-hyperspace', val => { if (val) hyperspace(); });

  // Clique no Canvas para iniciar
  canvas.addEventListener('click', () => {
    initAudio();
    if (gameState === 'START' || gameState === 'GAMEOVER') startGame();
  });

  // -------------------------------------------------------------
  // 6. LOOP PRINCIPAL DE ATUALIZAÇÃO E DESENHO
  // -------------------------------------------------------------
  function update() {
    // Som do batimento cadenciado de fundo
    if (gameState === 'PLAYING') {
      beatTimer++;
      let beatInterval = Math.max(20, 60 - level * 3);
      if (beatTimer >= beatInterval) {
        beatTimer = 0;
        playSound(beatLow ? 'beat1' : 'beat2');
        beatLow = !beatLow;
      }
    }

    // --- A. ATUALIZAR NAVE ---
    if (gameState === 'PLAYING') {
      let exploding = ship.explodeTime > 0;

      if (!exploding) {
        // Rotacionar Nave
        if (keys.left) ship.a += ((ROTATE_SPEED * Math.PI) / 180 / FPS);
        if (keys.right) ship.a -= ((ROTATE_SPEED * Math.PI) / 180 / FPS);

        // Aceleração da Nave
        if (keys.thrust) {
          ship.thrust.x += (SHIP_THRUST * Math.cos(ship.a)) / FPS;
          ship.thrust.y -= (SHIP_THRUST * Math.sin(ship.a)) / FPS;
          if (Math.random() < 0.3) playSound('thrust');

          // Partículas de Fogo na Propulsão
          particles.push({
            x: ship.x - ship.r * (4 / 3) * Math.cos(ship.a) + (Math.random() - 0.5) * 4,
            y: ship.y + ship.r * (4 / 3) * Math.sin(ship.a) + (Math.random() - 0.5) * 4,
            xv: -ship.thrust.x * 0.5 + (Math.random() - 0.5) * 2,
            yv: -ship.thrust.y * 0.5 + (Math.random() - 0.5) * 2,
            life: 12,
            maxLife: 12
          });
        }

        // Aplicação de Inércia e Fricção
        ship.thrust.x *= FRICTION;
        ship.thrust.y *= FRICTION;

        // Movimento da Nave
        ship.x += ship.thrust.x;
        ship.y += ship.thrust.y;

        // Warp das bordas da tela
        if (ship.x < 0 - ship.r) ship.x = canvas.width + ship.r;
        else if (ship.x > canvas.width + ship.r) ship.x = 0 - ship.r;
        if (ship.y < 0 - ship.r) ship.y = canvas.height + ship.r;
        else if (ship.y > canvas.height + ship.r) ship.y = 0 - ship.r;

        // Atualizar Invulnerabilidade
        if (ship.invulnerableTime > 0) {
          ship.invulnerableTime--;
        }
      } else {
        ship.explodeTime--;
        if (ship.explodeTime === 0) {
          lives--;
          if (lives === 0) {
            gameOver();
          } else {
            ship = newShip();
          }
        }
      }
    }

    // --- B. ATUALIZAR LASERS ---
    for (let i = lasers.length - 1; i >= 0; i--) {
      lasers[i].x += lasers[i].xv;
      lasers[i].y += lasers[i].yv;
      lasers[i].life--;

      // Bordas da tela
      if (lasers[i].x < 0) lasers[i].x = canvas.width;
      else if (lasers[i].x > canvas.width) lasers[i].x = 0;
      if (lasers[i].y < 0) lasers[i].y = canvas.height;
      else if (lasers[i].y > canvas.height) lasers[i].y = 0;

      if (lasers[i].life <= 0) {
        lasers.splice(i, 1);
      }
    }

    // --- C. ATUALIZAR ASTEROIDES ---
    for (let i = 0; i < asteroids.length; i++) {
      let a = asteroids[i];
      a.x += a.xv;
      a.y += a.yv;

      if (a.x < 0 - a.r) a.x = canvas.width + a.r;
      else if (a.x > canvas.width + a.r) a.x = 0 - a.r;
      if (a.y < 0 - a.r) a.y = canvas.height + a.r;
      else if (a.y > canvas.height + a.r) a.y = 0 - a.r;
    }

    // --- D. COLISÕES DE TIRO COM ASTEROIDES ---
    if (gameState === 'PLAYING') {
      for (let i = asteroids.length - 1; i >= 0; i--) {
        let ax = asteroids[i].x;
        let ay = asteroids[i].y;
        let ar = asteroids[i].r;

        for (let j = lasers.length - 1; j >= 0; j--) {
          let lx = lasers[j].x;
          let ly = lasers[j].y;

          if (distBetweenPoints(ax, ay, lx, ly) < ar) {
            // Destruir Asteroide
            createExplosion(ax, ay, Math.floor(ar / 2));

            // Divisão dos Asteroides em partes menores
            if (ar > SHIP_SIZE) {
              asteroids.push(newAsteroid(ax, ay, ar / 2));
              asteroids.push(newAsteroid(ax, ay, ar / 2));
              score += 20;
            } else {
              score += 50;
            }

            asteroids.splice(i, 1);
            lasers.splice(j, 1);

            // Passar de Fase
            if (asteroids.length === 0) {
              nextLevel();
            }
            break;
          }
        }
      }
    }

    // --- E. COLISÃO NAVE E ASTEROIDES ---
    if (gameState === 'PLAYING' && ship.explodeTime === 0 && ship.invulnerableTime === 0) {
      for (let i = 0; i < asteroids.length; i++) {
        let a = asteroids[i];
        if (distBetweenPoints(ship.x, ship.y, a.x, a.y) < ship.r + a.r) {
          createExplosion(ship.x, ship.y, 30);
          ship.explodeTime = Math.ceil(SHIP_EXPLODE_DUR * FPS);
          break;
        }
      }
    }

    // --- F. ATUALIZAR PARTÍCULAS ---
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].x += particles[i].xv;
      particles[i].y += particles[i].yv;
      particles[i].life--;
      if (particles[i].life <= 0) {
        particles.splice(i, 1);
      }
    }
  }

  // -------------------------------------------------------------
  // 7. RENDEREZAÇÃO / DESENHO (Estilo Neon Vector Arcade)
  // -------------------------------------------------------------
  function draw() {
    // Limpar Tela
    ctx.fillStyle = '#050508';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Linhas estéticas retro estilo Scanline
    ctx.strokeStyle = 'rgba(0, 255, 204, 0.02)';
    ctx.lineWidth = 1;
    for (let y = 0; y < canvas.height; y += 4) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Estilo dos Vetores
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00ffcc';
    ctx.strokeStyle = '#00ffcc';
    ctx.lineWidth = 1.8;

    // --- DESENHAR ASTEROIDES ---
    for (let i = 0; i < asteroids.length; i++) {
      let a = asteroids[i];
      ctx.beginPath();
      for (let j = 0; j < a.vert; j++) {
        let angle = (j * Math.PI * 2) / a.vert;
        let r = a.r * a.offsets[j];
        let x = a.x + r * Math.cos(angle);
        let y = a.y + r * Math.sin(angle);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }

    // --- DESENHAR LASERS ---
    ctx.fillStyle = '#ff3366';
    ctx.shadowColor = '#ff3366';
    for (let i = 0; i < lasers.length; i++) {
      ctx.beginPath();
      ctx.arc(lasers[i].x, lasers[i].y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // --- DESENHAR PARTÍCULAS ---
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
      let alpha = p.life / p.maxLife;
      ctx.fillStyle = `rgba(255, 204, 0, ${alpha})`;
      ctx.shadowColor = '#ffcc00';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Reset de Cores para a Nave
    ctx.shadowColor = '#00ffcc';
    ctx.strokeStyle = '#00ffcc';

    // --- DESENHAR NAVE ---
    if (gameState === 'PLAYING' && ship.explodeTime === 0) {
      let drawShip = true;
      if (ship.invulnerableTime > 0) {
        drawShip = Math.floor(ship.invulnerableTime / 5) % 2 === 0;
      }

      if (drawShip) {
        ctx.beginPath();
        // Bico
        ctx.moveTo(
          ship.x + (4 / 3) * ship.r * Math.cos(ship.a),
          ship.y - (4 / 3) * ship.r * Math.sin(ship.a)
        );
        // Traseira Esquerda
        ctx.lineTo(
          ship.x - ship.r * ((2 / 3) * Math.cos(ship.a) + Math.sin(ship.a)),
          ship.y + ship.r * ((2 / 3) * Math.sin(ship.a) - Math.cos(ship.a))
        );
        // Centro Traseiro
        ctx.lineTo(
          ship.x - ship.r * (2 / 3) * Math.cos(ship.a),
          ship.y + ship.r * (2 / 3) * Math.sin(ship.a)
        );
        // Traseira Direita
        ctx.lineTo(
          ship.x - ship.r * ((2 / 3) * Math.cos(ship.a) - Math.sin(ship.a)),
          ship.y + ship.r * ((2 / 3) * Math.sin(ship.a) + Math.cos(ship.a))
        );
        ctx.closePath();
        ctx.stroke();

        // Fogo da propulsão
        if (keys.thrust) {
          ctx.strokeStyle = '#ffcc00';
          ctx.shadowColor = '#ffcc00';
          ctx.beginPath();
          ctx.moveTo(
            ship.x - ship.r * (2 / 3) * Math.cos(ship.a),
            ship.y + ship.r * (2 / 3) * Math.sin(ship.a)
          );
          ctx.lineTo(
            ship.x - ship.r * (5 / 3) * Math.cos(ship.a),
            ship.y + ship.r * (5 / 3) * Math.sin(ship.a)
          );
          ctx.stroke();
          ctx.strokeStyle = '#00ffcc';
          ctx.shadowColor = '#00ffcc';
        }
      }
    }

    // --- HUD & INTERFACE ---
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#00ffcc';
    ctx.font = '16px monospace';

    // Pontuação
    ctx.textAlign = 'left';
    ctx.fillText(`PONTOS: ${score}`, 20, 35);
    ctx.fillText(`Fase: ${level}`, 20, 60);

    // Recorde (High Score)
    ctx.textAlign = 'right';
    ctx.fillText(`RECORDE: ${highScore}`, canvas.width - 20, 35);

    // Desenhar Vidas Restantes
    ctx.textAlign = 'left';
    for (let i = 0; i < lives; i++) {
      let lx = 25 + i * 20;
      let ly = 85;
      ctx.beginPath();
      ctx.moveTo(lx, ly - 10);
      ctx.lineTo(lx - 6, ly + 8);
      ctx.lineTo(lx + 6, ly + 8);
      ctx.closePath();
      ctx.stroke();
    }

    // Telas de Menu / Fim de Jogo
    if (gameState === 'START') {
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.font = '28px monospace';
      ctx.fillText('ASTEROIDS', canvas.width / 2, canvas.height / 2 - 50);

      ctx.font = '14px monospace';
      ctx.fillText('PRESSIONE ESPAÇO / TOQUE NA TELA PARA JOGAR', canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('CONTROLES: [A/D]Girar [W]Propulsão [ESPAÇO]Atirar [SHIFT]Hiperespaço [F]Fullscreen', canvas.width / 2, canvas.height / 2 + 50);
    } else if (gameState === 'GAMEOVER') {
      ctx.textAlign = 'center';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#ff3366';
      ctx.shadowColor = '#ff3366';
      ctx.font = '32px monospace';
      ctx.fillText('FIM DE JOGO', canvas.width / 2, canvas.height / 2 - 30);

      ctx.fillStyle = '#00ffcc';
      ctx.shadowColor = '#00ffcc';
      ctx.font = '16px monospace';
      ctx.fillText(`PONTUAÇÃO FINAL: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
      ctx.fillText('PRESSIONE ESPAÇO OU TOQUE PARA REINICIAR', canvas.width / 2, canvas.height / 2 + 50);
    }
  }

  // Loop do jogo (60 FPS)
  function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
  }

  // Inicializar Asteroides Iniciais na Tela de Início
  createAsteroidBelt();
  gameLoop();
})();
