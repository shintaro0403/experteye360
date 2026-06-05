/**
 * ExpertEye360 Sheet API (Web App)
 * 説明文・デプロイ手順: gas/APPSCRIPT-COPY.md / gas/README.md
 * 初回: setupDemo() → 新しいデプロイ → VITE_SHEET_API_BASE に URL を設定
 */
const SCRIPT_PROP_MASTER_SPREADSHEET_ID = "EXPERTEYE360_MASTER_SPREADSHEET_ID";

const DEMO_CONFIG = {
  clientId: "lipronext-demo",
  clientDisplayName: "Lipronext Demo",
  roomId: "demo-room-001",
  roomDisplayName: "デモ研修 001",
  trainingCode: "demo-2026",
  adminToken: "admin-demo-2026",
};

const SHEET_HEADERS = {
  clients: ["clientId", "spreadsheetId", "displayName", "enabled", "adminTokenHash"],
  settings: ["key", "settings_json", "updated_at"],
  rooms: ["roomId", "displayName", "enabled", "accessCodeHash", "startsAt", "endsAt"],
  responses: [
    "id",
    "created_at",
    "participant_name",
    "affiliation",
    "scene_id",
    "scene_name",
    "confidence_level",
    "submission_json",
    "room_id",
  ],
  auditLogs: ["id", "at", "actor", "action", "target", "detail"],
};

function doGet(e) {
  return handleRequest_(e, "GET");
}

function doPost(e) {
  return handleRequest_(e, "POST");
}

function setupDemo() {
  const masterBook = SpreadsheetApp.create("ExpertEye360 Master");
  const clientBook = SpreadsheetApp.create(`ExpertEye360 ${DEMO_CONFIG.clientId}`);

  setupMasterBook_(masterBook, clientBook.getId());
  setupClientBook_(clientBook);

  PropertiesService.getScriptProperties().setProperty(
    SCRIPT_PROP_MASTER_SPREADSHEET_ID,
    masterBook.getId(),
  );

  Logger.log(JSON.stringify({
    masterSpreadsheetId: masterBook.getId(),
    clientSpreadsheetId: clientBook.getId(),
    clientId: DEMO_CONFIG.clientId,
    roomId: DEMO_CONFIG.roomId,
  }, null, 2));
}

/** 既存の ExpertEye360 Master があるとき。Drive の URL から ID をコピーして実行 */
function linkMasterSpreadsheet(masterSpreadsheetId) {
  const id = normalizeSecret_(masterSpreadsheetId);
  if (!id) throw new Error("masterSpreadsheetId is required");
  SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty(SCRIPT_PROP_MASTER_SPREADSHEET_ID, id);
  Logger.log(`EXPERTEYE360_MASTER_SPREADSHEET_ID を設定しました: ${id}`);
}

/**
 * エディタから実行する用（引数ダイアログが出ないため）。
 * 1. 下の LINK_MASTER_SPREADSHEET_ID に ID を貼る
 * 2. 関数一覧で runLinkMyMaster を選び ▶ 実行
 */
const LINK_MASTER_SPREADSHEET_ID = "";

function runLinkMyMaster() {
  linkMasterSpreadsheet(LINK_MASTER_SPREADSHEET_ID);
}

/** 管理者コードを admin-demo-2026 に戻す（マスター clients の hash を更新） */
function resetDemoAdminToken() {
  const clientsSheet = getMasterClientsSheet_();
  updateRowByKey_(clientsSheet, "clientId", DEMO_CONFIG.clientId, {
    adminTokenHash: hashSecret_(DEMO_CONFIG.adminToken),
  });
  Logger.log(`管理者コードを ${DEMO_CONFIG.adminToken} に戻しました`);
}

/** 研修コードを demo-2026 に戻す（rooms.accessCodeHash のみ更新。平文はシートに保存しない） */
function resetDemoTrainingCode() {
  const context = resolveClient_(DEMO_CONFIG.clientId);
  updateRowByKey_(getSheet_(context.clientBook, "rooms"), "roomId", DEMO_CONFIG.roomId, {
    accessCodeHash: hashSecret_(DEMO_CONFIG.trainingCode),
  });
  Logger.log(
    `研修コードを ${DEMO_CONFIG.trainingCode} に戻しました（roomId=${DEMO_CONFIG.roomId}）`,
  );
}

/** デモの管理者コード・研修コードを初期値に戻す（E2E / preflight 前の復元用） */
function resetDemoCredentials() {
  resetDemoAdminToken();
  resetDemoTrainingCode();
  Logger.log("デモ資格情報を初期値に戻しました");
}

/** キー設定済みか確認（実行ログを見る） */
function logScriptPropertyStatus() {
  const id = PropertiesService.getScriptProperties().getProperty(SCRIPT_PROP_MASTER_SPREADSHEET_ID);
  Logger.log(id ? `OK: MASTER_ID=${id}` : "NG: EXPERTEYE360_MASTER_SPREADSHEET_ID が未設定です");
}

function handleRequest_(e, method) {
  try {
    const route = getRoute_(e);
    if (method === "GET" && route === "settings") return json_(handleGetSettings_(e));
    if (method === "POST" && route === "settings") return json_(handlePostSettings_(e));
    if (method === "GET" && route === "responses") return json_(handleGetResponses_(e));
    if (method === "POST" && route === "responses/query") return json_(handleQueryResponses_(e));
    if (method === "POST" && route === "responses") return json_(handlePostResponses_(e));
    if (method === "POST" && route === "responses/clear") return json_(handleClearResponses_(e));
    if (method === "POST" && route === "rooms/verify") return json_(handleVerifyRoom_(e));
    if (method === "POST" && route === "rooms/access-code") return json_(handleChangeRoomAccessCode_(e));
    if (method === "POST" && route === "admin/token") return json_(handleChangeAdminToken_(e));
    throw apiError_(404, `Unknown route: ${method} ${route}`);
  } catch (error) {
    return json_({
      ok: false,
      status: error.status || 500,
      error: error.message || "Unexpected error",
    });
  }
}

function handleGetSettings_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  return loadSettings_(context.clientBook);
}

function handlePostSettings_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  const body = readJsonBody_(e);
  verifyAdminToken_(context.clientRecord, tokenFromRequest_(e, body));

  // SEC-SECRET-01: 新契約は {token, settings}、旧契約は settings 直送りの両方を許容
  const settings = body && body.settings !== undefined ? body.settings : body;
  const settingsSheet = getSheet_(context.clientBook, "settings");
  const now = nowIso_();
  upsertRowByKey_(settingsSheet, "key", "default", {
    key: "default",
    settings_json: JSON.stringify(settings),
    updated_at: now,
  });
  appendAuditLog_(context.clientBook, "admin", "settings.save", "settings", {
    updatedAt: now,
  });

  return { ok: true };
}

// SEC-SECRET-01: token をボディで受ける読み取り経路（推奨）
function handleQueryResponses_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  const body = readJsonBody_(e);
  verifyAdminToken_(context.clientRecord, tokenFromRequest_(e, body));
  const roomId = requiredParam_(e, "room");
  verifyRoomId_(context.clientBook, roomId);
  return queryResponses_(context.clientBook, roomId);
}

// 旧経路（token をクエリで受ける GET）。後方互換のため残す
function handleGetResponses_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  verifyAdminToken_(context.clientRecord, requiredParam_(e, "token"));
  const roomId = requiredParam_(e, "room");
  verifyRoomId_(context.clientBook, roomId);
  return queryResponses_(context.clientBook, roomId);
}

function queryResponses_(clientBook, roomId) {
  return readObjects_(getSheet_(clientBook, "responses"))
    .filter((row) => row.room_id === roomId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((row) => JSON.parse(row.submission_json));
}

function handleClearResponses_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  const body = readJsonBody_(e);
  verifyAdminToken_(context.clientRecord, tokenFromRequest_(e, body));
  const roomId = requiredParam_(e, "room");
  verifyRoomId_(context.clientBook, roomId);

  const responsesSheet = getSheet_(context.clientBook, "responses");
  const deletedCount = deleteRowsWhere_(responsesSheet, "room_id", roomId);
  appendAuditLog_(context.clientBook, "admin", "responses.clear", "responses", {
    roomId: roomId,
    deletedCount: deletedCount,
  });

  return { ok: true, deletedCount: deletedCount };
}

function handlePostResponses_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  const roomId = requiredParam_(e, "room");
  verifyRoomId_(context.clientBook, roomId);

  const submission = readJsonBody_(e);
  submission.roomId = roomId;

  const sceneName = findSceneName_(context.clientBook, submission.sceneId);
  const responsesSheet = getSheet_(context.clientBook, "responses");
  appendObject_(responsesSheet, {
    id: submission.id || Utilities.getUuid(),
    created_at: submission.createdAt || nowIso_(),
    participant_name: submission.participantName || "",
    affiliation: submission.affiliation || "",
    scene_id: submission.sceneId || "",
    scene_name: sceneName,
    confidence_level: submission.confidenceLevel || "",
    submission_json: JSON.stringify(submission),
    room_id: roomId,
  });

  return { ok: true };
}

function handleVerifyRoom_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  const body = readJsonBody_(e);
  const accessCode = normalizeSecret_(body.accessCode);
  if (!accessCode) throw apiError_(400, "accessCode is required");

  const accessCodeHash = hashSecret_(accessCode);
  const room = readObjects_(getSheet_(context.clientBook, "rooms"))
    .find((row) => row.accessCodeHash === accessCodeHash && asBoolean_(row.enabled));

  if (!room) throw apiError_(403, "Invalid training code");

  return { roomId: room.roomId };
}

function handleChangeRoomAccessCode_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  const body = readJsonBody_(e);
  verifyAdminToken_(context.clientRecord, tokenFromRequest_(e, body));

  const roomId = normalizeSecret_(body.roomId);
  const nextAccessCode = normalizeSecret_(body.nextAccessCode);
  if (!roomId) throw apiError_(400, "roomId is required");
  if (!nextAccessCode) throw apiError_(400, "nextAccessCode is required");

  verifyRoomId_(context.clientBook, roomId);
  updateRowByKey_(getSheet_(context.clientBook, "rooms"), "roomId", roomId, {
    accessCodeHash: hashSecret_(nextAccessCode),
  });
  appendAuditLog_(context.clientBook, "admin", "room.accessCode.change", `room:${roomId}`, {
    changedAt: nowIso_(),
  });

  return { ok: true };
}

function handleChangeAdminToken_(e) {
  const clientId = requiredParam_(e, "client");
  const context = resolveClient_(clientId);
  const body = readJsonBody_(e);
  verifyAdminToken_(context.clientRecord, tokenFromRequest_(e, body));

  const nextAdminToken = normalizeSecret_(body.nextAdminToken);
  if (!nextAdminToken) throw apiError_(400, "nextAdminToken is required");

  const clientsSheet = getMasterClientsSheet_();
  updateRowByKey_(clientsSheet, "clientId", clientId, {
    adminTokenHash: hashSecret_(nextAdminToken),
  });
  appendAuditLog_(context.clientBook, "admin", "admin.token.change", `client:${clientId}`, {
    changedAt: nowIso_(),
  });

  return { ok: true };
}

function setupMasterBook_(masterBook, clientSpreadsheetId) {
  const clientsSheet = resetSheet_(masterBook, "clients", SHEET_HEADERS.clients);
  removeSheetsExcept_(masterBook, ["clients"]);
  appendObject_(clientsSheet, {
    clientId: DEMO_CONFIG.clientId,
    spreadsheetId: clientSpreadsheetId,
    displayName: DEMO_CONFIG.clientDisplayName,
    enabled: true,
    adminTokenHash: hashSecret_(DEMO_CONFIG.adminToken),
  });
}

function setupClientBook_(clientBook) {
  const settingsSheet = resetSheet_(clientBook, "settings", SHEET_HEADERS.settings);
  const roomsSheet = resetSheet_(clientBook, "rooms", SHEET_HEADERS.rooms);
  resetSheet_(clientBook, "responses", SHEET_HEADERS.responses);
  resetSheet_(clientBook, "audit_logs", SHEET_HEADERS.auditLogs);
  removeSheetsExcept_(clientBook, ["settings", "rooms", "responses", "audit_logs"]);

  appendObject_(settingsSheet, {
    key: "default",
    settings_json: JSON.stringify(defaultSettings_()),
    updated_at: nowIso_(),
  });
  appendObject_(roomsSheet, {
    roomId: DEMO_CONFIG.roomId,
    displayName: DEMO_CONFIG.roomDisplayName,
    enabled: true,
    accessCodeHash: hashSecret_(DEMO_CONFIG.trainingCode),
    startsAt: "",
    endsAt: "",
  });
}

function defaultSettings_() {
  return {
    tourUrl: "https://example.com/3dvista-tour-placeholder",
    scenes: [
      {
        id: "scene-demo-1",
        vistaSceneName: "検査エリア_パノラマ1",
        displayName: "検査エリア（デモ）",
        processArea: "出荷前検査",
        trainingTheme: "表示・置き場・検査状態の確認",
        attentionLabels: [],
        questionCards: buildQuestionCards_(),
        awarenessCards: [
          "ラベル・表示の違和感",
          "傷・汚れ・破損",
          "置き場の違い",
          "検査済み／未検査の混在",
          "記録・チェック漏れ",
        ],
        criteriaCards: ["品質", "安全", "工程", "記録・証跡", "後工程影響"],
        actionCards: [
          "班長へ相談する",
          "品質管理へ確認する",
          "記録に残す",
          "作業を一旦止める",
          "後工程担当へ共有する",
        ],
        veteranTemplate: {
          focusPoints: ["検査済み表示", "記録用紙", "後工程への引き渡し状態"],
          criteriaPriority: ["品質", "記録・証跡", "後工程影響", "安全"],
          recommendedActions: ["記録に残す", "班長へ相談する"],
          shareRoutes: ["品質管理へ確認する"],
          commonMisses: ["検査済みラベルと実物の対応確認を忘れがち"],
          instructorComment: "ラベル位置の違和感は、必ず対象製品と照合させる。",
          ojtChecklist: [
            "顧客影響の観点を確認する",
            "記録・証跡を残す意識を確認する",
          ],
        },
      },
    ],
    rooms: [
      {
        roomId: DEMO_CONFIG.roomId,
        displayName: DEMO_CONFIG.roomDisplayName,
        accessCode: "",
        enabled: true,
      },
    ],
    adminAccessCode: "",
  };
}

function buildQuestionCards_() {
  const criteriaCards = ["品質", "安全", "工程", "記録・証跡", "後工程影響"];
  const actionCards = [
    "班長へ相談する",
    "品質管理へ確認する",
    "記録に残す",
    "作業を一旦止める",
    "後工程担当へ共有する",
  ];
  const awarenessCards = [
    [
      "ラベル・表示の違和感",
      "傷・汚れ・破損",
      "置き場の違い",
      "検査済み／未検査の混在",
      "記録・チェック漏れ",
    ],
    ["異音・振動の違和感", "工具の置き忘れ", "作業手順との違い", "安全保護具の着用", "通路・動線の乱れ"],
    ["後工程に影響しそうな状態", "いつもと違う状態", "数量・在庫の違い", "期限・ロット表示", "設備の停止表示"],
    ["記録用紙の不備", "検査済み表示の位置", "台車・搬送の状態", "照明・視認性", "清掃・5Sの乱れ"],
    ["引き渡し状態の違い", "梱包・保護の状態", "識別タグの欠落", "混載の可能性", "出荷可否の判断"],
  ];

  return awarenessCards.map((cards) => ({
    awarenessCards: cards,
    criteriaCards: criteriaCards,
    actionCards: actionCards,
  }));
}

function resolveClient_(clientId) {
  const clientsSheet = getMasterClientsSheet_();
  const clientRecord = readObjects_(clientsSheet).find((row) => row.clientId === clientId);
  if (!clientRecord) throw apiError_(400, "Unknown client");
  if (!asBoolean_(clientRecord.enabled)) throw apiError_(403, "Disabled client");

  return {
    clientRecord: clientRecord,
    clientBook: SpreadsheetApp.openById(clientRecord.spreadsheetId),
  };
}

function getMasterClientsSheet_() {
  const masterSpreadsheetId = PropertiesService.getScriptProperties()
    .getProperty(SCRIPT_PROP_MASTER_SPREADSHEET_ID);
  if (!masterSpreadsheetId) throw apiError_(500, "Master spreadsheet id is not configured");
  return getSheet_(SpreadsheetApp.openById(masterSpreadsheetId), "clients");
}

function verifyAdminToken_(clientRecord, token) {
  if (clientRecord.adminTokenHash !== hashSecret_(token)) {
    throw apiError_(401, "Invalid admin token");
  }
}

function verifyRoomId_(clientBook, roomId) {
  const room = readObjects_(getSheet_(clientBook, "rooms"))
    .find((row) => row.roomId === roomId && asBoolean_(row.enabled));
  if (!room) throw apiError_(403, "Invalid room");
  return room;
}

function loadSettings_(clientBook) {
  const row = readObjects_(getSheet_(clientBook, "settings")).find((item) => item.key === "default");
  if (!row) throw apiError_(500, "Settings row is missing");
  return JSON.parse(row.settings_json);
}

function findSceneName_(clientBook, sceneId) {
  try {
    const settings = loadSettings_(clientBook);
    const scene = (settings.scenes || []).find((item) => item.id === sceneId);
    return scene ? scene.displayName : "";
  } catch (error) {
    return "";
  }
}

function getRoute_(e) {
  const pathInfo = e && e.pathInfo ? String(e.pathInfo) : "";
  const pathParam = e && e.parameter && e.parameter.path ? String(e.parameter.path) : "";
  return (pathInfo || pathParam).replace(/^\/+|\/+$/g, "");
}

function requiredParam_(e, name) {
  const value = e && e.parameter ? e.parameter[name] : "";
  if (!value) throw apiError_(400, `${name} is required`);
  return String(value);
}

// SEC-SECRET-01: token はボディ優先で受け取り、旧クライアント互換でクエリもフォールバック
function tokenFromRequest_(e, body) {
  const fromBody = body && body.token ? String(body.token) : "";
  const fromQuery = e && e.parameter && e.parameter.token ? String(e.parameter.token) : "";
  const token = normalizeSecret_(fromBody || fromQuery);
  if (!token) throw apiError_(400, "token is required");
  return token;
}

function readJsonBody_(e) {
  const contents = e && e.postData ? e.postData.contents : "";
  if (!contents) return {};
  return JSON.parse(contents);
}

function readObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  const headers = values[0].map(String);
  return values.slice(1)
    .filter((row) => row.some((cell) => cell !== ""))
    .map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index];
      });
      return item;
    });
}

function appendObject_(sheet, object) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  sheet.appendRow(headers.map((header) => sanitizeCell_(object[header] !== undefined ? object[header] : "")));
}

function upsertRowByKey_(sheet, keyHeader, keyValue, object) {
  const rowNumber = findRowNumber_(sheet, keyHeader, keyValue);
  if (rowNumber) {
    updateRow_(sheet, rowNumber, object);
  } else {
    appendObject_(sheet, object);
  }
}

function updateRowByKey_(sheet, keyHeader, keyValue, patch) {
  const rowNumber = findRowNumber_(sheet, keyHeader, keyValue);
  if (!rowNumber) throw apiError_(404, `${keyHeader} not found`);
  updateRow_(sheet, rowNumber, patch);
}

function updateRow_(sheet, rowNumber, patch) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(String);
  const row = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  headers.forEach((header, index) => {
    if (Object.prototype.hasOwnProperty.call(patch, header)) row[index] = sanitizeCell_(patch[header]);
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function deleteRowsWhere_(sheet, columnName, columnValue) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return 0;
  const headers = values[0].map(String);
  const columnIndex = headers.indexOf(columnName);
  if (columnIndex < 0) throw apiError_(500, `${columnName} header is missing`);
  let deletedCount = 0;
  for (let index = values.length - 1; index >= 1; index -= 1) {
    if (String(values[index][columnIndex]) === String(columnValue)) {
      sheet.deleteRow(index + 1);
      deletedCount += 1;
    }
  }
  return deletedCount;
}

function findRowNumber_(sheet, keyHeader, keyValue) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return null;
  const headers = values[0].map(String);
  const keyIndex = headers.indexOf(keyHeader);
  if (keyIndex < 0) throw apiError_(500, `${keyHeader} header is missing`);
  for (let index = 1; index < values.length; index += 1) {
    if (String(values[index][keyIndex]) === String(keyValue)) return index + 1;
  }
  return null;
}

function resetSheet_(spreadsheet, name, headers) {
  const sheet = spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
  return sheet;
}

function getSheet_(spreadsheet, name) {
  const sheet = spreadsheet.getSheetByName(name);
  if (!sheet) throw apiError_(500, `${name} sheet is missing`);
  return sheet;
}

function removeSheetsExcept_(spreadsheet, keep) {
  spreadsheet.getSheets().forEach((sheet) => {
    if (keep.indexOf(sheet.getName()) === -1 && spreadsheet.getSheets().length > 1) {
      spreadsheet.deleteSheet(sheet);
    }
  });
}

function appendAuditLog_(clientBook, actor, action, target, detail) {
  appendObject_(getSheet_(clientBook, "audit_logs"), {
    id: Utilities.getUuid(),
    at: nowIso_(),
    actor: actor,
    action: action,
    target: target,
    detail: JSON.stringify(detail || {}),
  });
}

function hashSecret_(value) {
  const bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    normalizeSecret_(value),
    Utilities.Charset.UTF_8,
  );
  const hex = [];
  for (let index = 0; index < bytes.length; index += 1) {
    const byte = bytes[index];
    const normalized = byte < 0 ? byte + 256 : byte;
    hex.push(`0${normalized.toString(16)}`.slice(-2));
  }
  return hex.join("");
}

// SEC-INPUT-01: 数式インジェクション対策（shared/src/security/sanitizeCell.ts と同一仕様）
function sanitizeCell_(value) {
  if (typeof value !== "string" || value.length === 0) return value;
  const first = value.charAt(0);
  if (["=", "+", "-", "@", "\t", "\r", "\n"].indexOf(first) !== -1) {
    return `'${value}`;
  }
  return value;
}

function normalizeSecret_(value) {
  return String(value || "").trim();
}

function asBoolean_(value) {
  if (typeof value === "boolean") return value;
  return String(value).toLowerCase() === "true";
}

function nowIso_() {
  return new Date().toISOString();
}

function apiError_(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function json_(body) {
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}
