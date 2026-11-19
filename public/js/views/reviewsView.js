const ReviewsView = {
  render: async function (container) {
    const result = await API.get("/api/reviews/pending");
    const rows = result.data.rows;
    container.innerHTML = UI.pageHead("审核与分享", "查看分享项目中的待审核资产，通过或驳回并填写意见", '<button class="btn" id="review-refresh">刷新</button>') +
      (rows.length ? '<div class="asset-grid">' + rows.map(function (asset) {
        return '<div class="card"><div class="asset-thumb"><img src="/files/assets/' + encodeURIComponent(asset.file) + '" alt="' + UI.esc(asset.title) + '"></div>' +
          '<div class="card-body"><strong>' + UI.esc(asset.title) + '</strong><div style="color:#8b9aab;font-size:11.5px;margin-top:4px">' + UI.esc(asset.projectName) + " · " + UI.esc(asset.createdByName) + "</div>" +
          '<p style="color:#a7b7c8;font-size:11.5px;margin:8px 0 10px">' + UI.esc(asset.prompt) + "</p>" +
          '<div class="row"><button class="btn sm primary" data-approve="' + asset.id + '">通过</button><button class="btn sm danger" data-reject="' + asset.id + '">驳回</button></div></div></div>';
      }).join("") + "</div>" : '<div class="card"><div class="card-body">' + UI.empty("暂无待审核资产", "资产提交审核后出现在这里") + "</div></div>");
    container.querySelector("#review-refresh").addEventListener("click", function () { ReviewsView.render(container); });
    container.querySelectorAll("[data-approve]").forEach(function (button) {
      button.addEventListener("click", function () { ReviewsView.dialog(button.getAttribute("data-approve"), "approve", container); });
    });
    container.querySelectorAll("[data-reject]").forEach(function (button) {
      button.addEventListener("click", function () { ReviewsView.dialog(button.getAttribute("data-reject"), "reject", container); });
    });
  },
  dialog: function (assetId, action, container) {
    UI.modal({
      title: action === "approve" ? "通过资产" : "驳回资产",
      size: "narrow",
      body: '<div class="field"><label>审核意见' + (action === "reject" ? '<span class="req">*</span>' : "") + '</label><textarea class="textarea" id="review-comment" placeholder="' + (action === "reject" ? "请说明需要调整的内容" : "可选填写") + '"></textarea></div>',
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "提交", className: "primary", onClick: async function (api) {
          try {
            await API.post("/api/reviews", { assetId: assetId, action: action, comment: api.find("#review-comment").value.trim() });
            api.close();
            UI.toast("审核结果已保存", "success");
            ReviewsView.render(container);
          } catch (error) { UI.toast(error.message, "error"); }
        } }
      ]
    });
  }
};
App.register("reviews", ReviewsView);
