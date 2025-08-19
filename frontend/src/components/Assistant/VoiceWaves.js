import React, { useEffect, useRef } from 'react';

export default function VoiceWaves({ active = false, color = 'rgba(255,105,180,0.9)' }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return; const ctx = canvas.getContext('2d');
    let raf; const DPR = Math.min(2, window.devicePixelRatio || 1);
    function resize(){ canvas.width = canvas.clientWidth * DPR; canvas.height = canvas.clientHeight * DPR; }
    let t = 0;
    function draw(){
      const { width:w, height:h } = canvas; ctx.clearRect(0,0,w,h);
      const mid = h/2; const amp = active ? h*0.25 : h*0.08; const lines = 3;
      for (let i=0;i<lines;i++){
        const f = 0.8 + i*0.15; const phase = t*0.02*(i+1);
        ctx.beginPath(); ctx.strokeStyle = color; ctx.lineWidth = 2 * DPR;
        for (let x=0; x<w; x+=2*DPR){
          const y = mid + Math.sin((x/w)*Math.PI*2*f + phase) * amp * (1 - i*0.22);
          if (x===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        }
        ctx.stroke();
      }
      t += active ? 2 : 1; raf = requestAnimationFrame(draw);
    }
    const onResize = () => resize(); resize(); draw();
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [active, color]);
  return <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}><canvas ref={ref} style={{ width:'100%', height:'100%' }} /></div>;
}
