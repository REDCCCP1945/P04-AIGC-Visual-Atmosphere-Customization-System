const LoginView = {
  render: function (container, message) {
    container.innerHTML = '<div class="login-wrap"><div class="login-hero">' +
      '<div><div class="eyebrow">SHAANXI UNIVERSITY OF TECHNOLOGY</div>' +
      '<h1>文创视觉氛围<br>生成与风格定制</h1>' +
      '<p>输入情绪与提示词，选择风格与参数，在本地生成可下载、可复现的视觉图与配色板。参数、种子与生成记录全部留痕。</p></div>' +
      '<div class="hero-foot"><span>陕西理工大学</span><span>软件版本 V1.0</span><span>本地生成 · 数据不出本机</span></div></div>' +
      '<div class="login-form"><h2>登录工作台</h2><div class="sub">请使用分配的账号进入对应角色空间</div><div id="login-error"></div>' +
      '<form id="login-form"><div class="field"><label>用户名</label><input class="input" name="username" autocomplete="username" placeholder="请输入用户名"></div>' +
      '<div class="field"><label>密码</label><input class="input" name="password" type="password" autocomplete="current-password" placeholder="请输入密码"></div>' +
      '<button class="btn primary" type="submit">登录</button></form>' +
      '<div class="login-note">连续5次密码错误将锁定10分钟。首次登录后请在个人中心修改初始密码。</div>' +
      '<div class="account-hints"><strong>初始账号</strong>' +
      '<button type="button" data-user="admin01" data-pass="Admin@2026"><span>系统管理员 admin01</span><span>Admin@2026</span></button>' +
      '<button type="button" data-user="designer01" data-pass="Designer@2026"><span>专业设计师 designer01</span><span>Designer@2026</span></button>' +
      '<button type="button" data-user="operator01" data-pass="Operator@2026"><span>营销运营 operator01</span><span>Operator@2026</span></button>' +
      '<button type="button" data-user="viewer01" data-pass="Viewer@2026"><span>浏览者/客户 viewer01</span><span>Viewer@2026</span></button></div>' +
      '</div></div>';
    const form = container.querySelector("#login-form");
    const errorBox = container.querySelector("#login-error");
    if (message) errorBox.innerHTML = '<div class="login-error">' + UI.esc(message) + "</div>";
    container.querySelectorAll(".account-hints button").forEach(function (button) {
      button.addEventListener("click", function () {
        form.username.value = button.getAttribute("data-user");
        form.password.value = button.getAttribute("data-pass");
      });
    });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      errorBox.innerHTML = "";
      const button = form.querySelector("button[type=submit]");
      button.disabled = true;
      button.textContent = "正在登录";
      try {
        const result = await API.post("/api/auth/login", { username: form.username.value.trim(), password: form.password.value });
        App.afterLogin(result);
      } catch (error) {
        errorBox.innerHTML = '<div class="login-error">' + UI.esc(error.message) + "</div>";
        button.disabled = false;
        button.textContent = "登录";
      }
    });
  }
};
