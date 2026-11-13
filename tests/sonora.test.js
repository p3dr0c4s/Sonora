const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

process.env.TZ = "America/New_York";

const appSource = fs.readFileSync(
  path.join(__dirname, "..", "script.js"),
  "utf8"
);

function createElement(value = "") {
  return {
    value,
    hidden: false,
    disabled: false,
    required: false,
    innerHTML: "",
    textContent: "",
    dataset: {},
    style: {},
    files: [],
    classList: {
      toggle() {},
      add() {},
      remove() {}
    },
    addEventListener() {},
    append() {},
    appendChild() {},
    click() {},
    dispatchEvent() {},
    focus() {},
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    remove() {},
    reset() {
      this.value = "";
    },
    setAttribute() {}
  };
}

function createHarness({ now, storage = new Map(), initialMode = "free" } = {}) {
  let currentTime = now ?? new Date(2026, 2, 10, 12).getTime();
  let nextIntervalId = 0;
  const intervals = new Map();
  const elements = {
    timer: createElement(),
    sessionMode: createElement(initialMode),
    plannedInstrument: createElement(),
    plannedObjective: createElement(),
    plannedContent: createElement(),
    sessionInstrument: createElement(),
    sessionObjective: createElement(),
    sessionContent: createElement(),
    sessionDifficulty: createElement(),
    sessionNotes: createElement(),
    sessionDetailsForm: createElement(),
    freeSessionDetails: createElement(),
    weeklyGoal: createElement(),
    timerControls: createElement()
  };

  class ControlledDate extends Date {
    constructor(...args) {
      super(...(args.length ? args : [currentTime]));
    }

    static now() {
      return currentTime;
    }
  }

  const document = {
    body: createElement(),
    createElement,
    createTextNode: text => ({ textContent: text }),
    getElementById: id => elements[id] || null,
    querySelector: selector =>
      selector === ".timer-controls" ? elements.timerControls : null,
    querySelectorAll: () => []
  };
  const localStorage = {
    getItem: key => storage.has(key) ? storage.get(key) : null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key)
  };
  const window = {
    clearTimeout() {},
    setTimeout() {}
  };
  const context = vm.createContext({
    Date: ControlledDate,
    Event: class {},
    clearInterval: id => intervals.delete(id),
    confirm: () => true,
    console: { error() {}, log() {} },
    document,
    localStorage,
    setInterval: callback => {
      const id = ++nextIntervalId;
      intervals.set(id, callback);
      return id;
    },
    window
  });

  vm.runInContext(
    `${appSource}
      globalThis.__sonoraTest = {
        createBackupSnapshot,
        finishSession,
        getLocalDayStartOffset,
        getState: () => ({
          elapsedSeconds,
          instruments,
          pendingSessionPlan,
          practiceGoals,
          sessionActive,
          timerRunning: timerInterval !== null
        }),
        getWeeklySessionTotals,
        normalizeBackup,
        pauseTimer,
        persistRestoredBackup,
        resetTimer,
        saveFinishedSession,
        setSessions(value) { sessions = value; },
        startTimer
      };
    `,
    context
  );

  return {
    app: context.__sonoraTest,
    elements,
    setNow(value) {
      currentTime = value;
    },
    storage
  };
}

test("recupera práticas ativas e pausadas após recarregar", () => {
  const storage = new Map([
    ["sonora_instruments", JSON.stringify([{ id: "piano", name: "Piano" }])]
  ]);
  const startedAt = new Date(2026, 2, 10, 9).getTime();
  const first = createHarness({
    now: startedAt,
    storage,
    initialMode: "planned"
  });
  first.elements.plannedInstrument.value = "piano";
  first.elements.plannedObjective.value = "Praticar escalas";
  first.elements.plannedContent.value = "Dó maior";

  first.app.startTimer();
  assert.equal(first.app.getState().timerRunning, true);

  const reloaded = createHarness({
    now: startedAt + 90_500,
    storage
  });
  assert.equal(reloaded.app.getState().elapsedSeconds, 90);
  assert.equal(reloaded.app.getState().timerRunning, true);
  assert.equal(reloaded.app.getState().pendingSessionPlan.objective, "Praticar escalas");
  assert.equal(reloaded.elements.plannedContent.value, "Dó maior");

  reloaded.app.pauseTimer();
  const paused = createHarness({
    now: startedAt + 150_000,
    storage
  });
  assert.equal(paused.app.getState().elapsedSeconds, 90);
  assert.equal(paused.app.getState().timerRunning, false);

  paused.app.resetTimer();
  assert.equal(storage.has("sonora_active_session"), false);
});

test("não sobrescreve um estado de prática ilegível sem redefinição explícita", () => {
  const invalidState = "{ inválido";
  const storage = new Map([["sonora_active_session", invalidState]]);
  const { app } = createHarness({ storage });

  app.startTimer();
  assert.equal(app.getState().timerRunning, false);
  assert.equal(storage.get("sonora_active_session"), invalidState);

  app.resetTimer();
  assert.equal(storage.has("sonora_active_session"), false);
});

test("preserva metas semanais e instrumentos através da mudança de horário", () => {
  const now = new Date(2026, 2, 10, 12).getTime();
  const { app } = createHarness({ now });
  const timestamp = (day, hour = 12, minute = 0) =>
    new Date(2026, 2, day, hour, minute).getTime();
  const dstDayStart = timestamp(8, 0);
  const followingDayStart = app.getLocalDayStartOffset(
    1,
    new Date(2026, 2, 8)
  );

  assert.equal((followingDayStart - dstDayStart) / 3_600_000, 23);

  app.setSessions([
    { timestamp: timestamp(4, 0, 30), duration: 60, instrumentId: "piano" },
    { timestamp: timestamp(3, 23, 59), duration: 900, instrumentId: "piano" },
    { timestamp: timestamp(8, 1, 30), duration: 120, instrumentId: "piano" },
    { timestamp: timestamp(11, 0), duration: 300, instrumentId: "piano" }
  ]);

  const totals = app.getWeeklySessionTotals();
  assert.equal(totals.seconds, 180);
  assert.equal(totals.instruments.piano, 180);
});

test("registra uma prática planejada e limpa seu estado temporário", () => {
  const storage = new Map([
    ["sonora_instruments", JSON.stringify([{ id: "piano", name: "Piano" }])]
  ]);
  const startedAt = new Date(2026, 2, 10, 9).getTime();
  const harness = createHarness({
    now: startedAt,
    storage,
    initialMode: "planned"
  });
  const { app, elements, setNow } = harness;

  elements.plannedInstrument.value = "piano";
  elements.plannedObjective.value = "Praticar escalas";
  elements.plannedContent.value = "Dó maior";
  elements.sessionDifficulty.value = "Mudanças de posição";
  elements.sessionNotes.value = "Manter o andamento constante";

  app.startTimer();
  setNow(startedAt + 125_000);
  app.finishSession();
  app.saveFinishedSession({ preventDefault() {} });

  const savedSessions = JSON.parse(storage.get("sonora_sessions"));
  assert.equal(savedSessions.length, 1);
  assert.equal(savedSessions[0].duration, 125);
  assert.equal(savedSessions[0].instrumentId, "piano");
  assert.equal(savedSessions[0].objective, "Praticar escalas");
  assert.equal(savedSessions[0].content, "Dó maior");
  assert.equal(savedSessions[0].difficulty, "Mudanças de posição");
  assert.equal(savedSessions[0].notes, "Manter o andamento constante");
  assert.equal(storage.has("sonora_active_session"), false);
});

test("valida, exporta e restaura backups de sessões e metas", () => {
  const now = new Date(2026, 2, 10, 12).getTime();
  const storage = new Map([
    ["sonora_instruments", JSON.stringify([{ id: "guitar", name: "Violão" }])],
    ["sonora_sessions", JSON.stringify([{
      id: 1,
      timestamp: now,
      duration: 120,
      instrumentId: "guitar",
      instrumentName: "Violão"
    }])],
    ["sonora_practice_goals", JSON.stringify({
      weekly: 90,
      instruments: { guitar: 30 }
    })]
  ]);
  const { app } = createHarness({ now, storage });
  const exportedBackup = JSON.parse(
    JSON.stringify(app.createBackupSnapshot())
  );
  const normalized = app.normalizeBackup(exportedBackup);

  storage.set("sonora_instruments", "[]");
  storage.set("sonora_sessions", "[]");
  storage.set("sonora_practice_goals", "{}");
  app.persistRestoredBackup(normalized);

  assert.equal(
    JSON.parse(storage.get("sonora_instruments"))[0].name,
    "Violão"
  );
  assert.equal(
    JSON.parse(storage.get("sonora_sessions"))[0].duration,
    120
  );
  assert.deepEqual(
    JSON.parse(storage.get("sonora_practice_goals")),
    { weekly: 90, instruments: { guitar: 30 } }
  );
  assert.throws(
    () => app.normalizeBackup({
      ...exportedBackup,
      sessions: [{ timestamp: now, duration: -1 }]
    }),
    /sessão inválida/
  );
});
