const crypto = require("crypto");
const store = require("./store");
const audit = require("./audit");

const CATEGORIES = ["文创产品设计", "电商营销物料", "品牌视觉体系", "IP衍生品开发"];
const VISIBILITY = ["private", "team"];

function canAccess(user, project) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (project.ownerId === user.id) return true;
  if (project.visibility === "team" && user.role !== "VIEWER") return true;
  if (user.role === "VIEWER" && project.shareToken && (!project.shareExpiresAt || project.shareExpiresAt > Date.now())) return true;
  return false;
}

function list(ctx) {
  const query = ctx.query;
  const keyword = (query.get("keyword") || "").trim();
  const category = query.get("category") || "";
  let rows = store.db.projects.filter(function (project) { return canAccess(ctx.user, project); });
  if (keyword) rows = rows.filter(function (project) { return (project.name + project.description).indexOf(keyword) >= 0; });
  if (category) rows = rows.filter(function (project) { return project.category === category; });
  rows = rows.map(function (project) {
    const assets = store.db.assets.filter(function (asset) { return asset.projectId === project.id && !asset.deleted; });
    return Object.assign({}, project, {
      assetCount: assets.length,
      pendingCount: assets.filter(function (asset) { return asset.status === "pending_review"; }).length,
      ownerName: (store.db.users.find(function (user) { return user.id === project.ownerId; }) || {}).name || ""
    });
  });
  rows.sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
  ctx.ok({ rows: rows, total: rows.length, categories: CATEGORIES });
}

function detail(ctx) {
  const project = store.db.projects.find(function (item) { return item.id === ctx.params[0]; });
  if (!project || !canAccess(ctx.user, project)) {
    ctx.fail(404, "项目不存在或无权访问");
    return;
  }
  const assets = store.db.assets.filter(function (asset) { return asset.projectId === project.id && !asset.deleted; });
  ctx.ok({ project: project, assets: assets, categories: CATEGORIES });
}

function create(ctx) {
  const body = ctx.body || {};
  const name = String(body.name || "").trim();
  const category = String(body.category || "");
  const visibility = String(body.visibility || "private");
  const description = String(body.description || "").trim();
  if (name.length < 2 || name.length > 40) {
    ctx.fail(400, "项目名称长度应为2到40个字符", "name");
    return;
  }
  if (CATEGORIES.indexOf(category) < 0) {
    ctx.fail(400, "请选择有效的项目类别", "category");
    return;
  }
  if (VISIBILITY.indexOf(visibility) < 0) {
    ctx.fail(400, "可见性参数无效", "visibility");
    return;
  }
  if (description.length > 200) {
    ctx.fail(400, "项目描述不能超过200个字符", "description");
    return;
  }
  const project = {
    id: store.id("PRJ"),
    name: name,
    category: category,
    description: description,
    visibility: visibility,
    ownerId: ctx.user.id,
    ownerName: ctx.user.name,
    status: "active",
    shareToken: "",
    shareExpiresAt: 0,
    createdAt: store.now(),
    updatedAt: store.now()
  };
  store.db.projects.unshift(project);
  store.save();
  audit.write(ctx.user, "项目", "创建项目", name, category, ctx.req);
  ctx.ok({ project: project });
}

function update(ctx) {
  const project = store.db.projects.find(function (item) { return item.id === ctx.params[0]; });
  if (!project) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && project.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以修改");
    return;
  }
  const body = ctx.body || {};
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (name.length < 2 || name.length > 40) {
      ctx.fail(400, "项目名称长度应为2到40个字符", "name");
      return;
    }
    project.name = name;
  }
  if (body.category !== undefined) {
    if (CATEGORIES.indexOf(String(body.category)) < 0) {
      ctx.fail(400, "项目类别无效", "category");
      return;
    }
    project.category = String(body.category);
  }
  if (body.description !== undefined) project.description = String(body.description).trim().slice(0, 200);
  if (body.visibility !== undefined) {
    if (VISIBILITY.indexOf(String(body.visibility)) < 0) {
      ctx.fail(400, "可见性参数无效", "visibility");
      return;
    }
    project.visibility = String(body.visibility);
  }
  if (body.status !== undefined) {
    if (["active", "archived"].indexOf(String(body.status)) < 0) {
      ctx.fail(400, "项目状态无效", "status");
      return;
    }
    project.status = String(body.status);
  }
  project.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "项目", "修改项目", project.name, "", ctx.req);
  ctx.ok({ project: project });
}

function share(ctx) {
  const project = store.db.projects.find(function (item) { return item.id === ctx.params[0]; });
  if (!project) {
    ctx.fail(404, "项目不存在");
    return;
  }
  if (ctx.user.role !== "ADMIN" && project.ownerId !== ctx.user.id) {
    ctx.fail(403, "只有项目负责人可以分享");
    return;
  }
  project.shareToken = crypto.randomBytes(16).toString("hex");
  project.shareExpiresAt = Date.now() + 24 * 60 * 60 * 1000;
  project.updatedAt = store.now();
  store.save();
  audit.write(ctx.user, "分享", "生成分享链接", project.name, "有效期24小时", ctx.req);
  ctx.ok({
    token: project.shareToken,
    expiresAt: project.shareExpiresAt,
    url: "/share.html?token=" + project.shareToken
  });
}

function publicShare(ctx) {
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
  const assets = store.db.assets.filter(function (asset) {
    return asset.projectId === project.id && !asset.deleted;
  }).map(function (asset) {
    return {
      id: asset.id,
      title: asset.title,
      type: asset.type,
      style: asset.style,
      file: asset.file,
      status: asset.status,
      prompt: asset.prompt,
      seed: asset.seed,
      reviewComment: asset.reviewComment
    };
  });
  const reviews = store.db.reviews.filter(function (review) { return review.projectId === project.id; });
  ctx.ok({
    project: {
      id: project.id,
      name: project.name,
      category: project.category,
      description: project.description,
      ownerName: project.ownerName,
      shareExpiresAt: project.shareExpiresAt
    },
    assets: assets,
    reviews: reviews
  });
}

module.exports = {
  CATEGORIES: CATEGORIES,
  canAccess: canAccess,
  list: list,
  detail: detail,
  create: create,
  update: update,
  share: share,
  publicShare: publicShare
};
