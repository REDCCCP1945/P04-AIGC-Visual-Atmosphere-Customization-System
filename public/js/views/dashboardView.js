const DashboardView = {
  render: async function (container) {
    const response = await API.get("/api/dashboard");
    const data = response.data;
    const metrics = data.metrics;
    const actions = '<button class="btn" data-route="color">色彩情绪</button>' +
      '<button class="btn" data-route="style">风格生成</button>' +
      '<button class="btn primary" data-route="scene">氛围场景</button>';
    const cards = data.recentAssets.map(function (asset) {
      return DashboardView.card(asset);
    }).join("");
    container.innerHTML = UI.pageHead("工作台", "当前账号：" + App.user.name + " · " + UI.roleName(App.user.role), actions) +
      '<div class="grid grid-5">' +
      DashboardView.metric("项目", metrics.projectCount, "个", "当前账号可见") +
      DashboardView.metric("资产", metrics.assetCount, "件", "含生成图与色板") +
      DashboardView.metric("生成任务", metrics.taskCount, "个", "含历史任务") +
      DashboardView.metric("待审核", metrics.pendingReviews, "件", "分享项目内", "accent-amber") +
      DashboardView.metric("收藏", metrics.favorites, "件", "灵感库", "accent-teal") +
      "</div>" +
      '<div class="grid grid-main" style="margin-top:16px">' +
      '<div class="card"><div class="card-head"><h3>最近资产</h3><a href="#/assets">进入资产库</a></div><div class="card-body">' +
      (cards ? '<div class="asset-grid">' + cards + "</div>" : UI.empty("暂无资产", "从风格生成或色彩情绪开始创作")) +
      "</div></div>" +
      '<div class="stack"><div class="card"><div class="card-head"><h3>风格分布</h3><span class="hint">按资产数量</span></div><div class="card-body">' +
      Charts.donut(data.styleDistribution.map(function (item) { return { name: DashboardView.styleName(item.name), value: item.value }; })) +
      "</div></div>" +
      '<div class="card"><div class="card-head"><h3>最近任务</h3><a href="#/tasks">全部任务</a></div><div class="card-body tight">' +
      UI.table({
        columns: [
          { title: "任务", key: "title", render: function (row) { return '<span class="clickable" data-task="' + row.id + '">' + UI.esc(row.title) + "</span>"; } },
          { title: "状态", width: "80px", render: function (row) { return UI.statusBadge(row.status); } }
        ],
        rows: data.recentTasks,
        empty: "暂无任务"
      }) + "</div></div></div></div>";
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    container.querySelectorAll("[data-asset]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/assets/" + node.getAttribute("data-asset"); });
    });
    container.querySelectorAll("[data-task]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/tasks/" + node.getAttribute("data-task"); });
    });
  },
  metric: function (label, value, unit, foot, tone) {
    return '<div class="card metric ' + (tone || "") + '"><div class="metric-label"><span>' + UI.esc(label) + '</span><span>' + UI.esc(unit) + '</span></div>' +
      '<div class="metric-value">' + UI.fmtInt(value) + '</div><div class="metric-foot">' + UI.esc(foot) + "</div></div>";
  },
  styleName: function (code) {
    const map = { ink: "水墨国风", cyber: "赛博霓虹", blindbox: "3D盲盒", minimal: "极简留白", retro: "复古暖调", scene: "氛围场景", palette: "配色板" };
    return map[code] || code;
  },
  card: function (asset) {
    if (asset.type === "palette") {
      const colors = asset.palette && asset.palette.colors ? asset.palette.colors : [];
      return '<div class="asset-card" data-asset="' + asset.id + '"><div class="asset-thumb palette">' + colors.map(function (color) {
        return '<span style="background:' + color.hex + '"></span>';
      }).join("") + '</div><div class="asset-meta"><strong>' + UI.esc(asset.title) + "</strong><span>" + UI.esc(asset.palette.emotionName || "配色板") + " · " + colors.length + "色</span></div></div>";
    }
    return '<div class="asset-card" data-asset="' + asset.id + '"><div class="asset-thumb"><img src="/files/assets/' + encodeURIComponent(asset.file) + '" alt="' + UI.esc(asset.title) + '"></div>' +
      '<div class="asset-meta"><strong>' + UI.esc(asset.title) + "</strong><span>" + DashboardView.styleName(asset.style) + " · " + (asset.status === "approved" ? "已通过" : asset.status === "pending_review" ? "待审核" : "草稿") + "</span></div></div>";
  }
};
App.register("dashboard", DashboardView);
