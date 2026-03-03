import Phaser from 'phaser';

// ============================================================
// DATA
// ============================================================
const QUESTIONS = [
  { q: "Ngày sinh của Nga?",             a: "6/7/2007" },
  { q: "Thủ đô Việt Nam?",              a: "hà nội" },
  { q: "5 × 6 = ?",                     a: "30" },
  { q: "HTML viết tắt của gì?",         a: "html" },
  { q: "10 - 3 = ?",                    a: "7" },
  { q: "Ngôn ngữ dùng đuôi .py?",       a: "python" },
  { q: "1 mét = ? cm",                  a: "100" },
  { q: "Căn bậc 2 của 144?",           a: "12" },
  { q: "Hoa gì tượng trưng tình yêu?",  a: "hoa hồng" },
  { q: "I love you = ?",               a: "tôi yêu bạn" },
];

const BOSSES = [
  { id:'mini1', name:'🔴 Dino Đỏ',         after:5,  timer:12, wings:false, shield:false },
  { id:'mini2', name:'🛡️ Dino Khiên',      after:10, timer:10, wings:false, shield:true  },
  { id:'final', name:'💀 SHADOW DINO',     after:15, timer:8,  wings:true,  shield:false },
];

const OBSTACLE_INTERVAL = 1900;
const DISTANCE_INIT     = 100;
const DIST_WIN_REWARD   = 34;
const DIST_FAIL_PENALTY = 12;
const MAX_FAIL          = 3;

const ST = { IDLE:'IDLE', RUNNING:'RUNNING', BOSS_WARNING:'BOSS_WARNING',
  QUESTION:'QUESTION', POWER:'POWER', HIT_BACK:'HIT_BACK', WIN:'WIN', LOSE:'LOSE' };

let qPool = [...QUESTIONS], qUsed = [];
function pickQ() {
  if (!qPool.length) { qPool = [...qUsed]; qUsed = []; }
  const i = Phaser.Math.Between(0, qPool.length - 1);
  const q = qPool.splice(i,1)[0]; qUsed.push(q); return q;
}

// Helper: scale font/size dựa trên chiều rộng màn hình
function s(base, W) { return Math.round(base * Math.min(1, W / 800)); }

// ============================================================
class LoadingScene extends Phaser.Scene {
  constructor() { super({ key:'LoadingScene' }); }
  preload() {
    this.load.image('dino_male',   'assets/dino_male.png');
    this.load.image('dino_female', 'assets/dino_female.png');
    const W=this.scale.width, H=this.scale.height;
    const bg=this.add.graphics(), bar=this.add.graphics();
    bg.fillStyle(0x1e293b).fillRect(W*.25,H*.47,W*.5,20);
    this.load.on('progress',v=>{bar.clear();bar.fillStyle(0x6366f1).fillRect(W*.25,H*.47,W*.5*v,20);});
    this.add.text(W/2,H*.42,'💕 Loading...',{fontSize:`${s(22,W)}px`,fill:'#f9a8d4',fontFamily:'Segoe UI'}).setOrigin(0.5);
  }
  create() { this.scene.start('GameScene'); }
}

// ============================================================
class GameScene extends Phaser.Scene {
  constructor() { super({ key:'GameScene' }); }

  preload() {
    const g = this.make.graphics({x:0,y:0,add:false});
    const W = this.scale.width;
    // Tất cả texture scale nhỏ hơn trên mobile
    const sc = Math.min(1, W/800);

    const gw=Math.round(800*sc), gh=20;
    g.fillStyle(0x334155).fillRect(0,0,gw,gh); g.fillStyle(0x475569).fillRect(0,0,gw,5);
    g.generateTexture('ground',gw,gh); g.clear();

    // Cactus — nhỏ hơn trên mobile
    const cw=Math.round(38*sc), ch=Math.round(58*sc);
    g.fillStyle(0x16a34a);
    g.fillRect(Math.round(12*sc),0,Math.round(12*sc),ch);
    g.fillRect(0,Math.round(16*sc),cw,Math.round(10*sc));
    g.fillRect(0,Math.round(10*sc),Math.round(12*sc),Math.round(10*sc));
    g.fillRect(Math.round(26*sc),Math.round(10*sc),Math.round(12*sc),Math.round(10*sc));
    g.generateTexture('cactus',cw,ch); g.clear();

    // Rock
    const rw=Math.round(48*sc), rh=Math.round(40*sc);
    g.fillStyle(0x94a3b8); g.fillEllipse(rw/2,rh/2,rw,Math.round(34*sc));
    g.fillStyle(0x64748b); g.fillEllipse(rw*.35,rh*.4,Math.round(20*sc),Math.round(14*sc));
    g.generateTexture('rock',rw,rh); g.clear();

    // Boss Mini1
    const bw=Math.round(70*sc), bh=Math.round(54*sc);
    g.fillStyle(0xdc2626); g.fillEllipse(bw/2,bh*.45,bw*.8,bh*.7);
    g.fillStyle(0xfca5a5); g.fillCircle(bw*.34,bh*.36,Math.round(6*sc)); g.fillCircle(bw*.66,bh*.36,Math.round(6*sc));
    g.fillStyle(0x7f1d1d); g.fillCircle(bw*.36,bh*.36,Math.round(3*sc)); g.fillCircle(bw*.68,bh*.36,Math.round(3*sc));
    g.fillStyle(0xdc2626); g.fillTriangle(bw*.28,bh*.2,bw*.2,0,bw*.36,0); g.fillTriangle(bw*.72,bh*.2,bw*.64,0,bw*.8,0);
    g.generateTexture('boss_mini1',bw,bh); g.clear();

    // Boss Mini2
    g.fillStyle(0x1d4ed8); g.fillEllipse(bw/2,bh*.45,bw*.8,bh*.7);
    g.fillStyle(0xbfdbfe); g.fillCircle(bw*.34,bh*.36,Math.round(6*sc)); g.fillCircle(bw*.66,bh*.36,Math.round(6*sc));
    g.fillStyle(0x1e3a8a); g.fillCircle(bw*.36,bh*.36,Math.round(3*sc)); g.fillCircle(bw*.68,bh*.36,Math.round(3*sc));
    g.generateTexture('boss_mini2',bw,bh); g.clear();

    // Shield ring
    const sw=Math.round(90*sc);
    g.lineStyle(Math.round(7*sc),0x38bdf8,1); g.strokeCircle(sw/2,sw/2,sw*.46);
    g.lineStyle(Math.round(3*sc),0x7dd3fc,0.6); g.strokeCircle(sw/2,sw/2,sw*.37);
    g.generateTexture('shield_ring',sw,sw); g.clear();

    // Final Boss
    const fw=Math.round(120*sc), fh=Math.round(95*sc);
    g.fillStyle(0x312e81,0.9); g.fillTriangle(0,fh*.5,fw*.38,0,fw*.38,fh);
    g.fillStyle(0x312e81,0.9); g.fillTriangle(fw,fh*.5,fw*.62,0,fw*.62,fh);
    g.fillStyle(0x1e1b4b); g.fillEllipse(fw/2,fh*.52,fw*.6,fh*.68);
    g.fillStyle(0xff0000); g.fillCircle(fw*.4,fh*.42,Math.round(7*sc)); g.fillCircle(fw*.6,fh*.42,Math.round(7*sc));
    g.fillStyle(0xff6666); g.fillCircle(fw*.4,fh*.42,Math.round(3*sc)); g.fillCircle(fw*.6,fh*.42,Math.round(3*sc));
    g.fillStyle(0x4c1d95);
    g.fillTriangle(fw*.42,fh*.18,fw*.36,0,fw*.48,0); g.fillTriangle(fw*.58,fh*.18,fw*.52,0,fw*.64,0);
    g.generateTexture('boss_final',fw,fh); g.clear();

    // Cloud
    const clw=Math.round(100*sc), clh=Math.round(36*sc);
    g.fillStyle(0x94a3b8);
    g.fillEllipse(clw*.38,clh*.5,clw*.7,clh*.8); g.fillEllipse(clw*.68,clh*.4,clw*.56,clh*.65); g.fillEllipse(clw*.16,clh*.6,clw*.38,clh*.55);
    g.generateTexture('cloud',clw,clh); g.clear();

    g.fillStyle(0x22c55e).fillRect(0,0,Math.round(60*sc),Math.round(70*sc)); g.generateTexture('dino_fallback',Math.round(60*sc),Math.round(70*sc)); g.clear();
    g.fillStyle(0xff69b4).fillRect(0,0,Math.round(60*sc),Math.round(70*sc)); g.generateTexture('dino_female_fallback',Math.round(60*sc),Math.round(70*sc));
    g.destroy();
  }

  getKey(k) { return this.textures.exists(k)?k:(k==='dino_male'?'dino_fallback':'dino_female_fallback'); }

  create() {
    this.st=ST.IDLE; this.score=0; this.obsCleared=0; this.bossIndex=0;
    this.distance=DISTANCE_INIT; this.failCount=0; this.timerSecs=0;
    this.timerEv=null; this.currentQ=null; this.bossSpr=null; this.bossAura=null;
    this.shieldSpr=null; this.wingL=null; this.wingR=null;
    this.obstacleTimer=null; this.obstacleSpeed=-260;
    qPool=[...QUESTIONS]; qUsed=[];

    const W=this.scale.width, H=this.scale.height;
    const sc=Math.min(1,W/800);

    // BG
    const bgGfx=this.add.graphics();
    bgGfx.fillGradientStyle(0x0f172a,0x0f172a,0x1e293b,0x1e293b,1);
    bgGfx.fillRect(0,0,W,H);

    // Ít sao hơn trên mobile
    const starCount = W < 500 ? 30 : 60;
    for(let i=0;i<starCount;i++){
      const st=this.add.circle(Phaser.Math.Between(0,W),Phaser.Math.Between(0,H*.65),
        Phaser.Math.Between(1,2),0xffffff,Phaser.Math.FloatBetween(0.15,0.75));
      this.tweens.add({targets:st,alpha:0.05,duration:Phaser.Math.Between(800,2500),yoyo:true,repeat:-1});
    }

    this.clouds=[];
    for(let i=0;i<4;i++){
      const c=this.add.image((W/4)*i+50,Phaser.Math.Between(30,100),'cloud').setAlpha(0.3);
      this.clouds.push(c);
    }

    this.ground=this.physics.add.staticImage(W/2,H*.968,'ground').setDisplaySize(W,20).refreshBody();

    // Dino sizes responsive
    const dinoMaxH = H * 0.13;

    const femKey=this.getKey('dino_female');
    this.female=this.add.image(W*.82,H*.855,femKey);
    const fs=Math.min(dinoMaxH/this.female.height, (W*.1)/this.female.width);
    this.female.setScale(fs).setFlipX(true).setDepth(2);

    const maleKey=this.getKey('dino_male');
    this.dino=this.physics.add.sprite(W*.13,H*.855,maleKey);
    const ds=Math.min(dinoMaxH/this.dino.height,(W*.1)/this.dino.width);
    this.dino.setScale(ds).setCollideWorldBounds(true).setDepth(3);
    this.physics.add.collider(this.dino,this.ground);

    this.obstacles=this.physics.add.group();
    this.physics.add.overlap(this.dino,this.obstacles,this.onDinoHit,null,this);

    this.cursors =this.input.keyboard.createCursorKeys();
    this.spaceKey=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    // Touch jump
    this.input.on('pointerdown',(ptr)=>{
      if(this.st===ST.QUESTION) return;
      if(ptr.y>H*.8 && ptr.x>W*.7) return; // evita area botón
      if(this.st===ST.IDLE){ this.startGame(); return; }
      this.doJump();
    });

    // ---- UI: tamaños responsivos ----
    const fs1=s(13,W), fs2=s(16,W), fs3=s(18,W);

    // Distance bar — más pequeña
    const barH=10, barY=H*.032;
    this.add.text(W/2,H*.005,'💕 Khoảng cách đến Crush',{fontSize:`${s(11,W)}px`,fill:'#f9a8d4',fontFamily:'Segoe UI'}).setOrigin(0.5,0).setDepth(10);
    this.add.rectangle(W/2,barY,W*.65,barH,0x1e293b).setDepth(10);
    this.distBar=this.add.rectangle(W/2-W*.325,barY,W*.65,barH,0xec4899).setOrigin(0,0.5).setDepth(11);
    this.distBarShine=this.add.rectangle(W/2-W*.325,barY-2,W*.65,4,0xfce7f3,0.4).setOrigin(0,0.5).setDepth(12);

    this.scoreTxt=this.add.text(8,8,`Score: 0`,{fontSize:`${fs2}px`,fill:'#f1f5f9',fontFamily:'Segoe UI'}).setDepth(10);
    this.obsTxt=this.add.text(W-8,8,'🌵 0/5',{fontSize:`${s(14,W)}px`,fill:'#fbbf24',fontFamily:'Segoe UI'}).setOrigin(1,0).setDepth(10);
    this.failTxt=this.add.text(W-8,H*.035,'🤍🤍🤍',{fontSize:`${s(18,W)}px`,fill:'#f43f5e',fontFamily:'Segoe UI'}).setOrigin(1,0).setDepth(10);

    // Jump button — nhỏ gọn góc phải dưới
    const btnSize = s(42, W);
    this.jumpBtn=this.add.text(W-12,H-12,'⬆️',{fontSize:`${btnSize}px`})
      .setOrigin(1,1).setDepth(20).setAlpha(0.65).setInteractive({useHandCursor:true});
    this.jumpBtn.on('pointerdown',()=>{
      if(this.st===ST.IDLE){this.startGame();return;}
      this.doJump();
    });

    // Hint
    this.hintText=this.add.text(W/2,H/2,'💕 LOVE PURSUIT\n\nTap hoặc SPACE để bắt đầu',{
      fontSize:`${s(20,W)}px`,fill:'#fde68a',fontFamily:'Segoe UI',fontStyle:'bold',
      backgroundColor:'#0f172a',padding:{x:16,y:12},align:'center'
    }).setOrigin(0.5).setDepth(20);

    this.spaceKey.once('down',()=>this.startGame());
    this.cursors.up.once('down',()=>this.startGame());

    document.getElementById('submit-btn').onclick=()=>this.checkAnswer();
    document.getElementById('answer-input').onkeydown=e=>{if(e.key==='Enter')this.checkAnswer();};

    this.updateDistBar(); this.updateFailUI();
  }

  startGame(){
    if(this.st!==ST.IDLE) return;
    if(this.hintText){this.hintText.destroy();this.hintText=null;}
    this.st=ST.RUNNING;
    this.startObstacleTimer();
  }

  doJump(){
    if(this.dino&&this.dino.body&&this.dino.body.blocked.down)
      this.dino.setVelocityY(-580);
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
    if((this.cursors.up.isDown||this.spaceKey.isDown)&&this.dino.body.blocked.down)
      this.dino.setVelocityY(-580);
    this.obstacleSpeed=Math.max(-520,-260-Math.floor(this.score/15)*12);
    this.clouds.forEach(c=>{c.x-=0.6;if(c.x<-80) c.x=this.scale.width+80;});
    this.obstacles.getChildren().forEach(o=>{
      if(o.x<-100&&!o.counted){o.counted=true;this.onObstacleCleared();o.destroy();}
    });
    this.score+=0.04;
    this.scoreTxt.setText(`Score: ${Math.floor(this.score)}`);
  }

  spawnObstacle(){
    if(this.st!==ST.RUNNING) return;
    const W=this.scale.width,H=this.scale.height;
    const type=Phaser.Utils.Array.GetRandom(['cactus','rock','cactus']);
    const obs=this.obstacles.create(W+60,H*.878,type);
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

  // ============================================================
  triggerBossWarning(){
    if(this.st!==ST.RUNNING) return;
    this.st=ST.BOSS_WARNING;
    this.stopObstacleTimer(); this.physics.pause(); this.obstacles.clear(true,true);
    const boss=BOSSES[this.bossIndex];
    const W=this.scale.width,H=this.scale.height;
    this.cameras.main.shake(600,0.016);
    const ov=this.add.rectangle(W/2,H/2,W,H,0x000000,0).setDepth(18);
    this.tweens.add({targets:ov,alpha:0.6,duration:400});
    const wt=this.add.text(W/2,H*.3,'⚠️ BOSS APPEARS!',{
      fontSize:`${s(28,W)}px`,fill:'#fde047',fontFamily:'Segoe UI',fontStyle:'bold',stroke:'#92400e',strokeThickness:3
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:wt,alpha:1,duration:250,yoyo:true,repeat:2});
    const nt=this.add.text(W/2,H*.46,boss.name,{
      fontSize:`${s(22,W)}px`,fill:'#f9a8d4',fontFamily:'Segoe UI',fontStyle:'bold'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:nt,alpha:1,duration:350,delay:350});
    this.time.delayedCall(2200,()=>{ov.destroy();wt.destroy();nt.destroy();this.spawnBoss();});
  }

  spawnBoss(){
    this.st=ST.QUESTION;
    const boss=BOSSES[this.bossIndex];
    const W=this.scale.width,H=this.scale.height;
    const texKey=boss.id==='mini1'?'boss_mini1':boss.id==='mini2'?'boss_mini2':'boss_final';
    const bossScale=boss.id==='final'?1.8:1.4;
    const bossY=boss.id==='final'?H*.38:H*.42;

    if(boss.wings){
      const wSize=s(70,W);
      this.wingL=this.add.triangle(W*.6-wSize*.8,bossY,0,wSize*.5,wSize*.7,0,wSize*.7,wSize,0x312e81,0.85).setDepth(6);
      this.wingR=this.add.triangle(W*.6+wSize*.8,bossY,0,wSize*.5,-wSize*.7,0,-wSize*.7,wSize,0x312e81,0.85).setDepth(6);
      this.tweens.add({targets:this.wingL,scaleY:0.5,duration:400,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});
      this.tweens.add({targets:this.wingR,scaleY:0.5,duration:400,yoyo:true,repeat:-1,ease:'Sine.easeInOut',delay:200});
    }

    this.bossSpr=this.add.image(W+100,bossY,texKey).setScale(bossScale).setDepth(8);
    this.tweens.add({targets:this.bossSpr,x:W*.60,duration:900,ease:'Back.easeOut'});

    if(boss.shield){
      this.shieldSpr=this.add.image(W+100,bossY,'shield_ring').setScale(bossScale*1.2).setDepth(7).setAlpha(0.88);
      this.tweens.add({targets:this.shieldSpr,x:W*.60,duration:900,ease:'Back.easeOut'});
      this.tweens.add({targets:this.shieldSpr,angle:360,duration:3500,repeat:-1,ease:'Linear'});
    }

    const auraColor=boss.id==='final'?0x7c3aed:boss.id==='mini1'?0xdc2626:0x2563eb;
    const auraR=s(55,W);
    this.bossAura=this.add.circle(W*.60,bossY,auraR,auraColor,0.22).setDepth(7);
    this.tweens.add({targets:this.bossAura,scaleX:1.5,scaleY:1.5,alpha:0.06,duration:600,yoyo:true,repeat:-1});

    this.time.delayedCall(1050,()=>{
      if(this.bossAura) this.bossAura.setPosition(W*.60,bossY);
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
      `${boss.name} &nbsp;|&nbsp; ⏱️ <span style="color:${col};font-weight:bold">${this.timerSecs}s</span>`;
  }
  onTimeout(){
    document.getElementById('feedback').style.color='#f59e0b';
    document.getElementById('feedback').textContent='⏰ Hết giờ!';
    this.time.delayedCall(800,()=>this.processWrong());
  }

  checkAnswer(){
    if(this.st!==ST.QUESTION) return;
    if(this.timerEv){this.timerEv.remove();this.timerEv=null;}
    const userAns=document.getElementById('answer-input').value.trim().toLowerCase();
    const correct=this.currentQ.a.toLowerCase();
    const fb=document.getElementById('feedback');
    if(userAns===correct){
      fb.style.color='#16a34a'; fb.textContent='✅ Đúng! POWER UP! 💥';
      this.time.delayedCall(700,()=>{
        document.getElementById('question-overlay').style.display='none';
        document.getElementById('question-box').style.borderColor='';
        this.triggerPower();
      });
    } else {
      fb.style.color='#dc2626'; fb.textContent=`❌ Sai! Đáp án: "${this.currentQ.a}"`;
      this.time.delayedCall(1100,()=>this.processWrong());
    }
  }

  processWrong(){
    document.getElementById('question-overlay').style.display='none';
    document.getElementById('question-box').style.borderColor='';
    this.failCount++; this.updateFailUI();
    if(this.failCount>=MAX_FAIL) this.triggerLose();
    else this.triggerHitBack();
  }

  // ============================================================
  triggerPower(){
    this.st=ST.POWER;
    const W=this.scale.width,H=this.scale.height;
    const boss=BOSSES[this.bossIndex];
    const auraColor=boss.id==='final'?0xa855f7:0xff69b4;
    const pAura=this.add.circle(this.dino.x,this.dino.y,s(60,W),auraColor,0.3).setDepth(2);
    this.tweens.add({targets:pAura,scaleX:1.6,scaleY:1.6,alpha:0.1,duration:350,yoyo:true,repeat:-1});
    this.dino.setTint(0xffc0cb);
    this.time.timeScale=0.3; this.tweens.timeScale=0.3;
    this.cameras.main.shake(700,0.022);
    this.time.delayedCall(900,()=>{
      this.time.timeScale=1; this.tweens.timeScale=1;
      this.explodeBoss();
    });
    this.distance=Math.max(0,this.distance-DIST_WIN_REWARD);
    this.updateDistBar(); this.moveCrushCloser();
    const rt=this.add.text(W/2,H*.25,`💕 Tiến gần hơn!`,{
      fontSize:`${s(22,W)}px`,fill:'#fde68a',fontFamily:'Segoe UI',fontStyle:'bold'
    }).setOrigin(0.5).setDepth(16).setAlpha(0);
    this.tweens.add({targets:rt,alpha:1,y:H*.2,duration:700,delay:200,
      onComplete:()=>this.tweens.add({targets:rt,alpha:0,duration:400,delay:500,onComplete:()=>rt.destroy()})});
    this.time.delayedCall(3000,()=>{
      pAura.destroy(); this.dino.clearTint(); this.bossIndex++;
      if(this.distance<=0) this.triggerWin();
      else{ this.st=ST.RUNNING; this.physics.resume(); this.startObstacleTimer(); }
    });
  }

  explodeBoss(){
    if(!this.bossSpr) return;
    const boss=BOSSES[this.bossIndex]||BOSSES[BOSSES.length-1];
    const x=this.bossSpr.x,y=this.bossSpr.y;
    const bsc=this.bossSpr.scaleX;
    this.tweens.add({targets:this.bossSpr,scaleX:bsc*1.4,scaleY:bsc*1.4,alpha:0,duration:400,ease:'Power3',
      onComplete:()=>{if(this.bossSpr){this.bossSpr.destroy();this.bossSpr=null;}}});
    if(this.shieldSpr){this.tweens.add({targets:this.shieldSpr,alpha:0,scaleX:2.5,scaleY:2.5,duration:400,
      onComplete:()=>{if(this.shieldSpr){this.shieldSpr.destroy();this.shieldSpr=null;}}});}
    if(this.bossAura){this.bossAura.destroy();this.bossAura=null;}
    if(this.wingL){this.tweens.add({targets:this.wingL,alpha:0,duration:300,onComplete:()=>{if(this.wingL){this.wingL.destroy();this.wingL=null;}}});}
    if(this.wingR){this.tweens.add({targets:this.wingR,alpha:0,duration:300,onComplete:()=>{if(this.wingR){this.wingR.destroy();this.wingR=null;}}});}

    const ems=['💕','❤️','💖','✨','💥','🌸'];
    const colors=boss.id==='mini1'?[0xff4444,0xff8800,0xffcc00]:boss.id==='mini2'?[0x38bdf8,0x818cf8,0xffffff]:[0xa855f7,0x6366f1,0xff00ff];
    const cnt=boss.id==='final'?22:14;
    const W=this.scale.width;

    for(let i=0;i<cnt;i++){
      const p=this.add.circle(x,y,Phaser.Math.Between(4,s(12,W)),Phaser.Utils.Array.GetRandom(colors)).setDepth(15);
      this.tweens.add({targets:p,x:x+Phaser.Math.Between(-160,160),y:y+Phaser.Math.Between(-130,90),
        alpha:0,scale:0,duration:Phaser.Math.Between(600,1100),ease:'Power2',onComplete:()=>p.destroy()});
      if(i<10){
        const h=this.add.text(x,y,Phaser.Utils.Array.GetRandom(ems),
          {fontSize:`${Phaser.Math.Between(s(20,W),s(36,W))}px`}).setOrigin(0.5).setDepth(16);
        this.tweens.add({targets:h,x:x+Phaser.Math.Between(-150,150),y:y+Phaser.Math.Between(-150,60),
          alpha:0,scale:Phaser.Math.FloatBetween(0.6,1.5),duration:Phaser.Math.Between(800,1300),ease:'Power2',onComplete:()=>h.destroy()});
      }
    }
    const fl=this.add.rectangle(this.scale.width/2,this.scale.height/2,this.scale.width,this.scale.height,
      boss.id==='mini1'?0xff2222:boss.id==='mini2'?0x2563eb:0x7c3aed,0.35).setDepth(18);
    this.tweens.add({targets:fl,alpha:0,duration:400,onComplete:()=>fl.destroy()});
    if(boss.id==='final') this.createFireworks(3,x,y);
  }

  moveCrushCloser(){
    const W=this.scale.width;
    const pct=1-(this.distance/DISTANCE_INIT);
    this.tweens.add({targets:this.female,x:W*(0.82-pct*0.3),duration:800,ease:'Power2'});
  }

  triggerHitBack(){
    this.st=ST.HIT_BACK;
    const W=this.scale.width,H=this.scale.height;
    const fl=this.add.rectangle(W/2,H/2,W,H,0xff0000,0).setDepth(18);
    this.tweens.add({targets:fl,alpha:0.35,duration:160,yoyo:true,onComplete:()=>fl.destroy()});
    this.physics.resume();
    this.dino.setVelocityX(160); this.dino.setVelocityY(-260); this.dino.setTint(0xff5555);
    this.time.delayedCall(600,()=>{this.dino.setVelocityX(0);if(this.dino)this.dino.clearTint();});
    this.distance=Math.min(DISTANCE_INIT,this.distance+DIST_FAIL_PENALTY);
    this.updateDistBar(); this.moveCrushCloser();
    const tag=this.add.text(this.female.x,this.female.y-s(50,W),`😤 +${DIST_FAIL_PENALTY}!`,
      {fontSize:`${s(20,W)}px`,fill:'#fca5a5',fontFamily:'Segoe UI',fontStyle:'bold'}).setOrigin(0.5).setDepth(16);
    this.tweens.add({targets:tag,y:tag.y-40,alpha:0,duration:1100,onComplete:()=>tag.destroy()});
    if(this.bossSpr){this.bossSpr.destroy();this.bossSpr=null;}
    if(this.shieldSpr){this.shieldSpr.destroy();this.shieldSpr=null;}
    if(this.bossAura){this.bossAura.destroy();this.bossAura=null;}
    if(this.wingL){this.wingL.destroy();this.wingL=null;}
    if(this.wingR){this.wingR.destroy();this.wingR=null;}
    this.time.delayedCall(1700,()=>{this.st=ST.RUNNING;this.physics.resume();this.startObstacleTimer();});
  }

  onDinoHit(dino,obstacle){
    if(this.st!==ST.RUNNING) return;
    obstacle.destroy();
    this.cameras.main.shake(250,0.013);
    this.dino.setTint(0xff4444);
    this.time.delayedCall(350,()=>{if(this.dino)this.dino.clearTint();});
    this.failCount++; this.updateFailUI();
    this.distance=Math.min(DISTANCE_INIT,this.distance+5); this.updateDistBar();
    if(this.failCount>=MAX_FAIL){this.stopObstacleTimer();this.physics.pause();this.time.delayedCall(500,()=>this.triggerLose());}
  }

  updateDistBar(){
    const W=this.scale.width,pct=Math.max(0,this.distance/DISTANCE_INIT);
    this.distBar.setSize(W*.65*pct,10);
    this.distBarShine.setSize(W*.65*pct,4);
  }
  updateFailUI(){
    this.failTxt.setText('💔'.repeat(this.failCount)+'🤍'.repeat(Math.max(0,MAX_FAIL-this.failCount)));
  }

  // ============================================================
  triggerWin(){
    if(this.st===ST.WIN) return;
    this.st=ST.WIN;
    this.stopObstacleTimer(); this.physics.pause(); this.obstacles.clear(true,true);
    const W=this.scale.width,H=this.scale.height;
    this.time.timeScale=0.28; this.tweens.timeScale=0.28;
    this.time.delayedCall(1300,()=>{
      this.time.timeScale=1; this.tweens.timeScale=1;
      this.physics.resume(); this.dino.setVelocityX(0); this.dino.setVelocityY(0);
      this.tweens.add({targets:this.dino,x:this.female.x-this.female.displayWidth-4,duration:1100,ease:'Power3.easeOut',
        onComplete:()=>{
          this.physics.pause(); this.female.setFlipX(true);
          this.tweens.add({targets:[this.dino,this.female],y:'-=20',duration:110,yoyo:true,repeat:5});
          this.time.delayedCall(450,()=>{
            const cx=(this.dino.x+this.female.x)/2;
            const heartSize=s(120,W);
            const bh=this.add.text(cx,this.dino.y-heartSize*.6,'❤️',{fontSize:`${heartSize}px`})
              .setOrigin(0.5).setDepth(14).setAlpha(0).setScale(0.1);
            this.tweens.add({targets:bh,alpha:1,scale:1.6,duration:650,ease:'Back.easeOut',
              onComplete:()=>this.tweens.add({targets:bh,scale:1.3,duration:450,yoyo:true,repeat:-1})});
            this.showHearts(); this.createConfetti(60); this.createFireworks(6,W/2,H*.28);
            const pink=this.add.rectangle(W/2,H/2,W,H,0xff69b4,0).setDepth(8);
            this.tweens.add({targets:pink,alpha:0.28,duration:1400});
            this.time.delayedCall(700,()=>{
              const t1=this.add.text(W/2,H*.06,'💕 Bắt kịp Crush! 💕',{
                fontSize:`${s(32,W)}px`,fill:'#fde68a',fontFamily:'Segoe UI',fontStyle:'bold',stroke:'#92400e',strokeThickness:3
              }).setOrigin(0.5).setDepth(15).setAlpha(0);
              this.tweens.add({targets:t1,alpha:1,duration:600});
              const t2=this.add.text(W/2,H*.155,`Score: ${Math.floor(this.score)} 🌟`,{
                fontSize:`${s(18,W)}px`,fill:'#86efac',fontFamily:'Segoe UI'
              }).setOrigin(0.5).setDepth(15).setAlpha(0);
              this.tweens.add({targets:t2,alpha:1,duration:600,delay:250});
              this.tweens.add({targets:[this.dino,this.female],x:'+=8',duration:320,yoyo:true,repeat:-1});
              const btn=this.add.text(W/2,H*.88,'▶  Chơi lại',{
                fontSize:`${s(20,W)}px`,fill:'#fff',fontFamily:'Segoe UI',backgroundColor:'#6366f1',padding:{x:s(20,W),y:s(12,W)}
              }).setOrigin(0.5).setDepth(15).setAlpha(0).setInteractive({useHandCursor:true});
              btn.on('pointerover',()=>btn.setStyle({backgroundColor:'#4f46e5'}));
              btn.on('pointerout', ()=>btn.setStyle({backgroundColor:'#6366f1'}));
              btn.on('pointerdown',()=>{qPool=[...QUESTIONS];qUsed=[];this.scene.restart();});
              this.tweens.add({targets:btn,alpha:1,duration:500,delay:1000});
            });
          });
        }
      });
    });
    this.callRewardAPI(Math.floor(this.score));
  }

  triggerLose(){
    if(this.st===ST.LOSE) return;
    this.st=ST.LOSE;
    this.stopObstacleTimer(); this.physics.pause();
    document.getElementById('question-overlay').style.display='none';
    const W=this.scale.width,H=this.scale.height;
    this.cameras.main.shake(700,0.025);
    const ov=this.add.rectangle(W/2,H/2,W,H,0x7f0000,0).setDepth(18);
    this.tweens.add({targets:ov,alpha:0.7,duration:600});
    const t1=this.add.text(W/2,H*.3,'💔 Crush đã chạy xa...',{
      fontSize:`${s(28,W)}px`,fill:'#fca5a5',fontFamily:'Segoe UI',fontStyle:'bold',stroke:'#7f0000',strokeThickness:3
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:t1,alpha:1,duration:450});
    const t2=this.add.text(W/2,H*.44,'Thất bại 😭\nLần sau cố lên nhé!',{
      fontSize:`${s(18,W)}px`,fill:'#fecaca',fontFamily:'Segoe UI',align:'center'
    }).setOrigin(0.5).setDepth(19).setAlpha(0);
    this.tweens.add({targets:t2,alpha:1,duration:450,delay:250});
    const btn=this.add.text(W/2,H*.62,'🔄 Thử lại',{
      fontSize:`${s(20,W)}px`,fill:'#fff',fontFamily:'Segoe UI',backgroundColor:'#dc2626',padding:{x:s(20,W),y:s(12,W)}
    }).setOrigin(0.5).setDepth(19).setAlpha(0).setInteractive({useHandCursor:true});
    btn.on('pointerover',()=>btn.setStyle({backgroundColor:'#b91c1c'}));
    btn.on('pointerout', ()=>btn.setStyle({backgroundColor:'#dc2626'}));
    btn.on('pointerdown',()=>{qPool=[...QUESTIONS];qUsed=[];this.scene.restart();});
    this.tweens.add({targets:btn,alpha:1,duration:450,delay:600});
  }

  showHearts(){
    const W=this.scale.width,H=this.scale.height;
    const ems=['💕','❤️','💖','💗','✨','💫','🌸'];
    const cnt=W<500?28:45;
    for(let i=0;i<cnt;i++){
      this.time.delayedCall(i*80,()=>{
        const minSz=s(20,W), maxSz=s(46,W);
        const h=this.add.text(Phaser.Math.Between(20,W-20),H*.92,
          Phaser.Utils.Array.GetRandom(ems),{fontSize:`${Phaser.Math.Between(minSz,maxSz)}px`}).setOrigin(0.5).setDepth(10);
        this.tweens.add({targets:h,y:Phaser.Math.Between(H*.05,H*.5),alpha:0,
          scale:Phaser.Math.FloatBetween(0.8,1.6),duration:Phaser.Math.Between(1600,3000),ease:'Power2',onComplete:()=>h.destroy()});
      });
    }
  }

  createConfetti(count=50){
    const W=this.scale.width,H=this.scale.height;
    const cols=[0xf43f5e,0xfbbf24,0x34d399,0x60a5fa,0xa78bfa,0xf9a8d4,0xfcd34d];
    for(let i=0;i<count;i++){
      this.time.delayedCall(Phaser.Math.Between(0,2500),()=>{
        const x=Phaser.Math.Between(0,W), sz=Phaser.Math.Between(s(6,W),s(14,W));
        const r=this.add.rectangle(x,-12,sz,sz,Phaser.Utils.Array.GetRandom(cols)).setDepth(10);
        this.tweens.add({targets:r,y:H+60,x:x+Phaser.Math.Between(-100,100),angle:Phaser.Math.Between(0,720),
          duration:Phaser.Math.Between(2000,4000),ease:'Linear',onComplete:()=>r.destroy()});
      });
    }
  }

  createFireworks(count=5,cx=null,cy=null){
    const W=this.scale.width,H=this.scale.height;
    const cols=[0xff4444,0xffdd00,0x44ff88,0x44aaff,0xff44ff,0xffffff,0xff69b4];
    for(let fw=0;fw<count;fw++){
      this.time.delayedCall(fw*280,()=>{
        const fx=cx?cx+Phaser.Math.Between(-150,150):Phaser.Math.Between(W*.1,W*.9);
        const fy=cy?cy+Phaser.Math.Between(-80,80):Phaser.Math.Between(H*.1,H*.5);
        for(let i=0;i<20;i++){
          const angle=((Math.PI*2)/20)*i,dist=Phaser.Math.Between(s(50,W),s(120,W));
          const p=this.add.circle(fx,fy,Phaser.Math.Between(s(4,W),s(10,W)),Phaser.Utils.Array.GetRandom(cols)).setDepth(11);
          this.tweens.add({targets:p,x:fx+Math.cos(angle)*dist,y:fy+Math.sin(angle)*dist,
            alpha:0,scale:0,duration:Phaser.Math.Between(600,1000),ease:'Power2',onComplete:()=>p.destroy()});
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
  physics:{default:'arcade',arcade:{gravity:{y:880},debug:false}},
  scene:[LoadingScene,GameScene],
});
