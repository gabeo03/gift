import Phaser from 'phaser';

// ============================================================
// DATA
// ============================================================
const QUESTIONS = [
  { q: "Ngày sinh của Nga?",             a: "6/7/2007" },
  { q: "Nga là người ở đâu",              a: "35" },
  { q: "Nga lấy mấy chồng",                     a: "4" },
  { q: "Nga có yêu anh không ?",         a: "co" },
 
];

// Boss definitions
const BOSSES = [
  {
    id: 'mini1',
    name: '🔴 Mini Boss – Dino Đỏ',
    after: 3,          // xuất hiện sau khi vượt 5 obstacle
    timer: 10,
    color: 0xdc2626,   // đỏ
    scale: 2.0,
    wings: false,
    shield: false,
  },
  {
    id: 'mini2',
    name: '🛡️ Mini Boss – Dino Khiên',
    after: 6,
    timer: 10,
    color: 0x2563eb,   // xanh dương
    scale: 2.0,
    wings: false,
    shield: true,
  },
  {
    id: 'final',
    name: '💀 SHADOW DINO – FINAL BOSS',
    after: 10,
    timer: 10,
    color: 0x1e1b4b,    // tím đen
    scale: 3.2,
    wings: true,
    shield: false,
  },
];

const OBSTACLE_INTERVAL = 1900;
const DISTANCE_INIT     = 100;
const DIST_WIN_REWARD   = 44;   // 3 boss x 34 = 102 → khoảng cách về 0
const DIST_FAIL_PENALTY = 12;
const MAX_FAIL          = 3;

const ST = {
  IDLE:'IDLE', RUNNING:'RUNNING', BOSS_WARNING:'BOSS_WARNING',
  QUESTION:'QUESTION', POWER:'POWER', HIT_BACK:'HIT_BACK',
  WIN:'WIN', LOSE:'LOSE',
};

let qPool = [...QUESTIONS], qUsed = [];
function pickQ() {
  if (!qPool.length) { qPool = [...qUsed]; qUsed = []; }
  const i = Phaser.Math.Between(0, qPool.length - 1);
  const q = qPool.splice(i, 1)[0]; qUsed.push(q); return q;
}

// ============================================================
// LOADING SCENE
// ============================================================
class LoadingScene extends Phaser.Scene {
  constructor() { super({ key: 'LoadingScene' }); }
  preload() {
    this.load.image('dino_male',   'assets/dino_male.png');
    this.load.image('dino_female', 'assets/dino_female.png');
    const W = this.scale.width, H = this.scale.height;
    const bg = this.add.graphics(), bar = this.add.graphics();
    bg.fillStyle(0x1e293b).fillRect(W*.25, H*.47, W*.5, 24);
    this.load.on('progress', v => {
      bar.clear(); bar.fillStyle(0x6366f1).fillRect(W*.25, H*.47, W*.5*v, 24);
    });
    this.add.text(W/2, H*.42, '💕 Loading Love Pursuit...', {
      fontSize:'28px', fill:'#f9a8d4', fontFamily:'Segoe UI'
    }).setOrigin(0.5);
  }
  create() { this.scene.start('GameScene'); }
}

// ============================================================
// GAME SCENE
// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  preload() {
    const g = this.make.graphics({ x:0, y:0, add:false });

    // Ground
    g.fillStyle(0x334155).fillRect(0,0,800,26);
    g.fillStyle(0x475569).fillRect(0,0,800,6);
    g.generateTexture('ground',800,26); g.clear();

    // Cactus obstacle
    g.fillStyle(0x16a34a);
    g.fillRect(18,0,16,80); g.fillRect(0,22,52,16);
    g.fillRect(0,14,18,14); g.fillRect(34,14,18,14);
    g.generateTexture('cactus',52,82); g.clear();

    // Rock obstacle
    g.fillStyle(0x94a3b8); g.fillEllipse(34,28,68,54);
    g.fillStyle(0x64748b); g.fillEllipse(22,22,30,22);
    g.fillStyle(0xe2e8f0); g.fillEllipse(44,16,14,10);
    g.generateTexture('rock',68,58); g.clear();

    // ---- BOSS TEXTURES ----

    // Mini Boss 1 – Dino đỏ to (body đơn giản)
    g.fillStyle(0xdc2626); g.fillEllipse(45,40,70,60);   // thân
    g.fillStyle(0xb91c1c); g.fillEllipse(45,55,60,40);   // bụng
    g.fillStyle(0xfca5a5); g.fillCircle(32,28,8); g.fillCircle(58,28,8); // mắt trắng
    g.fillStyle(0x7f1d1d); g.fillCircle(34,28,4); g.fillCircle(60,28,4); // ngươi
    g.fillStyle(0xef4444); g.fillRect(28,44,34,8); // miệng
    g.fillStyle(0xdc2626); g.fillTriangle(25,15,18,0,32,0); g.fillTriangle(65,15,58,0,72,0); // tai
    g.generateTexture('boss_mini1',90,70); g.clear();

    // Mini Boss 2 – Dino xanh có khiên
    g.fillStyle(0x1d4ed8); g.fillEllipse(45,40,70,60);
    g.fillStyle(0x1e40af); g.fillEllipse(45,55,60,40);
    g.fillStyle(0xbfdbfe); g.fillCircle(32,28,8); g.fillCircle(58,28,8);
    g.fillStyle(0x1e3a8a); g.fillCircle(34,28,4); g.fillCircle(60,28,4);
    g.generateTexture('boss_mini2',90,70); g.clear();

    // Shield ring (cho mini boss 2)
    g.lineStyle(10,0x38bdf8,1); g.strokeCircle(60,60,55);
    g.lineStyle(5,0x7dd3fc,0.6); g.strokeCircle(60,60,45);
    g.lineStyle(3,0xbae6fd,0.3); g.strokeCircle(60,60,35);
    g.generateTexture('shield_ring',120,120); g.clear();

    // Final Boss – Shadow Dino khổng lồ có cánh
    // Cánh trái
    g.fillStyle(0x312e81,0.9);
    g.fillTriangle(0,60,50,0,50,120);
    g.fillStyle(0x4338ca,0.7);
    g.fillTriangle(10,60,50,20,50,100);
    // Cánh phải
    g.fillStyle(0x312e81,0.9);
    g.fillTriangle(150,60,100,0,100,120);
    g.fillStyle(0x4338ca,0.7);
    g.fillTriangle(140,60,100,20,100,100);
    // Thân
    g.fillStyle(0x1e1b4b); g.fillEllipse(75,60,80,80);
    g.fillStyle(0x312e81); g.fillEllipse(75,70,65,55);
    // Mắt đỏ phát sáng
    g.fillStyle(0xff0000); g.fillCircle(60,50,10); g.fillCircle(90,50,10);
    g.fillStyle(0xff6666); g.fillCircle(60,50,5); g.fillCircle(90,50,5);
    // Sừng
    g.fillStyle(0x4c1d95);
    g.fillTriangle(60,20,52,0,68,0);
    g.fillTriangle(90,20,82,0,98,0);
    g.generateTexture('boss_final',150,120); g.clear();

    // Cloud
    g.fillStyle(0x94a3b8);
    g.fillEllipse(55,24,110,42); g.fillEllipse(95,18,88,34); g.fillEllipse(22,30,64,28);
    g.generateTexture('cloud',150,54); g.clear();

    // Fallbacks
    g.fillStyle(0x22c55e).fillRect(0,0,80,90); g.generateTexture('dino_fallback',80,90); g.clear();
    g.fillStyle(0xff69b4).fillRect(0,0,80,90); g.generateTexture('dino_female_fallback',80,90);
    g.destroy();
  }

  getKey(k) {
    return this.textures.exists(k) ? k
      : (k === 'dino_male' ? 'dino_fallback' : 'dino_female_fallback');
  }

  create() {
    this.st            = ST.IDLE;
    this.score         = 0;
    this.obsCleared    = 0;
    this.bossIndex     = 0;
    this.distance      = DISTANCE_INIT;
    this.failCount     = 0;
    this.timerSecs     = 0;
    this.timerEv       = null;
    this.currentQ      = null;
    this.bossSpr       = null;
    this.bossAura      = null;
    this.shieldSpr     = null;
    this.wingL         = null;
    this.wingR         = null;
    this.obstacleTimer = null;
    this.obstacleSpeed = -300;
    qPool = [...QUESTIONS]; qUsed = [];

    const W = this.scale.width, H = this.scale.height;

    // BG gradient
    const bgGfx = this.add.graphics();
    bgGfx.fillGradientStyle(0x0f172a,0x0f172a,0x1e293b,0x1e293b,1);
    bgGfx.fillRect(0,0,W,H);

    // Stars
    for (let i = 0; i < 70; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0,W), Phaser.Math.Between(0,H*.65),
        Phaser.Math.Between(1,3), 0xffffff, Phaser.Math.FloatBetween(0.15,0.85)
      );
      this.tweens.add({ targets:s, alpha:0.05, duration:Phaser.Math.Between(800,2800), yoyo:true, repeat:-1 });
    }

    // Clouds
    this.clouds = [];
    for (let i = 0; i < 5; i++) {
      const c = this.add.image((W/5)*i+70, Phaser.Math.Between(40,130), 'cloud').setAlpha(0.35);
      this.clouds.push(c);
    }

    // Ground
    this.ground = this.physics.add.staticImage(W/2, H*.966, 'ground')
      .setDisplaySize(W,26).refreshBody();

    // Female dino (crush)
    const femKey = this.getKey('dino_female');
    this.female = this.add.image(W*.82, H*.84, femKey);
    const fs = Math.min(110/this.female.width, 120/this.female.height);
    this.female.setScale(fs).setFlipX(true).setDepth(2);

    // Male dino (player)
    const maleKey = this.getKey('dino_male');
    this.dino = this.physics.add.sprite(W*.13, H*.84, maleKey);
    const ds = Math.min(110/this.dino.width, 120/this.dino.height);
    this.dino.setScale(ds).setCollideWorldBounds(true).setDepth(3);
    this.physics.add.collider(this.dino, this.ground);

    // Obstacles group
    this.obstacles = this.physics.add.group();
    this.physics.add.overlap(this.dino, this.obstacles, this.onDinoHit, null, this);

    // Input
    this.cursors  = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // ---- UI ----
    this.add.text(W/2, 14, '💕 Khoảng cách đến Crush', {
      fontSize:'15px', fill:'#f9a8d4', fontFamily:'Segoe UI'
    }).setOrigin(0.5,0).setDepth(10);
    this.add.rectangle(W/2, 42, W*.7, 16, 0x1e293b).setDepth(10);
    this.distBar = this.add.rectangle(W/2-W*.35, 42, W*.7, 16, 0xec4899)
      .setOrigin(0,0.5).setDepth(11);
    this.distBarShine = this.add.rectangle(W/2-W*.35, 38, W*.7, 6, 0xfce7f3, 0.4)
      .setOrigin(0,0.5).setDepth(12);

    this.scoreTxt = this.add.text(16,16,'Score: 0',{
      fontSize:'20px', fill:'#f1f5f9', fontFamily:'Segoe UI'
    }).setDepth(10);
    this.obsTxt = this.add.text(W-16,16,'🌵 0/5',{
      fontSize:'18px', fill:'#fbbf24', fontFamily:'Segoe UI'
    }).setOrigin(1,0).setDepth(10);
    this.failTxt = this.add.text(W-16,44,'🤍🤍🤍',{
      fontSize:'22px', fill:'#f43f5e', fontFamily:'Segoe UI'
    }).setOrigin(1,0).setDepth(10);

    // Start hint
    this.hintText = this.add.text(W/2, H/2,
      '💕 LOVE PURSUIT\n\nNhấn SPACE để bắt đầu', {
      fontSize:'30px', fill:'#fde68a', fontFamily:'Segoe UI', fontStyle:'bold',
      backgroundColor:'#0f172a', padding:{x:28,y:18}, align:'center'
    }).setOrigin(0.5).setDepth(20);

    const startFn = () => {
      if (this.st !== ST.IDLE) return;
      this.hintText.destroy(); this.hintText = null;
      this.st = ST.RUNNING;
      this.startObstacleTimer();
    };
    this.spaceKey.once('down', startFn);
    this.cursors.up.once('down', startFn);

    // HTML overlay
    document.getElementById('submit-btn').onclick = () => this.checkAnswer();
    document.getElementById('answer-input').onkeydown = e => {
      if (e.key === 'Enter') this.checkAnswer();
    };

    this.updateDistBar();
    this.updateFailUI();
  }

  // ============================================================
  startObstacleTimer() {
    if (this.obstacleTimer) this.obstacleTimer.remove();
    this.obstacleTimer = this.time.addEvent({
      delay: OBSTACLE_INTERVAL, callback: this.spawnObstacle,
      callbackScope: this, loop: true,
    });
  }

  stopObstacleTimer() {
    if (this.obstacleTimer) { this.obstacleTimer.remove(); this.obstacleTimer = null; }
  }

  update() {
    if (this.st !== ST.RUNNING) return;

    if ((this.cursors.up.isDown || this.spaceKey.isDown) && this.dino.body.blocked.down) {
      this.dino.setVelocityY(-640);
    }

    this.obstacleSpeed = Math.max(-620, -300 - Math.floor(this.score/15)*14);
    this.clouds.forEach(c => { c.x -= 0.8; if (c.x < -90) c.x = this.scale.width + 90; });

    this.obstacles.getChildren().forEach(o => {
      if (o.x < -120 && !o.counted) {
        o.counted = true;
        this.onObstacleCleared();
        o.destroy();
      }
    });

    this.score += 0.05;
    this.scoreTxt.setText(`Score: ${Math.floor(this.score)}`);
  }

  // ============================================================
  spawnObstacle() {
    if (this.st !== ST.RUNNING) return;
    const W = this.scale.width, H = this.scale.height;
    const type = Phaser.Utils.Array.GetRandom(['cactus','rock','cactus']);
    const obs  = this.obstacles.create(W + 80, H * 0.875, type);
    obs.obsType = type; obs.counted = false;
    obs.setVelocityX(this.obstacleSpeed);
    obs.body.allowGravity = false;
    obs.body.immovable    = true;
  }

  onObstacleCleared() {
    this.obsCleared++;
    const nextBoss = BOSSES[this.bossIndex] || null;
    if (!nextBoss) { this.obsTxt.setText('🏁 All bosses cleared!'); return; }
    this.obsTxt.setText(`🌵 ${this.obsCleared}/${nextBoss.after}`);

    if (this.obsCleared >= nextBoss.after) {
      this.time.delayedCall(300, () => this.triggerBossWarning());
    }
  }

  // ============================================================
  // BOSS WARNING
  triggerBossWarning() {
    if (this.st !== ST.RUNNING) return;
    this.st = ST.BOSS_WARNING;
    this.stopObstacleTimer();
    this.physics.pause();
    this.obstacles.clear(true, true);

    const boss = BOSSES[this.bossIndex];
    const W = this.scale.width, H = this.scale.height;

    this.cameras.main.shake(700, 0.02);

    const ov = this.add.rectangle(W/2, H/2, W, H, 0x000000, 0).setDepth(18);
    this.tweens.add({ targets:ov, alpha:0.6, duration:500 });

    const wt = this.add.text(W/2, H*.32, '⚠️  BOSS APPEARS!', {
      fontSize:'46px', fill:'#fde047', fontFamily:'Segoe UI', fontStyle:'bold',
      stroke:'#92400e', strokeThickness:6
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({ targets:wt, alpha:1, duration:280, yoyo:true, repeat:2 });

    const nt = this.add.text(W/2, H*.50, boss.name, {
      fontSize:'32px', fill:'#f9a8d4', fontFamily:'Segoe UI', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({ targets:nt, alpha:1, duration:400, delay:400 });

    this.time.delayedCall(2400, () => {
      ov.destroy(); wt.destroy(); nt.destroy();
      this.spawnBoss();
    });
  }

  // ============================================================
  // SPAWN BOSS
  spawnBoss() {
    this.st = ST.QUESTION;
    const boss = BOSSES[this.bossIndex];
    const W = this.scale.width, H = this.scale.height;

    // Boss texture key
    const texKey = boss.id === 'mini1' ? 'boss_mini1'
                 : boss.id === 'mini2' ? 'boss_mini2'
                 : 'boss_final';

    // Cánh (final boss)
    if (boss.wings) {
      this.wingL = this.add.triangle(
        W*.58 - 100, H*.36,
        0,60, 80,0, 80,120,
        0x312e81, 0.85
      ).setDepth(6);
      this.wingR = this.add.triangle(
        W*.58 + 100, H*.36,
        0,60, -80,0, -80,120,
        0x312e81, 0.85
      ).setDepth(6);
      // Vỗ cánh
      this.tweens.add({ targets:this.wingL, scaleY:0.5, duration:400, yoyo:true, repeat:-1, ease:'Sine.easeInOut' });
      this.tweens.add({ targets:this.wingR, scaleY:0.5, duration:400, yoyo:true, repeat:-1, ease:'Sine.easeInOut', delay:200 });
    }

    // Boss sprite
    this.bossSpr = this.add.image(W + 120, H * (boss.id==='final'?0.36:0.42), texKey)
      .setScale(boss.scale).setDepth(8);
    this.tweens.add({ targets:this.bossSpr, x:W*.60, duration:1000, ease:'Back.easeOut' });

    // Shield (mini2)
    if (boss.shield) {
      this.shieldSpr = this.add.image(W + 120, H*.42, 'shield_ring')
        .setScale(2.6).setDepth(7).setAlpha(0.88);
      this.tweens.add({ targets:this.shieldSpr, x:W*.60, duration:1000, ease:'Back.easeOut' });
      this.tweens.add({ targets:this.shieldSpr, angle:360, duration:3500, repeat:-1, ease:'Linear' });
    }

    // Aura glow quanh boss
    const auraColor = boss.id==='final' ? 0x7c3aed : (boss.id==='mini1' ? 0xdc2626 : 0x2563eb);
    this.bossAura = this.add.circle(W*.60, H*(boss.id==='final'?0.36:0.42), 80, auraColor, 0.22).setDepth(7);
    this.tweens.add({ targets:this.bossAura, scaleX:1.5, scaleY:1.5, alpha:0.06, duration:600, yoyo:true, repeat:-1 });

    // Sync aura/wings position with boss on entry
    this.time.delayedCall(1100, () => {
      if (this.bossAura) { this.bossAura.x = W*.60; }
      if (this.shieldSpr) { this.shieldSpr.x = W*.60; }
      this.askQuestion();
    });
  }

  // ============================================================
  // ASK QUESTION (1 câu duy nhất mỗi boss)
  askQuestion() {
    const boss = BOSSES[this.bossIndex];
    this.currentQ = pickQ();

    document.getElementById('question-text').textContent = this.currentQ.q;
    document.getElementById('answer-input').value   = '';
    document.getElementById('feedback').textContent = '';

    const bossColors = { mini1:'#dc2626', mini2:'#2563eb', final:'#7c3aed' };
    document.getElementById('question-box').style.borderColor = bossColors[boss.id];

    document.getElementById('question-overlay').style.display = 'flex';
    this.startTimer(boss.timer);
    setTimeout(() => document.getElementById('answer-input').focus(), 80);
  }

  startTimer(secs) {
    if (this.timerEv) { this.timerEv.remove(); this.timerEv = null; }
    this.timerSecs = secs;
    this.refreshTimer();
    this.timerEv = this.time.addEvent({
      delay: 1000, loop: true, callback: () => {
        this.timerSecs--;
        this.refreshTimer();
        if (this.timerSecs <= 0) {
          this.timerEv.remove(); this.timerEv = null;
          this.onTimeout();
        }
      }
    });
  }

  refreshTimer() {
    const boss = BOSSES[this.bossIndex] || BOSSES[BOSSES.length-1];
    const col  = this.timerSecs <= 3 ? '#f43f5e' : '#fbbf24';
    document.getElementById('question-progress').innerHTML =
      `⚔️ ${boss.name} &nbsp;|&nbsp; ` +
      `⏱️ <span style="color:${col};font-weight:bold">${this.timerSecs}s</span>`;
  }

  onTimeout() {
    document.getElementById('feedback').style.color = '#f59e0b';
    document.getElementById('feedback').textContent = '⏰ Hết giờ!';
    this.time.delayedCall(800, () => this.processWrong());
  }

  // ============================================================
  checkAnswer() {
    if (this.st !== ST.QUESTION) return;
    if (this.timerEv) { this.timerEv.remove(); this.timerEv = null; }

    const userAns = document.getElementById('answer-input').value.trim().toLowerCase();
    const correct = this.currentQ.a.toLowerCase();
    const fb      = document.getElementById('feedback');

    if (userAns === correct) {
      fb.style.color = '#16a34a';
      fb.textContent = '✅ Đúng! POWER UP! 💥';
      this.time.delayedCall(700, () => {
        document.getElementById('question-overlay').style.display = 'none';
        document.getElementById('question-box').style.borderColor = '';
        this.triggerPower();
      });
    } else {
      fb.style.color = '#dc2626';
      fb.textContent = `❌ Sai! Đáp án: "${this.currentQ.a}"`;
      this.time.delayedCall(1100, () => this.processWrong());
    }
  }

  processWrong() {
    document.getElementById('question-overlay').style.display = 'none';
    document.getElementById('question-box').style.borderColor = '';
    this.failCount++;
    this.updateFailUI();
    if (this.failCount >= MAX_FAIL) {
      this.triggerLose();
    } else {
      this.triggerHitBack();
    }
  }

  // ============================================================
  // POWER MODE – Boss tự nổ
  triggerPower() {
    this.st = ST.POWER;
    const W = this.scale.width, H = this.scale.height;
    const boss = BOSSES[this.bossIndex];

    // Dino phát sáng
    const auraColor = boss.id === 'final' ? 0xa855f7 : 0xff69b4;
    const playerAura = this.add.circle(this.dino.x, this.dino.y, 80, auraColor, 0.3).setDepth(2);
    this.tweens.add({ targets:playerAura, scaleX:1.7, scaleY:1.7, alpha:0.1, duration:350, yoyo:true, repeat:-1 });
    this.dino.setTint(0xffc0cb);

    // Slow-mo
    this.time.timeScale  = 0.3;
    this.tweens.timeScale = 0.3;
    this.cameras.main.shake(800, 0.024);

    // Flash màu theo boss
    const flashColor = boss.id==='mini1' ? [255,50,50] : boss.id==='mini2' ? [50,100,255] : [120,0,200];
    const fl = this.add.rectangle(W/2,H/2,W,H, 0, 0).setDepth(17);
    fl.fillColor = (flashColor[0]<<16)|(flashColor[1]<<8)|flashColor[2];
    this.tweens.add({ targets:fl, alpha:0.35, duration:200, yoyo:true, onComplete:()=>fl.destroy() });

    // Boss nổ tung sau 0.9s slow-mo
    this.time.delayedCall(900, () => {
      this.time.timeScale  = 1;
      this.tweens.timeScale = 1;
      this.explodeBoss();
    });

    // Giảm khoảng cách crush
    this.distance = Math.max(0, this.distance - DIST_WIN_REWARD);
    this.updateDistBar();
    this.moveCrushCloser();

    // Text reward
    const rt = this.add.text(W/2, H*.28, `💕 -${DIST_WIN_REWARD} khoảng cách!`, {
      fontSize:'30px', fill:'#fde68a', fontFamily:'Segoe UI', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(16).setAlpha(0);
    this.tweens.add({ targets:rt, alpha:1, y:H*.22, duration:800, delay:300,
      onComplete:()=>this.tweens.add({ targets:rt, alpha:0, duration:500, delay:600, onComplete:()=>rt.destroy() })
    });

    this.time.delayedCall(3200, () => {
      playerAura.destroy();
      this.dino.clearTint();
      this.bossIndex++;

      if (this.distance <= 0) {
        this.triggerWin();
      } else {
        this.st = ST.RUNNING;
        this.physics.resume();
        this.startObstacleTimer();
      }
    });
  }

  // Boss nổ thành tim + hiệu ứng khác nhau theo loại
  explodeBoss() {
    if (!this.bossSpr) return;
    const boss = BOSSES[this.bossIndex] || BOSSES[BOSSES.length-1];
    const x = this.bossSpr.x, y = this.bossSpr.y;

    // Rung boss rồi nổ
    this.tweens.add({
      targets: this.bossSpr, scaleX: boss.scale*1.4, scaleY: boss.scale*1.4,
      alpha: 0, duration: 400, ease: 'Power3',
      onComplete: () => { if (this.bossSpr) { this.bossSpr.destroy(); this.bossSpr = null; } }
    });
    if (this.shieldSpr) {
      this.tweens.add({ targets:this.shieldSpr, alpha:0, scaleX:3, scaleY:3, duration:400,
        onComplete:()=>{ if(this.shieldSpr){this.shieldSpr.destroy();this.shieldSpr=null;} } });
    }
    if (this.bossAura) { this.bossAura.destroy(); this.bossAura = null; }
    if (this.wingL)    { this.tweens.add({ targets:this.wingL, alpha:0, duration:400, onComplete:()=>{ if(this.wingL){this.wingL.destroy();this.wingL=null;} } }); }
    if (this.wingR)    { this.tweens.add({ targets:this.wingR, alpha:0, duration:400, onComplete:()=>{ if(this.wingR){this.wingR.destroy();this.wingR=null;} } }); }

    // Mảnh vỡ + tim bay ra
    const ems     = ['💕','❤️','💖','💗','✨','💥','🌸','💫'];
    const colors  = boss.id==='mini1' ? [0xff4444,0xff8800,0xffcc00]
                  : boss.id==='mini2' ? [0x38bdf8,0x818cf8,0xffffff]
                  : [0xa855f7,0x6366f1,0xffffff,0xff00ff];
    const count   = boss.id==='final' ? 30 : 20;

    for (let i = 0; i < count; i++) {
      // Mảnh màu
      const p = this.add.circle(x, y, Phaser.Math.Between(6,16), Phaser.Utils.Array.GetRandom(colors)).setDepth(15);
      this.tweens.add({
        targets:p,
        x: x + Phaser.Math.Between(-220,220),
        y: y + Phaser.Math.Between(-180,120),
        alpha:0, scale:0,
        duration: Phaser.Math.Between(700,1300), ease:'Power2',
        onComplete:()=>p.destroy()
      });
      // Emoji tim
      if (i < 14) {
        const h = this.add.text(x, y, Phaser.Utils.Array.GetRandom(ems),
          { fontSize:`${Phaser.Math.Between(30,boss.id==='final'?70:50)}px` }
        ).setOrigin(0.5).setDepth(16);
        this.tweens.add({
          targets:h,
          x: x + Phaser.Math.Between(-200,200),
          y: y + Phaser.Math.Between(-200,80),
          alpha:0, scale:Phaser.Math.FloatBetween(0.6,1.8),
          duration:Phaser.Math.Between(900,1600), ease:'Power2',
          onComplete:()=>h.destroy()
        });
      }
    }

    // Flash màu theo boss
    const W = this.scale.width, H = this.scale.height;
    const fc = boss.id==='mini1'?0xff2222:boss.id==='mini2'?0x2563eb:0x7c3aed;
    const fl = this.add.rectangle(W/2,H/2,W,H,fc,0.4).setDepth(18);
    this.tweens.add({ targets:fl, alpha:0, duration:500, onComplete:()=>fl.destroy() });

    // Final boss: pháo hoa thêm
    if (boss.id === 'final') {
      this.createFireworks(4, x, y);
    }
  }

  moveCrushCloser() {
    const W   = this.scale.width;
    const pct = 1 - (this.distance / DISTANCE_INIT);
    const tx  = W * (0.82 - pct * 0.32);
    this.tweens.add({ targets:this.female, x:tx, duration:900, ease:'Power2' });
  }

  // ============================================================
  // HIT BACK
  triggerHitBack() {
    this.st = ST.HIT_BACK;
    const W = this.scale.width, H = this.scale.height;

    const fl = this.add.rectangle(W/2,H/2,W,H,0xff0000,0).setDepth(18);
    this.tweens.add({ targets:fl, alpha:0.4, duration:180, yoyo:true, onComplete:()=>fl.destroy() });

    this.physics.resume();
    this.dino.setVelocityX(200); this.dino.setVelocityY(-300);
    this.dino.setTint(0xff5555);
    this.time.delayedCall(600, () => { this.dino.setVelocityX(0); if(this.dino) this.dino.clearTint(); });

    this.distance = Math.min(DISTANCE_INIT, this.distance + DIST_FAIL_PENALTY);
    this.updateDistBar();
    this.moveCrushCloser();

    const tag = this.add.text(this.female.x, this.female.y - 70,
      `😤 +${DIST_FAIL_PENALTY}!`, {
      fontSize:'28px', fill:'#fca5a5', fontFamily:'Segoe UI', fontStyle:'bold'
    }).setOrigin(0.5).setDepth(16);
    this.tweens.add({ targets:tag, y:tag.y-60, alpha:0, duration:1200, onComplete:()=>tag.destroy() });

    if (this.bossSpr)   { this.bossSpr.destroy();   this.bossSpr   = null; }
    if (this.shieldSpr) { this.shieldSpr.destroy();  this.shieldSpr = null; }
    if (this.bossAura)  { this.bossAura.destroy();   this.bossAura  = null; }
    if (this.wingL)     { this.wingL.destroy();      this.wingL     = null; }
    if (this.wingR)     { this.wingR.destroy();      this.wingR     = null; }

    this.time.delayedCall(1800, () => {
      this.st = ST.RUNNING;
      this.physics.resume();
      this.startObstacleTimer();
    });
  }

  // ============================================================
  onDinoHit(dino, obstacle) {
    if (this.st !== ST.RUNNING) return;
    obstacle.destroy();
    this.cameras.main.shake(300, 0.015);
    this.dino.setTint(0xff4444);
    this.time.delayedCall(400, () => { if (this.dino) this.dino.clearTint(); });

    this.failCount++;
    this.updateFailUI();
    this.distance = Math.min(DISTANCE_INIT, this.distance + 5);
    this.updateDistBar();

    if (this.failCount >= MAX_FAIL) {
      this.stopObstacleTimer();
      this.physics.pause();
      this.time.delayedCall(600, () => this.triggerLose());
    }
  }

  updateDistBar() {
    const W   = this.scale.width;
    const pct = Math.max(0, this.distance / DISTANCE_INIT);
    this.distBar.setSize(W * 0.7 * pct, 16);
    this.distBarShine.setSize(W * 0.7 * pct, 6);
  }

  updateFailUI() {
    const done  = '💔'.repeat(this.failCount);
    const empty = '🤍'.repeat(Math.max(0, MAX_FAIL - this.failCount));
    this.failTxt.setText(done + empty);
  }

  // ============================================================
  // WIN
  triggerWin() {
    if (this.st === ST.WIN) return;
    this.st = ST.WIN;
    this.stopObstacleTimer();
    this.physics.pause();
    this.obstacles.clear(true, true);

    const W = this.scale.width, H = this.scale.height;

    // Slow-mo + dino lao tới
    this.time.timeScale  = 0.28;
    this.tweens.timeScale = 0.28;

    this.time.delayedCall(1400, () => {
      this.time.timeScale  = 1;
      this.tweens.timeScale = 1;
      this.physics.resume();
      this.dino.setVelocityX(0); this.dino.setVelocityY(0);

      this.tweens.add({
        targets: this.dino, x: this.female.x - 95,
        duration: 1200, ease: 'Power3.easeOut',
        onComplete: () => {
          this.physics.pause();
          this.female.setFlipX(true);

          // Bounce
          this.tweens.add({ targets:[this.dino,this.female], y:'-=26', duration:120, yoyo:true, repeat:5 });

          this.time.delayedCall(500, () => {
            // BIG HEART
            const cx = (this.dino.x + this.female.x) / 2;
            const bh = this.add.text(cx, this.dino.y - 80, '❤️', { fontSize:'190px' })
              .setOrigin(0.5).setDepth(14).setAlpha(0).setScale(0.1);
            this.tweens.add({ targets:bh, alpha:1, scale:1.8, duration:700, ease:'Back.easeOut',
              onComplete:()=>this.tweens.add({ targets:bh, scale:1.4, duration:500, yoyo:true, repeat:-1 }) });

            this.showHearts();
            this.createConfetti(90);
            this.createFireworks(8, W/2, H*0.3);

            // Pink bg
            const pink = this.add.rectangle(W/2,H/2,W,H,0xff69b4,0).setDepth(8);
            this.tweens.add({ targets:pink, alpha:0.3, duration:1500 });

            this.time.delayedCall(900, () => {
              const t1 = this.add.text(W/2, H*.08, '💕 Làm chồng thứ 4 của Nga! 💕', {
                fontSize:'54px', fill:'#fde68a', fontFamily:'Segoe UI', fontStyle:'bold',
                stroke:'#92400e', strokeThickness:6
              }).setOrigin(0.5).setDepth(15).setAlpha(0);
              this.tweens.add({ targets:t1, alpha:1, duration:700 });

              const t2 = this.add.text(W/2, H*.21,
                `Score: ${Math.floor(this.score)} 🌟  |  Vượt ${BOSSES.length} boss!`, {
                fontSize:'24px', fill:'#86efac', fontFamily:'Segoe UI'
              }).setOrigin(0.5).setDepth(15).setAlpha(0);
              this.tweens.add({ targets:t2, alpha:1, duration:700, delay:300 });

              this.tweens.add({ targets:[this.dino,this.female], x:'+=9', duration:350, yoyo:true, repeat:-1 });

              const btn = this.add.text(W/2, H*.88, '▶  Chơi lại', {
                fontSize:'26px', fill:'#fff', fontFamily:'Segoe UI',
                backgroundColor:'#6366f1', padding:{x:30,y:16}
              }).setOrigin(0.5).setDepth(15).setAlpha(0).setInteractive({ useHandCursor:true });
              btn.on('pointerover',()=>btn.setStyle({ backgroundColor:'#4f46e5' }));
              btn.on('pointerout', ()=>btn.setStyle({ backgroundColor:'#6366f1' }));
              btn.on('pointerdown',()=>{ qPool=[...QUESTIONS];qUsed=[];this.scene.restart(); });
              this.tweens.add({ targets:btn, alpha:1, duration:600, delay:1200 });
            });
          });
        }
      });
    });

    this.callRewardAPI(Math.floor(this.score));
  }

  // LOSE
  triggerLose() {
    if (this.st === ST.LOSE) return;
    this.st = ST.LOSE;
    this.stopObstacleTimer();
    this.physics.pause();
    document.getElementById('question-overlay').style.display = 'none';

    const W = this.scale.width, H = this.scale.height;
    this.cameras.main.shake(800, 0.028);

    const ov = this.add.rectangle(W/2,H/2,W,H,0x7f0000,0).setDepth(18);
    this.tweens.add({ targets:ov, alpha:0.72, duration:700 });

    const t1 = this.add.text(W/2, H*.32, '💔 Crush đã chạy xa...', {
      fontSize:'50px', fill:'#fca5a5', fontFamily:'Segoe UI', fontStyle:'bold',
      stroke:'#7f0000', strokeThickness:6
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({ targets:t1, alpha:1, duration:500 });

    const t2 = this.add.text(W/2, H*.47, 'Thất bại rồi 😭\nLần sau cố lên nhé!', {
      fontSize:'26px', fill:'#fecaca', fontFamily:'Segoe UI', align:'center'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({ targets:t2, alpha:1, duration:500, delay:300 });

    const btn = this.add.text(W/2, H*.65, '🔄 Thử lại', {
      fontSize:'26px', fill:'#fff', fontFamily:'Segoe UI',
      backgroundColor:'#dc2626', padding:{x:30,y:16}
    }).setOrigin(0.5).setDepth(19).setAlpha(0).setInteractive({ useHandCursor:true });
    btn.on('pointerover',()=>btn.setStyle({ backgroundColor:'#b91c1c' }));
    btn.on('pointerout', ()=>btn.setStyle({ backgroundColor:'#dc2626' }));
    btn.on('pointerdown',()=>{ qPool=[...QUESTIONS];qUsed=[];this.scene.restart(); });
    this.tweens.add({ targets:btn, alpha:1, duration:500, delay:700 });
  }

  // ============================================================
  showHearts() {
    const W = this.scale.width, H = this.scale.height;
    const ems = ['💕','❤️','💖','💗','💝','🌸','✨','💫','🎀','🥰'];
    for (let i = 0; i < 50; i++) {
      this.time.delayedCall(i * 65, () => {
        const h = this.add.text(
          Phaser.Math.Between(30, W-30), H * 0.92,
          Phaser.Utils.Array.GetRandom(ems),
          { fontSize:`${Phaser.Math.Between(28,64)}px` }
        ).setOrigin(0.5).setDepth(10);
        this.tweens.add({
          targets:h, y:Phaser.Math.Between(H*.04,H*.55),
          alpha:0, scale:Phaser.Math.FloatBetween(0.8,2.0),
          duration:Phaser.Math.Between(1800,3400), ease:'Power2',
          onComplete:()=>h.destroy()
        });
      });
    }
  }

  createConfetti(count = 60) {
    const W = this.scale.width, H = this.scale.height;
    const cols = [0xf43f5e,0xfbbf24,0x34d399,0x60a5fa,0xa78bfa,0xf9a8d4,0xfcd34d,0x4ade80];
    for (let i = 0; i < count; i++) {
      this.time.delayedCall(Phaser.Math.Between(0,3000), () => {
        const x = Phaser.Math.Between(0,W);
        const r = this.add.rectangle(x,-16,
          Phaser.Math.Between(8,22),Phaser.Math.Between(8,22),
          Phaser.Utils.Array.GetRandom(cols)
        ).setDepth(10);
        this.tweens.add({
          targets:r, y:H+80, x:x+Phaser.Math.Between(-130,130),
          angle:Phaser.Math.Between(0,720),
          duration:Phaser.Math.Between(2200,4500), ease:'Linear',
          onComplete:()=>r.destroy()
        });
      });
    }
  }

  createFireworks(count = 5, cx = null, cy = null) {
    const W = this.scale.width, H = this.scale.height;
    const cols = [0xff4444,0xffdd00,0x44ff88,0x44aaff,0xff44ff,0xffffff,0xff69b4];
    for (let fw = 0; fw < count; fw++) {
      this.time.delayedCall(fw * 300, () => {
        const fx = cx ? cx + Phaser.Math.Between(-200,200) : Phaser.Math.Between(W*.1,W*.9);
        const fy = cy ? cy + Phaser.Math.Between(-100,100) : Phaser.Math.Between(H*.1,H*.55);
        for (let i = 0; i < 24; i++) {
          const angle = ((Math.PI*2)/24)*i;
          const dist  = Phaser.Math.Between(80,180);
          const p = this.add.circle(fx,fy,Phaser.Math.Between(6,15),
            Phaser.Utils.Array.GetRandom(cols)).setDepth(11);
          this.tweens.add({
            targets:p,
            x:fx+Math.cos(angle)*dist, y:fy+Math.sin(angle)*dist,
            alpha:0, scale:0,
            duration:Phaser.Math.Between(700,1200), ease:'Power2',
            onComplete:()=>p.destroy()
          });
        }
      });
    }
  }

  callRewardAPI(score) {
    fetch('/api/claim-reward',{
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({ score, completedAt:new Date().toISOString() })
    }).then(r=>r.json()).then(d=>console.log('🎁',d)).catch(()=>{});
  }
}

// ============================================================
new Phaser.Game({
  type:    Phaser.AUTO,
  width:   window.innerWidth,
  height:  window.innerHeight,
  parent:  document.body,
  scale:   { mode:Phaser.Scale.RESIZE, autoCenter:Phaser.Scale.CENTER_BOTH },
  physics: { default:'arcade', arcade:{ gravity:{y:900}, debug:false } },
  scene:   [LoadingScene, GameScene],
});
