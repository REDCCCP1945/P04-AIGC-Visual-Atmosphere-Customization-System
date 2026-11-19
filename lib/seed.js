const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const color = require("./color");
const generator = require("./generator");

function hashPassword(password, salt) {
  return crypto.scryptSync(String(password), String(salt), 64).toString("hex");
}

function makeSalt() {
  return crypto.randomBytes(16).toString("hex");
}

function build(secret, dataDir) {
  const now = new Date().toISOString();
  const userSpecs = [
    { username: "admin01", name: "系统管理员", role: "ADMIN", password: "Admin@2026" },
    { username: "designer01", name: "专业设计师", role: "DESIGNER", password: "Designer@2026" },
    { username: "operator01", name: "营销运营", role: "OPERATOR", password: "Operator@2026" },
    { username: "viewer01", name: "浏览者/客户", role: "VIEWER", password: "Viewer@2026" }
  ];
  const users = userSpecs.map(function (spec, index) {
    const salt = makeSalt();
    return {
      id: "USR-" + String(index + 1).padStart(2, "0"),
      username: spec.username,
      name: spec.name,
      role: spec.role,
      email: spec.username + "@visual.example",
      status: "active",
      salt: salt,
      passwordHash: hashPassword(spec.password, salt),
      createdAt: now,
      lastLoginAt: ""
    };
  });
  const roleMenus = {
    ADMIN: ["dashboard", "projects", "color", "style", "scene", "tasks", "assets", "reviews", "users", "styles", "words", "audit", "settings", "feedback", "help", "profile"],
    DESIGNER: ["dashboard", "projects", "color", "style", "scene", "tasks", "assets", "feedback", "help", "profile"],
    OPERATOR: ["dashboard", "projects", "color", "scene", "tasks", "assets", "feedback", "help", "profile"],
    VIEWER: ["dashboard", "reviews", "help", "profile"]
  };
  const settings = {
    roleMenus: roleMenus,
    complexity: 6,
    density: 6,
    grain: 20,
    glow: 40,
    referenceOpacity: 60,
    shadow: 55,
    reflection: 35,
    light: "left",
    width: 1024,
    height: 1024,
    softwareName: "基于AIGC的文创视觉氛围生成与风格化定制系统",
    softwareVersion: "V1.0",
    owner: "陕西理工大学",
    contact: "李果",
    aiNotice: "本图由本地参数化生成引擎输出，画面右下角带AI生成标识，参数与随机种子可在资产详情查看。",
    dataPolicy: "软件不访问互联网，不上传用户图片与生成结果；所有数据保存在本机data目录。"
  };
  const styles = [
    { id: "STY-01", name: "水墨国风", code: "ink", description: "纸纹、墨晕与笔触层叠，适合国风文创与非遗主题。", enabled: true, createdAt: now },
    { id: "STY-02", name: "赛博霓虹", code: "cyber", description: "暗色网格与霓虹光晕，适合潮流与数字艺术主题。", enabled: true, createdAt: now },
    { id: "STY-03", name: "3D盲盒", code: "blindbox", description: "圆角几何与粉彩柔影，适合潮玩与礼盒。", enabled: true, createdAt: now },
    { id: "STY-04", name: "极简留白", code: "minimal", description: "少量几何与大面积留白，适合品牌与画册。", enabled: true, createdAt: now },
    { id: "STY-05", name: "复古暖调", code: "retro", description: "暖色、半调点与放射线，适合复古海报。", enabled: true, createdAt: now }
  ];
  const words = ["暴力", "色情", "涉政", "赌博", "毒品", "诈骗", "仇恨", "恐怖", "侵权", "伪造"].map(function (word, index) {
    return { id: "WRD-" + String(index + 1).padStart(2, "0"), word: word, category: "通用", enabled: true, createdAt: now };
  });
  const projectSpecs = [
    { id: "PRJ-01", name: "中秋礼盒视觉原型", category: "文创产品设计", visibility: "private", owner: 1, description: "中秋礼盒的多风格视觉原型与配色验证。" },
    { id: "PRJ-02", name: "春季电商氛围图", category: "电商营销物料", visibility: "team", owner: 2, description: "春季上新商品的白底图场景合成。" },
    { id: "PRJ-03", name: "品牌色彩体系", category: "品牌视觉体系", visibility: "team", owner: 1, description: "品牌年度色彩与调和规则。" },
    { id: "PRJ-04", name: "IP衍生盲盒", category: "IP衍生品开发", visibility: "private", owner: 1, description: "IP形象的盲盒风格与赛博风格拓展。" }
  ];
  const projects = projectSpecs.map(function (spec) {
    return {
      id: spec.id,
      name: spec.name,
      category: spec.category,
      description: spec.description,
      visibility: spec.visibility,
      ownerId: users[spec.owner].id,
      ownerName: users[spec.owner].name,
      status: "active",
      shareToken: spec.id === "PRJ-02" ? "share-spring-2026-view-token" : "",
      shareExpiresAt: spec.id === "PRJ-02" ? Date.now() + 7 * 24 * 60 * 60 * 1000 : 0,
      createdAt: now,
      updatedAt: now
    };
  });
  const paletteAutumn = color.generate("秋日午后的慵懒与温暖的木质桌面", "analogous");
  const paletteCyber = color.generate("赛博时代的冷酷与霓虹科技感", "complementary");
  const paletteFestival = color.generate("中秋团圆的喜庆与温暖", "triadic");
  const palettes = [paletteAutumn, paletteCyber, paletteFestival];
  const uploadDir = path.join(dataDir, "uploads", "assets");
  fs.mkdirSync(uploadDir, { recursive: true });
  const tasks = [];
  const assets = [];
  const assetSpecs = [
    { project: 0, type: "style", style: "ink", scene: "", product: "", prompt: "中秋礼盒，水墨山水，月色与桂花，留白构图", palette: paletteFestival, seed: 20260421, status: "approved", favorite: true, title: "水墨中秋礼盒原型" },
    { project: 0, type: "style", style: "blindbox", scene: "", product: "", prompt: "中秋礼盒，3D盲盒质感，圆角礼盒与玉兔", palette: paletteAutumn, seed: 20260422, status: "draft", favorite: false, title: "盲盒质感中秋礼盒" },
    { project: 1, type: "scene", style: "scene", scene: "forest", product: "bottle", prompt: "春季香氛瓶，清晨森林，丁达尔光，苔藓石面", palette: paletteAutumn, seed: 20260423, status: "pending_review", favorite: true, title: "森林晨光香氛场景" },
    { project: 1, type: "scene", style: "scene", scene: "festival", product: "box", prompt: "春节礼盒，红金灯笼，节日暖光，木质桌面", palette: paletteFestival, seed: 20260424, status: "rejected", favorite: false, title: "节日暖光礼盒场景" },
    { project: 3, type: "style", style: "cyber", scene: "", product: "", prompt: "盲盒公仔，赛博霓虹，网格与光环，未来感", palette: paletteCyber, seed: 20260425, status: "draft", favorite: false, title: "赛博盲盒视觉" }
  ];
  assetSpecs.forEach(function (spec, index) {
    const result = generator.generate({
      width: 1024,
      height: 1024,
      style: spec.style === "scene" ? "minimal" : spec.style,
      seed: spec.seed,
      prompt: spec.prompt,
      palette: spec.palette.colors.map(function (item) { return item.hex; }),
      complexity: 6 + index,
      density: 6,
      grain: 18,
      glow: spec.style === "cyber" ? 70 : 40,
      referenceOpacity: 60,
      shadow: 60,
      reflection: 35,
      light: "left",
      scene: spec.scene || "studio",
      product: spec.product || "box",
      mode: spec.type === "scene" ? "scene" : "style",
      reference: ""
    });
    const taskId = "TASK-SEED-0" + (index + 1);
    const assetId = "AST-SEED-0" + (index + 1);
    const file = taskId + ".svg";
    fs.writeFileSync(path.join(uploadDir, file), result.svg, "utf8");
    tasks.push({
      id: taskId,
      projectId: projects[spec.project].id,
      projectName: projects[spec.project].name,
      type: spec.type,
      title: spec.title,
      prompt: spec.prompt,
      style: spec.style,
      scene: spec.scene,
      product: spec.product,
      palette: spec.palette.colors.map(function (item) { return item.hex; }),
      reference: "",
      seed: result.seed,
      params: {
        complexity: 6 + index,
        density: 6,
        grain: 18,
        glow: spec.style === "cyber" ? 70 : 40,
        referenceOpacity: 60,
        shadow: 60,
        reflection: 35,
        light: "left",
        width: 1024,
        height: 1024
      },
      status: "completed",
      progress: 100,
      logs: [
        { time: now, message: "任务已创建，等待生成" },
        { time: now, message: "生成完成，资产编号 " + assetId }
      ],
      assetId: assetId,
      createdBy: users[1].id,
      createdByName: users[1].name,
      createdAt: now,
      finishedAt: now
    });
    assets.push({
      id: assetId,
      projectId: projects[spec.project].id,
      taskId: taskId,
      type: spec.type,
      title: spec.title,
      prompt: spec.prompt,
      style: spec.style,
      palette: { colors: spec.palette.colors, harmony: spec.palette.harmony, emotionName: spec.palette.emotionName },
      params: {
        complexity: 6 + index,
        density: 6,
        grain: 18,
        glow: spec.style === "cyber" ? 70 : 40,
        referenceOpacity: 60,
        shadow: 60,
        reflection: 35,
        light: "left",
        scene: spec.scene,
        product: spec.product
      },
      seed: result.seed,
      width: 1024,
      height: 1024,
      file: file,
      hash: result.hash,
      favorite: spec.favorite,
      status: spec.status,
      reviewComment: spec.status === "rejected" ? "构图与品牌调性不一致，建议调整主体比例与背景亮度后重提。" : (spec.status === "approved" ? "色调与构图符合中秋主题，同意归档。" : ""),
      createdBy: users[1].id,
      createdByName: users[1].name,
      createdAt: now,
      deleted: false
    });
  });
  const failedTask = {
    id: "TASK-SEED-06",
    projectId: projects[0].id,
    projectName: projects[0].name,
    type: "style",
    title: "敏感词拦截记录",
    prompt: "包含暴力元素的礼盒包装",
    style: "ink",
    scene: "",
    product: "",
    palette: paletteFestival.colors.map(function (item) { return item.hex; }),
    reference: "",
    seed: -1,
    params: { complexity: 6, density: 6, grain: 20, glow: 40, referenceOpacity: 60, shadow: 55, reflection: 35, light: "left", width: 1024, height: 1024 },
    status: "failed",
    progress: 100,
    logs: [
      { time: now, message: "任务已创建，等待生成" },
      { time: now, message: "提示词命中敏感词：暴力" }
    ],
    assetId: "",
    createdBy: users[1].id,
    createdByName: users[1].name,
    createdAt: now,
    finishedAt: now
  };
  tasks.push(failedTask);
  const paletteAssets = palettes.map(function (palette, index) {
    return {
      id: "AST-PALETTE-0" + (index + 1),
      projectId: projects[2].id,
      taskId: "",
      type: "palette",
      title: palette.emotionName + "配色板",
      prompt: palette.text,
      style: "palette",
      palette: palette,
      params: { harmony: palette.harmony },
      seed: 0,
      width: 0,
      height: 0,
      file: "",
      hash: "",
      favorite: index === 0,
      status: index === 0 ? "approved" : "draft",
      reviewComment: "",
      createdBy: users[1].id,
      createdByName: users[1].name,
      createdAt: now,
      deleted: false
    };
  });
  assets.push.apply(assets, paletteAssets);
  const reviews = [
    { id: "REV-SEED-01", assetId: "AST-SEED-01", projectId: projects[0].id, reviewer: "浏览者/客户", reviewerRole: "VIEWER", action: "approve", comment: "色调与构图符合中秋主题，同意归档。", createdAt: now },
    { id: "REV-SEED-02", assetId: "AST-SEED-04", projectId: projects[1].id, reviewer: "营销运营", reviewerRole: "OPERATOR", action: "reject", comment: "构图与品牌调性不一致，建议调整主体比例与背景亮度后重提。", createdAt: now }
  ];
  const auditLogs = [
    { id: "LOG-SEED-01", userId: users[1].id, username: users[1].username, role: "DESIGNER", category: "生成", action: "创建生成任务", target: "水墨中秋礼盒原型", detail: "PRJ-01/style", ip: "127.0.0.1", createdAt: now },
    { id: "LOG-SEED-02", userId: users[0].id, username: users[0].username, role: "ADMIN", category: "系统设置", action: "保存默认参数", target: "生成参数", detail: "1024x1024", ip: "127.0.0.1", createdAt: now },
    { id: "LOG-SEED-03", userId: users[1].id, username: users[1].username, role: "DESIGNER", category: "审核", action: "提交审核", target: "森林晨光香氛场景", detail: "PRJ-02", ip: "127.0.0.1", createdAt: now }
  ];
  const feedback = [
    { id: "FB-SEED-01", userId: users[1].id, userName: users[1].name, role: "DESIGNER", type: "建议", content: "希望色板导出增加JSON格式，便于设计工具读取。", status: "replied", reply: "已在色板导出中提供CSS与JSON两种格式。", replier: "系统管理员", createdAt: now, repliedAt: now },
    { id: "FB-SEED-02", userId: users[2].id, userName: users[2].name, role: "OPERATOR", type: "建议", content: "场景生成希望增加俯拍视角。", status: "pending", reply: "", replier: "", createdAt: now, repliedAt: "" }
  ];
  return {
    meta: { createdAt: now, version: 1 },
    settings: settings,
    users: users,
    tokens: [],
    projects: projects,
    palettes: palettes,
    tasks: tasks,
    assets: assets,
    styles: styles,
    words: words,
    reviews: reviews,
    auditLogs: auditLogs,
    feedback: feedback,
    sessions: []
  };
}

module.exports = { build: build };
