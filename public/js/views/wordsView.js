const WordsView = {
  render: async function (container) {
    const result = await API.get("/api/words");
    const rows = result.data.rows;
    container.innerHTML = UI.pageHead("敏感词", "生成前检查提示词，命中时任务失败并记录审计日志", '<button class="btn primary" id="word-add">新增敏感词</button>') +
      '<div class="card"><div class="card-body tight">' + UI.table({
        columns: [
          { title: "敏感词", key: "word", render: function (row) { return '<strong>' + UI.esc(row.word) + "</strong>"; } },
          { title: "分类", key: "category", width: "120px" },
          { title: "状态", width: "80px", render: function (row) { return UI.statusBadge(row.enabled ? "active" : "disabled"); } },
          { title: "创建时间", width: "170px", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
          { title: "操作", width: "150px", render: function (row) {
            return '<button class="btn sm" data-toggle="' + row.id + '">' + (row.enabled ? "停用" : "启用") + '</button> <button class="btn sm danger" data-remove="' + row.id + '">删除</button>';
          } }
        ],
        rows: rows,
        empty: "暂无敏感词"
      }) + "</div></div>";
    container.querySelector("#word-add").addEventListener("click", function () {
      UI.modal({
        title: "新增敏感词",
        size: "narrow",
        body: '<div class="field"><label>敏感词</label><input class="input" id="word-input" maxlength="20"></div><div class="field" style="margin-top:12px"><label>分类</label><input class="input" id="word-category" value="通用"></div>',
        buttons: [
          { text: "取消", onClick: function (api) { api.close(); } },
          { text: "保存", className: "primary", onClick: async function (api) {
            try {
              await API.post("/api/words", { word: api.find("#word-input").value.trim(), category: api.find("#word-category").value.trim() });
              api.close();
              UI.toast("已保存", "success");
              WordsView.render(container);
            } catch (error) { UI.toast(error.message, "error"); }
          } }
        ]
      });
    });
    container.querySelectorAll("[data-toggle]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try { await API.post("/api/words/" + button.getAttribute("data-toggle") + "/toggle", {}); UI.toast("状态已更新", "success"); WordsView.render(container); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
    container.querySelectorAll("[data-remove]").forEach(function (button) {
      button.addEventListener("click", async function () {
        try { await API.del("/api/words/" + button.getAttribute("data-remove")); UI.toast("已删除", "success"); WordsView.render(container); }
        catch (error) { UI.toast(error.message, "error"); }
      });
    });
  }
};
App.register("words", WordsView);
