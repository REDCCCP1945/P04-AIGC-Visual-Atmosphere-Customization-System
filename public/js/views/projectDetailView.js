const ProjectDetailView = {
  render: async function (container, params) {
    const response = await API.get("/api/projects/" + params.id);
    const data = response.data;
    const project = data.project;
    const isOwner = App.user.role === "ADMIN" || project.ownerId === App.user.id;
    const actions = '<button class="btn" data-route="projects">返回项目</button>' +
      (isOwner ? '<button class="btn" id="project-edit">编辑</button><button class="btn" id="project-share">分享</button>' : "") +
      (isOwner && App.user.role !== "VIEWER" ? '<button class="btn teal" id="project-style">用此项目生成</button>' : "");
    const assets = data.assets.map(function (asset) { return DashboardView.card(asset); }).join("");
    container.innerHTML = UI.pageHead(project.name, project.category + " · 负责人 " + project.ownerName, actions) +
      '<div class="card"><div class="card-body"><div class="detail-list">' +
      '<div class="detail-item"><span>项目类别</span><strong>' + UI.esc(project.category) + "</strong></div>" +
      '<div class="detail-item"><span>可见性</span><strong>' + (project.visibility === "team" ? "团队可见" : "仅自己") + "</strong></div>" +
      '<div class="detail-item"><span>资产数量</span><strong>' + data.assets.length + "</strong></div>" +
      '<div class="detail-item"><span>分享状态</span><strong>' + (project.shareToken && project.shareExpiresAt > Date.now() ? "有效" : "未分享") + "</strong></div>" +
      '</div><p style="margin:14px 0 0;color:#a7b7c8">' + UI.esc(project.description || "未填写项目描述") + "</p></div></div>" +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>项目资产</h3><span class="hint">共 ' + data.assets.length + " 件</span></div><div class=\"card-body\">" +
      (assets ? '<div class="asset-grid">' + assets + "</div>" : UI.empty("暂无资产", "使用风格生成或氛围场景创建")) +
      "</div></div>";
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    container.querySelectorAll("[data-asset]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/assets/" + node.getAttribute("data-asset"); });
    });
    const edit = container.querySelector("#project-edit");
    if (edit) edit.addEventListener("click", function () {
      ProjectsView.form([project.category, "文创产品设计", "电商营销物料", "品牌视觉体系", "IP衍生品开发"].filter(function (item, index, list) { return list.indexOf(item) === index; }), project, function () { ProjectDetailView.render(container, params); });
    });
    const share = container.querySelector("#project-share");
    if (share) share.addEventListener("click", async function () {
      try {
        const result = await API.post("/api/projects/" + project.id + "/share", {});
        const url = location.origin + result.data.url;
        UI.modal({
          title: "分享项目",
          size: "narrow",
          body: '<p style="color:#a7b7c8;line-height:1.8">分享链接有效期24小时，浏览者无需登录即可查看已提交审核的资产并给出意见。</p>' +
            '<input class="input" id="share-url" value="' + UI.esc(url) + '" readonly>' +
            '<p style="color:#61748a;font-size:11px;margin-top:8px">到期时间：' + UI.fmtDateTime(new Date(result.data.expiresAt).toISOString()) + "</p>",
          buttons: [{ text: "复制链接", className: "primary", onClick: function (api) {
            const input = api.find("#share-url");
            input.select();
            navigator.clipboard.writeText(url).then(function () { UI.toast("已复制", "success"); });
          } }]
        });
      } catch (error) { UI.toast(error.message, "error"); }
    });
    const style = container.querySelector("#project-style");
    if (style) style.addEventListener("click", function () {
      sessionStorage.setItem("p04_project", project.id);
      location.hash = "#/style";
    });
  }
};
App.register("project-detail", ProjectDetailView);
