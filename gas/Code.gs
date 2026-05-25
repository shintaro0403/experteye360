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

function handleRequest_(e, method) {
  try {
    const route = getRoute_(e);
    if (method === "GET" && route === "settings") return json_(handleGetSettings_(e));
    if (method === "POST" && route === "settings") return json_(handlePostSettings_(e));
    if (method === "GET" && route === "responses") return json_(handleGetResponses_(e));
    if (method === "POST" && route === "responses") return json_(handlePostResponses_(e));
    if (method === "POST" && route === "rooms/verify") return json_(handleVerifyRoom_(e));
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
  verifyAdminToken_(context.clientRecord, requiredParam_(e, "token"));

  const settings = readJsonBody_(e);
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

function handleGetResponses_(e) {
  const context = resolveClient_(requiredParam_(e, "client"));
  verifyAdminToken_(context.clientRecord, requiredParam_(e, "token"));
  const roomId = requiredParam_(e, "room");
  verifyRoomId_(context.clientBook, roomId);

  const responses = readObjects_(getSheet_(context.clientBook, "responses"))
    .filter((row) => row.room_id === roomId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map((row) => JSON.parse(row.submission_json));

  return responses;
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

function handleChangeAdminToken_(e) {
  const clientId = requiredParam_(e, "client");
  const context = resolveClient_(clientId);
  verifyAdminToken_(context.clientRecord, requiredParam_(e, "token"));

  const body = readJsonBody_(e);
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
  sheet.appendRow(headers.map((header) => object[header] !== undefined ? object[header] : ""));
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
    if (Object.prototype.hasOwnProperty.call(patch, header)) row[index] = patch[header];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
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
