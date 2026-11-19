const AssetDetailView = {
  render: async function (container, params) {
    const response = await API.get("/api/assets/" + params.id);
    const asset = response.data.asset;
    const project = response.data.project;
    const isOwner = App.user.role === "ADMIN" || (project && project.ownerId === App.user.id);
    const canSubmit = isOwner && (asset.status === "draft" || asset.status === "rejected");
    const paletteHtml = asset.type === "palette" && asset.palette && asset.palette.colors ? '<div class="swatches">' + asset.palette.colors.map(function (color) {
      return '<div class="swatch"><div class="color" style="background:' + color.hex + '"></div><div class="info"><strong>' + color.role + "</strong>" + color.hex + "<br>RGB " + color.rgb.join(",") + "<br>CMYK " + color.cmyk.join(",") + "<br>占比 " + color.proportion + "%</div></div>";
    }).join("") + "</div>" : "";
    const imageHtml = asset.file ? '<div class="preview-stage"><img id="asset-image" src="/files/assets/' + encodeURIComponent(asset.file) + '" alt="' + UI.esc(asset.title) + '"></div>' : paletteHtml;
    container.innerHTML = UI.pageHead(asset.title, project ? project.name + " · " + UI.esc(asset.style) : "", '<button class="btn" data-route="assets">返回资产库</button>' +
      (asset.file ? '<button class="btn" id="dl-svg">下载SVG</button><button class="btn" id="dl-png">下载PNG</button>' : "") +
      (isOwner ? '<button class="btn" id="favorite">' + (asset.favorite ? "取消收藏" : "收藏") + "</button>" : "") +
      (canSubmit ? '<button class="btn primary" id="submit-review">提交审核</button>' : "")) +
      '<div class="grid grid-main"><div class="card"><div class="card-body">' + imageHtml +
      (asset.file ? '<div class="alert info" style="margin-top:12px">本图由本地参数化生成引擎输出，右下角带AI生成标识；参数、种子与哈希见右侧。</div>' : '<div class="alert info" style="margin-top:12px">配色板资产用于品牌与包装配色，不包含位图文件。</div>') +
      "</div></div>" +
      '<div class="stack"><div class="card"><div class="card-head"><h3>资产信息</h3>' + UI.statusBadge(asset.status) + "</div><div class=\"card-body\"><table class=\"kv-table\"><tbody>" +
      '<tr><td>资产编号</td><td class="mono">' + asset.id + "</td></tr>" +
      '<tr><td>类型</td><td>' + (asset.type === "palette" ? "配色板" : asset.type === "scene" ? "氛围场景" : "风格图") + "</td></tr>" +
      '<tr><td>提示词</td><td>' + UI.esc(asset.prompt) + "</td></tr>" +
      '<tr><td>随机种子</td><td class="mono">' + asset.seed + "</td></tr>" +
      '<tr><td>尺寸</td><td>' + (asset.width ? asset.width + " × " + asset.height : "不适用") + "</td></tr>" +
      '<tr><td>SVG哈希</td><td class="mono">' + UI.esc(asset.hash || "不适用") + "</td></tr>" +
      '<tr><td>创建人</td><td>' + UI.esc(asset.createdByName) + "</td></tr>" +
      '<tr><td>创建时间</td><td>' + UI.fmtDateTime(asset.createdAt) + "</td></tr>" +
      "</tbody></table>" +
      (asset.reviewComment ? '<div class="alert warn" style="margin-top:12px">审核意见：' + UI.esc(asset.reviewComment) + "</div>" : "") +
      '<div class="row" style="margin-top:12px">' + (asset.type !== "palette" ? '<button class="btn" id="replay">复现校验</button>' : "") + "</div>" +
      '<div id="replay-result" style="margin-top:10px"></div>' +
      "</div></div>" +
      '<div class="card"><div class="card-head"><h3>参数快照</h3></div><div class="card-body"><table class="kv-table"><tbody>' +
      Object.keys(asset.params || {}).map(function (key) {
        return '<tr><td>' + UI.esc(key) + '</td><td class="mono">' + UI.esc(asset.params[key]) + "</td></tr>";
      }).join("") + "</tbody></table></div></div></div></div>" +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>审核记录</h3></div><div class="card-body tight" id="reviews">' +
      UI.table({
        columns: [
          { title: "审核人", key: "reviewer" },
          { title: "动作", width: "80px", render: function (row) { return row.action === "approve" ? '<span class="badge green">通过</span>' : '<span class="badge red">驳回</span>'; } },
          { title: "意见", key: "comment" },
          { title: "时间", width: "160px", render: function (row) { return UI.fmtDateTime(row.createdAt); } }
        ],
        rows: response.data.reviews,
        empty: "暂无审核记录"
      }) + "</div></div>";
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    const favorite = container.querySelector("#favorite");
    if (favorite) favorite.addEventListener("click", async function () {
      try {
        await API.post("/api/assets/" + asset.id + "/favorite", {});
        UI.toast(asset.favorite ? "已取消收藏" : "已收藏", "success");
        AssetDetailView.render(container, params);
      } catch (error) { UI.toast(error.message, "error"); }
    });
    const submit = container.querySelector("#submit-review");
    if (submit) submit.addEventListener("click", async function () {
      try {
        await API.post("/api/assets/" + asset.id + "/submit-review", {});
        UI.toast("已提交审核", "success");
        AssetDetailView.render(container, params);
      } catch (error) { UI.toast(error.message, "error"); }
    });
    const replay = container.querySelector("#replay");
    if (replay) replay.addEventListener("click", async function () {
      try {
        const result = await API.post("/api/assets/" + asset.id + "/replay", {});
        container.querySelector("#replay-result").innerHTML = '<div class="alert ' + (result.data.same ? "success" : "danger") + '">' +
          (result.data.same ? "复现一致：重新生成的SVG哈希与原资产相同。" : "复现不一致：请检查参数或引擎版本。") +
          '<div class="mono" style="font-size:10.5px;margin-top:5px">原哈希 ' + UI.esc(result.data.originalHash) + "<br>复现哈希 " + UI.esc(result.data.replayHash) + "</div></div>";
      } catch (error) { UI.toast(error.message, "error"); }
    });
    const svg = container.querySelector("#dl-svg");
    if (svg) svg.addEventListener("click", function () {
      window.open("/api/assets/" + asset.id + "/svg?token=" + encodeURIComponent(API.token), "_blank");
    });
    const png = container.querySelector("#dl-png");
    if (png) png.addEventListener("click", function () { AssetDetailView.downloadPng(asset); });
  },
  downloadPng: async function (asset) {
    try {
      const response = await fetch("/files/assets/" + encodeURIComponent(asset.file));
      const text = await response.text();
      const blob = new Blob([text], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = function () {
        const canvas = document.createElement("canvas");
        canvas.width = asset.width || image.width;
        canvas.height = asset.height || image.height;
        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (pngBlob) {
          const link = document.createElement("a");
          link.href = URL.createObjectURL(pngBlob);
          link.download = asset.title + ".png";
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(function () { URL.revokeObjectURL(link.href); URL.revokeObjectURL(url); }, 1000);
        }, "image/png");
      };
      image.src = url;
    } catch (error) {
      UI.toast("PNG导出失败：" + error.message, "error");
    }
  }
};
App.register("asset-detail", AssetDetailView);
