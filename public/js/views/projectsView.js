const ProjectsView = {
  render: async function (container) {
    const response = await API.get("/api/projects");
    const data = response.data;
    const actions = App.user.role === "VIEWER" ? "" : '<button class="btn primary" id="project-add">新建项目</button>';
    const cards = data.rows.map(function (project) {
      return '<div class="card" data-project="' + project.id + '" style="cursor:pointer"><div class="card-body">' +
        '<div class="row between"><strong style="font-size:14px">' + UI.esc(project.name) + "</strong>" + UI.statusBadge(project.status) + "</div>" +
        '<div style="color:#8b9aab;font-size:11.5px;margin-top:6px">' + UI.esc(project.category) + " · " + UI.esc(project.ownerName) + "</div>" +
        '<p style="color:#a7b7c8;font-size:12px;margin:10px 0 0;min-height:36px">' + UI.esc(project.description || "未填写项目描述") + "</p>" +
        '<div class="row between" style="margin-top:12px;color:#8b9aab;font-size:11.5px"><span>资产 ' + project.assetCount + " 件 · 待审 " + project.pendingCount +
        '</span><span class="badge ' + (project.visibility === "team" ? "teal" : "gray") + '">' + (project.visibility === "team" ? "团队可见" : "仅自己") + "</span></div>" +
        "</div></div>";
    }).join("");
    container.innerHTML = UI.pageHead("项目管理", "项目用于组织生成任务、资产与审核记录", actions) +
      (cards ? '<div class="grid grid-3">' + cards + "</div>" : '<div class="card"><div class="card-body">' + UI.empty("暂无项目", App.user.role === "VIEWER" ? "等待设计师分享项目" : "点击新建项目开始") + "</div></div>");
    container.querySelectorAll("[data-project]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/projects/" + node.getAttribute("data-project"); });
    });
    const add = container.querySelector("#project-add");
    if (add) add.addEventListener("click", function () { ProjectsView.form(data.categories); });
  },
  form: function (categories, project, onSaved) {
    const isEdit = !!project;
    UI.modal({
      title: isEdit ? "编辑项目" : "新建项目",
      body: '<form id="project-form"><div class="form-grid">' +
        '<div class="field span-2"><label>项目名称<span class="req">*</span></label><input class="input" name="name" maxlength="40" value="' + UI.esc(project ? project.name : "") + '" placeholder="例如：中秋礼盒视觉原型"></div>' +
        '<div class="field"><label>项目类别<span class="req">*</span></label><select class="select" name="category">' + UI.optionList(categories, project ? project.category : "") + "</select></div>" +
        '<div class="field"><label>可见性</label><select class="select" name="visibility"><option value="private"' + (project && project.visibility === "private" ? " selected" : "") + ">仅自己</option><option value=\"team\"" + (project && project.visibility === "team" ? " selected" : "") + ">团队可见</option></select></div>" +
        '<div class="field span-2"><label>项目描述</label><textarea class="textarea" name="description" maxlength="200" placeholder="设计目标、受众或风格要求">' + UI.esc(project ? project.description : "") + "</textarea></div>" +
        "</div></form>",
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#project-form");
          try {
            const data = UI.formData(form);
            if (isEdit) await API.put("/api/projects/" + project.id, data);
            else await API.post("/api/projects", data);
            api.close();
            UI.toast("项目已保存", "success");
            if (onSaved) onSaved();
            else ProjectsView.render(document.getElementById("view"));
          } catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("projects", ProjectsView);
