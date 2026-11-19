const fs = require("fs");
const path = require("path");
const store = require("./store");
const audit = require("./audit");
const projectService = require("./projectService");
const generator = require("./generator");

function projectOf(asset) {
  return store.db.projects.find(function (project) { return project.id === asset.projectId; });
}

function canView(user, asset) {
  const project = projectOf(asset);
  if (!project) return false;
  if (user && user.role === "VIEWER") return asset.status === "approved";
  return projectService.canAccess(user, project);
}

function list(ctx) {
  const query = ctx.query;
  const projectId = query.get("projectId") || "";
  const type = query.get("type") || "";
  const style = query.get("style") || "";
  const status = query.get("status") || "";
  const favorite = query.get("favorite");
  const keyword = (query.get("keyword") || "").trim();
  let rows = store.db.assets.filter(function (asset) {
    return !asset.deleted && canView(ctx.user, asset);
  });
  if (projectId) rows = rows.filter(function (asset) { return asset.projectId === projectId; });
  if (type) rows = rows.filter(function (asset) { return asset.type === type; });
  if (style) rows = rows.filter(function (asset) { return asset.style === style; });
  if (status) rows = rows.filter(function (asset) { return asset.status === status; });
  if (favorite === "true") rows = rows.filter(function (asset) { return asset.favorite; });
  if (keyword) rows = rows.filter(function (asset) { return (asset.title + asset.prompt).indexOf(keyword) >= 0; });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  const page = Math.max(1, Number(query.get("page") || 1));
  const size = Math.min(60, Math.max(6, Number(query.get("size") || 12)));
  ctx.ok({
    total: rows.length,
    page: page,
    size: size,
    rows: rows.slice((page - 1) * size, page * size),
    summary: {
      total: rows.length,
      favorites: rows.filter(function (asset) { return asset.favorite; }).length,
      pending: rows.filter(function (asset) { return asset.status === "pending_review"; }).length,
      approved: rows.filter(function (asset) { return asset.status === "approved"; }).length
    }
  });
}

function detail(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset || !canView(ctx.user, asset)) {
    ctx.fail(404, "资产不存在或无权访问");
    return;
  }
  const project = projectOf(asset);
  const task = store.db.tasks.find(function (item) { return item.id === asset.taskId; });
  ctx.ok({ asset: asset, project: project, task: task, reviews: store.db.reviews.filter(function (item) { return item.assetId === asset.id; }) });
}

function favorite(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset) {
    ctx.fail(404, "资产不存在");
    return;
  }
  const project = projectOf(asset);
  if (ctx.user.role !== "ADMIN" && project.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以收藏");
    return;
  }
  asset.favorite = !asset.favorite;
  store.save();
  audit.write(ctx.user, "资产", asset.favorite ? "收藏资产" : "取消收藏", asset.title, "", ctx.req);
  ctx.ok({ asset: asset });
}

function remove(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset) {
    ctx.fail(404, "资产不存在");
    return;
  }
  const project = projectOf(asset);
  if (ctx.user.role !== "ADMIN" && project.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以删除");
    return;
  }
  asset.deleted = true;
  asset.deletedAt = store.now();
  store.save();
  audit.write(ctx.user, "资产", "删除资产", asset.title, "软删除", ctx.req);
  ctx.ok({});
}

function savePalette(ctx) {
  const body = ctx.body || {};
  const project = store.db.projects.find(function (item) { return item.id === body.projectId; });
  if (!project || !projectService.canAccess(ctx.user, project)) {
    ctx.fail(404, "项目不存在或无权访问");
    return;
  }
  if (!body.palette || !Array.isArray(body.palette.colors) || body.palette.colors.length !== 5) {
    ctx.fail(400, "色板数据不完整");
    return;
  }
  const asset = {
    id: store.id("AST"),
    projectId: project.id,
    taskId: "",
    type: "palette",
    title: String(body.title || (body.palette.emotionName + "配色板")).slice(0, 40),
    prompt: String(body.palette.text || "").slice(0, 500),
    style: "palette",
    palette: body.palette,
    params: { harmony: body.palette.harmony },
    seed: 0,
    width: 0,
    height: 0,
    file: "",
    hash: "",
    favorite: false,
    status: "draft",
    reviewComment: "",
    createdBy: ctx.user.id,
    createdByName: ctx.user.name,
    createdAt: store.now(),
    deleted: false
  };
  store.db.assets.unshift(asset);
  store.save();
  audit.write(ctx.user, "资产", "保存色板", asset.title, project.name, ctx.req);
  ctx.ok({ asset: asset });
}

function submitReview(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset) {
    ctx.fail(404, "资产不存在");
    return;
  }
  const project = projectOf(asset);
  if (ctx.user.role !== "ADMIN" && project.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以提交审核");
    return;
  }
  if (asset.status === "pending_review") {
    ctx.fail(409, "资产已在审核中");
    return;
  }
  if (asset.status === "approved") {
    ctx.fail(409, "资产已通过审核");
    return;
  }
  asset.status = "pending_review";
  asset.reviewComment = "";
  store.save();
  audit.write(ctx.user, "审核", "提交审核", asset.title, project.name, ctx.req);
  ctx.ok({ asset: asset });
}

function replay(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset || asset.type === "palette") {
    ctx.fail(404, "资产不存在或不可复现");
    return;
  }
  if (!canView(ctx.user, asset)) {
    ctx.fail(403, "无权访问该资产");
    return;
  }
  const colors = (asset.palette && asset.palette.colors ? asset.palette.colors : []).map(function (color) { return color.hex; });
  const result = generator.generate({
    width: asset.width,
    height: asset.height,
    style: asset.style,
    seed: asset.seed,
    prompt: asset.prompt,
    palette: colors,
    complexity: asset.params.complexity,
    density: asset.params.density,
    grain: asset.params.grain,
    glow: asset.params.glow,
    referenceOpacity: asset.params.referenceOpacity || 0,
    shadow: asset.params.shadow || 55,
    reflection: asset.params.reflection || 35,
    light: asset.params.light || "left",
    scene: asset.params.scene || "studio",
    product: asset.params.product || "box",
    mode: asset.type === "scene" ? "scene" : "style",
    reference: ""
  });
  const same = result.hash === asset.hash;
  audit.write(ctx.user, "资产", "复现资产", asset.title, same ? "哈希一致" : "哈希不同", ctx.req);
  ctx.ok({ same: same, originalHash: asset.hash, replayHash: result.hash, seed: asset.seed });
}

function downloadSvg(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset || !asset.file) {
    ctx.fail(404, "资产文件不存在");
    return;
  }
  const project = projectOf(asset);
  const shared = ctx.query.get("share") || "";
  const tokenOk = shared && project && project.shareToken === shared && project.shareExpiresAt > Date.now();
  if (!tokenOk && !canView(ctx.user, asset)) {
    ctx.fail(403, "无权下载该资产");
    return;
  }
  if (asset.status !== "approved" && !tokenOk && (!ctx.user || ctx.user.role === "VIEWER")) {
    ctx.fail(409, "资产尚未通过审核");
    return;
  }
  const file = path.join(store.dataPath(), "uploads", "assets", asset.file);
  if (!fs.existsSync(file)) {
    ctx.fail(404, "资产文件不存在");
    return;
  }
  audit.write(ctx.user || { id: null, username: "share", role: "VIEWER" }, "资产", "下载SVG", asset.title, "", ctx.req);
  const content = fs.readFileSync(file);
  ctx.res.writeHead(200, {
    "Content-Type": "image/svg+xml",
    "Content-Disposition": "attachment; filename=\"" + encodeURIComponent(asset.title + ".svg") + "\"",
    "Content-Length": content.length
  });
  ctx.res.end(content);
}

module.exports = {
  list: list,
  detail: detail,
  favorite: favorite,
  remove: remove,
  savePalette: savePalette,
  submitReview: submitReview,
  replay: replay,
  downloadSvg: downloadSvg,
  canView: canView
};
