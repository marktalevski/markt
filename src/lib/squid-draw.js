// The squid from the Freediving page: a pointed mantle with fins on top, big eyes, six short arms and two long tentacles that stream out with
// speed and pulse when it's idle; pink with dark outlines. Freediving draws it swimming down the rope (the Sound deck
// has its own pixel version, in squid.js). drawSquid(ctx, x, y, s, t, v, col, rot, happy, o): s its scale, t time, v how fast it's moving (arms stream),
// col its fill, rot its turn, happy (^^ eyes and a blush); o.shut closes its eyes, o.liftL / o.liftR (0..1.4) swing a tentacle out
export function drawSquid(ctx, x, y, s, t, v, col, rot = 0, happy = 0, o = {}) {
    const ga = ctx.globalAlpha; ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.translate(0, -6); ctx.rotate(rot + v * .1 * Math.cos(rot)); ctx.translate(0, 6); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const pulse = .5 + .5 * Math.sin(t * 3.2), stretch = 1 + .5 * Math.abs(v), sway = Math.sin(t * 2.2) * 1.2, lL = o.liftL || 0, lR = o.liftR || 0;
    const arm = (bx, sp, L, ph) => { const p = [[bx, 4]]; for (let q = 1; q <= 6; q++) { const u = q / 6; p.push([bx + sp * u * (1.6 - .8 * pulse) + Math.sin(t * 3.6 + ph + u * 3) * 1.1 * u + sway * u, 4 + u * L * stretch]); } return p; };
    const arms = [-3.6, -2.2, -.8, .8, 2.2, 3.6].map((bx, k) => arm(bx, (k - 2.5) * .9, 7.5, k * .9)), tent = [arm(-1.5, -.6 - lL * 3.4, 13 * (1 - .4 * lL), 4), arm(1.5, .6 + lR * 3.4, 13 * (1 - .4 * lR), 5)];
    const path = p => { ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]); ctx.stroke(); };
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 3; arms.forEach(path); ctx.lineWidth = 2.4; tent.forEach(path);
    ctx.strokeStyle = col; ctx.lineWidth = 1.6; arms.forEach(path); ctx.lineWidth = 1.1; tent.forEach(path);
    ctx.fillStyle = col; tent.forEach(p => { const e = p[p.length - 1]; ctx.beginPath(); ctx.ellipse(e[0], e[1], 1.5, 2.2, 0, 0, 6.2832); ctx.fill(); ctx.strokeStyle = '#141414'; ctx.lineWidth = .9; ctx.stroke(); });
    ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.3; const fw = 1 + .25 * Math.sin(t * 4);
    ctx.beginPath(); ctx.moveTo(-3.2, -12); ctx.quadraticCurveTo(-9 * fw, -15, -4.2, -19); ctx.lineTo(0, -21); ctx.lineTo(4.2, -19); ctx.quadraticCurveTo(9 * fw, -15, 3.2, -12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -21); ctx.bezierCurveTo(5.5, -15, 6.2, -4, 5.4, 4.5); ctx.quadraticCurveTo(0, 6.5, -5.4, 4.5); ctx.bezierCurveTo(-6.2, -4, -5.5, -15, 0, -21); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (happy > .5) { const sg = Math.cos(rot + v * .1 * Math.cos(rot)) >= 0 ? 1 : -1; ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.05; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      [-2.4, 2.4].forEach(ex => { ctx.beginPath(); ctx.moveTo(ex - 1.6, 1 + .9 * sg); ctx.lineTo(ex, 1 - 1 * sg); ctx.lineTo(ex + 1.6, 1 + .9 * sg); ctx.stroke(); });
      ctx.globalAlpha = ctx.globalAlpha * .55; ctx.fillStyle = 'rgb(236,84,124)'; [-3.3, 3.3].forEach(ex => { ctx.beginPath(); ctx.ellipse(ex, 1 + 2.6 * sg, 1.3, .8, 0, 0, 6.2832); ctx.fill(); }); ctx.globalAlpha = ctx.globalAlpha / .55; }
    else if (o.shut) { ctx.strokeStyle = '#141414'; ctx.lineWidth = 1.05; [-2.4, 2.4].forEach(ex => { ctx.beginPath(); ctx.moveTo(ex - 1.6, 1.4); ctx.quadraticCurveTo(ex, 2.4, ex + 1.6, 1.4); ctx.stroke(); }); }
    else { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2.4, 1, 1.9, 0, 6.2832); ctx.arc(2.4, 1, 1.9, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#141414'; ctx.beginPath(); ctx.arc(-2.2, 1.4, 1.1, 0, 6.2832); ctx.arc(2.6, 1.4, 1.1, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = ga * .55; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(-2.4, -10, 1.1, 3.4, .1, 0, 6.2832); ctx.fill();
    ctx.restore(); ctx.globalAlpha = ga;
}
