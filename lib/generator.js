const crypto = require("crypto");

const SOFTWARE = "基于AIGC的文创视觉氛围生成与风格化定制系统";
const VERSION = "V1.0";
const STYLES = ["ink", "cyber", "blindbox", "minimal", "retro"];
const SCENES = ["studio", "forest", "festival", "ink", "cyber"];
const PRODUCTS = ["bottle", "box", "figure", "bag"];

function esc(value) {
  return String(value === undefined || value === null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function mulberry32(seed) {
  let state = Number(seed) >>> 0;
  return function () {
    state += 0x6D2B79F5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function between(rng, min, max) {
  return min + rng() * (max - min);
}

function pick(rng, list) {
  return list[Math.floor(rng() * list.length) % list.length];
}

function clamp(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

function paletteHex(list) {
  const fallback = ["#2F5D8A", "#D9B26A", "#8C4A3C", "#F2E8D5", "#1B2A33"];
  if (!Array.isArray(list) || list.length < 5) return fallback;
  return list.slice(0, 5).map(function (item) {
    if (typeof item === "string") return item;
    return item && item.hex ? item.hex : "#CCCCCC";
  });
}

function referenceHref(value) {
  const text = String(value || "");
  if (!/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(text)) return "";
  if (text.length > 3 * 1024 * 1024) return "";
  return text;
}

function defect(style, palette) {
  return '<radialGradient id="bg" cx="35%" cy="28%" r="85%">' +
    '<stop offset="0%" stop-color="' + palette[3] + '"/>' +
    '<stop offset="60%" stop-color="' + palette[4] + '"/>' +
    '<stop offset="100%" stop-color="' + palette[0] + '"/>' +
    "</radialGradient>" +
    '<linearGradient id="band" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="' + palette[1] + '"/>' +
    '<stop offset="100%" stop-color="' + palette[2] + '"/>' +
    "</linearGradient>" +
    '<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">' +
    '<feGaussianBlur stdDeviation="9"/></filter>' +
    '<filter id="glow" x="-60%" y="-60%" width="220%" height="220%">' +
    '<feGaussianBlur stdDeviation="6" result="blur"/>' +
    '<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>' +
    '<filter id="grain">' +
    '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/>' +
    '<feColorMatrix type="saturate" values="0"/>' +
    "</filter>" +
    '<pattern id="dots" width="12" height="12" patternUnits="userSpaceOnUse">' +
    '<circle cx="3" cy="3" r="2.2" fill="' + palette[0] + '" opacity="0.28"/></pattern>' +
    '<clipPath id="refClip"><rect x="0" y="0" rx="22" ry="22" width="100%" height="100%"/></clipPath>';
}

function inkLayers(rng, params, palette, w, h) {
  let out = "";
  const count = Math.round(5 + params.complexity * 1.6);
  for (let i = 0; i < count; i += 1) {
    const baseY = between(rng, h * 0.45, h * 0.82);
    const spread = between(rng, 140, 420) * (0.6 + params.density / 12);
    const x1 = between(rng, -60, w * 0.4);
    const x2 = x1 + spread;
    const c1 = x1 + spread * between(rng, 0.2, 0.5);
    const c2 = x1 + spread * between(rng, 0.5, 0.8);
    const peak = baseY - between(rng, 40, 150);
    const color = i % 4 === 0 ? palette[2] : "#2B3138";
    out += '<path d="M' + x1.toFixed(1) + " " + baseY.toFixed(1) + " Q" + c1.toFixed(1) + " " + peak.toFixed(1) +
      " " + c2.toFixed(1) + " " + (baseY - between(rng, 10, 60)).toFixed(1) + " T" + x2.toFixed(1) + " " + baseY.toFixed(1) +
      '" fill="none" stroke="' + color + '" stroke-width="' + between(rng, 2, 11).toFixed(1) + '" stroke-linecap="round" opacity="' +
      between(rng, 0.08, 0.32).toFixed(2) + '"/>';
  }
  const sunX = between(rng, w * 0.62, w * 0.82);
  const sunY = between(rng, h * 0.16, h * 0.3);
  out += '<circle cx="' + sunX.toFixed(1) + '" cy="' + sunY.toFixed(1) + '" r="' + between(rng, 40, 86).toFixed(1) +
    '" fill="' + palette[1] + '" opacity="0.22" filter="url(#soft)"/>';
  for (let i = 0; i < 14 + params.density; i += 1) {
    out += '<circle cx="' + between(rng, 0, w).toFixed(1) + '" cy="' + between(rng, h * 0.5, h * 0.95).toFixed(1) +
      '" r="' + between(rng, 1, 5).toFixed(1) + '" fill="#2B3138" opacity="' + between(rng, 0.04, 0.16).toFixed(2) + '"/>';
  }
  out += '<path d="M0 ' + h + " L0 " + (h * 0.78) + " Q" + (w * 0.18) + " " + (h * 0.58) + " " + (w * 0.36) + " " + (h * 0.8) +
    " Q" + (w * 0.55) + " " + (h * 0.66) + " " + (w * 0.78) + " " + (h * 0.82) + " L" + w + " " + (h * 0.74) + " L" + w + " " + h +
    ' Z" fill="#2B3138" opacity="0.22"/>';
  const boxX = w * 0.36;
  const boxY = h * 0.48;
  const boxW = w * 0.28;
  const boxH = h * 0.2;
  out += '<rect x="' + boxX.toFixed(1) + '" y="' + boxY.toFixed(1) + '" width="' + boxW.toFixed(1) + '" height="' + boxH.toFixed(1) +
    '" fill="none" stroke="#2B3138" stroke-width="6" opacity="0.78"/>' +
    '<line x1="' + (boxX + boxW / 2).toFixed(1) + '" y1="' + boxY.toFixed(1) + '" x2="' + (boxX + boxW / 2).toFixed(1) + '" y2="' + (boxY + boxH).toFixed(1) +
    '" stroke="#2B3138" stroke-width="5" opacity="0.7"/>' +
    '<line x1="' + boxX.toFixed(1) + '" y1="' + (boxY + boxH / 2).toFixed(1) + '" x2="' + (boxX + boxW).toFixed(1) + '" y2="' + (boxY + boxH / 2).toFixed(1) +
    '" stroke="#2B3138" stroke-width="5" opacity="0.55"/>' +
    '<circle cx="' + (boxX + boxW * 0.38).toFixed(1) + '" cy="' + (boxY - 10).toFixed(1) + '" r="16" fill="none" stroke="#2B3138" stroke-width="4" opacity="0.65"/>' +
    '<circle cx="' + (boxX + boxW * 0.62).toFixed(1) + '" cy="' + (boxY - 10).toFixed(1) + '" r="16" fill="none" stroke="#2B3138" stroke-width="4" opacity="0.65"/>';
  out += '<rect x="' + (w * 0.1).toFixed(1) + '" y="' + (h * 0.78).toFixed(1) + '" width="58" height="58" rx="6" fill="#B23A2F" opacity="0.86"/>' +
    '<text x="' + (w * 0.1 + 29).toFixed(1) + '" y="' + (h * 0.78 + 40).toFixed(1) + '" text-anchor="middle" font-family="SimHei, sans-serif" font-size="30" fill="#FFFFFF">文</text>';
  return out;
}

function cyberLayers(rng, params, palette, w, h) {
  let out = '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#080D1C"/>';
  const step = between(rng, 36, 64);
  for (let x = 0; x < w; x += step) {
    out += '<line x1="' + x.toFixed(1) + '" y1="0" x2="' + x.toFixed(1) + '" y2="' + h + '" stroke="' + palette[0] + '" stroke-width="1" opacity="0.18"/>';
  }
  for (let y = 0; y < h; y += step) {
    out += '<line x1="0" y1="' + y.toFixed(1) + '" x2="' + w + '" y2="' + y.toFixed(1) + '" stroke="' + palette[0] + '" stroke-width="1" opacity="0.12"/>';
  }
  const count = Math.round(4 + params.complexity * 1.4);
  for (let i = 0; i < count; i += 1) {
    const cx = between(rng, w * 0.08, w * 0.92);
    const cy = between(rng, h * 0.1, h * 0.86);
    const r = between(rng, 18, 120) * (0.5 + params.density / 14);
    const color = i % 2 === 0 ? palette[1] : palette[2];
    if (i % 3 === 0) {
      out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + r.toFixed(1) + '" fill="none" stroke="' + color +
        '" stroke-width="' + between(rng, 2, 7).toFixed(1) + '" opacity="0.9" filter="url(#glow)"/>';
    } else if (i % 3 === 1) {
      out += '<rect x="' + (cx - r / 2).toFixed(1) + '" y="' + (cy - r / 2).toFixed(1) + '" width="' + r.toFixed(1) + '" height="' + r.toFixed(1) +
        '" fill="none" stroke="' + color + '" stroke-width="3" opacity="0.8" filter="url(#glow)" transform="rotate(' + between(rng, -20, 20).toFixed(1) +
        " " + cx.toFixed(1) + " " + cy.toFixed(1) + ')"/>';
    } else {
      out += '<line x1="' + (cx - r).toFixed(1) + '" y1="' + cy.toFixed(1) + '" x2="' + (cx + r).toFixed(1) + '" y2="' + (cy + between(rng, -30, 30)).toFixed(1) +
        '" stroke="' + color + '" stroke-width="3" opacity="0.8" filter="url(#glow)"/>';
    }
  }
  for (let y = 0; y < h; y += 8) {
    out += '<rect x="0" y="' + y + '" width="' + w + '" height="1" fill="#FFFFFF" opacity="0.03"/>';
  }
  return out;
}

function blindboxLayers(rng, params, palette, w, h) {
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += '<circle cx="' + between(rng, w * 0.1, w * 0.9).toFixed(1) + '" cy="' + between(rng, h * 0.1, h * 0.9).toFixed(1) +
      '" r="' + between(rng, 80, 220).toFixed(1) + '" fill="' + palette[(i + 2) % 5] + '" opacity="' + between(rng, 0.12, 0.3).toFixed(2) +
      '" filter="url(#soft)"/>';
  }
  const cx = w * between(rng, 0.42, 0.58);
  const baseY = h * 0.72;
  const size = Math.min(w, h) * between(rng, 0.16, 0.24) * (0.8 + params.density / 18);
  out += '<ellipse cx="' + cx.toFixed(1) + '" cy="' + (baseY + size * 0.55).toFixed(1) + '" rx="' + (size * 1.1).toFixed(1) +
    '" ry="' + (size * 0.22).toFixed(1) + '" fill="#000" opacity="0.16" filter="url(#soft)"/>';
  out += '<circle cx="' + cx.toFixed(1) + '" cy="' + (baseY - size * 1.3).toFixed(1) + '" r="' + (size * 0.62).toFixed(1) +
    '" fill="' + palette[1] + '" stroke="#FFFFFF" stroke-width="4"/>';
  out += '<path d="M' + (cx - size * 0.5).toFixed(1) + " " + (baseY - size * 1.65).toFixed(1) + " L" + (cx - size * 0.35).toFixed(1) + " " + (baseY - size * 2.2).toFixed(1) +
    " L" + (cx - size * 0.05).toFixed(1) + " " + (baseY - size * 1.75).toFixed(1) + '" fill="' + palette[1] + '" stroke="#FFFFFF" stroke-width="4"/>';
  out += '<path d="M' + (cx + size * 0.5).toFixed(1) + " " + (baseY - size * 1.65).toFixed(1) + " L" + (cx + size * 0.35).toFixed(1) + " " + (baseY - size * 2.2).toFixed(1) +
    " L" + (cx + size * 0.05).toFixed(1) + " " + (baseY - size * 1.75).toFixed(1) + '" fill="' + palette[1] + '" stroke="#FFFFFF" stroke-width="4"/>';
  out += '<circle cx="' + (cx - size * 0.22).toFixed(1) + '" cy="' + (baseY - size * 1.38).toFixed(1) + '" r="' + (size * 0.06).toFixed(1) + '" fill="#2B2B2B"/>';
  out += '<circle cx="' + (cx + size * 0.22).toFixed(1) + '" cy="' + (baseY - size * 1.38).toFixed(1) + '" r="' + (size * 0.06).toFixed(1) + '" fill="#2B2B2B"/>';
  out += '<path d="M' + (cx - size * 0.14).toFixed(1) + " " + (baseY - size * 1.2).toFixed(1) + " Q" + cx.toFixed(1) + " " + (baseY - size * 1.08).toFixed(1) +
    " " + (cx + size * 0.14).toFixed(1) + " " + (baseY - size * 1.2).toFixed(1) + '" fill="none" stroke="#2B2B2B" stroke-width="3" stroke-linecap="round"/>';
  out += '<rect x="' + (cx - size * 0.55).toFixed(1) + '" y="' + (baseY - size * 0.95).toFixed(1) + '" width="' + (size * 1.1).toFixed(1) + '" height="' + (size * 0.95).toFixed(1) +
    '" rx="' + (size * 0.28).toFixed(1) + '" fill="' + palette[2] + '" stroke="#FFFFFF" stroke-width="4"/>';
  out += '<circle cx="' + (cx - size * 0.55).toFixed(1) + '" cy="' + (baseY - size * 0.45).toFixed(1) + '" r="' + (size * 0.13).toFixed(1) + '" fill="' + palette[1] + '"/>';
  out += '<circle cx="' + (cx + size * 0.55).toFixed(1) + '" cy="' + (baseY - size * 0.45).toFixed(1) + '" r="' + (size * 0.13).toFixed(1) + '" fill="' + palette[1] + '"/>';
  return out;
}

function minimalLayers(rng, params, palette, w, h) {
  let out = '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#F7F7F4"/>';
  const count = Math.round(3 + params.complexity / 3);
  for (let i = 0; i < count; i += 1) {
    const size = between(rng, 80, Math.min(w, h) * 0.42) * (0.7 + params.density / 16);
    const x = between(rng, w * 0.08, w * 0.82);
    const y = between(rng, h * 0.1, h * 0.78);
    const color = palette[i % 3];
    if (i % 2 === 0) {
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + size.toFixed(1) + '" fill="' + color + '" opacity="' + between(rng, 0.16, 0.55).toFixed(2) + '"/>';
    } else {
      out += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + size.toFixed(1) + '" height="' + (size * between(rng, 0.5, 1.4)).toFixed(1) +
        '" fill="' + color + '" opacity="' + between(rng, 0.14, 0.4).toFixed(2) + '"/>';
    }
  }
  out += '<line x1="' + (w * 0.12).toFixed(1) + '" y1="' + (h * 0.82).toFixed(1) + '" x2="' + (w * 0.88).toFixed(1) + '" y2="' + (h * 0.82).toFixed(1) +
    '" stroke="' + palette[0] + '" stroke-width="2" opacity="0.45"/>';
  return out;
}

function retroLayers(rng, params, palette, w, h) {
  let out = '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#F2E2C4"/>';
  const cx = w * between(rng, 0.4, 0.6);
  const cy = h * between(rng, 0.35, 0.5);
  const rays = 18;
  for (let i = 0; i < rays; i += 1) {
    const angle = (Math.PI * 2 * i) / rays;
    const x1 = cx + Math.cos(angle) * 70;
    const y1 = cy + Math.sin(angle) * 70;
    const x2 = cx + Math.cos(angle) * Math.max(w, h);
    const y2 = cy + Math.sin(angle) * Math.max(w, h);
    out += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) +
      '" stroke="' + palette[1] + '" stroke-width="' + between(rng, 12, 34).toFixed(1) + '" opacity="0.35"/>';
  }
  out += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + between(rng, 80, 130).toFixed(1) + '" fill="' + palette[2] + '" opacity="0.85"/>';
  out += '<rect x="0" y="' + (h * 0.62).toFixed(1) + '" width="' + w + '" height="' + (h * 0.38).toFixed(1) + '" fill="url(#dots)" opacity="0.9"/>';
  const count = Math.round(3 + params.complexity / 2);
  for (let i = 0; i < count; i += 1) {
    out += '<circle cx="' + between(rng, 0, w).toFixed(1) + '" cy="' + between(rng, h * 0.58, h * 0.95).toFixed(1) + '" r="' +
      between(rng, 18, 70).toFixed(1) + '" fill="' + palette[(i + 1) % 3] + '" opacity="' + between(rng, 0.3, 0.8).toFixed(2) + '"/>';
  }
  return out;
}

function styleBackground(style, palette, w, h) {
  if (style === "ink") {
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#F4EDDD"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#FFFFFF" opacity="0.18"/>';
  }
  return '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#bg)"/>';
}

function referenceLayer(href, opacity, w, h, sceneMode) {
  if (!href) return "";
  const x = sceneMode ? w * 0.28 : w * 0.22;
  const y = sceneMode ? h * 0.24 : h * 0.2;
  const width = sceneMode ? w * 0.44 : w * 0.56;
  const height = sceneMode ? h * 0.5 : h * 0.58;
  return '<g opacity="' + (opacity / 100).toFixed(2) + '"><rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + width.toFixed(1) +
    '" height="' + height.toFixed(1) + '" rx="22" fill="#FFFFFF" opacity="0.06"/>' +
    '<g transform="translate(' + x.toFixed(1) + " " + y.toFixed(1) + ')" clip-path="url(#refClip)">' +
    '<image href="' + href + '" x="0" y="0" width="' + width.toFixed(1) + '" height="' + height.toFixed(1) +
    '" preserveAspectRatio="xMidYMid slice"/></g>' +
    '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + width.toFixed(1) + '" height="' + height.toFixed(1) +
    '" rx="22" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.35"/></g>';
}

function productShape(type, cx, baseY, size, palette) {
  if (type === "box") {
    return '<rect x="' + (cx - size * 0.62).toFixed(1) + '" y="' + (baseY - size * 1.05).toFixed(1) + '" width="' + (size * 1.24).toFixed(1) + '" height="' + (size * 1.05).toFixed(1) +
      '" rx="' + (size * 0.08).toFixed(1) + '" fill="' + palette[2] + '"/>' +
      '<rect x="' + (cx - size * 0.1).toFixed(1) + '" y="' + (baseY - size * 1.05).toFixed(1) + '" width="' + (size * 0.2).toFixed(1) + '" height="' + (size * 1.05).toFixed(1) + '" fill="' + palette[1] + '"/>' +
      '<rect x="' + (cx - size * 0.62).toFixed(1) + '" y="' + (baseY - size * 0.62).toFixed(1) + '" width="' + (size * 1.24).toFixed(1) + '" height="' + (size * 0.12).toFixed(1) + '" fill="' + palette[1] + '"/>';
  }
  if (type === "bottle") {
    return '<rect x="' + (cx - size * 0.28).toFixed(1) + '" y="' + (baseY - size * 1.7).toFixed(1) + '" width="' + (size * 0.56).toFixed(1) + '" height="' + (size * 0.35).toFixed(1) + '" rx="' + (size * 0.06).toFixed(1) + '" fill="' + palette[0] + '"/>' +
      '<rect x="' + (cx - size * 0.18).toFixed(1) + '" y="' + (baseY - size * 1.45).toFixed(1) + '" width="' + (size * 0.36).toFixed(1) + '" height="' + (size * 0.18).toFixed(1) + '" fill="' + palette[1] + '"/>' +
      '<rect x="' + (cx - size * 0.5).toFixed(1) + '" y="' + (baseY - size * 1.28).toFixed(1) + '" width="' + (size * 1.0).toFixed(1) + '" height="' + (size * 1.28).toFixed(1) + '" rx="' + (size * 0.18).toFixed(1) + '" fill="' + palette[2] + '"/>' +
      '<rect x="' + (cx - size * 0.32).toFixed(1) + '" y="' + (baseY - size * 1.02).toFixed(1) + '" width="' + (size * 0.12).toFixed(1) + '" height="' + (size * 0.72).toFixed(1) + '" rx="' + (size * 0.06).toFixed(1) + '" fill="#FFFFFF" opacity="0.35"/>';
  }
  if (type === "bag") {
    return '<path d="M' + (cx - size * 0.42).toFixed(1) + " " + (baseY - size * 1.05).toFixed(1) + " Q" + cx.toFixed(1) + " " + (baseY - size * 1.65).toFixed(1) +
      " " + (cx + size * 0.42).toFixed(1) + " " + (baseY - size * 1.05).toFixed(1) + '" fill="none" stroke="' + palette[0] + '" stroke-width="' + (size * 0.08).toFixed(1) + '"/>' +
      '<rect x="' + (cx - size * 0.72).toFixed(1) + '" y="' + (baseY - size * 1.05).toFixed(1) + '" width="' + (size * 1.44).toFixed(1) + '" height="' + (size * 1.05).toFixed(1) + '" rx="' + (size * 0.1).toFixed(1) + '" fill="' + palette[2] + '"/>' +
      '<rect x="' + (cx - size * 0.2).toFixed(1) + '" y="' + (baseY - size * 0.85).toFixed(1) + '" width="' + (size * 0.4).toFixed(1) + '" height="' + (size * 0.24).toFixed(1) + '" rx="' + (size * 0.04).toFixed(1) + '" fill="' + palette[1] + '"/>';
  }
  return '<circle cx="' + cx.toFixed(1) + '" cy="' + (baseY - size * 1.35).toFixed(1) + '" r="' + (size * 0.58).toFixed(1) + '" fill="' + palette[1] + '"/>' +
    '<path d="M' + (cx - size * 0.45).toFixed(1) + " " + (baseY - size * 1.85).toFixed(1) + " L" + (cx - size * 0.28).toFixed(1) + " " + (baseY - size * 2.35).toFixed(1) +
    " L" + (cx - size * 0.02).toFixed(1) + " " + (baseY - size * 1.9).toFixed(1) + '" fill="' + palette[1] + '"/>' +
    '<path d="M' + (cx + size * 0.45).toFixed(1) + " " + (baseY - size * 1.85).toFixed(1) + " L" + (cx + size * 0.28).toFixed(1) + " " + (baseY - size * 2.35).toFixed(1) +
    " L" + (cx + size * 0.02).toFixed(1) + " " + (baseY - size * 1.9).toFixed(1) + '" fill="' + palette[1] + '"/>' +
    '<circle cx="' + (cx - size * 0.2).toFixed(1) + '" cy="' + (baseY - size * 1.42).toFixed(1) + '" r="' + (size * 0.06).toFixed(1) + '" fill="#1F2933"/>' +
    '<circle cx="' + (cx + size * 0.2).toFixed(1) + '" cy="' + (baseY - size * 1.42).toFixed(1) + '" r="' + (size * 0.06).toFixed(1) + '" fill="#1F2933"/>' +
    '<path d="M' + (cx - size * 0.12).toFixed(1) + " " + (baseY - size * 1.24).toFixed(1) + " Q" + cx.toFixed(1) + " " + (baseY - size * 1.12).toFixed(1) +
    " " + (cx + size * 0.12).toFixed(1) + " " + (baseY - size * 1.24).toFixed(1) + '" fill="none" stroke="#1F2933" stroke-width="3"/>' +
    '<rect x="' + (cx - size * 0.42).toFixed(1) + '" y="' + (baseY - size * 1.0).toFixed(1) + '" width="' + (size * 0.84).toFixed(1) + '" height="' + (size * 0.95).toFixed(1) +
    '" rx="' + (size * 0.24).toFixed(1) + '" fill="' + palette[2] + '"/>';
}

function sceneBackground(scene, palette, w, h) {
  if (scene === "forest") {
    let out = '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#1D3327"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#bg)" opacity="0.55"/>';
    for (let i = 0; i < 7; i += 1) {
      const x = (w / 7) * i + 20;
      out += '<rect x="' + x.toFixed(1) + '" y="0" width="' + (12 + i * 3) + '" height="' + h + '" fill="#14251C" opacity="0.6"/>';
    }
    out += '<polygon points="' + (w * 0.55) + ',0 ' + (w * 0.78) + ',0 ' + (w * 0.42) + ',' + h + " " + (w * 0.28) + "," + h + '" fill="#F3E7B8" opacity="0.12"/>';
    return out;
  }
  if (scene === "festival") {
    let out = '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#6A1717"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#bg)" opacity="0.55"/>';
    for (let i = 0; i < 6; i += 1) {
      out += '<circle cx="' + (w * (0.12 + i * 0.15)) + '" cy="' + (h * (i % 2 === 0 ? 0.18 : 0.26)) + '" r="' + (18 + i * 3) +
        '" fill="' + palette[1] + '" opacity="0.75"/><line x1="' + (w * (0.12 + i * 0.15)) + '" y1="0" x2="' + (w * (0.12 + i * 0.15)) +
        '" y2="' + (h * (i % 2 === 0 ? 0.18 : 0.26)) + '" stroke="#F4D68A" stroke-width="2" opacity="0.6"/>';
    }
    out += '<circle cx="' + (w * 0.78) + '" cy="' + (h * 0.2) + '" r="' + (h * 0.08) + '" fill="#F4D68A" opacity="0.85"/>';
    return out;
  }
  if (scene === "cyber") {
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#070C1A"/>' +
      '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#bg)" opacity="0.45"/>' +
      '<circle cx="' + (w * 0.2) + '" cy="' + (h * 0.25) + '" r="' + (w * 0.18) + '" fill="none" stroke="' + palette[1] + '" stroke-width="4" opacity="0.7" filter="url(#glow)"/>' +
      '<circle cx="' + (w * 0.85) + '" cy="' + (h * 0.7) + '" r="' + (w * 0.22) + '" fill="none" stroke="' + palette[2] + '" stroke-width="3" opacity="0.6" filter="url(#glow)"/>';
  }
  if (scene === "ink") {
    return '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#F5EFE2"/>' +
      '<path d="M0 ' + (h * 0.7) + " Q" + (w * 0.2) + " " + (h * 0.45) + " " + (w * 0.45) + " " + (h * 0.7) + " T" + w + " " + (h * 0.68) + '" fill="none" stroke="' + palette[0] + '" stroke-width="26" opacity="0.14"/>' +
      '<circle cx="' + (w * 0.76) + '" cy="' + (h * 0.2) + '" r="' + (w * 0.08) + '" fill="' + palette[1] + '" opacity="0.35"/>';
  }
  return '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="#DDE2E7"/>' +
    '<rect x="0" y="0" width="' + w + '" height="' + h + '" fill="url(#band)" opacity="0.22"/>' +
    '<rect x="0" y="' + (h * 0.72) + '" width="' + w + '" height="' + (h * 0.28) + '" fill="#C3CBD3"/>' +
    '<ellipse cx="' + (w * 0.5) + '" cy="' + (h * 0.74) + '" rx="' + (w * 0.34) + '" ry="' + (h * 0.06) + '" fill="#FFFFFF" opacity="0.35" filter="url(#soft)"/>';
}

function sceneLayers(params, palette, w, h, href) {
  let out = sceneBackground(params.scene, palette, w, h);
  const cx = w * 0.5;
  const baseY = h * 0.74;
  const size = Math.min(w, h) * (0.16 + params.density * 0.006);
  const lightX = params.light === "left" ? w * 0.08 : params.light === "right" ? -w * 0.08 : 0;
  out += '<ellipse cx="' + (cx + lightX).toFixed(1) + '" cy="' + (baseY + size * 0.08).toFixed(1) + '" rx="' + (size * 0.95).toFixed(1) +
    '" ry="' + (size * (params.light === "top" ? 0.34 : 0.2)).toFixed(1) + '" fill="#000000" opacity="' + (params.shadow / 130).toFixed(2) + '" filter="url(#soft)"/>';
  let subject = "";
  if (href) {
    subject = '<g><rect x="' + (cx - size * 0.7).toFixed(1) + '" y="' + (baseY - size * 1.55).toFixed(1) + '" width="' + (size * 1.4).toFixed(1) +
      '" height="' + (size * 1.55).toFixed(1) + '" rx="' + (size * 0.12).toFixed(1) + '" fill="' + palette[2] + '"/>' +
      '<image href="' + href + '" x="' + (cx - size * 0.62).toFixed(1) + '" y="' + (baseY - size * 1.47).toFixed(1) + '" width="' + (size * 1.24).toFixed(1) +
      '" height="' + (size * 1.39).toFixed(1) + '" preserveAspectRatio="xMidYMid slice"/></g>';
  } else {
    subject = '<g>' + productShape(params.product, cx, baseY, size, palette) + "</g>";
  }
  out += subject;
  if (params.reflection > 0) {
    out += '<g transform="translate(0 ' + (baseY * 2).toFixed(1) + ') scale(1 -1)" opacity="' + (params.reflection / 100 * 0.28).toFixed(2) + '">' + subject + "</g>";
  }
  out += '<rect x="' + (cx - size * 0.7).toFixed(1) + '" y="' + (baseY - size * 1.55).toFixed(1) + '" width="' + (size * 1.4).toFixed(1) + '" height="' + (size * 0.08).toFixed(1) +
    '" fill="#FFFFFF" opacity="' + (params.glow / 400).toFixed(2) + '"/>';
  return out;
}

function generate(params) {
  const width = Math.round(clamp(params.width || 1024, 512, 1600));
  const height = Math.round(clamp(params.height || 1024, 512, 1600));
  const style = STYLES.indexOf(params.style) >= 0 ? params.style : "minimal";
  const scene = SCENES.indexOf(params.scene) >= 0 ? params.scene : "studio";
  const product = PRODUCTS.indexOf(params.product) >= 0 ? params.product : "box";
  const seed = params.seed === -1 || params.seed === undefined || params.seed === null ? Math.floor(Math.random() * 900000) + 1000 : Math.round(clamp(params.seed, 0, 999999));
  const palette = paletteHex(params.palette);
  const rng = mulberry32(seed);
  const options = {
    width: width,
    height: height,
    style: style,
    seed: seed,
    prompt: String(params.prompt || ""),
    complexity: clamp(params.complexity || 6, 1, 10),
    density: clamp(params.density || 6, 1, 10),
    grain: clamp(params.grain || 20, 0, 100),
    glow: clamp(params.glow || 40, 0, 100),
    referenceOpacity: clamp(params.referenceOpacity || 60, 0, 100),
    shadow: clamp(params.shadow || 55, 0, 100),
    reflection: clamp(params.reflection || 35, 0, 100),
    light: ["left", "right", "top"].indexOf(params.light) >= 0 ? params.light : "left",
    scene: scene,
    product: product,
    mode: params.mode === "scene" ? "scene" : "style",
    palette: palette
  };
  const href = referenceHref(params.reference);
  const layers = options.mode === "scene"
    ? sceneLayers(options, palette, width, height, href)
    : styleBackground(style, palette, width, height) +
      (style === "ink" ? inkLayers(rng, options, palette, width, height) : "") +
      (style === "cyber" ? cyberLayers(rng, options, palette, width, height) : "") +
      (style === "blindbox" ? blindboxLayers(rng, options, palette, width, height) : "") +
      (style === "minimal" ? minimalLayers(rng, options, palette, width, height) : "") +
      (style === "retro" ? retroLayers(rng, options, palette, width, height) : "") +
      referenceLayer(href, options.referenceOpacity, width, height, false);
  const meta = {
    software: SOFTWARE,
    version: VERSION,
    generator: "P04-SVG-1.0",
    style: style,
    scene: scene,
    product: product,
    seed: seed,
    prompt: options.prompt,
    params: {
      complexity: options.complexity,
      density: options.density,
      grain: options.grain,
      glow: options.glow,
      referenceOpacity: options.referenceOpacity,
      shadow: options.shadow,
      reflection: options.reflection,
      light: options.light,
      width: width,
      height: height
    },
    palette: palette
  };
  const labelColor = style === "cyber" || style === "forest" || scene === "cyber" ? "#FFFFFF" : "#1B2A33";
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + " " + height + '" role="img">' +
    "<desc>" + esc(JSON.stringify(meta)) + "</desc>" +
    "<defs>" + defect(style, palette) + "</defs>" +
    layers +
    '<rect x="' + (width - 158) + '" y="' + (height - 44) + '" width="146" height="30" rx="6" fill="#000000" opacity="0.42"/>' +
    '<text x="' + (width - 147) + '" y="' + (height - 24) + '" font-family="SimHei, sans-serif" font-size="15" fill="#FFFFFF">AI生成 · ' + VERSION + "</text>" +
    '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#FFFFFF" filter="url(#grain)" opacity="' + (options.grain / 100 * 0.12).toFixed(3) + '"/>' +
    "</svg>";
  const hash = crypto.createHash("sha256").update(svg).digest("hex").toUpperCase();
  return {
    svg: svg,
    width: width,
    height: height,
    seed: seed,
    style: style,
    scene: scene,
    params: meta.params,
    palette: palette,
    hash: hash
  };
}

module.exports = {
  SOFTWARE: SOFTWARE,
  VERSION: VERSION,
  STYLES: STYLES,
  SCENES: SCENES,
  PRODUCTS: PRODUCTS,
  generate: generate
};
