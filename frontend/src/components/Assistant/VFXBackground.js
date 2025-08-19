import React, { useEffect, useRef } from 'react';

// Neon gradient backdrop with subtle particle twinkle
export default function VFXBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    const DPR = Math.min(2, window.devicePixelRatio || 1);
    const particles = Array.from({ length: 60 }).map(() => ({
      x: Math.random(), y: Math.random(), r: 0.5 + Math.random() * 1.5, s: Math.random() * 0.6 + 0.2,
    }));
    function resize(){ canvas.width = canvas.clientWidth * DPR; canvas.height = canvas.clientHeight * DPR; }
    function draw(){
      const { width:w, height:h } = canvas;
      // gradient wash
      const g = ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0, 'rgba(255, 0, 128, 0.15)');
      g.addColorStop(1, 'rgba(0, 200, 255, 0.12)');
      ctx.fillStyle = g; ctx.fillRect(0,0,w,h);
      // glow orbs
      for (let i=0;i<4;i++){
        const cx = (0.2 + i*0.2) * w; const cy = (0.3 + (i%2)*0.2) * h; const r = 120 * DPR;
        const rg = ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        rg.addColorStop(0,'rgba(255,255,255,0.12)'); rg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fill();
      }
      // twinkles
      particles.forEach(p => {
        p.x += (Math.random()-0.5) * 0.001; p.y += (Math.random()-0.5) * 0.001;
        if (p.x<0) p.x=1; if (p.x>1) p.x=0; if (p.y<0) p.y=1; if (p.y>1) p.y=0;
        const x = p.x * w; const y = p.y * h; const r = p.r * DPR;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    }
    const onResize = () => { resize(); };
    resize(); draw();
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <div style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:0 }}>
      <canvas ref={canvasRef} style={{ width:'100%', height:'100%', display:'block' }} />
    </div>
  );
}
