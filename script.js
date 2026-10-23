const STORAGE_KEY = "connected-calendar-events-v1";

const typeInfo = {
  assignment: { label: "과제" },
  appointment: { label: "약속" },
  personal: { label: "개인" },
  other: { label: "기타" },
};

const calendarGrid = document.querySelector("#calendar-grid");
const currentMonthLabel = document.querySelector("#current-month");
const selectedDateHeading = document.querySelector("#selected-date-heading");
const eventCount = document.querySelector("#event-count");
const dayEvents = document.querySelector("#day-events");
const eventForm = document.querySelector("#event-form");
const eventDateInput = document.querySelector("#event-date");
const eventLinks = document.querySelector("#event-links");
const formMessage = document.querySelector("#form-message");
const formKicker = document.querySelector("#form-kicker");
const formHeading = document.querySelector("#form-heading");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const weeklyGrid = document.querySelector("#weekly-grid");
const weekRange = document.querySelector("#week-range");

const today = startOfDay(new Date());
let viewedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = today;
let events = loadEvents();
let editingEventId = null;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function sameDate(a, b) {
  return dateKey(a) === dateKey(b);
}

function isAllowedUrl(value) {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeEvent(event) {
  const legacyLink = typeof event.link === "string" && event.link ? [event.link] : [];
  const links = Array.isArray(event.links) ? event.links : legacyLink;
  const eventWithoutLegacyLink = { ...event };
  delete eventWithoutLegacyLink.link;
  return {
    ...eventWithoutLegacyLink,
    links: links.filter((link) => typeof link === "string" && link.trim() && isAllowedUrl(link.trim())).map((link) => link.trim()),
    completed: event.completed === true,
  };
}

function loadEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(stored)
      ? stored.filter(isValidStoredEvent).map(normalizeEvent)
      : [];
  } catch (error) {
    console.warn("저장된 일정을 불러오지 못했습니다.", error);
    return [];
  }
}

function isValidStoredEvent(event) {
  return event && typeof event.id === "string" && typeof event.title === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeInfo[event.type];
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long", day: "numeric", weekday: "short",
  }).format(date);
}

function getEventsForDate(date, includeCompleted = true) {
  const key = typeof date === "string" ? date : dateKey(date);
  return events.filter((event) => event.date === key && (includeCompleted || !event.completed));
}

function renderAll() {
  renderCalendar();
  renderSelectedDay();
  renderWeek();
}

function renderCalendar() {
  const year = viewedMonth.getFullYear();
  const month = viewedMonth.getMonth();
  currentMonthLabel.textContent = `${year}년 ${month + 1}월`;
  calendarGrid.replaceChildren();

  const firstVisibleDate = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(firstVisibleDate);
    cellDate.setDate(firstVisibleDate.getDate() + index);
    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.setAttribute("role", "gridcell");
    dayButton.setAttribute("aria-label", `${formatFullDate(cellDate)} 선택`);

    if (cellDate.getMonth() !== month) dayButton.classList.add("outside");
    if (sameDate(cellDate, today)) dayButton.classList.add("today");
    if (sameDate(cellDate, selectedDate)) {
      dayButton.classList.add("selected");
      dayButton.setAttribute("aria-selected", "true");
    }

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = cellDate.getDate();
    dayButton.append(number);

    const cellEvents = getEventsForDate(cellDate, false);
    if (cellEvents.length) {
      const chips = document.createElement("span");
      chips.className = "event-chips";
      cellEvents.slice(0, 2).forEach((event) => {
        const chip = document.createElement("span");
        chip.className = `event-chip type-${event.type}`;
        chip.textContent = event.title;
        chips.append(chip);
      });
      if (cellEvents.length > 2) {
        const more = document.createElement("span");
        more.className = "more-events";
        more.textContent = `+${cellEvents.length - 2}개`;
        chips.append(more);
      }
      dayButton.append(chips);
    }

    dayButton.addEventListener("click", () => selectDate(cellDate));
    calendarGrid.append(dayButton);
  }
}

function selectDate(date) {
  selectedDate = startOfDay(date);
  viewedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  if (!editingEventId) eventDateInput.value = dateKey(date);
  formMessage.textContent = "";
  renderCalendar();
  renderSelectedDay();
}

function renderSelectedDay() {
  const selectedEvents = getEventsForDate(selectedDate);
  selectedDateHeading.textContent = formatFullDate(selectedDate);
  eventCount.textContent = `${selectedEvents.length}개`;
  dayEvents.replaceChildren();

  if (!selectedEvents.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "아직 일정이 없어요. 아래에서 새 일정을 등록해 보세요.";
    dayEvents.append(empty);
    return;
  }

  selectedEvents.forEach((event) => dayEvents.append(createEventItem(event)));
}

function createEventItem(event) {
  const item = document.createElement("article");
  item.className = `event-item type-${event.type}`;
  if (event.completed) item.classList.add("completed");

  const head = document.createElement("div");
  head.className = "event-item-head";
  const titleGroup = document.createElement("div");
  const title = document.createElement("h3");
  title.className = "event-title";
  title.textContent = event.title;
  const type = document.createElement("span");
  type.className = "type-label";
  type.textContent = event.completed ? `${typeInfo[event.type].label} · 완료` : typeInfo[event.type].label;
  titleGroup.append(title, type);
  head.append(titleGroup);
  item.append(head);

  if (event.memo) {
    const memo = document.createElement("p");
    memo.className = "event-memo";
    memo.textContent = event.memo;
    item.append(memo);
  }

  if (event.links.length) {
    const links = document.createElement("div");
    links.className = "event-links";
    event.links.forEach((url, index) => {
      const link = document.createElement("a");
      link.className = "link-button";
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = event.links.length === 1 ? "관련 페이지 열기 ↗" : `링크 ${index + 1} 열기 ↗`;
      links.append(link);
    });
    item.append(links);
  }

  const actions = document.createElement("div");
  actions.className = "event-actions";
  const completeButton = document.createElement("button");
  completeButton.type = "button";
  completeButton.className = "complete-button";
  completeButton.textContent = event.completed ? "완료 취소" : "완료";
  completeButton.addEventListener("click", () => toggleEventComplete(event.id));

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.className = "edit-button";
  editButton.textContent = "수정";
  editButton.addEventListener("click", () => startEditingEvent(event.id));

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "delete-button";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `${event.title} 일정 삭제`);
  deleteButton.addEventListener("click", () => deleteEvent(event.id));
  actions.append(completeButton, editButton, deleteButton);
  item.append(actions);
  return item;
}

function getCurrentWeekDates() {
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function renderWeek() {
  const weekDates = getCurrentWeekDates();
  const weekNames = ["월", "화", "수", "목", "금", "토", "일"];
  weekRange.textContent = `${weekDates[0].getMonth() + 1}.${weekDates[0].getDate()} — ${weekDates[6].getMonth() + 1}.${weekDates[6].getDate()}`;
  weeklyGrid.replaceChildren();

  weekDates.forEach((date, index) => {
    const column = document.createElement("article");
    column.className = "week-day";
    if (sameDate(date, today)) column.classList.add("today");

    const head = document.createElement("div");
    head.className = "week-day-head";
    const name = document.createElement("span");
    name.className = "week-name";
    name.textContent = weekNames[index];
    const dateLabel = document.createElement("span");
    dateLabel.className = "week-date";
    dateLabel.textContent = `${date.getMonth() + 1}.${date.getDate()}`;
    head.append(name, dateLabel);

    const list = document.createElement("div");
    list.className = "week-event-list";
    const dateEvents = getEventsForDate(date, false);
    if (!dateEvents.length) {
      const empty = document.createElement("p");
      empty.className = "week-empty";
      empty.textContent = "일정 없음";
      list.append(empty);
    } else {
      dateEvents.forEach((event) => list.append(createWeekEvent(event)));
    }
    column.append(head, list);
    weeklyGrid.append(column);
  });
}

function createWeekEvent(event) {
  const item = document.createElement("div");
  item.className = `week-event type-${event.type}`;
  const title = document.createElement("strong");
  title.textContent = event.title;
  const type = document.createElement("span");
  type.textContent = typeInfo[event.type].label;
  item.append(title, type);
  if (event.links.length) {
    const link = document.createElement("a");
    link.href = event.links[0];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = event.links.length === 1 ? "바로가기 ↗" : `링크 ${event.links.length}개 중 첫 번째 열기 ↗`;
    item.append(link);
  }
  return item;
}

function createLinkField(value = "") {
  const row = document.createElement("div");
  row.className = "link-field-row";
  const input = document.createElement("input");
  input.type = "url";
  input.name = "links";
  input.inputMode = "url";
  input.placeholder = "https://example.com";
  input.value = value;
  input.setAttribute("aria-label", "관련 링크");
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-link-button";
  removeButton.textContent = "삭제";
  removeButton.addEventListener("click", () => {
    if (eventLinks.children.length === 1) input.value = "";
    else row.remove();
  });
  row.append(input, removeButton);
  eventLinks.append(row);
}

function resetForm(date = selectedDate) {
  editingEventId = null;
  eventForm.reset();
  eventLinks.replaceChildren();
  createLinkField();
  eventDateInput.value = dateKey(date);
  formKicker.textContent = "새 일정";
  formHeading.textContent = "할 일을 이어 두세요";
  submitButton.textContent = "일정 등록하기";
  cancelEditButton.hidden = true;
  formMessage.textContent = "";
  formMessage.classList.remove("success");
}

function startEditingEvent(id) {
  const target = events.find((event) => event.id === id);
  if (!target) return;
  editingEventId = id;
  eventForm.elements.title.value = target.title;
  eventDateInput.value = target.date;
  eventForm.elements.type.value = target.type;
  eventForm.elements.memo.value = target.memo || "";
  eventLinks.replaceChildren();
  (target.links.length ? target.links : [""]).forEach(createLinkField);
  formKicker.textContent = "일정 수정";
  formHeading.textContent = "내용을 고쳐 주세요";
  submitButton.textContent = "수정 내용 저장하기";
  cancelEditButton.hidden = false;
  formMessage.textContent = "";
  document.querySelector("#event-title").focus();
  eventForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function toggleEventComplete(id) {
  const target = events.find((event) => event.id === id);
  if (!target) return;
  target.completed = !target.completed;
  saveEvents();
  renderAll();
}

function deleteEvent(id) {
  const target = events.find((event) => event.id === id);
  if (!target || !window.confirm(`“${target.title}” 일정을 삭제할까요?`)) return;
  events = events.filter((event) => event.id !== id);
  if (editingEventId === id) resetForm();
  saveEvents();
  renderAll();
}

document.querySelector("#add-link").addEventListener("click", () => createLinkField());
cancelEditButton.addEventListener("click", () => resetForm());

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const title = formData.get("title").trim();
  const date = formData.get("date");
  const type = formData.get("type");
  const linkInputs = [...eventLinks.querySelectorAll("input")];
  const invalidLinkInput = linkInputs.find((input) => input.value.trim() && !isAllowedUrl(input.value.trim()));
  const links = linkInputs.map((input) => input.value.trim()).filter(Boolean);
  const memo = formData.get("memo").trim();

  formMessage.classList.remove("success");
  if (!title) {
    formMessage.textContent = "일정 제목을 입력해 주세요.";
    document.querySelector("#event-title").focus();
    return;
  }
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    formMessage.textContent = "날짜를 선택해 주세요.";
    eventDateInput.focus();
    return;
  }
  if (!typeInfo[type]) {
    formMessage.textContent = "일정 유형을 선택해 주세요.";
    return;
  }
  if (invalidLinkInput) {
    formMessage.textContent = "모든 링크는 http:// 또는 https://로 시작해야 합니다.";
    invalidLinkInput.focus();
    return;
  }

  if (editingEventId) {
    const target = events.find((savedEvent) => savedEvent.id === editingEventId);
    if (!target) return;
    Object.assign(target, { title, date, type, links, memo });
  } else {
    events.push({
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      title,
      date,
      type,
      links,
      memo,
      completed: false,
    });
  }

  const wasEditing = Boolean(editingEventId);
  saveEvents();
  selectedDate = parseDateKey(date);
  viewedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  resetForm(selectedDate);
  formMessage.textContent = wasEditing ? "수정 내용이 저장되었습니다." : "일정이 등록되었습니다.";
  formMessage.classList.add("success");
  renderAll();
});

eventDateInput.addEventListener("change", () => {
  if (eventDateInput.value) selectDate(parseDateKey(eventDateInput.value));
});

document.querySelector("#prev-month").addEventListener("click", () => {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() - 1, 1);
  selectedDate = new Date(viewedMonth);
  if (!editingEventId) eventDateInput.value = dateKey(selectedDate);
  renderCalendar();
  renderSelectedDay();
});

document.querySelector("#next-month").addEventListener("click", () => {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + 1, 1);
  selectedDate = new Date(viewedMonth);
  if (!editingEventId) eventDateInput.value = dateKey(selectedDate);
  renderCalendar();
  renderSelectedDay();
});

resetForm(selectedDate);
renderAll();
