const store = require("./store");
const audit = require("./audit");
const projectService = require("./projectService");

function pendingList(ctx) {
  const rows = store.db.assets.filter(function (asset) {
    if (asset.deleted || asset.status !== "pending_review") return false;
    const project = store.db.projects.find(function (item) { return item.id === asset.projectId; });
    return project && project.shareToken && project.shareExpiresAt > Date.now();
  }).map(function (asset) {
    const project = store.db.projects.find(function (item) { return item.id === asset.projectId; });
    return {
      id: asset.id,
      title: asset.title,
      projectName: project.name,
      projectId: project.id,
      style: asset.style,
      file: asset.file,
      prompt: asset.prompt,
      seed: asset.seed,
      createdByName: asset.createdByName,
      createdAt: asset.createdAt
    };
  });
  ctx.ok({ rows: rows, total: rows.length });
}

function applyReview(asset, action, comment) {
  asset.status = action === "approve" ? "approved" : "rejected";
  asset.reviewComment = comment;
}

function review(ctx) {
  const body = ctx.body || {};
  const asset = store.db.assets.find(function (item) { return item.id === body.assetId && !item.deleted; });
  if (!asset) {
    ctx.fail(404, "资产不存在");
    return;
  }
  const project = store.db.projects.find(function (item) { return item.id === asset.projectId; });
  if (!project) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (asset.status !== "pending_review") {
    ctx.fail(409, "该资产当前不在待审核状态");
    return;
  }
  const action = String(body.action || "");
  const comment = String(body.comment || "").trim();
  if (action !== "approve" && action !== "reject") {
    ctx.fail(400, "审核动作必须为approve或reject");
    return;
  }
  if (action === "reject" && comment.length < 2) {
    ctx.fail(400, "驳回时必须填写意见", "comment");
    return;
  }
  applyReview(asset, action, comment);
  const record = {
    id: store.id("REV"),
    assetId: asset.id,
    projectId: project.id,
    reviewer: ctx.user.name,
    reviewerRole: ctx.user.role,
    action: action,
    comment: comment,
    createdAt: store.now()
  };
  store.db.reviews.push(record);
  store.save();
  audit.write(ctx.user, "审核", action === "approve" ? "通过资产" : "驳回资产", asset.title, comment, ctx.req);
  ctx.ok({ asset: asset, review: record });
}

function publicReview(ctx) {
  const token = ctx.params[0];
  const project = store.db.projects.find(function (item) { return item.shareToken === token; });
  if (!project) {
    ctx.fail(404, "分享链接不存在");
    return;
  }
  if (!project.shareExpiresAt || project.shareExpiresAt < Date.now()) {
    ctx.fail(410, "分享链接已过期");
    return;
  }
  const body = ctx.body || {};
  const asset = store.db.assets.find(function (item) {
    return item.id === body.assetId && item.projectId === project.id && !item.deleted;
  });
  if (!asset) {
    ctx.fail(404, "资产不存在");
    return;
  }
  if (asset.status !== "pending_review") {
    ctx.fail(409, "该资产当前不在待审核状态");
    return;
  }
  const action = String(body.action || "");
  const comment = String(body.comment || "").trim();
  const reviewerName = String(body.reviewerName || "外部浏览者").trim().slice(0, 20) || "外部浏览者";
  if (action !== "approve" && action !== "reject") {
    ctx.fail(400, "审核动作必须为approve或reject");
    return;
  }
  if (action === "reject" && comment.length < 2) {
    ctx.fail(400, "驳回时必须填写意见", "comment");
    return;
  }
  applyReview(asset, action, comment);
  const record = {
    id: store.id("REV"),
    assetId: asset.id,
    projectId: project.id,
    reviewer: reviewerName,
    reviewerRole: "VIEWER",
    action: action,
    comment: comment,
    createdAt: store.now()
  };
  store.db.reviews.push(record);
  store.save();
  audit.write({ id: null, username: "share-" + token.slice(0, 6), role: "VIEWER" }, "审核", "分享审核", asset.title, action + " " + comment, ctx.req);
  ctx.ok({ asset: { id: asset.id, status: asset.status }, review: record });
}

function assetReviews(ctx) {
  const asset = store.db.assets.find(function (item) { return item.id === ctx.params[0] && !item.deleted; });
  if (!asset) {
    ctx.fail(404, "资产不存在");
    return;
  }
  const project = store.db.projects.find(function (item) { return item.id === asset.projectId; });
  if (!project || !projectService.canAccess(ctx.user, project)) {
    ctx.fail(403, "无权访问");
    return;
  }
  ctx.ok({ rows: store.db.reviews.filter(function (item) { return item.assetId === asset.id; }) });
}

module.exports = {
  pendingList: pendingList,
  review: review,
  publicReview: publicReview,
  assetReviews: assetReviews
};
