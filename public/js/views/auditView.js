const AuditView = {
  render: async function (container) {
    const state = { page: 1, size: 20, total: 0 };
    container.innerHTML = UI.pageHead("审计日志", "登录、生成、导出、审核与管理操作留痕，日志不提供删除入口", '<button class="btn" id="log-export">导出当前页</button>') +
      '<div class="card"><div class="card-body"><div class="filters">' +
      '<div class="field"><label>分类</label><select class="select" id="g-category"><option value="">全部分类</option><option>认证</option><option>项目</option><option>生成</option><option>资产</option><option>审核</option><option>风格</option><option>敏感词</option><option>系统设置</option><option>权限</option></select></div>' +
      '<div class="field"><label>角色</label><select class="select" id="g-role"><option value="">全部角色</option><option value="ADMIN">系统管理员</option><option value="DESIGNER">专业设计师</option><option value="OPERATOR">营销运营</option><option value="VIEWER">浏览者/客户</option></select></div>' +
      '<div class="field grow"><label>关键词</label><input class="input" id="g-keyword" placeholder="用户、动作或目标"></div><button class="btn primary" id="g-search">查询</button></div>' +
      '<div id="log-list" style="margin-top:12px"></div><div id="log-pager"></div></div></div>';
    const list = container.querySelector("#log-list");
    const pager = container.querySelector("#log-pager");
    async function load() {
      const result = await API.get("/api/logs?page=" + state.page + "&size=" + state.size + "&category=" + encodeURIComponent(container.querySelector("#g-category").value) + "&role=" + container.querySelector("#g-role").value + "&keyword=" + encodeURIComponent(container.querySelector("#g-keyword").value.trim()));
      state.total = result.data.total;
      list.innerHTML = UI.table({
        columns: [
          { title: "时间", width: "160px", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
          { title: "用户", width: "110px", render: function (row) { return UI.esc(row.username) + " / " + UI.roleName(row.role); } },
          { title: "分类", key: "category", width: "90px" },
          { title: "动作", key: "action", width: "130px" },
          { title: "对象", key: "target", render: function (row) { return '<div class="ellipsis" style="max-width:220px">' + UI.esc(row.target) + "</div>"; } },
          { title: "详情", key: "detail", render: function (row) { return '<span class="wrap-text">' + UI.esc(row.detail) + "</span>"; } },
          { title: "IP", key: "ip", width: "110px" }
        ],
        rows: result.data.rows,
        empty: "暂无日志"
      });
      pager.innerHTML = UI.pagination(state);
      UI.bindPagination(pager, state, load);
    }
    container.querySelector("#g-search").addEventListener("click", function () { state.page = 1; load(); });
    container.querySelector("#log-export").addEventListener("click", function () {
      const rows = list.querySelectorAll("table tbody tr");
      if (!rows.length) { UI.toast("没有可导出的数据", "warn"); return; }
      const lines = ["时间,用户,角色,分类,动作,对象,详情,IP"];
      rows.forEach(function (row) {
        const cells = Array.prototype.map.call(row.querySelectorAll("td"), function (cell) { return '"' + cell.innerText.replace(/"/g, '""') + '"'; });
        lines.push(cells.join(","));
      });
      UI.downloadText("审计日志_" + UI.today() + ".csv", "\ufeff" + lines.join("\r\n"), "text/csv;charset=utf-8");
    });
    await load();
  }
};
App.register("audit", AuditView);
