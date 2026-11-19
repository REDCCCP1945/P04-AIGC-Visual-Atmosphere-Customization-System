const store = require("./store");
const projectService = require("./projectService");

function summary(ctx) {
  const projects = store.db.projects.filter(function (project) { return projectService.canAccess(ctx.user, project); });
  const projectIds = projects.map(function (project) { return project.id; });
  let assets = store.db.assets.filter(function (asset) {
    return !asset.deleted && projectIds.indexOf(asset.projectId) >= 0;
  });
  if (ctx.user.role === "VIEWER") assets = assets.filter(function (asset) { return asset.status === "approved"; });
  const tasks = store.db.tasks.filter(function (task) { return projectIds.indexOf(task.projectId) >= 0; });
  const styleCount = {};
  assets.forEach(function (asset) {
    const key = asset.style || "palette";
    styleCount[key] = (styleCount[key] || 0) + 1;
  });
  ctx.ok({
    metrics: {
      projectCount: projects.length,
      assetCount: assets.length,
      taskCount: tasks.length,
      pendingReviews: assets.filter(function (asset) { return asset.status === "pending_review"; }).length,
      favorites: assets.filter(function (asset) { return asset.favorite; }).length,
      paletteCount: assets.filter(function (asset) { return asset.type === "palette"; }).length
    },
    recentAssets: assets.slice(0, 8),
    recentTasks: tasks.slice(0, 5),
    styleDistribution: Object.keys(styleCount).map(function (key) { return { name: key, value: styleCount[key] }; }),
    projects: projects.slice(0, 5)
  });
}

module.exports = { summary: summary };
