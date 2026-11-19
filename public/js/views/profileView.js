const ProfileView = {
  render: async function (container) {
    const result = await API.get("/api/profile");
    const user = result.data.user;
    container.innerHTML = UI.pageHead("个人中心", "维护显示名称、邮箱与登录密码", "") +
      '<div class="grid grid-2"><div class="card"><div class="card-head"><h3>基本资料</h3><span class="hint">' + UI.esc(user.username) + " · " + UI.roleName(user.role) + "</span></div><div class=\"card-body\"><form id=\"profile-form\">" +
      '<div class="field"><label>姓名</label><input class="input" name="name" value="' + UI.esc(user.name) + '"></div>' +
      '<div class="field" style="margin-top:12px"><label>邮箱</label><input class="input" name="email" value="' + UI.esc(user.email || "") + '"></div>' +
      '<div class="form-actions"><button class="btn primary" type="submit">保存资料</button></div></form></div></div>' +
      '<div class="card"><div class="card-head"><h3>修改密码</h3><span class="hint">修改后需要重新登录</span></div><div class="card-body"><form id="password-form">' +
      '<div class="field"><label>原密码</label><input class="input" name="oldPassword" type="password"></div>' +
      '<div class="field" style="margin-top:12px"><label>新密码</label><input class="input" name="newPassword" type="password" placeholder="至少8位，含大小写与数字"></div>' +
      '<div class="field" style="margin-top:12px"><label>确认新密码</label><input class="input" name="confirm" type="password"></div>' +
      '<div class="form-actions"><button class="btn primary" type="submit">修改密码</button></div></form></div></div></div>';
    const profileForm = container.querySelector("#profile-form");
    profileForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      try {
        await API.post("/api/profile", UI.formData(profileForm));
        UI.toast("资料已保存", "success");
        App.user.name = profileForm.name.value.trim();
        App.renderUser();
      } catch (error) { UI.showError(profileForm, error); }
    });
    const passwordForm = container.querySelector("#password-form");
    passwordForm.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (passwordForm.newPassword.value !== passwordForm.confirm.value) { UI.toast("两次输入的新密码不一致", "warn"); return; }
      try {
        await API.post("/api/auth/password", { oldPassword: passwordForm.oldPassword.value, newPassword: passwordForm.newPassword.value });
        UI.toast("密码已修改，请重新登录", "success");
        setTimeout(function () { API.setToken(""); App.showLogin("密码已修改，请使用新密码登录"); }, 900);
      } catch (error) { UI.showError(passwordForm, error); }
    });
  }
};
App.register("profile", ProfileView);
