const UsersView = {
  render: async function (container) {
    container.innerHTML = UI.pageHead("用户管理", "账号由系统管理员统一分配，角色决定菜单与接口权限", '<button class="btn primary" id="user-add">新增用户</button>') +
      '<div class="card"><div class="card-body"><div class="filters"><div class="field grow"><label>用户名或姓名</label><input class="input" id="u-keyword" placeholder="输入关键词"></div>' +
      '<div class="field"><label>角色</label><select class="select" id="u-role"><option value="">全部角色</option><option value="ADMIN">系统管理员</option><option value="DESIGNER">专业设计师</option><option value="OPERATOR">营销运营</option><option value="VIEWER">浏览者/客户</option></select></div>' +
      '<button class="btn primary" id="u-search">查询</button></div><div id="user-list" style="margin-top:12px"></div></div></div>';
    const list = container.querySelector("#user-list");
    async function load() {
      const result = await API.get("/api/users?keyword=" + encodeURIComponent(container.querySelector("#u-keyword").value.trim()) + "&role=" + container.querySelector("#u-role").value);
      const rows = result.data.rows;
      list.innerHTML = UI.table({
        columns: [
          { title: "用户名", key: "username", render: function (row) { return '<span class="mono">' + UI.esc(row.username) + "</span>"; } },
          { title: "姓名", key: "name" },
          { title: "角色", key: "roleName", width: "130px" },
          { title: "状态", width: "76px", render: function (row) { return UI.statusBadge(row.status); } },
          { title: "最近登录", width: "160px", render: function (row) { return row.lastLoginAt ? UI.fmtDateTime(row.lastLoginAt) : "未登录"; } },
          { title: "操作", width: "240px", render: function (row) {
            return '<button class="btn sm" data-role="' + row.id + '">变更角色</button> <button class="btn sm" data-reset="' + row.id + '">重置密码</button> ' +
              (row.username === "admin01" ? '<span class="badge gray">内置账号</span>' : '<button class="btn sm ' + (row.status === "active" ? "danger" : "") + '" data-toggle="' + row.id + '">' + (row.status === "active" ? "停用" : "启用") + "</button>");
          } }
        ],
        rows: rows,
        empty: "暂无用户"
      });
      list.querySelectorAll("[data-toggle]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try { await API.post("/api/users/" + button.getAttribute("data-toggle") + "/toggle", {}); UI.toast("状态已更新", "success"); load(); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
      list.querySelectorAll("[data-role]").forEach(function (button) {
        button.addEventListener("click", function () {
          const row = rows.find(function (item) { return item.id === button.getAttribute("data-role"); });
          UsersView.roleModal(row, load);
        });
      });
      list.querySelectorAll("[data-reset]").forEach(function (button) {
        button.addEventListener("click", function () { UsersView.resetModal(button.getAttribute("data-reset"), load); });
      });
    }
    container.querySelector("#u-search").addEventListener("click", load);
    container.querySelector("#user-add").addEventListener("click", function () { UsersView.addModal(load); });
    await load();
  },
  addModal: function (onSaved) {
    UI.modal({
      title: "新增用户",
      body: '<form id="user-form"><div class="form-grid">' +
        '<div class="field"><label>用户名<span class="req">*</span></label><input class="input" name="username" placeholder="4到20位字母数字"></div>' +
        '<div class="field"><label>姓名<span class="req">*</span></label><input class="input" name="name"></div>' +
        '<div class="field"><label>角色<span class="req">*</span></label><select class="select" name="role"><option value="DESIGNER">专业设计师</option><option value="OPERATOR">营销运营</option><option value="VIEWER">浏览者/客户</option><option value="ADMIN">系统管理员</option></select></div>' +
        '<div class="field"><label>初始密码<span class="req">*</span></label><input class="input" name="password" type="password" placeholder="至少8位，含大小写与数字"></div>' +
        "</div></form>",
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "创建", className: "primary", onClick: async function (api) {
          const form = api.find("#user-form");
          try { await API.post("/api/users", UI.formData(form)); api.close(); UI.toast("用户已创建", "success"); onSaved(); }
          catch (error) { UI.showError(form, error); }
        } }
      ]
    });
  },
  roleModal: function (row, onSaved) {
    UI.modal({
      title: "变更角色 " + row.username,
      size: "narrow",
      body: '<div class="field"><label>新角色</label><select class="select" id="role-select">' +
        '<option value="ADMIN"' + (row.role === "ADMIN" ? " selected" : "") + '>系统管理员</option>' +
        '<option value="DESIGNER"' + (row.role === "DESIGNER" ? " selected" : "") + '>专业设计师</option>' +
        '<option value="OPERATOR"' + (row.role === "OPERATOR" ? " selected" : "") + '>营销运营</option>' +
        '<option value="VIEWER"' + (row.role === "VIEWER" ? " selected" : "") + ">浏览者/客户</option></select></div>" +
        '<div class="alert warn" style="margin-top:12px">变更后该用户需要重新登录。</div>',
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "保存", className: "primary", onClick: async function (api) {
          try { await API.post("/api/users/" + row.id + "/role", { role: api.find("#role-select").value }); api.close(); UI.toast("角色已更新", "success"); onSaved(); }
          catch (error) { UI.toast(error.message, "error"); }
        } }
      ]
    });
  },
  resetModal: function (id, onSaved) {
    UI.modal({
      title: "重置密码",
      size: "narrow",
      body: '<div class="field"><label>新密码</label><input class="input" id="reset-password" type="password" placeholder="至少8位，含大小写与数字"></div>',
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "重置", className: "primary", onClick: async function (api) {
          try { await API.post("/api/users/" + id + "/reset", { password: api.find("#reset-password").value }); api.close(); UI.toast("密码已重置", "success"); onSaved(); }
          catch (error) { UI.toast(error.message, "error"); }
        } }
      ]
    });
  }
};
App.register("users", UsersView);
