
// ==========================================
// SONORA
// Studio Management System
// ==========================================

const INSTRUMENTS_KEY = "sonora_instruments";
const SESSIONS_KEY = "sonora_sessions";
const GOALS_KEY = "sonora_practice_goals";

let noticeTimeout = null;

function showNotice(message, type = "success") {
  const notice = document.getElementById("appNotice");
  const messageElement = document.getElementById("noticeMessage");

  if (!notice || !messageElement) {
    console.error(message);
    return;
  }

  window.clearTimeout(noticeTimeout);
  messageElement.textContent = message;
  notice.classList.toggle("is-error", type === "error");
  notice.hidden = false;
  notice.setAttribute("role", type === "error" ? "alert" : "status");
  notice.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
  noticeTimeout = window.setTimeout(
    () => { notice.hidden = true; },
    type === "error" ? 8000 : 4500
  );
}

const dismissNoticeButton = document.getElementById("dismissNotice");
if (dismissNoticeButton) {
  dismissNoticeButton.addEventListener("click", () => {
    window.clearTimeout(noticeTimeout);
    document.getElementById("appNotice").hidden = true;
  });
}

// ---------- STORAGE ----------

const storageReadErrors = new Set();
const STORAGE_LABELS = {
  [INSTRUMENTS_KEY]: "instrumentos",
  [SESSIONS_KEY]: "sessões",
  [GOALS_KEY]: "metas"
};

function loadData(key) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];

    const data = JSON.parse(raw);
    if (!Array.isArray(data)) {
      throw new Error("O conteúdo armazenado não é uma lista.");
    }

    return data;
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    storageReadErrors.add(key);
    showNotice(
      `Não foi possível ler os dados de ${STORAGE_LABELS[key]}. Restaure um backup antes de salvar para evitar sobrescrevê-los.`,
      "error"
    );
    return [];
  }
}

let instruments = loadData(INSTRUMENTS_KEY);
let sessions = loadData(SESSIONS_KEY);

function loadGoals() {
  try {
    const raw = localStorage.getItem(GOALS_KEY);
    if (raw === null) return { weekly: 0, instruments: {} };

    const data = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("O conteúdo armazenado de metas é inválido.");
    }

    const weekly = data.weekly == null ? 0 : Number(data.weekly);
    if (!Number.isFinite(weekly) || weekly < 0) {
      throw new Error("A meta semanal armazenada é inválida.");
    }

    if (
      data.instruments != null &&
      (typeof data.instruments !== "object" || Array.isArray(data.instruments))
    ) {
      throw new Error("As metas por instrumento armazenadas são inválidas.");
    }

    const instrumentGoals = Object.create(null);
    Object.entries(data.instruments || {}).forEach(([id, value]) => {
      const target = Number(value);
      if (!Number.isFinite(target) || target < 0) {
        throw new Error("Uma meta por instrumento armazenada é inválida.");
      }
      if (target > 0) instrumentGoals[id] = target;
    });

    return { weekly, instruments: instrumentGoals };
  } catch (error) {
    console.error("Erro ao carregar metas:", error);
    storageReadErrors.add(GOALS_KEY);
    showNotice(
      "Não foi possível ler suas metas. Restaure um backup antes de salvá-las para evitar sobrescrevê-las.",
      "error"
    );
    return { weekly: 0, instruments: {} };
  }
}

let practiceGoals = loadGoals();

function saveInstruments() {
  if (!canWriteStorageKey(INSTRUMENTS_KEY)) return false;

  try {
    localStorage.setItem(INSTRUMENTS_KEY, JSON.stringify(instruments));
    return true;
  } catch (error) {
    console.error(error);
    showNotice("Não foi possível salvar. O armazenamento pode estar cheio.", "error");
    return false;
  }
}

function saveSessions() {
  if (!canWriteStorageKey(SESSIONS_KEY)) return false;

  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    return true;
  } catch (error) {
    console.error(error);
    showNotice("Não foi possível salvar o histórico.", "error");
    return false;
  }
}

function saveGoals() {
  if (!canWriteStorageKey(GOALS_KEY)) return false;

  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(practiceGoals));
    return true;
  } catch (error) {
    console.error(error);
    showNotice("Não foi possível salvar suas metas.", "error");
    return false;
  }
}

function canWriteStorageKey(key) {
  if (!storageReadErrors.has(key)) return true;

  showNotice(
    `Os dados de ${STORAGE_LABELS[key]} não foram lidos. Restaure um backup antes de salvar.`,
    "error"
  );
  return false;
}

// ---------- ELEMENTS ----------

const timerDisplay = document.getElementById("timer");

const startButton = document.getElementById("startButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");
const finishButton = document.getElementById("finishButton");
const sessionMode = document.getElementById("sessionMode");
const plannedPracticeFields = document.getElementById("plannedPracticeFields");
const plannedInstrument = document.getElementById("plannedInstrument");
const plannedObjective = document.getElementById("plannedObjective");
const plannedContent = document.getElementById("plannedContent");
const sessionDetailsForm = document.getElementById("sessionDetailsForm");
const freeSessionDetails = document.getElementById("freeSessionDetails");
const sessionInstrument = document.getElementById("sessionInstrument");
const sessionObjective = document.getElementById("sessionObjective");
const sessionContent = document.getElementById("sessionContent");
const sessionDifficulty = document.getElementById("sessionDifficulty");
const sessionNotes = document.getElementById("sessionNotes");
const cancelSessionDetails = document.getElementById("cancelSessionDetails");
const timerControls = document.querySelector(".timer-controls");

const instrumentForm = document.getElementById("instrumentForm");
const instrumentList = document.getElementById("instrumentList");
const instrumentSearch = document.getElementById("instrumentSearch");
const instrumentFilter = document.getElementById("instrumentFilter");
const instrumentConditionFilter = document.getElementById("instrumentConditionFilter");
const instrumentSort = document.getElementById("instrumentSort");
const instrumentImageInput = document.getElementById("instrumentImage");

const sessionHistory = document.getElementById("sessionHistory");

const dashboardView = document.getElementById("dashboardView");
const instrumentDetailView = document.getElementById("instrumentDetailView");
const backToInstruments = document.getElementById("backToInstruments");

const instrumentDetailsForm = document.getElementById("instrumentDetailsForm");
const maintenanceForm = document.getElementById("maintenanceForm");

let selectedInstrumentId = null;

// ---------- DATE HELPERS ----------

function getLocalDayStart(date = new Date()) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
}

function getSessionTimestamp(session) {
  if (Number.isFinite(Number(session.timestamp)) && session.timestamp > 0) {
    return Number(session.timestamp);
  }

  // Compatibilidade com sessões antigas:
  // dd/mm/yyyy, hh:mm:ss

  const match = String(session.date || "").match(
    /^(\d{2})\/(\d{2})\/(\d{4})(?:,\s*(\d{2}):(\d{2}):(\d{2}))?/
  );

  if (match) {
    return new Date(
      Number(match[3]),
      Number(match[2]) - 1,
      Number(match[1]),
      Number(match[4] || 0),
      Number(match[5] || 0),
      Number(match[6] || 0)
    ).getTime();
  }

  const parsed = new Date(session.date).getTime();

  return Number.isFinite(parsed) ? parsed : null;
}

function formatDate(timestamp) {
  if (!timestamp) return "Data não disponível";

  return new Date(timestamp).toLocaleDateString("pt-BR");
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return "Data não disponível";

  const difference = Date.now() - timestamp;

  if (difference < 60000 && difference >= 0) {
    return "Agora mesmo";
  }

  if (difference < 3600000 && difference >= 0) {
    return `Há ${Math.floor(difference / 60000)} min`;
  }

  if (difference < 86400000 && difference >= 0) {
    return `Há ${Math.floor(difference / 3600000)} h`;
  }

  return formatDate(timestamp);
}

// ---------- TIMER ----------

let elapsedSeconds = 0;
let timerInterval = null;
let timerStartedAt = null;
let sessionActive = false;
let pendingSessionPlan = null;

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(remainingSeconds).padStart(2, "0")
  ].join(":");
}

function updateTimerDisplay() {
  if (timerDisplay) {
    timerDisplay.textContent = formatTime(elapsedSeconds);
  }
}

function startTimer() {
  if (timerInterval !== null) return;

  if (!sessionActive && sessionMode?.value === "planned") {
    const instrument = instruments.find(
      item => String(item.id) === plannedInstrument.value
    );

    if (!instrument || !plannedObjective.value.trim() || !plannedContent.value.trim()) {
      showNotice("Preencha o instrumento, o objetivo e o conteúdo da prática planejada.", "error");
      return;
    }

    pendingSessionPlan = {
      mode: "planned",
      instrumentId: instrument.id,
      instrumentName: instrument.name,
      objective: plannedObjective.value.trim(),
      content: plannedContent.value.trim()
    };
  } else if (!sessionActive) {
    pendingSessionPlan = { mode: "free" };
  }

  sessionActive = true;
  if (sessionMode) sessionMode.disabled = true;
  if (plannedInstrument) plannedInstrument.disabled = true;
  if (plannedObjective) plannedObjective.disabled = true;
  if (plannedContent) plannedContent.disabled = true;

  timerStartedAt = Date.now() - (elapsedSeconds * 1000);
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
    updateTimerDisplay();
  }, 250);
}

function pauseTimer() {
  if (timerStartedAt !== null) {
    elapsedSeconds = Math.floor((Date.now() - timerStartedAt) / 1000);
    timerStartedAt = null;
    updateTimerDisplay();
  }
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  elapsedSeconds = 0;
  timerStartedAt = null;
  sessionActive = false;
  pendingSessionPlan = null;
  if (sessionMode) sessionMode.disabled = false;
  if (plannedInstrument) plannedInstrument.disabled = false;
  if (plannedObjective) plannedObjective.disabled = false;
  if (plannedContent) plannedContent.disabled = false;
  if (sessionDetailsForm) {
    sessionDetailsForm.hidden = true;
    sessionDetailsForm.reset();
  }
  if (timerControls) timerControls.hidden = false;
  updateTimerDisplay();
}

function finishSession() {
  pauseTimer();

  if (elapsedSeconds < 1) {
    showNotice("Inicie uma sessão antes de finalizá-la.", "error");
    return;
  }

  const isPlanned = pendingSessionPlan?.mode === "planned";
  if (freeSessionDetails) freeSessionDetails.hidden = isPlanned;

  if (isPlanned) {
    sessionInstrument.value = String(pendingSessionPlan.instrumentId);
    sessionObjective.value = pendingSessionPlan.objective;
    sessionContent.value = pendingSessionPlan.content;
  } else {
    sessionInstrument.value = "";
    sessionObjective.value = "";
    sessionContent.value = "";
  }

  if (sessionDetailsForm) sessionDetailsForm.hidden = false;
  if (timerControls) timerControls.hidden = true;
  sessionDifficulty?.focus();
}

function saveFinishedSession(event) {
  event.preventDefault();

  const now = Date.now();
  const instrument = pendingSessionPlan?.mode === "planned"
    ? instruments.find(item => item.id === pendingSessionPlan.instrumentId)
    : instruments.find(item => String(item.id) === sessionInstrument.value);

  const newSession = {
    id: now,
    duration: elapsedSeconds,
    timestamp: now,
    date: new Date(now).toLocaleString("pt-BR"),
    mode: pendingSessionPlan?.mode || "free",
    instrumentId: instrument?.id || null,
    instrumentName: instrument?.name || "",
    objective: pendingSessionPlan?.mode === "planned"
      ? pendingSessionPlan.objective
      : sessionObjective.value.trim(),
    content: pendingSessionPlan?.mode === "planned"
      ? pendingSessionPlan.content
      : sessionContent.value.trim(),
    difficulty: sessionDifficulty.value.trim(),
    notes: sessionNotes.value.trim()
  };

  sessions.unshift(newSession);

  if (!saveSessions()) {
    sessions.shift();
    return;
  }

  resetTimer();

  renderHistory();
  updateDashboard();
  renderStudioOverview();
  renderGoalProgress();

  showNotice("Sessão salva no seu histórico.");
}

if (startButton) startButton.addEventListener("click", startTimer);
if (pauseButton) pauseButton.addEventListener("click", pauseTimer);
if (resetButton) resetButton.addEventListener("click", resetTimer);
if (finishButton) finishButton.addEventListener("click", finishSession);
if (sessionDetailsForm) {
  sessionDetailsForm.addEventListener("submit", saveFinishedSession);
}
if (cancelSessionDetails) {
  cancelSessionDetails.addEventListener("click", () => {
    if (sessionDetailsForm) sessionDetailsForm.hidden = true;
    if (timerControls) timerControls.hidden = false;
    startTimer();
  });
}
if (sessionMode) {
  sessionMode.addEventListener("change", () => {
    const isPlanned = sessionMode.value === "planned";
    if (plannedPracticeFields) plannedPracticeFields.hidden = !isPlanned;
    if (plannedInstrument) plannedInstrument.required = isPlanned;
    if (plannedObjective) plannedObjective.required = isPlanned;
    if (plannedContent) plannedContent.required = isPlanned;
  });
}

updateTimerDisplay();

// ---------- DASHBOARD METRICS ----------

function updateDashboard() {
  const instrumentCount = document.getElementById("instrumentCount");
  const sessionCount = document.getElementById("sessionCount");
  const practiceTime = document.getElementById("practiceTime");

  const totalSeconds = sessions.reduce((total, session) => {
    return total + Number(session.duration || 0);
  }, 0);

  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  if (instrumentCount) {
    instrumentCount.textContent = instruments.length;
  }

  if (sessionCount) {
    sessionCount.textContent = sessions.length;
  }

  if (practiceTime) {
    practiceTime.textContent = `${totalHours}h ${remainingMinutes}min`;
  }
}

// ---------- WEEKLY PRACTICE ----------

function renderWeeklyPractice() {
  const chart = document.getElementById("weeklyChart");
  const totalElement = document.getElementById("weeklyPracticeTime");

  if (!chart || !totalElement) return;

  const today = new Date();
  const todayStart = getLocalDayStart(today);

  const weekStart = todayStart - (6 * 86400000);

  const dailyTotals = {};

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart + i * 86400000);
    const day = date.getDay();

    dailyTotals[day] = 0;
  }

  let weeklySeconds = 0;

  sessions.forEach(session => {
    const timestamp = getSessionTimestamp(session);

    if (!timestamp) return;

    if (timestamp < weekStart || timestamp >= todayStart + 86400000) {
      return;
    }

    const date = new Date(timestamp);
    const day = date.getDay();

    dailyTotals[day] =
      (dailyTotals[day] || 0) + Number(session.duration || 0);

    weeklySeconds += Number(session.duration || 0);
  });

  const maximum = Math.max(...Object.values(dailyTotals), 1);

  const totalMinutes = Math.floor(weeklySeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMinutes = totalMinutes % 60;

  totalElement.textContent = `${totalHours}h ${remainingMinutes}min`;

  chart.querySelectorAll(".chart-day").forEach(dayElement => {
    const day = Number(dayElement.dataset.day);
    const seconds = dailyTotals[day] || 0;

    const bar = dayElement.querySelector(".chart-bar");

    if (!bar) return;

    const percentage = seconds > 0
      ? Math.max(6, (seconds / maximum) * 100)
      : 0;

    bar.style.height = `${percentage}%`;

    dayElement.classList.toggle(
      "today",
      day === today.getDay()
    );

    dayElement.title =
      `${Math.floor(seconds / 60)} minutos de prática`;
  });
}

// ---------- EQUIPMENT STATUS ----------

function renderEquipmentStatus() {
  let good = 0;
  let attention = 0;
  let maintenance = 0;

  instruments.forEach(instrument => {
    const condition = String(instrument.condition || "").toLowerCase();

    if (
      condition === "novo" ||
      condition === "excelente" ||
      condition === "bom"
    ) {
      good++;
    } else if (condition.includes("manutenção")) {
      maintenance++;
    } else {
      attention++;
    }
  });

  const goodElement = document.getElementById("equipmentGood");
  const attentionElement = document.getElementById("equipmentAttention");
  const maintenanceElement = document.getElementById("equipmentMaintenance");
  const totalElement = document.getElementById("equipmentTotal");

  if (goodElement) goodElement.textContent = good;
  if (attentionElement) attentionElement.textContent = attention;
  if (maintenanceElement) maintenanceElement.textContent = maintenance;
  if (totalElement) totalElement.textContent = instruments.length;
}

// ---------- RECENT ACTIVITY ----------

function renderRecentActivity() {
  const container = document.getElementById("recentActivity");

  if (!container) return;

  const activities = [];

  instruments.forEach(instrument => {
    const timestamp = Number(instrument.createdAt || instrument.id);

    activities.push({
      type: "instrument",
      title: instrument.name,
      description: "Instrumento cadastrado",
      timestamp
    });

    (instrument.maintenance || []).forEach(record => {
      activities.push({
        type: "maintenance",
        title: instrument.name,
        description: record.description || "Manutenção registrada",
        timestamp: Number(record.id) || timestamp
      });
    });
  });

  sessions.forEach(session => {
    activities.push({
      type: "session",
      title: "Sessão de estudo",
      description: `Duração: ${formatTime(Number(session.duration || 0))}`,
      timestamp: getSessionTimestamp(session)
    });
  });

  const recent = activities
    .filter(activity => Number.isFinite(activity.timestamp))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 6);

  container.innerHTML = "";

  if (recent.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "Suas atividades recentes aparecerão aqui.";

    container.appendChild(empty);
    return;
  }

  recent.forEach(activity => {
    const item = document.createElement("div");
    item.className = "recent-item";

    const symbol = document.createElement("div");
    symbol.className = "recent-symbol";
    symbol.append(
      createIcon(
        activity.type === "maintenance"
          ? "maintenance"
          : activity.type === "session"
            ? "timer"
            : "music"
      )
    );

    const description = document.createElement("div");
    description.className = "recent-description";

    const title = document.createElement("strong");
    title.textContent = activity.title;

    const subtitle = document.createElement("span");
    subtitle.textContent = activity.description;

    description.append(title, subtitle);

    const time = document.createElement("span");
    time.className = "recent-time";
    time.textContent = formatRelativeTime(activity.timestamp);

    item.append(symbol, description, time);
    container.appendChild(item);
  });
}

// ---------- COMPLETE STUDIO OVERVIEW ----------

function renderStudioOverview() {
  renderWeeklyPractice();
  renderEquipmentStatus();
  renderRecentActivity();
  renderStudyStatistics();
}

// ---------- STUDY HISTORY ----------

function renderHistory() {
  if (!sessionHistory) return;

  sessionHistory.innerHTML = "";

  if (sessions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state history-empty";
    empty.textContent =
      "Nenhuma sessão por enquanto. Inicie uma prática para começar seu histórico.";

    sessionHistory.appendChild(empty);
    return;
  }

  sessions.forEach((session, sessionIndex) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const main = document.createElement("div");
    main.className = "history-item-main";

    const date = document.createElement("p");
    date.textContent = session.date || "Data não disponível";

    const duration = document.createElement("strong");
    duration.textContent = formatTime(Number(session.duration || 0));

    main.append(date, duration);
    item.appendChild(main);

    const details = [
      session.mode === "planned" ? "Prática planejada" : "Prática livre",
      session.instrumentName,
      session.objective,
      session.content,
      session.difficulty ? `Dificuldades: ${session.difficulty}` : "",
      session.notes ? `Anotações: ${session.notes}` : ""
    ].filter(Boolean);

    if (details.length > 1 || session.difficulty || session.notes) {
      const detailList = document.createElement("div");
      detailList.className = "session-history-details";

      details.forEach(detail => {
        const line = document.createElement("p");
        line.textContent = detail;
        detailList.appendChild(line);
      });

      item.appendChild(detailList);
    }

    const actions = document.createElement("div");
    actions.className = "history-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "btn btn-secondary btn-small";
    editButton.setAttribute("aria-label", "Editar sessão");
    editButton.append(createIcon("edit"), document.createTextNode("Editar"));

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-danger btn-small";
    deleteButton.setAttribute("aria-label", "Excluir sessão");
    deleteButton.append(createIcon("delete"), document.createTextNode("Excluir"));
    actions.append(editButton, deleteButton);

    const editForm = document.createElement("form");
    editForm.className = "session-edit-form";
    editForm.hidden = true;

    const formTitle = document.createElement("h4");
    formTitle.textContent = "Editar sessão";

    const formGrid = document.createElement("div");
    formGrid.className = "form-grid";

    const durationField = createSessionEditField(
      sessionIndex,
      "duration",
      "Duração (minutos)",
      "number",
      Math.max(0.01, Number(session.duration || 0) / 60).toFixed(2)
    );
    durationField.control.min = "0.01";
    durationField.control.step = "0.01";
    formGrid.appendChild(durationField.group);

    const modeField = createSessionEditField(
      sessionIndex,
      "mode",
      "Tipo de prática",
      "select",
      session.mode === "planned" ? "planned" : "free",
      [
        ["free", "Prática livre"],
        ["planned", "Prática planejada"]
      ]
    );
    formGrid.appendChild(modeField.group);

    const instrumentOptions = [
      ["", "Sem instrumento específico"],
      ...instruments.map(instrument => [String(instrument.id), instrument.name])
    ];
    if (
      session.instrumentId != null &&
      !instruments.some(item => String(item.id) === String(session.instrumentId))
    ) {
      instrumentOptions.push([
        String(session.instrumentId),
        `${session.instrumentName || "Instrumento"} (removido)`
      ]);
    }
    const instrumentField = createSessionEditField(
      sessionIndex,
      "instrument",
      "Instrumento",
      "select",
      session.instrumentId == null ? "" : String(session.instrumentId),
      instrumentOptions
    );
    formGrid.appendChild(instrumentField.group);

    const objectiveField = createSessionEditField(
      sessionIndex,
      "objective",
      "Objetivo",
      "text",
      session.objective || ""
    );
    formGrid.appendChild(objectiveField.group);

    const contentField = createSessionEditField(
      sessionIndex,
      "content",
      "Conteúdo estudado",
      "textarea",
      session.content || ""
    );
    contentField.group.classList.add("full-width");
    formGrid.appendChild(contentField.group);

    const difficultyField = createSessionEditField(
      sessionIndex,
      "difficulty",
      "Dificuldades",
      "text",
      session.difficulty || ""
    );
    formGrid.appendChild(difficultyField.group);

    const notesField = createSessionEditField(
      sessionIndex,
      "notes",
      "Anotações",
      "textarea",
      session.notes || ""
    );
    formGrid.appendChild(notesField.group);

    const formActions = document.createElement("div");
    formActions.className = "form-actions session-edit-actions";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "btn btn-secondary";
    cancelButton.textContent = "Cancelar";

    const saveButton = document.createElement("button");
    saveButton.type = "submit";
    saveButton.className = "btn";
    saveButton.textContent = "Salvar alterações";

    formActions.append(cancelButton, saveButton);
    editForm.append(formTitle, formGrid, formActions);
    item.append(actions, editForm);

    editButton.addEventListener("click", () => {
      editForm.hidden = !editForm.hidden;
    });

    cancelButton.addEventListener("click", () => {
      editForm.hidden = true;
    });

    deleteButton.addEventListener("click", () => {
      if (!confirm("Excluir esta sessão do histórico? Esta ação não pode ser desfeita.")) {
        return;
      }

      const currentIndex = sessions.indexOf(session);
      if (currentIndex < 0) return;
      const [removedSession] = sessions.splice(currentIndex, 1);

      if (!saveSessions()) {
        sessions.splice(currentIndex, 0, removedSession);
        return;
      }

      renderHistory();
      updateDashboard();
      renderStudioOverview();
      renderGoalProgress();
      showNotice("Sessão excluída.");
    });

    editForm.addEventListener("submit", event => {
      event.preventDefault();

      const currentIndex = sessions.indexOf(session);
      if (currentIndex < 0) return;

      const durationMinutes = Number(durationField.control.value);
      if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
        showNotice("Informe uma duração válida maior que zero.", "error");
        durationField.control.focus();
        return;
      }

      const selectedInstrument = instruments.find(
        instrument => String(instrument.id) === instrumentField.control.value
      );
      if (
        modeField.control.value === "planned" &&
        (!selectedInstrument ||
          !objectiveField.control.value.trim() ||
          !contentField.control.value.trim())
      ) {
        showNotice(
          "Uma prática planejada precisa de instrumento, objetivo e conteúdo.",
          "error"
        );
        return;
      }

      const previousSession = sessions[currentIndex];

      sessions[currentIndex] = {
        ...previousSession,
        duration: Math.round(durationMinutes * 60),
        mode: modeField.control.value,
        instrumentId: selectedInstrument
          ? selectedInstrument.id
          : instrumentField.control.value &&
            String(previousSession.instrumentId) === instrumentField.control.value
            ? previousSession.instrumentId
            : null,
        instrumentName: selectedInstrument
          ? selectedInstrument.name
          : instrumentField.control.value &&
            String(previousSession.instrumentId) === instrumentField.control.value
            ? previousSession.instrumentName || ""
            : "",
        objective: objectiveField.control.value.trim(),
        content: contentField.control.value.trim(),
        difficulty: difficultyField.control.value.trim(),
        notes: notesField.control.value.trim()
      };

      if (!saveSessions()) {
        sessions[currentIndex] = previousSession;
        return;
      }

      renderHistory();
      updateDashboard();
      renderStudioOverview();
      renderGoalProgress();
      showNotice("Sessão atualizada.");
    });

    sessionHistory.appendChild(item);
  });
}

function createIcon(name) {
  const paths = {
    edit: '<path d="m4 16-.8 4.8L8 20l11.5-11.5a2.1 2.1 0 0 0-3-3L5 17"/><path d="m14.5 6.5 3 3"/>',
    delete: '<path d="M4 7h16M10 11v6m4-6v6M6 7l1 14h10l1-14M9 7V4h6v3"/>',
    music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
    maintenance: '<path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3z"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6m-3 0v3"/>'
  };
  const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("aria-hidden", "true");
  icon.classList.add("icon");
  icon.innerHTML = paths[name];
  return icon;
}

function createSessionEditField(index, key, labelText, type, value, options = []) {
  const group = document.createElement("div");
  group.className = "form-group";

  const id = `edit-session-${index}-${key}`;
  const label = document.createElement("label");
  label.htmlFor = id;
  label.textContent = labelText;

  let control;
  if (type === "select") {
    control = document.createElement("select");
    options.forEach(([optionValue, optionLabel]) => {
      const option = document.createElement("option");
      option.value = optionValue;
      option.textContent = optionLabel;
      control.appendChild(option);
    });
  } else {
    control = document.createElement(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") control.type = type;
  }

  control.id = id;
  control.name = key;
  control.value = value;
  group.append(label, control);

  return { group, control };
}

// ---------- PRACTICE GOALS ----------

function refreshStudyInstrumentOptions() {
  const selects = [
    { element: plannedInstrument, placeholder: "Selecione um instrumento" },
    { element: sessionInstrument, placeholder: "Sem instrumento específico" }
  ];

  selects.forEach(({ element, placeholder }) => {
    if (!element) return;

    const selected = element.value;
    element.innerHTML = "";

    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = placeholder;
    element.appendChild(emptyOption);

    instruments.forEach(instrument => {
      const option = document.createElement("option");
      option.value = String(instrument.id);
      option.textContent = instrument.name;
      element.appendChild(option);
    });

    if (instruments.some(item => String(item.id) === selected)) {
      element.value = selected;
    }
  });
}

function renderInstrumentGoalInputs() {
  const container = document.getElementById("instrumentGoals");
  if (!container) return;

  container.innerHTML = "";

  if (instruments.length === 0) {
    const message = document.createElement("p");
    message.className = "empty-history";
    message.textContent = "Cadastre instrumentos para definir metas individuais.";
    container.appendChild(message);
    return;
  }

  instruments.forEach(instrument => {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    const inputId = `instrumentGoal-${instrument.id}`;
    label.htmlFor = inputId;
    label.textContent = `${instrument.name} (minutos por semana)`;

    const input = document.createElement("input");
    input.type = "number";
    input.id = inputId;
    input.min = "0";
    input.step = "5";
    input.placeholder = "Sem meta individual";
    input.dataset.instrumentId = String(instrument.id);
    input.value = practiceGoals.instruments[instrument.id] || "";

    group.append(label, input);
    container.appendChild(group);
  });
}

function getWeeklySessionTotals(weekOffset = 0) {
  const todayStart = getLocalDayStart();
  const weekStart = todayStart - ((6 + 7 * weekOffset) * 86400000);
  const weekEnd = weekStart + (7 * 86400000);
  const totals = { seconds: 0, instruments: {} };

  sessions.forEach(session => {
    const timestamp = getSessionTimestamp(session);
    if (timestamp === null || timestamp < weekStart || timestamp >= weekEnd) {
      return;
    }

    const duration = Number(session.duration || 0);
    totals.seconds += duration;

    if (session.instrumentId) {
      totals.instruments[session.instrumentId] =
        (totals.instruments[session.instrumentId] || 0) + duration;
    }
  });

  return totals;
}

function formatGoalMinutes(minutes) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}min`;
}

function createGoalProgressCard(title, seconds, targetMinutes) {
  const card = document.createElement("article");
  card.className = "goal-progress-card";

  const heading = document.createElement("div");
  heading.className = "goal-progress-heading";

  const name = document.createElement("strong");
  name.textContent = title;

  const value = document.createElement("span");
  const studiedMinutes = Math.floor(seconds / 60);
  value.textContent = targetMinutes > 0
    ? `${formatGoalMinutes(studiedMinutes)} / ${formatGoalMinutes(targetMinutes)}`
    : `${formatGoalMinutes(studiedMinutes)} estudados`;

  heading.append(name, value);
  card.appendChild(heading);

  if (targetMinutes > 0) {
    const progress = document.createElement("progress");
    progress.max = targetMinutes * 60;
    progress.value = Math.min(seconds, progress.max);
    progress.setAttribute(
      "aria-label",
      `Progresso da meta semanal de ${title}`
    );
    card.appendChild(progress);
  } else {
    const unset = document.createElement("p");
    unset.className = "goal-unset";
    unset.textContent = "Defina uma meta semanal para acompanhar seu progresso.";
    card.appendChild(unset);
  }

  return card;
}

function renderGoalProgress() {
  const container = document.getElementById("goalProgress");
  if (!container) return;

  const totals = getWeeklySessionTotals();
  container.innerHTML = "";
  container.appendChild(
    createGoalProgressCard(
      "Meta geral",
      totals.seconds,
      Number(practiceGoals.weekly) || 0
    )
  );

  instruments.forEach(instrument => {
    const target = Number(practiceGoals.instruments[instrument.id]) || 0;
    if (target <= 0) return;

    container.appendChild(
      createGoalProgressCard(
        instrument.name,
        totals.instruments[instrument.id] || 0,
        target
      )
    );
  });
}

function formatStudyDuration(seconds) {
  const minutes = Math.floor(Math.max(0, seconds) / 60);
  return `${Math.floor(minutes / 60)}h ${minutes % 60}min`;
}

function renderInstrumentRanking(monthStart, monthEnd) {
  const container = document.getElementById("instrumentRanking");
  if (!container) return;

  const totals = {};

  sessions.forEach(session => {
    const timestamp = getSessionTimestamp(session);
    if (
      timestamp === null ||
      timestamp < monthStart ||
      timestamp >= monthEnd ||
      !session.instrumentId
    ) {
      return;
    }

    totals[session.instrumentId] =
      (totals[session.instrumentId] || 0) + Number(session.duration || 0);
  });

  const ranking = Object.entries(totals)
    .map(([id, seconds]) => {
      const currentInstrument = instruments.find(
        item => String(item.id) === String(id)
      );
      const historicalName = sessions.find(
        session => String(session.instrumentId) === String(id)
      )?.instrumentName;

      return {
        name: currentInstrument?.name || historicalName || "Instrumento removido",
        seconds
      };
    })
    .sort((a, b) => b.seconds - a.seconds)
    .slice(0, 5);

  container.innerHTML = "";

  if (ranking.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "Ainda não há sessões por instrumento neste mês.";
    container.appendChild(empty);
    return;
  }

  const maximum = ranking[0].seconds || 1;
  ranking.forEach((entry, index) => {
    const row = document.createElement("div");
    row.className = "ranking-row";

    const rank = document.createElement("span");
    rank.className = "ranking-number";
    rank.textContent = String(index + 1).padStart(2, "0");

    const name = document.createElement("strong");
    name.textContent = entry.name;

    const bar = document.createElement("progress");
    bar.max = maximum;
    bar.value = entry.seconds;
    bar.setAttribute("aria-label", `Tempo de prática: ${entry.name}`);

    const duration = document.createElement("span");
    duration.className = "ranking-duration";
    duration.textContent = formatStudyDuration(entry.seconds);

    const details = document.createElement("div");
    details.className = "ranking-details";
    details.append(name, bar);
    row.append(rank, details, duration);
    container.appendChild(row);
  });
}

function renderGoalEvolution() {
  const container = document.getElementById("goalEvolution");
  if (!container) return;

  container.innerHTML = "";

  for (let offset = 3; offset >= 0; offset--) {
    const start = getLocalDayStart() - ((6 + 7 * offset) * 86400000);
    const end = start + (7 * 86400000);
    const totals = getWeeklySessionTotals(offset);
    const card = document.createElement("article");
    card.className = "goal-week";

    const heading = document.createElement("div");
    heading.className = "goal-week-heading";

    const label = document.createElement("strong");
    label.textContent = offset === 0
      ? "Últimos 7 dias"
      : `${formatDate(start)} – ${formatDate(end - 86400000)}`;

    const value = document.createElement("span");
    value.textContent = formatStudyDuration(totals.seconds);

    heading.append(label, value);
    card.appendChild(heading);

    const target = Number(practiceGoals.weekly) || 0;
    if (target > 0) {
      const progress = document.createElement("progress");
      progress.max = target * 60;
      progress.value = Math.min(totals.seconds, progress.max);
      progress.setAttribute("aria-label", `Meta geral: ${label.textContent}`);
      card.appendChild(progress);
    } else {
      const hint = document.createElement("p");
      hint.className = "goal-unset";
      hint.textContent = "Defina uma meta semanal para comparar.";
      card.appendChild(hint);
    }

    const instrumentGoals = instruments
      .map(instrument => ({
        instrument,
        target: Number(practiceGoals.instruments[instrument.id]) || 0
      }))
      .filter(item => item.target > 0);

    if (instrumentGoals.length > 0) {
      const details = document.createElement("details");
      details.className = "goal-week-instruments";

      const summary = document.createElement("summary");
      summary.textContent = "Metas por instrumento";
      details.appendChild(summary);

      instrumentGoals.forEach(({ instrument, target }) => {
        const row = document.createElement("div");
        row.className = "goal-week-instrument";

        const rowHeading = document.createElement("div");
        rowHeading.className = "goal-week-heading";

        const name = document.createElement("strong");
        name.textContent = instrument.name;

        const instrumentSeconds = totals.instruments[instrument.id] || 0;
        const amount = document.createElement("span");
        amount.textContent =
          `${formatStudyDuration(instrumentSeconds)} / ${formatGoalMinutes(target)}`;

        rowHeading.append(name, amount);

        const instrumentProgress = document.createElement("progress");
        instrumentProgress.max = target * 60;
        instrumentProgress.value = Math.min(instrumentSeconds, instrumentProgress.max);
        instrumentProgress.setAttribute(
          "aria-label",
          `Meta de ${instrument.name}: ${label.textContent}`
        );

        row.append(rowHeading, instrumentProgress);
        details.appendChild(row);
      });

      card.appendChild(details);
    }

    container.appendChild(card);
  }
}

function renderStudyStatistics() {
  const now = new Date();
  const todayStart = getLocalDayStart(now);
  const tomorrow = todayStart + 86400000;
  const weekStart = todayStart - (6 * 86400000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  let dailySeconds = 0;
  let weeklySeconds = 0;
  let monthlySeconds = 0;

  sessions.forEach(session => {
    const timestamp = getSessionTimestamp(session);
    if (timestamp === null) return;

    const duration = Number(session.duration || 0);
    if (timestamp >= todayStart && timestamp < tomorrow) dailySeconds += duration;
    if (timestamp >= weekStart && timestamp < tomorrow) weeklySeconds += duration;
    if (timestamp >= monthStart && timestamp < monthEnd) monthlySeconds += duration;
  });

  const dailyElement = document.getElementById("dailyStudyTime");
  const weeklyElement = document.getElementById("weeklyStudyTime");
  const monthlyElement = document.getElementById("monthlyStudyTime");

  if (dailyElement) dailyElement.textContent = formatStudyDuration(dailySeconds);
  if (weeklyElement) weeklyElement.textContent = formatStudyDuration(weeklySeconds);
  if (monthlyElement) monthlyElement.textContent = formatStudyDuration(monthlySeconds);

  renderInstrumentRanking(monthStart, monthEnd);
  renderGoalEvolution();
}

const goalsForm = document.getElementById("goalsForm");
if (goalsForm) {
  goalsForm.addEventListener("submit", event => {
    event.preventDefault();

    const previousGoals = practiceGoals;
    const instrumentTargets = Object.create(null);
    document.querySelectorAll("#instrumentGoals input[data-instrument-id]")
      .forEach(input => {
        const target = Number(input.value);
        if (target > 0) {
          instrumentTargets[input.dataset.instrumentId] = target;
        }
      });

    practiceGoals = {
      weekly: Number(document.getElementById("weeklyGoal").value) || 0,
      instruments: instrumentTargets
    };

    if (!saveGoals()) {
      practiceGoals = previousGoals;
      return;
    }

    renderInstrumentGoalInputs();
    renderGoalProgress();
    renderStudyStatistics();
    showNotice("Metas salvas.");
  });
}

// ---------- IMAGE COMPRESSION ----------

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("Selecione uma imagem válida.");
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error("A imagem deve ter no máximo 10 MB.");
  }

  if (!window.createImageBitmap) {
    throw new Error("Seu navegador não oferece suporte à compressão.");
  }

  const bitmap = await createImageBitmap(file);

  const maxDimension = 800;

  const scale = Math.min(
    1,
    maxDimension / Math.max(bitmap.width, bitmap.height)
  );

  const canvas = document.createElement("canvas");

  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");

  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let quality = 0.75;
  let imageData = canvas.toDataURL("image/jpeg", quality);

  while (imageData.length > 350000 && quality > 0.3) {
    quality -= 0.1;
    imageData = canvas.toDataURL("image/jpeg", quality);
  }

  if (imageData.length > 350000) {
    throw new Error("Imagem muito grande. Tente uma foto menor.");
  }

  return imageData;
}

// ---------- INSTRUMENT REGISTRATION ----------

function getInstrumentFormValues() {
  return {
    name: document.getElementById("instrumentName")?.value.trim() || "",
    category: document.getElementById("instrumentCategory")?.value || "",
    brand: document.getElementById("instrumentBrand")?.value.trim() || "",
    condition: document.getElementById("instrumentCondition")?.value || ""
  };
}

if (instrumentForm) {
  instrumentForm.addEventListener("submit", async event => {
    event.preventDefault();

    const values = getInstrumentFormValues();

    if (!values.name) {
      showNotice("Informe o nome do instrumento.", "error");
      return;
    }

    const submitButton = instrumentForm.querySelector('[type="submit"]');

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Salvando...";
    }

    try {
      let image = "";

      if (instrumentImageInput?.files?.[0]) {
        image = await compressImage(instrumentImageInput.files[0]);
      }

      const now = Date.now();

      const newInstrument = {
        id: now,
        createdAt: now,
        ...values,
        model: "",
        serial: "",
        purchaseDate: "",
        price: "",
        notes: "",
        image,
        maintenance: []
      };

      instruments.unshift(newInstrument);

      if (!saveInstruments()) {
        instruments.shift();
        return;
      }

      instrumentForm.reset();

      renderInstruments();
      renderInstrumentGoalInputs();
      updateDashboard();
      renderStudioOverview();

      showNotice("Instrumento cadastrado com sucesso.");

    } catch (error) {
      console.error("Erro ao adicionar instrumento:", error);
      showNotice(error.message || "Não foi possível adicionar a imagem.", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "+ Adicionar instrumento";
      }
    }
  });
}

// ---------- INSTRUMENT LIST ----------

function renderInstruments() {
  if (!instrumentList) return;

  refreshStudyInstrumentOptions();
  instrumentList.innerHTML = "";

  const searchTerm = instrumentSearch?.value.toLowerCase().trim() || "";
  const selectedCategory = instrumentFilter?.value || "Todos";
  const selectedCondition = instrumentConditionFilter?.value || "Todos";
  const selectedSort = instrumentSort?.value || "recent";

  const filteredInstruments = instruments.filter(instrument => {
    const searchableText = [
      instrument.name,
      instrument.brand,
      instrument.model,
      instrument.category
    ].join(" ").toLowerCase();

    return (
      searchableText.includes(searchTerm) &&
      (
        selectedCategory === "Todos" ||
        instrument.category === selectedCategory
      ) &&
      (
        selectedCondition === "Todos" ||
        instrument.condition === selectedCondition
      )
    );
  });

  filteredInstruments.sort((first, second) => {
    if (selectedSort === "name-asc") {
      return String(first.name).localeCompare(String(second.name), "pt-BR");
    }

    if (selectedSort === "name-desc") {
      return String(second.name).localeCompare(String(first.name), "pt-BR");
    }

    return Number(second.createdAt || second.id) - Number(first.createdAt || first.id);
  });

  if (filteredInstruments.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = instruments.length === 0
      ? "Sua coleção está vazia. Cadastre um instrumento no formulário acima."
      : "Nenhum instrumento corresponde aos filtros. Ajuste a busca ou os filtros.";

    instrumentList.appendChild(empty);
    return;
  }

  filteredInstruments.forEach(instrument => {
    const card = document.createElement("article");
    card.className = "instrument-card";

    const main = document.createElement("div");
    main.className = "instrument-main";

    if (instrument.image) {
      const image = document.createElement("img");
      image.className = "instrument-photo";
      image.src = instrument.image;
      image.alt = `Foto de ${instrument.name}`;

      main.appendChild(image);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "instrument-placeholder";
      placeholder.appendChild(createIcon("music"));

      main.appendChild(placeholder);
    }

    const info = document.createElement("div");
    info.className = "instrument-info";

    const name = document.createElement("h3");
    name.textContent = instrument.name;

    const details = document.createElement("p");

    details.textContent = [
      instrument.brand || "Marca não informada",
      instrument.category || "Categoria não informada",
      instrument.condition || ""
    ].filter(Boolean).join(" • ");

    info.append(name, details);
    main.appendChild(info);

    const actions = document.createElement("div");
    actions.className = "instrument-actions";

    const detailsButton = document.createElement("button");
    detailsButton.className = "btn btn-secondary";
    detailsButton.textContent = "Detalhes";

    detailsButton.addEventListener("click", () => {
      openInstrumentDetails(instrument.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "btn btn-danger";
    deleteButton.textContent = "Excluir";

    deleteButton.addEventListener("click", () => {
      deleteInstrument(instrument.id);
    });

    actions.append(detailsButton, deleteButton);
    card.append(main, actions);

    instrumentList.appendChild(card);
  });
}

if (instrumentSearch) {
  instrumentSearch.addEventListener("input", renderInstruments);
}

if (instrumentFilter) {
  instrumentFilter.addEventListener("change", renderInstruments);
}
if (instrumentConditionFilter) {
  instrumentConditionFilter.addEventListener("change", renderInstruments);
}
if (instrumentSort) {
  instrumentSort.addEventListener("change", renderInstruments);
}

// ---------- DELETE INSTRUMENT ----------

function deleteInstrument(id) {
  if (!confirm("Excluir este instrumento? Esta ação não pode ser desfeita.")) {
    return;
  }

  const previousInstruments = [...instruments];

  instruments = instruments.filter(instrument => instrument.id !== id);

  if (!saveInstruments()) {
    instruments = previousInstruments;
    return;
  }

  renderInstruments();
  renderInstrumentGoalInputs();
  updateDashboard();
  renderStudioOverview();
  showNotice("Instrumento excluído.");
}

// ---------- INSTRUMENT DETAILS ----------

function openInstrumentDetails(id) {
  const instrument = instruments.find(item => item.id === id);

  if (!instrument) return;

  selectedInstrumentId = id;
  setActiveNavigation(instrumentsLink);

  if (dashboardView) dashboardView.hidden = true;
  if (instrumentDetailView) instrumentDetailView.hidden = false;
  animateViewTransition(instrumentDetailView);

  const detailName = document.getElementById("detailName");
  const detailSubtitle = document.getElementById("detailSubtitle");

  if (detailName) detailName.textContent = instrument.name;

  if (detailSubtitle) {
    detailSubtitle.textContent = [
      instrument.brand,
      instrument.category
    ].filter(Boolean).join(" • ");
  }

  const fields = {
    detailModel: instrument.model,
    detailSerial: instrument.serial,
    detailPurchaseDate: instrument.purchaseDate,
    detailPrice: instrument.price,
    detailCondition: instrument.condition,
    detailNotes: instrument.notes
  };

  Object.entries(fields).forEach(([id, value]) => {
    const element = document.getElementById(id);

    if (element) element.value = value || "";
  });

  renderInstrumentImage(instrument);
  renderMaintenance(instrument);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- INSTRUMENT IMAGE ----------

function renderInstrumentImage(instrument) {
  const heading = document.querySelector(".detail-heading");

  if (!heading) return;

  const existingImage = document.getElementById("detailInstrumentImage");

  if (existingImage) existingImage.remove();

  if (!instrument.image) return;

  const image = document.createElement("img");

  image.id = "detailInstrumentImage";
  image.className = "detail-instrument-image";
  image.src = instrument.image;
  image.alt = `Foto de ${instrument.name}`;

  heading.parentNode.insertBefore(image, heading);
}

// ---------- SAVE INSTRUMENT DETAILS ----------

if (instrumentDetailsForm) {
  instrumentDetailsForm.addEventListener("submit", event => {
    event.preventDefault();

    const instrument = instruments.find(
      item => item.id === selectedInstrumentId
    );

    if (!instrument) return;

    const previousInstrument = { ...instrument };

    instrument.model =
      document.getElementById("detailModel")?.value.trim() || "";

    instrument.serial =
      document.getElementById("detailSerial")?.value.trim() || "";

    instrument.purchaseDate =
      document.getElementById("detailPurchaseDate")?.value || "";

    instrument.price =
      document.getElementById("detailPrice")?.value || "";

    instrument.condition =
      document.getElementById("detailCondition")?.value || "";

    instrument.notes =
      document.getElementById("detailNotes")?.value.trim() || "";

    if (!saveInstruments()) {
      Object.assign(instrument, previousInstrument);
      return;
    }

    renderInstruments();
    renderInstrumentGoalInputs();
    updateDashboard();
    renderStudioOverview();

    showNotice("Detalhes atualizados.");
  });
}

// ---------- BACK TO DASHBOARD ----------

function showDashboard() {
  selectedInstrumentId = null;

  if (instrumentDetailView) instrumentDetailView.hidden = true;
  if (dashboardView) dashboardView.hidden = false;
  animateViewTransition(dashboardView);

  renderInstruments();
  updateDashboard();
  renderStudioOverview();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function animateViewTransition(element) {
  if (!element) return;

  element.classList.remove("view-enter");
  void element.offsetWidth;
  element.classList.add("view-enter");
  element.addEventListener(
    "animationend",
    () => element.classList.remove("view-enter"),
    { once: true }
  );
}

if (backToInstruments) {
  backToInstruments.addEventListener("click", showDashboard);
}

// ---------- MAINTENANCE ----------

if (maintenanceForm) {
  maintenanceForm.addEventListener("submit", event => {
    event.preventDefault();

    const instrument = instruments.find(
      item => item.id === selectedInstrumentId
    );

    if (!instrument) return;

    const dateInput = document.getElementById("maintenanceDate");
    const descriptionInput = document.getElementById("maintenanceDescription");

    const date = dateInput?.value || "";
    const description = descriptionInput?.value.trim() || "";

    if (!description) {
      showNotice("Descreva o serviço realizado.", "error");
      return;
    }

    if (!Array.isArray(instrument.maintenance)) {
      instrument.maintenance = [];
    }

    const record = {
      id: Date.now(),
      date: date || new Date().toISOString().slice(0, 10),
      description
    };

    instrument.maintenance.unshift(record);

    if (!saveInstruments()) {
      instrument.maintenance.shift();
      return;
    }

    maintenanceForm.reset();

    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10);
    }

    renderMaintenance(instrument);
    renderStudioOverview();

    showNotice("Manutenção registrada.");
  });
}

function renderMaintenance(instrument) {
  const container = document.getElementById("maintenanceHistory");

  if (!container) return;

  container.innerHTML = "";

  const records = instrument.maintenance || [];

  if (records.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-history";
    empty.textContent = "Nenhuma manutenção registrada.";

    container.appendChild(empty);
    return;
  }

  records.forEach(record => {
    const item = document.createElement("div");
    item.className = "maintenance-item";

    const date = document.createElement("strong");

    date.textContent = record.date
      ? new Date(`${record.date}T12:00:00`).toLocaleDateString("pt-BR")
      : "Data não informada";

    const description = document.createElement("p");
    description.textContent = record.description;

    item.append(date, description);
    container.appendChild(item);
  });
}

// ---------- BACKUP AND EXPORT ----------

function createBackupSnapshot({ includeUnreadable = false } = {}) {
  if (storageReadErrors.size > 0 && !includeUnreadable) {
    throw new Error(
      "Há dados locais que não puderam ser lidos. Restaure um backup antes de exportar uma cópia completa."
    );
  }

  const snapshot = {
    format: "SONORA_BACKUP",
    version: 1,
    exportedAt: new Date().toISOString(),
    instruments,
    sessions,
    goals: practiceGoals
  };

  if (includeUnreadable && storageReadErrors.size > 0) {
    snapshot.unreadableStorage = {};
    storageReadErrors.forEach(key => {
      snapshot.unreadableStorage[key] = localStorage.getItem(key);
    });
  }

  return snapshot;
}

function normalizeBackup(payload) {
  if (
    !payload ||
    typeof payload !== "object" ||
    payload.format !== "SONORA_BACKUP" ||
    payload.version !== 1 ||
    !Array.isArray(payload.instruments) ||
    !Array.isArray(payload.sessions) ||
    !payload.goals ||
    typeof payload.goals !== "object" ||
    Array.isArray(payload.goals)
  ) {
    throw new Error("Este arquivo não é um backup válido do SONORA.");
  }

  const instrumentIds = new Set();
  const restoredInstruments = payload.instruments.map(instrument => {
    if (
      !instrument ||
      typeof instrument !== "object" ||
      !["string", "number"].includes(typeof instrument.id) ||
      (typeof instrument.id === "string" && !instrument.id.trim()) ||
      (typeof instrument.id === "number" && !Number.isFinite(instrument.id)) ||
      !String(instrument.name || "").trim()
    ) {
      throw new Error("O backup contém um instrumento inválido.");
    }

    const id = String(instrument.id);
    if (instrumentIds.has(id)) {
      throw new Error("O backup contém instrumentos com identificadores repetidos.");
    }
    instrumentIds.add(id);

    const image = instrument.image || "";
    if (
      typeof image !== "string" ||
      (image && !/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(image))
    ) {
      throw new Error("O backup contém uma imagem de instrumento inválida.");
    }

    return {
      ...instrument,
      name: String(instrument.name).trim(),
      image,
      maintenance: Array.isArray(instrument.maintenance)
        ? instrument.maintenance
        : []
    };
  });

  const restoredSessions = payload.sessions.map(session => {
    if (
      !session ||
      typeof session !== "object" ||
      !Number.isFinite(Number(session.duration)) ||
      Number(session.duration) <= 0 ||
      getSessionTimestamp(session) === null
    ) {
      throw new Error("O backup contém uma sessão inválida.");
    }

    return {
      ...session,
      duration: Number(session.duration),
      mode: session.mode === "planned" ? "planned" : "free",
      instrumentId: session.instrumentId == null ? null : session.instrumentId,
      instrumentName: String(session.instrumentName || ""),
      objective: String(session.objective || ""),
      content: String(session.content || ""),
      difficulty: String(session.difficulty || ""),
      notes: String(session.notes || "")
    };
  });

  const goalTargets = payload.goals.instruments &&
    typeof payload.goals.instruments === "object" &&
    !Array.isArray(payload.goals.instruments)
    ? payload.goals.instruments
    : {};
  if (
    payload.goals.instruments != null &&
    (typeof payload.goals.instruments !== "object" ||
      Array.isArray(payload.goals.instruments))
  ) {
    throw new Error("O backup contém metas por instrumento inválidas.");
  }
  const weeklyGoal = payload.goals.weekly == null
    ? 0
    : Number(payload.goals.weekly);

  if (!Number.isFinite(weeklyGoal) || weeklyGoal < 0) {
    throw new Error("O backup contém uma meta semanal inválida.");
  }

  const restoredInstrumentGoals = Object.create(null);
  Object.entries(goalTargets).forEach(([id, value]) => {
    const target = Number(value);
    if (!Number.isFinite(target) || target < 0) {
      throw new Error("O backup contém uma meta por instrumento inválida.");
    }
    if (target > 0) restoredInstrumentGoals[id] = target;
  });

  return {
    instruments: restoredInstruments,
    sessions: restoredSessions,
    goals: { weekly: weeklyGoal, instruments: restoredInstrumentGoals }
  };
}

function restoreLocalStorageValues(previousValues) {
  Object.entries(previousValues).forEach(([key, value]) => {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  });
}

function persistRestoredBackup(backup) {
  const previousValues = {
    [INSTRUMENTS_KEY]: localStorage.getItem(INSTRUMENTS_KEY),
    [SESSIONS_KEY]: localStorage.getItem(SESSIONS_KEY),
    [GOALS_KEY]: localStorage.getItem(GOALS_KEY)
  };

  try {
    localStorage.setItem(INSTRUMENTS_KEY, JSON.stringify(backup.instruments));
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(backup.sessions));
    localStorage.setItem(GOALS_KEY, JSON.stringify(backup.goals));
  } catch (error) {
    try {
      restoreLocalStorageValues(previousValues);
    } catch (rollbackError) {
      console.error("Falha ao restaurar os dados locais anteriores:", rollbackError);
    }
    throw new Error(
      "Não foi possível restaurar o backup. Libere espaço no armazenamento e tente novamente."
    );
  }

  instruments = backup.instruments;
  sessions = backup.sessions;
  practiceGoals = backup.goals;
  storageReadErrors.clear();

  if (instrumentSearch) instrumentSearch.value = "";
  if (instrumentFilter) instrumentFilter.value = "Todos";
  if (instrumentConditionFilter) instrumentConditionFilter.value = "Todos";
  if (instrumentSort) instrumentSort.value = "recent";

  renderInstruments();
  renderInstrumentGoalInputs();
  document.getElementById("weeklyGoal").value = practiceGoals.weekly || "";
  renderHistory();
  renderGoalProgress();
  updateDashboard();
  renderStudioOverview();
}

const exportBackupButton = document.getElementById("exportBackupButton");
if (exportBackupButton) {
  exportBackupButton.addEventListener("click", () => {
    try {
      window.SONORA_DATA_TOOLS.exportJson(
        `sonora-backup-${new Date().toISOString().slice(0, 10)}.json`,
        createBackupSnapshot()
      );
      showNotice("Backup JSON exportado.");
    } catch (error) {
      console.error("Erro ao exportar backup:", error);
      showNotice("Não foi possível exportar o backup.", "error");
    }
  });
}

const exportSessionsCsvButton = document.getElementById("exportSessionsCsvButton");
if (exportSessionsCsvButton) {
  exportSessionsCsvButton.addEventListener("click", () => {
    try {
      if (storageReadErrors.has(SESSIONS_KEY)) {
        throw new Error(
          "O histórico não pôde ser lido. Restaure um backup antes de exportar o CSV."
        );
      }

      window.SONORA_DATA_TOOLS.exportSessionsCsv(
        `sonora-sessoes-${new Date().toISOString().slice(0, 10)}.csv`,
        sessions
      );
      showNotice("Histórico CSV exportado.");
    } catch (error) {
      console.error("Erro ao exportar histórico:", error);
      showNotice("Não foi possível exportar o histórico.", "error");
    }
  });
}

const restoreBackupFile = document.getElementById("restoreBackupFile");
const chooseRestoreFileButton = document.getElementById("chooseRestoreFile");
if (chooseRestoreFileButton && restoreBackupFile) {
  chooseRestoreFileButton.addEventListener("click", () => {
    restoreBackupFile.click();
  });
}

if (restoreBackupFile) {
  restoreBackupFile.addEventListener("change", async () => {
    const file = restoreBackupFile.files?.[0];
    if (!file) return;

    try {
      if (sessionActive) {
        throw new Error("Finalize ou reinicie a prática antes de restaurar um backup.");
      }

      const payload = await window.SONORA_DATA_TOOLS.readJsonFile(file);
      const backup = normalizeBackup(payload);

      if (!confirm(
        "Restaurar este backup substituirá os instrumentos, sessões e metas atuais. " +
        "Um backup dos dados atuais será baixado antes da restauração. Continuar?"
      )) {
        return;
      }

      window.SONORA_DATA_TOOLS.exportJson(
        `sonora-backup-anterior-${new Date().toISOString().slice(0, 10)}.json`,
        createBackupSnapshot({ includeUnreadable: true })
      );
      persistRestoredBackup(backup);
      showNotice("Backup restaurado com sucesso.");
    } catch (error) {
      console.error("Erro ao restaurar backup:", error);
      showNotice(error.message || "Não foi possível restaurar o backup.", "error");
    } finally {
      restoreBackupFile.value = "";
    }
  });
}

// ---------- NAVIGATION ----------

const dashboardLink = document.getElementById("dashboardLink");
const instrumentsLink = document.getElementById("instrumentsLink");

function setActiveNavigation(link) {
  document.querySelectorAll(".sidebar nav a").forEach(item => {
    item.classList.toggle("active", item === link);
  });
}

document.querySelectorAll(".sidebar nav a").forEach(link => {
  link.addEventListener("click", () => setActiveNavigation(link));
});

if (dashboardLink) {
  dashboardLink.addEventListener("click", event => {
    event.preventDefault();
    showDashboard();

    document.getElementById("dashboard")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

if (instrumentsLink) {
  instrumentsLink.addEventListener("click", event => {
    event.preventDefault();
    showDashboard();

    document.getElementById("instruments")?.scrollIntoView({
      behavior: "smooth"
    });
  });
}

// ---------- QUICK ACTIONS ----------

const quickPracticeLink = document.querySelector(
  '.quick-action-buttons a[href="#studies"]'
);

if (quickPracticeLink) {
  quickPracticeLink.addEventListener("click", event => {
    event.preventDefault();

    if (sessionMode && sessionMode.value !== "free") {
      sessionMode.value = "free";
      sessionMode.dispatchEvent(new Event("change"));
    }

    showDashboard();

    document.getElementById("studies")?.scrollIntoView({
      behavior: "smooth"
    });

    startTimer();
  });
}

// ---------- INITIALIZATION ----------

function initializeSonora() {
  renderInstruments();
  refreshStudyInstrumentOptions();
  renderInstrumentGoalInputs();
  document.getElementById("weeklyGoal").value =
    practiceGoals.weekly || "";

  if (sessionMode) sessionMode.dispatchEvent(new Event("change"));

  renderHistory();
  renderGoalProgress();

  updateDashboard();
  renderStudioOverview();

  const maintenanceDate = document.getElementById("maintenanceDate");

  if (maintenanceDate && !maintenanceDate.value) {
    maintenanceDate.value = new Date().toISOString().slice(0, 10);
  }
}

initializeSonora();
