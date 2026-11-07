'use strict';

// 可选：填入你的真实邮箱和 GitHub 用户名；留空时不会显示相应按钮。
const PROFILE = {
  email: '',
  github: '',
};

(() => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  $('year').textContent = new Date().getFullYear();
  if (PROFILE.email.trim()) {
    $('email-link').href = `mailto:${PROFILE.email.trim()}`;
    $('email-link').hidden = false;
  }
  if (/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(PROFILE.github.trim())) {
    $('github-link').href = `https://github.com/${PROFILE.github.trim()}`;
    $('github-link').hidden = false;
  }

  let toastTimeout;
  function notify(message) {
    clearTimeout(toastTimeout);
    $('toast').textContent = message;
    $('toast').classList.add('visible');
    toastTimeout = setTimeout(() => $('toast').classList.remove('visible'), 2600);
  }
  $('copy-link').addEventListener('click', async () => {
    if (location.protocol === 'file:') {
      notify('部署上线后，即可复制并分享主页链接。');
      return;
    }
    const url = new URL(location.href);
    url.hash = '';
    try {
      await navigator.clipboard.writeText(url.href);
      notify('主页链接已复制，期待与你相遇。');
    } catch {
      notify('请从浏览器地址栏复制主页链接。');
    }
  });

  // 两个画布共用高清屏适配，限制像素比以控制移动端开销。
  function canvasSurface(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const surface = { canvas, ctx, width: 0, height: 0 };
    surface.resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      surface.width = bounds.width;
      surface.height = bounds.height;
      canvas.width = Math.round(bounds.width * ratio);
      canvas.height = Math.round(bounds.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };
    return surface;
  }

  // HERO：旋转球面上的网络节点 + 数学曲面网格，全部由 Canvas 实时绘制。
  const network = canvasSurface($('network-canvas'));
  if (network) {
    const { ctx, canvas } = network;
    let rotation = 0.28;
    let pointerX = 0;
    let pointerY = 0;
    let networkVisible = true;
    let animationId = 0;
    let previousTime = 0;
    const points = Array.from({ length: 64 }, (_, i) => {
      const y = 1 - (i / 63) * 2;
      const r = Math.sqrt(1 - y * y);
      const angle = i * Math.PI * (3 - Math.sqrt(5));
      return [Math.cos(angle) * r, y, Math.sin(angle) * r];
    });
    const edges = [];
    points.forEach((a, i) => points.forEach((b, j) => {
      if (j > i && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.56) edges.push([i, j]);
    }));

    function drawNetwork() {
      const { width: w, height: h } = network;
      if (!w || !h) return;
      ctx.clearRect(0, 0, w, h);
      const cx = w * 0.5 + pointerX * 7;
      const cy = h * 0.47 + pointerY * 7;
      const radius = Math.min(w * 0.31, h * 0.31);
      const project = ([x, y, z]) => {
        const rx = x * Math.cos(rotation) + z * Math.sin(rotation);
        const rz = -x * Math.sin(rotation) + z * Math.cos(rotation);
        const tilt = -.22;
        const ry = y * Math.cos(tilt) - rz * Math.sin(tilt);
        const depth = y * Math.sin(tilt) + rz * Math.cos(tilt);
        const perspective = 3.6 / (3.6 - depth * 0.35);
        return { x: cx + rx * radius * perspective, y: cy + ry * radius * perspective, z: depth };
      };

      // 下方的波动曲面。
      const meshPoint = (u, v) => {
        const wave = Math.sin(u * .85 + rotation * 1.4) * Math.cos(v * .7) * 13;
        return [cx + (u - v) * w * .033, cy + radius * .67 + (u + v) * h * .012 + wave];
      };
      ctx.lineWidth = .6;
      for (let i = -6; i <= 6; i++) {
        for (const axis of [0, 1]) {
          ctx.beginPath();
          for (let j = -6; j <= 6; j += .25) {
            const [x, y] = axis ? meshPoint(i, j) : meshPoint(j, i);
            if (j === -6) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = `rgba(143, 125, 204, ${.09 + (i + 6) * .005})`;
          ctx.stroke();
        }
      }

      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 1.55);
      glow.addColorStop(0, '#a88be71a');
      glow.addColorStop(.6, '#7d68b60c');
      glow.addColorStop(1, '#7d68b600');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);

      // 倾斜轨道。
      for (let orbit = 0; orbit < 3; orbit++) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-.45 + orbit * .83);
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * (1.42 + orbit * .07), radius * (.4 + orbit * .09), 0, 0, Math.PI * 2);
        ctx.strokeStyle = orbit === 1 ? '#a4dfca30' : '#b4a0f52e';
        ctx.lineWidth = .75;
        ctx.stroke();
        const t = rotation * (orbit % 2 ? -1 : 1) + orbit * 2;
        const px = Math.cos(t) * radius * (1.42 + orbit * .07);
        const py = Math.sin(t) * radius * (.4 + orbit * .09);
        ctx.fillStyle = orbit === 1 ? '#c7ebad' : '#c8b8ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(px, py, 2.6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      const projected = points.map(project);
      for (const [i, j] of edges) {
        const a = projected[i]; const b = projected[j];
        const opacity = .12 + ((a.z + b.z + 2) / 4) * .4;
        ctx.strokeStyle = `rgba(166, 148, 229, ${opacity})`;
        ctx.lineWidth = .65;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      projected.map((p, i) => ({ ...p, i })).sort((a, b) => a.z - b.z).forEach((p) => {
        const alpha = .35 + ((p.z + 1) / 2) * .65;
        ctx.fillStyle = p.i % 9 === 0 ? `rgba(176, 230, 204, ${alpha})` : `rgba(207, 188, 255, ${alpha})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.z > .3 ? 2.5 : 1.6, 0, Math.PI * 2); ctx.fill();
        if (p.i % 11 === 0 && p.z > 0) {
          ctx.strokeStyle = '#c3acff33';
          ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.stroke();
        }
      });
      ctx.font = 'italic 32px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ece6ffc9';
      ctx.fillText('ƒ', cx, cy + 10);
      ctx.font = '7px monospace';
      ctx.fillStyle = '#ad9dc59a';
      ctx.fillText('LATENT SPACE', cx, cy + 27);
    }

    function animateNetwork(time) {
      animationId = 0;
      if (document.hidden || !networkVisible || reducedMotion.matches) return;
      if (time - previousTime > 32) {
        rotation += Math.min((time - previousTime) || 32, 64) * .00013;
        previousTime = time;
        drawNetwork();
      }
      animationId = requestAnimationFrame(animateNetwork);
    }
    function syncNetwork() {
      if (animationId) cancelAnimationFrame(animationId);
      animationId = 0;
      previousTime = 0;
      drawNetwork();
      if (!document.hidden && networkVisible && !reducedMotion.matches) animationId = requestAnimationFrame(animateNetwork);
    }
    canvas.addEventListener('pointermove', (event) => {
      const box = canvas.getBoundingClientRect();
      pointerX = (event.clientX - box.left) / box.width * 2 - 1;
      pointerY = (event.clientY - box.top) / box.height * 2 - 1;
      $('coord-x').textContent = pointerX.toFixed(3);
      $('coord-y').textContent = (-pointerY).toFixed(3);
      if (reducedMotion.matches) drawNetwork();
    });
    canvas.addEventListener('pointerleave', () => {
      pointerX = 0; pointerY = 0;
      $('coord-x').textContent = '0.000'; $('coord-y').textContent = '0.000';
      if (reducedMotion.matches) drawNetwork();
    });
    new ResizeObserver(() => { network.resize(); drawNetwork(); }).observe(canvas);
    new IntersectionObserver(([entry]) => { networkVisible = entry.isIntersecting; syncNetwork(); }, { rootMargin: '50px' }).observe(canvas);
    reducedMotion.addEventListener('change', syncNetwork);
    document.addEventListener('visibilitychange', syncNetwork);
    network.resize(); syncNetwork();
  }

  // 数学实验室：不依赖服务端或第三方图表库，数据均为演示用模拟数据。
  const surface = canvasSurface($('experiment-canvas'));
  if (!surface) return;
  const ctx = surface.ctx;
  const state = { mode: 'gradient', rate: .1, sigma: 1, noise: .8, theta: 2.5, iteration: 0, path: [2.5], running: false, seed: 42, frame: 0, lastTime: 0, phase: 0, sample: [] };
  const descriptions = {
    gradient: { title: '每一小步，<br>都更接近答案。', description: '沿着函数梯度的反方向更新参数。学习率决定步子的大小：太小走得慢，太大则可能错过最优点。', equation: 'θ<sub>t+1</sub> = θ<sub>t</sub> − η ∇L(θ<sub>t</sub>)', label: '学习率 η', min: '.02', max: '.45', step: '.01', name: 'GRADIENT DESCENT', footnote: '从一个起点，逐步靠近最优解。', metric1: 'ITERATION', metric2: 'LOSS', button: '开始迭代' },
    normal: { title: '随机背后，<br>藏着熟悉的钟形。', description: '均值 μ 固定为 0，改变标准差 σ，观察分布如何变宽或变窄。阴影面积是随机变量落在 [−1, 1] 内的概率。', equation: 'f(x) = e<sup>−(x−μ)²/(2σ²)</sup> / (σ√<span style="text-decoration:overline">2π</span>)', label: '标准差 σ', min: '.4', max: '2', step: '.01', name: 'NORMAL DISTRIBUTION', footnote: '阴影区域：P(−1 ≤ X ≤ 1)，均值 μ = 0。', metric1: 'STD. DEVIATION', metric2: 'P(−1 ≤ X ≤ 1)', button: '播放变化' },
    regression: { title: '一条直线，<br>理解数据的趋势。', description: '用最小二乘法为模拟样本拟合一条直线。调节噪声，观察散点与拟合优度 R² 如何变化；重新采样可生成新数据。', equation: 'ŷ = β̂<sub>0</sub> + β̂<sub>1</sub> x', label: '噪声强度', min: '0', max: '2.5', step: '.05', name: 'LINEAR REGRESSION', footnote: '仅使用浏览器生成的模拟数据，不代表实测结果。', metric1: 'SLOPE β̂₁', metric2: 'R² SCORE', button: '重新采样' },
  };

  function setMetrics(a, b) { $('metric-one').textContent = a; $('metric-two').textContent = b; }
  function buttonLabel() {
    const runningText = state.mode === 'normal' ? '暂停变化' : '暂停迭代';
    $('run-experiment').innerHTML = `${state.running ? runningText : descriptions[state.mode].button} <span aria-hidden="true">${state.running ? 'Ⅱ' : state.mode === 'regression' ? '↻' : '▶'}</span>`;
  }
  function stop() {
    state.running = false;
    cancelAnimationFrame(state.frame);
    state.frame = 0;
    buttonLabel();
  }
  function seededRandom(seed) {
    let n = seed >>> 0;
    return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; };
  }
  function createSample() {
    const random = seededRandom(state.seed);
    state.sample = Array.from({ length: 36 }, (_, i) => ({ x: .2 + i / 35 * 5.6, error: (random() + random() + random() - 1.5) * 1.8 }));
  }
  function fitRegression() {
    const data = state.sample.map(p => ({ x: p.x, y: .9 + 1.45 * p.x + p.error * state.noise }));
    const mx = data.reduce((s, p) => s + p.x, 0) / data.length;
    const my = data.reduce((s, p) => s + p.y, 0) / data.length;
    const sxx = data.reduce((s, p) => s + (p.x - mx) ** 2, 0);
    const slope = data.reduce((s, p) => s + (p.x - mx) * (p.y - my), 0) / sxx;
    const intercept = my - slope * mx;
    const sst = data.reduce((s, p) => s + (p.y - my) ** 2, 0);
    const sse = data.reduce((s, p) => s + (p.y - (intercept + slope * p.x)) ** 2, 0);
    return { data, slope, intercept, r2: sst ? 1 - sse / sst : 1 };
  }
  function erf(x) {
    const t = 1 / (1 + .3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x);
    return (x < 0 ? -1 : 1) * y;
  }

  function chart(xMin, xMax, yMin, yMax, xTicks, yTicks) {
    const { width: w, height: h } = surface;
    ctx.clearRect(0, 0, w, h);
    const margin = { left: 38, top: 25, right: 15, bottom: 30 };
    const plotW = Math.max(w - margin.left - margin.right, 1);
    const plotH = Math.max(h - margin.top - margin.bottom, 1);
    const x = v => margin.left + (v - xMin) / (xMax - xMin) * plotW;
    const y = v => margin.top + plotH - (v - yMin) / (yMax - yMin) * plotH;
    ctx.lineWidth = 1;
    ctx.font = '8px monospace';
    for (const tick of xTicks) {
      ctx.strokeStyle = '#8e95b314'; ctx.beginPath(); ctx.moveTo(x(tick), margin.top); ctx.lineTo(x(tick), h - margin.bottom); ctx.stroke();
      ctx.fillStyle = '#6e7890'; ctx.textAlign = 'center'; ctx.fillText(String(tick), x(tick), h - 12);
    }
    for (const tick of yTicks) {
      ctx.strokeStyle = '#8e95b314'; ctx.beginPath(); ctx.moveTo(margin.left, y(tick)); ctx.lineTo(w - margin.right, y(tick)); ctx.stroke();
      ctx.fillStyle = '#6e7890'; ctx.textAlign = 'right'; ctx.fillText(String(tick), margin.left - 9, y(tick) + 3);
    }
    ctx.strokeStyle = '#9ba0c033';
    if (yMin <= 0 && yMax >= 0) { ctx.beginPath(); ctx.moveTo(margin.left, y(0)); ctx.lineTo(w - margin.right, y(0)); ctx.stroke(); }
    if (xMin <= 0 && xMax >= 0) { ctx.beginPath(); ctx.moveTo(x(0), margin.top); ctx.lineTo(x(0), h - margin.bottom); ctx.stroke(); }
    return { x, y, w, h, margin };
  }
  function curve(graph, fn, from, to, color, width = 2) {
    ctx.beginPath();
    for (let i = 0; i <= 200; i++) {
      const vx = from + (to - from) * i / 200;
      if (i === 0) ctx.moveTo(graph.x(vx), graph.y(fn(vx))); else ctx.lineTo(graph.x(vx), graph.y(fn(vx)));
    }
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function dot(x, y, size, color, glow = false) {
    ctx.save(); ctx.fillStyle = color;
    if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 14; }
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  }
  function annotation(text, x, y, color = '#a6afc4') {
    ctx.font = '9px monospace'; ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(text, x, y);
  }

  function drawExperiment() {
    if (!surface.width || !surface.height) return;
    if (state.mode === 'gradient') {
      const g = chart(-3.2, 3.2, -.6, 10.5, [-3, -2, -1, 0, 1, 2, 3], [0, 2, 4, 6, 8, 10]);
      curve(g, x => x * x, -3.1, 3.1, '#b7a3ff', 2);
      annotation('L(θ) = θ²', g.margin.left + 12, 22, '#b7a3ff');
      state.path.forEach((theta, i) => {
        if (i > 0) {
          const last = state.path[i - 1];
          ctx.strokeStyle = '#a3dfc05c'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(g.x(last), g.y(last * last)); ctx.lineTo(g.x(theta), g.y(theta * theta)); ctx.stroke();
        }
        dot(g.x(theta), g.y(theta * theta), i === state.path.length - 1 ? 5 : 2.4, i === state.path.length - 1 ? '#d7edaa' : '#8adaca80', i === state.path.length - 1);
      });
      ctx.setLineDash([3, 4]); ctx.strokeStyle = '#d7edaa38'; ctx.beginPath(); ctx.moveTo(g.x(state.theta), g.y(state.theta ** 2)); ctx.lineTo(g.x(state.theta), g.y(0)); ctx.stroke(); ctx.setLineDash([]);
      annotation(`θ = ${state.theta.toFixed(4)}`, g.w - 115, 22, '#d7edaa');
      setMetrics(String(state.iteration), (state.theta ** 2).toFixed(4));
      $('experiment-canvas').setAttribute('aria-label', `梯度下降：迭代 ${state.iteration} 次，θ 为 ${state.theta.toFixed(4)}，损失为 ${(state.theta ** 2).toFixed(4)}。`);
    } else if (state.mode === 'normal') {
      const density = x => Math.exp(-x * x / (2 * state.sigma ** 2)) / (state.sigma * Math.sqrt(2 * Math.PI));
      const g = chart(-4, 4, -.04, 1.12, [-4, -2, 0, 2, 4], [0, .25, .5, .75, 1]);
      const fill = ctx.createLinearGradient(0, g.y(1), 0, g.y(0));
      fill.addColorStop(0, '#b7a3ff55'); fill.addColorStop(1, '#b7a3ff0a');
      ctx.beginPath(); ctx.moveTo(g.x(-1), g.y(0));
      for (let i = 0; i <= 100; i++) { const x = -1 + i / 50; ctx.lineTo(g.x(x), g.y(density(x))); }
      ctx.lineTo(g.x(1), g.y(0)); ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
      curve(g, density, -4, 4, '#b7a3ff');
      for (const x of [-1, 1]) {
        ctx.setLineDash([3, 4]); ctx.strokeStyle = '#b7a3ff55'; ctx.beginPath(); ctx.moveTo(g.x(x), g.y(0)); ctx.lineTo(g.x(x), g.y(density(x))); ctx.stroke(); ctx.setLineDash([]);
      }
      dot(g.x(0), g.y(density(0)), 4, '#d7edaa', true);
      annotation(`N(0, ${state.sigma.toFixed(2)}²)`, g.margin.left + 12, 22, '#b7a3ff');
      const probability = erf(1 / (state.sigma * Math.sqrt(2)));
      setMetrics(state.sigma.toFixed(2), `${(probability * 100).toFixed(1)}%`);
      $('experiment-canvas').setAttribute('aria-label', `均值为 0 的正态分布：标准差 ${state.sigma.toFixed(2)}，落在负 1 到 1 之间的概率为 ${(probability * 100).toFixed(1)}%。`);
    } else {
      const fit = fitRegression();
      const ys = fit.data.map(p => p.y);
      const yMin = Math.min(-1, Math.floor(Math.min(...ys)) - 1);
      const yMax = Math.max(10, Math.ceil(Math.max(...ys)) + 1);
      const ticks = [];
      for (let y = Math.ceil(yMin / 2) * 2; y <= yMax; y += 2) ticks.push(y);
      const g = chart(0, 6.2, yMin, yMax, [0, 1, 2, 3, 4, 5, 6], ticks);
      fit.data.forEach(p => {
        ctx.strokeStyle = '#8adaca26'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x(p.x), g.y(p.y)); ctx.lineTo(g.x(p.x), g.y(fit.intercept + fit.slope * p.x)); ctx.stroke();
        dot(g.x(p.x), g.y(p.y), 3, '#8adacac9');
      });
      curve(g, x => fit.intercept + fit.slope * x, 0, 6, '#b7a3ff');
      annotation(`ŷ = ${fit.slope.toFixed(2)}x ${fit.intercept < 0 ? '−' : '+'} ${Math.abs(fit.intercept).toFixed(2)}`, g.margin.left + 12, 20, '#b7a3ff');
      setMetrics(fit.slope.toFixed(3), fit.r2.toFixed(3));
      $('experiment-canvas').setAttribute('aria-label', `36 个模拟样本的线性回归：斜率 ${fit.slope.toFixed(3)}，拟合优度 R 平方为 ${fit.r2.toFixed(3)}。`);
    }
  }
  function updateSlider() {
    const value = state.mode === 'gradient' ? state.rate : state.mode === 'normal' ? state.sigma : state.noise;
    $('parameter-slider').value = value;
    $('parameter-value').textContent = value.toFixed(2);
  }
  function resetExperiment() {
    stop();
    state.theta = 2.5; state.iteration = 0; state.path = [2.5];
    state.rate = .1; state.sigma = 1; state.noise = .8; state.seed = 42;
    createSample(); updateSlider();
    $('plot-status').textContent = 'READY';
    drawExperiment();
  }
  function selectMode(mode) {
    stop(); state.mode = mode;
    const config = descriptions[mode];
    document.querySelectorAll('.lab-tab').forEach(tab => {
      const selected = tab.dataset.mode === mode;
      tab.classList.toggle('active', selected);
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });
    $('experiment-panel').setAttribute('aria-labelledby', `tab-${mode}`);
    $('experiment-title').innerHTML = config.title;
    $('experiment-description').textContent = config.description;
    $('experiment-equation').innerHTML = config.equation;
    $('parameter-label').textContent = config.label;
    for (const key of ['min', 'max', 'step']) $('parameter-slider')[key] = config[key];
    $('plot-name').textContent = config.name;
    $('plot-footnote').textContent = config.footnote;
    $('metric-label-one').textContent = config.metric1;
    $('metric-label-two').textContent = config.metric2;
    resetExperiment();
  }
  function stepGradient() {
    state.theta -= state.rate * 2 * state.theta;
    state.iteration++;
    state.path.push(state.theta);
    return Math.abs(state.theta) < .001 || state.iteration >= 200;
  }
  function animateExperiment(time) {
    if (!state.running) return;
    if (document.hidden) { stop(); $('plot-status').textContent = 'PAUSED'; return; }
    if (state.mode === 'gradient' && time - state.lastTime >= 180) {
      state.lastTime = time;
      const complete = stepGradient();
      drawExperiment();
      if (complete) { stop(); $('plot-status').textContent = 'CONVERGED'; return; }
    } else if (state.mode === 'normal') {
      state.phase += Math.min(time - state.lastTime, 50) * .0008;
      state.lastTime = time;
      state.sigma = Math.round((1.2 + Math.sin(state.phase) * .8) * 100) / 100;
      updateSlider(); drawExperiment();
    }
    state.frame = requestAnimationFrame(animateExperiment);
  }
  $('run-experiment').addEventListener('click', () => {
    if (state.mode === 'regression') {
      state.seed++; createSample(); drawExperiment(); $('plot-status').textContent = 'RESAMPLED'; return;
    }
    if (state.running) { stop(); $('plot-status').textContent = 'PAUSED'; return; }
    if (state.mode === 'gradient' && (Math.abs(state.theta) < .001 || state.iteration >= 200)) {
      state.theta = 2.5; state.iteration = 0; state.path = [2.5];
    }
    if (reducedMotion.matches) {
      if (state.mode === 'gradient') { while (!stepGradient()) { /* 用户开启减少动态效果时直接显示计算结果。 */ } $('plot-status').textContent = 'CONVERGED'; }
      else { state.sigma = state.sigma >= 1.95 ? .4 : Math.min(2, state.sigma + .2); updateSlider(); $('plot-status').textContent = 'UPDATED'; }
      drawExperiment(); return;
    }
    state.running = true; state.lastTime = performance.now();
    state.phase = Math.asin(Math.max(-1, Math.min(1, (state.sigma - 1.2) / .8)));
    $('plot-status').textContent = 'RUNNING'; buttonLabel();
    state.frame = requestAnimationFrame(animateExperiment);
  });
  $('reset-experiment').addEventListener('click', resetExperiment);
  $('parameter-slider').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    if (state.mode === 'gradient') state.rate = value;
    else if (state.mode === 'normal') { stop(); state.sigma = value; }
    else state.noise = value;
    updateSlider(); drawExperiment();
    $('plot-status').textContent = state.running ? 'RUNNING' : 'UPDATED';
  });
  const tabs = Array.from(document.querySelectorAll('.lab-tab'));
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectMode(tab.dataset.mode));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault(); tabs[next].focus(); selectMode(tabs[next].dataset.mode);
    });
  });
  reducedMotion.addEventListener('change', () => { if (state.running) { stop(); $('plot-status').textContent = 'PAUSED'; } });
  document.addEventListener('visibilitychange', () => { if (document.hidden && state.running) { stop(); $('plot-status').textContent = 'PAUSED'; } });
  new ResizeObserver(() => { surface.resize(); drawExperiment(); }).observe(surface.canvas);
  surface.resize(); selectMode('gradient');
})();
