(function initGuardiesLab() {
  const parser = window.HorariXmlParser;
  const STORAGE_GUARD_CODES = 'quota_guardies_lab_codes';
  const STORAGE_ABBR_MAP = 'quota_guardies_lab_abbr_map';

  const state = {
    sessions: [],
    resum: null,
    professor: '',
    date: localDateString(new Date()),
    guardiaCodes: new Set(loadJson(STORAGE_GUARD_CODES, [])),
    abbrText: localStorage.getItem(STORAGE_ABBR_MAP) || '',
    abbrMap: new Map(),
    missing: new Set(),
    assignacions: new Map(),
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
    professorSelect: document.getElementById('professor-select'),
    dateInput: document.getElementById('date-input'),
    dateLabel: document.getElementById('date-label'),
    abbrMapInput: document.getElementById('abbr-map-input'),
    abbrMapCount: document.getElementById('abbr-map-count'),
    applyAbbrMap: document.getElementById('apply-abbr-map'),
    activityList: document.getElementById('activity-list'),
    clearGuardCodes: document.getElementById('clear-guard-codes'),
    scheduleTitle: document.getElementById('schedule-title'),
    clearMissing: document.getElementById('clear-missing'),
    scheduleGrid: document.getElementById('schedule-grid'),
    coverageCount: document.getElementById('coverage-count'),
    coverageList: document.getElementById('coverage-list'),
  };

  state.abbrMap = parseAbbrMap(state.abbrText);
  el.abbrMapInput.value = state.abbrText;
  el.dateInput.value = state.date;
  updateAbbrCount();

  el.file.addEventListener('change', onFileChange);
  el.professorSelect.addEventListener('change', () => {
    state.professor = el.professorSelect.value;
    state.missing.clear();
    state.assignacions.clear();
    render();
  });
  el.dateInput.addEventListener('change', () => {
    state.date = el.dateInput.value;
    state.missing.clear();
    state.assignacions.clear();
    render();
  });
  el.applyAbbrMap.addEventListener('click', () => {
    state.abbrText = el.abbrMapInput.value || '';
    state.abbrMap = parseAbbrMap(state.abbrText);
    localStorage.setItem(STORAGE_ABBR_MAP, state.abbrText);
    updateAbbrCount();
    renderProfessorSelect();
    render();
  });
  el.clearGuardCodes.addEventListener('click', () => {
    state.guardiaCodes.clear();
    saveGuardCodes();
    render();
  });
  el.clearMissing.addEventListener('click', () => {
    state.missing.clear();
    state.assignacions.clear();
    render();
  });

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
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
      state.professor = '';
      state.missing.clear();
      state.assignacions.clear();
      renderInitialData();
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
    renderProfessorSelect();
    renderActivityList();
  }

  function renderProfessorSelect() {
    if (!state.sessions.length) return;
    const professors = professorsOrdenatsAmbLabel();
    if (!state.professor || !professors.some((prof) => prof.placa === state.professor)) {
      state.professor = professors[0]?.placa || '';
    }

    el.professorSelect.innerHTML = professors.map((professor) => `
      <option value="${escapeHtml(professor.placa)}" ${professor.placa === state.professor ? 'selected' : ''}>
        ${escapeHtml(professor.label)}
      </option>
    `).join('');
  }

  function professorsOrdenatsAmbLabel() {
    return parser.professorsOrdenats(state.sessions)
      .map((professor) => ({
        ...professor,
        abbr: abbrProfessor(professor.placa),
        label: labelProfessor(professor.placa),
      }))
      .sort((a, b) => (a.abbr || a.placa).localeCompare(b.abbr || b.placa, 'ca', { numeric: true }));
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

  function render() {
    const teDades = Boolean(state.sessions.length);
    el.workspace.classList.toggle('hidden', !teDades);
    el.empty.classList.toggle('hidden', teDades);
    if (!teDades) return;

    renderDateLabel();
    renderActivityList();
    renderSchedule();
    renderCoverage();
  }

  function renderDateLabel() {
    const dia = diaXmlSeleccionat();
    const label = formatData(state.date);
    const teDiaLectiu = ['1', '2', '3', '4', '5'].includes(dia);
    el.dateLabel.textContent = teDiaLectiu
      ? `${label} · dia XML ${dia}`
      : `${label} · sense horari lectiu al XML`;
  }

  function renderSchedule() {
    const dia = diaXmlSeleccionat();
    const professorLabel = labelProfessor(state.professor);
    const sessions = sessionsProfessorDia(state.professor, dia);
    const items = parser.agruparSessionsCobertura(sessions)
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || '', 'ca', { numeric: true }));

    trimMissing(items);
    el.scheduleTitle.textContent = `${professorLabel} · ${parser.diaLabel(dia)}`;

    if (!items.length) {
      el.scheduleGrid.innerHTML = '<div class="empty-small">Aquest professor no té sessions aquest dia.</div>';
      return;
    }

    el.scheduleGrid.innerHTML = items.map((item) => {
      const selectable = item.sessions.some((sessio) => sessio.teClasse);
      const checked = state.missing.has(item.id) ? 'checked' : '';
      const disabled = selectable ? '' : 'disabled';
      const tipus = tipusItem(item);
      return `
        <label class="schedule-item ${selectable ? '' : 'schedule-item-muted'}">
          <input type="checkbox" data-missing="${escapeHtml(item.id)}" ${checked} ${disabled} />
          <span class="schedule-time">${escapeHtml(item.hora)}</span>
          <span class="schedule-main">
            <strong>${escapeHtml(formatMateria(item))}</strong>
            <small>${escapeHtml(formatBlocCurt(item))}</small>
          </span>
          <span class="schedule-type">${escapeHtml(tipus)}</span>
        </label>
      `;
    }).join('');

    el.scheduleGrid.querySelectorAll('[data-missing]').forEach((input) => {
      input.addEventListener('change', () => {
        if (input.checked) state.missing.add(input.dataset.missing);
        else state.missing.delete(input.dataset.missing);
        state.assignacions.delete(input.dataset.missing);
        renderCoverage();
      });
    });
  }

  function renderCoverage() {
    const dia = diaXmlSeleccionat();
    const selected = selectedMissingItems(dia);
    const pendents = selected.filter((item) => !state.assignacions.get(item.id)).length;
    el.coverageCount.textContent = `${selected.length} sessions · ${pendents} pendents`;

    if (!state.guardiaCodes.size) {
      el.coverageList.innerHTML = '<div class="empty-small">Marca el codi de Guà per trobar professorat de guàrdia.</div>';
      return;
    }

    if (!selected.length) {
      el.coverageList.innerHTML = '<div class="empty-small">Marca les sessions que falten al seu horari.</div>';
      return;
    }

    el.coverageList.innerHTML = selected.map((item) => {
      const candidates = guardiesPerFranja(item.dia, item.hora, item.placa);
      const assignat = state.assignacions.get(item.id) || '';
      const hasCandidates = candidates.length > 0;
      return `
        <article class="coverage-item ${assignat ? 'covered' : ''}">
          <div class="coverage-head">
            <div>
              <div class="session-title">${escapeHtml(item.hora)} · ${escapeHtml(formatMateria(item))}</div>
              <div class="session-meta">${escapeHtml(formatBlocCurt(item))}</div>
            </div>
            <span class="pill">${assignat ? 'Assignada' : hasCandidates ? `${candidates.length} Guà` : 'Sense Guà'}</span>
          </div>
          <div class="assignment">
            <select data-assignacio="${escapeHtml(item.id)}" ${hasCandidates ? '' : 'disabled'}>
              <option value="">Tria professor de Guà</option>
              ${candidates.map((candidate) => `
                <option value="${escapeHtml(candidate.placa)}" ${candidate.placa === assignat ? 'selected' : ''}>
                  ${escapeHtml(labelProfessor(candidate.placa))} · ${escapeHtml(formatSessionsActivitat(candidate.guardies))}
                </option>
              `).join('')}
            </select>
            <button type="button" class="ghost" data-clear-assignacio="${escapeHtml(item.id)}">Neteja</button>
          </div>
        </article>
      `;
    }).join('');

    el.coverageList.querySelectorAll('[data-assignacio]').forEach((select) => {
      select.addEventListener('change', () => {
        if (select.value) state.assignacions.set(select.dataset.assignacio, select.value);
        else state.assignacions.delete(select.dataset.assignacio);
        renderCoverage();
      });
    });

    el.coverageList.querySelectorAll('[data-clear-assignacio]').forEach((button) => {
      button.addEventListener('click', () => {
        state.assignacions.delete(button.dataset.clearAssignacio);
        renderCoverage();
      });
    });
  }

  function sessionsProfessorDia(placa, dia) {
    return state.sessions.filter((sessio) => sessio.placa === placa && sessio.dia === dia);
  }

  function selectedMissingItems(dia) {
    const items = parser.agruparSessionsCobertura(sessionsProfessorDia(state.professor, dia));
    return items
      .filter((item) => state.missing.has(item.id))
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || '', 'ca', { numeric: true }));
  }

  function guardiesPerFranja(dia, hora, professorAbsent) {
    return parser.ocupacioFranja(state.sessions, dia, hora, state.guardiaCodes)
      .filter((professor) => professor.placa !== professorAbsent && professor.guardies.length)
      .sort((a, b) => (abbrProfessor(a.placa) || a.placa).localeCompare(abbrProfessor(b.placa) || b.placa, 'ca', { numeric: true }));
  }

  function trimMissing(items) {
    const valid = new Set(items.map((item) => item.id));
    Array.from(state.missing).forEach((id) => {
      if (!valid.has(id)) {
        state.missing.delete(id);
        state.assignacions.delete(id);
      }
    });
  }

  function diaXmlSeleccionat() {
    if (!state.date) return '';
    const date = new Date(`${state.date}T12:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const jsDay = date.getDay();
    return jsDay === 0 ? '7' : String(jsDay);
  }

  function localDateString(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function formatData(value) {
    if (!value) return 'Sense data';
    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('ca-ES', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  }

  function parseAbbrMap(text) {
    const map = new Map();
    String(text || '').split(/\r?\n/).forEach((line) => {
      const clean = line.trim();
      if (!clean || clean.startsWith('#')) return;
      const parts = clean.split(/[;,]/).map((part) => part.trim()).filter(Boolean);
      if (parts.length < 2) return;
      map.set(parts[0], parts[1].toUpperCase());
    });
    return map;
  }

  function updateAbbrCount() {
    const count = state.abbrMap.size;
    el.abbrMapCount.textContent = `${count} ${count === 1 ? 'equivalència carregada' : 'equivalències carregades'}.`;
  }

  function abbrProfessor(placa) {
    return state.abbrMap.get(placa) || '';
  }

  function labelProfessor(placa) {
    const abbr = abbrProfessor(placa);
    return abbr ? `${abbr} · ${placa}` : `Placa ${placa}`;
  }

  function tipusItem(item) {
    if (item.activitat && state.guardiaCodes.has(item.activitat)) return 'Guà';
    if (item.activitat) return `Act. ${item.activitat}`;
    return 'Classe';
  }

  function formatSessionsActivitat(sessions) {
    const codis = Array.from(new Set(sessions.map((s) => s.activitat).filter(Boolean)));
    return codis.length ? `Guà ${codis.join(', ')}` : 'Guà';
  }

  function formatMateria(item) {
    if (item.materia) return `Matèria ${item.materia}`;
    if (item.activitat) return `Activitat ${item.activitat}`;
    return 'Sessió';
  }

  function formatBlocCurt(item) {
    const parts = [];
    if (item.cursos.length) parts.push(`Curs ${item.cursos.join('+')}`);
    if (item.grups.length) parts.push(`Grup ${item.grups.join('+')}`);
    if (item.aula) parts.push(`Aula ${item.aula}`);
    return parts.join(' · ') || 'Sense grup';
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
