const StylesAdminView = {
  render: async function (container) {
    const result = await API.get("/api/styles");
    const rows = result.data.rows;
    container.innerHTML = UI.pageHead("风格预设", "五种生成风格对应不同的几何与配色规则；停用后不能用于新任务", '<button class="btn primary" id="style-add">新增风格</button>') +
      '<div class="card"><div class="card-body tight">' + UI.table({
        columns: [
          { title: "名称", key: "name" },
          { title: "编码", key: "code", width: "100px", render: function (row) { return '<span class="mono">' + UI.esc(row.code) + "</span>"; } },
          { title: "说明", key: "description", render: function (row) { return '<span class="wrap-text">' + UI.esc(row.description) + "</span>"; } },
          { title: "状态", width: "80px", render: function (row) { return UI.statusBadge(row.enabled ? "active" : "disabled"); } },
          { title: "操作", width: "190px", render: function (row) {
            return '<button class="btn sm" data-edit="' + row.id + '">编辑</button> <button class="btn sm" data-toggle="' + row.id + '">' + (row.enabled ? "停用" : "启用") + '</button> <button class="btn sm danger" data-remove="' + row.id + '">删除</button>';
          } }
        ],
        rows: rows,
        empty: "暂无风格"
      }) + "</div></div>";
    const load = function () { StylesAdminView.render(container); };
    container.querySelector("#style-add").addEventListener("click", function () { StylesAdminView.form(null, load); });
    container.querySelectorAll("[data-edit]").forEach(function (button) {
      button.addEventListener("click", function () {
        StylesAdminView.form(rows.find(function (item) { return item.id === button.getAttribute("data-edit"); }), load);
      });
    });
    container.querySelectorAll("[data-toggle]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try { await API.post("/api/styles/" + button.getAttribute("data-toggle") + "/toggle", {}); UI.toast("状态已更新", "success"); load(); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
    container.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", async function () {
        const ok = await UI.confirm({ title: "删除风格", message: "被任务引用的风格不能删除，是否继续？", danger: true, okText: "删除" });
        if (!ok) return;
        try { await API.del("/api/styles/" + button.getAttribute("data-remove")); UI.toast("已删除", "success"); load(); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
  },
  form: function (row, onSaved) {
    UI.modal({
      title: row ? "编辑风格" : "新增风格",
      body: '<form id="style-form"><div class="form-grid">' +
        '<div class="field"><label>名称<span class="req">*</span></label><input class="input" name="name" value="' + UI.esc(row ? row.name : "") + '"></div>' +
        '<div class="field"><label>编码<span class="req">*</span></label><select class="select" name="code">' + UI.optionList([
          { value: "ink", label: "ink 水墨" }, { value: "cyber", label: "cyber 赛博" }, { value: "blindbox", label: "blindbox 盲盒" },
          { value: "minimal", label: "minimal 极简" }, { value: "retro", label: "retro 复古" }
        ], row ? row.code : "ink") + "</select></div>" +
        '<div class="field span-2"><label>说明</label><textarea class="textarea" name="description">' + UI.esc(row ? row.description : "") + "</textarea></div>" +
        "</div></form>",
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "保存", className: "primary", onClick: async function (api) {
          const form = api.find("#style-form");
          const data = UI.formData(form);
          if (row) data.id = row.id;
          try { await API.post("/api/styles", data); api.close(); UI.toast("已保存", "success"); onSaved(); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  }
};
App.register("styles", StylesAdminView);
