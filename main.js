import Phaser from 'phaser';

const QUESTIONS = [
  { q: "Ngày sinh của Nga?",             a: "6/7/2007" },
  { q: "1",              a: "1" },
  { q: "5 × 6 = ?",                     a: "30" },
  { q: "HTML viết tắt của gì?",         a: "html" },
  { q: "10 - 3 = ?",                    a: "7" },
  { q: "Ngôn ngữ dùng đuôi .py?",       a: "python" },
  { q: "1 mét = ? cm",                  a: "100" },
  { q: "Căn bậc 2 của 144?",           a: "12" },
  { q: "2",  a: "2" },
  { q: "I love you = ?",               a: "3" },
];

const BOSSES = [
  { id:'mini1', name:'🔴 Mini Boss – Dino Đỏ',     after:5,  timer:12, scale:2.0, wings:false, shield:false },
  { id:'mini2', name:'🛡️ Mini Boss – Dino Khiên',  after:10, timer:10, scale:2.0, wings:false, shield:true  },
  { id:'final', name:'💀 SHADOW DINO – FINAL BOSS', after:15, timer:8,  scale:3.2, wings:true,  shield:false },
];

const OBSTACLE_INTERVAL = 1900;
const DISTANCE_INIT     = 100;
const DIST_WIN_REWARD   = 34;
const MAX_LIVES         = 3;

const ST = {
  IDLE:'IDLE', RUNNING:'RUNNING', BOSS_WARNING:'BOSS_WARNING',
  QUESTION:'QUESTION', POWER:'POWER', WIN:'WIN', LOSE:'LOSE',
};

let qPool = [...QUESTIONS], qUsed = [];
function pickQ() {
  if (!qPool.length) { qPool = [...qUsed]; qUsed = []; }
  const i = Phaser.Math.Between(0, qPool.length - 1);
  const q = qPool.splice(i,1)[0]; qUsed.push(q); return q;
}

// ============================================================
class LoadingScene extends Phaser.Scene {
  constructor() { super({ key:'LoadingScene' }); }
  preload() {
    this.load.image('dino_male',   'assets/dino_male.png');
    this.load.image('dino_female', 'assets/dino_female.png');
    this.load.audio('bgm',       'assets/music.mp3');
    this.load.audio('snd_jump',  'assets/jump.mp3');
    this.load.audio('snd_hit',   'assets/hit.mp3');
    this.load.audio('snd_win',   'assets/win.mp3');
    this.load.audio('snd_lose',  'assets/lose.mp3');
    this.load.audio('snd_boss',  'assets/boss.mp3');
    this.load.audio('snd_power', 'assets/power.mp3');
    const W=this.scale.width, H=this.scale.height;
    const bg=this.add.graphics(), bar=this.add.graphics();
    bg.fillStyle(0x1e293b).fillRect(W*.25,H*.47,W*.5,24);
    this.load.on('progress',v=>{bar.clear();bar.fillStyle(0x6366f1).fillRect(W*.25,H*.47,W*.5*v,24);});
    this.add.text(W/2,H*.42,'💕 Loading...',{fontSize:'24px',fill:'#f9a8d4',fontFamily:'Segoe UI'}).setOrigin(0.5);
  }
  create() { this.scene.start('GameScene'); }
}

// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super({ key:'GameScene' }); }

  playSfx(key, cfg={}) {
    try { if (this.cache.audio.exists(key)) this.sound.play(key, cfg); } catch(e){}
  }

  startBGM() {
    if (this.bgm) return;
    try {
      if (this.cache.audio.exists('bgm')) {
        this.bgm = this.sound.add('bgm', { loop:true, volume:0.38 });
        this.bgm.play();
      }
    } catch(e){}
  }

  preload() {
    const g = this.make.graphics({x:0,y:0,add:false});
    g.fillStyle(0x334155).fillRect(0,0,800,26); g.fillStyle(0x475569).fillRect(0,0,800,6);
    g.generateTexture('ground',800,26); g.clear();
    g.fillStyle(0x16a34a);
    g.fillRect(18,0,16,80); g.fillRect(0,22,52,16); g.fillRect(0,14,18,14); g.fillRect(34,14,18,14);
    g.generateTexture('cactus',52,82); g.clear();
    g.fillStyle(0x94a3b8); g.fillEllipse(34,28,68,54);
    g.fillStyle(0x64748b); g.fillEllipse(22,22,30,22);
    g.fillStyle(0xe2e8f0); g.fillEllipse(44,16,14,10);
    g.generateTexture('rock',68,58); g.clear();
    g.fillStyle(0xdc2626); g.fillEllipse(45,40,70,60); g.fillStyle(0xb91c1c); g.fillEllipse(45,55,60,40);
    g.fillStyle(0xfca5a5); g.fillCircle(32,28,8); g.fillCircle(58,28,8);
    g.fillStyle(0x7f1d1d); g.fillCircle(34,28,4); g.fillCircle(60,28,4);
    g.fillStyle(0xef4444); g.fillRect(28,44,34,8);
    g.fillStyle(0xdc2626); g.fillTriangle(25,15,18,0,32,0); g.fillTriangle(65,15,58,0,72,0);
    g.generateTexture('boss_mini1',90,70); g.clear();
    g.fillStyle(0x1d4ed8); g.fillEllipse(45,40,70,60); g.fillStyle(0x1e40af); g.fillEllipse(45,55,60,40);
    g.fillStyle(0xbfdbfe); g.fillCircle(32,28,8); g.fillCircle(58,28,8);
    g.fillStyle(0x1e3a8a); g.fillCircle(34,28,4); g.fillCircle(60,28,4);
    g.generateTexture('boss_mini2',90,70); g.clear();
    g.lineStyle(10,0x38bdf8,1); g.strokeCircle(60,60,55);
    g.lineStyle(5,0x7dd3fc,0.6); g.strokeCircle(60,60,45);
    g.lineStyle(3,0xbae6fd,0.3); g.strokeCircle(60,60,35);
    g.generateTexture('shield_ring',120,120); g.clear();
    g.fillStyle(0x312e81,0.9); g.fillTriangle(0,60,50,0,50,120);
    g.fillStyle(0x4338ca,0.7); g.fillTriangle(10,60,50,20,50,100);
    g.fillStyle(0x312e81,0.9); g.fillTriangle(150,60,100,0,100,120);
    g.fillStyle(0x4338ca,0.7); g.fillTriangle(140,60,100,20,100,100);
    g.fillStyle(0x1e1b4b); g.fillEllipse(75,60,80,80); g.fillStyle(0x312e81); g.fillEllipse(75,70,65,55);
    g.fillStyle(0xff0000); g.fillCircle(60,50,10); g.fillCircle(90,50,10);
    g.fillStyle(0xff6666); g.fillCircle(60,50,5); g.fillCircle(90,50,5);
    g.fillStyle(0x4c1d95); g.fillTriangle(60,20,52,0,68,0); g.fillTriangle(90,20,82,0,98,0);
    g.generateTexture('boss_final',150,120); g.clear();
    g.fillStyle(0x94a3b8); g.fillEllipse(55,24,110,42); g.fillEllipse(95,18,88,34); g.fillEllipse(22,30,64,28);
    g.generateTexture('cloud',150,54); g.clear();
    g.fillStyle(0x22c55e).fillRect(0,0,80,90); g.generateTexture('dino_fallback',80,90); g.clear();
    g.fillStyle(0xff69b4).fillRect(0,0,80,90); g.generateTexture('dino_female_fallback',80,90);
    g.destroy();
  }

  getKey(k) { return this.textures.exists(k)?k:(k==='dino_male'?'dino_fallback':'dino_female_fallback'); }

  create() {
    this.st            = ST.IDLE;
    this.score         = 0;
    this.obsCleared    = 0;
    this.bossIndex     = 0;
    this.distance      = DISTANCE_INIT;
    this.lives         = MAX_LIVES;
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
    this.bgm           = null;
    qPool=[...QUESTIONS]; qUsed=[];

    const W=this.scale.width, H=this.scale.height;

    const bgGfx=this.add.graphics();
    bgGfx.fillGradientStyle(0x0f172a,0x0f172a,0x1e293b,0x1e293b,1);
    bgGfx.fillRect(0,0,W,H);
    for(let i=0;i<70;i++){
      const st=this.add.circle(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H*.65),
        Phaser.Math.Between(1,3),0xffffff,Phaser.Math.FloatBetween(0.15,0.85));
      this.tweens.add({targets:st,alpha:0.05,duration:Phaser.Math.Between(800,2800),yoyo:true,repeat:-1});
    }
    this.clouds=[];
    for(let i=0;i<5;i++){
      const c=this.add.image((W/5)*i+70,Phaser.Math.Between(40,130),'cloud').setAlpha(0.35);
      this.clouds.push(c);
    }

    this.ground=this.physics.add.staticImage(W/2,H*.966,'ground').setDisplaySize(W,26).refreshBody();

    const femKey=this.getKey('dino_female');
    this.female=this.add.image(W+200,H*.84,femKey);
    const fs=Math.min(110/this.female.width,120/this.female.height);
    this.female.setScale(fs).setFlipX(false).setDepth(2).setVisible(false);

    const maleKey=this.getKey('dino_male');
    this.dino=this.physics.add.sprite(W*.13,H*.84,maleKey);
    const ds=Math.min(110/this.dino.width,120/this.dino.height);
    this.dino.setScale(ds).setCollideWorldBounds(true).setDepth(3);
    this.physics.add.collider(this.dino,this.ground);

    this.obstacles=this.physics.add.group();
    this.physics.add.overlap(this.dino,this.obstacles,this.onDinoHit,null,this);

    this.cursors =this.input.keyboard.createCursorKeys();
    this.spaceKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.input.on('pointerdown',()=>{
      this.startBGM();
      if(this.st===ST.QUESTION) return;
      if(this.st===ST.IDLE){this.startGame();return;}
      this.doJump();
    });
    this.spaceKey.on('down',()=>{ this.startBGM(); });
    this.cursors.up.on('down',()=>{ this.startBGM(); });

    // ── UI ──
    this.scoreTxt=this.add.text(12,10,'Score: 0',{
      fontSize:'18px',fill:'#f1f5f9',fontFamily:'Segoe UI',fontStyle:'bold'
    }).setDepth(10);

    this.muteBtn=this.add.text(W-12,10,'🔊',{fontSize:'22px'})
      .setOrigin(1,0).setDepth(20).setInteractive({useHandCursor:true});
    this.muteBtn.on('pointerdown',()=>this.toggleMute());

    this.add.text(W/2,38,'💕 Khoảng cách tình yêu 💕',{
      fontSize:'13px',fill:'#f9a8d4',fontFamily:'Segoe UI'
    }).setOrigin(0.5,0).setDepth(10);
    const barY=58;
    this.add.rectangle(W/2,barY,W*.72,14,0x1e293b).setDepth(10);
    this.distBar=this.add.rectangle(W/2-W*.36,barY,W*.72,14,0xec4899).setOrigin(0,0.5).setDepth(11);
    this.distBarShine=this.add.rectangle(W/2-W*.36,barY-3,W*.72,5,0xfce7f3,0.4).setOrigin(0,0.5).setDepth(12);

    const infoY=80;
    this.livesTxt=this.add.text(W/2-60,infoY,'❤️❤️❤️',{
      fontSize:'20px',fill:'#f43f5e',fontFamily:'Segoe UI'
    }).setOrigin(0.5,0).setDepth(10);
    this.obsTxt=this.add.text(W/2+60,infoY,'🌵 0/5',{
      fontSize:'14px',fill:'#fbbf24',fontFamily:'Segoe UI'
    }).setOrigin(0.5,0).setDepth(10);

 

    this.hintText=this.add.text(W/2,H/2,'💕 LOVE PURSUIT\n\nNhấn SPACE hoặc Tap để bắt đầu',{
      fontSize:'22px',fill:'#fde68a',fontFamily:'Segoe UI',fontStyle:'bold',
      backgroundColor:'#0f172a',padding:{x:20,y:14},align:'center'
    }).setOrigin(0.5).setDepth(20);

    this.spaceKey.once('down',()=>this.startGame());
    this.cursors.up.once('down',()=>this.startGame());

    document.getElementById('submit-btn').onclick=()=>this.checkAnswer();
    document.getElementById('answer-input').onkeydown=e=>{if(e.key==='Enter')this.checkAnswer();};

    this.updateDistBar(); this.updateLivesUI();
  }

  toggleMute(){
    if(!this.bgm){ this.muteBtn.setText('🔇'); return; }
    if(this.bgm.isPlaying){
      this.bgm.pause(); this.sound.mute=true; this.muteBtn.setText('🔇');
    } else {
      this.bgm.resume(); this.sound.mute=false; this.muteBtn.setText('🔊');
    }
  }

  startGame(){
    if(this.st!==ST.IDLE) return;
    if(this.hintText){this.hintText.destroy();this.hintText=null;}
    this.st=ST.RUNNING;
    this.startBGM();
    this.startObstacleTimer();
  }

  doJump(){
    if(this.dino&&this.dino.body&&this.dino.body.blocked.down){
      this.dino.setVelocityY(-640);
      this.playSfx('snd_jump',{volume:0.6});
    }
  }

  startObstacleTimer(){
    if(this.obstacleTimer) this.obstacleTimer.remove();
    this.obstacleTimer=this.time.addEvent({delay:OBSTACLE_INTERVAL,callback:this.spawnObstacle,callbackScope:this,loop:true});
  }
  stopObstacleTimer(){
    if(this.obstacleTimer){this.obstacleTimer.remove();this.obstacleTimer=null;}
  }

  update(){
    if(this.st!==ST.RUNNING) return;
    if((this.cursors.up.isDown||this.spaceKey.isDown)&&this.dino.body.blocked.down){
      this.dino.setVelocityY(-640);
      this.playSfx('snd_jump',{volume:0.6});
    }
    this.obstacleSpeed=Math.max(-620,-300-Math.floor(this.score/15)*14);
    this.clouds.forEach(c=>{c.x-=0.8;if(c.x<-90) c.x=this.scale.width+90;});
    this.obstacles.getChildren().forEach(o=>{
      if(o.x<-120&&!o.counted){o.counted=true;this.onObstacleCleared();o.destroy();}
    });
    this.score+=0.05;
    this.scoreTxt.setText(`Score: ${Math.floor(this.score)}`);
  }

  spawnObstacle(){
    if(this.st!==ST.RUNNING) return;
    const W=this.scale.width,H=this.scale.height;
    const type=Phaser.Utils.Array.GetRandom(['cactus','rock','cactus']);
    const obs=this.obstacles.create(W+80,H*.875,type);
    obs.counted=false;
    obs.setVelocityX(this.obstacleSpeed);
    obs.body.allowGravity=false; obs.body.immovable=true;
  }

  onObstacleCleared(){
    this.obsCleared++;
    const nb=BOSSES[this.bossIndex]||null;
    if(!nb){this.obsTxt.setText('🏁');return;}
    this.obsTxt.setText(`🌵 ${this.obsCleared}/${nb.after}`);
    if(this.obsCleared>=nb.after) this.time.delayedCall(300,()=>this.triggerBossWarning());
  }

  onDinoHit(dino,obstacle){
    if(this.st!==ST.RUNNING) return;
    obstacle.destroy();
    this.cameras.main.shake(280,0.013);
    this.dino.setTint(0xff4444);
    this.playSfx('snd_hit',{volume:0.7});
    this.time.delayedCall(380,()=>{if(this.dino) this.dino.clearTint();});
    this.lives--;
    this.updateLivesUI();
    if(this.lives<=0){
      this.stopObstacleTimer(); this.physics.pause();
      this.time.delayedCall(500,()=>this.triggerLose());
    }
  }

  updateDistBar(){
    const W=this.scale.width,pct=Math.max(0,this.distance/DISTANCE_INIT);
    this.distBar.setSize(W*.72*pct,14);
    this.distBarShine.setSize(W*.72*pct,5);
  }
  updateLivesUI(){
    const hearts='❤️'.repeat(this.lives)+'🖤'.repeat(Math.max(0,MAX_LIVES-this.lives));
    this.livesTxt.setText(hearts);
  }

  triggerBossWarning(){
    if(this.st!==ST.RUNNING) return;
    this.st=ST.BOSS_WARNING;
    this.stopObstacleTimer(); this.physics.pause(); this.obstacles.clear(true,true);
    if(this.bgm&&this.bgm.isPlaying) this.bgm.pause();
    this.playSfx('snd_boss',{volume:0.7});
    const boss=BOSSES[this.bossIndex];
    const W=this.scale.width,H=this.scale.height;
    this.cameras.main.shake(700,0.02);
    const ov=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(18);
    this.tweens.add({targets:ov,alpha:0.6,duration:500});
    const wt=this.add.text(W/2,H*.30,'⚠️  BOSS APPEARS!',{
      fontSize:'32px',fill:'#fde047',fontFamily:'Segoe UI',fontStyle:'bold',stroke:'#92400e',strokeThickness:4
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:wt,alpha:1,duration:280,yoyo:true,repeat:2});
    const nt=this.add.text(W/2,H*.45,boss.name,{
      fontSize:'24px',fill:'#f9a8d4',fontFamily:'Segoe UI',fontStyle:'bold'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:nt,alpha:1,duration:400,delay:400});
    const warnT=this.add.text(W/2,H*.56,'⚠️ Trả lời sai = Thua ngay!',{
      fontSize:'18px',fill:'#fca5a5',fontFamily:'Segoe UI',fontStyle:'bold'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:warnT,alpha:1,duration:400,delay:600});
    this.time.delayedCall(2600,()=>{ov.destroy();wt.destroy();nt.destroy();warnT.destroy();this.spawnBoss();});
  }

  spawnBoss(){
    this.st=ST.QUESTION;
    const boss=BOSSES[this.bossIndex];
    const W=this.scale.width,H=this.scale.height;
    const texKey=boss.id==='mini1'?'boss_mini1':boss.id==='mini2'?'boss_mini2':'boss_final';
    if(boss.wings){
      this.wingL=this.add.triangle(W*.58-100,H*.36,0,60,80,0,80,120,0x312e81,0.85).setDepth(6);
      this.wingR=this.add.triangle(W*.58+100,H*.36,0,60,-80,0,-80,120,0x312e81,0.85).setDepth(6);
      this.tweens.add({targets:this.wingL,scaleY:0.5,duration:400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.tweens.add({targets:this.wingR,scaleY:0.5,duration:400,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:200});
    }
    this.bossSpr=this.add.image(W+120,H*(boss.id==='final'?0.36:0.42),texKey).setScale(boss.scale).setDepth(8);
    this.tweens.add({targets:this.bossSpr,x:W*.60,duration:1000,ease:'Back.easeOut'});
    if(boss.shield){
      this.shieldSpr=this.add.image(W+120,H*.42,'shield_ring').setScale(2.6).setDepth(7).setAlpha(0.88);
      this.tweens.add({targets:this.shieldSpr,x:W*.60,duration:1000,ease:'Back.easeOut'});
      this.tweens.add({targets:this.shieldSpr,angle:360,duration:3500,repeat:-1,ease:'Linear'});
    }
    const auraColor=boss.id==='final'?0x7c3aed:boss.id==='mini1'?0xdc2626:0x2563eb;
    this.bossAura=this.add.circle(W*.60,H*(boss.id==='final'?0.36:0.42),80,auraColor,0.22).setDepth(7);
    this.tweens.add({targets:this.bossAura,scaleX:1.5,scaleY:1.5,alpha:0.06,duration:600,yoyo:true,repeat:-1});
    this.time.delayedCall(1100,()=>{
      if(this.bossAura) this.bossAura.x=W*.60;
      if(this.shieldSpr) this.shieldSpr.x=W*.60;
      this.askQuestion();
    });
  }

  askQuestion(){
    const boss=BOSSES[this.bossIndex];
    this.currentQ=pickQ();
    document.getElementById('question-text').textContent=this.currentQ.q;
    document.getElementById('answer-input').value='';
    document.getElementById('feedback').textContent='';
    const bossColors={mini1:'#dc2626',mini2:'#2563eb',final:'#7c3aed'};
    document.getElementById('question-box').style.borderColor=bossColors[boss.id];
    document.getElementById('question-overlay').style.display='flex';
    this.startTimer(boss.timer);
    setTimeout(()=>{
      const inp=document.getElementById('answer-input');
      inp.readOnly=true; inp.focus(); inp.readOnly=false;
    },300);
  }

  startTimer(secs){
    if(this.timerEv){this.timerEv.remove();this.timerEv=null;}
    this.timerSecs=secs; this.refreshTimer();
    this.timerEv=this.time.addEvent({delay:1000,loop:true,callback:()=>{
      this.timerSecs--; this.refreshTimer();
      if(this.timerSecs<=0){this.timerEv.remove();this.timerEv=null;this.onTimeout();}
    }});
  }
  refreshTimer(){
    const boss=BOSSES[this.bossIndex]||BOSSES[BOSSES.length-1];
    const col=this.timerSecs<=3?'#f43f5e':'#fbbf24';
    document.getElementById('question-progress').innerHTML=
      `⚔️ ${boss.name} &nbsp;|&nbsp; ⏱️ <span style="color:${col};font-weight:bold">${this.timerSecs}s</span>`;
  }
  onTimeout(){
    document.getElementById('feedback').style.color='#f59e0b';
    document.getElementById('feedback').textContent='⏰ Hết giờ! Thua rồi...';
    this.time.delayedCall(1000,()=>this.processWrong());
  }

  checkAnswer(){
    if(this.st!==ST.QUESTION) return;
    if(this.timerEv){this.timerEv.remove();this.timerEv=null;}
    const userAns=document.getElementById('answer-input').value.trim().toLowerCase();
    const correct=this.currentQ.a.toLowerCase();
    const fb=document.getElementById('feedback');
    if(userAns===correct){
      fb.style.color='#16a34a'; fb.textContent='✅ Đúng! POWER UP! 💥';
      this.playSfx('snd_power',{volume:0.8});
      this.time.delayedCall(700,()=>{
        document.getElementById('question-overlay').style.display='none';
        document.getElementById('question-box').style.borderColor='';
        this.triggerPower();
      });
    } else {
      fb.style.color='#dc2626'; fb.textContent=`❌ Sai! Đáp án: "${this.currentQ.a}" — Thua rồi!`;
      this.playSfx('snd_hit',{volume:0.8});
      this.time.delayedCall(1200,()=>this.processWrong());
    }
  }

  processWrong(){
    document.getElementById('question-overlay').style.display='none';
    document.getElementById('question-box').style.borderColor='';
    this.cleanupBoss();
    this.triggerLose();
  }
  cleanupBoss(){
    if(this.bossSpr){this.bossSpr.destroy();this.bossSpr=null;}
    if(this.shieldSpr){this.shieldSpr.destroy();this.shieldSpr=null;}
    if(this.bossAura){this.bossAura.destroy();this.bossAura=null;}
    if(this.wingL){this.wingL.destroy();this.wingL=null;}
    if(this.wingR){this.wingR.destroy();this.wingR=null;}
  }

  triggerPower(){
    this.st=ST.POWER;
    if(this.bgm&&!this.bgm.isPlaying&&!this.sound.mute) this.bgm.resume();
    const W=this.scale.width,H=this.scale.height;
    const boss=BOSSES[this.bossIndex];
    const auraColor=boss.id==='final'?0xa855f7:0xff69b4;
    const pAura=this.add.circle(this.dino.x,this.dino.y,80,auraColor,0.3).setDepth(2);
    this.tweens.add({targets:pAura,scaleX:1.7,scaleY:1.7,alpha:0.1,duration:350,yoyo:true,repeat:-1});
    this.dino.setTint(0xffc0cb);
    this.time.timeScale=0.3; this.tweens.timeScale=0.3;
    this.cameras.main.shake(800,0.024);
    this.time.delayedCall(900,()=>{
      this.time.timeScale=1; this.tweens.timeScale=1;
      this.explodeBoss();
    });
    this.distance=Math.max(0,this.distance-DIST_WIN_REWARD);
    this.updateDistBar();
    const rt=this.add.text(W/2,H*.28,`💕 -${DIST_WIN_REWARD} khoảng cách!`,{
      fontSize:'26px',fill:'#fde68a',fontFamily:'Segoe UI',fontStyle:'bold'
    }).setOrigin(0.5).setDepth(16).setAlpha(0);
    this.tweens.add({targets:rt,alpha:1,y:H*.22,duration:800,delay:300,
      onComplete:()=>this.tweens.add({targets:rt,alpha:0,duration:500,delay:600,onComplete:()=>rt.destroy()})});
    this.time.delayedCall(3200,()=>{
      pAura.destroy(); this.dino.clearTint(); this.bossIndex++;
      if(this.distance<=0) this.triggerWin();
      else{ this.st=ST.RUNNING; this.physics.resume(); this.startObstacleTimer(); }
    });
  }

  explodeBoss(){
    if(!this.bossSpr) return;
    const boss=BOSSES[this.bossIndex]||BOSSES[BOSSES.length-1];
    const x=this.bossSpr.x,y=this.bossSpr.y;
    this.tweens.add({targets:this.bossSpr,scaleX:boss.scale*1.4,scaleY:boss.scale*1.4,alpha:0,duration:400,ease:'Power3',
      onComplete:()=>{if(this.bossSpr){this.bossSpr.destroy();this.bossSpr=null;}}});
    if(this.shieldSpr){this.tweens.add({targets:this.shieldSpr,alpha:0,scaleX:3,scaleY:3,duration:400,
      onComplete:()=>{if(this.shieldSpr){this.shieldSpr.destroy();this.shieldSpr=null;}}});}
    if(this.bossAura){this.bossAura.destroy();this.bossAura=null;}
    if(this.wingL){this.tweens.add({targets:this.wingL,alpha:0,duration:400,onComplete:()=>{if(this.wingL){this.wingL.destroy();this.wingL=null;}}});}
    if(this.wingR){this.tweens.add({targets:this.wingR,alpha:0,duration:400,onComplete:()=>{if(this.wingR){this.wingR.destroy();this.wingR=null;}}});}
    const ems=['💕','❤️','💖','💗','✨','💥','🌸','💫'];
    const colors=boss.id==='mini1'?[0xff4444,0xff8800,0xffcc00]:boss.id==='mini2'?[0x38bdf8,0x818cf8,0xffffff]:[0xa855f7,0x6366f1,0xffffff,0xff00ff];
    const count=boss.id==='final'?30:20;
    for(let i=0;i<count;i++){
      const p=this.add.circle(x,y,Phaser.Math.Between(6,16),Phaser.Utils.Array.GetRandom(colors)).setDepth(15);
      this.tweens.add({targets:p,x:x+Phaser.Math.Between(-220,220),y:y+Phaser.Math.Between(-180,120),
        alpha:0,scale:0,duration:Phaser.Math.Between(700,1300),ease:'Power2',onComplete:()=>p.destroy()});
      if(i<14){
        const h=this.add.text(x,y,Phaser.Utils.Array.GetRandom(ems),
          {fontSize:`${Phaser.Math.Between(30,boss.id==='final'?70:50)}px`}).setOrigin(0.5).setDepth(16);
        this.tweens.add({targets:h,x:x+Phaser.Math.Between(-200,200),y:y+Phaser.Math.Between(-200,80),
          alpha:0,scale:Phaser.Math.FloatBetween(0.6,1.8),duration:Phaser.Math.Between(900,1600),ease:'Power2',onComplete:()=>h.destroy()});
      }
    }
    const W=this.scale.width,H=this.scale.height;
    const fc=boss.id==='mini1'?0xff2222:boss.id==='mini2'?0x2563eb:0x7c3aed;
    const fl=this.add.rectangle(W/2,H/2,W,H,fc,0.4).setDepth(18);
    this.tweens.add({targets:fl,alpha:0,duration:500,onComplete:()=>fl.destroy()});
    if(boss.id==='final') this.createFireworks(4,x,y);
  }

  // ============================================================
  // WIN – female dino chạy vào + nút 🎁 Nhận Quà → win.html
  // ============================================================
  triggerWin(){
    if(this.st===ST.WIN) return;
    this.st=ST.WIN;
    this.stopObstacleTimer(); this.physics.pause(); this.obstacles.clear(true,true);
    if(this.bgm) this.bgm.stop();
    this.playSfx('snd_win',{volume:0.9});
    const W=this.scale.width,H=this.scale.height;
    this.time.timeScale=0.3; this.tweens.timeScale=0.3;
    this.time.delayedCall(1000,()=>{
      this.time.timeScale=1; this.tweens.timeScale=1;
      const pink=this.add.rectangle(W/2,H/2,W,H,0xff69b4,0).setDepth(8);
      this.tweens.add({targets:pink,alpha:0.28,duration:1800});
      this.female.setVisible(true);
      this.female.setPosition(W+150,H*.84);
      this.female.setFlipX(true);
      const targetX=this.dino.x+this.dino.displayWidth*0.6;
      this.tweens.add({
        targets:this.female, x:targetX, duration:1400, ease:'Power3.easeOut',
        onComplete:()=>{
          this.physics.resume();
          this.dino.setVelocityX(0); this.dino.setVelocityY(0);
          this.physics.pause();
          this.tweens.add({targets:[this.dino,this.female],y:'-=28',duration:130,yoyo:true,repeat:5});
          this.time.delayedCall(400,()=>{
            const cx=(this.dino.x+this.female.x)/2;
            const bh=this.add.text(cx,this.dino.y-90,'❤️',{fontSize:'190px'})
              .setOrigin(0.5).setDepth(14).setAlpha(0).setScale(0.1);
            this.tweens.add({targets:bh,alpha:1,scale:1.8,duration:700,ease:'Back.easeOut',
              onComplete:()=>this.tweens.add({targets:bh,scale:1.4,duration:500,yoyo:true,repeat:-1})});
            this.tweens.add({targets:[this.dino,this.female],x:'+=10',duration:380,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
            this.showHearts(); this.createConfetti(90); this.createFireworks(10,W/2,H*.3);
            this.time.delayedCall(600,()=>{
              const t1=this.add.text(W/2,H*.07,'💕 Bắt kịp Crush rồi! 💕',{
                fontSize:'36px',fill:'#fde68a',fontFamily:'Segoe UI',fontStyle:'bold',stroke:'#92400e',strokeThickness:4
              }).setOrigin(0.5).setDepth(15).setAlpha(0);
              this.tweens.add({targets:t1,alpha:1,duration:700});

              const t2=this.add.text(W/2,H*.185,`Score: ${Math.floor(this.score)} 🌟  |  Vượt ${BOSSES.length} boss!`,{
                fontSize:'20px',fill:'#86efac',fontFamily:'Segoe UI'
              }).setOrigin(0.5).setDepth(15).setAlpha(0);
              this.tweens.add({targets:t2,alpha:1,duration:700,delay:300});

              // ── NÚT 🎁 NHẬN QUÀ → win.html ──
              const btnGift=this.add.text(W/2,H*.76,'🎁  Nhận Quà',{
                fontSize:'26px',fill:'#fff',fontFamily:'Segoe UI',fontStyle:'bold',
                backgroundColor:'#ec4899',padding:{x:34,y:18}
              }).setOrigin(0.5).setDepth(16).setAlpha(0).setInteractive({useHandCursor:true});
              // Pulse animation cho nút quà
              this.tweens.add({targets:btnGift,alpha:1,duration:600,delay:800,
                onComplete:()=>{
                  this.tweens.add({targets:btnGift,scale:1.06,duration:500,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
                }
              });
              btnGift.on('pointerover',()=>{ btnGift.setStyle({backgroundColor:'#db2777'}); });
              btnGift.on('pointerout', ()=>{ btnGift.setStyle({backgroundColor:'#ec4899'}); });
              btnGift.on('pointerdown',()=>{ window.location.href='win.html'; });

              // ── NÚT ▶ CHƠI LẠI ──
              const btnReplay=this.add.text(W/2,H*.88,'▶  Chơi lại',{
                fontSize:'20px',fill:'#cbd5e1',fontFamily:'Segoe UI',
                backgroundColor:'#334155',padding:{x:24,y:12}
              }).setOrigin(0.5).setDepth(15).setAlpha(0).setInteractive({useHandCursor:true});
              btnReplay.on('pointerover',()=>btnReplay.setStyle({backgroundColor:'#475569'}));
              btnReplay.on('pointerout', ()=>btnReplay.setStyle({backgroundColor:'#334155'}));
              btnReplay.on('pointerdown',()=>{qPool=[...QUESTIONS];qUsed=[];this.scene.restart();});
              this.tweens.add({targets:btnReplay,alpha:1,duration:500,delay:1400});
            });
          });
        }
      });
    });
    this.callRewardAPI(Math.floor(this.score));
  }

  // ============================================================
  // LOSE – nút 🎭 Nhận Phạt → lose.html
  // ============================================================
  triggerLose(){
    if(this.st===ST.LOSE) return;
    this.st=ST.LOSE;
    this.stopObstacleTimer(); this.physics.pause();
    document.getElementById('question-overlay').style.display='none';
    if(this.bgm) this.bgm.stop();
    this.playSfx('snd_lose',{volume:0.8});
    const W=this.scale.width,H=this.scale.height;
    this.cameras.main.shake(800,0.028);
    const ov=this.add.rectangle(W/2,H/2,W,H,0x7f0000,0).setDepth(18);
    this.tweens.add({targets:ov,alpha:0.72,duration:700});

    const t1=this.add.text(W/2,H*.28,'💔 Crush đã chạy xa...',{
      fontSize:'34px',fill:'#fca5a5',fontFamily:'Segoe UI',fontStyle:'bold',stroke:'#7f0000',strokeThickness:4
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:t1,alpha:1,duration:500});

    const t2=this.add.text(W/2,H*.41,'Thất bại rồi 😭\nLần sau cố lên nhé!',{
      fontSize:'22px',fill:'#fecaca',fontFamily:'Segoe UI',align:'center'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:t2,alpha:1,duration:500,delay:300});

    // ── NÚT 🎭 NHẬN PHẠT → lose.html ──
    const btnPunish=this.add.text(W/2,H*.57,'🎭  Nhận Phạt',{
      fontSize:'26px',fill:'#fff',fontFamily:'Segoe UI',fontStyle:'bold',
      backgroundColor:'#7c2d12',padding:{x:34,y:18}
    }).setOrigin(0.5).setDepth(19).setAlpha(0).setInteractive({useHandCursor:true});
    this.tweens.add({targets:btnPunish,alpha:1,duration:600,delay:700,
      onComplete:()=>{
        // Rung nhẹ nút phạt
        this.tweens.add({targets:btnPunish,x:W/2+4,duration:80,yoyo:true,repeat:-1,ease:'Linear'});
      }
    });
    btnPunish.on('pointerover',()=>{ btnPunish.setStyle({backgroundColor:'#9a3412'}); });
    btnPunish.on('pointerout', ()=>{ btnPunish.setStyle({backgroundColor:'#7c2d12'}); });
    btnPunish.on('pointerdown',()=>{ window.location.href='lose.html'; });

    // ── NÚT 🔄 THỬ LẠI ──
    const btnRetry=this.add.text(W/2,H*.70,'🔄  Thử lại',{
      fontSize:'20px',fill:'#cbd5e1',fontFamily:'Segoe UI',
      backgroundColor:'#334155',padding:{x:24,y:12}
    }).setOrigin(0.5).setDepth(19).setAlpha(0).setInteractive({useHandCursor:true});
    btnRetry.on('pointerover',()=>btnRetry.setStyle({backgroundColor:'#475569'}));
    btnRetry.on('pointerout', ()=>btnRetry.setStyle({backgroundColor:'#334155'}));
    btnRetry.on('pointerdown',()=>{qPool=[...QUESTIONS];qUsed=[];this.scene.restart();});
    this.tweens.add({targets:btnRetry,alpha:1,duration:500,delay:1200});
  }

  showHearts(){
    const W=this.scale.width,H=this.scale.height;
    const ems=['💕','❤️','💖','💗','💝','🌸','✨','💫','🎀','🥰'];
    for(let i=0;i<55;i++){
      this.time.delayedCall(i*65,()=>{
        const h=this.add.text(Phaser.Math.Between(30,W-30),H*.92,
          Phaser.Utils.Array.GetRandom(ems),{fontSize:`${Phaser.Math.Between(28,68)}px`}).setOrigin(0.5).setDepth(10);
        this.tweens.add({targets:h,y:Phaser.Math.Between(H*.04,H*.55),alpha:0,
          scale:Phaser.Math.FloatBetween(0.8,2.0),duration:Phaser.Math.Between(1800,3400),ease:'Power2',onComplete:()=>h.destroy()});
      });
    }
  }
  createConfetti(count=60){
    const W=this.scale.width,H=this.scale.height;
    const cols=[0xf43f5e,0xfbbf24,0x34d399,0x60a5fa,0xa78bfa,0xf9a8d4,0xfcd34d,0x4ade80];
    for(let i=0;i<count;i++){
      this.time.delayedCall(Phaser.Math.Between(0,3000),()=>{
        const x=Phaser.Math.Between(0,W);
        const r=this.add.rectangle(x,-16,Phaser.Math.Between(8,22),Phaser.Math.Between(8,22),
          Phaser.Utils.Array.GetRandom(cols)).setDepth(10);
        this.tweens.add({targets:r,y:H+80,x:x+Phaser.Math.Between(-130,130),
          angle:Phaser.Math.Between(0,720),duration:Phaser.Math.Between(2200,4500),ease:'Linear',onComplete:()=>r.destroy()});
      });
    }
  }
  createFireworks(count=5,cx=null,cy=null){
    const W=this.scale.width,H=this.scale.height;
    const cols=[0xff4444,0xffdd00,0x44ff88,0x44aaff,0xff44ff,0xffffff,0xff69b4];
    for(let fw=0;fw<count;fw++){
      this.time.delayedCall(fw*280,()=>{
        const fx=cx?cx+Phaser.Math.Between(-220,220):Phaser.Math.Between(W*.1,W*.9);
        const fy=cy?cy+Phaser.Math.Between(-100,100):Phaser.Math.Between(H*.1,H*.55);
        for(let i=0;i<24;i++){
          const angle=((Math.PI*2)/24)*i,dist=Phaser.Math.Between(80,180);
          const p=this.add.circle(fx,fy,Phaser.Math.Between(6,15),Phaser.Utils.Array.GetRandom(cols)).setDepth(11);
          this.tweens.add({targets:p,x:fx+Math.cos(angle)*dist,y:fy+Math.sin(angle)*dist,
            alpha:0,scale:0,duration:Phaser.Math.Between(700,1200),ease:'Power2',onComplete:()=>p.destroy()});
        }
      });
    }
  }
  callRewardAPI(score){
    fetch('/api/claim-reward',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({score,completedAt:new Date().toISOString()})})
      .then(r=>r.json()).then(d=>console.log('🎁',d)).catch(()=>{});
  }
}

new Phaser.Game({
  type:Phaser.AUTO, width:window.innerWidth, height:window.innerHeight, parent:document.body,
  scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},
  physics:{default:'arcade',arcade:{gravity:{y:900},debug:false}},
  scene:[LoadingScene,GameScene],
});
