(function initGuardiesLab() {
  const parser = window.HorariXmlParser;

  const STORAGE = {
    referenceXml: 'quota_guardies_lab_reference_xml',
    referenceName: 'quota_guardies_lab_reference_name',
    scheduleXml: 'quota_guardies_lab_schedule_xml',
    scheduleName: 'quota_guardies_lab_schedule_name',
    guardCodes: 'quota_guardies_lab_codes',
  };

  const state = {
    referenceText: storageGet(STORAGE.referenceXml, ''),
    referenceName: storageGet(STORAGE.referenceName, ''),
    scheduleText: storageGet(STORAGE.scheduleXml, ''),
    scheduleName: storageGet(STORAGE.scheduleName, ''),
    referencia: null,
    sessions: [],
    resum: null,
    professor: '',
    date: localDateString(new Date()),
    guardiaCodes: new Set(loadJson(STORAGE.guardCodes, [])),
    absencies: new Map(),
    assignacions: new Map(),
  };

  const el = {
    referenceFile: document.getElementById('reference-file'),
    file: document.getElementById('xml-file'),
    clearCache: document.getElementById('clear-cache'),
    cacheInfo: document.getElementById('cache-info'),
    error: document.getElementById('error-box'),
    empty: document.getElementById('empty-state'),
    workspace: document.getElementById('workspace'),
    statSessions: document.getElementById('stat-sessions'),
    statProfessors: document.getElementById('stat-professors'),
    statGrups: document.getElementById('stat-grups'),
    statActivitats: document.getElementById('stat-activitats'),
    statReference: document.getElementById('stat-reference'),
    professorSelect: document.getElementById('professor-select'),
    professorSearch: document.getElementById('professor-search'),
    professorResults: document.getElementById('professor-results'),
    selectedProfessorLabel: document.getElementById('selected-professor-label'),
    dateInput: document.getElementById('date-input'),
    dateLabel: document.getElementById('date-label'),
    activityList: document.getElementById('activity-list'),
    clearGuardCodes: document.getElementById('clear-guard-codes'),
    scheduleTitle: document.getElementById('schedule-title'),
    clearMissing: document.getElementById('clear-missing'),
    printCoverage: document.getElementById('print-coverage'),
    clearDayList: document.getElementById('clear-day-list'),
    printDateLabel: document.getElementById('print-date-label'),
    scheduleGrid: document.getElementById('schedule-grid'),
    coverageCount: document.getElementById('coverage-count'),
    coverageList: document.getElementById('coverage-list'),
  };

  el.dateInput.value = state.date;

  el.referenceFile.addEventListener('change', onReferenceFileChange);
  el.file.addEventListener('change', onScheduleFileChange);
  el.clearCache.addEventListener('click', clearLocalData);
  el.professorSelect.addEventListener('change', () => {
    selectProfessor(el.professorSelect.value);
  });
  el.professorSearch.addEventListener('input', () => {
    renderProfessorResults(el.professorSearch.value);
  });
  el.professorSearch.addEventListener('focus', () => {
    renderProfessorResults(el.professorSearch.value);
  });
  el.dateInput.addEventListener('change', () => {
    state.date = el.dateInput.value;
    state.absencies.clear();
    state.assignacions.clear();
    render();
  });
  el.clearGuardCodes.addEventListener('click', () => {
    state.guardiaCodes.clear();
    saveGuardCodes();
    render();
  });
  el.clearMissing.addEventListener('click', () => {
    clearCurrentProfessorAbsences();
    render();
  });
  el.printCoverage.addEventListener('click', () => {
    window.print();
  });
  el.clearDayList.addEventListener('click', () => {
    state.absencies.clear();
    state.assignacions.clear();
    render();
  });

  parseStoredData({ resetSelection: true });

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function storageGet(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch {
      return fallback;
    }
  }

  function storageSet(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      showError(`No s'ha pogut guardar el fitxer al navegador. ${error.message || error}`);
      return false;
    }
  }

  function storageRemove(keys) {
    keys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // Ignorem errors de neteja local: la pantalla es torna a renderitzar igualment.
      }
    });
  }

  function saveGuardCodes() {
    storageSet(STORAGE.guardCodes, JSON.stringify(Array.from(state.guardiaCodes)));
  }

  function showError(message) {
    el.error.textContent = message || '';
    el.error.classList.toggle('hidden', !message);
  }

  async function readXmlFileText(file) {
    const buffer = await file.arrayBuffer();
    const header = new TextDecoder('windows-1252').decode(buffer.slice(0, 300));
    const declared = (header.match(/encoding=["']([^"']+)/i)?.[1] || '').toLowerCase();
    const encoding = declared.includes('iso-8859-1') || declared.includes('windows-1252')
      ? 'windows-1252'
      : 'utf-8';

    try {
      return new TextDecoder(encoding).decode(buffer);
    } catch {
      return new TextDecoder('utf-8').decode(buffer);
    }
  }

  async function onReferenceFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      showError('');
      const text = await readXmlFileText(file);
      state.referenceText = text;
      state.referenceName = file.name;
      storageSet(STORAGE.referenceXml, text);
      storageSet(STORAGE.referenceName, file.name);
      if (state.scheduleText) {
        reloadFromCache();
      } else {
        parseStoredData({ resetSelection: false });
      }
    } catch (error) {
      showError(error.message || String(error));
      render();
    } finally {
      event.target.value = '';
    }
  }

  async function onScheduleFileChange(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      showError('');
      const text = await readXmlFileText(file);
      state.scheduleText = text;
      state.scheduleName = file.name;
      storageSet(STORAGE.scheduleXml, text);
      storageSet(STORAGE.scheduleName, file.name);
      reloadFromCache();
    } catch (error) {
      showError(error.message || String(error));
      render();
    } finally {
      event.target.value = '';
    }
  }

  function parseStoredData({ resetSelection }) {
    let referenceError = '';
    state.referencia = null;

    if (state.referenceText) {
      try {
        state.referencia = parser.parseGestibReference(state.referenceText);
      } catch (error) {
        referenceError = error.message || String(error);
      }
    }

    try {
      if (state.scheduleText) {
        const result = parser.parseHorariXml(state.scheduleText, state.referencia);
        state.sessions = result.sessions;
        state.resum = result.resum;
        applyDefaultGuardiaCodes(result.defaultGuardiaCodes);
        if (resetSelection) {
          state.professor = '';
          state.absencies.clear();
          state.assignacions.clear();
        }
        renderInitialData();
      } else {
        state.sessions = [];
        state.resum = null;
      }

      showError(referenceError ? `El XML de GestIB no s'ha pogut llegir: ${referenceError}` : '');
    } catch (error) {
      state.sessions = [];
      state.resum = null;
      state.professor = '';
      state.absencies.clear();
      state.assignacions.clear();
      showError(error.message || String(error));
    }

    render();
  }

  function reloadFromCache() {
    window.setTimeout(() => window.location.reload(), 50);
  }

  function applyDefaultGuardiaCodes(defaultCodes) {
    const candidates = (defaultCodes || []).filter(Boolean);
    if (!candidates.length) return;

    const activityValues = new Set((state.resum?.activitats || []).map((activitat) => activitat.valor));
    const hasValidSelection = Array.from(state.guardiaCodes).some((code) => activityValues.has(code));
    if (hasValidSelection) return;

    state.guardiaCodes = new Set(candidates);
    saveGuardCodes();
  }

  function clearLocalData() {
    storageRemove(Object.values(STORAGE));
    state.referenceText = '';
    state.referenceName = '';
    state.scheduleText = '';
    state.scheduleName = '';
    state.referencia = null;
    state.sessions = [];
    state.resum = null;
    state.professor = '';
    state.guardiaCodes.clear();
    state.absencies.clear();
    state.assignacions.clear();
    showError('');
    render();
  }

  function renderInitialData() {
    if (!state.resum) return;
    el.statSessions.textContent = state.resum.sessions;
    el.statProfessors.textContent = state.resum.professors;
    el.statGrups.textContent = state.resum.grups;
    el.statActivitats.textContent = state.resum.activitats.length;
    el.statReference.textContent = state.referencia ? 'Sí' : state.referenceText ? 'Error' : 'No';
    renderProfessorSelect();
    renderActivityList();
  }

  function renderProfessorSelect() {
    if (!state.sessions.length) {
      el.professorSelect.innerHTML = '';
      el.professorResults.innerHTML = '';
      el.selectedProfessorLabel.textContent = 'Cap professor';
      return;
    }

    const professors = professorsOrdenatsAmbLabel();
    if (!state.professor || !professors.some((prof) => prof.placa === state.professor)) {
      state.professor = professors[0]?.placa || '';
    }

    el.professorSelect.innerHTML = professors.map((professor) => `
      <option value="${escapeHtml(professor.placa)}" ${professor.placa === state.professor ? 'selected' : ''}>
        ${escapeHtml(professor.label)}
      </option>
    `).join('');

    const selectedLabel = labelProfessor(state.professor);
    el.selectedProfessorLabel.textContent = selectedLabel;
    if (!el.professorSearch.value) el.professorSearch.value = selectedLabel;
    renderProfessorResults(el.professorSearch.value);
  }

  function renderProfessorResults(query = '') {
    if (!state.sessions.length) {
      el.professorResults.innerHTML = '';
      return;
    }

    const normalizedQuery = normalizeSearch(query);
    const professors = professorsOrdenatsAmbLabel()
      .filter((professor) => {
        if (!normalizedQuery) return true;
        const haystack = normalizeSearch(`${professor.label} ${professor.short} ${professor.placa}`);
        return haystack.includes(normalizedQuery);
      })
      .slice(0, 12);

    if (!professors.length) {
      el.professorResults.innerHTML = '<div class="search-empty">Sense resultats</div>';
      return;
    }

    el.professorResults.innerHTML = professors.map((professor) => `
      <button
        type="button"
        class="search-result ${professor.placa === state.professor ? 'active' : ''}"
        data-professor="${escapeHtml(professor.placa)}"
      >
        <strong>${escapeHtml(professor.short)}</strong>
        <span>${escapeHtml(professor.placa)}</span>
      </button>
    `).join('');

    el.professorResults.querySelectorAll('[data-professor]').forEach((button) => {
      button.addEventListener('click', () => {
        selectProfessor(button.dataset.professor);
      });
    });
  }

  function selectProfessor(placa) {
    if (!placa || placa === state.professor) {
      if (placa) {
        const label = labelProfessor(placa);
        el.professorSearch.value = label;
        el.selectedProfessorLabel.textContent = label;
        renderProfessorResults(label);
      }
      return;
    }

    state.professor = placa;
    const label = labelProfessor(placa);
    el.professorSearch.value = label;
    el.selectedProfessorLabel.textContent = label;
    render();
  }

  function professorsOrdenatsAmbLabel() {
    return parser.professorsOrdenats(state.sessions)
      .map((professor) => ({
        ...professor,
        short: professorShort(professor.placa),
        hasShort: Boolean(professorInfo(professor.placa).short),
        label: labelProfessor(professor.placa),
      }))
      .sort((a, b) => {
        if (a.hasShort !== b.hasShort) return a.hasShort ? -1 : 1;
        return (a.short || a.placa).localeCompare(b.short || b.placa, 'ca', { numeric: true });
      });
  }

  function renderActivityList() {
    const activitats = state.resum?.activitats || [];
    if (!activitats.length) {
      el.activityList.innerHTML = '<div class="empty-small">El XML no té activitats.</div>';
      return;
    }

    el.activityList.innerHTML = activitats.map((activitat) => {
      const checked = state.guardiaCodes.has(activitat.valor) ? 'checked' : '';
      const info = activityInfo(activitat.valor);
      return `
        <label class="activity-item">
          <input type="checkbox" value="${escapeHtml(activitat.valor)}" ${checked} />
          <span class="activity-code">${escapeHtml(info.label)}</span>
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
    renderCacheInfo();
    const teDades = Boolean(state.sessions.length);
    el.workspace.classList.toggle('hidden', !teDades);
    el.empty.classList.toggle('hidden', teDades);
    if (!teDades) return;

    renderInitialData();
    renderDateLabel();
    renderSchedule();
    renderCoverage();
  }

  function renderCacheInfo() {
    const parts = [];
    if (state.referenceText) parts.push(`GestIB: ${state.referenceName || 'carregat'}`);
    if (state.scheduleText) parts.push(`Horari: ${state.scheduleName || 'carregat'}`);
    el.cacheInfo.textContent = parts.length
      ? `Memòria local: ${parts.join(' · ')}`
      : 'Els fitxers quedaran guardats en aquest navegador.';
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

    trimCurrentProfessorAbsences(items);
    el.scheduleTitle.textContent = `${professorLabel} · ${parser.diaLabel(dia)}`;

    if (!items.length) {
      el.scheduleGrid.innerHTML = '<div class="empty-small">Aquest professor no té sessions aquest dia.</div>';
      return;
    }

    el.scheduleGrid.innerHTML = items.map((item) => {
      const selectable = isAbsenceSelectable(item);
      const checked = state.absencies.has(item.id) ? 'checked' : '';
      const disabled = selectable ? '' : 'disabled';
      const tipus = tipusItem(item);
      return `
        <label class="schedule-item ${selectable ? '' : 'schedule-item-muted'}">
          <input type="checkbox" data-absence="${escapeHtml(item.id)}" ${checked} ${disabled} />
          <span class="schedule-time">${escapeHtml(item.hora)}</span>
          <span class="schedule-main">
            <strong>${escapeHtml(formatMateria(item))}</strong>
            <small>${escapeHtml(formatBlocCurt(item))}</small>
          </span>
          <span class="schedule-type">${escapeHtml(tipus)}</span>
        </label>
      `;
    }).join('');

    el.scheduleGrid.querySelectorAll('[data-absence]').forEach((input) => {
      input.addEventListener('change', () => {
        const item = items.find((candidate) => candidate.id === input.dataset.absence);
        if (input.checked && item) state.absencies.set(item.id, item);
        else state.absencies.delete(input.dataset.absence);
        state.assignacions.delete(input.dataset.absence);
        renderCoverage();
      });
    });
  }

  function renderCoverage() {
    const selected = selectedAbsenceItems();
    const pendents = selected.filter((item) => !state.assignacions.get(item.id)).length;
    const franges = new Set(selected.map((item) => item.hora)).size;
    el.coverageCount.textContent = [
      plural(selected.length, 'sessió', 'sessions'),
      plural(franges, 'franja', 'franges'),
      plural(pendents, 'pendent', 'pendents'),
    ].join(' · ');
    el.printDateLabel.textContent = formatData(state.date);
    el.printCoverage.disabled = !selected.length;
    el.clearDayList.disabled = !selected.length;

    const warning = state.guardiaCodes.size
      ? ''
      : `<div class="empty-small no-print">Marca l'activitat de guàrdia per trobar professorat disponible.</div>`;
    const selectedByHour = new Map(groupBySession(selected).map((group) => [group.hora, group.items]));

    const dayHours = hoursForSelectedDay();
    el.coverageList.innerHTML = warning + dayHours.map((hora) => {
      const items = selectedByHour.get(hora) || [];
      return `
      <section class="coverage-session">
        <div class="coverage-session-head">
          <h3>${escapeHtml(horaLabel(hora))}</h3>
          <span>${items.length ? `${items.length} ${items.length === 1 ? 'absència' : 'absències'}` : 'Sense absències'}</span>
        </div>
        <div class="coverage-session-list">
          ${items.length ? items.map(renderCoverageItem).join('') : '<div class="coverage-empty">Cap professor afegit.</div>'}
        </div>
      </section>
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

    el.coverageList.querySelectorAll('[data-remove-absence]').forEach((button) => {
      button.addEventListener('click', () => {
        state.absencies.delete(button.dataset.removeAbsence);
        state.assignacions.delete(button.dataset.removeAbsence);
        renderSchedule();
        renderCoverage();
      });
    });
  }

  function sessionsProfessorDia(placa, dia) {
    return state.sessions.filter((sessio) => sessio.placa === placa && sessio.dia === dia);
  }

  function selectedAbsenceItems() {
    const dia = diaXmlSeleccionat();
    return Array.from(state.absencies.values())
      .filter((item) => item.dia === dia)
      .sort(sortCoverageItems);
  }

  function guardiesPerFranja(dia, hora, professorAbsent) {
    return parser.ocupacioFranja(state.sessions, dia, hora, state.guardiaCodes)
      .filter((professor) => professor.placa !== professorAbsent && professor.guardies.length)
      .sort((a, b) => (professorShort(a.placa) || a.placa).localeCompare(professorShort(b.placa) || b.placa, 'ca', { numeric: true }));
  }

  function trimCurrentProfessorAbsences(items) {
    const valid = new Set(items.map((item) => item.id));
    Array.from(state.absencies.entries()).forEach(([id, item]) => {
      if (item.placa === state.professor && item.dia === diaXmlSeleccionat() && !valid.has(id)) {
        state.absencies.delete(id);
        state.assignacions.delete(id);
      }
    });
  }

  function clearCurrentProfessorAbsences() {
    const dia = diaXmlSeleccionat();
    Array.from(state.absencies.entries()).forEach(([id, item]) => {
      if (item.placa === state.professor && item.dia === dia) {
        state.absencies.delete(id);
        state.assignacions.delete(id);
      }
    });
  }

  function sortCoverageItems(a, b) {
    const hora = (a.hora || '').localeCompare(b.hora || '', 'ca', { numeric: true });
    if (hora) return hora;
    const professor = labelProfessor(a.placa).localeCompare(labelProfessor(b.placa), 'ca', { numeric: true });
    if (professor) return professor;
    return formatMateria(a).localeCompare(formatMateria(b), 'ca', { numeric: true });
  }

  function groupBySession(items) {
    const groups = new Map();
    items.forEach((item) => {
      if (!groups.has(item.hora)) groups.set(item.hora, []);
      groups.get(item.hora).push(item);
    });
    return Array.from(groups.entries()).map(([hora, groupItems]) => ({
      hora,
      items: groupItems.sort(sortCoverageItems),
    }));
  }

  function hoursForSelectedDay() {
    const dia = diaXmlSeleccionat();
    const hores = (state.resum?.franges || [])
      .filter((franja) => franja.dia === dia)
      .map((franja) => franja.hora);
    const unique = Array.from(new Set(hores));
    if (unique.length) {
      return unique.sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
    }
    return (state.resum?.hores || []).slice().sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
  }

  function renderCoverageItem(item) {
    const candidates = guardiesPerFranja(item.dia, item.hora, item.placa);
    const assignat = state.assignacions.get(item.id) || '';
    const hasCandidates = candidates.length > 0;
    const assignatLabel = assignat ? labelProfessor(assignat) : 'Pendent';

    return `
      <article class="coverage-item ${assignat ? 'covered' : ''}">
        <div class="coverage-head">
          <div>
            <div class="session-title">
              <span class="absent-name">${escapeHtml(labelProfessor(item.placa))}</span>
              <span class="screen-only"> · ${escapeHtml(formatMateria(item))}</span>
            </div>
            <div class="session-meta">${escapeHtml(formatMateria(item))} · ${escapeHtml(formatBlocCurt(item))}</div>
          </div>
          <span class="pill">${assignat ? 'Assignada' : hasCandidates ? `${candidates.length} guardies` : 'Sense guàrdies'}</span>
        </div>
        <div class="assignment">
          <select data-assignacio="${escapeHtml(item.id)}" ${hasCandidates ? '' : 'disabled'}>
            <option value="">Tria professorat de guàrdia</option>
            ${candidates.map((candidate) => `
              <option value="${escapeHtml(candidate.placa)}" ${candidate.placa === assignat ? 'selected' : ''}>
                ${escapeHtml(labelProfessor(candidate.placa))} · ${escapeHtml(formatSessionsActivitat(candidate.guardies))}
              </option>
            `).join('')}
          </select>
          <button type="button" class="ghost" data-clear-assignacio="${escapeHtml(item.id)}">Neteja</button>
          <button type="button" class="ghost" data-remove-absence="${escapeHtml(item.id)}">Treu</button>
          <span class="print-only print-assignment">Guàrdia: ${escapeHtml(assignatLabel)}</span>
        </div>
      </article>
    `;
  }

  function horaLabel(hora) {
    const index = hoursForSelectedDay().indexOf(hora);
    return index >= 0 ? `${index + 1}a hora · ${hora}` : hora;
  }

  function professorInfo(placa) {
    const sessio = state.sessions.find((item) => item.placa === placa && (item.professorCurta || item.professorNom));
    return {
      short: sessio?.professorCurta || '',
      name: sessio?.professorNom || '',
    };
  }

  function professorShort(placa) {
    return professorInfo(placa).short || placa;
  }

  function labelProfessor(placa) {
    const info = professorInfo(placa);
    return info.short ? `${info.short} · plaça ${placa}` : `Plaça ${placa}`;
  }

  function activityInfo(code) {
    const info = state.referencia?.activitats?.get(code);
    const label = info
      ? `${info.label || info.descripcio || 'Activitat'} · ${code}`
      : `Activitat ${code}`;
    return { label, info };
  }

  function tipusItem(item) {
    if (item.activitat && state.guardiaCodes.has(item.activitat)) return 'Guàrdia';
    if (item.activitat) return item.activitatCurta || item.activitatNom || `Activitat ${item.activitat}`;
    return 'Classe';
  }

  function isAbsenceSelectable(item) {
    return item.sessions.some((sessio) => sessio.teClasse) ||
      Boolean(item.activitat && state.guardiaCodes.has(item.activitat));
  }

  function formatSessionsActivitat(sessions) {
    const labels = Array.from(new Set(sessions.map((sessio) => (
      sessio.activitatCurta || sessio.activitatNom || sessio.activitat
    )).filter(Boolean)));
    return labels.length ? labels.join(', ') : 'Guàrdia';
  }

  function formatMateria(item) {
    if (item.materia) return item.materiaCurta || item.materiaNom || `Matèria ${item.materia}`;
    if (item.activitat) return item.activitatCurta || item.activitatNom || `Activitat ${item.activitat}`;
    return 'Sessió';
  }

  function formatBlocCurt(item) {
    const parts = [];
    if (item.grupsVisibles?.length) parts.push(item.grupsVisibles.join(' + '));
    else if (item.grups.length) parts.push(`Grup ${item.grups.join(' + ')}`);
    else if (item.cursosVisibles?.length) parts.push(item.cursosVisibles.join(' + '));
    else if (item.cursos.length) parts.push(`Curs ${item.cursos.join(' + ')}`);
    if (item.aulaNom || item.aula) parts.push(item.aulaNom || `Aula ${item.aula}`);
    return parts.join(' · ') || 'Sense grup';
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function plural(count, singular, pluralText) {
    return `${count} ${count === 1 ? singular : pluralText}`;
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

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
