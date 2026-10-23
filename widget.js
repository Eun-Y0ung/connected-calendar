const STORAGE_KEY = "connected-calendar-events-v1";

const typeInfo = {
  assignment: { label: "과제" },
  appointment: { label: "약속" },
  personal: { label: "개인" },
  other: { label: "기타" },
};

const weekRange = document.querySelector("#week-range");
const weekDays = document.querySelector("#week-days");
const today = startOfDay(new Date());
const currentWeek = getCurrentWeekDates();
const events = loadEvents();

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function sameDate(a, b) {
  return dateKey(a) === dateKey(b);
}

function getCurrentWeekDates() {
  const weekday = today.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    return date;
  });
}

function isAllowedUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function loadEvents() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((event) => event && typeof event.title === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(event.date) && typeInfo[event.type])
      .map((event) => {
        const legacyLink = typeof event.link === "string" && event.link ? [event.link] : [];
        const links = Array.isArray(event.links) ? event.links : legacyLink;
        return {
          ...event,
          links: links.filter((link) => typeof link === "string" && isAllowedUrl(link)),
          completed: event.completed === true,
        };
      });
  } catch (error) {
    console.warn("저장된 일정을 불러오지 못했습니다.", error);
    return [];
  }
}

function getEventsForDate(date) {
  const key = dateKey(date);
  return events.filter((event) => event.date === key && !event.completed);
}

function formatWeekRange() {
  const first = currentWeek[0];
  const last = currentWeek[6];
  return `${first.getMonth() + 1}.${String(first.getDate()).padStart(2, "0")} — ${last.getMonth() + 1}.${String(last.getDate()).padStart(2, "0")}`;
}

function createEventItem(event) {
  const item = document.createElement("div");
  item.className = `event-item type-${event.type}`;

  const title = event.links.length ? document.createElement("a") : document.createElement("p");
  title.className = "event-title";
  title.textContent = event.title;
  if (title instanceof HTMLAnchorElement) {
    title.href = event.links[0];
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    title.setAttribute("aria-label", `${event.title} 첫 번째 관련 링크 열기`);
  }
  item.append(title);

  if (event.links.length > 1) {
    const links = document.createElement("div");
    links.className = "event-links";
    event.links.forEach((url, index) => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${index + 1}`;
      link.setAttribute("aria-label", `${event.title} 관련 링크 ${index + 1} 열기`);
      links.append(link);
    });
    item.append(links);
  }
  return item;
}

function render() {
  const dayNames = ["월", "화", "수", "목", "금", "토", "일"];
  weekRange.textContent = formatWeekRange();
  weekDays.replaceChildren();

  currentWeek.forEach((date, index) => {
    const card = document.createElement("article");
    card.className = "day-card";
    if (sameDate(date, today)) card.classList.add("today");

    const heading = document.createElement("div");
    heading.className = "day-heading";
    const name = document.createElement("span");
    name.className = "day-name";
    name.textContent = dayNames[index];
    const dateLabel = document.createElement("span");
    dateLabel.className = "day-date";
    dateLabel.textContent = `${date.getMonth() + 1}.${String(date.getDate()).padStart(2, "0")}`;
    heading.append(name, dateLabel);

    const list = document.createElement("div");
    list.className = "day-events";
    const dayEvents = getEventsForDate(date);
    if (!dayEvents.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "일정 없음";
      list.append(empty);
    } else {
      dayEvents.forEach((event) => list.append(createEventItem(event)));
    }

    card.append(heading, list);
    weekDays.append(card);
  });
}

window.addEventListener("storage", (event) => {
  if (event.key === STORAGE_KEY) window.location.reload();
});

render();
