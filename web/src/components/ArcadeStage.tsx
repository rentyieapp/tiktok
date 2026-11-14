import { useEffect, useRef } from 'react';
import { HORSE_RACERS, type ArcadeGameDef, type ArcadePlayer, type ArcadeStateView } from '@shared/arcade';

const W = 540;
const H = 960;

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toLocaleUpperCase('tr');
}

function nameBadge(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, color: string) {
  ctx.font = '600 14px system-ui, sans-serif';
  const width = Math.min(150, ctx.measureText(text).width + 18);
  rounded(ctx, x - width / 2, y, width, 24, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fill();
  ctx.strokeStyle = `${color}55`;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#2b2a33';
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y + 16);
}

function avatar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  player: ArcadePlayer,
  highlight = false,
) {
  ctx.save();
  if (highlight) {
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 20;
  }
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = player.eliminated ? '#b9b7c4' : player.color;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${Math.max(10, radius * 0.72)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials(player.name), x, y + 1);
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}

function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, hp: number) {
  rounded(ctx, x, y, width, 6, 3);
  ctx.fillStyle = 'rgba(20,20,30,0.12)';
  ctx.fill();
  rounded(ctx, x, y, Math.max(0, (width * hp) / 100), 6, 3);
  ctx.fillStyle = hp > 55 ? '#22a06b' : hp > 25 ? '#e3a008' : '#e5484d';
  ctx.fill();
}

function topBar(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  demo: boolean,
) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, 88);
  ctx.fillStyle = game.accent;
  rounded(ctx, 22, 24, 82, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(state.phase === 'running' ? 'CANLI' : demo ? 'DEMO' : 'YAYIN', 63, 44);

  ctx.fillStyle = '#17161d';
  ctx.font = '800 26px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(game.name, 120, 48);
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText(`${state.players.length} oyuncu · Tur ${state.round}`, 121, 68);

  if (state.phase === 'running' && state.endsAt) {
    const remain = Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
    const mm = Math.floor(remain / 60);
    const ss = remain % 60;
    ctx.fillStyle = '#17161d';
    ctx.font = '800 22px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`, W - 22, 46);
    ctx.fillStyle = '#8a8794';
    ctx.font = '500 10px system-ui, sans-serif';
    ctx.fillText('KALAN SÜRE', W - 22, 64);
  } else {
    ctx.fillStyle = '#8a8794';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(state.phase === 'finished' ? 'Tur bitti' : 'Lobi', W - 22, 46);
  }
}

function drawDance(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  t: number,
) {
  const cx = W / 2;
  const floorTop = 500;
  const floorBottom = 790;

  ctx.fillStyle = '#f7e6ee';
  ctx.fillRect(0, 88, W, 710);

  // spotlights
  for (let i = 0; i < 4; i += 1) {
    const angle = (i / 4) * Math.PI * 2 + t / 4000;
    const x = cx + Math.cos(angle) * 180;
    ctx.beginPath();
    ctx.moveTo(cx, 120);
    ctx.lineTo(x - 65, floorBottom);
    ctx.lineTo(x + 65, floorBottom);
    ctx.closePath();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(224,85,143,0.10)' : 'rgba(37,99,235,0.08)';
    ctx.fill();
  }

  // disco ball
  ctx.beginPath();
  ctx.arc(cx, 170, 36, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#e4b7ca';
  ctx.lineWidth = 2;
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.arc(cx, 170, 36, 0, Math.PI * 2);
    ctx.moveTo(cx - 36, 170 + i * 12);
    ctx.lineTo(cx + 36, 170 + i * 12);
    ctx.stroke();
  }
  ctx.strokeStyle = '#d49bb2';
  ctx.beginPath();
  ctx.moveTo(cx, 134);
  ctx.lineTo(cx, 108);
  ctx.stroke();

  // floor
  ctx.beginPath();
  ctx.moveTo(70, floorTop);
  ctx.lineTo(470, floorTop);
  ctx.lineTo(520, floorBottom);
  ctx.lineTo(20, floorBottom);
  ctx.closePath();
  ctx.fillStyle = '#2c2233';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 7; i += 1) {
    const y = floorTop + ((floorBottom - floorTop) * i) / 6;
    ctx.beginPath();
    ctx.moveTo(70 - (i * 50) / 6, y);
    ctx.lineTo(470 + (i * 50) / 6, y);
    ctx.stroke();
  }
  for (let i = -3; i <= 3; i += 1) {
    ctx.beginPath();
    ctx.moveTo(cx + i * 65, floorTop);
    ctx.lineTo(cx + i * 105, floorBottom);
    ctx.stroke();
  }

  state.players.slice(0, 18).forEach((player, index) => {
    const row = Math.floor(index / 6);
    const col = index % 6;
    const x = 125 + col * 58 + (row % 2) * 24;
    const y = 560 + row * 65;
    const bob = Math.sin(t / 260 + index) * 7;
    avatar(ctx, x, y + bob, 22, player);
    nameBadge(ctx, x, y + 34 + bob, player.name, player.color);
    rounded(ctx, x - 30, y + 58 + bob, 60, 5, 2.5);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();
    rounded(ctx, x - 30, y + 58 + bob, Math.min(60, player.score * 1.2), 5, 2.5);
    ctx.fillStyle = game.accent;
    ctx.fill();
  });
}

function drawPress(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  t: number,
) {
  ctx.fillStyle = game.soft;
  ctx.fillRect(0, 88, W, 710);

  // machine
  rounded(ctx, 348, 410, 130, 150, 20);
  ctx.fillStyle = '#2e2637';
  ctx.fill();
  rounded(ctx, 362, 426, 102, 48, 10);
  ctx.fillStyle = '#f4e7d3';
  ctx.fill();
  ctx.fillStyle = game.accent;
  ctx.font = '800 24px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('MATBAA', 413, 457);
  ctx.fillStyle = '#ffffff';
  rounded(ctx, 372, 490, 82, 10, 5);
  ctx.fill();
  rounded(ctx, 372, 510, 82, 10, 5);
  ctx.fill();

  // conveyor
  ctx.fillStyle = '#d9c6ad';
  rounded(ctx, 24, 650, 492, 50, 25);
  ctx.fill();
  ctx.fillStyle = '#bca789';
  for (let x = 40; x < 510; x += 34) {
    ctx.beginPath();
    ctx.arc(x, 675, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  // printed cards marching left
  const sorted = [...state.players].sort((a, b) => b.score - a.score).slice(0, 6);
  sorted.forEach((player, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 44 + col * 158;
    const y = 110 + row * 140 + Math.sin(t / 500 + index) * 3;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((index % 2 === 0 ? -1 : 1) * 0.018);
    rounded(ctx, 0, 0, 140, 118, 14);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = `${player.color}88`;
    ctx.lineWidth = 3;
    ctx.stroke();
    rounded(ctx, 10, 10, 120, 72, 10);
    ctx.fillStyle = game.soft;
    ctx.fill();
    avatar(ctx, 42, 46, 21, player);
    ctx.fillStyle = '#2b2a33';
    ctx.font = '700 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(player.name.slice(0, 12), 72, 42);
    ctx.fillStyle = '#8a8794';
    ctx.font = '500 11px system-ui, sans-serif';
    ctx.fillText(`${Math.floor(player.score)} baskı`, 72, 60);
    ctx.fillStyle = game.accent;
    rounded(ctx, 10, 88, Math.min(120, player.score * 2.2), 8, 4);
    ctx.fill();
    ctx.restore();
  });
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  t: number,
) {
  const bg = ctx.createLinearGradient(0, 88, 0, 798);
  bg.addColorStop(0, '#f2fbf8');
  bg.addColorStop(1, '#e6f6ef');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 88, W, 710);

  const cx = W / 2;
  const cy = 458;
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 260);
  glow.addColorStop(0, 'rgba(246,196,83,0.24)');
  glow.addColorStop(0.55, 'rgba(15,138,114,0.07)');
  glow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 88, W, 710);

  // zemin halkaları
  for (let ring = 3; ring >= 1; ring -= 1) {
    ctx.beginPath();
    ctx.ellipse(cx, cy, ring * 76 + 38, ring * 52 + 26, 0, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(15,138,114,${0.1 + ring * 0.05})`;
    ctx.lineWidth = ring === 1 ? 3 : 1.5;
    ctx.setLineDash(ring === 1 ? [] : [8, 8]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // merkezdeki soyut fener
  ctx.save();
  ctx.shadowColor = 'rgba(246,196,83,0.55)';
  ctx.shadowBlur = 42;
  ctx.beginPath();
  ctx.arc(cx, cy, 47, 0, Math.PI * 2);
  ctx.fillStyle = '#fffaf0';
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = '#f6c453';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 23, 0, Math.PI * 2);
  ctx.fillStyle = '#fff2c4';
  ctx.fill();
  ctx.strokeStyle = '#c7962e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 47);
  ctx.lineTo(cx, cy - 84);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy - 88, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#c7962e';
  ctx.fill();
  ctx.fillStyle = '#0a5b4a';
  ctx.font = '800 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SAYGI ÇEMBERİ', cx, 142);
  ctx.fillStyle = '#5f7a70';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillText('merkez fener', cx, cy + 82);

  const count = state.players.length;
  const twoRings = count > 13;
  const visible = state.players.slice(0, 24);
  visible.forEach((player, index) => {
    const ring = twoRings ? index % 2 : 0;
    const ringCount = twoRings ? Math.ceil(visible.length / 2) : visible.length;
    const ringIndex = twoRings ? Math.floor(index / 2) : index;
    const radiusX = ring === 0 ? 198 : 132;
    const radiusY = ring === 0 ? 138 : 88;
    const baseAngle = (ringIndex / Math.max(1, ringCount)) * Math.PI * 2;
    const angle = baseAngle + t * 0.00013 * (ring === 0 ? 1 : -1.15);
    const x = cx + Math.cos(angle) * radiusX;
    const y = cy + Math.sin(angle) * radiusY;
    ctx.save();
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 12;
    avatar(ctx, x, y, 22, player);
    ctx.restore();
    nameBadge(ctx, x, y + 34, player.name, player.color);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    rounded(ctx, x - 24, y - 38, 48, 17, 8);
    ctx.fill();
    ctx.fillStyle = game.accent;
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(player.score)} enerji`, x, y - 26);
  });

  ctx.fillStyle = '#8a8794';
  ctx.font = '500 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Yorumla katıl · beğeni ritmi güçlendirir', cx, 762);
}


function drawPromptCard(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  t: number,
) {
  const prompt = state.prompt;
  if (!prompt) return;
  const x = 24;
  const y = 108;
  const w = W - 48;
  rounded(ctx, x, y, w, 360, 26);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = `${game.accent}33`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = game.accent;
  rounded(ctx, x + 22, y + 20, 120, 30, 15);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(prompt.title.toLocaleUpperCase('tr'), x + 82, y + 40);

  ctx.fillStyle = '#17161d';
  ctx.font = '700 23px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const words = prompt.question.split(' ');
  let line = '';
  let lineY = y + 84;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 44) {
      ctx.fillText(line, x + 22, lineY);
      line = word;
      lineY += 30;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + 22, lineY);

  if (prompt.kind === 'quiz' && prompt.options) {
    prompt.options.forEach((option, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const ox = x + 22 + col * 238;
      const oy = y + 190 + row * 70;
      const correct = prompt.reveal && prompt.answerIndex === index;
      rounded(ctx, ox, oy, 222, 56, 14);
      ctx.fillStyle = correct ? '#d8f6e7' : '#f7f5f1';
      ctx.fill();
      ctx.strokeStyle = correct ? '#22a06b' : '#e5e0d8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = correct ? '#137a51' : '#4a4752';
      ctx.font = '700 18px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(['A', 'B', 'C', 'D'][index]!, ox + 16, oy + 35);
      ctx.font = '600 14px system-ui, sans-serif';
      ctx.fillStyle = '#2b2a33';
      const words2 = option.split(' ');
      let optionLine = '';
      let optionY = oy + 23;
      for (const word of words2) {
        const test = optionLine ? `${optionLine} ${word}` : word;
        if (ctx.measureText(test).width > 150) {
          if (optionLine) ctx.fillText(optionLine, ox + 48, optionY);
          optionLine = word;
          optionY += 18;
        } else {
          optionLine = test;
        }
      }
      if (optionLine) ctx.fillText(optionLine, ox + 48, optionY);
    });
  }

  if (prompt.kind === 'word') {
    const letter = prompt.letter ?? '?';
    ctx.fillStyle = game.soft;
    rounded(ctx, x + 22, y + 190, 100, 100, 18);
    ctx.fill();
    ctx.fillStyle = game.accent;
    ctx.font = '800 56px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(letter, x + 72, y + 260);
    ctx.fillStyle = '#5d5a66';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Cevabını yoruma yaz.', x + 145, y + 232);
    ctx.fillStyle = '#8a8794';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText('Şehir, isim, hayvan, bitki, eşya veya yemek.', x + 145, y + 255);
    ctx.fillStyle = game.accent;
    ctx.font = '800 20px ui-monospace, monospace';
    ctx.fillText(prompt.reveal ? 'SÜRE BİTTİ' : 'CANLI', x + 145, y + 282);
  }

  // prompt countdown
  const total = prompt.kind === 'quiz' ? 18000 : 15000;
  const remain = Math.max(0, prompt.endsAt - Date.now());
  rounded(ctx, x + 22, y + 324, w - 44, 10, 5);
  ctx.fillStyle = '#efebe4';
  ctx.fill();
  rounded(ctx, x + 22, y + 324, (w - 44) * Math.min(1, remain / total), 10, 5);
  ctx.fillStyle = game.accent;
  ctx.fill();

  // player chips at bottom
  const top = [...state.players].sort((a, b) => b.score - a.score).slice(0, 8);
  top.forEach((player, index) => {
    const px = 40 + index * 64;
    const py = 520;
    avatar(ctx, px, py, 19, player);
    ctx.fillStyle = '#2b2a33';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(Math.round(player.score)), px, py + 34);
  });
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Cevaplar sohbetten gelir · doğru cevap yeşil yanar', W / 2, 600 + Math.sin(t / 600) * 1);
}

function drawArena(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  t: number,
) {
  const bg = ctx.createLinearGradient(0, 88, 0, 798);
  bg.addColorStop(0, '#fff8ed');
  bg.addColorStop(1, '#f8ead6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 88, W, 710);
  const cx = W / 2;
  const cy = 455;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 238, 172, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#eed9bd';
  ctx.fill();
  ctx.strokeStyle = '#d4b48e';
  ctx.lineWidth = 7;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(cx, cy, 170, 112, 0, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(180,83,9,0.18)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = 'rgba(120,80,40,0.09)';
  ctx.font = '900 58px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ARENA', 0, 18);
  ctx.restore();

  const visible = state.players.slice(0, 16);
  visible.forEach((player, index) => {
    if (player.eliminated) return;
    const count = Math.max(1, visible.length);
    const twoRings = count > 10;
    const ring = twoRings ? index % 2 : 0;
    const ringCount = twoRings ? Math.ceil(count / 2) : count;
    const ringIndex = twoRings ? Math.floor(index / 2) : index;
    const angle = (ringIndex / ringCount) * Math.PI * 2 - Math.PI / 2 + t / 9000;
    const rx = ring === 0 ? 176 : 112;
    const ry = ring === 0 ? 112 : 64;
    const x = cx + Math.cos(angle) * rx;
    const y = cy + Math.sin(angle) * ry;
    ctx.save();
    ctx.shadowColor = player.color;
    ctx.shadowBlur = 10;
    avatar(ctx, x, y, 21, player);
    ctx.restore();
    hpBar(ctx, x - 30, y - 39, 60, player.hp);
    ctx.fillStyle = '#3d3329';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.name.slice(0, 12), x, y + 34);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 9px ui-monospace, monospace';
    ctx.fillText(`${Math.ceil(player.hp)} HP`, x, y + 47);
  });

  ctx.fillStyle = 'rgba(67,20,7,0.55)';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Son ayakta kalan kazanır · hediyeler can ve kalkan verir', cx, 745);
}


function drawRace(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  t: number,
) {
  ctx.fillStyle = game.soft;
  ctx.fillRect(0, 88, W, 710);

  // sky / distant city
  ctx.fillStyle = '#dcecf5';
  ctx.fillRect(0, 88, W, 220);
  for (let i = 0; i < 9; i += 1) {
    const h = 60 + ((i * 37) % 90);
    ctx.fillStyle = i % 2 === 0 ? '#c3dce9' : '#d2e6ef';
    ctx.fillRect(18 + i * 59, 300 - h, 44, h);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    for (let wy = 0; wy < Math.floor(h / 18); wy += 1) {
      ctx.fillRect(26 + i * 59, 300 - h + 10 + wy * 18, 8, 6);
      ctx.fillRect(40 + i * 59, 300 - h + 10 + wy * 18, 8, 6);
    }
  }
  // güneş ve bulutlar
  ctx.beginPath();
  ctx.arc(425, 145, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe7a3';
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [cx, cy, r] of [[78, 150, 16], [98, 145, 20], [118, 152, 14], [320, 178, 12], [338, 173, 16]]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const roadX = 90;
  const roadW = W - 180;
  const top = 330;
  const bottom = 760;
  ctx.beginPath();
  ctx.moveTo(roadX + 50, top);
  ctx.lineTo(roadX + roadW - 50, top);
  ctx.lineTo(roadX + roadW, bottom);
  ctx.lineTo(roadX, bottom);
  ctx.closePath();
  ctx.fillStyle = '#3b3b47';
  ctx.fill();
  ctx.strokeStyle = '#f4efe7';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(roadX + 50, top);
  ctx.lineTo(roadX, bottom);
  ctx.moveTo(roadX + roadW - 50, top);
  ctx.lineTo(roadX + roadW, bottom);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  for (let i = 0; i < 4; i += 1) {
    const x1 = roadX + 50 + ((roadW - 100) * i) / 4;
    const x2 = roadX + ((roadW) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(x1, top);
    ctx.lineTo(x2, bottom);
    ctx.stroke();
  }

  // finish line
  for (let i = 0; i < 12; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#fff' : '#222';
    ctx.fillRect(roadX + 50 + i * 15, top, 15, 14);
  }

  ctx.fillStyle = '#33545f';
  ctx.font = '800 10px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('F I N I S', W / 2, top - 8);
  ctx.fillStyle = '#fffaf0';
  ctx.fillText('S T A R T', W / 2, bottom + 18);

  const sorted = [...state.players].sort((a, b) => b.progress - a.progress).slice(0, 10);
  sorted.forEach((player, index) => {
    const lane = index % 4;
    const y = bottom - 30 - (player.progress / 100) * (bottom - top - 80);
    const x = roadX + 50 + ((roadW - 100) * lane) / 3 + Math.sin(t / 300 + index) * 5;
    ctx.save();
    ctx.translate(x, y);
    rounded(ctx, -17, -12, 34, 24, 6);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(-10, -6, 20, 8);
    ctx.beginPath();
    ctx.arc(-10, 13, 6, 0, Math.PI * 2);
    ctx.arc(10, 13, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1b1b22';
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(player.name.slice(0, 8), x, y - 22);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '500 9px ui-monospace, monospace';
    ctx.fillText(`${Math.min(100, Math.floor(player.progress))}%`, x, y + 30);
  });

  // decorative pit board
  rounded(ctx, 24, 790, W - 48, 24, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.fill();
  ctx.fillStyle = '#5d5a66';
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PİKSEL PİST · ilk biten kazanır', W / 2, 806);
}


function drawWheel(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  _time: number,
) {
  const cx = W / 2;
  const cy = 475;
  const radius = 168;
  const players = state.players.length
    ? state.players
    : Array.from({ length: 8 }, (_, index) => ({
        id: `decor-${index}`,
        name: ['ŞANS', 'BİLET', 'YAYIN', 'HEDİYE', 'ÇARK', 'SÜRPRİZ', 'BONUS', 'KALABALIK'][index]!,
        color: ['#e0558f', '#2563eb', '#0f8a72', '#d97706', '#7c3aed', '#dc2626', '#0891b2', '#65a30d'][index]!,
      } as ArcadePlayer));
  const step = (Math.PI * 2) / players.length;
  const spin = state.wheel?.spin;
  let rotation = 0;
  if (spin) {
    const progress = Math.max(0, Math.min(1, (Date.now() - spin.startedAt) / Math.max(1, spin.endsAt - spin.startedAt)));
    const eased = 1 - Math.pow(1 - progress, 3);
    rotation = (Math.PI * 2 * 4 + (Math.PI * 2 - (spin.segment + 0.5) * step)) * eased;
  }
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);
  players.forEach((player, index) => {
    const start = -Math.PI / 2 + index * step;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, start, start + step);
    ctx.closePath();
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.rotate(start + step / 2);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.font = `800 ${players.length > 14 ? 12 : 16}px system-ui, sans-serif`;
    ctx.fillText(player.name.slice(0, 12), radius - 34, 0);
    ctx.restore();
  });
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fillStyle = '#fffaf1';
  ctx.fill();
  ctx.strokeStyle = game.accent;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = game.ink;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 22px system-ui, sans-serif';
  ctx.fillText('ÇARK', 0, -7);
  ctx.fillStyle = game.accent;
  ctx.font = '800 10px system-ui, sans-serif';
  ctx.fillText('BİLET', 0, 15);
  ctx.restore();

  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - radius - 8);
  ctx.lineTo(cx + 12, cy - radius - 8);
  ctx.lineTo(cx, cy - radius + 20);
  ctx.closePath();
  ctx.fillStyle = game.ink;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy - radius - 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  const leader = [...state.players].sort((a, b) => b.score - a.score)[0];
  ctx.fillStyle = game.ink;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(leader ? `${leader.name} · ${Math.round(leader.score)} bilet` : 'Bilet topla, çark dönsün', cx, cy + radius + 58);
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText(spin ? 'Çark dönüyor...' : 'Beğeni +3 · Hediye +25 · Yorum +1', cx, cy + radius + 82);
}

function drawTug(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  time: number,
) {
  const position = state.tug?.position ?? 0;
  const centerX = W / 2;
  const ropeY = 590;
  ctx.fillStyle = '#f6e3d3';
  ctx.fillRect(0, 88, W, H - 88);
  ctx.fillStyle = 'rgba(220,38,38,0.10)';
  ctx.fillRect(0, 440, W / 2 - 20, 300);
  ctx.fillStyle = 'rgba(37,99,235,0.10)';
  ctx.fillRect(W / 2 + 20, 440, W / 2 - 20, 300);
  ctx.fillStyle = game.ink;
  ctx.font = '800 18px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('KIRMIZI', 135, 470);
  ctx.fillText('MAVİ', W - 135, 470);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  rounded(ctx, 138, 485, 264, 10, 5);
  ctx.fill();
  const ratio = (position + 1) / 2;
  ctx.fillStyle = '#dc2626';
  ctx.fillRect(138, 485, 264 * ratio, 10);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(138 + 264 * ratio, 485, 264 * (1 - ratio), 10);

  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 10;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(45, ropeY);
  ctx.lineTo(W - 45, ropeY);
  ctx.stroke();
  const markerX = centerX + position * 155;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(markerX, ropeY - 64);
  ctx.lineTo(markerX, ropeY + 30);
  ctx.stroke();
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath();
  ctx.moveTo(markerX, ropeY - 62);
  ctx.lineTo(markerX + 38, ropeY - 48);
  ctx.lineTo(markerX, ropeY - 30);
  ctx.closePath();
  ctx.fill();

  const red = state.players.filter((player) => player.side === 'red');
  const blue = state.players.filter((player) => player.side === 'blue');
  const drawTeam = (team: ArcadePlayer[], side: 'red' | 'blue') => {
    team.slice(0, 10).forEach((player, index) => {
      const x = side === 'red' ? 92 - (index % 2) * 18 : W - 92 + (index % 2) * 18;
      const y = 535 + Math.floor(index / 2) * 66 + Math.sin(time * 3 + index) * 2;
      avatar(ctx, x, y, 17, player);
      nameBadge(ctx, x, y + 22, player.name, player.color);
    });
  };
  drawTeam(red, 'red');
  drawTeam(blue, 'blue');

  ctx.fillStyle = game.ink;
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(state.tug?.red ?? 0)}  ·  ${Math.round(state.tug?.blue ?? 0)}`, centerX, ropeY + 90);
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText('Beğeni +1 · Hediye +13 · İşareti karşıya geçir', centerX, ropeY + 116);
}


function drawVersus(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  time: number,
) {
  const position = state.wall?.position ?? 0;
  const wallX = W / 2 - position * 155;
  ctx.fillStyle = '#f8e7ec';
  ctx.fillRect(0, 88, W, H - 88);
  ctx.fillStyle = 'rgba(219,39,119,0.10)';
  ctx.fillRect(0, 400, W / 2 - 30, 340);
  ctx.fillStyle = 'rgba(37,99,235,0.10)';
  ctx.fillRect(W / 2 + 30, 400, W / 2 - 30, 340);
  ctx.fillStyle = game.ink;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.key === 'clash' ? 'KIRMIZI' : 'KIZLAR', 130, 460);
  ctx.fillText(game.key === 'clash' ? 'MAVİ' : 'ERKEKLER', W - 130, 460);

  ctx.fillStyle = '#fff7f2';
  ctx.fillRect(wallX - 12, 470, 24, 190);
  ctx.fillStyle = '#db2777';
  ctx.fillRect(wallX - 12, 470, 24, 12);
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(wallX - 12, 648, 24, 12);

  const girls = state.players.filter((player) => player.side !== 'boys');
  const boys = state.players.filter((player) => player.side === 'boys');
  const drawTeam = (team: ArcadePlayer[], side: 'girls' | 'boys') => {
    team.slice(0, 10).forEach((player, index) => {
      const x = side === 'girls' ? 92 - (index % 2) * 18 : W - 92 + (index % 2) * 18;
      const y = 545 + Math.floor(index / 2) * 62 + Math.sin(time * 3 + index) * 2;
      avatar(ctx, x, y, 17, player);
      nameBadge(ctx, x, y + 22, player.name, player.color);
    });
  };
  drawTeam(girls, 'girls');
  drawTeam(boys, 'boys');

  ctx.fillStyle = game.ink;
  ctx.font = '800 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(state.wall?.girls ?? 0)}m  ·  ${Math.round(state.wall?.boys ?? 0)}m`, W / 2, 730);
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText('Beğeni +0,5m · Hediye +8m · Duvarı karşıya it', W / 2, 756);
}


function drawHorse(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  time: number,
) {
  const lanes = state.horse?.lanes ?? [];
  ctx.fillStyle = '#f5e6c9';
  ctx.fillRect(0, 88, W, H - 88);
  const left = 58;
  const right = W - 58;
  const top = 150;
  const bottom = 800;
  ctx.fillStyle = '#e7c493';
  ctx.fillRect(left, top, right - left, bottom - top);
  lanes.forEach((lane, index) => {
    const x = left + 18 + index * ((right - left - 36) / Math.max(1, lanes.length - 1));
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    const y = bottom - (lane.progress / 100) * (bottom - top);
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fillStyle = lane.color;
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = '800 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(lane.id), x, y + 1);
    if (index % 2 === 0) {
      ctx.fillStyle = '#5b3a24';
      ctx.font = '600 9px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(lane.name.slice(0, 10), 14, y + 3);
    }
    void time;
  });
  ctx.fillStyle = '#fff7e7';
  ctx.fillRect(left, top - 16, right - left, 10);
  ctx.fillStyle = '#3b2412';
  ctx.font = '800 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FİNİŞ', (left + right) / 2, top - 24);
  const leader = [...lanes].sort((a, b) => b.progress - a.progress)[0];
  ctx.fillStyle = game.ink;
  ctx.font = '800 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(leader ? `${leader.name} lider` : 'Jokeyini seç, yarış başlasın', W / 2, 870);
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 12px system-ui, sans-serif';
  ctx.fillText('Yoruma jokey numarası yaz · Beğeni +1 · Hediye +10', W / 2, 896);
}


function drawTown(ctx: CanvasRenderingContext2D, game: ArcadeGameDef, state: ArcadeStateView) {
  ctx.fillStyle = '#e8f8fb'; ctx.fillRect(0, 88, W, H - 88);
  ctx.fillStyle = '#94a3b8'; for (let i = 0; i < 4; i += 1) ctx.fillRect(120 + i * 80, 160, 10, 560);
  state.players.slice(0, 12).forEach((player, index) => {
    const x = 90 + (index % 4) * 110; const base = 740; const h = Math.max(28, player.progress * 3.4);
    ctx.fillStyle = player.color; ctx.fillRect(x - 26, base - h, 52, h);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let y = 0; y < Math.floor(h / 24); y += 1) ctx.fillRect(x - 10, base - h + 10 + y * 24, 20, 7);
    nameBadge(ctx, x, base + 8, player.name, player.color);
  });
  ctx.fillStyle = game.ink; ctx.font = '800 18px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('En yüksek bina kazanır', W / 2, 145);
}

function drawMelon(ctx: CanvasRenderingContext2D, game: ArcadeGameDef, state: ArcadeStateView, time: number) {
  ctx.fillStyle = '#fff4dc'; ctx.fillRect(0, 88, W, H - 88);
  ctx.fillStyle = '#c99a61'; ctx.fillRect(50, 640, W - 100, 24);
  const cx = W / 2; const cy = 420; const tension = state.melon?.tension ?? 0;
  ctx.save(); ctx.translate(Math.sin(time * 8) * tension * 0.012, Math.cos(time * 7) * tension * 0.01);
  ctx.beginPath(); ctx.ellipse(cx, cy, 145, 130, 0, 0, Math.PI * 2); ctx.fillStyle = '#4d9f45'; ctx.fill();
  ctx.strokeStyle = '#1f6b2a'; ctx.lineWidth = 8;
  for (let i = -2; i <= 2; i += 1) { ctx.beginPath(); ctx.ellipse(cx + i * 36, cy, 18, 125, 0, 0, Math.PI * 2); ctx.stroke(); }
  const bands = Math.ceil(tension / 7.2);
  for (let i = 0; i < bands; i += 1) { ctx.strokeStyle = i % 2 === 0 ? '#fbbf24' : '#f472b6'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(cx, cy - 110 + i * 16, 146 + i * 1.2, 18, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.restore();
  ctx.fillStyle = game.ink; ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`Gerginlik: %${Math.round(tension)}`, cx, 720);
}

function drawGold(ctx: CanvasRenderingContext2D, game: ArcadeGameDef, state: ArcadeStateView, time: number) {
  ctx.fillStyle = '#fff7db'; ctx.fillRect(0, 88, W, H - 88);
  const cx = W / 2; const cy = 400; const pull = state.gold?.pulled ?? 0;
  ctx.strokeStyle = '#d6a33a'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(cx, cy - 180, 80, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = '#dc2626'; ctx.fillRect(cx - 92, cy - 195, 28, 100); ctx.fillRect(cx + 64, cy - 195, 28, 100);
  ctx.fillStyle = '#f6c945';
  for (let i = 0; i < 35; i += 1) { const angle = i * 2.4 + time * 0.4; const radius = 150 * (1 - pull / 140); const x = cx + Math.cos(angle) * radius; const y = cy + 110 + Math.sin(angle) * 45 - pull * 1.8; ctx.beginPath(); ctx.ellipse(x, y, 10, 5, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.fillStyle = game.ink; ctx.font = '800 22px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(`Altın: %${Math.round(pull)}`, cx, 760);
}

function drawLobby(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
  demo: boolean,
) {
  ctx.fillStyle = 'rgba(255,250,245,0.72)';
  ctx.fillRect(0, 88, W, 710);
  const remain = state.lobbyEndsAt ? Math.max(0, Math.ceil((state.lobbyEndsAt - Date.now()) / 1000)) : 5;
  ctx.fillStyle = game.ink;
  ctx.font = '800 30px system-ui, sans-serif';
  ctx.textAlign = 'center';
  if (!demo && state.players.length === 0) {
    ctx.fillText('Sahne yayına hazır', W / 2, 360);
    ctx.fillStyle = game.accent;
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText('Platform sohbetinden ilk izleyiciyi bekle', W / 2, 408);
    ctx.fillStyle = '#8a8794';
    ctx.font = '500 13px system-ui, sans-serif';
    ctx.fillText('Bağlantı kurulunca yorumlar oyuna otomatik düşer', W / 2, 438);
    return;
  }
  ctx.fillText('Sahne hazırlanıyor', W / 2, 360);
  ctx.fillStyle = game.accent;
  ctx.font = '900 64px ui-monospace, monospace';
  ctx.fillText(String(remain), W / 2, 440);
  ctx.fillStyle = '#8a8794';
  ctx.font = '500 14px system-ui, sans-serif';
  ctx.fillText('İzleyiciler katıldıkça tur başlar', W / 2, 474);
}

function drawFinished(ctx: CanvasRenderingContext2D, game: ArcadeGameDef, state: ArcadeStateView) {
  ctx.fillStyle = 'rgba(255,250,245,0.78)';
  ctx.fillRect(0, 88, W, 710);
  const winner = state.winner;
  rounded(ctx, 44, 250, W - 88, 300, 28);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = `${game.accent}44`;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = game.accent;
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(winner?.label?.toLocaleUpperCase('tr') ?? 'TUR BİTTİ', W / 2, 300);
  ctx.fillStyle = '#17161d';
  ctx.font = '800 38px system-ui, sans-serif';
  ctx.fillText(winner?.name ?? 'Kazanan yok', W / 2, 372);
  ctx.fillStyle = '#8a8794';
  ctx.font = '600 15px system-ui, sans-serif';
  ctx.fillText(
    winner ? `${Math.round(winner.score)} puan · yeni tur birazdan` : 'Yeni tur birazdan',
    W / 2,
    410,
  );
  ctx.fillStyle = game.accent;
  ctx.font = '800 42px system-ui, sans-serif';
  ctx.fillText('🏆', W / 2, 486);
}

function drawLeaderboard(
  ctx: CanvasRenderingContext2D,
  game: ArcadeGameDef,
  state: ArcadeStateView,
) {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 800, W, 160);
  ctx.fillStyle = '#8a8794';
  ctx.font = '700 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('CANLI SIRALAMA', 24, 826);

  const sorted = [...state.players].sort((a, b) => a.rank - b.rank).slice(0, 5);
  sorted.forEach((player, index) => {
    const y = 846 + index * 22;
    ctx.fillStyle = index === 0 ? game.accent : '#c9c4bb';
    ctx.font = '800 12px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${index + 1}`, 24, y + 10);
    ctx.beginPath();
    ctx.arc(48, y + 5, 8, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.fillStyle = '#2b2a33';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText(player.name, 62, y + 10);
    ctx.fillStyle = '#8a8794';
    ctx.font = '600 11px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(
      state.key === 'kart'
        ? `${Math.floor(player.progress)}%`
        : state.key === 'gladiator' || state.key === 'stick'
          ? `${Math.ceil(player.hp)} HP`
          : `${Math.round(player.score)}`,
      W - 24,
      y + 10,
    );
  });
}

export function ArcadeStage({
  game,
  state,
  className = '',
  fitHeight = false,
  demo = true,
}: {
  game: ArcadeGameDef;
  state: ArcadeStateView | null;
  className?: string;
  fitHeight?: boolean;
  demo?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const render = () => {
      const current = stateRef.current;
      const time = performance.now();
      ctx.clearRect(0, 0, W, H);

      const gradient = ctx.createLinearGradient(0, 0, 0, H);
      gradient.addColorStop(0, '#fffaf5');
      gradient.addColorStop(1, game.soft);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);

      // subtle original background pattern
      ctx.fillStyle = 'rgba(30,25,35,0.035)';
      for (let x = 0; x < W; x += 30) {
        for (let y = 0; y < H; y += 30) {
          ctx.beginPath();
          ctx.arc(x, y, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!current) {
        ctx.fillStyle = game.ink;
        ctx.font = '700 18px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sahne bağlanıyor...', W / 2, H / 2);
        frame = requestAnimationFrame(render);
        return;
      }

      topBar(ctx, game, current, demo);
      if (game.mode === 'dance') drawDance(ctx, game, current, time);
      else if (game.mode === 'press') drawPress(ctx, game, current, time);
      else if (game.mode === 'circle') drawCircle(ctx, game, current, time);
      else if (game.mode === 'quiz' || game.mode === 'word') drawPromptCard(ctx, game, current, time);
      else if (game.mode === 'battle') drawArena(ctx, game, current, time);
      else if (game.mode === 'wheel') drawWheel(ctx, game, current, time);
      else if (game.mode === 'tug') drawTug(ctx, game, current, time);
      else if (game.mode === 'versus') drawVersus(ctx, game, current, time);
      else if (game.mode === 'horse') drawHorse(ctx, game, current, time);
      else if (game.mode === 'town') drawTown(ctx, game, current);
      else if (game.mode === 'melon') drawMelon(ctx, game, current, time);
      else if (game.mode === 'gold') drawGold(ctx, game, current, time);
      else drawRace(ctx, game, current, time);

      if (current.phase === 'lobby') drawLobby(ctx, game, current, demo);
      if (current.phase === 'finished') drawFinished(ctx, game, current);
      drawLeaderboard(ctx, game, current);

      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [game, demo]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className={`block bg-white ${
        fitHeight ? 'h-full w-auto rounded-none' : 'h-auto w-full rounded-[22px]'
      } ${className}`}
      aria-label={`${game.name} canlı oyun sahnesi`}
    />
  );
}
