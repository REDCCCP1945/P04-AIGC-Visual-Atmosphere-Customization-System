const fs = require("fs");
const path = require("path");
const store = require("./store");
const audit = require("./audit");
const validate = require("./validate");
const projectService = require("./projectService");
const generator = require("./generator");

const STATUS_LABELS = {
  queued: "排队中",
  running: "生成中",
  completed: "已完成",
  failed: "失败"
};

const TYPES = ["style", "scene"];

function styleOf(code) {
  return store.db.styles.find(function (item) { return item.code === code; });
}

function defaultParams() {
  const settings = store.db.settings;
  return {
    complexity: settings.complexity,
    density: settings.density,
    grain: settings.grain,
    glow: settings.glow,
    referenceOpacity: settings.referenceOpacity,
    shadow: settings.shadow,
    reflection: settings.reflection,
    light: settings.light,
    width: settings.width,
    height: settings.height
  };
}

function list(ctx) {
  const query = ctx.query;
  const projectId = query.get("projectId") || "";
  const status = query.get("status") || "";
  let rows = store.db.tasks.slice();
  if (projectId) rows = rows.filter(function (task) { return task.projectId === projectId; });
  if (status) rows = rows.filter(function (task) { return task.status === status; });
  rows = rows.filter(function (task) {
    const project = store.db.projects.find(function (item) { return item.id === task.projectId; });
    return project && projectService.canAccess(ctx.user, project);
  });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(50, Math.max(5, Number(query.get("size") || 10)));
  ctx.ok({
    total: rows.length,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size).map(function (task) {
      return Object.assign({}, task, { statusLabel: STATUS_LABELS[task.status] });
    }),
    summary: {
      queued: store.db.tasks.filter(function (task) { return task.status === "queued"; }).length,
      running: store.db.tasks.filter(function (task) { return task.status === "running"; }).length,
      completed: store.db.tasks.filter(function (task) { return task.status === "completed"; }).length,
      failed: store.db.tasks.filter(function (task) { return task.status === "failed"; }).length
    }
  });
}

function taskDetail(ctx) {
  const task = store.db.tasks.find(function (item) { return item.id === ctx.params[0]; });
  if (!task) {
    ctx.fail(404, "任务不存在");
    return;
  }
  const project = store.db.projects.find(function (item) { return item.id === task.projectId; });
  if (!project || !projectService.canAccess(ctx.user, project)) {
    ctx.fail(403, "无权访问该任务");
    return;
  }
  const asset = task.assetId ? store.db.assets.find(function (item) { return item.id === task.assetId; }) : null;
  ctx.ok({ task: Object.assign({}, task, { statusLabel: STATUS_LABELS[task.status] }), project: project, asset: asset });
}

function sensitiveHit(text) {
  const content = String(text);
  for (const word of store.db.words) {
    if (word.enabled && content.indexOf(word.word) >= 0) return word;
  }
  return null;
}

function validateParams(body, type) {
  const errors = [];
  const prompt = String(body.prompt || "").trim();
  if (prompt.length < 2 || prompt.length > 500) errors.push({ field: "prompt", message: "提示词长度应为2到500个字符" });
  if (TYPES.indexOf(type) < 0) errors.push({ field: "type", message: "生成类型无效" });
  if (type === "style") {
    const style = styleOf(String(body.style || ""));
    if (!style || !style.enabled) errors.push({ field: "style", message: "请选择启用的风格预设" });
  }
  if (type === "scene") {
    if (generator.SCENES.indexOf(String(body.scene || "")) < 0) errors.push({ field: "scene", message: "场景预设无效" });
    if (generator.PRODUCTS.indexOf(String(body.product || "")) < 0) errors.push({ field: "product", message: "主体类型无效" });
  }
  const params = body.params || {};
  const ranges = {
    complexity: [1, 10],
    density: [1, 10],
    grain: [0, 100],
    glow: [0, 100],
    referenceOpacity: [0, 100],
    shadow: [0, 100],
    reflection: [0, 100],
    width: [512, 1600],
    height: [512, 1600]
  };
  Object.keys(ranges).forEach(function (key) {
    const value = Number(params[key]);
    if (!Number.isFinite(value) || value < ranges[key][0] || value > ranges[key][1]) {
      errors.push({ field: key, message: key + " 应在 " + ranges[key][0] + " 到 " + ranges[key][1] + " 之间" });
    }
  });
  if (params.light && ["left", "right", "top"].indexOf(params.light) < 0) errors.push({ field: "light", message: "光向无效" });
  if (body.seed !== undefined && body.seed !== -1) {
    const seed = Number(body.seed);
    if (!Number.isInteger(seed) || seed < 0 || seed > 999999) errors.push({ field: "seed", message: "随机种子应为-1或0到999999" });
  }
  if (!body.palette || !Array.isArray(body.palette) || body.palette.length !== 5) errors.push({ field: "palette", message: "色板必须包含5种颜色" });
  return errors;
}

function create(ctx) {
  const body = ctx.body || {};
  const type = String(body.type || "style");
  const project = store.db.projects.find(function (item) { return item.id === body.projectId; });
  if (!project || !projectService.canAccess(ctx.user, project)) {
    ctx.fail(404, "项目不存在或无权访问");
    return;
  }
  const errors = validateParams(body, type);
  if (errors.length) {
    ctx.send(400, { code: 400, message: errors[0].message, errors: errors });
    return;
  }
  const hit = sensitiveHit(body.prompt);
  const task = {
    id: store.id("TASK"),
    projectId: project.id,
    projectName: project.name,
    type: type,
    title: String(body.title || (type === "scene" ? "氛围场景生成" : "风格化生成")).slice(0, 40),
    prompt: String(body.prompt).trim(),
    style: type === "style" ? String(body.style) : "scene",
    scene: type === "scene" ? String(body.scene) : "",
    product: type === "scene" ? String(body.product) : "",
    palette: body.palette.slice(),
    reference: body.reference ? String(body.reference) : "",
    seed: body.seed === undefined ? -1 : Number(body.seed),
    params: body.params,
    status: "queued",
    progress: 0,
    logs: [{ time: store.now(), message: "任务已创建，等待生成" }],
    assetId: "",
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now(),
    finishedAt: ""
  };
  if (hit) {
    task.status = "failed";
    task.progress = 100;
    task.finishedAt = store.now();
    task.logs.push({ time: store.now(), message: "提示词命中敏感词：" + hit.word });
    store.db.tasks.unshift(task);
    store.save();
    audit.write(ctx.user, "生成", "拦截提示词", task.title, hit.word, ctx.req);
    ctx.ok({ task: task, blocked: true });
    return;
  }
  store.db.tasks.unshift(task);
  store.save();
  audit.write(ctx.user, "生成", "创建生成任务", task.title, project.name + "/" + type, ctx.req);
  ctx.ok({ task: task });
  setTimeout(function () { runTask(task.id); }, 700);
}

function runTask(taskId) {
  const task = store.db.tasks.find(function (item) { return item.id === taskId; });
  if (!task || task.status !== "queued") return;
  task.status = "running";
  task.progress = 30;
  task.logs.push({ time: store.now(), message: "开始解析提示词与色板" });
  store.save();
  setTimeout(function () {
    try {
      const result = generator.generate({
        width: task.params.width,
        height: task.params.height,
        style: task.style,
        seed: task.seed,
        prompt: task.prompt,
        palette: task.palette,
        complexity: task.params.complexity,
        density: task.params.density,
        grain: task.params.grain,
        glow: task.params.glow,
        referenceOpacity: task.params.referenceOpacity,
        shadow: task.params.shadow,
        reflection: task.params.reflection,
        light: task.params.light,
        scene: task.scene || "studio",
        product: task.product || "box",
        mode: task.type === "scene" ? "scene" : "style",
        reference: task.reference
      });
      const dir = path.join(store.dataPath(), "uploads", "assets");
      fs.mkdirSync(dir, { recursive: true });
      const file = task.id + ".svg";
      fs.writeFileSync(path.join(dir, file), result.svg, "utf8");
      const asset = {
        id: store.id("AST"),
        projectId: task.projectId,
        taskId: task.id,
        type: task.type,
        title: task.title,
        prompt: task.prompt,
        style: task.type === "scene" ? "scene" : task.style,
        palette: { colors: task.palette.map(function (hex) { return { hex: hex }; }), harmony: "custom" },
        params: {
          complexity: task.params.complexity,
          density: task.params.density,
          grain: task.params.grain,
          glow: task.params.glow,
          referenceOpacity: task.params.referenceOpacity,
          shadow: task.params.shadow,
          reflection: task.params.reflection,
          light: task.params.light,
          scene: task.scene,
          product: task.product
        },
        seed: result.seed,
        width: result.width,
        height: result.height,
        file: file,
        hash: result.hash,
        favorite: false,
        status: "draft",
        reviewComment: "",
        createdBy: task.createdBy,
        createdByName: task.createdByName,
        createdAt: store.now(),
        deleted: false
      };
      store.db.assets.unshift(asset);
      task.assetId = asset.id;
      task.progress = 100;
      task.status = "completed";
      task.finishedAt = store.now();
      task.seed = result.seed;
      task.logs.push({ time: store.now(), message: "生成完成，资产编号 " + asset.id });
      store.save();
    } catch (error) {
      task.status = "failed";
      task.progress = 100;
      task.finishedAt = store.now();
      task.logs.push({ time: store.now(), message: "生成失败：" + error.message });
      store.save();
    }
  }, 900);
}

function retry(ctx) {
  const task = store.db.tasks.find(function (item) { return item.id === ctx.params[0]; });
  if (!task) {
    ctx.fail(404, "任务不存在");
    return;
  }
  if (task.status !== "failed") {
    ctx.fail(409, "只有失败任务可以重新生成");
    return;
  }
  const project = store.db.projects.find(function (item) { return item.id === task.projectId; });
  if (ctx.user.role !== "ADMIN" && project.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以重试");
    return;
  }
  task.status = "queued";
  task.progress = 0;
  task.logs.push({ time: store.now(), message: "用户重新提交任务" });
  task.finishedAt = "";
  store.save();
  audit.write(ctx.user, "生成", "重试任务", task.title, "", ctx.req);
  ctx.ok({ task: task });
  setTimeout(function () { runTask(task.id); }, 500);
}

module.exports = {
  STATUS_LABELS: STATUS_LABELS,
  TYPES: TYPES,
  defaultParams: defaultParams,
  list: list,
  taskDetail: taskDetail,
  create: create,
  runTask: runTask,
  retry: retry,
  styleOf: styleOf
};
