const AssetsView = {
  render: async function (container) {
    const meta = (await API.get("/api/meta")).data;
    const projects = (await API.get("/api/projects")).data.rows;
    const state = { page: 1, size: 12, total: 0 };
    container.innerHTML = UI.pageHead("资产库", "生成图、场景图与配色板统一管理，可按项目与状态筛选", '<button class="btn" data-route="style">去生成</button>') +
      '<div class="card"><div class="card-body"><div class="filters">' +
      '<div class="field"><label>项目</label><select class="select" id="a-project"><option value="">全部项目</option>' + UI.optionList(projects.map(function (project) { return { value: project.id, label: project.name }; })) + "</select></div>" +
      '<div class="field"><label>类型</label><select class="select" id="a-type"><option value="">全部</option><option value="style">风格图</option><option value="scene">场景图</option><option value="palette">配色板</option></select></div>' +
      '<div class="field"><label>状态</label><select class="select" id="a-status"><option value="">全部</option><option value="draft">草稿</option><option value="pending_review">待审核</option><option value="approved">已通过</option><option value="rejected">已驳回</option></select></div>' +
      '<div class="field"><label>风格</label><select class="select" id="a-style"><option value="">全部</option>' + UI.optionList(meta.styles.map(function (style) { return { value: style.code, label: style.name }; })) + "</select></div>" +
      '<div class="field grow"><label>关键词</label><input class="input" id="a-keyword" placeholder="标题或提示词"></div>' +
      '<button class="btn primary" id="a-search">查询</button></div>' +
      '<div class="stat-strip" id="a-summary" style="margin-top:14px"></div>' +
      '<div id="a-list"></div><div id="a-pager"></div></div></div>';
    const list = container.querySelector("#a-list");
    const pager = container.querySelector("#a-pager");
    async function load() {
      const params = new URLSearchParams();
      params.set("page", state.page);
      params.set("size", state.size);
      ["project", "type", "status", "style"].forEach(function (key) {
        params.set(key === "project" ? "projectId" : key, container.querySelector("#a-" + key).value);
      });
      params.set("keyword", container.querySelector("#a-keyword").value.trim());
      const result = await API.get("/api/assets?" + params.toString());
      const data = result.data;
      state.total = data.total;
      container.querySelector("#a-summary").innerHTML = '<div class="stat-mini"><span>资产</span><strong>' + data.summary.total + '</strong></div>' +
        '<div class="stat-mini"><span>收藏</span><strong>' + data.summary.favorites + '</strong></div>' +
        '<div class="stat-mini"><span>待审核</span><strong>' + data.summary.pending + '</strong></div>' +
        '<div class="stat-mini"><span>已通过</span><strong>' + data.summary.approved + "</strong></div>";
      list.innerHTML = data.rows.length ? '<div class="asset-grid">' + data.rows.map(function (asset) {
        return DashboardView.card(asset);
      }).join("") + "</div>" : '<div class="card" style="margin-top:12px"><div class="card-body">' + UI.empty("暂无资产", "调整筛选或先生成资产") + "</div></div>";
      list.querySelectorAll("[data-asset]").forEach(function (node) {
        node.addEventListener("click", function () { location.hash = "#/assets/" + node.getAttribute("data-asset"); });
      });
      pager.innerHTML = UI.pagination(state);
      UI.bindPagination(pager, state, load);
    }
    container.querySelector("#a-search").addEventListener("click", function () { state.page = 1; load(); });
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    await load();
  }
};
App.register("assets", AssetsView);
