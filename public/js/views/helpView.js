const HelpView = {
  sections: [["start", "快速开始"], ["roles", "角色与权限"], ["color", "色彩规则"], ["generator", "生成规则"], ["export", "资产与导出"], ["compliance", "合规说明"]],
  render: async function (container) {
    const meta = App.meta || (await API.get("/api/meta")).data;
    container.innerHTML = UI.pageHead("帮助与合规", "操作路径、色彩与生成规则、AI标识与数据说明", "") +
      '<div class="card"><div class="card-body"><div class="help-nav" id="help-nav">' + HelpView.sections.map(function (item, index) {
        return '<button type="button" class="' + (index === 0 ? "active" : "") + '" data-section="' + item[0] + '">' + item[1] + "</button>";
      }).join("") + '</div><div id="help-content" class="help-section" style="margin-top:18px"></div></div></div>';
    const content = container.querySelector("#help-content");
    function show(key) {
      content.innerHTML = HelpView.body(key, meta);
      container.querySelectorAll("#help-nav button").forEach(function (button) {
        button.classList.toggle("active", button.getAttribute("data-section") === key);
      });
    }
    container.querySelectorAll("#help-nav button").forEach(function (button) {
      button.addEventListener("click", function () { show(button.getAttribute("data-section")); });
    });
    show("start");
  },
  body: function (key, meta) {
    if (key === "start") {
      return "<h3>首次使用</h3><ol>" +
        "<li>使用管理员分配的账号登录。设计师与运营可创建项目并生成资产，浏览者通过分享链接审核。</li>" +
        "<li>进入“项目管理”新建项目，填写名称、类别与可见性。</li>" +
        "<li>进入“色彩情绪”，输入描述并生成色板，可导出CSS/JSON或保存为资产。</li>" +
        "<li>进入“风格生成”，填写提示词、选择风格，生成色板后提交任务。</li>" +
        "<li>进入“氛围场景”，上传商品图或选择主体类型，设置场景、光向与阴影后提交。</li>" +
        "<li>在“生成任务”查看进度与结果；完成后打开资产，可复现校验、下载SVG/PNG。</li>" +
        "<li>提交审核并生成分享链接，浏览者审核通过后资产可对外。</li></ol>";
    }
    if (key === "roles") {
      return "<h3>四类角色</h3><ul>" +
        "<li><strong>系统管理员</strong>：用户、角色菜单、风格预设、敏感词、审计日志、系统设置与备份。</li>" +
        "<li><strong>专业设计师</strong>：项目、色彩、风格生成、氛围场景、资产、导出与提交审核。</li>" +
        "<li><strong>营销运营</strong>：项目、色彩、氛围场景、资产与导出；不可管理风格与用户。</li>" +
        "<li><strong>浏览者/客户</strong>：通过分享链接或登录查看待审核资产，给出通过/驳回意见。</li></ul>" +
        "<p>菜单隐藏仅影响可见性，接口在服务端按角色校验，越权返回403并写入审计日志。</p>";
    }
    if (key === "color") {
      return "<h3>情绪到基色</h3><p>系统内置8种基本情绪与6种扩展概念的HSL基色：joy(45,90,60)、trust(120,60,50)、fear(120,20,20)、surprise(180,80,50)、sadness(220,50,40)、disgust(280,40,40)、anger(0,85,45)、anticipation(30,80,50)、cyberpunk(300,90,50)、zen(80,20,80)、luxury(40,60,30)、minimalist(0,0,90)、retro(25,40,50)。关键词命中后映射到对应情绪。</p>" +
        "<h3>调和规则</h3><div class=\"formula\">相邻色：基色-60、-30、基色、+30、+60\n互补色：基色深、基色、基色浅、互补色、互补色深\n三角色：基色深、基色、中性、+120、+240\n单色：同色相五级明度</div>" +
        "<p>五种颜色的建议占比固定为10%、20%、40%、10%、20%，合计100%。色值同时输出HEX、RGB、CMYK。</p>";
    }
    if (key === "generator") {
      return "<h3>生成参数</h3><table class=\"kv-table\"><tbody>" +
        "<tr><td>随机种子</td><td>-1或0至999999；固定种子与参数输出相同SVG哈希</td></tr>" +
        "<tr><td>复杂层数</td><td>1至10，控制图层数量</td></tr><tr><td>疏密</td><td>1至10，控制图形密度与尺寸</td></tr>" +
        "<tr><td>颗粒</td><td>0至100，叠加噪点透明度</td></tr><tr><td>光晕</td><td>0至100，控制高光与霓虹强度</td></tr>" +
        "<tr><td>参考图不透明度</td><td>0至100，参考图作为底层图层</td></tr>" +
        "<tr><td>阴影/倒影</td><td>0至100，场景模式有效；光向改变阴影横向偏移</td></tr></tbody></table>" +
        "<h3>风格图层</h3><p>水墨为纸纹、墨晕与笔触；赛博为暗底网格、霓虹圆环与扫描线；盲盒为粉彩圆角与公仔；极简为少量几何与留白；复古为暖色放射线与半调点。</p>" +
        "<h3>复现</h3><p>资产详情提供“复现校验”，使用相同参数、色板与种子重新生成并比较SVG哈希。哈希一致表示复现成功。</p>" +
        "<div class=\"alert info\">生成引擎为本地参数化SVG合成，不调用神经扩散模型、GPU或外部接口。</div>";
    }
    if (key === "export") {
      return "<h3>资产与导出</h3><ul><li>生成完成后资产进入资产库，状态为草稿。</li><li>资产详情可下载SVG；浏览器可将SVG转为PNG下载。</li><li>提交审核后资产进入待审核，浏览者通过或驳回。</li><li>通过后可生成分享链接，链接有效期24小时。</li><li>配色板可导出CSS变量与JSON，用于设计工具或前端主题。</li></ul>" +
        "<h3>AI标识</h3><p>每张生成图右下角固定显示“AI生成 · V1.0”；资产详情显示提示词、参数与哈希，便于溯源。</p>";
    }
    return "<h3>数据与合规</h3><p>软件不访问互联网、不调用外部模型、不上传用户图片与生成结果；所有数据保存在本机data目录。用户上传的参考图与商品图仅在本机SVG中嵌入，导出时随文件带走。</p>" +
      "<h3>生成内容标识</h3><p>生成图带显性AI标识；资产详情提供参数快照与哈希，报告与导出保留来源说明。</p>" +
      "<h3>敏感词与审核</h3><p>提示词在生成前与敏感词库比对，命中时任务失败并记录日志。资产提交审核后由浏览者或管理员确认，驳回必须填写意见。</p>" +
      "<h3>账号与日志</h3><p>密码使用scrypt加盐存储；连续5次失败锁定10分钟；登录、项目、生成、导出、审核与管理操作写入审计日志。本地部署默认监听127.0.0.1:4104，联网部署需补充HTTPS与访问控制。</p>" +
      "<h3>版本</h3><p>" + UI.esc(meta.name) + " " + UI.esc(meta.version) + "；著作权人陕西理工大学；经办人李果；材料修订日期2026年11月19日。</p>";
  }
};
App.register("help", HelpView);
