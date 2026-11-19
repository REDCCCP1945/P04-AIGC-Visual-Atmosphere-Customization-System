const SettingsView = {
  render: async function (container) {
    const result = await API.get("/api/settings");
    const settings = result.data.settings;
    const roleMenus = result.data.roleMenus;
    const labels = { dashboard: "工作台", projects: "项目管理", color: "色彩情绪", style: "风格生成", scene: "氛围场景", tasks: "生成任务", assets: "资产库", reviews: "审核与分享", users: "用户管理", styles: "风格预设", words: "敏感词", audit: "审计日志", settings: "系统设置", feedback: "反馈", help: "帮助", profile: "个人中心" };
    container.innerHTML = UI.pageHead("系统设置", "默认生成参数、合规说明、角色菜单与数据备份", '<button class="btn" id="backup">导出数据备份</button>') +
      '<div class="grid grid-main"><div class="card"><div class="card-body"><form id="settings-form">' +
      '<h3 style="font-size:14px;margin-bottom:12px">默认生成参数</h3>' +
      '<div class="form-grid-3">' +
      '<div class="field"><label>复杂层数</label><input class="input" name="complexity" type="number" min="1" max="10" value="' + settings.complexity + '"></div>' +
      '<div class="field"><label>疏密</label><input class="input" name="density" type="number" min="1" max="10" value="' + settings.density + '"></div>' +
      '<div class="field"><label>颗粒</label><input class="input" name="grain" type="number" min="0" max="100" value="' + settings.grain + '"></div>' +
      '<div class="field"><label>光晕</label><input class="input" name="glow" type="number" min="0" max="100" value="' + settings.glow + '"></div>' +
      '<div class="field"><label>参考图不透明度</label><input class="input" name="referenceOpacity" type="number" min="0" max="100" value="' + settings.referenceOpacity + '"></div>' +
      '<div class="field"><label>阴影强度</label><input class="input" name="shadow" type="number" min="0" max="100" value="' + settings.shadow + '"></div>' +
      '<div class="field"><label>倒影强度</label><input class="input" name="reflection" type="number" min="0" max="100" value="' + settings.reflection + '"></div>' +
      '<div class="field"><label>光向</label><select class="select" name="light"><option value="left"' + (settings.light === "left" ? " selected" : "") + ">左侧光</option><option value=\"right\"" + (settings.light === "right" ? " selected" : "") + ">右侧光</option><option value=\"top\"" + (settings.light === "top" ? " selected" : "") + ">顶光</option></select></div>" +
      '<div class="field"><label>默认尺寸</label><input class="input" name="size" type="number" value="' + settings.width + '" disabled></div>' +
      "</div><h3 style=\"font-size:14px;margin:20px 0 12px\">合规模块说明</h3>" +
      '<div class="field"><label>AI生成标识说明</label><textarea class="textarea" name="aiNotice">' + UI.esc(settings.aiNotice) + "</textarea></div>" +
      '<div class="field" style="margin-top:12px"><label>数据存储说明</label><textarea class="textarea" name="dataPolicy">' + UI.esc(settings.dataPolicy) + "</textarea></div>" +
      '<div class="form-actions"><button class="btn primary" type="submit">保存设置</button></div></form></div></div>' +
      '<div class="stack"><div class="card"><div class="card-head"><h3>角色菜单</h3><span class="hint">管理员固定全部</span></div><div class="card-body" id="role-menus"></div></div>' +
      '<div class="card"><div class="card-head"><h3>版本与部署</h3></div><div class="card-body"><table class="kv-table"><tbody>' +
      '<tr><td>软件全称</td><td>' + UI.esc(settings.softwareName) + "</td></tr>" +
      '<tr><td>版本</td><td>' + UI.esc(settings.softwareVersion) + "</td></tr>" +
      '<tr><td>著作权人</td><td>陕西理工大学</td></tr><tr><td>经办人</td><td>李果</td></tr>' +
      '<tr><td>部署</td><td>本地单机127.0.0.1:4104</td></tr><tr><td>存储</td><td>data/db.json与uploads</td></tr>' +
      "</tbody></table></div></div></div></div>";
    const roles = ["DESIGNER", "OPERATOR", "VIEWER"];
    const keys = Object.keys(labels);
    container.querySelector("#role-menus").innerHTML = roles.map(function (role) {
      return '<div style="margin-bottom:12px"><div style="font-size:12.5px;margin-bottom:6px">' + UI.roleName(role) + '</div><div class="checks" data-role="' + role + '">' +
        keys.map(function (key) {
          const checked = role === "ADMIN" || (roleMenus[role] || []).indexOf(key) >= 0;
          return '<label class="check"><input type="checkbox" value="' + key + '"' + (checked ? " checked" : "") + ">" + labels[key] + "</label>";
        }).join("") + "</div></div>";
    }).join("") + '<div class="row end"><button class="btn primary" id="role-save">保存角色菜单</button></div>';
    container.querySelector("#role-save").addEventListener("click", async function () {
      try {
        for (const role of roles) {
          const menus = Array.prototype.map.call(container.querySelectorAll('[data-role="' + role + '"] input:checked'), function (input) { return input.value; });
          await API.post("/api/settings/roles", { role: role, menus: menus });
        }
        UI.toast("角色菜单已保存，相关用户重新登录后生效", "success");
      } catch (error) { UI.toast(error.message, "error"); }
    });
    const form = container.querySelector("#settings-form");
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const data = UI.formData(form);
      data.width = Number(settings.width);
      data.height = Number(settings.height);
      try {
        await API.post("/api/settings", data);
        UI.toast("设置已保存", "success");
      } catch (error) { UI.showError(form, error); }
    });
    container.querySelector("#backup").addEventListener("click", function () { API.download("/api/users/backup"); });
  }
};
App.register("settings", SettingsView);
