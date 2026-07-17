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

  const timeline = document.querySelector("[data-timeline]");
  if (timeline) {
    const timelineObserver = new IntersectionObserver(
      ([entry], observer) => {
        if (!entry.isIntersecting) return;
        timeline.style.setProperty("--timeline-progress", "1");
        observer.unobserve(timeline);
      },
      { threshold: 0.25 }
    );
    timelineObserver.observe(timeline);
  }
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
  document.querySelector("[data-timeline]")?.style.setProperty("--timeline-progress", "1");
}
