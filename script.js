const { STORAGE_KEY, CATEGORY_KEY, dateKey, parseDateKey, isValidDateKey, dayDifference, currentWeekDates,
  isAllowedUrl, loadCategories, loadEvents, eventsOnDate } = CalendarData;
let typeInfo = loadCategories();

const calendarGrid = document.querySelector("#calendar-grid");
const currentMonthLabel = document.querySelector("#current-month");
const selectedDateHeading = document.querySelector("#selected-date-heading");
const eventCount = document.querySelector("#event-count");
const dayEvents = document.querySelector("#day-events");
const eventForm = document.querySelector("#event-form");
const eventDateInput = document.querySelector("#event-date");
const eventEndDateInput = document.querySelector("#event-end-date");
const eventTimeInput = document.querySelector("#event-time");
const eventTypeInput = document.querySelector("#event-type");
const eventDialog = document.querySelector("#event-dialog");
const categoryDialog = document.querySelector("#category-dialog");
const categoryForm = document.querySelector("#category-form");
const categoryFields = document.querySelector("#category-fields");
const categoryMessage = document.querySelector("#category-message");
const eventLinks = document.querySelector("#event-links");
const formMessage = document.querySelector("#form-message");
const formHeading = document.querySelector("#form-heading");
const cancelEditButton = document.querySelector("#cancel-edit");
const weeklyGrid = document.querySelector("#weekly-grid");
const weekRange = document.querySelector("#week-range");

const today = startOfDay(new Date());
let viewedMonth = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = today;
let events = loadEvents(typeInfo);
let editingEventId = null;
let draggedEventId = null;
let draggedFromDate = null;

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDate(a, b) {
  return dateKey(a) === dateKey(b);
}

function applyCategoryStyle(element, type) {
  element.style.setProperty("--category-color", typeInfo[type].color);
}

function renderCategoryOptions() {
  const selected = eventTypeInput.value;
  eventTypeInput.replaceChildren();
  Object.entries(typeInfo).forEach(([key, info]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = info.label;
    eventTypeInput.append(option);
  });
  if (typeInfo[selected]) eventTypeInput.value = selected;
}

function renderCategoryFields() {
  categoryFields.replaceChildren();
  Object.entries(typeInfo).forEach(([key, info]) => {
    const row = document.createElement("div");
    row.className = "category-row";
    const label = document.createElement("label");
    label.textContent = "카테고리명";
    const name = document.createElement("input");
    name.type = "text";
    name.maxLength = 20;
    name.required = true;
    name.value = info.label;
    name.dataset.category = key;
    const colorLabel = document.createElement("label");
    colorLabel.textContent = "색상";
    const color = document.createElement("input");
    color.type = "color";
    color.value = info.color;
    color.dataset.categoryColor = key;
    label.append(name);
    colorLabel.append(color);
    row.append(label, colorLabel);
    categoryFields.append(row);
  });
  categoryMessage.textContent = "";
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  }).format(date);
}

function getEventsForDate(date, includeCompleted = true) {
  return eventsOnDate(events, date, includeCompleted);
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
  const visibleDays = Math.ceil((new Date(year, month, 1).getDay() + new Date(year, month + 1, 0).getDate()) / 7) * 7;
  for (let index = 0; index < visibleDays; index += 1) {
    const cellDate = new Date(firstVisibleDate);
    cellDate.setDate(firstVisibleDate.getDate() + index);
    const dayButton = document.createElement("button");
    dayButton.type = "button";
    dayButton.className = "calendar-day";
    dayButton.dataset.date = dateKey(cellDate);

    if (cellDate.getMonth() !== month) dayButton.classList.add("outside");
    if (sameDate(cellDate, today)) dayButton.classList.add("today");
    if (sameDate(cellDate, selectedDate)) dayButton.classList.add("selected");
    dayButton.setAttribute("aria-pressed", String(sameDate(cellDate, selectedDate)));

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = cellDate.getDate();
    dayButton.append(number);

    const cellEvents = getEventsForDate(cellDate, false);
    dayButton.setAttribute("aria-label", `${formatFullDate(cellDate)}, 일정 ${cellEvents.length}개`);
    if (cellEvents.length) {
      const chips = document.createElement("span");
      chips.className = "event-chips";
      cellEvents.forEach((event) => {
        const chip = document.createElement("span");
        chip.className = "event-chip";
        applyCategoryStyle(chip, event.type);
        chip.draggable = true;
        chip.dataset.eventId = event.id;
        chip.title = `“${event.title}” 일정을 다른 날짜로 이동`;
        chip.setAttribute("aria-label", `${event.title} 일정. 다른 날짜로 끌어 이동할 수 있습니다.`);
        chip.addEventListener("dragstart", handleEventDragStart);
        chip.addEventListener("dragend", handleEventDragEnd);
        chips.append(chip);
      });
      dayButton.append(chips);
    }

    dayButton.addEventListener("dragenter", handleDayDragEnter);
    dayButton.addEventListener("dragover", handleDayDragOver);
    dayButton.addEventListener("dragleave", handleDayDragLeave);
    dayButton.addEventListener("drop", handleDayDrop);
    dayButton.addEventListener("click", () => selectDate(cellDate));
    calendarGrid.append(dayButton);
  }
}

function handleEventDragStart(event) {
  draggedEventId = event.currentTarget.dataset.eventId;
  draggedFromDate = event.currentTarget.closest(".calendar-day").dataset.date;
  event.currentTarget.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", draggedEventId);
}

function handleEventDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  draggedEventId = null;
  draggedFromDate = null;
  clearDropTargets();
}

function handleDayDragEnter(event) {
  if (!draggedEventId) return;
  event.preventDefault();
  event.currentTarget.classList.add("drop-target");
}

function handleDayDragOver(event) {
  if (!draggedEventId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  event.currentTarget.classList.add("drop-target");
}

function handleDayDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    event.currentTarget.classList.remove("drop-target");
  }
}

function handleDayDrop(event) {
  event.preventDefault();
  const eventId = draggedEventId;
  const sourceDate = draggedFromDate;
  draggedEventId = null;
  draggedFromDate = null;
  if (eventId) moveEventToDate(eventId, event.currentTarget.dataset.date, sourceDate);
  clearDropTargets();
}

function clearDropTargets() {
  calendarGrid.querySelectorAll(".drop-target").forEach((day) => day.classList.remove("drop-target"));
}

function moveEventToDate(eventId, targetDate, sourceDate) {
  const target = events.find((event) => event.id === eventId);
  if (!target || !sourceDate || sourceDate === targetDate) return;

  const offset = dayDifference(sourceDate, targetDate);
  const start = parseDateKey(target.date);
  const end = parseDateKey(target.endDate);
  start.setDate(start.getDate() + offset);
  end.setDate(end.getDate() + offset);
  target.date = dateKey(start);
  target.endDate = dateKey(end);
  selectedDate = parseDateKey(targetDate);
  viewedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  saveEvents();
  renderAll();
}

function selectDate(date) {
  selectedDate = startOfDay(date);
  viewedMonth = new Date(date.getFullYear(), date.getMonth(), 1);
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
    empty.textContent = "일정 없음";
    dayEvents.append(empty);
    return;
  }

  selectedEvents.forEach((event) => dayEvents.append(createEventItem(event)));
}

function createEventItem(event) {
  const item = document.createElement("article");
  item.className = "event-item";
  applyCategoryStyle(item, event.type);
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
  const detail = document.createElement("span");
  detail.className = "event-detail";
  detail.textContent = [event.date !== event.endDate ? `${event.date} ~ ${event.endDate}` : "", event.time].filter(Boolean).join(" · ");
  if (detail.textContent) titleGroup.append(detail);
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

function renderWeek() {
  const weekDates = currentWeekDates(today);
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
  item.className = "week-event";
  applyCategoryStyle(item, event.type);
  const title = document.createElement("strong");
  title.textContent = event.title;
  const type = document.createElement("span");
  type.textContent = [typeInfo[event.type].label, event.time].filter(Boolean).join(" · ");
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
  eventEndDateInput.value = "";
  formHeading.textContent = "일정 생성";
  formMessage.textContent = "";
}

function closeEventDialog() {
  eventDialog.close();
}

function startEditingEvent(id) {
  const target = events.find((event) => event.id === id);
  if (!target) return;
  editingEventId = id;
  eventForm.elements.title.value = target.title;
  eventDateInput.value = target.date;
  eventEndDateInput.value = target.endDate === target.date ? "" : target.endDate;
  eventTimeInput.value = target.time;
  eventForm.elements.type.value = target.type;
  eventForm.elements.memo.value = target.memo || "";
  eventLinks.replaceChildren();
  (target.links.length ? target.links : [""]).forEach(createLinkField);
  formHeading.textContent = "일정 수정";
  formMessage.textContent = "";
  eventDialog.showModal();
  document.querySelector("#event-title").focus();
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
  if (editingEventId === id) closeEventDialog();
  saveEvents();
  renderAll();
}

document.querySelector("#add-link").addEventListener("click", () => createLinkField());
document.querySelector("#create-event").addEventListener("click", () => {
  resetForm();
  eventDialog.showModal();
  document.querySelector("#event-title").focus();
});
document.querySelector("#close-event-dialog").addEventListener("click", closeEventDialog);
cancelEditButton.addEventListener("click", closeEventDialog);
eventDialog.addEventListener("close", () => resetForm());
document.querySelector("#manage-categories").addEventListener("click", () => {
  renderCategoryFields();
  categoryDialog.showModal();
});
document.querySelector("#close-category-dialog").addEventListener("click", () => categoryDialog.close());
document.querySelector("#cancel-categories").addEventListener("click", () => categoryDialog.close());
categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const names = [...categoryFields.querySelectorAll("input[data-category]")];
  if (names.some((input) => !input.value.trim())) {
    categoryMessage.textContent = "카테고리명을 입력하세요.";
    return;
  }
  if (new Set(names.map((input) => input.value.trim().toLocaleLowerCase("ko"))).size !== names.length) {
    categoryMessage.textContent = "카테고리명은 각각 다르게 입력하세요.";
    return;
  }
  names.forEach((input) => {
    const key = input.dataset.category;
    typeInfo[key] = {
      label: input.value.trim(),
      color: categoryFields.querySelector(`[data-category-color="${key}"]`).value,
    };
  });
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(typeInfo));
  renderCategoryOptions();
  renderAll();
  categoryDialog.close();
});

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(eventForm);
  const title = formData.get("title").trim();
  const date = formData.get("date");
  const endDate = formData.get("endDate") || date;
  const time = formData.get("time") || "";
  const type = formData.get("type");
  const linkInputs = [...eventLinks.querySelectorAll("input")];
  const invalidLinkInput = linkInputs.find((input) => input.value.trim() && !isAllowedUrl(input.value.trim()));
  const links = linkInputs.map((input) => input.value.trim()).filter(Boolean);
  const memo = formData.get("memo").trim();

  if (!title) {
    formMessage.textContent = "일정 제목을 입력해 주세요.";
    document.querySelector("#event-title").focus();
    return;
  }
  if (!isValidDateKey(date)) {
    formMessage.textContent = "날짜를 선택해 주세요.";
    eventDateInput.focus();
    return;
  }
  if (!isValidDateKey(endDate) || endDate < date) {
    formMessage.textContent = "종료 날짜는 시작 날짜 이후여야 합니다.";
    eventEndDateInput.focus();
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
    Object.assign(target, { title, date, endDate, time, type, links, memo });
  } else {
    events.push({
      id: window.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`,
      title,
      date,
      endDate,
      time,
      type,
      links,
      memo,
      completed: false,
    });
  }

  saveEvents();
  selectedDate = parseDateKey(date);
  viewedMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  eventDialog.close();
  renderAll();
});

function changeMonth(offset) {
  viewedMonth = new Date(viewedMonth.getFullYear(), viewedMonth.getMonth() + offset, 1);
  selectedDate = new Date(viewedMonth);
  renderCalendar();
  renderSelectedDay();
}

document.querySelector("#prev-month").addEventListener("click", () => changeMonth(-1));
document.querySelector("#next-month").addEventListener("click", () => changeMonth(1));

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY || event.key === CATEGORY_KEY) window.location.reload();
});

renderCategoryOptions();
resetForm(selectedDate);
renderAll();
