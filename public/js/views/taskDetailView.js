const TaskDetailView = {
  timer: null,
  render: async function (container, params) {
    if (TaskDetailView.timer) {
      clearTimeout(TaskDetailView.timer);
      TaskDetailView.timer = null;
    }
    const result = await API.get("/api/tasks/" + params.id);
    const task = result.data.task;
    const asset = result.data.asset;
    const canRetry = task.status === "failed" && (App.user.role === "ADMIN" || result.data.project.ownerId === App.user.id);
    container.innerHTML = UI.pageHead(task.title, "任务编号 " + task.id + " · 项目 " + task.projectName,
      '<button class="btn" data-route="tasks">返回任务</button>' +
      (canRetry ? '<button class="btn primary" id="retry-task">重新生成</button>' : "") +
      (asset ? '<button class="btn" data-route="assets/' + asset.id + '">打开资产</button>' : "")) +
      '<div class="card"><div class="card-body"><div class="row between"><div class="row"><span>状态</span>' + UI.statusBadge(task.status) +
      '<span style="color:#61748a;font-size:12px">创建于 ' + UI.fmtDateTime(task.createdAt) + '</span></div><span style="color:#8b9aab;font-size:12px">进度 ' + task.progress + '%</span></div>' +
      '<div class="progress" style="margin-top:10px"><i style="width:' + task.progress + '%"></i></div>' +
      '<div class="detail-list" style="margin-top:16px">' +
      '<div class="detail-item"><span>类型</span><strong>' + (task.type === "scene" ? "氛围场景" : "风格生成") + "</strong></div>" +
      '<div class="detail-item"><span>风格/场景</span><strong>' + UI.esc(task.style) + (task.scene ? " / " + UI.esc(task.scene) : "") + "</strong></div>" +
      '<div class="detail-item"><span>随机种子</span><strong class="mono">' + task.seed + "</strong></div>" +
      '<div class="detail-item"><span>结果资产</span><strong>' + (asset ? asset.id : "未生成") + "</strong></div>" +
      "</div></div></div>" +
      '<div class="grid grid-main" style="margin-top:16px">' +
      '<div class="card"><div class="card-head"><h3>生成结果</h3><span class="hint">右下角含AI生成标识</span></div><div class="card-body">' +
      (asset && asset.file ? '<div class="preview-stage"><img src="/files/assets/' + encodeURIComponent(asset.file) + '" alt="生成结果"></div>' : UI.empty("暂无结果", task.status === "failed" ? "请查看日志并调整参数" : "任务完成后显示")) +
      "</div></div>" +
      '<div class="card"><div class="card-head"><h3>执行日志</h3></div><div class="card-body"><ul class="timeline">' + task.logs.map(function (item) {
        return '<li><div class="time">' + UI.fmtDateTime(item.time) + '</div><div class="text">' + UI.esc(item.message) + "</div></li>";
      }).join("") + "</ul></div></div></div>" +
      '<div class="card" style="margin-top:16px"><div class="card-head"><h3>参数快照</h3><span class="hint">用于复现</span></div><div class="card-body"><table class="kv-table"><tbody>' +
      '<tr><td>提示词</td><td>' + UI.esc(task.prompt) + "</td></tr>" +
      '<tr><td>色板</td><td class="mono">' + UI.esc((task.palette || []).join(" ")) + "</td></tr>" +
      '<tr><td>参数</td><td class="mono">' + UI.esc(JSON.stringify(task.params)) + "</td></tr>" +
      '<tr><td>复现方式</td><td>使用相同种子、参数与色板重新生成，SVG哈希一致</td></tr>' +
      "</tbody></table></div></div>";
    container.querySelectorAll("[data-route]").forEach(function (node) {
      node.addEventListener("click", function () { location.hash = "#/" + node.getAttribute("data-route"); });
    });
    const retry = container.querySelector("#retry-task");
    if (retry) retry.addEventListener("click", async function () {
      try {
        await API.post("/api/tasks/" + task.id + "/retry", {});
        UI.toast("已重新提交", "success");
        TaskDetailView.render(container, params);
      } catch (error) { UI.toast(error.message, "error"); }
    });
    if (task.status === "queued" || task.status === "running") {
      TaskDetailView.timer = setTimeout(function () {
        if (document.body.contains(container) && location.hash.indexOf(task.id) >= 0) {
          TaskDetailView.render(container, params);
        }
      }, 1200);
    }
  }
};
App.register("task-detail", TaskDetailView);
