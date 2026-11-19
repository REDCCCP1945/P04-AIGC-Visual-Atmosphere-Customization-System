const API = {
  token: localStorage.getItem("p04_token") || "",
  base: "",
  setToken: function (token) {
    API.token = token || "";
    if (token) localStorage.setItem("p04_token", token);
    else localStorage.removeItem("p04_token");
  },
  request: async function (method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (API.token) headers.Authorization = "Bearer " + API.token;
    const options = { method: method, headers: headers };
    if (body !== undefined) options.body = JSON.stringify(body);
    const response = await fetch(API.base + path, options);
    const text = await response.text();
    let payload = {};
    if (text) {
      try { payload = JSON.parse(text); } catch (e) { payload = { message: text }; }
    }
    if (response.status === 401) {
      API.setToken("");
      window.dispatchEvent(new CustomEvent("p03:unauthorized"));
    }
    if (!response.ok || (payload.code !== undefined && payload.code !== 0)) {
      const error = new Error(payload.message || "请求失败");
      error.status = response.status;
      error.field = payload.field;
      error.errors = payload.errors || [];
      throw error;
    }
    return payload;
  },
  get: function (path) { return API.request("GET", path); },
  post: function (path, body) { return API.request("POST", path, body); },
  put: function (path, body) { return API.request("PUT", path, body); },
  del: function (path) { return API.request("DELETE", path); },
  download: function (path) {
    const separator = path.indexOf("?") >= 0 ? "&" : "?";
    window.open(API.base + path + separator + "token=" + encodeURIComponent(API.token), "_blank");
  }
};


