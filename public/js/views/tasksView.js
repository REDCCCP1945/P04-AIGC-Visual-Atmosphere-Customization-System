const TasksView = {
  render: async function (container) {
    const state = { page: 1, size: 12, total: 0 };
    container.innerHTML = UI.pageHead("生成任务", "任务记录参数、种子、日志与结果资产；失败任务可重试", "") +
      '<div class="card"><div class="card-body">' +
      '<div class="filters"><div class="field"><label>状态</label><select class="select" id="task-status"><option value="">全部状态</option><option value="queued">排队中</option><option value="running">生成中</option><option value="completed">已完成</option><option value="failed">失败</option></select></div><button class="btn primary" id="task-search">查询</button></div>' +
      '<div class="stat-strip" id="task-summary" style="margin-top:14px"></div>' +
      '<div id="task-list"></div><div id="task-pager"></div></div></div>';
    const list = container.querySelector("#task-list");
    const pager = container.querySelector("#task-pager");
    async function load() {
      const result = await API.get("/api/tasks?page=" + state.page + "&size=" + state.size + "&status=" + container.querySelector("#task-status").value);
      const data = result.data;
      state.total = data.total;
      container.querySelector("#task-summary").innerHTML = '<div class="stat-mini"><span>排队中</span><strong>' + data.summary.queued + '</strong></div>' +
        '<div class="stat-mini"><span>生成中</span><strong>' + data.summary.running + '</strong></div>' +
        '<div class="stat-mini"><span>已完成</span><strong>' + data.summary.completed + '</strong></div>' +
        '<div class="stat-mini"><span>失败</span><strong>' + data.summary.failed + "</strong></div>";
      list.innerHTML = UI.table({
        columns: [
          { title: "任务标题", key: "title", render: function (row) { return '<span class="clickable" data-task="' + row.id + '">' + UI.esc(row.title) + "</span>"; } },
          { title: "项目", key: "projectName", render: function (row) { return '<div class="ellipsis" style="max-width:220px">' + UI.esc(row.projectName) + "</div>"; } },
          { title: "类型", key: "type", width: "86px", render: function (row) { return row.type === "scene" ? "氛围场景" : "风格生成"; } },
          { title: "状态", width: "86px", render: function (row) { return UI.statusBadge(row.status); } },
          { title: "种子", width: "90px", render: function (row) { return '<span class="mono">' + row.seed + "</span>"; } },
          { title: "创建时间", width: "160px", render: function (row) { return UI.fmtDateTime(row.createdAt); } },
          { title: "操作", width: "76px", render: function (row) { return '<button class="btn sm" data-task="' + row.id + '">查看</button>'; } }
        ],
        rows: data.rows,
        empty: "暂无任务"
      });
      pager.innerHTML = UI.pagination(state);
      UI.bindPagination(pager, state, load);
      list.querySelectorAll("[data-task]").forEach(function (node) {
        node.addEventListener("click", function () { location.hash = "#/tasks/" + node.getAttribute("data-task"); });
      });
    }
    container.querySelector("#task-search").addEventListener("click", function () { state.page = 1; load(); });
    await load();
  }
};
App.register("tasks", TasksView);
