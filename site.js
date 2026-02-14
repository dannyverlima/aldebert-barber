/* ═══════════════════════════════════════════════════════════
   ALDEBERT BARBER — site.js
   Frontend completo conectado à API Node.js + PostgreSQL.
   Login/Registro de usuários, admin dashboard, agendamento.
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
  const API_BASE = window.location.origin + "/api";

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

  const STORAGE_KEYS = {
    token: "aldebert_token",
    user:  "aldebert_user",
  };

  /* ═══════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════ */
  const state = {
    token: localStorage.getItem(STORAGE_KEYS.token) || null,
    user: JSON.parse(localStorage.getItem(STORAGE_KEYS.user) || "null"),
  };

  function saveAuth(token, user) {
    state.token = token;
    state.user = user;
    localStorage.setItem(STORAGE_KEYS.token, token);
    localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  }

  function clearAuth() {
    state.token = null;
    state.user = null;
    localStorage.removeItem(STORAGE_KEYS.token);
    localStorage.removeItem(STORAGE_KEYS.user);
  }

  function isLoggedIn() { return !!state.token; }
  function isAdmin()    { return state.user?.role === "admin"; }
  function isUser()     { return state.user?.role === "user"; }

  /* ═══════════════════════════════════════════════════════
     HELPERS
     ═══════════════════════════════════════════════════════ */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  async function api(path, options = {}) {
    const headers = { "Content-Type": "application/json", ...options.headers };
    if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Erro na requisição");
    return data;
  }

  function showFeedback(el, msg, type = "success") {
    if (!el) return;
    el.textContent = msg;
    el.className = "form__feedback " + type;
    el.style.display = "block";
  }
  function hideFeedback(el) {
    if (!el) return;
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
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  /* ═══════════════════════════════════════════════════════
     1 · NAVIGATION
     ═══════════════════════════════════════════════════════ */
  const header  = $("#header");
  const navMenu = $("#nav-menu");
  const navToggle = $("#nav-toggle");
  const navClose  = $("#nav-close");

  if (navToggle) navToggle.addEventListener("click", () => navMenu.classList.add("open"));
  if (navClose) navClose.addEventListener("click",  () => navMenu.classList.remove("open"));

  $$(".nav__link").forEach(link => {
    link.addEventListener("click", () => navMenu.classList.remove("open"));
  });

  const onScroll = () => {
    if (header) header.classList.toggle("scrolled", window.scrollY > 60);
    const btt = $("#back-to-top");
    if (btt) btt.classList.toggle("visible", window.scrollY > 600);
    $$(".section, .hero").forEach(sec => {
      const id = sec.getAttribute("id");
      if (!id) return;
      const rect = sec.getBoundingClientRect();
      const link = $(`.nav__link[href="#${id}"]`);
      if (link) link.classList.toggle("active", rect.top <= 120 && rect.bottom > 120);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const backToTop = $("#back-to-top");
  if (backToTop) backToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));

  /* ═══════════════════════════════════════════════════════
     2 · PARALLAX
     ═══════════════════════════════════════════════════════ */
  const heroParallax = $("#hero-parallax");
  if (heroParallax) {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          heroParallax.style.transform = `translateY(${window.scrollY * 0.35}px)`;
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
  if (lbClose) lbClose.addEventListener("click", closeLightbox);
  if (lbPrev) lbPrev.addEventListener("click", () => lbNav(-1));
  if (lbNext) lbNext.addEventListener("click", () => lbNav(1));
  if (lightbox) lightbox.addEventListener("click", e => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener("keydown", e => {
    if (!lightbox || !lightbox.classList.contains("active")) return;
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
     5 · USER AUTH SYSTEM (Login / Registro)
     ═══════════════════════════════════════════════════════ */
  const userLoginForm     = $("#user-login-form");
  const userRegisterForm  = $("#user-register-form");
  const userFeedback      = $("#user-feedback");
  const userLoggedArea    = $("#user-logged-area");
  const userNameDisplay   = $("#user-name-display");
  const userLogoutBtn     = $("#user-logout");
  const showRegisterLink  = $("#show-register");
  const showLoginLink     = $("#show-login");
  const loginFormWrap     = $("#login-form-wrap");
  const registerFormWrap  = $("#register-form-wrap");

  if (showRegisterLink) showRegisterLink.addEventListener("click", e => {
    e.preventDefault();
    if (loginFormWrap) loginFormWrap.style.display = "none";
    if (registerFormWrap) registerFormWrap.style.display = "block";
    hideFeedback(userFeedback);
  });
  if (showLoginLink) showLoginLink.addEventListener("click", e => {
    e.preventDefault();
    if (registerFormWrap) registerFormWrap.style.display = "none";
    if (loginFormWrap) loginFormWrap.style.display = "block";
    hideFeedback(userFeedback);
  });

  if (userLoginForm) userLoginForm.addEventListener("submit", async e => {
    e.preventDefault();
    hideFeedback(userFeedback);
    const email = $("#u-login-email").value.trim();
    const password = $("#u-login-pass").value.trim();
    if (!email || !password) {
      showFeedback(userFeedback, "Preencha e-mail e senha.", "error");
      return;
    }
    try {
      const data = await api("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      saveAuth(data.token, data.user);
      showFeedback(userFeedback, `✓ Bem-vindo, ${data.user.name}!`, "success");
      updateAuthUI();
    } catch (err) {
      showFeedback(userFeedback, err.message, "error");
    }
  });

  if (userRegisterForm) userRegisterForm.addEventListener("submit", async e => {
    e.preventDefault();
    hideFeedback(userFeedback);
    const name     = $("#u-reg-name").value.trim();
    const email    = $("#u-reg-email").value.trim();
    const phone    = $("#u-reg-phone").value.trim();
    const password = $("#u-reg-pass").value.trim();
    if (!name || !email || !password) {
      showFeedback(userFeedback, "Preencha nome, e-mail e senha.", "error");
      return;
    }
    if (password.length < 6) {
      showFeedback(userFeedback, "Senha deve ter pelo menos 6 caracteres.", "error");
      return;
    }
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name, email, phone: phone || undefined, password }),
      });
      saveAuth(data.token, data.user);
      showFeedback(userFeedback, `✓ Conta criada! Bem-vindo, ${data.user.name}!`, "success");
      updateAuthUI();
    } catch (err) {
      showFeedback(userFeedback, err.message, "error");
    }
  });

  if (userLogoutBtn) userLogoutBtn.addEventListener("click", () => {
    clearAuth();
    updateAuthUI();
  });

  function updateAuthUI() {
    const isAuth = isLoggedIn() && isUser();
    if (loginFormWrap)  loginFormWrap.style.display  = isAuth ? "none" : "block";
    if (registerFormWrap) registerFormWrap.style.display = "none";
    if (userLoggedArea) userLoggedArea.style.display = isAuth ? "block" : "none";
    if (userNameDisplay && state.user) userNameDisplay.textContent = state.user.name;

    // Nav login button & user indicator
    const navLoginBtn = $("#nav-login-btn");
    const navUserIndicator = $("#nav-user-indicator");
    const navUserName = $("#nav-user-name");
    const navLoginLink = $("#nav-login-link");
    const anyLoggedIn = isLoggedIn();

    if (navLoginBtn) navLoginBtn.style.display = anyLoggedIn ? "none" : "";
    if (navUserIndicator) navUserIndicator.style.display = anyLoggedIn ? "flex" : "none";
    if (navUserName && state.user) navUserName.textContent = state.user.name;
    if (navLoginLink) {
      if (anyLoggedIn) {
        navLoginLink.textContent = state.user?.name || "Minha Conta";
        navLoginLink.href = isAdmin() ? "#admin" : "#user-auth";
      } else {
        navLoginLink.textContent = "Login";
        navLoginLink.href = "#user-auth";
      }
    }

    if (isAuth && state.user) {
      const bNameEl = $("#b-name");
      const bPhoneEl = $("#b-phone");
      if (bNameEl && state.user.name) bNameEl.value = state.user.name;
      if (bPhoneEl && state.user.phone) bPhoneEl.value = state.user.phone;
    }
    if (window.lucide) lucide.createIcons();
  }

  // Nav user indicator click → go to user section
  const navUserIndicatorEl = $("#nav-user-indicator");
  if (navUserIndicatorEl) {
    navUserIndicatorEl.addEventListener("click", () => {
      const target = isAdmin() ? "#admin" : "#user-auth";
      document.querySelector(target)?.scrollIntoView({ behavior: "smooth" });
    });
  }

  /* ═══════════════════════════════════════════════════════
     6 · BOOKING SYSTEM (conectado à API)
     ═══════════════════════════════════════════════════════ */
  const bookingForm = $("#booking-form");
  const bService    = $("#b-service");
  const bDate       = $("#b-date");
  const bTime       = $("#b-time");
  const bName       = $("#b-name");
  const bPhone      = $("#b-phone");
  const bFeedback   = $("#booking-feedback");

  if (bDate) bDate.min = todayStr();

  if (bPhone) bPhone.addEventListener("input", () => {
    bPhone.value = phoneMask(bPhone.value);
  });

  if (bDate) bDate.addEventListener("change", () => {
    loadAvailableTimes();
  });

  async function loadAvailableTimes() {
    const date = bDate.value;
    bTime.innerHTML = "";

    if (!date) {
      bTime.innerHTML = '<option value="">Selecione a data primeiro</option>';
      return;
    }

    try {
      const data = await api(`/availability?date=${date}`);
      const bookedTimes = data.bookedTimes || [];
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
    } catch (err) {
      bTime.innerHTML = '<option value="">Escolha um horário</option>';
      ALL_TIMES.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        bTime.appendChild(opt);
      });
    }
  }

  if (bookingForm) bookingForm.addEventListener("submit", async e => {
    e.preventDefault();
    hideFeedback(bFeedback);

    const service = bService.value;
    const date    = bDate.value;
    const time    = bTime.value;
    const name    = bName.value.trim();
    const phone   = bPhone.value.trim();

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

    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          service, date, time, name, phone,
          price: SERVICES[service],
        }),
      });
      showFeedback(bFeedback, `✓ Agendamento confirmado! ${service} em ${date} às ${time}. Aguarde contato.`, "success");
      bookingForm.reset();
      if (bDate) bDate.min = todayStr();
      bTime.innerHTML = '<option value="">Selecione a data primeiro</option>';

      if (isAdmin()) loadDashboardData();
    } catch (err) {
      showFeedback(bFeedback, err.message || "Erro ao agendar. Tente novamente.", "error");
      loadAvailableTimes();
    }
  });

  /* ═══════════════════════════════════════════════════════
     7 · ADMIN SYSTEM (conectado à API — Dashboard Completo)
     ═══════════════════════════════════════════════════════ */
  const adminForm        = $("#admin-login-form");
  const adminFeedback    = $("#admin-feedback");
  const adminLoginWrap   = $("#admin-login-wrap");
  const adminFullDash    = $("#admin-full-dashboard");
  const adminLogout      = $("#admin-logout");
  const dashGreeting     = $("#dash-greeting");

  // Tab switching
  $$(".dash__tab").forEach(tab => {
    tab.addEventListener("click", () => {
      $$(".dash__tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const target = tab.dataset.tab;
      $$(".dash__panel").forEach(p => p.style.display = "none");
      const panel = $(`#panel-${target}`);
      if (panel) panel.style.display = "block";
    });
  });

  // Admin login
  if (adminForm) adminForm.addEventListener("submit", async e => {
    e.preventDefault();
    hideFeedback(adminFeedback);

    const email = $("#a-email").value.trim();
    const pass  = $("#a-pass").value.trim();

    if (!email || !pass) {
      showFeedback(adminFeedback, "Preencha e-mail e senha.", "error");
      return;
    }

    try {
      const data = await api("/auth/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password: pass }),
      });
      saveAuth(data.token, data.user);
      showFeedback(adminFeedback, "✓ Login realizado com sucesso!", "success");
      showAdminDashboard();
    } catch (err) {
      showFeedback(adminFeedback, err.message || "Credenciais inválidas.", "error");
    }
  });

  if (adminLogout) adminLogout.addEventListener("click", () => {
    clearAuth();
    hideAdminDashboard();
    updateAuthUI();
  });

  function showAdminDashboard() {
    if (adminLoginWrap) adminLoginWrap.style.display = "none";
    if (adminFullDash) adminFullDash.style.display = "block";
    if (dashGreeting && state.user) dashGreeting.textContent = `Olá, ${state.user.name || "Admin"}`;
    // Update nav indicator for admin
    const navLoginBtn = $("#nav-login-btn");
    const navUserIndicator = $("#nav-user-indicator");
    const navUserName = $("#nav-user-name");
    if (navLoginBtn) navLoginBtn.style.display = "none";
    if (navUserIndicator) navUserIndicator.style.display = "flex";
    if (navUserName && state.user) navUserName.textContent = state.user.name || "Admin";
    loadDashboardData();
    if (window.lucide) lucide.createIcons();
  }

  function hideAdminDashboard() {
    if (adminLoginWrap) adminLoginWrap.style.display = "block";
    if (adminFullDash) adminFullDash.style.display = "none";
    hideFeedback(adminFeedback);
    // Reset nav indicator
    const navLoginBtn = $("#nav-login-btn");
    const navUserIndicator = $("#nav-user-indicator");
    if (navLoginBtn) navLoginBtn.style.display = "";
    if (navUserIndicator) navUserIndicator.style.display = "none";
  }

  function getTodayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  async function loadDashboardData() {
    try {
      // Buscar tudo em paralelo
      const [apptData, loyaltyData, availabilityData] = await Promise.all([
        api("/appointments"),
        api("/loyalty"),
        api(`/availability?date=${getTodayStr()}`),
      ]);

      const appointments = (apptData.appointments || []).filter(a => a.status !== "Cancelado");
      const clients = loyaltyData.clients || [];
      const bookedToday = availabilityData.bookedTimes || [];

      // ═══ Summary Cards ═══
      const today = getTodayStr();
      const todayAppointments = appointments.filter(a => {
        const aDate = a.date ? a.date.split("T")[0] : a.date;
        return aDate === today;
      });
      const availableToday = ALL_TIMES.filter(t => !bookedToday.includes(t));
      const loyaltyReady = clients.filter(c => c.cuts_completed >= 10).length;

      const elTodayCount = $("#dash-today-count");
      const elAvailCount = $("#dash-available-count");
      const elTotalClients = $("#dash-total-clients");
      const elLoyaltyReady = $("#dash-loyalty-ready");

      if (elTodayCount)   elTodayCount.textContent = todayAppointments.length;
      if (elAvailCount)   elAvailCount.textContent = availableToday.length;
      if (elTotalClients) elTotalClients.textContent = clients.length;
      if (elLoyaltyReady) elLoyaltyReady.textContent = loyaltyReady;

      // ═══ Painel HOJE ═══
      renderTodayPanel(todayAppointments, availableToday, bookedToday);

      // ═══ Painel AGENDAMENTOS ═══
      renderAllAppointments(appointments);

      // ═══ Painel FIDELIDADE ═══
      renderLoyaltyPanel(clients);

      if (window.lucide) lucide.createIcons();
    } catch (err) {
      console.error("Erro ao carregar dashboard:", err.message);
    }
  }

  function renderTodayPanel(todayAppts, availableSlots, bookedSlots) {
    const todayContainer = $("#today-appointments");
    const slotsContainer = $("#today-available-slots");

    if (todayContainer) {
      if (todayAppts.length === 0) {
        todayContainer.innerHTML = `
          <div class="admin__empty">
            <i data-lucide="coffee"></i>
            <p>Nenhum agendamento para hoje. Dia tranquilo!</p>
          </div>`;
      } else {
        let html = '<div class="admin__appointments">';
        todayAppts.forEach(appt => {
          html += `
            <div class="appt-card">
              <div class="appt-card__info">
                <span class="appt-card__service">${appt.service}</span>
                <span class="appt-card__details">
                  🕐 ${appt.time} &nbsp; 👤 ${appt.name} &nbsp; 📞 ${appt.phone}
                </span>
                <span class="appt-card__details">R$ ${appt.price}${appt.user_email ? ' &nbsp; ✉ ' + appt.user_email : ''}</span>
              </div>
              <div class="appt-card__actions">
                <span class="appt-card__status">${appt.status}</span>
              </div>
            </div>`;
        });
        html += '</div>';
        todayContainer.innerHTML = html;
      }
    }

    if (slotsContainer) {
      let html = '';
      ALL_TIMES.forEach(t => {
        const isBooked = bookedSlots.includes(t);
        html += `<span class="dash__time-slot ${isBooked ? 'dash__time-slot--booked' : 'dash__time-slot--free'}">${t}</span>`;
      });
      slotsContainer.innerHTML = html;
    }
  }

  function renderAllAppointments(appointments) {
    const container = $("#all-appointments");
    if (!container) return;

    if (appointments.length === 0) {
      container.innerHTML = `
        <div class="admin__empty">
          <i data-lucide="calendar-x"></i>
          <p>Nenhum agendamento encontrado.</p>
        </div>`;
      return;
    }

    let html = '<div class="admin__appointments">';
    appointments.forEach(appt => {
      const dateFormatted = appt.date ? appt.date.split("T")[0] : appt.date;
      html += `
        <div class="appt-card">
          <div class="appt-card__info">
            <span class="appt-card__service">${appt.service}</span>
            <span class="appt-card__details">
              📅 ${dateFormatted} &nbsp; 🕐 ${appt.time} &nbsp; 👤 ${appt.name} &nbsp; 📞 ${appt.phone}
            </span>
            <span class="appt-card__details">R$ ${appt.price}${appt.user_email ? ' &nbsp; ✉ ' + appt.user_email : ''}</span>
          </div>
          <div class="appt-card__actions">
            <span class="appt-card__status">${appt.status}</span>
            <button class="btn btn--ghost btn--sm" data-cancel-id="${appt.id}" title="Cancelar agendamento">
              ✕ Cancelar
            </button>
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;

    $$("[data-cancel-id]", container).forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.cancelId;
        try {
          await api(`/appointments/${id}`, { method: "DELETE" });
          loadDashboardData();
        } catch (err) {
          console.error("Erro ao cancelar:", err.message);
        }
      });
    });
  }

  function renderLoyaltyPanel(clients) {
    const container = $("#loyalty-clients-list");
    const searchInput = $("#loyalty-search");
    if (!container) return;

    function renderClients(filteredClients) {
      if (filteredClients.length === 0) {
        container.innerHTML = `
          <div class="admin__empty">
            <i data-lucide="users"></i>
            <p>Nenhum cliente encontrado.</p>
          </div>`;
        if (window.lucide) lucide.createIcons();
        return;
      }

      let html = '';
      filteredClients.forEach(client => {
        const cuts = client.cuts_completed || 0;
        const isComplete = cuts >= 10;

        // Build progress dots
        let dotsHtml = '';
        for (let i = 1; i <= 10; i++) {
          dotsHtml += `<span class="loyalty-dot ${i <= cuts ? 'loyalty-dot--filled' : ''}">${i <= cuts ? '' : i}</span>`;
        }

        html += `
          <div class="loyalty-card ${isComplete ? 'loyalty-card--complete' : ''}">
            <div class="loyalty-card__info">
              <h5>${client.name} ${isComplete ? '🏆' : ''}</h5>
              <p>${client.email}${client.phone ? ' &nbsp;•&nbsp; ' + client.phone : ''}</p>
              <div class="loyalty-progress">
                ${dotsHtml}
                <span class="loyalty-count">${cuts}/10</span>
              </div>
            </div>
            <div class="loyalty-card__actions">
              ${isComplete
                ? `<button class="btn btn--gold btn--sm" data-loyalty-claim="${client.user_id}">🎁 Resgatar</button>`
                : `<button class="btn btn--gold btn--sm" data-loyalty-add="${client.user_id}">+ Corte</button>`
              }
              ${cuts > 0
                ? `<button class="btn btn--ghost btn--sm" data-loyalty-remove="${client.user_id}">- Corte</button>`
                : ''
              }
            </div>
          </div>`;
      });
      container.innerHTML = html;

      // Event handlers for loyalty buttons
      $$("[data-loyalty-add]", container).forEach(btn => {
        btn.addEventListener("click", async () => {
          try {
            await api(`/loyalty/${btn.dataset.loyaltyAdd}/cut`, { method: "POST" });
            loadDashboardData();
          } catch (err) {
            console.error("Erro ao adicionar corte:", err.message);
          }
        });
      });

      $$("[data-loyalty-remove]", container).forEach(btn => {
        btn.addEventListener("click", async () => {
          try {
            await api(`/loyalty/${btn.dataset.loyaltyRemove}/remove-cut`, { method: "POST" });
            loadDashboardData();
          } catch (err) {
            console.error("Erro ao remover corte:", err.message);
          }
        });
      });

      $$("[data-loyalty-claim]", container).forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("Confirmar resgate da recompensa? O contador será zerado.")) return;
          try {
            await api(`/loyalty/${btn.dataset.loyaltyClaim}/claim`, { method: "POST" });
            loadDashboardData();
          } catch (err) {
            console.error("Erro ao resgatar:", err.message);
          }
        });
      });

      if (window.lucide) lucide.createIcons();
    }

    // Initial render
    renderClients(clients);

    // Search filter
    if (searchInput) {
      searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        if (!query) {
          renderClients(clients);
          return;
        }
        const filtered = clients.filter(c =>
          c.name.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query)
        );
        renderClients(filtered);
      });
    }
  }

  /* ═══════════════════════════════════════════════════════
     8 · INIT — restaurar sessão
     ═══════════════════════════════════════════════════════ */
  if (isAdmin()) {
    showAdminDashboard();
  }
  updateAuthUI();

  /* ═══════════════════════════════════════════════════════
     9 · RE-INIT LUCIDE
     ═══════════════════════════════════════════════════════ */
  if (window.lucide) lucide.createIcons();
});
