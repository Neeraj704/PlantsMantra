// Lightweight canvas-based confetti utility without external dependencies

export const fireConfetti = (type: 'delivery' | 'gift' | 'discount' | 'all') => {
  if (typeof window === 'undefined') return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const width = (canvas.width = window.innerWidth);
  const height = (canvas.height = window.innerHeight);

  let colors = ['#10b981', '#059669', '#34d399', '#f59e0b', '#fbbf24']; // default emerald & gold
  if (type === 'gift') {
    colors = ['#fbbf24', '#f59e0b', '#d97706', '#ec4899', '#f43f5e'];
  } else if (type === 'discount' || type === 'all') {
    colors = ['#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4'];
  }

  const particleCount = 75;
  const particles: Array<{
    x: number;
    y: number;
    r: number;
    color: string;
    vx: number;
    vy: number;
    tilt: number;
    tiltSpeed: number;
    alpha: number;
  }> = [];

  for (let i = 0; i < particleCount; i++) {
    particles.push({
      x: width * 0.5 + (Math.random() - 0.5) * 180,
      y: height * 0.45 + (Math.random() - 0.5) * 80,
      r: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: Math.random() * -12 - 4,
      tilt: Math.random() * 10 - 10,
      tiltSpeed: Math.random() * 0.1 + 0.05,
      alpha: 1,
    });
  }

  let animationFrameId: number;
  const startTime = Date.now();
  const duration = 2500; // 2.5 seconds

  const render = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > duration) {
      cancelAnimationFrame(animationFrameId);
      canvas.remove();
      return;
    }

    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.35; // gravity
      p.vx *= 0.98; // friction
      p.tilt += p.tiltSpeed;
      p.alpha = Math.max(0, 1 - elapsed / duration);

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.6, p.tilt, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    });

    animationFrameId = requestAnimationFrame(render);
  };

  animationFrameId = requestAnimationFrame(render);
};
