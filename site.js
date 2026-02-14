/* ═══════════════════════════════════════════════════════════
   ALDEBERT BARBER — site.js
   Funcionalidade completa: navegação, parallax, lightbox,
   agendamento com bloqueio, admin com login/dashboard.
   100 % executável direto no navegador (localStorage).
   ═══════════════════════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", () => {
  // ── Lucide icons ──
  if (window.lucide) lucide.createIcons();

  // ── AOS ──
  try {
    if (typeof AOS !== "undefined") {
      AOS.init({ duration: 900, once: true, easing: "ease-out-cubic", offset: 80 });
    }
  } catch (e) {
    console.warn("AOS não carregou:", e);
  }

  /* ═══════════════════════════════════════════════════════
     CONSTANTS
     ═══════════════════════════════════════════════════════ */
  const SERVICES = {
    "Corte Social":       90,
    "Corte Moderno":      110,
    "Barba Tradicional":  70,
    "Combo Corte + Barba":150,
  };

  const ALL_TIMES = [
    "09:00","09:30","10:00","10:30","11:00","11:30",
    "14:00","14:30","15:00","15:30","16:00","16:30",
    "17:00","17:30","18:00","18:30","19:00",
  ];

  const ADMIN_CREDENTIALS = {
    email: "admin@aldebert.com",
    password: "Aldebert2026!",
  };

  const STORAGE_KEYS = {
    appointments: "aldebert_appointments",
    token:        "aldebert_token",
  };

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  function getAppointments() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.appointments) || "[]");
  }
  function saveAppointments(list) {
    localStorage.setItem(STORAGE_KEYS.appointments, JSON.stringify(list));
  }

  function showFeedback(el, msg, type = "success") {
    el.textContent = msg;
    el.className = "form__feedback " + type;
    el.style.display = "block";
  }
  function hideFeedback(el) {
    el.style.display = "none";
    el.textContent = "";
    el.className = "form__feedback";
  }

  function phoneMask(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2)  return `(${digits}`;
    if (digits.length <= 7)  return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  }

  function todayStr() {
    const d = new Date();
    d.setDate(d.getDate() + 1); // mínimo é amanhã
    return d.toISOString().split("T")[0];
  }

  /* ═══════════════════════════════════════════════════════
     1 · NAVIGATION
     ═══════════════════════════════════════════════════════ */
  const header  = $("#header");
  const navMenu = $("#nav-menu");
  const navToggle = $("#nav-toggle");
  const navClose  = $("#nav-close");

  navToggle.addEventListener("click", () => navMenu.classList.add("open"));
  navClose.addEventListener("click",  () => navMenu.classList.remove("open"));

  // fechar ao clicar em link
  $$(".nav__link").forEach(link => {
    link.addEventListener("click", () => navMenu.classList.remove("open"));
  });

  // header scrolled
  const onScroll = () => {
    header.classList.toggle("scrolled", window.scrollY > 60);
    // back to top
    const btt = $("#back-to-top");
    if (btt) btt.classList.toggle("visible", window.scrollY > 600);
    // active nav link
    $$(".section, .hero").forEach(sec => {
      const id = sec.getAttribute("id");
      if (!id) return;
      const rect = sec.getBoundingClientRect();
      const link = $(`.nav__link[href="#${id}"]`);
      if (link) {
        link.classList.toggle("active", rect.top <= 120 && rect.bottom > 120);
      }
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // back to top
  const backToTop = $("#back-to-top");
  if (backToTop) {
    backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /* ═══════════════════════════════════════════════════════
     2 · PARALLAX
     ═══════════════════════════════════════════════════════ */
  const heroParallax = $("#hero-parallax");
  if (heroParallax) {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const y = window.scrollY * 0.35;
          heroParallax.style.transform = `translateY(${y}px)`;
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════
     3 · LIGHTBOX
     ═══════════════════════════════════════════════════════ */
  const lightbox    = $("#lightbox");
  const lbImg       = $("#lightbox-img");
  const lbClose     = $("#lightbox-close");
  const lbPrev      = $("#lightbox-prev");
  const lbNext      = $("#lightbox-next");
  const galleryImgs = $$(".gallery__item img");
  let lbIndex = 0;

  function openLightbox(idx) {
    lbIndex = idx;
    lbImg.src = galleryImgs[idx].src;
    lbImg.alt = galleryImgs[idx].alt;
    lightbox.classList.add("active");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }
  function closeLightbox() {
    lightbox.classList.remove("active");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }
  function lbNav(dir) {
    lbIndex = (lbIndex + dir + galleryImgs.length) % galleryImgs.length;
    lbImg.src = galleryImgs[lbIndex].src;
    lbImg.alt = galleryImgs[lbIndex].alt;
  }

  galleryImgs.forEach((img, i) => img.addEventListener("click", () => openLightbox(i)));
  lbClose.addEventListener("click", closeLightbox);
  lbPrev.addEventListener("click", () => lbNav(-1));
  lbNext.addEventListener("click", () => lbNav(1));
  lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lightbox.classList.contains("active")) return;
    if (e.key === "Escape")     closeLightbox();
    if (e.key === "ArrowLeft")  lbNav(-1);
    if (e.key === "ArrowRight") lbNav(1);
  });

  /* ═══════════════════════════════════════════════════════
     4 · SERVICE CARD → BOOKING
     ═══════════════════════════════════════════════════════ */
  $$("[data-select-service]").forEach(btn => {
    btn.addEventListener("click", () => {
      const svc = btn.dataset.selectService;
      const sel = $("#b-service");
      if (sel) sel.value = svc;
      document.getElementById("booking").scrollIntoView({ behavior: "smooth" });
    });
  });

  /* ═══════════════════════════════════════════════════════
     5 · BOOKING SYSTEM
     ═══════════════════════════════════════════════════════ */
  const state = {
    loggedIn: !!localStorage.getItem(STORAGE_KEYS.token),
  };

  const bookingForm = $("#booking-form");
  const bService    = $("#b-service");
  const bDate       = $("#b-date");
  const bTime       = $("#b-time");
  const bName       = $("#b-name");
  const bPhone      = $("#b-phone");
  const bFeedback   = $("#booking-feedback");

  // data mínima
  if (bDate) bDate.min = todayStr();

  // máscara de telefone
  if (bPhone) bPhone.addEventListener("input", () => {
    bPhone.value = phoneMask(bPhone.value);
  });

  // carregar horários quando data muda
  if (bDate) bDate.addEventListener("change", () => {
    loadAvailableTimes();
  });

  function loadAvailableTimes() {
    const date = bDate.value;
    bTime.innerHTML = "";

    if (!date) {
      bTime.innerHTML = '<option value="">Selecione a data primeiro</option>';
      return;
    }

    const appointments = getAppointments();
    const bookedTimes = appointments
      .filter(a => a.date === date && a.status !== "Cancelado")
      .map(a => a.time);

    const available = ALL_TIMES.filter(t => !bookedTimes.includes(t));

    if (available.length === 0) {
      bTime.innerHTML = '<option value="">Sem horários disponíveis</option>';
      return;
    }

    bTime.innerHTML = '<option value="">Escolha um horário</option>';
    available.forEach(t => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t;
      bTime.appendChild(opt);
    });
  }

  // submit
  if (bookingForm) bookingForm.addEventListener("submit", e => {
    e.preventDefault();
    hideFeedback(bFeedback);

    const service = bService.value;
    const date    = bDate.value;
    const time    = bTime.value;
    const name    = bName.value.trim();
    const phone   = bPhone.value.trim();

    // validação
    if (!service || !date || !time || !name || !phone) {
      showFeedback(bFeedback, "Por favor, preencha todos os campos.", "error");
      return;
    }
    if (name.length < 3) {
      showFeedback(bFeedback, "Nome deve ter pelo menos 3 caracteres.", "error");
      return;
    }
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      showFeedback(bFeedback, "Telefone inválido. Utilize (00) 00000-0000.", "error");
      return;
    }

    // verificar conflito
    const appointments = getAppointments();
    const conflict = appointments.some(a => a.date === date && a.time === time && a.status !== "Cancelado");
    if (conflict) {
      showFeedback(bFeedback, "Este horário já foi reservado. Escolha outro.", "error");
      loadAvailableTimes();
      return;
    }

    // criar agendamento
    const newAppt = {
      id: Date.now(),
      service,
      date,
      time,
      name,
      phone,
      price: SERVICES[service],
      status: "Confirmado",
      createdAt: new Date().toISOString(),
    };
    appointments.push(newAppt);
    saveAppointments(appointments);

    showFeedback(bFeedback, `✓ Agendamento confirmado! ${service} em ${date} às ${time}. Aguarde contato.`, "success");
    bookingForm.reset();
    bDate.min = todayStr();
    bTime.innerHTML = '<option value="">Selecione a data primeiro</option>';

    // se admin logado, atualiza dashboard
    if (state.loggedIn) renderDashboard();
  });

  /* ═══════════════════════════════════════════════════════
     6 · ADMIN SYSTEM
     ═══════════════════════════════════════════════════════ */
  const adminForm     = $("#admin-login-form");
  const adminFeedback = $("#admin-feedback");
  const adminDashBody = $("#admin-dash-body");
  const adminLogout   = $("#admin-logout");

  // login
  adminForm.addEventListener("submit", e => {
    e.preventDefault();
    hideFeedback(adminFeedback);

    const email = $("#a-email").value.trim();
    const pass  = $("#a-pass").value.trim();

    if (!email || !pass) {
      showFeedback(adminFeedback, "Preencha e-mail e senha.", "error");
      return;
    }
    if (email !== ADMIN_CREDENTIALS.email || pass !== ADMIN_CREDENTIALS.password) {
      showFeedback(adminFeedback, "Credenciais inválidas. Tente novamente.", "error");
      return;
    }

    // sucesso
    state.loggedIn = true;
    localStorage.setItem(STORAGE_KEYS.token, "aldebert-jwt-demo-token");
    showFeedback(adminFeedback, "✓ Login realizado com sucesso!", "success");
    adminLogout.style.display = "inline-flex";
    renderDashboard();
  });

  // logout
  adminLogout.addEventListener("click", () => {
    state.loggedIn = false;
    localStorage.removeItem(STORAGE_KEYS.token);
    adminLogout.style.display = "none";
    hideFeedback(adminFeedback);
    renderDashboardEmpty();
  });

  function renderDashboard() {
    const appointments = getAppointments().filter(a => a.status !== "Cancelado");

    if (appointments.length === 0) {
      adminDashBody.innerHTML = `
        <div class="admin__empty">
          <i data-lucide="calendar-x"></i>
          <p>Nenhum agendamento encontrado.</p>
        </div>`;
      if (window.lucide) lucide.createIcons();
      return;
    }

    // ordenar por data e hora
    appointments.sort((a, b) => {
      if (a.date === b.date) return a.time.localeCompare(b.time);
      return a.date.localeCompare(b.date);
    });

    let html = '<div class="admin__appointments">';
    appointments.forEach(appt => {
      html += `
        <div class="appt-card">
          <div class="appt-card__info">
            <span class="appt-card__service">${appt.service}</span>
            <span class="appt-card__details">
              📅 ${appt.date} &nbsp; 🕐 ${appt.time} &nbsp; 👤 ${appt.name} &nbsp; 📞 ${appt.phone}
            </span>
            <span class="appt-card__details">R$ ${appt.price}</span>
          </div>
          <div style="display:flex;gap:8px;align-items:center;">
            <span class="appt-card__status">${appt.status}</span>
            <button class="btn btn--ghost btn--sm" data-cancel-id="${appt.id}" title="Cancelar agendamento">
              ✕ Cancelar
            </button>
          </div>
        </div>`;
    });
    html += "</div>";
    adminDashBody.innerHTML = html;

    // bind cancel
    $$("[data-cancel-id]", adminDashBody).forEach(btn => {
      btn.addEventListener("click", () => {
        const id = parseInt(btn.dataset.cancelId);
        cancelAppointment(id);
      });
    });

    if (window.lucide) lucide.createIcons();
  }

  function renderDashboardEmpty() {
    adminDashBody.innerHTML = `
      <div class="admin__empty">
        <i data-lucide="lock"></i>
        <p>Faça login para visualizar e gerenciar os agendamentos.</p>
      </div>`;
    if (window.lucide) lucide.createIcons();
  }

  function cancelAppointment(id) {
    const appointments = getAppointments();
    const idx = appointments.findIndex(a => a.id === id);
    if (idx === -1) return;
    appointments[idx].status = "Cancelado";
    saveAppointments(appointments);
    renderDashboard();
  }

  // init — se já estava logado
  if (state.loggedIn) {
    adminLogout.style.display = "inline-flex";
    renderDashboard();
  }

  /* ═══════════════════════════════════════════════════════
     7 · RE-INIT LUCIDE (for dynamic content)
     ═══════════════════════════════════════════════════════ */
  if (window.lucide) lucide.createIcons();
});
