const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const store = require("./lib/store");
const auth = require("./lib/auth");
const audit = require("./lib/audit");
const httpUtil = require("./lib/http");
const dashboard = require("./lib/dashboardService");
const projectService = require("./lib/projectService");
const color = require("./lib/color");
const taskService = require("./lib/taskService");
const assetService = require("./lib/assetService");
const reviewService = require("./lib/reviewService");
const userService = require("./lib/userService");
const settingsService = require("./lib/settingsService");
const feedbackService = require("./lib/feedbackService");
const generator = require("./lib/generator");

const PORT = Number(process.env.PORT || 4104);
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, "data");
const PUBLIC_DIR = path.join(__dirname, "public");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

store.init(DATA_DIR);
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALL = ["ADMIN", "DESIGNER", "OPERATOR", "VIEWER"];
const STAFF = ["ADMIN", "DESIGNER", "OPERATOR"];
const ADMIN = ["ADMIN"];
const REVIEWER = ["ADMIN", "VIEWER"];
const writeHits = new Map();
const routes = [];

function route(method, pattern, roles, handler) {
  routes.push({ method: method, pattern: pattern, roles: roles, handler: handler });
}

route("POST", /^\/api\/auth\/login$/, [], auth.login);
route("POST", /^\/api\/auth\/logout$/, ALL, auth.logout);
route("GET", /^\/api\/auth\/me$/, ALL, auth.me);
route("POST", /^\/api\/auth\/password$/, ALL, auth.changePassword);

route("GET", /^\/api\/dashboard$/, ALL, dashboard.summary);
route("GET", /^\/api\/meta$/, [], function (ctx) {
  ctx.ok({
    name: store.db.settings.softwareName,
    version: store.db.settings.softwareVersion,
    owner: "陕西理工大学",
    contact: "李果",
    aiNotice: store.db.settings.aiNotice,
    dataPolicy: store.db.settings.dataPolicy,
    styles: store.db.styles.filter(function (style) { return style.enabled; }),
    defaults: taskService.defaultParams(),
    serverTime: new Date().toISOString()
  });
});

route("GET", /^\/api\/projects$/, ALL, projectService.list);
route("POST", /^\/api\/projects$/, STAFF, projectService.create);
route("GET", /^\/api\/projects\/([^/]+)$/, ALL, projectService.detail);
route("PUT", /^\/api\/projects\/([^/]+)$/, STAFF, projectService.update);
route("POST", /^\/api\/projects\/([^/]+)\/share$/, STAFF, projectService.share);
route("GET", /^\/api\/share\/([^/]+)$/, [], projectService.publicShare);
route("POST", /^\/api\/share\/([^/]+)\/review$/, [], reviewService.publicReview);

route("POST", /^\/api\/color\/analyze$/, STAFF, function (ctx) {
  const body = ctx.body || {};
  const result = color.generate(String(body.text || ""), String(body.harmony || "analogous"));
  ctx.ok({ palette: result });
});
route("POST", /^\/api\/color\/export$/, STAFF, function (ctx) {
  const body = ctx.body || {};
  if (!body.palette || !Array.isArray(body.palette.colors)) {
    ctx.fail(400, "色板数据不完整");
    return;
  }
  if (body.format === "json") {
    ctx.ok({ filename: "palette.json", content: JSON.stringify(body.palette, null, 2), type: "application/json" });
    return;
  }
  ctx.ok({ filename: "palette.css", content: color.exportCss(body.palette, body.name || "palette"), type: "text/css" });
});
route("POST", /^\/api\/color\/save$/, STAFF, assetService.savePalette);

route("GET", /^\/api\/styles$/, ALL, settingsService.styleList);
route("POST", /^\/api\/styles$/, ADMIN, settingsService.styleSave);
route("POST", /^\/api\/styles\/([^/]+)\/toggle$/, ADMIN, settingsService.styleToggle);
route("DELETE", /^\/api\/styles\/([^/]+)$/, ADMIN, settingsService.styleRemove);

route("GET", /^\/api\/tasks$/, ALL, taskService.list);
route("POST", /^\/api\/tasks$/, STAFF, taskService.create);
route("GET", /^\/api\/tasks\/([^/]+)$/, ALL, taskService.taskDetail);
route("POST", /^\/api\/tasks\/([^/]+)\/retry$/, STAFF, taskService.retry);

route("GET", /^\/api\/assets$/, ALL, assetService.list);
route("POST", /^\/api\/assets\/palette$/, STAFF, assetService.savePalette);
route("GET", /^\/api\/assets\/([^/]+)$/, ALL, assetService.detail);
route("POST", /^\/api\/assets\/([^/]+)\/favorite$/, STAFF, assetService.favorite);
route("DELETE", /^\/api\/assets\/([^/]+)$/, STAFF, assetService.remove);
route("POST", /^\/api\/assets\/([^/]+)\/submit-review$/, STAFF, assetService.submitReview);
route("POST", /^\/api\/assets\/([^/]+)\/replay$/, ALL, assetService.replay);
route("GET", /^\/api\/assets\/([^/]+)\/svg$/, ALL, assetService.downloadSvg);
route("GET", /^\/api\/assets\/([^/]+)\/reviews$/, ALL, reviewService.assetReviews);

route("GET", /^\/api\/reviews\/pending$/, REVIEWER, reviewService.pendingList);
route("POST", /^\/api\/reviews$/, REVIEWER, reviewService.review);

route("GET", /^\/api\/users\/backup$/, ADMIN, userService.exportBackup);
route("GET", /^\/api\/users$/, ADMIN, userService.list);
route("POST", /^\/api\/users$/, ADMIN, userService.create);
route("POST", /^\/api\/users\/([^/]+)\/toggle$/, ADMIN, userService.toggle);
route("POST", /^\/api\/users\/([^/]+)\/reset$/, ADMIN, userService.resetPassword);
route("POST", /^\/api\/users\/([^/]+)\/role$/, ADMIN, userService.changeRole);
route("GET", /^\/api\/profile$/, ALL, userService.profile);
route("POST", /^\/api\/profile$/, ALL, userService.updateProfile);

route("GET", /^\/api\/settings\/roles$/, ADMIN, settingsService.roleMenu);
route("POST", /^\/api\/settings\/roles$/, ADMIN, settingsService.roleMenuSave);
route("GET", /^\/api\/settings$/, ADMIN, settingsService.get);
route("POST", /^\/api\/settings$/, ADMIN, settingsService.save);

route("GET", /^\/api\/words$/, ADMIN, settingsService.wordList);
route("POST", /^\/api\/words$/, ADMIN, settingsService.wordSave);
route("POST", /^\/api\/words\/([^/]+)\/toggle$/, ADMIN, settingsService.wordToggle);
route("DELETE", /^\/api\/words\/([^/]+)$/, ADMIN, settingsService.wordRemove);

route("GET", /^\/api\/logs$/, ADMIN, audit.list);

route("GET", /^\/api\/feedback$/, ALL, feedbackService.list);
route("POST", /^\/api\/feedback$/, ALL, feedbackService.create);
route("POST", /^\/api\/feedback\/([^/]+)\/reply$/, ADMIN, feedbackService.reply);
route("POST", /^\/api\/feedback\/([^/]+)\/close$/, ALL, feedbackService.close);

route("GET", /^\/api\/generator-info$/, ALL, function (ctx) {
  ctx.ok({ styles: generator.STYLES, scenes: generator.SCENES, products: generator.PRODUCTS, version: generator.VERSION });
});

function matchRoute(method, pathname) {
  for (const item of routes) {
    if (item.method !== method) continue;
    const matched = item.pattern.exec(pathname);
    if (matched) return { def: item, params: matched.slice(1) };
  }
  return null;
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon"
};

function serveStatic(req, res, pathname) {
  let root = PUBLIC_DIR;
  let rel = pathname;
  if (pathname.indexOf("/files/") === 0) {
    root = UPLOAD_DIR;
    rel = pathname.slice("/files/".length);
  } else if (pathname === "/") {
    rel = "/index.html";
  }
  const safe = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(root, safe);
  if (!file.startsWith(root)) {
    httpUtil.sendJson(res, 403, { code: 403, message: "禁止访问" });
    return;
  }
  fs.stat(file, function (err, stat) {
    if (err || !stat.isFile()) {
      httpUtil.sendJson(res, 404, { code: 404, message: "资源不存在" });
      return;
    }
    res.writeHead(200, {
      "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
      "Content-Length": stat.size,
      "Cache-Control": "public, max-age=120"
    });
    fs.createReadStream(file).pipe(res);
  });
}

function checkRate(user) {
  if (!user) return true;
  const minute = Math.floor(Date.now() / 60000);
  const key = user.id + ":" + minute;
  const count = (writeHits.get(key) || 0) + 1;
  writeHits.set(key, count);
  if (writeHits.size > 500) {
    writeHits.forEach(function (value, item) {
      const stamp = Number(item.split(":")[1]);
      if (stamp < minute - 2) writeHits.delete(item);
    });
  }
  return count <= 60;
}

const server = http.createServer(function (req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "127.0.0.1"));
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.indexOf("/api/") !== 0) {
    serveStatic(req, res, pathname);
    return;
  }
  const matched = matchRoute(req.method, pathname);
  if (!matched) {
    httpUtil.sendJson(res, 404, { code: 404, message: "接口不存在" });
    return;
  }
  const limit = 4 * 1024 * 1024;
  httpUtil.readBody(req, limit, function (err, body) {
    if (err) {
      httpUtil.sendJson(res, 413, { code: 413, message: "请求内容过大" });
      return;
    }
    let user = null;
    try {
      user = auth.fromRequest(req);
    } catch (e) {
      user = null;
    }
    if (matched.def.roles.length > 0) {
      if (!user) {
        httpUtil.sendJson(res, 401, { code: 401, message: "登录状态已失效，请重新登录" });
        return;
      }
      if (matched.def.roles.indexOf(user.role) < 0) {
        audit.write(user, "权限", "拒绝访问", pathname, "角色" + user.role + "无权访问", req);
        httpUtil.sendJson(res, 403, { code: 403, message: "当前角色无权执行该操作" });
        return;
      }
    }
    if (req.method !== "GET" && pathname !== "/api/auth/login" && !checkRate(user)) {
      httpUtil.sendJson(res, 429, { code: 429, message: "操作过于频繁，请稍后再试" });
      return;
    }
    let payload = {};
    try {
      payload = httpUtil.parseJson(body);
    } catch (e) {
      httpUtil.sendJson(res, 400, { code: 400, message: "请求内容不是合法JSON" });
      return;
    }
    const ctx = {
      req: req,
      res: res,
      user: user,
      params: matched.params,
      query: url.searchParams,
      body: payload,
      send: function (code, data) {
        httpUtil.sendJson(res, code, data);
      },
      ok: function (data) {
        httpUtil.sendJson(res, 200, { code: 0, message: "操作成功", data: data || {} });
      },
      fail: function (code, message, field) {
        httpUtil.sendJson(res, code, { code: code, message: message, field: field || null });
      }
    };
    try {
      matched.def.handler(ctx);
    } catch (error) {
      console.error(error);
      httpUtil.sendJson(res, 500, { code: 500, message: "服务器处理失败" });
    }
  });
});

server.listen(PORT, "127.0.0.1", function () {
  console.log("基于AIGC的文创视觉氛围生成与风格化定制系统V1.0");
  console.log("服务已启动：http://127.0.0.1:" + PORT);
  console.log("数据文件：" + path.join(DATA_DIR, "db.json"));
});
