(function initGuardiesLab() {
  const parser = window.HorariXmlParser;
  const STORAGE_GUARD_CODES = 'quota_guardies_lab_codes';

  const state = {
    sessions: [],
    resum: null,
    dia: '',
    hora: '',
    guardiaCodes: new Set(loadGuardCodes()),
    absents: new Set(),
    assignacions: new Map(),
    includeFree: false,
  };

  const el = {
    file: document.getElementById('xml-file'),
    error: document.getElementById('error-box'),
    empty: document.getElementById('empty-state'),
    workspace: document.getElementById('workspace'),
    statSessions: document.getElementById('stat-sessions'),
    statProfessors: document.getElementById('stat-professors'),
    statGrups: document.getElementById('stat-grups'),
    statActivitats: document.getElementById('stat-activitats'),
    diaSelect: document.getElementById('dia-select'),
    horaSelect: document.getElementById('hora-select'),
    activityList: document.getElementById('activity-list'),
    clearGuardCodes: document.getElementById('clear-guard-codes'),
    absentSelect: document.getElementById('absent-select'),
    addAbsent: document.getElementById('add-absent'),
    absentList: document.getElementById('absent-list'),
    clearAbsents: document.getElementById('clear-absents'),
    includeFree: document.getElementById('include-free'),
    uncoveredList: document.getElementById('uncovered-list'),
    coverageCount: document.getElementById('coverage-count'),
    guardList: document.getElementById('guard-list'),
    guardCount: document.getElementById('guard-count'),
    freeList: document.getElementById('free-list'),
    freeCount: document.getElementById('free-count'),
  };

  el.file.addEventListener('change', onFileChange);
  el.diaSelect.addEventListener('change', () => {
    state.dia = el.diaSelect.value;
    ajustarHoraDisponible();
    render();
  });
  el.horaSelect.addEventListener('change', () => {
    state.hora = el.horaSelect.value;
    render();
  });
  el.clearGuardCodes.addEventListener('click', () => {
    state.guardiaCodes.clear();
    saveGuardCodes();
    render();
  });
  el.addAbsent.addEventListener('click', afegirAbsentSeleccionat);
  el.absentSelect.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') afegirAbsentSeleccionat();
  });
  el.clearAbsents.addEventListener('click', () => {
    state.absents.clear();
    state.assignacions.clear();
    render();
  });
  el.includeFree.addEventListener('change', () => {
    state.includeFree = el.includeFree.checked;
    render();
  });

  function loadGuardCodes() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_GUARD_CODES) || '[]');
    } catch {
      return [];
    }
  }

  function saveGuardCodes() {
    localStorage.setItem(STORAGE_GUARD_CODES, JSON.stringify(Array.from(state.guardiaCodes)));
  }

  function showError(message) {
    el.error.textContent = message || '';
    el.error.classList.toggle('hidden', !message);
  }

  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result || '');
      reader.onerror = () => reject(new Error("No s'ha pogut llegir el fitxer."));
      reader.readAsText(file, 'ISO-8859-1');
    });
  }

  async function onFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      showError('');
      const text = await readFileText(file);
      const result = parser.parseHorariXml(text);
      state.sessions = result.sessions;
      state.resum = result.resum;
      state.absents.clear();
      state.assignacions.clear();
      state.dia = result.resum.dies[0] || '';
      state.hora = result.resum.hores[0] || '';
      renderInitialData();
      ajustarHoraDisponible();
      render();
    } catch (error) {
      state.sessions = [];
      state.resum = null;
      showError(error.message || String(error));
      render();
    }
  }

  function renderInitialData() {
    if (!state.resum) return;

    el.statSessions.textContent = state.resum.sessions;
    el.statProfessors.textContent = state.resum.professors;
    el.statGrups.textContent = state.resum.grups;
    el.statActivitats.textContent = state.resum.activitats.length;

    el.diaSelect.innerHTML = state.resum.dies
      .map((dia) => `<option value="${escapeHtml(dia)}">${escapeHtml(parser.diaLabel(dia))}</option>`)
      .join('');

    el.horaSelect.innerHTML = state.resum.hores
      .map((hora) => `<option value="${escapeHtml(hora)}">${escapeHtml(hora)}</option>`)
      .join('');

    renderActivityList();
    renderAbsentSelect();
  }

  function ajustarHoraDisponible() {
    const frangesDia = state.resum?.franges.filter((f) => f.dia === state.dia) || [];
    const hores = frangesDia.map((f) => f.hora);
    el.horaSelect.innerHTML = hores
      .map((hora) => `<option value="${escapeHtml(hora)}">${escapeHtml(hora)}</option>`)
      .join('');

    if (!hores.includes(state.hora)) state.hora = hores[0] || '';
    el.diaSelect.value = state.dia;
    el.horaSelect.value = state.hora;
  }

  function renderActivityList() {
    const activitats = state.resum?.activitats || [];
    if (!activitats.length) {
      el.activityList.innerHTML = '<div class="empty-small">El XML no té activitats.</div>';
      return;
    }

    el.activityList.innerHTML = activitats.map((activitat) => {
      const checked = state.guardiaCodes.has(activitat.valor) ? 'checked' : '';
      return `
        <label class="activity-item">
          <input type="checkbox" value="${escapeHtml(activitat.valor)}" ${checked} />
          <span class="activity-code">Activitat ${escapeHtml(activitat.valor)}</span>
          <span class="activity-count">${activitat.count}</span>
        </label>
      `;
    }).join('');

    el.activityList.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.guardiaCodes.add(input.value);
        else state.guardiaCodes.delete(input.value);
        saveGuardCodes();
        render();
      });
    });
  }

  function renderAbsentSelect() {
    const professors = parser.professorsOrdenats(state.sessions);
    el.absentSelect.innerHTML = professors
      .map((professor) => `<option value="${escapeHtml(professor.placa)}">${escapeHtml(professor.label)}</option>`)
      .join('');
  }

  function afegirAbsentSeleccionat() {
    const placa = el.absentSelect.value;
    if (!placa) return;
    state.absents.add(placa);
    render();
  }

  function render() {
    const teDades = Boolean(state.sessions.length);
    el.workspace.classList.toggle('hidden', !teDades);
    el.empty.classList.toggle('hidden', teDades);
    if (!teDades) return;

    el.includeFree.checked = state.includeFree;
    renderActivityList();
    renderAbsents();
    renderFranja();
  }

  function renderAbsents() {
    const absents = Array.from(state.absents).sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
    if (!absents.length) {
      el.absentList.innerHTML = '<div class="empty-small">Cap absent marcat.</div>';
      return;
    }

    el.absentList.innerHTML = absents.map((placa) => `
      <span class="chip">
        ${escapeHtml(labelProfessor(placa))}
        <button type="button" data-remove-absent="${escapeHtml(placa)}" aria-label="Lleva ${escapeHtml(labelProfessor(placa))}">x</button>
      </span>
    `).join('');

    el.absentList.querySelectorAll('[data-remove-absent]').forEach((button) => {
      button.addEventListener('click', () => {
        state.absents.delete(button.dataset.removeAbsent);
        state.assignacions.clear();
        render();
      });
    });
  }

  function renderFranja() {
    const ocupacio = parser.ocupacioFranja(state.sessions, state.dia, state.hora, state.guardiaCodes);
    const absents = new Set(state.absents);
    const guardies = ocupacio
      .filter((p) => !absents.has(p.placa) && p.guardies.length)
      .sort((a, b) => a.placa.localeCompare(b.placa, 'ca', { numeric: true }));
    const lliures = ocupacio
      .filter((p) => !absents.has(p.placa) && p.lliure)
      .sort((a, b) => a.placa.localeCompare(b.placa, 'ca', { numeric: true }));

    const sessionsAbsents = parser.sessionsDeFranja(state.sessions, state.dia, state.hora)
      .filter((sessio) => absents.has(sessio.placa) && sessio.teClasse);
    const descobertes = parser.agruparSessionsCobertura(sessionsAbsents);

    netejarAssignacionsOrfes(descobertes, guardies, lliures);
    renderGuardies(guardies);
    renderLliures(lliures);
    renderDescobertes(descobertes, guardies, lliures);
  }

  function renderGuardies(guardies) {
    el.guardCount.textContent = guardies.length;
    if (!state.guardiaCodes.size) {
      el.guardList.innerHTML = '<div class="empty-small">Marca els codis de guàrdia.</div>';
      return;
    }
    if (!guardies.length) {
      el.guardList.innerHTML = '<div class="empty-small">Cap professor de guàrdia en aquesta franja.</div>';
      return;
    }
    el.guardList.innerHTML = guardies.map((prof) => `
      <div class="teacher-item">
        <div class="teacher-name">${escapeHtml(labelProfessor(prof.placa))}</div>
        <div class="teacher-detail">${escapeHtml(formatSessionsActivitat(prof.guardies))}</div>
      </div>
    `).join('');
  }

  function renderLliures(lliures) {
    el.freeCount.textContent = lliures.length;
    if (!lliures.length) {
      el.freeList.innerHTML = '<div class="empty-small">Sense professorat lliure.</div>';
      return;
    }
    el.freeList.innerHTML = lliures.map((prof) => `
      <div class="teacher-item">
        <div class="teacher-name">${escapeHtml(labelProfessor(prof.placa))}</div>
      </div>
    `).join('');
  }

  function renderDescobertes(descobertes, guardies, lliures) {
    const candidates = [
      ...guardies.map((p) => ({ ...p, origen: 'guardia' })),
      ...(state.includeFree ? lliures.map((p) => ({ ...p, origen: 'lliure' })) : []),
    ];
    const pendents = descobertes.filter((item) => !state.assignacions.get(item.id)).length;
    el.coverageCount.textContent = `${pendents} pendents`;

    if (!state.absents.size) {
      el.uncoveredList.innerHTML = '<div class="empty-small">Marca professorat absent per veure les sessions afectades.</div>';
      return;
    }

    if (!descobertes.length) {
      el.uncoveredList.innerHTML = '<div class="empty-small">No hi ha classes descobertes en aquesta franja.</div>';
      return;
    }

    el.uncoveredList.innerHTML = descobertes.map((item) => {
      const assignat = state.assignacions.get(item.id) || '';
      const coveredClass = assignat ? 'covered' : '';
      return `
        <article class="uncovered-item ${coveredClass}">
          <div class="uncovered-head">
            <div>
              <div class="session-title">${escapeHtml(formatMateria(item))}</div>
              <div class="session-meta">${escapeHtml(formatBloc(item))}</div>
              <div class="session-meta">Falta ${escapeHtml(labelProfessor(item.placa))}</div>
            </div>
            <span class="pill">${assignat ? 'Coberta' : 'Pendent'}</span>
          </div>
          <div class="assignment">
            <select data-assignacio="${escapeHtml(item.id)}">
              <option value="">Tria professor</option>
              ${candidates.map((prof) => `
                <option value="${escapeHtml(prof.placa)}" ${prof.placa === assignat ? 'selected' : ''}>
                  ${escapeHtml(labelProfessor(prof.placa))}${prof.origen === 'lliure' ? ' · lliure' : ''}
                </option>
              `).join('')}
            </select>
            <button type="button" class="ghost" data-clear-assignacio="${escapeHtml(item.id)}">Neteja</button>
          </div>
        </article>
      `;
    }).join('');

    el.uncoveredList.querySelectorAll('[data-assignacio]').forEach((select) => {
      select.addEventListener('change', () => {
        if (select.value) state.assignacions.set(select.dataset.assignacio, select.value);
        else state.assignacions.delete(select.dataset.assignacio);
        render();
      });
    });

    el.uncoveredList.querySelectorAll('[data-clear-assignacio]').forEach((button) => {
      button.addEventListener('click', () => {
        state.assignacions.delete(button.dataset.clearAssignacio);
        render();
      });
    });
  }

  function netejarAssignacionsOrfes(descobertes, guardies, lliures) {
    const ids = new Set(descobertes.map((item) => item.id));
    const candidats = new Set([
      ...guardies.map((p) => p.placa),
      ...(state.includeFree ? lliures.map((p) => p.placa) : []),
    ]);
    Array.from(state.assignacions.entries()).forEach(([id, professor]) => {
      if (!ids.has(id) || !candidats.has(professor)) state.assignacions.delete(id);
    });
  }

  function labelProfessor(placa) {
    return `Placa ${placa}`;
  }

  function formatSessionsActivitat(sessions) {
    const codis = Array.from(new Set(sessions.map((s) => s.activitat).filter(Boolean)));
    return codis.length ? `Activitat ${codis.join(', ')}` : 'Guàrdia';
  }

  function formatMateria(item) {
    if (item.materia) return `Matèria ${item.materia}`;
    if (item.activitat) return `Activitat ${item.activitat}`;
    return 'Sessió';
  }

  function formatBloc(item) {
    const parts = [];
    if (item.cursos.length) parts.push(`Curs ${item.cursos.join('+')}`);
    if (item.grups.length) parts.push(`Grup ${item.grups.join('+')}`);
    if (item.aula) parts.push(`Aula ${item.aula}`);
    parts.push(`${item.diaLabel} ${item.hora}`);
    return parts.join(' · ');
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
