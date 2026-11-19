const SceneView = {
  palette: null,
  reference: "",
  render: async function (container) {
    const meta = (await API.get("/api/meta")).data;
    const projects = (await API.get("/api/projects")).data.rows.filter(function (project) {
      return project.ownerId === App.user.id || App.user.role === "ADMIN";
    });
    if (!projects.length) {
      container.innerHTML = UI.pageHead("氛围场景生成", "需要先创建项目", '<button class="btn primary" data-route="projects">新建项目</button>');
      container.querySelector("[data-route]").addEventListener("click", function () { location.hash = "#/projects"; });
      return;
    }
    const defaults = meta.defaults;
    container.innerHTML = UI.pageHead("氛围场景生成", "将商品主体放入生成的背景，并计算阴影与倒影", "") +
      '<div class="grid grid-main"><div class="card"><div class="card-body"><form id="scene-form">' +
      '<div class="form-grid">' +
      '<div class="field"><label>项目<span class="req">*</span></label><select class="select" name="projectId">' + UI.optionList(projects.map(function (project) { return { value: project.id, label: project.name }; })) + "</select></div>" +
      '<div class="field"><label>标题<span class="req">*</span></label><input class="input" name="title" maxlength="40" value="电商商品氛围图"></div>' +
      '<div class="field span-2"><label>场景提示词<span class="req">*</span></label><textarea class="textarea" id="scene-prompt" name="prompt">春季香氛瓶，清晨森林，丁达尔光，苔藓石面</textarea></div>' +
      '<div class="field"><label>场景预设</label><select class="select" id="scene-preset"><option value="studio">影棚灰</option><option value="forest">森林晨光</option><option value="festival">节庆暖光</option><option value="ink">水墨纸面</option><option value="cyber">赛博暗场</option></select></div>' +
      '<div class="field"><label>主体类型</label><select class="select" id="scene-product"><option value="bottle">瓶装</option><option value="box">盒装</option><option value="figure">公仔</option><option value="bag">袋装</option></select></div>' +
      '<div class="field"><label>光向</label><select class="select" id="scene-light"><option value="left">左侧光</option><option value="right">右侧光</option><option value="top">顶光</option></select></div>' +
      '<div class="field"><label>随机种子</label><div class="row"><input class="input" id="scene-seed" type="number" min="0" max="999999" value="202612" style="flex:1"><button class="btn" type="button" id="scene-random">随机</button></div></div>' +
      "</div>" +
      '<div style="margin-top:16px"><div class="row between"><label style="color:#b7c4d3;font-size:12px">色板</label><button class="btn sm" type="button" id="scene-palette-gen">根据提示词生成色板</button></div><div id="scene-palette" style="margin-top:8px"><span class="field-hint">色板同时用于背景与主体着色</span></div></div>' +
      '<div style="margin-top:16px"><label style="color:#b7c4d3;font-size:12px">光影参数</label>' +
      StyleView.slider("density", "主体比例", defaults.density, 1, 10) +
      StyleView.slider("shadow", "阴影强度", defaults.shadow, 0, 100) +
      StyleView.slider("reflection", "倒影强度", defaults.reflection, 0, 100) +
      StyleView.slider("grain", "颗粒", defaults.grain, 0, 100) +
      StyleView.slider("glow", "高光", defaults.glow, 0, 100) +
      StyleView.slider("referenceOpacity", "参考图不透明度", defaults.referenceOpacity, 0, 100) +
      "</div>" +
      '<div style="margin-top:14px"><label style="color:#b7c4d3;font-size:12px">商品图（可选）</label><div class="upload-zone" id="scene-upload"><strong>点击或拖拽上传商品图</strong><span>PNG/JPG，不超过2MB；未上传时使用几何主体</span><input type="file" id="scene-file" accept="image/png,image/jpeg,image/webp" style="display:none"></div><div id="scene-ref-preview"></div></div>' +
      '<div class="form-actions"><button class="btn" type="button" data-route="projects">取消</button><button class="btn primary" type="submit">提交生成</button></div>' +
      "</form></div></div>" +
      '<div class="stack"><div class="card"><div class="card-head"><h3>场景规则</h3></div><div class="card-body"><table class="kv-table"><tbody>' +
      '<tr><td>背景</td><td>影棚/森林/节庆/水墨/赛博五类程序化背景</td></tr>' +
      '<tr><td>主体</td><td>瓶、盒、公仔、袋或上传商品图</td></tr>' +
      '<tr><td>阴影</td><td>随光向改变横向偏移，随强度改变透明度</td></tr>' +
      '<tr><td>倒影</td><td>主体镜像并降低透明度</td></tr>' +
      '<tr><td>标识</td><td>右下角固定AI生成标识</td></tr></tbody></table>' +
      '<div class="alert info" style="margin-top:12px">场景图为程序化合成，不使用三维渲染或神经生成；商品图仅在本机嵌入SVG，不上传外部服务。</div>' +
      "</div></div></div></div>";
    SceneView.palette = null;
    SceneView.reference = "";
    const form = container.querySelector("#scene-form");
    StyleView.bindSliders(container);
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    container.querySelector("#scene-random").addEventListener("click", function () {
      container.querySelector("#scene-seed").value = Math.floor(Math.random() * 900000) + 1000;
    });
    container.querySelector("#scene-palette-gen").addEventListener("click", async function () {
      const prompt = container.querySelector("#scene-prompt").value.trim();
      if (prompt.length < 2) { UI.toast("请先输入提示词", "warn"); return; }
      try {
        const result = await API.post("/api/color/analyze", { text: prompt, harmony: "triadic" });
        SceneView.palette = result.data.palette;
        container.querySelector("#scene-palette").innerHTML = '<div class="row between"><span class="badge teal">' + UI.esc(SceneView.palette.emotionName) + " · " + UI.esc(SceneView.palette.harmonyName) + '</span><span class="field-hint">' + SceneView.palette.colors.map(function (color) { return color.hex; }).join(" ") + "</span></div>" +
          '<div class="proportion-bar" style="margin-top:8px">' + SceneView.palette.colors.map(function (color) {
            return '<span style="width:' + color.proportion + "%;background:" + color.hex + '"></span>';
          }).join("") + "</div>";
      } catch (error) { UI.toast(error.message, "error"); }
    });
    const fileInput = container.querySelector("#scene-file");
    const zone = container.querySelector("#scene-upload");
    zone.addEventListener("click", function () { fileInput.click(); });
    zone.addEventListener("dragover", function (event) { event.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", function () { zone.classList.remove("dragover"); });
    zone.addEventListener("drop", function (event) {
      event.preventDefault();
      zone.classList.remove("dragover");
      if (event.dataTransfer.files.length) {
        fileInput.files = event.dataTransfer.files;
        SceneView.pickReference(fileInput, container);
      }
    });
    fileInput.addEventListener("change", function () { SceneView.pickReference(fileInput, container); });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const prompt = container.querySelector("#scene-prompt").value.trim();
      if (prompt.length < 2) { UI.toast("请输入场景提示词", "warn"); return; }
      if (!SceneView.palette) {
        const result = await API.post("/api/color/analyze", { text: prompt, harmony: "triadic" });
        SceneView.palette = result.data.palette;
      }
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      submit.textContent = "正在提交";
      try {
        const task = await API.post("/api/tasks", {
          projectId: form.projectId.value,
          type: "scene",
          title: form.title.value.trim(),
          prompt: prompt,
          scene: container.querySelector("#scene-preset").value,
          product: container.querySelector("#scene-product").value,
          palette: SceneView.palette.colors.map(function (color) { return color.hex; }),
          reference: SceneView.reference,
          seed: Number(container.querySelector("#scene-seed").value),
          params: Object.assign(StyleView.params(container), { light: container.querySelector("#scene-light").value })
        });
        UI.toast(task.data.blocked ? "提示词未通过敏感词检查" : "任务已提交", task.data.blocked ? "error" : "success");
        location.hash = "#/tasks/" + task.data.task.id;
      } catch (error) {
        UI.showError(form, error);
        submit.disabled = false;
        submit.textContent = "提交生成";
      }
    });
  },
  pickReference: function (input, container) {
    if (!input.files.length) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) { UI.toast("商品图不能超过2MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = function () {
      SceneView.reference = String(reader.result || "");
      container.querySelector("#scene-ref-preview").innerHTML = '<div class="upload-preview"><img src="' + SceneView.reference + '"><span class="field-hint">' + UI.esc(file.name) + "</span></div>";
    };
    reader.readAsDataURL(file);
  }
};
App.register("scene", SceneView);
