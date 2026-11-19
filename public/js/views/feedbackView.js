const FeedbackView = {
  render: async function (container) {
    container.innerHTML = UI.pageHead("反馈与建议", "提交对生成、资产或系统功能的意见；管理员回复后可在本页查看", '<button class="btn primary" id="fb-add">提交反馈</button>') +
      '<div class="card"><div class="card-body"><div class="filters"><div class="field"><label>状态</label><select class="select" id="fb-status"><option value="">全部状态</option><option value="pending">待处理</option><option value="replied">已回复</option><option value="closed">已关闭</option></select></div><button class="btn" id="fb-search">查询</button></div><div id="fb-list" style="margin-top:12px"></div></div></div>';
    const list = container.querySelector("#fb-list");
    async function load() {
      const result = await API.get("/api/feedback?status=" + container.querySelector("#fb-status").value);
      const rows = result.data.rows;
      list.innerHTML = rows.length ? rows.map(function (item) {
        return '<div class="card" style="margin-bottom:12px"><div class="card-body"><div class="row between"><div class="row"><span class="badge teal">' + UI.esc(item.type) + "</span><strong>" + UI.esc(item.userName) + " · " + UI.roleName(item.role) + "</strong>" + UI.statusBadge(item.status) + '</div><span style="color:#61748a;font-size:11.5px">' + UI.fmtDateTime(item.createdAt) + "</span></div>" +
          '<p style="margin:10px 0 0;line-height:1.9">' + UI.esc(item.content) + "</p>" +
          (item.reply ? '<div class="alert info" style="margin-top:10px">管理员回复：' + UI.esc(item.reply) + '<div style="color:#61748a;font-size:11px;margin-top:4px">' + UI.esc(item.replier) + " · " + UI.fmtDateTime(item.repliedAt) + "</div></div>" : "") +
          '<div class="row end" style="margin-top:10px">' + (App.user.role === "ADMIN" && item.status === "pending" ? '<button class="btn sm primary" data-reply="' + item.id + '">回复</button>' : "") +
          (item.status !== "closed" ? '<button class="btn sm" data-close="' + item.id + '">关闭</button>' : "") + "</div></div></div>";
      }).join("") : '<div class="card"><div class="card-body">' + UI.empty("暂无反馈", "提交后可在此查看处理进度") + "</div></div>";
      list.querySelectorAll("[data-reply]").forEach(function (button) {
        button.addEventListener("click", function () { FeedbackView.reply(button.getAttribute("data-reply"), load); });
      });
      list.querySelectorAll("[data-close]").forEach(function (button) {
        button.addEventListener("click", async function () {
          try { await API.post("/api/feedback/" + button.getAttribute("data-close") + "/close", {}); UI.toast("已关闭", "success"); load(); }
          catch (error) { UI.toast(error.message, "error"); }
        });
      });
    }
    container.querySelector("#fb-search").addEventListener("click", load);
    container.querySelector("#fb-add").addEventListener("click", function () {
      UI.modal({
        title: "提交反馈",
        size: "narrow",
        body: '<div class="field"><label>类型</label><select class="select" id="fb-type"><option>建议</option><option>异议</option><option>投诉</option></select></div><div class="field" style="margin-top:12px"><label>内容</label><textarea class="textarea" id="fb-content" placeholder="5到500个字符"></textarea></div>',
        buttons: [
          { text: "取消", onClick: function (api) { api.close(); } },
          { text: "提交", className: "primary", onClick: async function (api) {
            try { await API.post("/api/feedback", { type: api.find("#fb-type").value, content: api.find("#fb-content").value.trim() }); api.close(); UI.toast("已提交", "success"); load(); }
            catch (error) { UI.toast(error.message, "error"); }
          } }
        ]
      });
    });
    await load();
  },
  reply: function (id, onSaved) {
    UI.modal({
      title: "回复反馈",
      size: "narrow",
      body: '<div class="field"><label>回复内容</label><textarea class="textarea" id="fb-reply" placeholder="2到300个字符"></textarea></div>',
      buttons: [
        { text: "取消", onClick: function (api) { api.close(); } },
        { text: "提交回复", className: "primary", onClick: async function (api) {
          try { await API.post("/api/feedback/" + id + "/reply", { reply: api.find("#fb-reply").value.trim() }); api.close(); UI.toast("已回复", "success"); onSaved(); }
          catch (error) { UI.toast(error.message, "error"); }
        } }
      ]
    });
  }
};
App.register("feedback", FeedbackView);
