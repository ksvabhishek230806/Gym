// Wires up any <form data-lead-form> to POST /api/leads instead of just alert()ing.
document.querySelectorAll('form[data-lead-form]').forEach((form) => {
  const submitBtn = form.querySelector('button[type="submit"]');
  const submitLabel = submitBtn ? submitBtn.textContent : 'Send Message';

  const status = document.createElement('div');
  status.className = 'lead-form-status text-sm mt-1 hidden';
  form.insertBefore(status, submitBtn);

  function showError(message) {
    status.textContent = `${message} Or call/WhatsApp us directly at +91 90000 51090.`;
    status.classList.remove('hidden');
    status.classList.add('text-red-500');
  }

  function showThanks() {
    form.innerHTML = `
      <div class="text-center py-6">
        <p class="font-bold text-lg mb-1">Thanks — we'll be in touch shortly.</p>
        <p class="text-white/60 text-sm">Prefer it now? Call or WhatsApp +91 90000 51090.</p>
      </div>`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.classList.add('hidden');

    const data = Object.fromEntries(new FormData(form).entries());
    data.source_page = form.dataset.source || '';

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
    }

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json().catch(() => ({}));

      if (res.ok && result.ok) {
        showThanks();
        return;
      }
      showError(result.error || 'Something went wrong sending your message.');
    } catch (err) {
      showError('Something went wrong sending your message.');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    }
  });
});
