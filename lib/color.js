const EMOTION_TO_HSL = {
  joy: [45, 90, 60],
  trust: [120, 60, 50],
  fear: [120, 20, 20],
  surprise: [180, 80, 50],
  sadness: [220, 50, 40],
  disgust: [280, 40, 40],
  anger: [0, 85, 45],
  anticipation: [30, 80, 50],
  cyberpunk: [300, 90, 50],
  zen: [80, 20, 80],
  luxury: [40, 60, 30],
  minimalist: [0, 0, 90],
  retro: [25, 40, 50]
};

const EMOTION_NAMES = {
  joy: "喜悦", trust: "信任", fear: "紧张", surprise: "惊喜", sadness: "冷静",
  disgust: "疏离", anger: "热烈", anticipation: "期待", cyberpunk: "赛博",
  zen: "禅意", luxury: "高级", minimalist: "极简", retro: "复古"
};

const KEYWORD_MAPPING = {
  "温暖": "joy", "阳光": "joy", "慵懒": "anticipation", "秋日": "anticipation",
  "冷酷": "sadness", "科技": "cyberpunk", "未来": "cyberpunk", "霓虹": "cyberpunk",
  "赛博": "cyberpunk", "自然": "trust", "生机": "trust", "环保": "trust",
  "喜庆": "joy", "团圆": "trust", "中秋": "anticipation", "春节": "joy",
  "极简": "minimalist", "留白": "minimalist", "禅意": "zen", "高级": "luxury",
  "复古": "retro", "古典": "retro", "国风": "retro", "水墨": "zen"
};

const HARMONY_NAMES = {
  analogous: "相邻色",
  complementary: "互补色",
  triadic: "三角色",
  monochromatic: "单色"
};

const ROLES = ["深色点缀", "辅助色", "主色", "高光", "背景中性"];
const PROPORTIONS = [10, 20, 40, 10, 20];

function normalizeText(text) {
  return String(text === undefined || text === null ? "" : text).trim();
}

function analyze(text) {
  const source = normalizeText(text);
  const found = [];
  Object.keys(KEYWORD_MAPPING).forEach(function (word) {
    if (source.indexOf(word) >= 0) found.push(word);
  });
  let emotion = "minimalist";
  const votes = {};
  found.forEach(function (word) {
    const key = KEYWORD_MAPPING[word];
    votes[key] = (votes[key] || 0) + 1;
    emotion = key;
  });
  if (found.length === 0) {
    if (source.indexOf("暖") >= 0 || source.indexOf("甜") >= 0) emotion = "joy";
    else if (source.indexOf("冷") >= 0 || source.indexOf("静") >= 0) emotion = "sadness";
    else if (source.indexOf("未来") >= 0 || source.indexOf("光") >= 0) emotion = "cyberpunk";
  }
  const base = EMOTION_TO_HSL[emotion] || [0, 50, 50];
  return {
    text: source,
    emotion: emotion,
    emotionName: EMOTION_NAMES[emotion] || emotion,
    keywords: found,
    votes: votes,
    base: { h: base[0], s: base[1], l: base[2] }
  };
}

function hslToRgb(h, s, l) {
  const hue = ((Number(h) % 360) + 360) % 360 / 360;
  const sat = Number(s) / 100;
  const light = Number(l) / 100;
  let r;
  let g;
  let b;
  if (sat === 0) {
    r = light;
    g = light;
    b = light;
  } else {
    const hue2rgb = function (p, q, t) {
      let value = t;
      if (value < 0) value += 1;
      if (value > 1) value -= 1;
      if (value < 1 / 6) return p + (q - p) * 6 * value;
      if (value < 1 / 2) return q;
      if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
      return p;
    };
    const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
    const p = 2 * light - q;
    r = hue2rgb(p, q, hue + 1 / 3);
    g = hue2rgb(p, q, hue);
    b = hue2rgb(p, q, hue - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHex(rgb) {
  return "#" + rgb.map(function (value) {
    return Number(value).toString(16).padStart(2, "0").toUpperCase();
  }).join("");
}

function rgbToCmyk(rgb) {
  const r = Number(rgb[0]) / 255;
  const g = Number(rgb[1]) / 255;
  const b = Number(rgb[2]) / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) return [0, 0, 0, 100];
  return [
    Math.round(((1 - r - k) / (1 - k)) * 100),
    Math.round(((1 - g - k) / (1 - k)) * 100),
    Math.round(((1 - b - k) / (1 - k)) * 100),
    Math.round(k * 100)
  ];
}

function harmony(base, rule) {
  const h = Number(base.h);
  const s = Number(base.s);
  const l = Number(base.l);
  if (rule === "complementary") {
    const comp = (h + 180) % 360;
    return [
      [h, s, Math.max(20, l - 20)],
      [h, s, l],
      [h, Math.max(20, s - 30), Math.min(90, l + 20)],
      [comp, s, l],
      [comp, s, Math.max(20, l - 20)]
    ];
  }
  if (rule === "triadic") {
    return [
      [h, s, Math.max(20, l - 15)],
      [h, s, l],
      [h, Math.max(10, s - 40), 90],
      [(h + 120) % 360, s, l],
      [(h + 240) % 360, s, l]
    ];
  }
  if (rule === "monochromatic") {
    return [
      [h, s, Math.max(10, l - 30)],
      [h, s, Math.max(20, l - 15)],
      [h, s, l],
      [h, Math.max(20, s - 20), Math.min(85, l + 20)],
      [h, Math.max(10, s - 40), Math.min(95, l + 35)]
    ];
  }
  return [
    [(h - 60 + 360) % 360, s, l],
    [(h - 30 + 360) % 360, s, Math.max(20, l - 10)],
    [h, s, l],
    [(h + 30) % 360, s, Math.min(90, l + 10)],
    [(h + 60) % 360, s, l]
  ];
}

function generate(text, rule) {
  const analysis = analyze(text);
  const ruleName = harmony(analysis.base, rule || "analogous");
  const colors = ruleName.map(function (hsl, index) {
    const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
    return {
      role: ROLES[index],
      hex: rgbToHex(rgb),
      rgb: rgb,
      cmyk: rgbToCmyk(rgb),
      hsl: [hsl[0], hsl[1], hsl[2]],
      proportion: PROPORTIONS[index]
    };
  });
  return {
    text: analysis.text,
    emotion: analysis.emotion,
    emotionName: analysis.emotionName,
    keywords: analysis.keywords,
    harmony: rule || "analogous",
    harmonyName: HARMONY_NAMES[rule || "analogous"] || rule,
    colors: colors
  };
}

function exportCss(palette, name) {
  const prefix = String(name || "palette").replace(/[^A-Za-z0-9_-]/g, "-").toLowerCase();
  const lines = [":root {"];
  palette.colors.forEach(function (color, index) {
    lines.push("  --" + prefix + "-" + (index + 1) + ": " + color.hex + ";");
  });
  lines.push("}");
  return lines.join("\n");
}

module.exports = {
  EMOTION_TO_HSL: EMOTION_TO_HSL,
  EMOTION_NAMES: EMOTION_NAMES,
  KEYWORD_MAPPING: KEYWORD_MAPPING,
  HARMONY_NAMES: HARMONY_NAMES,
  analyze: analyze,
  hslToRgb: hslToRgb,
  rgbToHex: rgbToHex,
  rgbToCmyk: rgbToCmyk,
  harmony: harmony,
  generate: generate,
  exportCss: exportCss
};
