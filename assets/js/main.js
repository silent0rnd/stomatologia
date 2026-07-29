"use strict";

document.documentElement.classList.add("js");

// Укажите HTTPS-адрес обработчика CRM перед публикацией.
const FORM_ENDPOINT = "";

const body = document.body;
const header = document.querySelector("[data-header]");
const sentinel = document.querySelector(".scroll-sentinel");
const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector("#mobile-menu");
const modal = document.querySelector("[data-modal]");
const modalDialog = modal?.querySelector(".modal-dialog");
const modalOpeners = document.querySelectorAll(".js-open-modal");
const modalClosers = modal?.querySelectorAll("[data-modal-close]") || [];
const form = document.querySelector("[data-form]");
const nameInput = document.querySelector("#patient-name");
const phoneInput = document.querySelector("#patient-phone");
const formStatus = document.querySelector("[data-form-status]");
const submitButton = form?.querySelector("button[type='submit']");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let lastFocusedElement = null;
let isSubmitting = false;
let modalCloseTimer = null;

if (header && sentinel && "IntersectionObserver" in window) {
  const headerObserver = new IntersectionObserver(([entry]) => {
    header.classList.toggle("is-compact", !entry.isIntersecting);
  });
  headerObserver.observe(sentinel);
}

function closeMobileMenu({ returnFocus = false } = {}) {
  if (!menuToggle || !mobileMenu || mobileMenu.hidden) return;
  mobileMenu.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
  menuToggle.setAttribute("aria-label", "Открыть меню");
  body.classList.remove("menu-open");
  if (returnFocus) menuToggle.focus();
}

function openMobileMenu() {
  if (!menuToggle || !mobileMenu) return;
  mobileMenu.hidden = false;
  menuToggle.setAttribute("aria-expanded", "true");
  menuToggle.setAttribute("aria-label", "Закрыть меню");
  body.classList.add("menu-open");
  const firstLink = mobileMenu.querySelector("a");
  firstLink?.focus();
}

menuToggle?.addEventListener("click", () => {
  if (mobileMenu?.hidden) openMobileMenu();
  else closeMobileMenu({ returnFocus: true });
});

mobileMenu?.querySelectorAll("a, .js-open-modal").forEach((element) => {
  element.addEventListener("click", () => closeMobileMenu());
});

function getFocusableElements() {
  if (!modalDialog) return [];
  return Array.from(
    modalDialog.querySelectorAll(
      "button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])"
    )
  ).filter((element) => !element.hasAttribute("hidden"));
}

function openModal(trigger) {
  if (!modal) return;
  clearTimeout(modalCloseTimer);
  const triggerIsInMobileMenu = trigger instanceof HTMLElement && mobileMenu?.contains(trigger);
  lastFocusedElement = triggerIsInMobileMenu ? menuToggle : (trigger instanceof HTMLElement ? trigger : document.activeElement);
  closeMobileMenu();
  modal.hidden = false;
  body.classList.add("modal-open");
  requestAnimationFrame(() => {
    modal.classList.add("is-open");
    const firstFocusable = getFocusableElements()[0];
    firstFocusable?.focus();
  });
}

function closeModal() {
  if (!modal || modal.hidden) return;
  modal.classList.remove("is-open");
  body.classList.remove("modal-open");
  const finishClose = () => {
    modal.hidden = true;
    if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
  };
  if (reduceMotion) finishClose();
  else modalCloseTimer = window.setTimeout(finishClose, 240);
}

modalOpeners.forEach((button) => {
  button.addEventListener("click", () => openModal(button));
});

modalClosers.forEach((button) => {
  button.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (modal && !modal.hidden) closeModal();
    else if (mobileMenu && !mobileMenu.hidden) closeMobileMenu({ returnFocus: true });
  }

  if (event.key !== "Tab" || !modal || modal.hidden) return;
  const focusable = getFocusableElements();
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
});

function formatRussianPhone(value) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("8") || digits.startsWith("7")) digits = digits.slice(1);
  digits = digits.slice(0, 10);

  let result = "+7";
  if (digits.length > 0) result += ` (${digits.slice(0, 3)}`;
  if (digits.length >= 3) result += ")";
  if (digits.length > 3) result += ` ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
  return result;
}

phoneInput?.addEventListener("input", (event) => {
  event.target.value = formatRussianPhone(event.target.value);
  clearFieldError(phoneInput, "phone-error");
});

phoneInput?.addEventListener("focus", () => {
  if (!phoneInput.value) phoneInput.value = "+7";
});

phoneInput?.addEventListener("blur", () => {
  if (phoneInput.value === "+7") phoneInput.value = "";
});

nameInput?.addEventListener("input", () => clearFieldError(nameInput, "name-error"));

function setFieldError(input, errorId, message) {
  if (!input) return;
  input.setAttribute("aria-invalid", "true");
  const error = document.getElementById(errorId);
  if (error) error.textContent = message;
}

function clearFieldError(input, errorId) {
  if (!input) return;
  input.removeAttribute("aria-invalid");
  const error = document.getElementById(errorId);
  if (error) error.textContent = "";
}

function validateForm() {
  let valid = true;
  const cleanName = nameInput?.value.trim() || "";
  const phoneDigits = phoneInput?.value.replace(/\D/g, "") || "";

  clearFieldError(nameInput, "name-error");
  clearFieldError(phoneInput, "phone-error");
  if (formStatus) formStatus.textContent = "";

  if (cleanName.length < 2) {
    setFieldError(nameInput, "name-error", "Введите имя, не менее 2 символов.");
    valid = false;
  }

  if (phoneDigits.length !== 11 || !phoneDigits.startsWith("7")) {
    setFieldError(phoneInput, "phone-error", "Введите российский номер телефона полностью.");
    valid = false;
  }

  if (!valid) {
    const firstInvalid = form?.querySelector("[aria-invalid='true']");
    firstInvalid?.focus();
  }

  return valid;
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSubmitting || !validateForm()) return;

  if (!FORM_ENDPOINT) {
    if (formStatus) {
      formStatus.textContent = "Отправка пока не подключена. Укажите адрес CRM в константе FORM_ENDPOINT в assets/js/main.js.";
    }
    return;
  }

  isSubmitting = true;
  submitButton.disabled = true;
  const initialButtonText = submitButton.textContent;
  submitButton.textContent = "Отправка...";
  if (formStatus) formStatus.textContent = "";

  try {
    const response = await fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        phone: phoneInput.value,
        source: "Tetradent TiS landing"
      })
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    if (formStatus) {
      formStatus.textContent = "Заявка отправлена. Администратор клиники свяжется с вами.";
      formStatus.classList.add("is-success");
    }
    form.reset();
  } catch (error) {
    if (formStatus) {
      formStatus.textContent = "Не удалось отправить заявку. Позвоните в клинику по номеру +7 (495) 021-13-95.";
      formStatus.classList.remove("is-success");
    }
  } finally {
    isSubmitting = false;
    submitButton.disabled = false;
    submitButton.textContent = initialButtonText;
  }
});

if ("IntersectionObserver" in window) {
  const revealElements = document.querySelectorAll(".reveal");
  revealElements.forEach((element, index) => {
    element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
  });

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -8%", threshold: 0.12 }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}

/* Один общий цикл на всё, что зависит от прокрутки: один пассивный слушатель и
   один requestAnimationFrame на кадр, сколько бы подписчиков ни было. */
const scrollTasks = [];
let scrollTicking = false;

function runScrollTasks() {
  scrollTicking = false;
  for (const task of scrollTasks) task();
}

function watchScroll(task) {
  scrollTasks.push(task);
  if (scrollTasks.length === 1) {
    const schedule = () => {
      if (scrollTicking) return;
      scrollTicking = true;
      requestAnimationFrame(runScrollTasks);
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
  }
  task();
}

/* Подсветка текущего пункта меню. Переиспользует подчёркивание из :hover. */
if ("IntersectionObserver" in window) {
  const navLinks = new Map(
    [...document.querySelectorAll(".desktop-nav a[href^='#']")].map((link) => [
      link.getAttribute("href").slice(1),
      link,
    ])
  );

  if (navLinks.size) {
    const navObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          navLinks.get(entry.target.id)?.toggleAttribute("data-current", entry.isIntersecting);
        });
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );

    navLinks.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) navObserver.observe(section);
    });
  }
}

/* Параллакс: если браузер умеет scroll-driven анимации, всё уже сделано в CSS.
   Иначе - один общий цикл поверх watchScroll, только transform, без layout. */
if (!CSS.supports("animation-timeline", "view()") && !reduceMotion) {
  const parallaxImages = [...document.querySelectorAll(".organic-frame[data-parallax] img")];
  if (parallaxImages.length) {
    watchScroll(() => {
      const viewport = window.innerHeight;
      for (const image of parallaxImages) {
        const rect = image.parentElement.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > viewport + 200) continue;
        const centered = (rect.top + rect.height / 2 - viewport / 2) / (viewport / 2 + rect.height / 2);
        image.style.transform = `scale(1.09) translateY(${(centered * 3.2).toFixed(2)}%)`;
      }
    });
  }
}

/* Счётчики в блоке врача. Разметка в HTML остаётся с настоящими значениями, поэтому
   без JS и под reduced-motion всё читается как есть. Скринридер тоже всегда слышит
   исходный текст: анимируемый span помечен aria-hidden, рядом лежит скрытая копия. */
const doctorFacts = document.querySelectorAll(".doctor-facts dt");
if (doctorFacts.length && "IntersectionObserver" in window && !reduceMotion) {
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const countUp = (dt) => {
    const original = dt.textContent.trim();
    // \s в JS покрывает и обычный, и неразрывный, и узкий пробел - разряды ловятся все.
    const match = original.match(/[\d\s]*\d/);
    if (!match) {
      dt.classList.add("is-static");
      return;
    }

    const raw = match[0];
    const target = parseInt(raw.replace(/\D/g, ""), 10);
    const grouped = /\s/.test(raw);
    const prefix = original.slice(0, match.index);
    const suffix = original.slice(match.index + raw.length);
    const format = (value) =>
      prefix + (grouped ? value.toLocaleString("ru-RU").replace(/\s/g, "\u00A0") : String(value)) + suffix;

    const live = document.createElement("span");
    live.setAttribute("aria-hidden", "true");
    const readable = document.createElement("span");
    readable.className = "visually-hidden";
    readable.textContent = original;
    dt.replaceChildren(live, readable);

    const duration = 1000;
    const started = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - started) / duration);
      live.textContent = format(Math.round(target * easeOutCubic(t)));
      if (t < 1) requestAnimationFrame(step);
      else live.textContent = original;
    };
    requestAnimationFrame(step);
  };

  const factObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        countUp(entry.target);
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.6 }
  );

  doctorFacts.forEach((dt) => factObserver.observe(dt));
}

/* Сравнение "до/после". Вся механика - на нативном range, JS только прокидывает
   его значение в CSS-переменную шторки и озвучивает позицию скринридеру. */
const compare = document.querySelector("[data-compare]");
if (compare) {
  const range = compare.querySelector(".ba-range");
  const frame = compare.querySelector(".ba-frame");
  const syncCompare = () => {
    frame.style.setProperty("--ba", `${range.value}%`);
    range.setAttribute("aria-valuetext", `Показано ${range.value}% снимка до лечения`);
  };
  range.addEventListener("input", syncCompare);
  syncCompare();
}

/* Линия этапов заполняется непрерывно по мере прокрутки, а не одним рывком.
   Длина хода - не меньше 45% экрана, иначе на десктопе, где список широкий и
   низкий, вся заливка проскакивала бы за полтораста пикселей. */
const timeline = document.querySelector("[data-timeline]");
if (timeline) {
  if (reduceMotion) {
    timeline.style.setProperty("--timeline-progress", "1");
  } else {
    watchScroll(() => {
      const rect = timeline.getBoundingClientRect();
      const viewport = window.innerHeight;
      const span = Math.max(rect.height, viewport * 0.45);
      const progress = (viewport * 0.85 - rect.top) / span;
      timeline.style.setProperty("--timeline-progress", Math.min(1, Math.max(0, progress)).toFixed(3));
    });
  }
}
