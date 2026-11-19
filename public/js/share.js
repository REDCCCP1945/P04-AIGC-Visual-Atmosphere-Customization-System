const SharePage = {
  token: "",
  data: null,
  init: function () {
    const params = new URLSearchParams(location.search);
    SharePage.token = params.get("token") || "";
    document.getElementById("refresh").addEventListener("click", function () { SharePage.load(); });
    SharePage.load();
  },
  load: async function () {
    const message = document.getElementById("share-message");
    if (!SharePage.token) {
      message.innerHTML = '<div class="alert danger">缺少分享令牌</div>';
      return;
    }
    try {
      const response = await fetch("/api/share/" + encodeURIComponent(SharePage.token));
      const payload = await response.json();
      if (!response.ok) {
        message.innerHTML = '<div class="alert danger">' + UI.esc(payload.message || "分享链接不可用") + "</div>";
        return;
      }
      SharePage.data = payload.data;
      SharePage.render();
    } catch (error) {
      message.innerHTML = '<div class="alert danger">加载失败：' + UI.esc(error.message) + "</div>";
    }
  },
  render: function () {
    const data = SharePage.data;
    document.getElementById("share-title").textContent = data.project.name;
    document.getElementById("share-meta").textContent = data.project.category + " · 负责人 " + data.project.ownerName + " · 链接到期 " + new Date(data.project.shareExpiresAt).toLocaleString("zh-CN", { hour12: false });
    const grid = document.getElementById("share-grid");
    if (!data.assets.length) {
      grid.innerHTML = '<div class="share-empty card"><div class="card-body">' + UI.empty("暂无资产", "设计师提交资产后显示") + "</div></div>";
      return;
    }
    grid.innerHTML = data.assets.map(function (asset) {
      const image = asset.file ? '<img src="/files/assets/' + encodeURIComponent(asset.file) + '" alt="' + UI.esc(asset.title) + '">' : "";
      const actions = asset.status === "pending_review"
        ? '<div class="row" style="margin-top:8px"><button class="btn sm primary" data-approve="' + asset.id + '">通过</button><button class="btn sm danger" data-reject="' + asset.id + '">驳回</button></div>'
        : '<div class="badge ' + (asset.status === "approved" ? "green" : asset.status === "rejected" ? "red" : "gray") + '">' + (asset.status === "approved" ? "已通过" : asset.status === "rejected" ? "已驳回" : "草稿") + "</div>";
      return '<div class="share-card">' + image + '<div class="body"><strong>' + UI.esc(asset.title) + "</strong><p>" + UI.esc(asset.prompt) + "</p>" + actions +
        (asset.reviewComment ? '<div class="alert warn" style="margin-top:8px">意见：' + UI.esc(asset.reviewComment) + "</div>" : "") + "</div></div>";
    }).join("");
    grid.querySelectorAll("[data-approve]").forEach(function (button) {
      button.addEventListener("click", function () { SharePage.review(button.getAttribute("data-approve"), "approve"); });
    });
    grid.querySelectorAll("[data-reject]").forEach(function (button) {
      button.addEventListener("click", function () { SharePage.review(button.getAttribute("data-reject"), "reject"); });
    });
  },
  review: function (assetId, action) {
    UI.modal({
      title: action === "approve" ? "通过资产" : "驳回资产",
      size: "narrow",
      body: '<div class="field"><label>审核意见' + (action === "reject" ? '<span class="req">*</span>' : "") + '</label><textarea class="textarea" id="share-comment" placeholder="' + (action === "reject" ? "请说明需要调整的内容" : "可选填写") + '"></textarea></div>',
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "提交", className: "primary", onClick: async function (api) {
          try {
            const response = await fetch("/api/share/" + encodeURIComponent(SharePage.token) + "/review", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                assetId: assetId,
                action: action,
                comment: api.find("#share-comment").value.trim(),
                reviewerName: document.getElementById("reviewer-name").value.trim()
              })
            });
            const payload = await response.json();
            if (!response.ok) throw new Error(payload.message || "提交失败");
            api.close();
            UI.toast("审核结果已保存", "success");
            SharePage.load();
          } catch (error) { UI.toast(error.message, "error"); }
        } }
      ]
    });
  }
};
SharePage.init();
