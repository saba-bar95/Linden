/** Custom validation — skips browser tooltips when forms use noValidate. */

function messageFor(el: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement): string {
  if (el.validity.valueMissing) {
    const label = el.getAttribute("data-label") || el.getAttribute("placeholder") || el.name;
    return `${label || "This field"} is required`;
  }
  if (el.validity.typeMismatch) {
    if ("type" in el && el.type === "email") return "Enter a valid email address";
    return "Enter a valid value";
  }
  if (el.validity.tooShort) {
    const minLength = "minLength" in el ? el.minLength : 0;
    return `Use at least ${minLength} characters`;
  }
  if (el.validity.rangeUnderflow) {
    const min = el instanceof HTMLInputElement ? el.min : "";
    return `Must be at least ${min}`;
  }
  if (el.validity.rangeOverflow) {
    const max = el instanceof HTMLInputElement ? el.max : "";
    return `Must be at most ${max}`;
  }
  if (el.validity.stepMismatch) {
    return "Enter a valid number for this field";
  }
  return el.validationMessage || "Invalid value";
}

export function clearFormErrors(form: HTMLFormElement) {
  form.querySelectorAll<HTMLElement>(".jm-field-error").forEach((node) => {
    node.textContent = "";
  });
  form
    .querySelectorAll<HTMLElement>(".jm-field-invalid, [aria-invalid='true']")
    .forEach((node) => {
      node.classList.remove("jm-field-invalid");
      node.removeAttribute("aria-invalid");
    });
}

export function validateForm(form: HTMLFormElement): boolean {
  clearFormErrors(form);
  let ok = true;
  let firstInvalid: HTMLElement | null = null;

  const controls = form.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea");

  for (const el of controls) {
    if (el.disabled || el.type === "hidden" || el.type === "submit" || el.type === "button") {
      continue;
    }
    if (!el.checkValidity()) {
      ok = false;
      el.classList.add("jm-field-invalid");
      el.setAttribute("aria-invalid", "true");
      const msg = messageFor(el);
      const slot =
        (el.name &&
          form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(el.name)}"]`)) ||
        el.parentElement?.querySelector<HTMLElement>(".jm-field-error");
      if (slot) slot.textContent = msg;
      if (!firstInvalid) firstInvalid = el;
    }
  }

  firstInvalid?.focus();
  return ok;
}
