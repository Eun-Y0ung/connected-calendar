const CalendarData = (() => {
  const STORAGE_KEY = "connected-calendar-events-v1";
  const CATEGORY_KEY = "connected-calendar-categories-v1";
  const defaultCategories = {
    assignment: { label: "과제", color: "#df775f" },
    appointment: { label: "약속", color: "#4d83a8" },
    personal: { label: "개인", color: "#8067aa" },
    other: { label: "기타", color: "#a9853b" },
  };

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

  function isValidDateKey(value) {
    return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      dateKey(parseDateKey(value)) === value;
  }

  function dayDifference(from, to) {
    const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
    const [toYear, toMonth, toDay] = to.split("-").map(Number);
    return (Date.UTC(toYear, toMonth - 1, toDay) - Date.UTC(fromYear, fromMonth - 1, fromDay)) / 86400000;
  }

  function currentWeekDates(today) {
    const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + index);
      return date;
    });
  }

  function isAllowedUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function loadCategories() {
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(CATEGORY_KEY)) || {};
    } catch (error) {
      console.warn("저장된 카테고리를 불러오지 못했습니다.", error);
    }
    return Object.fromEntries(Object.entries(defaultCategories).map(([key, fallback]) => {
      const entry = saved[key] || {};
      return [key, {
        label: typeof entry.label === "string" && entry.label.trim() ? entry.label.trim() : fallback.label,
        color: typeof entry.color === "string" && /^#[0-9a-fA-F]{6}$/.test(entry.color) ? entry.color : fallback.color,
      }];
    }));
  }

  function normalizeEvent(event, categories) {
    if (!event || typeof event.id !== "string" || typeof event.title !== "string" ||
        !isValidDateKey(event.date) || !categories[event.type]) return null;
    const rawLinks = Array.isArray(event.links) ? event.links : [event.link];
    return {
      id: event.id,
      title: event.title,
      date: event.date,
      endDate: isValidDateKey(event.endDate) && event.endDate >= event.date ? event.endDate : event.date,
      time: typeof event.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(event.time) ? event.time : "",
      type: event.type,
      links: rawLinks.filter((link) => typeof link === "string" && link.trim() && isAllowedUrl(link.trim()))
        .map((link) => link.trim()),
      memo: typeof event.memo === "string" ? event.memo : "",
      completed: event.completed === true,
    };
  }

  function loadEvents(categories) {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return Array.isArray(stored) ? stored.map((event) => normalizeEvent(event, categories)).filter(Boolean) : [];
    } catch (error) {
      console.warn("저장된 일정을 불러오지 못했습니다.", error);
      return [];
    }
  }

  function eventsOnDate(events, date, includeCompleted = true) {
    const key = typeof date === "string" ? date : dateKey(date);
    return events.filter((event) => event.date <= key && event.endDate >= key &&
      (includeCompleted || !event.completed))
      .sort((a, b) => a.time.localeCompare(b.time) || a.title.localeCompare(b.title, "ko"));
  }

  return { STORAGE_KEY, CATEGORY_KEY, dateKey, parseDateKey, isValidDateKey, dayDifference, currentWeekDates,
    isAllowedUrl, loadCategories, loadEvents, eventsOnDate };
})();
