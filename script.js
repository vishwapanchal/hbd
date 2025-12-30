import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// =========================================================
// PART 1: 3D INTERACTIVE DISPLAY (Three.js)
// =========================================================
function init3D() {
  const container = document.getElementById('heart-container');
  let width = container.clientWidth;
  let height = container.clientHeight;

  const scene = new THREE.Scene();
  
  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.z = 3.5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  
  container.appendChild(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.5;

  // -- BRIGHT STUDIO LIGHTING --
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambientLight);

  const keyLight = new THREE.SpotLight(0xffaa00, 5);
  keyLight.position.set(5, 5, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  scene.add(keyLight);

  const rimLight = new THREE.SpotLight(0xffffff, 2);
  rimLight.position.set(-5, 2, -5);
  scene.add(rimLight);

  const loader = new GLTFLoader();
  let model;

  loader.load('red-3309.glb', (gltf) => {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    
    model.position.sub(center);
    const scaleFactor = 2.0 / size.y;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
    
    model.traverse((o) => {
        if(o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
        }
    });

    scene.add(model);
  }, undefined, (error) => {
    console.error('Error loading 3D model:', error);
  });

  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    
    const time = Date.now() * 0.001;
    keyLight.position.x = Math.sin(time) * 6;
    keyLight.position.z = Math.cos(time) * 6;
    
    if(model) {
        model.position.y = Math.sin(time * 1.5) * 0.15;
    }
    
    renderer.render(scene, camera);
  }
  
  const resizeObserver = new ResizeObserver(entries => {
    for (let entry of entries) {
      const { width, height } = entry.contentRect;
      if (height > 0) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height);
      }
    }
  });
  resizeObserver.observe(container);

  animate();
}

init3D();


// =========================================================
// PART 2: GLOWING ENGINE BACKGROUND (Canvas)
// =========================================================
(() => {
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d", { alpha: false });
  const btn = document.getElementById("btn-ignite");
  
  const bgm = document.getElementById("bgm");
  const sfx = document.getElementById("ignite-sfx");

  // ---- State ----
  let W = 0, H = 0, S = 1; 
  let rpm = 0;
  let rpmTarget = 0;
  let angle = 0;
  let isRevving = false;
  let particles = [];
  
  const ENGINE = { x: 0, y: 0, crankR: 40, rodL: 140, pistonW: 60, pistonH: 50, flywheelR: 80 };

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
    
    const short = Math.min(W, H);
    S = short / 500; 

    if (W > H) {
        ENGINE.x = W / 2;
        ENGINE.y = H * 0.7; 
    } else {
        ENGINE.x = W / 2;
        ENGINE.y = H * 0.75;
    }
  }
  window.addEventListener('resize', resize);
  setTimeout(resize, 0);

  // --- AUDIO LOGIC ---
  
  // 1. Try to play BGM immediately on load
  if(bgm) {
    bgm.play().catch((e) => {
        console.log("Autoplay blocked. Waiting for interaction.");
        const enableAudio = () => {
            bgm.play();
            window.removeEventListener('click', enableAudio);
            window.removeEventListener('touchstart', enableAudio);
            window.removeEventListener('keydown', enableAudio);
        };
        window.addEventListener('click', enableAudio);
        window.addEventListener('touchstart', enableAudio);
        window.addEventListener('keydown', enableAudio);
    });

    // 2. UPDATED: Pause BGM when user switches tabs/minimizes
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        bgm.pause();
      } else {
        // Resume only if we are back active
        bgm.play().catch(()=>{});
      }
    });
  }

  function playIgniteSound() {
    if(sfx) {
      sfx.currentTime = 0;
      sfx.play().catch(()=>{});
    }
  }

  // --- Drawing Helpers ---
  function setMetal(ctx, type, yStart, h) {
    const g = ctx.createLinearGradient(0, yStart, 0, yStart + h);
    if (type === 'gold') {
      g.addColorStop(0, '#bf953f');
      g.addColorStop(0.3, '#fcf6ba');
      g.addColorStop(0.6, '#b38728');
      g.addColorStop(1, '#aa771c');
    } else if (type === 'cyan') {
      g.addColorStop(0, '#005f6b');
      g.addColorStop(0.4, '#00f2ea');
      g.addColorStop(0.6, '#008c99');
      g.addColorStop(1, '#00353f');
    } else { 
      g.addColorStop(0, '#2b323c');
      g.addColorStop(0.5, '#485563');
      g.addColorStop(1, '#1e2329');
    }
    ctx.fillStyle = g;
    return g;
  }

  function drawNeonLine(ctx, x1, y1, x2, y2, color, width) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    ctx.shadowBlur = 10 * S;
    ctx.shadowColor = color;
    ctx.stroke();
    ctx.shadowBlur = 0; 
  }

  function drawGear(cx, cy, teeth, r, angle) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.shadowColor = "rgba(0, 242, 234, 0.4)"; ctx.shadowBlur = 15 * S;
    
    ctx.beginPath();
    const toothDepth = r * 0.15;
    for(let i=0; i<teeth; i++) {
      const a = (i/teeth) * Math.PI * 2;
      const step = (Math.PI * 2) / teeth;
      ctx.lineTo(Math.cos(a)*(r-toothDepth), Math.sin(a)*(r-toothDepth));
      ctx.lineTo(Math.cos(a+step*0.2)*r, Math.sin(a+step*0.2)*r);
      ctx.lineTo(Math.cos(a+step*0.8)*r, Math.sin(a+step*0.8)*r);
      ctx.lineTo(Math.cos(a+step)*(r-toothDepth), Math.sin(a+step)*(r-toothDepth));
    }
    ctx.closePath();
    
    setMetal(ctx, 'cyan', -r, r*2);
    ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 1; ctx.stroke();
    
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); ctx.arc(0, 0, r*0.7, 0, Math.PI*2); ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    
    ctx.beginPath(); ctx.arc(0, 0, r*0.7, 0, Math.PI*2);
    setMetal(ctx, 'cyan', -r*0.7, r*1.4); ctx.fill();
    
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    for(let i=0; i<3; i++) {
        const a = (i/3) * Math.PI * 2;
        ctx.moveTo(0,0); ctx.arc(0,0, r*0.6, a-0.2, a+0.2); ctx.lineTo(0,0);
    }
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";

    ctx.restore();
  }

  function drawPiston(cx, cy, angle) {
    const cr = ENGINE.crankR * S;
    const rl = ENGINE.rodL * S;
    const cPinX = Math.cos(angle) * cr;
    const cPinY = Math.sin(angle) * cr;
    const rodDy = Math.sqrt(rl*rl - cPinX*cPinX);
    const pistonY = cPinY - rodDy;

    ctx.save();
    ctx.translate(cx, cy);

    // Cylinder Background
    const cylW = (ENGINE.pistonW + 20) * S;
    const cylH = (ENGINE.pistonH + ENGINE.crankR * 2 + 20) * S;
    
    ctx.fillStyle = "rgba(30, 30, 40, 0.8)";
    ctx.fillRect(-cylW/2, -cylH - 50*S, cylW, cylH);
    
    // --- FIRE ANIMATION ---
    if (isRevving) {
        ctx.save();
        ctx.globalCompositeOperation = "lighter";
        
        const fireY = pistonY - 40 * S;
        const grad = ctx.createRadialGradient(0, fireY - 30*S, 5*S, 0, fireY, 50*S);
        grad.addColorStop(0, "rgba(255, 255, 200, 1)"); 
        grad.addColorStop(0.3, "rgba(255, 150, 0, 0.8)");
        grad.addColorStop(0.7, "rgba(255, 50, 0, 0.5)");
        grad.addColorStop(1, "transparent");
        
        ctx.fillStyle = grad;
        const scaleX = (Math.random() * 0.2 + 0.9) * (cylW / 100);
        const scaleY = Math.random() * 0.5 + 0.8;
        
        ctx.translate(0, fireY);
        ctx.scale(scaleX, scaleY);
        ctx.beginPath(); ctx.arc(0, 0, 60*S, 0, Math.PI*2); ctx.fill();
        ctx.restore();
    }
    // -----------------------

    // Neon Cylinder Walls
    drawNeonLine(ctx, -cylW/2, -cylH-50*S, -cylW/2, 0, "#00f2ea", 2*S);
    drawNeonLine(ctx, cylW/2, -cylH-50*S, cylW/2, 0, "#00f2ea", 2*S);

    // Rod
    ctx.beginPath(); ctx.moveTo(cPinX, cPinY); ctx.lineTo(0, pistonY);
    ctx.lineWidth = 12 * S; ctx.strokeStyle = "#555"; ctx.lineCap = "round"; 
    ctx.stroke();
    drawNeonLine(ctx, cPinX, cPinY, 0, pistonY, "rgba(255,255,255,0.3)", 4*S);
    
    // Piston Head
    const pW = ENGINE.pistonW * S;
    const pH = ENGINE.pistonH * S;
    ctx.translate(0, pistonY);
    
    setMetal(ctx, 'steel', -pH/2, pH);
    ctx.fillRect(-pW/2, -pH/2, pW, pH);
    
    ctx.fillStyle = "#00f2ea"; ctx.fillRect(-pW/2, -pH/4, pW, 2*S); 
    ctx.fillStyle = "#ff0050"; ctx.fillRect(-pW/2, 0, pW, 2*S);
    
    ctx.restore();
    return { x: cx, y: cy + pistonY };
  }

  function drawFlywheel(cx, cy, angle) {
    const r = ENGINE.flywheelR * S;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    
    setMetal(ctx, 'gold', -r, r*2);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0,r*0.9,0,Math.PI*2); ctx.stroke();
    
    ctx.globalCompositeOperation = "destination-out";
    for(let i=0; i<4; i++) {
        const a = (i/4) * Math.PI*2;
        ctx.beginPath();
        const dist = r * 0.55;
        ctx.arc(Math.cos(a)*dist, Math.sin(a)*dist, r*0.25, 0, Math.PI*2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.restore();
  }

  // --- PIXELATED CONFETTI ---
  function blastConfetti() {
    const colors = ['#00f2ea', '#ffd700', '#ff0050', '#ffffff', '#00ff00'];
    for(let i = 0; i < 200; i++) {
        particles.push({
          x: ENGINE.x, 
          y: ENGINE.y - 50*S,
          vx: (Math.random() - 0.5) * 40 * S,
          vy: (Math.random() - 1.2) * 50 * S,
          life: 1.0 + Math.random() * 1.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.floor(Math.random() * 8 + 4), 
          drag: 0.96,
          gravity: 0.5 * S
        });
    }
  }

  function spawnParticle(x, y) {
    particles.push({
      x: x, y: y,
      vx: (Math.random() - 0.5) * 10 * S,
      vy: (Math.random() - 2) * 10 * S,
      life: 1.0, 
      color: Math.random() > 0.5 ? '#00f2ea' : '#ffd700', 
      size: Math.floor(Math.random() * 3 + 2),
      drag: 0.98,
      gravity: 0
    });
  }

  function loop() {
    requestAnimationFrame(loop);
    
    rpmTarget = isRevving ? 800 : 60;
    rpm += (rpmTarget - rpm) * 0.05;
    angle += (rpm / 60) * 0.2;

    ctx.fillStyle = "#0b0b15";
    ctx.fillRect(0, 0, W, H);
    
    ctx.strokeStyle = "rgba(255,255,255,0.03)";
    ctx.lineWidth = 1;

    const gearX = ENGINE.x - 120 * S;
    const gearY = ENGINE.y + 50 * S;
    
    drawNeonLine(ctx, gearX, gearY, ENGINE.x, ENGINE.y, "#333", 10*S);

    drawGear(gearX, gearY, 24, 60*S, -angle * 0.5);
    drawFlywheel(ENGINE.x, ENGINE.y, angle);
    const exhaust = drawPiston(ENGINE.x, ENGINE.y, angle);

    if(rpm > 300) {
        if(Math.random() > 0.4) spawnParticle(ENGINE.x, ENGINE.y);
        if(Math.random() > 0.6) spawnParticle(exhaust.x, exhaust.y);
    }
    
    // Draw Particles
    ctx.globalCompositeOperation = "lighter"; 
    for(let i=particles.length-1; i>=0; i--) {
        const p = particles[i];
        
        p.x += p.vx; 
        p.y += p.vy; 
        
        if (p.gravity) {
            p.vy += p.gravity;
            p.vx *= p.drag;
            p.vy *= p.drag;
        } else {
            p.vy += 0.5 * S; 
        }

        p.life -= 0.015;

        if(p.life <= 0) { particles.splice(i, 1); continue; }
        
        ctx.globalAlpha = Math.min(p.life, 1.0); 
        ctx.fillStyle = p.color;
        
        const px = (p.x | 0);
        const py = (p.y | 0);
        const ps = (p.size * S) | 0;
        
        ctx.fillRect(px, py, ps, ps);
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1.0;

    const vig = ctx.createRadialGradient(W/2, H/2, W/4, W/2, H/2, W);
    vig.addColorStop(0, "transparent"); 
    vig.addColorStop(1, "rgba(0, 0, 0, 0.5)"); 
    ctx.fillStyle = vig; ctx.fillRect(0,0,W,H);
  }

  function startRev(e) { 
      if(e)e.preventDefault(); 
      isRevving = true; 
      btn.innerText = "MAX_RPM"; 
      btn.style.background="var(--accent-cyan)"; 
      btn.style.color="#000"; 
      
      playIgniteSound();
      blastConfetti();
  }
  
  function stopRev(e) { 
      if(e)e.preventDefault(); 
      isRevving = false; 
      btn.innerText = "IGNITE"; 
      btn.style.background=""; 
      btn.style.color="#fff"; 
  }

  btn.addEventListener('mousedown', startRev); btn.addEventListener('touchstart', startRev);
  btn.addEventListener('mouseup', stopRev); btn.addEventListener('touchend', stopRev);
  window.addEventListener('blur', stopRev);

  loop();
})();