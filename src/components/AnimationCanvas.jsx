import React, { useEffect, useRef } from 'react';

export default function AnimationCanvas({ demoType, accent = '#fde047', reduceMotion = false, interactive = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let t = 0;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 300;
    const height = rect.height || 180;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const mouse = { x: -999, y: -999 };
    const balls = Array.from({ length: 6 }, (_, i) => ({
      x: width * (0.2 + i * 0.12),
      y: height * (0.3 + (i % 3) * 0.15),
      vx: (Math.random() - 0.5) * 3.5,
      vy: (Math.random() - 0.5) * 3.5,
      r: 10 + (i % 3) * 4,
      color: ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][i % 5],
    }));

    const particles = Array.from({ length: 36 }, () => ({
      ox: Math.random() * width,
      oy: Math.random() * height,
      x: 0,
      y: 0,
      r: 3 + Math.random() * 4,
      color: ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#1e1b18'][Math.floor(Math.random() * 5)],
    }));
    particles.forEach((p) => {
      p.x = p.ox;
      p.y = p.oy;
    });

    const handleMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const handleLeave = () => {
      mouse.x = -999;
      mouse.y = -999;
    };
    const handleClick = (e) => {
      if (demoType === 'bounce') {
        const r = canvas.getBoundingClientRect();
        balls.push({
          x: e.clientX - r.left,
          y: e.clientY - r.top,
          vx: (Math.random() - 0.5) * 5,
          vy: -3 - Math.random() * 3,
          r: 8 + Math.random() * 8,
          color: ['#fde047', '#fb7185', '#38bdf8', '#4ade80', '#c084fc'][Math.floor(Math.random() * 5)],
        });
        if (balls.length > 18) balls.shift();
      }
    };

    if (interactive) {
      canvas.addEventListener('mousemove', handleMove);
      canvas.addEventListener('mouseleave', handleLeave);
      canvas.addEventListener('click', handleClick);
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = '#fdfbf7';
      ctx.fillRect(0, 0, width, height);

      // Subtle paper dots
      ctx.fillStyle = 'rgba(30,27,24,0.08)';
      for (let gx = 16; gx < width; gx += 20) {
        for (let gy = 16; gy < height; gy += 20) {
          ctx.fillRect(gx, gy, 1.5, 1.5);
        }
      }

      const cx = width / 2;
      const cy = height / 2;

      if (demoType === 'orbit') {
        // Sun
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#1e1b18';
        ctx.stroke();

        [36, 58, 80].forEach((radius, idx) => {
          ctx.beginPath();
          ctx.setLineDash([4, 4]);
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(30,27,24,0.35)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.setLineDash([]);

          const angle = t * (0.025 - idx * 0.006) + idx * 2;
          const px = cx + Math.cos(angle) * radius;
          const py = cy + Math.sin(angle) * radius * 0.72;
          ctx.beginPath();
          ctx.arc(px, py, 7 - idx, 0, Math.PI * 2);
          ctx.fillStyle = ['#fb7185', '#38bdf8', '#4ade80'][idx];
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#1e1b18';
          ctx.stroke();
        });
      } else if (demoType === 'kinetic') {
        const words = ['PROMPT.', 'CODE.', 'RENDER.', 'SHIP!'];
        const step = Math.floor(t / 35) % words.length;
        const word = words[step];
        const scale = 1 + Math.sin((t % 35) * 0.18) * 0.08;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-0.05);
        ctx.scale(scale, scale);
        ctx.font = 'bold 30px "Permanent Marker", cursive';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = accent;
        ctx.fillText(word, 3, 3);
        ctx.fillStyle = '#1e1b18';
        ctx.fillText(word, 0, 0);
        ctx.restore();
      } else if (demoType === 'nodes') {
        const layers = [
          [cy - 36, cy, cy + 36],
          [cy - 45, cy - 15, cy + 15, cy + 45],
          [cy - 24, cy + 24],
        ];
        const xs = [cx - 75, cx, cx + 75];
        layers.forEach((layer, li) => {
          if (li < layers.length - 1) {
            layer.forEach((y1) => {
              layers[li + 1].forEach((y2) => {
                ctx.beginPath();
                ctx.moveTo(xs[li], y1);
                ctx.lineTo(xs[li + 1], y2);
                ctx.strokeStyle = 'rgba(30,27,24,0.25)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              });
            });
          }
        });
        layers.forEach((layer, li) => {
          layer.forEach((y, ni) => {
            const active = Math.floor((t / 15 + li + ni) % 3) === 0;
            ctx.beginPath();
            ctx.arc(xs[li], y, 8, 0, Math.PI * 2);
            ctx.fillStyle = active ? accent : '#fff';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#1e1b18';
            ctx.stroke();
          });
        });
      } else if (demoType === 'cube3d') {
        const s = 34;
        const pts = [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1],
        ];
        const ax = t * 0.02;
        const ay = t * 0.03;
        const proj = pts.map(([x, y, z]) => {
          const x1 = x * Math.cos(ay) - z * Math.sin(ay);
          const z1 = x * Math.sin(ay) + z * Math.cos(ay);
          const y2 = y * Math.cos(ax) - z1 * Math.sin(ax);
          return [cx + x1 * s, cy + y2 * s];
        });
        const edges = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7],
        ];
        ctx.strokeStyle = '#1e1b18';
        ctx.lineWidth = 2.2;
        edges.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(proj[a][0], proj[a][1]);
          ctx.lineTo(proj[b][0], proj[b][1]);
          ctx.stroke();
        });
        proj.forEach(([px, py]) => {
          ctx.beginPath();
          ctx.arc(px, py, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = accent;
          ctx.fill();
          ctx.stroke();
        });
      } else if (demoType === 'particles') {
        particles.forEach((p) => {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 60 && dist > 0) {
            p.x += (dx / dist) * 4;
            p.y += (dy / dist) * 4;
          } else {
            p.x += (p.ox - p.x) * 0.06;
            p.y += (p.oy - p.y) * 0.06;
          }
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#1e1b18';
          ctx.stroke();
        });
      } else if (demoType === 'wave') {
        const bars = 18;
        const barW = 7;
        const startX = cx - (bars * (barW + 4)) / 2;
        for (let i = 0; i < bars; i++) {
          const h = 16 + Math.abs(Math.sin(t * 0.07 + i * 0.45)) * 55;
          ctx.fillStyle = i % 2 === 0 ? accent : '#38bdf8';
          ctx.strokeStyle = '#1e1b18';
          ctx.lineWidth = 2;
          const bx = startX + i * (barW + 4);
          const by = cy - h / 2;
          ctx.fillRect(bx, by, barW, h);
          ctx.strokeRect(bx, by, barW, h);
        }
      } else if (demoType === 'bounce') {
        balls.forEach((b) => {
          if (!reduceMotion) {
            b.vy += 0.18;
            b.x += b.vx;
            b.y += b.vy;
            if (b.x - b.r < 4 || b.x + b.r > width - 4) b.vx *= -0.9;
            if (b.y + b.r > height - 4) {
              b.y = height - 4 - b.r;
              b.vy *= -0.82;
            }
            if (b.y - b.r < 4) {
              b.y = 4 + b.r;
              b.vy *= -0.82;
            }
          }
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
          ctx.fillStyle = b.color;
          ctx.fill();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#1e1b18';
          ctx.stroke();
        });
      } else if (demoType === 'spiral') {
        for (let i = 0; i < 65; i++) {
          const angle = i * 0.35 + t * 0.03;
          const r = i * 1.15;
          const px = cx + Math.cos(angle) * r;
          const py = cy + Math.sin(angle) * r * 0.7;
          ctx.beginPath();
          ctx.arc(px, py, 2.5 + (i % 3), 0, Math.PI * 2);
          ctx.fillStyle = i % 2 === 0 ? accent : '#fb7185';
          ctx.fill();
          ctx.lineWidth = 1.2;
          ctx.strokeStyle = '#1e1b18';
          ctx.stroke();
        }
      }

      if (!reduceMotion) {
        t += 1;
        animId = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      if (interactive) {
        canvas.removeEventListener('mousemove', handleMove);
        canvas.removeEventListener('mouseleave', handleLeave);
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [demoType, accent, reduceMotion, interactive]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full block rounded-lg cursor-crosshair"
    />
  );
}
