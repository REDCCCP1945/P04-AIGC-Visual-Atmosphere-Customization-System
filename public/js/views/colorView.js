const ColorView = {
  palette: null,
  render: async function (container) {
    const projects = (await API.get("/api/projects")).data.rows.filter(function (project) { return project.ownerId === App.user.id || App.user.role === "ADMIN"; });
    container.innerHTML = UI.pageHead("色彩情绪解析", "把自然语言情绪映射为可解释的5色配色板，支持四种调和规则", "") +
      '<div class="grid grid-main"><div class="card"><div class="card-body">' +
      '<div class="field"><label>情绪与场景描述<span class="req">*</span></label><textarea class="textarea" id="color-text" placeholder="例如：秋日午后的慵懒与温暖，阳光洒在木质桌面">秋日午后的慵懒与温暖，阳光洒在木质桌面</textarea></div>' +
      '<div class="form-grid" style="margin-top:12px"><div class="field"><label>调和规则</label><select class="select" id="color-harmony"><option value="analogous">相邻色</option><option value="complementary">互补色</option><option value="triadic">三角色</option><option value="monochromatic">单色</option></select></div>' +
      '<div class="field"><label>保存到项目</label><select class="select" id="color-project">' + UI.optionList(projects.map(function (project) { return { value: project.id, label: project.name }; })) + "</select></div></div>" +
      '<div class="row" style="margin-top:14px"><button class="btn primary" id="color-run">解析并生成色板</button><span class="field-hint">规则与色值公开，结果可复算</span></div>' +
      '<div id="color-result" style="margin-top:16px">' + UI.empty("尚未生成", "输入描述后点击解析") + "</div>" +
      "</div></div>" +
      '<div class="stack"><div class="card"><div class="card-head"><h3>映射规则</h3></div><div class="card-body">' +
      '<table class="kv-table"><tbody><tr><td>情绪基色</td><td>8种基本情绪与6种扩展概念，各对应一组HSL</td></tr>' +
      '<tr><td>相邻色</td><td>基色±30°与±60°，明度微调</td></tr><tr><td>互补色</td><td>基色与180°互补色</td></tr>' +
      '<tr><td>三角色</td><td>基色与±120°</td></tr><tr><td>单色</td><td>同色相五级明度</td></tr>' +
      '<tr><td>占比</td><td>深色10%、辅助20%、主色40%、高光10%、背景20%</td></tr></tbody></table>' +
      '<div class="alert info" style="margin-top:12px">本模块使用规则与色彩心理学映射，不调用外部模型；关键词命中与基色可对照源码lib/color.js。</div>' +
      "</div></div></div></div>";
    container.querySelector("#color-run").addEventListener("click", async function () {
      const text = container.querySelector("#color-text").value.trim();
      if (text.length < 2) { UI.toast("请输入至少2个字符的描述", "warn"); return; }
      try {
        const result = await API.post("/api/color/analyze", { text: text, harmony: container.querySelector("#color-harmony").value });
        ColorView.palette = result.data.palette;
        ColorView.renderResult(container, result.data.palette, projects);
      } catch (error) { UI.toast(error.message, "error"); }
    });
    container.querySelector("#color-harmony").addEventListener("change", function () {
      if (ColorView.palette) container.querySelector("#color-run").click();
    });
  },
  renderResult: function (container, palette, projects) {
    const target = container.querySelector("#color-result");
    const colors = palette.colors;
    target.innerHTML = '<div class="row between" style="margin-bottom:10px"><div><strong style="font-size:15px">' + UI.esc(palette.emotionName) +
      "</strong> <span class=\"badge teal\">" + UI.esc(palette.harmonyName) + "</span></div><span style=\"color:#8b9aab;font-size:11.5px\">关键词：" + UI.esc(palette.keywords.join("、") || "无直接关键词") + "</span></div>" +
      '<div class="swatches">' + colors.map(function (color) {
        return '<div class="swatch"><div class="color" style="background:' + color.hex + '"></div><div class="info"><strong>' + color.role + "</strong>" + color.hex +
          "<br>RGB " + color.rgb.join(",") + "<br>CMYK " + color.cmyk.join(",") + "<br>占比 " + color.proportion + "%</div></div>";
      }).join("") + "</div>" +
      '<div class="proportion-bar">' + colors.map(function (color) {
        return '<span style="width:' + color.proportion + "%;background:" + color.hex + '" title="' + color.proportion + '%"></span>';
      }).join("") + "</div>" +
      '<div class="row end"><button class="btn" id="color-css">导出CSS</button><button class="btn" id="color-json">导出JSON</button><button class="btn teal" id="color-save">保存到项目</button></div>';
    target.querySelector("#color-css").addEventListener("click", function () { ColorView.export("css"); });
    target.querySelector("#color-json").addEventListener("click", function () { ColorView.export("json"); });
    target.querySelector("#color-save").addEventListener("click", async function () {
      const projectId = container.querySelector("#color-project").value;
      if (!projectId) { UI.toast("请选择项目", "warn"); return; }
      try {
        await API.post("/api/color/save", { projectId: projectId, palette: palette, title: palette.emotionName + "配色板" });
        UI.toast("色板已保存为资产", "success");
      } catch (error) { UI.toast(error.message, "error"); }
    });
  },
  export: async function (format) {
    if (!ColorView.palette) return;
    try {
      const result = await API.post("/api/color/export", { palette: ColorView.palette, format: format, name: ColorView.palette.emotion });
      UI.downloadText(result.data.filename, result.data.content, result.data.type);
      UI.toast("已导出" + format.toUpperCase(), "success");
    } catch (error) { UI.toast(error.message, "error"); }
  }
};
App.register("color", ColorView);
