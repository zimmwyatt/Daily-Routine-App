const STORAGE_KEY = "daily-routine-tracker-v1";

const defaultTasks = [
  { id: crypto.randomUUID(), name: "Wake up and stretch", time: "07:00", note: "", completedDays: {} },
  { id: crypto.randomUUID(), name: "Drink water", time: "08:00", note: "", completedDays: {} },
  { id: crypto.randomUUID(), name: "Go for a walk", time: "12:30", note: "", completedDays: {} },
  { id: crypto.randomUUID(), name: "Read for 15 minutes", time: "20:30", note: "", completedDays: {} }
];

const taskForm = document.querySelector("#taskForm");
const taskNameInput = document.querySelector("#taskName");
const taskTimeInput = document.querySelector("#taskTime");
const taskList = document.querySelector("#taskList");
const taskTemplate = document.querySelector("#taskTemplate");
const todayLabel = document.querySelector("#todayLabel");
const progressPercent = document.querySelector("#progressPercent");
const progressText = document.querySelector("#progressText");
const progressFill = document.querySelector("#progressFill");
const sectionMeta = document.querySelector("#sectionMeta");

let state = loadState();
const openNotes = new Set();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const initialState = { tasks: defaultTasks };
    persistState(initialState);
    return initialState;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed.tasks)) {
      throw new Error("Invalid saved data");
    }

    return {
      tasks: parsed.tasks.map((task) => ({
        id: task.id || crypto.randomUUID(),
        name: String(task.name || "").trim() || "Untitled task",
        time: String(task.time || ""),
        note: String(task.note || ""),
        completedDays: task.completedDays && typeof task.completedDays === "object" ? task.completedDays : {}
      }))
    };
  } catch {
    const fallbackState = { tasks: defaultTasks };
    persistState(fallbackState);
    return fallbackState;
  }
}

function persistState(nextState = state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTodayKey() {
  return getDateKey(new Date());
}

function formatTodayLabel() {
  const formatter = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });

  todayLabel.textContent = formatter.format(new Date());
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) {
      return a.name.localeCompare(b.name);
    }
    if (!a.time) {
      return 1;
    }
    if (!b.time) {
      return -1;
    }
    return a.time.localeCompare(b.time) || a.name.localeCompare(b.name);
  });
}

function isTaskDoneToday(task) {
  return Boolean(task.completedDays[getTodayKey()]);
}

function setTaskDone(taskId, done) {
  const todayKey = getTodayKey();
  state = {
    ...state,
    tasks: state.tasks.map((task) => {
      if (task.id !== taskId) {
        return task;
      }

      const completedDays = { ...task.completedDays };
      if (done) {
        completedDays[todayKey] = true;
      } else {
        delete completedDays[todayKey];
      }

      return { ...task, completedDays };
    })
  };
  persistState();
  render();
}

function getTaskStreak(task) {
  let streak = 0;
  const cursor = new Date();

  while (true) {
    const key = getDateKey(cursor);
    if (!task.completedDays[key]) {
      break;
    }
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function addTask(name, time) {
  state = {
    ...state,
    tasks: [
      ...state.tasks,
      {
        id: crypto.randomUUID(),
        name,
        time,
        note: "",
        completedDays: {}
      }
    ]
  };
  persistState();
  render();
}

function deleteTask(taskId) {
  openNotes.delete(taskId);
  state = {
    ...state,
    tasks: state.tasks.filter((task) => task.id !== taskId)
  };
  persistState();
  render();
}

function updateTaskNote(taskId, note) {
  state = {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? { ...task, note }
        : task
    )
  };
  persistState();
}

function toggleTaskNote(taskId) {
  if (openNotes.has(taskId)) {
    openNotes.delete(taskId);
  } else {
    openNotes.add(taskId);
  }
  render();
}

function updateProgress(sortedTasks) {
  const total = sortedTasks.length;
  const completed = sortedTasks.filter(isTaskDoneToday).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressPercent.textContent = `${percent}%`;
  progressText.textContent = `${completed} of ${total} tasks complete`;
  sectionMeta.textContent = total === 0
    ? "Add your first routine item above."
    : completed === total
      ? "Everything for today is checked off."
      : "Tap a circle to mark something done.";

  progressFill.style.width = `${percent}%`;
}

function createNotePanelContent(panel, note, taskId) {
  panel.innerHTML = `
    <div class="note-panel-inner">
      <label class="note-field">
        <span class="note-label">Note</span>
        <textarea class="note-input" rows="4" placeholder="Add a note or description for this task..."></textarea>
      </label>
    </div>
  `;

  const noteInput = panel.querySelector(".note-input");
  noteInput.value = note;
  noteInput.addEventListener("input", (event) => {
    updateTaskNote(taskId, event.target.value);
  });
}

function render() {
  const sortedTasks = sortTasks(state.tasks);
  taskList.innerHTML = "";

  for (const task of sortedTasks) {
    const fragment = taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".task-item");
    const toggle = fragment.querySelector(".toggle");
    const name = fragment.querySelector(".task-name");
    const time = fragment.querySelector(".task-time");
    const statusPill = fragment.querySelector(".status-pill");
    const noteButton = fragment.querySelector(".note-button");
    const deleteButton = fragment.querySelector(".delete-button");
    const notePanel = fragment.querySelector(".note-panel");

    const doneToday = isTaskDoneToday(task);
    const streak = getTaskStreak(task);
    const noteIsOpen = openNotes.has(task.id);

    item.dataset.id = task.id;
    item.classList.toggle("is-complete", doneToday);
    item.classList.toggle("note-open", noteIsOpen);
    name.textContent = task.name;
    time.textContent = formatTime(task.time);
    toggle.setAttribute("aria-pressed", String(doneToday));
    noteButton.textContent = "Add Note";
    noteButton.setAttribute("aria-expanded", String(noteIsOpen));
    statusPill.textContent = doneToday
      ? streak > 1
        ? `${streak} day streak`
        : "Done today"
      : streak > 0
        ? `Last streak: ${streak} day${streak === 1 ? "" : "s"}`
        : "Pending";

    createNotePanelContent(notePanel, task.note, task.id);

    toggle.addEventListener("click", () => setTaskDone(task.id, !doneToday));
    noteButton.addEventListener("click", () => toggleTaskNote(task.id));
    deleteButton.addEventListener("click", () => deleteTask(task.id));

    taskList.appendChild(fragment);
  }

  updateProgress(sortedTasks);
}

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = taskNameInput.value.trim();
  const time = taskTimeInput.value;

  if (!name) {
    taskNameInput.focus();
    return;
  }

  addTask(name, time);
  taskForm.reset();
  taskNameInput.focus();
});

formatTodayLabel();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // If registration fails, the app still works as a normal static site.
    });
  });
}

