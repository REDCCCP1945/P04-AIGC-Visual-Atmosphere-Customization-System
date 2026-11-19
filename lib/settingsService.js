const store = require("./store");
const audit = require("./audit");
const validate = require("./validate");
const userService = require("./userService");

const LIGHTS = ["left", "right", "top"];

function defaults() {
  return {
    complexity: 6,
    density: 6,
    grain: 20,
    glow: 40,
    referenceOpacity: 60,
    shadow: 55,
    reflection: 35,
    light: "left",
    width: 1024,
    height: 1024,
    softwareName: "基于AIGC的文创视觉氛围生成与风格化定制系统",
    softwareVersion: "V1.0",
    aiNotice: "本图由本地参数化生成引擎输出，画面右下角带AI生成标识，参数与随机种子可在资产详情查看。",
    dataPolicy: "软件不访问互联网，不上传用户图片与生成结果；所有数据保存在本机data目录。"
  };
}

function get(ctx) {
  ctx.ok({
    settings: store.db.settings,
    roleMenus: store.db.settings.roleMenus,
    styles: store.db.styles,
    roleNames: userService.ROLE_NAMES
  });
}

function save(ctx) {
  const body = ctx.body || {};
  const settings = store.db.settings;
  const numeric = {
    complexity: [1, 10],
    density: [1, 10],
    grain: [0, 100],
    glow: [0, 100],
    referenceOpacity: [0, 100],
    shadow: [0, 100],
    reflection: [0, 100],
    width: [512, 1600],
    height: [512, 1600]
  };
  for (const key of Object.keys(numeric)) {
    const value = Number(body[key]);
    if (!Number.isFinite(value) || value < numeric[key][0] || value > numeric[key][1]) {
      ctx.fail(400, key + " 应在 " + numeric[key][0] + " 到 " + numeric[key][1] + " 之间", key);
      return;
    }
    settings[key] = Math.round(value);
  }
  if (LIGHTS.indexOf(String(body.light)) < 0) {
    ctx.fail(400, "光向参数无效", "light");
    return;
  }
  settings.light = String(body.light);
  if (typeof body.aiNotice === "string" && body.aiNotice.trim()) settings.aiNotice = body.aiNotice.trim().slice(0, 500);
  if (typeof body.dataPolicy === "string" && body.dataPolicy.trim()) settings.dataPolicy = body.dataPolicy.trim().slice(0, 500);
  store.save();
  audit.write(ctx.user, "系统设置", "保存默认参数", "生成参数", "复杂度" + settings.complexity + "，尺寸" + settings.width + "x" + settings.height, ctx.req);
  ctx.ok({ settings: settings });
}

function styleList(ctx) {
  ctx.ok({ rows: store.db.styles.slice() });
}

function styleSave(ctx) {
  const body = ctx.body || {};
  const id = body.id || "";
  const name = String(body.name || "").trim();
  const code = String(body.code || "").trim();
  const description = String(body.description || "").trim();
  if (name.length < 2 || name.length > 30) {
    ctx.fail(400, "风格名称长度应为2到30个字符", "name");
    return;
  }
  if (["ink", "cyber", "blindbox", "minimal", "retro"].indexOf(code) < 0) {
    ctx.fail(400, "风格编码无效", "code");
    return;
  }
  const duplicate = store.db.styles.find(function (item) { return item.name === name && item.id !== id; });
  if (duplicate) {
    ctx.fail(409, "风格名称已存在", "name");
    return;
  }
  if (id) {
    const item = store.db.styles.find(function (entry) { return entry.id === id; });
    if (!item) {
      ctx.fail(404, "风格不存在");
      return;
    }
    item.name = name;
    item.code = code;
    item.description = description.slice(0, 200);
    item.updatedAt = store.now();
    audit.write(ctx.user, "风格", "修改风格", name, code, ctx.req);
  } else {
    store.db.styles.push({
      id: store.id("STY"),
      name: name,
      code: code,
      description: description.slice(0, 200),
      enabled: true,
      createdAt: store.now()
    });
    audit.write(ctx.user, "风格", "新增风格", name, code, ctx.req);
  }
  store.save();
  ctx.ok({ rows: store.db.styles });
}

function styleToggle(ctx) {
  const item = store.db.styles.find(function (entry) { return entry.id === ctx.params[0]; });
  if (!item) {
    ctx.fail(404, "风格不存在");
    return;
  }
  item.enabled = !item.enabled;
  store.save();
  audit.write(ctx.user, "风格", item.enabled ? "启用风格" : "停用风格", item.name, "", ctx.req);
  ctx.ok({ item: item });
}

function styleRemove(ctx) {
  const item = store.db.styles.find(function (entry) { return entry.id === ctx.params[0]; });
  if (!item) {
    ctx.fail(404, "风格不存在");
    return;
  }
  const used = store.db.tasks.filter(function (task) { return task.style === item.code; }).length;
  if (used > 0) {
    ctx.fail(409, "该风格已被" + used + "个任务使用，不能删除");
    return;
  }
  store.db.styles = store.db.styles.filter(function (entry) { return entry.id !== item.id; });
  store.save();
  audit.write(ctx.user, "风格", "删除风格", item.name, "", ctx.req);
  ctx.ok({ rows: store.db.styles });
}

function wordList(ctx) {
  const query = ctx.query;
  const keyword = (query.get("keyword") || "").trim();
  let rows = store.db.words.slice();
  if (keyword) rows = rows.filter(function (item) { return item.word.indexOf(keyword) >= 0; });
  ctx.ok({ rows: rows });
}

function wordSave(ctx) {
  const body = ctx.body || {};
  const word = String(body.word || "").trim();
  const category = String(body.category || "通用").trim();
  if (word.length < 1 || word.length > 20) {
    ctx.fail(400, "敏感词长度应为1到20个字符", "word");
    return;
  }
  if (store.db.words.some(function (item) { return item.word === word; })) {
    ctx.fail(409, "敏感词已存在", "word");
    return;
  }
  store.db.words.push({
    id: store.id("WRD"),
    word: word,
    category: category,
    enabled: true,
    createdAt: store.now()
  });
  store.save();
  audit.write(ctx.user, "敏感词", "新增敏感词", word, category, ctx.req);
  ctx.ok({ rows: store.db.words });
}

function wordToggle(ctx) {
  const item = store.db.words.find(function (entry) { return entry.id === ctx.params[0]; });
  if (!item) {
    ctx.fail(404, "敏感词不存在");
    return;
  }
  item.enabled = !item.enabled;
  store.save();
  audit.write(ctx.user, "敏感词", item.enabled ? "启用敏感词" : "停用敏感词", item.word, "", ctx.req);
  ctx.ok({ item: item });
}

function wordRemove(ctx) {
  const item = store.db.words.find(function (entry) { return entry.id === ctx.params[0]; });
  if (!item) {
    ctx.fail(404, "敏感词不存在");
    return;
  }
  store.db.words = store.db.words.filter(function (entry) { return entry.id !== item.id; });
  store.save();
  audit.write(ctx.user, "敏感词", "删除敏感词", item.word, "", ctx.req);
  ctx.ok({ rows: store.db.words });
}

function roleMenu(ctx) {
  ctx.ok({ roleMenus: store.db.settings.roleMenus, roleNames: userService.ROLE_NAMES });
}

function roleMenuSave(ctx) {
  const body = ctx.body || {};
  const role = String(body.role || "");
  const menus = Array.isArray(body.menus) ? body.menus.slice() : null;
  if (!userService.ROLE_NAMES[role]) {
    ctx.fail(400, "角色无效", "role");
    return;
  }
  if (!menus) {
    ctx.fail(400, "菜单列表无效", "menus");
    return;
  }
  if (role === "ADMIN") {
    ctx.fail(409, "内置管理员菜单不能修改");
    return;
  }
  store.db.settings.roleMenus[role] = menus;
  store.save();
  audit.write(ctx.user, "权限", "调整角色菜单", userService.ROLE_NAMES[role], menus.join("、"), ctx.req);
  ctx.ok({ roleMenus: store.db.settings.roleMenus });
}

module.exports = {
  LIGHTS: LIGHTS,
  defaults: defaults,
  get: get,
  save: save,
  styleList: styleList,
  styleSave: styleSave,
  styleToggle: styleToggle,
  styleRemove: styleRemove,
  wordList: wordList,
  wordSave: wordSave,
  wordToggle: wordToggle,
  wordRemove: wordRemove,
  roleMenu: roleMenu,
  roleMenuSave: roleMenuSave
};
