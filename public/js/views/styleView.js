const StyleView = {
  palette: null,
  reference: "",
  render: async function (container) {
    const meta = (await API.get("/api/meta")).data;
    const projects = (await API.get("/api/projects")).data.rows.filter(function (project) {
      return project.ownerId === App.user.id || App.user.role === "ADMIN";
    });
    if (!projects.length) {
      container.innerHTML = UI.pageHead("风格化生成", "需要先创建项目", '<button class="btn primary" data-route="projects">新建项目</button>');
      container.querySelector("[data-route]").addEventListener("click", function () { location.hash = "#/projects"; });
      return;
    }
    const selectedProject = sessionStorage.getItem("p04_project") || projects[0].id;
    const defaults = meta.defaults;
    container.innerHTML = UI.pageHead("风格化生成", "提示词、色板、风格与参数共同决定输出；同种子同参数可复现", "") +
      '<div class="grid grid-main"><div class="card"><div class="card-body"><form id="style-form">' +
      '<div class="form-grid">' +
      '<div class="field"><label>项目<span class="req">*</span></label><select class="select" name="projectId">' + UI.optionList(projects.map(function (project) { return { value: project.id, label: project.name }; }), selectedProject) + "</select></div>" +
      '<div class="field"><label>标题<span class="req">*</span></label><input class="input" name="title" maxlength="40" value="风格化视觉原型"></div>' +
      '<div class="field span-2"><label>提示词<span class="req">*</span></label><textarea class="textarea" id="style-prompt" name="prompt" placeholder="主体描述 + 环境背景 + 光影材质 + 风格修饰">中秋礼盒，水墨山水，月色与桂花，留白构图</textarea></div>' +
      '<div class="field"><label>风格预设<span class="req">*</span></label><select class="select" id="style-style">' + UI.optionList(meta.styles.map(function (style) { return { value: style.code, label: style.name }; })) + "</select></div>" +
      '<div class="field"><label>随机种子</label><div class="row"><input class="input" id="style-seed" type="number" min="0" max="999999" value="202611" style="flex:1"><button class="btn" type="button" id="seed-random">随机</button></div><span class="field-hint">-1表示随机；固定种子可复现</span></div>' +
      "</div>" +
      '<div style="margin-top:16px"><div class="row between"><label style="color:#b7c4d3;font-size:12px">色板</label><button class="btn sm" type="button" id="palette-gen">根据提示词生成色板</button></div>' +
      '<div id="style-palette" style="margin-top:8px"><span class="field-hint">生成或输入提示词后以色板参与合成</span></div></div>' +
      '<div style="margin-top:16px"><label style="color:#b7c4d3;font-size:12px">参数</label>' +
      StyleView.slider("complexity", "复杂层数", defaults.complexity, 1, 10) +
      StyleView.slider("density", "疏密", defaults.density, 1, 10) +
      StyleView.slider("grain", "颗粒", defaults.grain, 0, 100) +
      StyleView.slider("glow", "光晕", defaults.glow, 0, 100) +
      StyleView.slider("referenceOpacity", "参考图不透明度", defaults.referenceOpacity, 0, 100) +
      "</div>" +
      '<div style="margin-top:14px"><label style="color:#b7c4d3;font-size:12px">参考图（可选）</label><div class="upload-zone" id="style-upload"><strong>点击或拖拽上传结构参考图</strong><span>PNG/JPG，不超过2MB；作为底层图层参与合成</span><input type="file" id="style-file" accept="image/png,image/jpeg,image/webp" style="display:none"></div><div id="style-ref-preview"></div></div>' +
      '<div class="form-actions"><button class="btn" type="button" data-route="projects">取消</button><button class="btn primary" type="submit">提交生成</button></div>' +
      "</form></div></div>" +
      '<div class="stack"><div class="card"><div class="card-head"><h3>生成说明</h3></div><div class="card-body">' +
      '<table class="kv-table"><tbody><tr><td>合成方式</td><td>服务端参数化SVG图层合成</td></tr><tr><td>结构参考</td><td>参考图以设定不透明度嵌入底层</td></tr><tr><td>复现</td><td>固定种子与参数输出相同哈希</td></tr><tr><td>标识</td><td>右下角固定“AI生成 · V1.0”</td></tr><tr><td>导出</td><td>资产详情下载SVG或PNG</td></tr></tbody></table>' +
      '<div class="alert info" style="margin-top:12px">不同风格使用不同几何与配色规则：水墨为纸纹墨晕，赛博为暗底网格与霓虹，盲盒为圆角粉彩，极简为少量几何，复古为暖色半调。</div>' +
      "</div></div></div></div>";
    StyleView.palette = null;
    StyleView.reference = "";
    const form = container.querySelector("#style-form");
    StyleView.bindSliders(container);
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    container.querySelector("#seed-random").addEventListener("click", function () {
      container.querySelector("#style-seed").value = Math.floor(Math.random() * 900000) + 1000;
    });
    container.querySelector("#palette-gen").addEventListener("click", function () { StyleView.makePalette(container); });
    const fileInput = container.querySelector("#style-file");
    const zone = container.querySelector("#style-upload");
    zone.addEventListener("click", function () { fileInput.click(); });
    zone.addEventListener("dragover", function (event) { event.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", function () { zone.classList.remove("dragover"); });
    zone.addEventListener("drop", function (event) {
      event.preventDefault();
      zone.classList.remove("dragover");
      if (event.dataTransfer.files.length) {
        fileInput.files = event.dataTransfer.files;
        StyleView.pickReference(fileInput, container);
      }
    });
    fileInput.addEventListener("change", function () { StyleView.pickReference(fileInput, container); });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const prompt = container.querySelector("#style-prompt").value.trim();
      if (prompt.length < 2) { UI.toast("请输入提示词", "warn"); return; }
      if (!StyleView.palette) {
        await StyleView.makePalette(container);
        if (!StyleView.palette) return;
      }
      const submit = form.querySelector("button[type=submit]");
      submit.disabled = true;
      submit.textContent = "正在提交";
      try {
        const task = await API.post("/api/tasks", {
          projectId: form.projectId.value,
          type: "style",
          title: form.title.value.trim(),
          prompt: prompt,
          style: container.querySelector("#style-style").value,
          palette: StyleView.palette.colors.map(function (color) { return color.hex; }),
          reference: StyleView.reference,
          seed: Number(container.querySelector("#style-seed").value),
          params: StyleView.params(container)
        });
        sessionStorage.removeItem("p04_project");
        UI.toast(task.data.blocked ? "提示词未通过敏感词检查" : "任务已提交", task.data.blocked ? "error" : "success");
        location.hash = "#/tasks/" + task.data.task.id;
      } catch (error) {
        UI.showError(form, error);
        submit.disabled = false;
        submit.textContent = "提交生成";
      }
    });
  },
  slider: function (key, label, value, min, max) {
    return '<div class="slider-row"><label>' + label + '</label><input type="range" data-key="' + key + '" min="' + min + '" max="' + max + '" value="' + value + '"><span data-value="' + key + '">' + value + "</span></div>";
  },
  bindSliders: function (container) {
    container.querySelectorAll('input[type="range"][data-key]').forEach(function (input) {
      input.addEventListener("input", function () {
        container.querySelector('[data-value="' + input.getAttribute("data-key") + '"]').textContent = input.value;
      });
    });
  },
  params: function (container) {
    const params = { light: "left", width: 1024, height: 1024, complexity: 6, shadow: 55, reflection: 35 };
    container.querySelectorAll('input[type="range"][data-key]').forEach(function (input) {
      params[input.getAttribute("data-key")] = Number(input.value);
    });
    return params;
  },
  makePalette: async function (container) {
    const prompt = container.querySelector("#style-prompt").value.trim();
    if (prompt.length < 2) { UI.toast("请先输入提示词", "warn"); return; }
    try {
      const result = await API.post("/api/color/analyze", { text: prompt, harmony: "analogous" });
      StyleView.palette = result.data.palette;
      container.querySelector("#style-palette").innerHTML = '<div class="row between"><span class="badge teal">' + UI.esc(StyleView.palette.emotionName) + " · " + UI.esc(StyleView.palette.harmonyName) + '</span><span class="field-hint">' + StyleView.palette.colors.map(function (color) { return color.hex; }).join(" ") + "</span></div>" +
        '<div class="proportion-bar" style="margin-top:8px">' + StyleView.palette.colors.map(function (color) {
          return '<span style="width:' + color.proportion + "%;background:" + color.hex + '"></span>';
        }).join("") + "</div>";
      UI.toast("色板已生成", "success");
    } catch (error) { UI.toast(error.message, "error"); }
  },
  pickReference: function (input, container) {
    if (!input.files.length) return;
    const file = input.files[0];
    if (file.size > 2 * 1024 * 1024) { UI.toast("参考图不能超过2MB", "error"); return; }
    const reader = new FileReader();
    reader.onload = function () {
      StyleView.reference = String(reader.result || "");
      container.querySelector("#style-ref-preview").innerHTML = '<div class="upload-preview"><img src="' + StyleView.reference + '"><span class="field-hint">' + UI.esc(file.name) + "</span></div>";
    };
    reader.readAsDataURL(file);
  }
};
App.register("style", StyleView);
