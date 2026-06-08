import http from "node:http";

const HOST = "127.0.0.1";
const PORT = 5198;
const CLIENT_ID = "client-demo";
const ADMIN_TOKEN = "admin-demo";

const questionCards = [
  ["ラベル・表示の違和感", "傷・汚れ・破損", "置き場の違い", "検査済み／未検査の混在", "記録・チェック漏れ"],
  ["異音・振動の違和感", "工具の置き忘れ", "作業手順との違い", "安全保護具の着用", "通路・動線の乱れ"],
  ["後工程に影響しそうな状態", "いつもと違う状態", "数量・在庫の違い", "期限・ロット表示", "設備の停止表示"],
  ["記録用紙の不備", "検査済み表示の位置", "台車・搬送の状態", "照明・視認性", "清掃・5Sの乱れ"],
  ["引き渡し状態の違い", "梱包・保護の状態", "識別タグの欠落", "混載の可能性", "出荷可否の判断"],
].map((awarenessCards) => ({
  awarenessCards,
  criteriaCards: ["品質", "安全", "工程", "記録・証跡", "後工程影響"],
  actionCards: ["班長へ相談する", "品質管理へ確認する", "記録に残す", "作業を一旦止める", "後工程担当へ共有する"],
}));

const legacyAdminCodeSettingsPatch = {
  adminRoomScope: "adminCode",
  rooms: [
    {
      roomId: "room-demo-1",
      displayName: "デモ研修（午前）",
      accessCode: "DEMO-2026",
      adminAccessCode: "admin-demo",
      enabled: true,
    },
    {
      roomId: "room-other",
      displayName: "デモ研修（別 room）",
      accessCode: "OTHER-2026",
      adminAccessCode: "admin-other",
      enabled: true,
    },
  ],
};

const initialSettings = {
  tourUrl: "https://example.com/3dvista-tour-placeholder",
  adminRoomScope: "trainingCode",
  rooms: [
    {
      roomId: "room-demo-1",
      displayName: "デモ研修（午前）",
      accessCode: "DEMO-2026",
      enabled: true,
    },
    {
      roomId: "room-other",
      displayName: "デモ研修（別 room）",
      accessCode: "OTHER-2026",
      enabled: true,
    },
  ],
  adminAccessCode: ADMIN_TOKEN,
  scenes: [
    {
      id: "scene-demo-1",
      vistaSceneName: "検査エリア_パノラマ1",
      displayName: "検査エリア（デモ）",
      processArea: "出荷前検査",
      trainingTheme: "表示・置き場・検査状態の確認",
      attentionLabels: [],
      questionCards,
      awarenessCards: questionCards[0].awarenessCards,
      criteriaCards: questionCards[0].criteriaCards,
      actionCards: questionCards[0].actionCards,
      veteranTemplate: {
        focusPoints: ["検査済み表示", "記録用紙", "後工程への引き渡し状態"],
        criteriaPriority: ["品質", "記録・証跡", "後工程影響", "安全"],
        recommendedActions: ["記録に残す", "班長へ相談する"],
        shareRoutes: ["品質管理へ確認する"],
        commonMisses: ["検査済みラベルと実物の対応確認を忘れがち"],
        instructorComment: "ラベル位置の違和感は、必ず対象製品と照合させる。",
        ojtChecklist: ["顧客影響の観点を確認する", "記録・証跡を残す意識を確認する"],
      },
    },
  ],
};

let state = createInitialState();

function createInitialState() {
  return {
    settingsByClient: {
      [CLIENT_ID]: structuredClone(initialSettings),
    },
    responsesByClientRoom: {},
    requestLog: [],
    adminToken: ADMIN_TOKEN,
  };
}

function sendJson(res, status, body) {
  const raw = JSON.stringify(body);
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json; charset=utf-8",
  });
  res.end(raw);
}

function sendNoContent(res) {
  res.writeHead(204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end();
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function roomResponses(client, room) {
  const key = `${client}:${room}`;
  state.responsesByClientRoom[key] ??= [];
  return state.responsesByClientRoom[key];
}

function settingsForClient(client) {
  return state.settingsByClient[client] ?? null;
}

// SEC-SECRET-01: token はボディ優先・クエリはフォールバック
function tokenFromRequest(url, body) {
  const fromBody = body && typeof body.token === "string" ? body.token.trim() : "";
  const fromQuery = url.searchParams.get("token")?.trim() ?? "";
  return fromBody || fromQuery;
}

function roomForId(settings, roomId) {
  return settings.rooms.find((room) => room.roomId === roomId && room.enabled !== false) ?? null;
}

/** ISOLATE-3: room に adminAccessCode があれば room 単位で照合。無ければ client 全体 token。 */
function isAuthorizedForRoom(settings, roomId, url, body) {
  const token = tokenFromRequest(url, body);
  if (!token) return false;
  const room = roomForId(settings, roomId);
  const roomToken = room?.adminAccessCode?.trim();
  if (roomToken) return token === roomToken;
  return token === state.adminToken;
}

function isAuthorizedForSettings(settings, url, body) {
  const token = tokenFromRequest(url, body);
  if (!token) return false;
  if (token === state.adminToken) return true;
  return settings.rooms.some(
    (room) => room.enabled !== false && room.adminAccessCode?.trim() === token,
  );
}

async function handleSheetApi(req, res, url) {
  const path = url.searchParams.get("path");
  const client = url.searchParams.get("client");
  const body = req.method === "POST" ? await readJson(req) : {};
  const hasToken =
    url.searchParams.has("token") || (body && typeof body.token === "string" && body.token.length > 0);
  state.requestLog.push({
    method: req.method,
    path,
    client,
    room: url.searchParams.get("room"),
    hasToken,
  });
  if (client !== CLIENT_ID) {
    sendJson(res, 404, { ok: false, error: "client_not_found" });
    return;
  }
  const settings = settingsForClient(client);
  if (!settings) {
    sendJson(res, 404, { ok: false, error: "settings_not_found" });
    return;
  }

  if (req.method === "GET" && path === "settings") {
    sendJson(res, 200, settings);
    return;
  }

  if (req.method === "POST" && path === "settings") {
    if (!isAuthorizedForSettings(settings, url, body)) {
      sendJson(res, 403, { ok: false, error: "invalid_admin_token" });
      return;
    }
    const next = body && body.settings !== undefined ? body.settings : body;
    state.settingsByClient[client] = structuredClone(next);
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && path === "rooms/verify") {
    const room = settings.rooms.find((r) => r.enabled !== false && r.accessCode === body.accessCode);
    if (!room) {
      sendJson(res, 403, { ok: false, error: "access_code_mismatch" });
      return;
    }
    sendJson(res, 200, { roomId: room.roomId });
    return;
  }

  if (req.method === "POST" && path === "rooms/access-code") {
    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
    if (!isAuthorizedForRoom(settings, roomId, url, body)) {
      sendJson(res, 403, { ok: false, error: "invalid_admin_token" });
      return;
    }
    const room = settings.rooms.find((r) => r.roomId === body.roomId);
    const nextAccessCode = typeof body.nextAccessCode === "string" ? body.nextAccessCode.trim() : "";
    if (!room || !nextAccessCode) {
      sendJson(res, 400, { ok: false, error: "invalid_access_code_change" });
      return;
    }
    room.accessCode = nextAccessCode;
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method === "POST" && path === "admin/token") {
    if (!isAuthorizedForSettings(settings, url, body)) {
      sendJson(res, 403, { ok: false, error: "invalid_admin_token" });
      return;
    }
    const nextAdminToken = typeof body.nextAdminToken === "string" ? body.nextAdminToken.trim() : "";
    if (nextAdminToken.length < 4) {
      sendJson(res, 400, { ok: false, error: "invalid_next_admin_token" });
      return;
    }
    const currentToken = tokenFromRequest(url, body);
    const roomId = typeof body.roomId === "string" ? body.roomId.trim() : "";
    if (roomId) {
      const room = settings.rooms.find((item) => item.roomId === roomId);
      if (room) room.adminAccessCode = nextAdminToken;
    } else {
      state.adminToken = nextAdminToken;
      settings.adminAccessCode = nextAdminToken;
      for (const room of settings.rooms) {
        if (!room.adminAccessCode?.trim() || room.adminAccessCode.trim() === currentToken) {
          room.adminAccessCode = nextAdminToken;
        }
      }
    }
    sendJson(res, 200, { ok: true });
    return;
  }

  if (path === "responses/clear") {
    const room = url.searchParams.get("room");
    if (!room) {
      sendJson(res, 400, { ok: false, error: "room_required" });
      return;
    }
    if (req.method === "POST") {
      if (!isAuthorizedForRoom(settings, room, url, body)) {
        sendJson(res, 403, { ok: false, error: "invalid_admin_token" });
        return;
      }
      roomResponses(client, room).length = 0;
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  // SEC-SECRET-01: token をボディで受け取る読み取り経路
  if (req.method === "POST" && path === "responses/query") {
    const room = url.searchParams.get("room");
    if (!room) {
      sendJson(res, 400, { ok: false, error: "room_required" });
      return;
    }
    if (!isAuthorizedForRoom(settings, room, url, body)) {
      sendJson(res, 403, { ok: false, error: "invalid_admin_token" });
      return;
    }
    sendJson(res, 200, roomResponses(client, room));
    return;
  }

  if (path === "responses") {
    const room = url.searchParams.get("room");
    if (!room) {
      sendJson(res, 400, { ok: false, error: "room_required" });
      return;
    }
    if (req.method === "GET") {
      if (!isAuthorizedForRoom(settings, room, url, body)) {
        sendJson(res, 403, { ok: false, error: "invalid_admin_token" });
        return;
      }
      sendJson(res, 200, roomResponses(client, room));
      return;
    }
    if (req.method === "POST") {
      roomResponses(client, room).unshift({ ...body, roomId: room });
      sendJson(res, 200, { ok: true });
      return;
    }
  }

  sendJson(res, 404, { ok: false, error: "not_found" });
}

async function handleAdmin(req, res, url) {
  if (req.method === "POST" && url.pathname === "/__admin/reset") {
    state = createInitialState();
    sendJson(res, 200, { ok: true });
    return;
  }
  if (req.method === "GET" && url.pathname === "/__admin/responses") {
    const client = url.searchParams.get("client") ?? CLIENT_ID;
    const room = url.searchParams.get("room") ?? "room-demo-1";
    sendJson(res, 200, roomResponses(client, room));
    return;
  }
  if (req.method === "GET" && url.pathname === "/__admin/requests") {
    sendJson(res, 200, state.requestLog);
    return;
  }
  if (req.method === "POST" && url.pathname === "/__admin/scope-mode") {
    const body = await readJson(req);
    const settings = state.settingsByClient[CLIENT_ID];
    if (!settings) {
      sendJson(res, 404, { ok: false, error: "settings_not_found" });
      return;
    }
    if (body.mode === "adminCode") {
      Object.assign(settings, structuredClone(legacyAdminCodeSettingsPatch));
    } else {
      const fresh = structuredClone(initialSettings);
      settings.adminRoomScope = fresh.adminRoomScope;
      settings.rooms = fresh.rooms;
    }
    sendJson(res, 200, { ok: true, adminRoomScope: settings.adminRoomScope });
    return;
  }
  sendJson(res, 404, { ok: false, error: "admin_not_found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${HOST}:${PORT}`);
    if (req.method === "OPTIONS") {
      sendNoContent(res);
      return;
    }
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }
    if (url.pathname.startsWith("/__admin/")) {
      await handleAdmin(req, res, url);
      return;
    }
    if (url.pathname === "/exec") {
      await handleSheetApi(req, res, url);
      return;
    }
    sendJson(res, 404, { ok: false, error: "not_found" });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err instanceof Error ? err.message : "unknown_error" });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`E2E Sheet API mock listening on http://${HOST}:${PORT}`);
});
