// The curves a brush line is built from: every symbol is a list of points [x, y, weight] (weight: how hard the brush presses there, 1
// by default; under about 0.2 the brush is off the paper, moving unseen to its next stroke).

/** A smooth curve through the control points (Catmull-Rom), n steps to each span; push(x, y) is called with each point. */
export const cat = (ctrl, n, push) => {
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)],
      p1 = ctrl[i],
      p2 = ctrl[i + 1],
      p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const t = j / n,
        t2 = t * t,
        t3 = t2 * t;
      push(
        0.5 *
          (2 * p1[0] +
            (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
        0.5 *
          (2 * p1[1] +
            (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
      );
    }
  }
  const l = ctrl[ctrl.length - 1];
  push(l[0], l[1]);
};

/** Rounds a line's corners by cutting each one (Chaikin), n times over; weights are carried along. */
export const chaikin = (p, n) => {
  for (let k = 0; k < n; k++) {
    const o = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i],
        b = p[i + 1];
      const aw = a[2] ?? 1,
        bw = b[2] ?? 1;
      o.push(
        [a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25, aw * 0.75 + bw * 0.25],
        [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75, aw * 0.25 + bw * 0.75]
      );
    }
    o.push(p[p.length - 1]);
    p = o;
  }
  return p;
};

/** The same line as points `step` apart along it (the last point is kept as it is). */
export const resample = (p, step) => {
  const o = [p[0]];
  let acc = 0;
  for (let i = 1; i < p.length; i++) {
    let a = p[i - 1];
    const b = p[i];
    let d = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (!(d > 1e-6)) continue;
    let guard = 0;
    while (acc + d >= step && guard++ < 5000) {
      const t = (step - acc) / d;
      a = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, (a[2] ?? 1) + ((b[2] ?? 1) - (a[2] ?? 1)) * t];
      o.push(a);
      d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      acc = 0;
    }
    acc += d;
  }
  o.push(p[p.length - 1]);
  return o;
};

/** Each point averaged with its neighbours, up to r0 either side (fewer near the ends, which stay put). */
export const avg = (p, r0) =>
  p.map((q, i) => {
    const r = Math.min(r0, i, p.length - 1 - i);
    if (r <= 0) return q;
    let x = 0,
      y = 0;
    for (let j = -r; j <= r; j++) {
      x += p[i + j][0];
      y += p[i + j][1];
    }
    return [x / (2 * r + 1), y / (2 * r + 1)];
  });

/**
 * Where a line turns sharply, a brush doesn't stop and turn: it swings round in a small loop. This puts such a loop at each sharp
 * corner of P (R: the symbol's size), thinning the stroke round it.
 */
export const loopify = (P, R) => {
  const n = P.length,
    D = R * 0.13,
    hy = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]),
    th = new Array(n).fill(0),
    info = [];
  for (let i = 1; i < n - 1; i++) {
    let b = i,
      f = i;
    while (b > 0 && hy(P[b], P[i]) < D) b--;
    while (f < n - 1 && hy(P[f], P[i]) < D) f++;
    if (b === i || f === i) continue;
    const l1 = hy(P[i], P[b]) || 1,
      l2 = hy(P[f], P[i]) || 1,
      din = [(P[i][0] - P[b][0]) / l1, (P[i][1] - P[b][1]) / l1],
      dout = [(P[f][0] - P[i][0]) / l2, (P[f][1] - P[i][1]) / l2];
    th[i] = Math.atan2(din[0] * dout[1] - din[1] * dout[0], din[0] * dout[0] + din[1] * dout[1]);
    info[i] = { din, dout };
  }
  const out = [];
  let skipTo = -1;
  for (let i = 0; i < n; i++) {
    if (i < skipTo) continue;
    const t = th[i],
      w0 = P[i][2] ?? 1;
    let isC = Math.abs(t) > 0.95 && Math.abs(t) < 2.4 && w0 >= 0.3;
    if (isC)
      for (let j = Math.max(0, i - 14); j <= Math.min(n - 1, i + 14); j++)
        if ((P[j][2] ?? 1) < 0.3) {
          isC = false;
          break;
        }
    if (isC)
      for (let j = Math.max(1, i - 12); j <= Math.min(n - 2, i + 12); j++)
        if (Math.abs(th[j]) > Math.abs(t)) {
          isC = false;
          break;
        }
    out.push(P[i]);
    if (!isC) continue;
    const { din } = info[i],
      sg = t > 0 ? -1 : 1,
      Dl = sg * (Math.PI * 2 - Math.abs(t)),
      r = R * (0.12 + (0.1 * Math.abs(t)) / Math.PI),
      N = 56,
      step = (r * Math.abs(Dl)) / N;
    let p = [P[i][0], P[i][1]],
      dir = [din[0], din[1]];
    for (let k = 1; k <= N; k++) {
      const a = Dl / N,
        c = Math.cos(a),
        s2 = Math.sin(a);
      dir = [dir[0] * c - dir[1] * s2, dir[0] * s2 + dir[1] * c];
      p = [p[0] + dir[0] * step, p[1] + dir[1] * step];
      out.push([p[0], p[1], w0 * (1 - 0.6 * Math.sin((Math.PI * k) / N))]);
    }
    let f = i;
    while (f < n - 1 && hy(P[f], P[i]) < D * 0.5) f++;
    skipTo = f;
  }
  return out;
};

/** A list of numbers, each averaged with its neighbours up to r either side. */
export const smooth1 = (a, r) =>
  a.map((v, i) => {
    let t = 0,
      c = 0;
    for (let j = Math.max(0, i - r); j <= Math.min(a.length - 1, i + r); j++) {
      t += a[j];
      c++;
    }
    return t / c;
  });

/** The point a fraction f of the way from a to b. */
export const lerpPt = (a, b, f) => [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];

/** A smooth curve through the control points (see cat) whose weight runs from w0 at its start to w1 at its end. */
export const catW = (ctrl, n, w0, w1) => {
  const o = [];
  cat(ctrl, n, (x, y) => o.push([x, y]));
  return o.map((p, i) => [p[0], p[1], w0 + ((w1 - w0) * i) / Math.max(1, o.length - 1)]);
};

/** An unseen move from a to b: the link between two strokes of a symbol (at almost no weight), so one line runs through them all. */
export const link = (a, b) =>
  Array.from({ length: 16 }, (_, q) => [a[0] + ((b[0] - a[0]) * q) / 15, a[1] + ((b[1] - a[1]) * q) / 15, 0.001]);
