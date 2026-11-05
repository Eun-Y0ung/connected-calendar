const { STORAGE_KEY, CATEGORY_KEY, dateKey, loadCategories, loadEvents, eventsOnDate, currentWeekDates } = CalendarData;
const typeInfo = loadCategories();

const weekRange = document.querySelector("#week-range");
const weekDays = document.querySelector("#week-days");
const today = startOfDay(new Date());
const currentWeek = currentWeekDates(today);
const events = loadEvents(typeInfo);

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDate(a, b) {
  return dateKey(a) === dateKey(b);
}

function getEventsForDate(date) {
  return eventsOnDate(events, date, false);
}

function formatWeekRange() {
  const first = currentWeek[0];
  const last = currentWeek[6];
  return `${first.getMonth() + 1}.${String(first.getDate()).padStart(2, "0")} — ${last.getMonth() + 1}.${String(last.getDate()).padStart(2, "0")}`;
}

function createEventItem(event) {
  const item = document.createElement("div");
  item.className = "event-item";
  item.style.setProperty("--category-color", typeInfo[event.type].color);

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

  if (event.time) {
    const time = document.createElement("span");
    time.className = "event-time";
    time.textContent = event.time;
    item.append(time);
  }

  if (event.links.length > 1) {
    const links = document.createElement("div");
    links.className = "event-links";
    event.links.slice(1).forEach((url, index) => {
      const link = document.createElement("a");
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = `${index + 2}`;
      link.setAttribute("aria-label", `${event.title} 관련 링크 ${index + 2} 열기`);
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
  if (event.key === STORAGE_KEY || event.key === CATEGORY_KEY) window.location.reload();
});

render();
