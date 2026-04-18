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
let openPanelTaskId = null;
let openPanelType = null;
const editingNotes = new Set();
const noteDrafts = new Map();
const taskDrafts = new Map();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    const initialState = { tasks: defaultTasks };
    persistState(initialState);
    return initialState;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!parsed || !Array.isArray(parsed.tasks)) {
      throw new Error("Invalid saved data");
    }

    return {
      tasks: parsed.tasks.map((task) => ({
        id: task.id || crypto.randomUUID(),
        name: String(task.name || "").trim() || "Untitled task",
        time: String(task.time || ""),
        note: String(task.note || ""),
        completedDays:
          task.completedDays && typeof task.completedDays === "object"
            ? task.completedDays
            : {}
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
    return "Any time";
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
  closePanels(taskId);

  state = {
    ...state,
    tasks: state.tasks.filter((task) => task.id !== taskId)
  };

  persistState();
  render();
}

function closePanels(taskId) {
  if (!taskId || openPanelTaskId === taskId) {
    openPanelTaskId = null;
    openPanelType = null;
  }

  if (taskId) {
    editingNotes.delete(taskId);
    noteDrafts.delete(taskId);
    taskDrafts.delete(taskId);
  }
}

function openNotePanel(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  openPanelTaskId = taskId;
  openPanelType = "note";
  editingNotes.delete(taskId);
  noteDrafts.set(taskId, task ? task.note : "");
  taskDrafts.delete(taskId);
}

function toggleTaskNote(taskId) {
  if (openPanelTaskId === taskId && openPanelType === "note") {
    closePanels(taskId);
  } else {
    closePanels(openPanelTaskId);
    openNotePanel(taskId);
  }

  render();
}

function enterEditNoteMode(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  openPanelTaskId = taskId;
  openPanelType = "note";
  editingNotes.add(taskId);
  noteDrafts.set(taskId, task ? task.note : "");
  render();
}

function updateNoteDraft(taskId, value) {
  noteDrafts.set(taskId, value);
}

function saveTaskNote(taskId) {
  const nextNote = (noteDrafts.get(taskId) || "").trim();

  state = {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? { ...task, note: nextNote }
        : task
    )
  };

  persistState();
  editingNotes.delete(taskId);
  noteDrafts.set(taskId, nextNote);
  render();
}

function openEditPanel(taskId) {
  const task = state.tasks.find((entry) => entry.id === taskId);
  openPanelTaskId = taskId;
  openPanelType = "edit";
  editingNotes.delete(taskId);
  noteDrafts.delete(taskId);
  taskDrafts.set(taskId, {
    name: task ? task.name : "",
    time: task ? task.time : ""
  });
}

function toggleTaskEdit(taskId) {
  if (openPanelTaskId === taskId && openPanelType === "edit") {
    closePanels(taskId);
  } else {
    closePanels(openPanelTaskId);
    openEditPanel(taskId);
  }

  render();
}

function updateTaskDraft(taskId, field, value) {
  const current = taskDrafts.get(taskId) || { name: "", time: "" };
  taskDrafts.set(taskId, { ...current, [field]: value });
}

function saveTaskChanges(taskId) {
  const draft = taskDrafts.get(taskId);
  if (!draft) {
    return;
  }

  const nextName = draft.name.trim();
  if (!nextName) {
    return;
  }

  state = {
    ...state,
    tasks: state.tasks.map((task) =>
      task.id === taskId
        ? { ...task, name: nextName, time: draft.time }
        : task
    )
  };

  persistState();
  closePanels(taskId);
  render();
}

function updateProgress(sortedTasks) {
  const total = sortedTasks.length;
  const completed = sortedTasks.filter(isTaskDoneToday).length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  progressPercent.textContent = `${percent}%`;
  progressText.textContent = `${completed} of ${total} tasks complete`;
  sectionMeta.textContent =
    total === 0
      ? "Add your first routine item above."
      : completed === total
        ? "Everything for today is checked off."
        : "Tap a circle to mark something done.";

  progressFill.style.width = `${percent}%`;
}

function renderTaskNote(task, notePanel) {
  const noteView = notePanel.querySelector(".note-view");
  const noteEdit = notePanel.querySelector(".note-edit");
  const noteContent = notePanel.querySelector(".note-content");
  const editNoteButton = notePanel.querySelector(".edit-note-button");
  const noteInput = notePanel.querySelector(".note-input");
  const saveNoteButton = notePanel.querySelector(".save-note-button");

  const shouldShowEdit = editingNotes.has(task.id) && openPanelTaskId === task.id && openPanelType === "note";
  const savedNote = task.note.trim();
  const draftNote = noteDrafts.has(task.id) ? noteDrafts.get(task.id) : task.note;

  noteView.hidden = shouldShowEdit;
  noteEdit.hidden = !shouldShowEdit;
  noteContent.textContent = savedNote || "No note added";
  noteContent.classList.toggle("is-empty", !savedNote);
  noteInput.value = draftNote;

  editNoteButton.onclick = () => enterEditNoteMode(task.id);
  noteInput.oninput = (event) => {
    updateNoteDraft(task.id, event.target.value);
  };
  saveNoteButton.onclick = () => saveTaskNote(task.id);
}

function renderTaskEdit(task, editPanel) {
  const nameInput = editPanel.querySelector(".edit-task-name");
  const timeInput = editPanel.querySelector(".edit-task-time");
  const saveTaskButton = editPanel.querySelector(".save-task-button");
  const draft = taskDrafts.get(task.id) || { name: task.name, time: task.time };

  nameInput.value = draft.name;
  timeInput.value = draft.time;

  nameInput.oninput = (event) => {
    updateTaskDraft(task.id, "name", event.target.value);
  };
  timeInput.oninput = (event) => {
    updateTaskDraft(task.id, "time", event.target.value);
  };
  saveTaskButton.onclick = () => saveTaskChanges(task.id);
}

function render() {
  const sortedTasks = sortTasks(state.tasks);
  taskList.innerHTML = "";

  for (const task of sortedTasks) {
    const fragment = taskTemplate.content.cloneNode(true);
    const item = fragment.querySelector(".task-item");
    const toggle = fragment.querySelector(".toggle");
    const time = fragment.querySelector(".task-time");
    const name = fragment.querySelector(".task-name");
    const editTaskButton = fragment.querySelector(".edit-task-button");
    const noteButton = fragment.querySelector(".note-button");
    const deleteButton = fragment.querySelector(".delete-button");
    const notePanel = fragment.querySelector(".note-panel");
    const editPanel = fragment.querySelector(".edit-panel");

    const doneToday = isTaskDoneToday(task);
    const noteIsOpen = openPanelTaskId === task.id && openPanelType === "note";
    const editIsOpen = openPanelTaskId === task.id && openPanelType === "edit";

    item.dataset.id = task.id;
    item.classList.toggle("is-complete", doneToday);
    item.classList.toggle("note-open", noteIsOpen);
    item.classList.toggle("edit-open", editIsOpen);

    toggle.setAttribute("aria-pressed", String(doneToday));
    noteButton.setAttribute("aria-expanded", String(noteIsOpen));
    editTaskButton.setAttribute("aria-expanded", String(editIsOpen));
    time.textContent = formatTime(task.time);
    name.textContent = task.name;

    renderTaskNote(task, notePanel);
    renderTaskEdit(task, editPanel);

    toggle.onclick = () => setTaskDone(task.id, !doneToday);
    editTaskButton.onclick = () => toggleTaskEdit(task.id);
    noteButton.onclick = () => toggleTaskNote(task.id);
    deleteButton.onclick = () => deleteTask(task.id);

    taskList.appendChild(fragment);
  }

  updateProgress(sortedTasks);
}

taskForm.onsubmit = (event) => {
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
};

formatTodayLabel();
render();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {
      // If registration fails, the app still works as a normal static site.
    });
  });
}
