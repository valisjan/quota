import * as parser from './horariXmlParser.js';
import { GUARD_CODES_STORAGE, useGuardiesStore } from './stores/guardies.js';
import {
  completeGuardDutyHours,
  dateForXmlDayInSameWeek,
  groupTeachingBlocks,
  isTeacherAbsentAtSlot,
  releasedTeachingBlocks,
  xmlDayForDate,
} from '../../src/modules/guardies/domain/day.js';
import { teachingDatesBetween } from '../../src/modules/guardies/domain/workflow.js';
import {
  nonTeachingReason,
  patioAssignmentsForDate,
} from '../../src/modules/guardies/domain/patio.js';
import {
  deleteGuardiesFile,
  getGuardiesContext,
  loadGuardiesData,
  loadGuardiesDay,
  loadGuardiesStats,
  mergeGuardiesDayPlan,
  saveGuardiesDay,
  saveGuardiesConvivencia,
  saveGuardiesFile,
  transitionGuardiesDay,
} from '../../src/services/guardiesStorage';

(function initGuardiesLab() {
  const LEGACY_STORAGE = {
    referenceXml: 'quota_guardies_lab_reference_xml',
    referenceName: 'quota_guardies_lab_reference_name',
    untisText: 'quota_guardies_lab_untis_professorat_text',
    untisName: 'quota_guardies_lab_untis_professorat_name',
    scheduleXml: 'quota_guardies_lab_schedule_xml',
    scheduleName: 'quota_guardies_lab_schedule_name',
    convivencia: 'quota_guardies_lab_convivencia',
  };
  const state = useGuardiesStore();
  let daySaveTimer = null;
  let lastDaySignature = '';
  const pendingGroupReleasedSelections = new Map();

  const el = {
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
    scheduleTitle: document.getElementById('schedule-title'),
    addAllHours: document.getElementById('add-all-hours'),
    clearMissing: document.getElementById('clear-missing'),
    printDateLabel: document.getElementById('print-date-label'),
    scheduleGrid: document.getElementById('schedule-grid'),
    coverageList: document.getElementById('coverage-list'),
    groupSearch: document.getElementById('group-search'),
    selectedGroups: document.getElementById('selected-groups'),
    releasedCount: document.getElementById('released-count'),
    releasedList: document.getElementById('released-list'),
    clearGroups: document.getElementById('clear-groups'),
  };

  window.addEventListener('guardies:upload-file', (event) => {
    onUploadFile(event.detail?.file, event.detail?.kind);
  });
  window.addEventListener('guardies:remove-file', (event) => {
    removeUploadedFile(event.detail?.kind);
  });
  window.addEventListener('guardies:clear-files', clearPersistentFiles);
  window.addEventListener('guardies:pati-updated', () => renderCoverage());
  window.addEventListener('guardies:day-action', (event) => changeDayStatus(event.detail?.action));
  window.addEventListener('guardies:apply-absence-range', (event) => applyAbsenceRange(event.detail));
  window.addEventListener('guardies:apply-outing-range', (event) => applyOutingRange(event.detail));
  window.addEventListener('guardies:outing-completeness', (event) => {
    state.outingWholeGroup = event.detail?.wholeGroup !== false;
  });
  el.professorSelect.addEventListener('change', () => {
    selectProfessor(el.professorSelect.value);
  });
  el.professorSearch.addEventListener('input', () => {
    renderProfessorResults(el.professorSearch.value);
  });
  el.professorSearch.addEventListener('focus', () => {
    if (el.professorSearch.value === labelProfessor(state.professor)) {
      el.professorSearch.value = '';
    }
    renderProfessorResults(el.professorSearch.value);
  });
  el.addAllHours.addEventListener('click', () => {
    if (state.dayStatus === 'closed') return;
    addAllCurrentProfessorAbsences();
    render();
  });
  el.clearMissing.addEventListener('click', () => {
    if (state.dayStatus === 'closed') return;
    clearCurrentProfessorAbsences();
    render();
  });
  el.groupSearch.addEventListener('change', () => {
    const codi = el.groupSearch.value;
    if (codi) addGroupOut(codi);
  });
  el.clearGroups.addEventListener('click', () => {
    if (!state.canWrite || state.dayStatus === 'closed') return;
    state.grupsFora.clear();
    state.grupProfessorsFora.clear();
    state.grupProfessorsAlliberats.clear();
    pendingGroupReleasedSelections.clear();
    state.partialGroups.clear();
    state.outingAbsenceIds.forEach((id) => state.absencies.delete(id));
    state.outingAbsenceIds.clear();
    renderGroupPicker();
    renderCoverage();
    renderReleasedList();
  });

  setupIntakeAccordion();
  window.addEventListener('guardies:legacy-render', async (event) => {
    if (event.detail?.reloadDay) await hydrateGuardiesDay(state.date);
    render();
  });
  bootstrap();

  async function bootstrap() {
    render();
    try {
      const requestedCourseId = new URLSearchParams(window.location.search).get('curs') || '';
      const context = await getGuardiesContext(requestedCourseId);
      state.courseId = context.course.id;
      state.courseName = context.course.name;
      state.canWrite = context.canWrite;
      let remoteData = await loadGuardiesData(state.courseId);
      remoteData = await migrateLegacyData(remoteData);
      applyRemoteData(remoteData);
      const stats = await loadGuardiesStats(state.courseId);
      state.guardCounts = new Map(Object.entries(stats.counts || {}));
      state.persistenceStatus = 'ready';
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) {
        adminPanel.open = !(state.referenceText && state.untisText && state.dutiesText && state.scheduleText);
      }
      parseStoredData({ resetSelection: true });
      await hydrateGuardiesDay(state.date);
      render();
    } catch (error) {
      state.persistenceStatus = 'error';
      showError(error.message || String(error));
      render();
    }
  }

  function loadJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function convivenciaFromObject(raw = {}) {
    return new Map(Object.entries(raw)
      .map(([key, values]) => [key, new Set(Array.isArray(values) ? values.filter(Boolean) : [])]));
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
      showError(`No s'ha pogut guardar la preferència local. ${error.message || error}`);
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

  function legacyData() {
    return {
      files: {
        reference: {
          text: storageGet(LEGACY_STORAGE.referenceXml, ''),
          name: storageGet(LEGACY_STORAGE.referenceName, ''),
        },
        untis: {
          text: storageGet(LEGACY_STORAGE.untisText, ''),
          name: storageGet(LEGACY_STORAGE.untisName, ''),
        },
        schedule: {
          text: storageGet(LEGACY_STORAGE.scheduleXml, ''),
          name: storageGet(LEGACY_STORAGE.scheduleName, ''),
        },
      },
      convivencia: loadJson(LEGACY_STORAGE.convivencia, {}),
    };
  }

  async function migrateLegacyData(remoteData) {
    const legacy = legacyData();
    const hasLegacyFiles = Object.values(legacy.files).some((file) => file.text);
    const hasLegacyConvivencia = Object.keys(legacy.convivencia).length > 0;
    if (!state.canWrite || (!hasLegacyFiles && !hasLegacyConvivencia)) return remoteData;

    state.persistenceStatus = 'saving';
    for (const kind of ['reference', 'untis', 'schedule']) {
      const legacyFile = legacy.files[kind];
      if (!remoteData.files[kind] && legacyFile.text) {
        await saveGuardiesFile(state.courseId, kind, legacyFile.text, legacyFile.name);
      }
    }
    if (!Object.keys(remoteData.convivencia || {}).length && hasLegacyConvivencia) {
      await saveGuardiesConvivencia(state.courseId, legacy.convivencia);
    }
    storageRemove(Object.values(LEGACY_STORAGE));
    return loadGuardiesData(state.courseId);
  }

  function applyRemoteData(remoteData) {
    const reference = remoteData.files.reference;
    const untis = remoteData.files.untis;
    const schedule = remoteData.files.schedule;
    state.referenceText = reference?.text || '';
    state.referenceName = reference?.name || '';
      state.untisText = untis?.text || '';
    state.untisName = untis?.name || '';
    state.dutiesText = remoteData.files.duties?.text || '';
    state.dutiesName = remoteData.files.duties?.name || '';
    state.scheduleText = schedule?.text || '';
    state.scheduleName = schedule?.name || '';
    state.convivencia = convivenciaFromObject(remoteData.convivencia);
    state.patiConfig = remoteData.pati || null;
  }

  function serializableDay() {
    const assignments = {};
    const comments = {};
    const groupTeachers = {};
    const groupReleasedTeachers = {};
    state.assignacions.forEach((teacherId, absenceId) => { assignments[absenceId] = teacherId; });
    state.comentaris.forEach((comment, absenceId) => { comments[absenceId] = comment; });
    state.grupProfessorsFora.forEach((teachers, groupId) => {
      groupTeachers[groupId] = Array.from(teachers).filter(Boolean).sort();
    });
    state.grupProfessorsAlliberats.forEach((teachers, groupId) => {
      groupReleasedTeachers[groupId] = Array.from(teachers).filter(Boolean).sort();
    });
    return {
      status: state.dayStatus,
      absenceIds: Array.from(state.absencies.keys()).sort(),
      assignments,
      comments,
      groupsOut: Array.from(state.grupsFora).filter(Boolean).sort(),
      groupTeachers,
      groupReleasedTeachers,
      partialGroups: Array.from(state.partialGroups).sort(),
      outingAbsenceIds: Array.from(state.outingAbsenceIds).sort(),
      cancelledAssignments: Array.from(state.cancelledAssignments).sort(),
      publishedAt: state.publishedAt,
      closedAt: state.closedAt,
      countedAssignments: state.countedAssignments,
    };
  }

  function daySignature(payload = serializableDay()) {
    return JSON.stringify(payload);
  }

  async function hydrateGuardiesDay(date) {
    if (!state.courseId || !date) return;
    pendingGroupReleasedSelections.clear();
    state.dayLoaded = false;
    state.dayPersistenceStatus = 'loading';
    state.clearDayContext();
    try {
      const saved = await loadGuardiesDay(state.courseId, date);
      const day = xmlDayForDate(date);
      const items = parser.agruparSessionsCobertura(
        state.sessions.filter((session) => session.dia === day && isMeaningfulSession(session)),
      );
      const byId = new Map(items.map((item) => [item.id, item]));
      (saved?.absenceIds || []).forEach((id) => {
        const item = byId.get(id);
        if (item && isAbsenceSelectable(item)) state.absencies.set(id, item);
      });
      Object.entries(saved?.assignments || {}).forEach(([id, teacherId]) => {
        if (state.absencies.has(id) && teacherId) state.assignacions.set(id, teacherId);
      });
      Object.entries(saved?.comments || {}).forEach(([id, comment]) => {
        if (state.absencies.has(id) && comment) state.comentaris.set(id, comment);
      });
      (saved?.groupsOut || []).forEach((groupId) => state.grupsFora.add(groupId));
      Object.entries(saved?.groupTeachers || {}).forEach(([groupId, teachers]) => {
        state.grupProfessorsFora.set(groupId, new Set(Array.isArray(teachers) ? teachers : []));
      });
      Object.entries(saved?.groupReleasedTeachers || {}).forEach(([groupId, teachers]) => {
        state.grupProfessorsAlliberats.set(groupId, new Set(Array.isArray(teachers) ? teachers : []));
      });
      state.partialGroups = new Set(saved?.partialGroups || []);
      state.outingAbsenceIds = new Set(saved?.outingAbsenceIds || []);
      if (saved && !Object.prototype.hasOwnProperty.call(saved, 'groupReleasedTeachers')) {
        state.grupsFora.forEach((groupId) => {
          state.grupProfessorsAlliberats.set(groupId, defaultReleasedGroupKeys(groupId));
        });
      }
      if (state.grupsFora.size) syncOutingAbsences();
      state.dayStatus = saved?.status || 'draft';
      state.publishedAt = saved?.publishedAt || '';
      state.closedAt = saved?.closedAt || '';
      state.updatedAt = saved?.clientUpdatedAt || '';
      state.cancelledAssignments = new Set(saved?.cancelledAssignments || []);
      state.countedAssignments = Array.isArray(saved?.countedAssignments) ? saved.countedAssignments : [];
      state.dayRevision = Number(saved?.revision) || 0;
      lastDaySignature = daySignature();
      state.dayPersistenceStatus = 'ready';
    } catch (error) {
      state.dayPersistenceStatus = 'error';
      showError(`No s'ha pogut carregar la jornada. ${error.message || error}`);
    } finally {
      state.dayLoaded = true;
    }
  }

  function scheduleDaySave() {
    if (!state.canWrite || !state.courseId || !state.date || !state.dayLoaded || state.dayStatus === 'closed') return;
    const payload = serializableDay();
    const signature = daySignature(payload);
    if (signature === lastDaySignature) return;
    clearTimeout(daySaveTimer);
    daySaveTimer = setTimeout(async () => {
      try {
        state.dayPersistenceStatus = 'saving';
        const saved = await saveGuardiesDay(state.courseId, state.date, payload, state.dayRevision);
        state.dayRevision = saved.revision;
        state.updatedAt = saved.clientUpdatedAt || new Date().toISOString();
        lastDaySignature = signature;
        state.dayPersistenceStatus = 'ready';
      } catch (error) {
        state.dayPersistenceStatus = 'error';
        showError(`No s'ha pogut guardar la jornada. ${error.message || error}`);
      }
    }, 250);
  }

  async function persistDayNow() {
    clearTimeout(daySaveTimer);
    const payload = serializableDay();
    const signature = daySignature(payload);
    if (signature === lastDaySignature) return;
    state.dayPersistenceStatus = 'saving';
    const saved = await saveGuardiesDay(state.courseId, state.date, payload, state.dayRevision);
    state.dayRevision = saved.revision;
    state.updatedAt = saved.clientUpdatedAt || new Date().toISOString();
    lastDaySignature = signature;
    state.dayPersistenceStatus = 'ready';
  }

  async function changeDayStatus(action) {
    if (!state.canWrite || !['publish', 'close', 'reopen'].includes(action)) return;
    try {
      state.dayPersistenceStatus = 'saving';
      await persistDayNow();
      const result = await transitionGuardiesDay(state.courseId, state.date, action);
      state.dayStatus = result.day.status;
      state.publishedAt = result.day.publishedAt || state.publishedAt;
      state.closedAt = result.day.closedAt || '';
      state.updatedAt = result.day.clientUpdatedAt || new Date().toISOString();
      state.dayRevision = Number(result.day.revision) || state.dayRevision + 1;
      state.countedAssignments = result.day.countedAssignments || state.countedAssignments;
      state.guardCounts = new Map(Object.entries(result.stats?.counts || Object.fromEntries(state.guardCounts)));
      lastDaySignature = daySignature();
      state.dayPersistenceStatus = 'ready';
      showError('');
      render();
    } catch (error) {
      state.dayPersistenceStatus = 'error';
      showError(`No s'ha pogut canviar l'estat de la jornada. ${error.message || error}`);
    }
  }

  function datesBetween(from, to) {
    return teachingDatesBetween(from, to);
  }

  async function applyAbsenceRange({ from, to } = {}) {
    if (!state.canWrite || !state.professor || state.dayStatus === 'closed') return;
    const selectedHours = new Set(currentProfessorDayItems()
      .filter((item) => state.absencies.has(item.id))
      .map((item) => item.hora));
    if (!selectedHours.size) {
      showError('Marca primer les sessions de l’absència que vols replicar.');
      return;
    }
    const dates = datesBetween(from, to);
    if (!dates.length) {
      showError('L’interval no conté cap dia lectiu vàlid.');
      return;
    }
    try {
      state.dayPersistenceStatus = 'saving';
      await Promise.all(dates.map((date) => {
        const day = xmlDayForDate(date);
        const ids = parser.agruparSessionsCobertura(
          state.sessions.filter((session) => session.placa === state.professor && session.dia === day && isMeaningfulSession(session)),
        ).filter((item) => selectedHours.has(item.hora) && isAbsenceSelectable(item)).map((item) => item.id);
        return mergeGuardiesDayPlan(state.courseId, date, { absenceIds: ids });
      }));
      await hydrateGuardiesDay(state.date);
      state.dayPersistenceStatus = 'ready';
      showError('');
      render();
    } catch (error) {
      state.dayPersistenceStatus = 'error';
      showError(`No s'ha pogut aplicar l'interval. ${error.message || error}`);
    }
  }

  async function applyOutingRange({ from, to, wholeGroup } = {}) {
    const reportResult = (ok, message, count = 0) => {
      window.dispatchEvent(new CustomEvent('guardies:outing-range-result', {
        detail: { ok, message, count },
      }));
    };
    if (!state.canWrite || !state.grupsFora.size || state.dayStatus === 'closed') {
      reportResult(false, 'Selecciona almenys un grup abans de copiar la sortida.');
      return;
    }
    const dates = datesBetween(from, to).filter((date) => date !== state.date);
    if (!dates.length) {
      const message = 'Tria un interval que inclogui almenys un altre dia lectiu.';
      showError(message);
      reportResult(false, message);
      return;
    }
    const groupTeachers = {};
    const groupReleasedTeachers = {};
    state.grupProfessorsFora.forEach((teachers, groupId) => {
      groupTeachers[groupId] = Array.from(teachers);
    });
    state.grupProfessorsAlliberats.forEach((teachers, groupId) => {
      groupReleasedTeachers[groupId] = Array.from(teachers);
    });
    try {
      state.dayPersistenceStatus = 'saving';
      await Promise.all(dates.map((date) => mergeGuardiesDayPlan(state.courseId, date, {
        groupsOut: Array.from(state.grupsFora), groupTeachers, groupReleasedTeachers,
        partialGroups: wholeGroup ? [] : Array.from(state.grupsFora),
        completeGroups: wholeGroup ? Array.from(state.grupsFora) : [],
      })));
      await hydrateGuardiesDay(state.date);
      state.dayPersistenceStatus = 'ready';
      showError('');
      reportResult(true, `Sortida copiada a ${dates.length} ${dates.length === 1 ? 'dia lectiu' : 'dies lectius'}.`, dates.length);
      render();
    } catch (error) {
      state.dayPersistenceStatus = 'error';
      const message = `No s'ha pogut copiar la sortida. ${error.message || error}`;
      showError(message);
      reportResult(false, message);
    }
  }

  function setupIntakeAccordion() {
    const adminPanel = document.getElementById('admin-panel');
    const todayInfo = document.getElementById('today-info');
    const modeButtons = Array.from(document.querySelectorAll('[data-intake-mode]'));
    const modePanels = Array.from(document.querySelectorAll('[data-mode-panel]'));
    const clearConvivencia = document.getElementById('clear-convivencia');

    if (adminPanel) {
      adminPanel.open = !(state.referenceText && state.untisText && state.dutiesText && state.scheduleText);
    }
    if (todayInfo) {
      const label = todayInfo.querySelector('strong');
      if (label) label.textContent = formatData(localDateString(new Date()));
    }

    modeButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const mode = button.dataset.intakeMode;
        modeButtons.forEach((item) => {
          const active = item.dataset.intakeMode === mode;
          item.classList.toggle('active', active);
          item.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        modePanels.forEach((panel) => {
          panel.classList.toggle('hidden', panel.dataset.modePanel !== mode);
        });
      });
    });

    el.convivenciaAdminList = document.getElementById('convivencia-admin-list');
    el.clearConvivencia = clearConvivencia;
    clearConvivencia?.addEventListener('click', async () => {
      if (!state.canWrite) return;
      state.convivencia.clear();
      await saveConvivencia();
    });
  }

  function saveGuardCodes() {
    storageSet(GUARD_CODES_STORAGE, JSON.stringify(Array.from(state.guardiaCodes)));
  }

  async function saveConvivencia() {
    if (!state.canWrite || !state.courseId) return;
    const serializable = {};
    state.convivencia.forEach((professors, key) => {
      const values = Array.from(professors).filter(Boolean);
      serializable[key] = values;
    });
    try {
      state.persistenceStatus = 'saving';
      await saveGuardiesConvivencia(state.courseId, serializable);
      state.persistenceStatus = 'ready';
      showError('');
    } catch (error) {
      state.persistenceStatus = 'error';
      showError(`No s'ha pogut guardar la setmana. ${error.message || error}`);
    }
    render();
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

  async function onUploadFile(file, intendedKind) {
    if (!file) return;

    try {
      if (!state.canWrite) throw new Error('Només un usuari administrador pot substituir els fitxers.');
      showError('');
      const text = await readXmlFileText(file);
      const detectedKind = detectUploadKind(text, intendedKind);
      if (detectedKind !== intendedKind) {
        const labels = {
          reference: 'XML de GestIB',
          untis: 'GPU004 de professorat',
          duties: 'GPU001 de guàrdies',
          schedule: 'export d’horari d’Untis',
        };
        throw new Error(`Aquest fitxer no correspon al pas actual. S'espera: ${labels[intendedKind]}.`);
      }
      await saveUploadedFile(detectedKind, text, file.name);
      parseStoredData({ resetSelection: detectedKind === 'schedule' });
    } catch (error) {
      state.persistenceStatus = 'error';
      showError(error.message || String(error));
      render();
    }
  }

  function detectUploadKind(text, fallback) {
    const root = xmlRootName(text);
    if (root === 'HORARI') return 'schedule';
    if (root === 'CENTRE') return 'reference';
    if (!root) return fallback;
    return fallback;
  }

  function xmlRootName(text) {
    let net = String(text || '').replace(/^\uFEFF/, '').trim();
    net = net.replace(/^<\?xml[^>]*>\s*/i, '');
    net = net.replace(/^(?:<!--[\s\S]*?-->\s*)+/g, '');
    const match = net.match(/^<([A-Za-z_][\w:.-]*)\b/);
    return (match?.[1] || '').split(':').pop().toUpperCase();
  }

  async function saveUploadedFile(kind, text, name) {
    state.persistenceStatus = 'saving';
    const file = await saveGuardiesFile(state.courseId, kind, text, name);
    if (kind === 'reference') {
      state.referenceText = file.text;
      state.referenceName = file.name;
    } else if (kind === 'untis') {
      state.untisText = file.text;
      state.untisName = file.name;
    } else if (kind === 'duties') {
      state.dutiesText = file.text;
      state.dutiesName = file.name;
    } else {
      state.scheduleText = file.text;
      state.scheduleName = file.name;
    }
    state.persistenceStatus = 'ready';
    if (state.referenceText && state.untisText && state.dutiesText && state.scheduleText) {
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) adminPanel.open = false;
    }
    showError('');
  }

  async function clearUploadedFile(kind) {
    state.persistenceStatus = 'saving';
    await deleteGuardiesFile(state.courseId, kind);
    if (kind === 'reference') {
      state.referenceText = '';
      state.referenceName = '';
    } else if (kind === 'untis') {
      state.untisText = '';
      state.untisName = '';
    } else if (kind === 'duties') {
      state.dutiesText = '';
      state.dutiesName = '';
    } else {
      state.scheduleText = '';
      state.scheduleName = '';
    }
    state.persistenceStatus = 'ready';
    showError('');
  }

  async function removeUploadedFile(kind) {
    if (!state.canWrite || !['reference', 'untis', 'duties', 'schedule'].includes(kind)) return;
    try {
      await clearUploadedFile(kind);
      state.professor = '';
      state.absencies.clear();
      state.assignacions.clear();
      state.comentaris.clear();
      state.grupsFora.clear();
      state.grupProfessorsFora.clear();
      state.grupProfessorsAlliberats.clear();
      pendingGroupReleasedSelections.clear();
      state.partialGroups.clear();
      state.outingAbsenceIds.clear();
      parseStoredData({ resetSelection: true });
    } catch (error) {
      state.persistenceStatus = 'error';
      showError(`No s'ha pogut eliminar el fitxer. ${error.message || error}`);
      render();
    }
  }

  function parseStoredData({ resetSelection }) {
    let referenceError = '';
    let untisError = '';
    state.referencia = null;
    state.professoratUntis = null;

    if (state.referenceText) {
      try {
        state.referencia = parser.parseGestibReference(state.referenceText);
      } catch (error) {
        referenceError = error.message || String(error);
      }
    }

    if (state.untisText) {
      try {
        state.professoratUntis = parser.parseUntisProfessorat(state.untisText);
        if (!state.professoratUntis.professors.size) {
          untisError = 'No s\'ha trobat professorat reconeixible al fitxer d\'Untis.';
        }
      } catch (error) {
        untisError = error.message || String(error);
      }
    }

    try {
      if (state.scheduleText) {
        const result = parser.parseHorariXml(state.scheduleText, state.referencia, state.professoratUntis);
        const guardSessions = parser.parseUntisGuardies(state.dutiesText, {
          referencia: state.referencia,
          professoratUntis: state.professoratUntis,
          hores: result.resum.hores,
        });
        state.sessions = mergeSessions(result.sessions, guardSessions);
        state.resum = {
          ...result.resum,
          sessions: state.sessions.length,
          professors: new Set(state.sessions.map((sessio) => sessio.placa).filter(Boolean)).size,
          dies: Array.from(new Set(state.sessions.map((sessio) => sessio.dia).filter(Boolean))).sort((a, b) => Number(a) - Number(b)),
          hores: orderedHours(state.sessions.map((sessio) => sessio.hora).filter(Boolean)),
        };
        state.resum.franges = state.resum.dies.flatMap((dia) => (
          state.resum.hores
            .filter((hora) => state.sessions.some((sessio) => sessio.dia === dia && sessio.hora === hora))
            .map((hora) => ({ key: parser.franjaKey(dia, hora), dia, hora, diaLabel: parser.diaLabel(dia), total: 0 }))
        ));
        applyDefaultGuardiaCodes(result.defaultGuardiaCodes);
        if (resetSelection) {
          state.professor = '';
          state.absencies.clear();
          state.assignacions.clear();
          state.comentaris.clear();
          state.grupsFora.clear();
          state.grupProfessorsFora.clear();
          state.grupProfessorsAlliberats.clear();
          pendingGroupReleasedSelections.clear();
          state.partialGroups.clear();
          state.outingAbsenceIds.clear();
        }
        renderInitialData();
      } else {
        state.sessions = [];
        state.resum = null;
      }

      const warnings = [];
      if (referenceError) warnings.push(`El XML de GestIB no s'ha pogut llegir: ${referenceError}`);
      if (untisError) warnings.push(`El professorat d'Untis no s'ha pogut llegir: ${untisError}`);
      showError(warnings.join(' '));
    } catch (error) {
      state.sessions = [];
      state.resum = null;
      state.professor = '';
      state.absencies.clear();
      state.assignacions.clear();
      state.comentaris.clear();
      state.grupsFora.clear();
      state.grupProfessorsFora.clear();
      state.grupProfessorsAlliberats.clear();
      pendingGroupReleasedSelections.clear();
      state.partialGroups.clear();
      state.outingAbsenceIds.clear();
      showError(error.message || String(error));
    }

    render();
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

  async function clearPersistentFiles() {
    if (!state.canWrite || !state.courseId) return;
    const confirmed = window.confirm('Vols eliminar els quatre fitxers compartits de guàrdies?');
    if (!confirmed) return;
    try {
      state.persistenceStatus = 'saving';
      await Promise.all(
        ['reference', 'untis', 'duties', 'schedule']
          .map((kind) => deleteGuardiesFile(state.courseId, kind)),
      );
      state.referenceText = '';
      state.referenceName = '';
      state.untisText = '';
      state.untisName = '';
      state.dutiesText = '';
      state.dutiesName = '';
      state.scheduleText = '';
      state.scheduleName = '';
      state.referencia = null;
      state.professoratUntis = null;
      state.sessions = [];
      state.resum = null;
      state.professor = '';
      state.absencies.clear();
      state.assignacions.clear();
      state.comentaris.clear();
      state.grupsFora.clear();
      state.grupProfessorsFora.clear();
      state.grupProfessorsAlliberats.clear();
      pendingGroupReleasedSelections.clear();
      state.partialGroups.clear();
      state.outingAbsenceIds.clear();
      state.persistenceStatus = 'ready';
      showError('');
      render();
    } catch (error) {
      state.persistenceStatus = 'error';
      showError(`No s'han pogut eliminar els fitxers. ${error.message || error}`);
      render();
    }
  }

  function renderInitialData() {
    if (!state.resum) return;
    el.statSessions.textContent = state.resum.sessions;
    el.statProfessors.textContent = state.resum.professors;
    el.statGrups.textContent = state.resum.grups;
    el.statActivitats.textContent = state.resum.activitats.length;
    el.statReference.textContent = state.referencia ? 'Sí' : state.referenceText ? 'Error' : 'No';
    renderProfessorSelect();
  }

  function renderProfessorSelect() {
    if (!state.sessions.length) {
      state.professorOptions = [];
      el.professorSelect.innerHTML = '';
      el.professorResults.innerHTML = '';
      el.selectedProfessorLabel.textContent = 'Cap professor';
      return;
    }

    const professors = professorsOrdenatsAmbLabel();
    state.professorOptions = professors;
    if (!state.professor || !professors.some((prof) => prof.placa === state.professor)) {
      state.professor = '';
    }

    el.professorSelect.innerHTML = `
      <option value="">Selecciona professor...</option>
      ${professors.map((professor) => `
        <option value="${escapeHtml(professor.placa)}" ${professor.placa === state.professor ? 'selected' : ''}>
        ${escapeHtml(professor.label)}
        </option>
      `).join('')}
    `;

    if (!state.professor) {
      el.selectedProfessorLabel.textContent = 'Cap professor';
      el.professorSearch.value = '';
      el.professorResults.innerHTML = '';
      return;
    }

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
    const selectedLabel = labelProfessor(state.professor);
    if (!normalizedQuery || normalizedQuery === normalizeSearch(selectedLabel)) {
      el.professorResults.innerHTML = '';
      return;
    }

    const professors = professorsOrdenatsAmbLabel()
      .filter((professor) => {
        const haystack = normalizeSearch(`${professor.label} ${professor.short} ${professor.name} ${professor.placa}`);
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
        <strong>${escapeHtml(professor.name || professor.short || 'Professor sense nom')}</strong>
        ${professor.name && professor.short ? `<span>${escapeHtml(professor.short)}</span>` : ''}
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
        el.professorResults.innerHTML = '';
      }
      return;
    }

    state.professor = placa;
    const label = labelProfessor(placa);
    el.professorSearch.value = label;
    el.selectedProfessorLabel.textContent = label;
    el.professorResults.innerHTML = '';
    render();
  }

  function professorsOrdenatsAmbLabel() {
    return parser.professorsOrdenats(state.sessions)
      .map((professor) => ({
        ...professor,
        short: professorShort(professor.placa),
        name: professorInfo(professor.placa).name,
        hasShort: Boolean(professorInfo(professor.placa).short),
        label: labelProfessor(professor.placa),
      }))
      .sort((a, b) => {
        if (a.hasShort !== b.hasShort) return a.hasShort ? -1 : 1;
        return (a.short || a.placa).localeCompare(b.short || b.placa, 'ca', { numeric: true });
      });
  }

  function grupsOrdenatsAmbLabel() {
    const grups = new Map();
    state.referencia?.grups?.forEach((grup) => {
      if (!grup.codi) return;
      grups.set(grup.codi, {
        codi: grup.codi,
        label: grup.visible || grup.nom || grup.codi,
        curs: grup.cursVisible || grup.curs || '',
      });
    });

    state.sessions.forEach((sessio) => {
      if (!sessio.teClasse || !sessio.grup) return;
      const existing = grups.get(sessio.grup);
      const label = sessio.grupVisible || sessio.cursVisible || 'Grup sense nom';
      grups.set(sessio.grup, {
        codi: sessio.grup,
        label: existing?.label || label,
        curs: existing?.curs || sessio.cursVisible || sessio.curs || '',
      });
    });

    return Array.from(grups.values())
      .sort((a, b) => a.label.localeCompare(b.label, 'ca', { numeric: true }));
  }

  function renderGroupPicker() {
    const grups = grupsOrdenatsAmbLabel();
    const validGroups = new Set(grups.map((grup) => grup.codi));
    Array.from(state.grupsFora).forEach((codi) => {
      if (!validGroups.has(codi)) {
        state.grupsFora.delete(codi);
        state.grupProfessorsFora.delete(codi);
        state.grupProfessorsAlliberats.delete(codi);
        pendingGroupReleasedSelections.delete(codi);
      }
    });

    renderSelectedGroupsByHour(grups);
    const available = grups.filter((grup) => !state.grupsFora.has(grup.codi));
    el.groupSearch.innerHTML = `
      <option value="">Selecciona un grup per afegir-lo...</option>
      ${available.map((grup) => `
        <option value="${escapeHtml(grup.codi)}">${escapeHtml(grup.label)}</option>
      `).join('')}
    `;
    el.groupSearch.value = '';
    el.groupSearch.disabled = !state.canWrite || state.dayStatus === 'closed' || !available.length;
    el.clearGroups.disabled = !state.canWrite || state.dayStatus === 'closed' || !state.grupsFora.size;
  }

  function renderSelectedGroups(grups = grupsOrdenatsAmbLabel()) {
    const byCode = new Map(grups.map((grup) => [grup.codi, grup]));
    const selected = Array.from(state.grupsFora)
      .map((codi) => byCode.get(codi))
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, 'ca', { numeric: true }));

    if (!selected.length) {
      el.selectedGroups.innerHTML = '<div class="empty-small">Cap grup seleccionat.</div>';
      return;
    }

    el.selectedGroups.innerHTML = selected.map((grup) => `
      <span class="chip group-chip">
        ${escapeHtml(grup.label)}
        <button type="button" aria-label="Treu ${escapeHtml(grup.label)}" data-remove-group="${escapeHtml(grup.codi)}">×</button>
      </span>
    `).join('');

    el.selectedGroups.querySelectorAll('[data-remove-group]').forEach((button) => {
      button.addEventListener('click', () => {
        toggleGroupOut(button.dataset.removeGroup);
      });
    });
  }

  function renderSelectedGroupsByHour(grups = grupsOrdenatsAmbLabel()) {
    const byCode = new Map(grups.map((grup) => [grup.codi, grup]));
    const selected = Array.from(state.grupsFora)
      .map((codi) => byCode.get(codi))
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, 'ca', { numeric: true }));

    if (!selected.length) {
      el.selectedGroups.innerHTML = '<div class="empty-small">Cap grup seleccionat.</div>';
      return;
    }

    el.selectedGroups.innerHTML = selected.map((grup) => {
      const completeGroups = new Set(Array.from(state.grupsFora).filter((groupId) => !state.partialGroups.has(groupId)));
      const teachingBlocks = groupTeachingBlocksForGroup(grup.codi);
      const companions = groupCompanionTeacherIds(grup.codi);
      const allCompanions = allCompanionTeacherIds();
      const defaultReleased = new Set(teachingBlocks
        .filter((block) => !allCompanions.has(block.placa) && block.grups.every((groupId) => completeGroups.has(groupId)))
        .map((block) => groupProfessorKey(block.hora, block.placa)));
      const selectedReleased = pendingGroupReleasedSelections.get(grup.codi)
        || state.grupProfessorsAlliberats.get(grup.codi)
        || defaultReleased;
      const availableCompanions = professorsOrdenatsAmbLabel()
        .filter((professor) => !companions.includes(professor.placa));
      return `
        <article class="selected-group-card">
          <div class="selected-group-head">
            <strong>${escapeHtml(grup.label)} ${state.partialGroups.has(grup.codi) ? '<em>No surt tot el grup</em>' : '<em>Grup complet</em>'}</strong>
            <button
              type="button"
              class="remove-group"
              aria-label="Treu ${escapeHtml(grup.label)}"
              title="Treu aquest grup"
              data-remove-group="${escapeHtml(grup.codi)}"
              ${!state.canWrite || state.dayStatus === 'closed' ? 'disabled' : ''}
            >
              <span aria-hidden="true">X</span> Treu
            </button>
          </div>
          <p class="group-card-hint">El professorat que queda lliure ja apareix marcat. Desmarca qui no hagi de quedar disponible; si acompanya la sortida, afegeix-lo també com a acompanyant. Després confirma la selecció${state.partialGroups.has(grup.codi) ? '; com que no surt tot el grup, ningú queda preseleccionat' : ''}.</p>
          <div class="companion-picker">
            <label>
              <span>Afegeix professorat acompanyant</span>
              <select data-add-group-companion="${escapeHtml(grup.codi)}" ${!state.canWrite || state.dayStatus === 'closed' || !availableCompanions.length ? 'disabled' : ''}>
                <option value="">Selecciona un professor...</option>
                ${availableCompanions.map((professor) => `<option value="${escapeHtml(professor.placa)}">${escapeHtml(professor.label)}</option>`).join('')}
              </select>
            </label>
            <div class="companion-chips">
              ${companions.length ? companions.map((teacherId) => `
                <span class="companion-chip" data-group-companion="${escapeHtml(grup.codi)}" data-teacher="${escapeHtml(teacherId)}">
                  ${escapeHtml(labelProfessor(teacherId))}
                  <button type="button" aria-label="Treu ${escapeHtml(labelProfessor(teacherId))} dels acompanyants" data-remove-group-companion="${escapeHtml(grup.codi)}" data-teacher="${escapeHtml(teacherId)}" ${!state.canWrite || state.dayStatus === 'closed' ? 'disabled' : ''}>×</button>
                </span>
              `).join('') : '<small>Cap acompanyant seleccionat.</small>'}
            </div>
          </div>
          <p class="group-teacher-title">Professorat disponible en quedar lliure el grup</p>
          <div class="group-teacher-list companion-list">
            ${teachingBlocks.map((block) => {
                const key = groupProfessorKey(block.hora, block.placa);
                const remainingGroups = block.grups
                  .filter((groupId) => !completeGroups.has(groupId))
                  .map((groupId) => byCode.get(groupId)?.label || groupId);
                const eligible = !remainingGroups.length && !allCompanions.has(block.placa);
                return `
                  <label class="group-teacher">
                    <input type="checkbox" data-group-released="${escapeHtml(grup.codi)}" value="${escapeHtml(key)}" ${selectedReleased.has(key) && eligible ? 'checked' : ''} ${!state.canWrite || state.dayStatus === 'closed' || !eligible ? 'disabled' : ''} />
                    <span>
                      <b>${escapeHtml(labelProfessor(block.placa))}</b>
                      <small>${escapeHtml(horaLabel(block.hora))}</small>
                      ${remainingGroups.length ? `<small class="shared-group-warning">També té ${escapeHtml(remainingGroups.join(' + '))}; no queda disponible.</small>` : ''}
                      ${allCompanions.has(block.placa) ? '<small class="shared-group-warning">Acompanya una sortida; no queda disponible.</small>' : ''}
                    </span>
                  </label>
                `;
              }).join('')}
          </div>
          <div class="group-teacher-actions">
            <small>El botó és necessari encara que cap professor acompanyi el grup.</small>
            <button type="button" data-confirm-group-released="${escapeHtml(grup.codi)}" ${!state.canWrite || state.dayStatus === 'closed' || !teachingBlocks.length ? 'disabled' : ''}>
              ${groupTeacherConfirmationLabel(releasedTeacherCount(selectedReleased))}
            </button>
          </div>
        </article>
      `;
    }).join('');

    el.selectedGroups.querySelectorAll('[data-remove-group]').forEach((button) => {
      button.addEventListener('click', () => {
        toggleGroupOut(button.dataset.removeGroup);
      });
    });

    el.selectedGroups.querySelectorAll('[data-group-released]').forEach((input) => {
      input.addEventListener('change', () => {
        stageGroupReleased(input.dataset.groupReleased, input.value, input.checked);
        updateGroupTeacherConfirmation(input.closest('.selected-group-card'));
      });
    });

    el.selectedGroups.querySelectorAll('[data-confirm-group-released]').forEach((button) => {
      button.addEventListener('click', () => {
        confirmGroupReleased(button.dataset.confirmGroupReleased);
      });
    });

    el.selectedGroups.querySelectorAll('[data-add-group-companion]').forEach((select) => {
      select.addEventListener('change', () => {
        if (select.value) addGroupCompanion(select.dataset.addGroupCompanion, select.value);
      });
    });

    el.selectedGroups.querySelectorAll('[data-remove-group-companion]').forEach((button) => {
      button.addEventListener('click', () => {
        removeGroupCompanion(button.dataset.removeGroupCompanion, button.dataset.teacher);
      });
    });
  }

  function toggleGroupOut(codi) {
    if (!state.canWrite || state.dayStatus === 'closed') return;
    if (!codi) return;
    if (state.grupsFora.has(codi)) {
      state.grupsFora.delete(codi);
      state.grupProfessorsFora.delete(codi);
      state.grupProfessorsAlliberats.delete(codi);
      pendingGroupReleasedSelections.delete(codi);
      state.partialGroups.delete(codi);
      syncOutingAbsences();
    } else {
      state.grupsFora.add(codi);
      ensureGroupProfessorSelection(codi);
      if (state.outingWholeGroup) state.partialGroups.delete(codi);
      else state.partialGroups.add(codi);
    }
    renderGroupPicker();
    renderCoverage();
    renderReleasedList();
    scheduleDaySave();
  }

  function addGroupOut(codi) {
    if (!state.canWrite || state.dayStatus === 'closed') return;
    if (!codi) return;
    state.grupsFora.add(codi);
    ensureGroupProfessorSelection(codi);
    if (state.outingWholeGroup) state.partialGroups.delete(codi);
    else state.partialGroups.add(codi);
    el.groupSearch.value = '';
    renderGroupPicker();
    renderCoverage();
    renderReleasedList();
  }

  function groupTeachingBlocksForGroup(codi) {
    const dia = diaXmlSeleccionat();
    if (!dia) return [];
    return groupTeachingBlocks(
      state.sessions.filter((sessio) => sessio.dia === dia && sessio.teClasse),
    )
      .filter((item) => item.grups.includes(codi))
      .sort(sortCoverageItems);
  }

  function groupProfessorKey(hora, placa) {
    return `${hora}|${placa}`;
  }

  function ensureGroupProfessorSelection(codi) {
    if (state.grupProfessorsFora.has(codi)) return;
    state.grupProfessorsFora.set(codi, new Set());
  }

  function groupCompanionTeacherIds(codi) {
    return Array.from(new Set(
      Array.from(state.grupProfessorsFora.get(codi) || [])
        .map((key) => key.split('|').slice(1).join('|'))
        .filter(Boolean),
    )).sort((a, b) => labelProfessor(a).localeCompare(labelProfessor(b), 'ca', { numeric: true }));
  }

  function allCompanionTeacherIds() {
    const teachers = new Set();
    state.grupProfessorsFora.forEach((keys) => {
      keys.forEach((key) => {
        const teacherId = key.split('|').slice(1).join('|');
        if (teacherId) teachers.add(teacherId);
      });
    });
    return teachers;
  }

  function addGroupCompanion(codi, placa) {
    if (!state.canWrite || state.dayStatus === 'closed' || !codi || !placa) return;
    ensureGroupProfessorSelection(codi);
    const professors = state.grupProfessorsFora.get(codi);
    const blocks = groupTeachingBlocksForGroup(codi).filter((item) => item.placa === placa);
    if (blocks.length) blocks.forEach((item) => professors.add(groupProfessorKey(item.hora, placa)));
    else professors.add(groupProfessorKey('*', placa));
    state.grupProfessorsAlliberats.forEach((released) => {
      Array.from(released).filter((key) => key.endsWith(`|${placa}`)).forEach((key) => released.delete(key));
    });
    pendingGroupReleasedSelections.forEach((released) => {
      Array.from(released).filter((key) => key.endsWith(`|${placa}`)).forEach((key) => released.delete(key));
    });
    syncOutingAbsences();
    renderGroupPicker();
    renderCoverage();
    renderReleasedList();
  }

  function removeGroupCompanion(codi, placa) {
    if (!state.canWrite || state.dayStatus === 'closed' || !codi || !placa) return;
    const professors = state.grupProfessorsFora.get(codi);
    if (!professors) return;
    Array.from(professors)
      .filter((key) => key.endsWith(`|${placa}`))
      .forEach((key) => professors.delete(key));
    syncOutingAbsences();
    renderGroupPicker();
    renderCoverage();
    renderReleasedList();
  }

  function groupTeacherConfirmationLabel(count) {
    if (!count) return 'Confirma sense professorat disponible';
    return `Afegeix ${count} ${count === 1 ? 'professor' : 'professors'} disponibles`;
  }

  function releasedTeacherCount(keys) {
    return new Set(Array.from(keys || []).map((key) => key.split('|').slice(1).join('|')).filter(Boolean)).size;
  }

  function defaultReleasedGroupKeys(codi) {
    const completeGroups = new Set(Array.from(state.grupsFora).filter((groupId) => !state.partialGroups.has(groupId)));
    const companions = allCompanionTeacherIds();
    return new Set(groupTeachingBlocksForGroup(codi)
      .filter((block) => !companions.has(block.placa) && block.grups.every((groupId) => completeGroups.has(groupId)))
      .map((block) => groupProfessorKey(block.hora, block.placa)));
  }

  function stageGroupReleased(codi, key, enabled) {
    if (!state.canWrite || state.dayStatus === 'closed' || !codi || !key) return;
    if (!pendingGroupReleasedSelections.has(codi)) {
      pendingGroupReleasedSelections.set(codi, new Set(
        state.grupProfessorsAlliberats.get(codi) || defaultReleasedGroupKeys(codi),
      ));
    }
    const selected = pendingGroupReleasedSelections.get(codi);
    if (enabled) selected.add(key);
    else selected.delete(key);
  }

  function updateGroupTeacherConfirmation(card) {
    if (!card) return;
    const button = card.querySelector('[data-confirm-group-released]');
    if (!button) return;
    const count = releasedTeacherCount(Array.from(card.querySelectorAll('[data-group-released]:checked')).map((input) => input.value));
    button.textContent = groupTeacherConfirmationLabel(count);
    card.classList.add('has-pending-selection');
  }

  function confirmGroupReleased(codi) {
    if (!state.canWrite || state.dayStatus === 'closed' || !codi) return;
    const selected = pendingGroupReleasedSelections.get(codi)
      || state.grupProfessorsAlliberats.get(codi)
      || defaultReleasedGroupKeys(codi);
    state.grupProfessorsAlliberats.set(codi, new Set(selected));
    pendingGroupReleasedSelections.delete(codi);
    renderGroupPicker();
    renderCoverage();
    renderReleasedList();
  }

  function renderConvivenciaAdmin() {
    if (!el.convivenciaAdminList) return;
    const hores = (state.resum?.hores || []).slice()
      .sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
    if (!state.sessions.length || !hores.length) {
      el.convivenciaAdminList.innerHTML = '<div class="empty-small">Completa els quatre fitxers per configurar la setmana.</div>';
      return;
    }

    const dies = ['1', '2', '3', '4', '5'];

    el.convivenciaAdminList.innerHTML = `
      <div class="convivencia-week">
        ${dies.map((dia) => `
          <section class="convivencia-day">
            <h3>${escapeHtml(parser.diaLabel(dia))}</h3>
            <div class="convivencia-day-slots">
              ${hores.map((hora, index) => {
                const key = convivenciaKey(dia, hora);
                const selected = convivenciaProfessors(dia, hora)[0] || '';
                const candidates = guardiaProfessorsForSlot(dia, hora);
                const selectedIsCandidate = candidates.some((candidate) => candidate.placa === selected);
                const emptyLabel = candidates.length ? 'Sense cobertura' : 'Cap professor de guàrdia';
                const options = candidates.map((candidate) => `
                  <option value="${escapeHtml(candidate.placa)}">
                    ${escapeHtml(`${candidate.convivencia ? 'GC · ' : ''}${candidate.label}`)}
                  </option>
                `).join('');
                const previousOption = selected && !selectedIsCandidate
                  ? `<option value="${escapeHtml(selected)}">${escapeHtml(`Assignació anterior · ${labelProfessor(selected)}`)}</option>`
                  : '';
                return `
                  <label class="convivencia-slot ${selected ? 'covered' : ''} ${candidates.length ? '' : 'without-guards'}">
                    <span class="convivencia-slot-time">
                      <strong>${index + 1}a</strong>
                      <small>${escapeHtml(hora)}</small>
                    </span>
                    <select data-convivencia-slot="${escapeHtml(key)}" aria-label="Convivència ${escapeHtml(parser.diaLabel(dia))} ${escapeHtml(hora)}">
                      <option value="">${emptyLabel}</option>
                      ${previousOption}
                      ${options}
                    </select>
                  </label>
                `;
              }).join('')}
            </div>
          </section>
        `).join('')}
      </div>
    `;

    el.convivenciaAdminList.querySelectorAll('[data-convivencia-slot]').forEach((select) => {
      const selected = convivenciaProfessors(...select.dataset.convivenciaSlot.split('|'))[0] || '';
      select.value = selected;
      select.disabled = !state.canWrite || state.persistenceStatus === 'saving';
      select.addEventListener('change', async () => {
        const key = select.dataset.convivenciaSlot;
        if (select.value) state.convivencia.set(key, new Set([select.value]));
        else state.convivencia.set(key, new Set());
        renderConvivenciaAdmin();
        renderCoverage();
        await saveConvivencia();
      });
    });
  }

  function render() {
    renderConvivenciaAdmin();
    const teDades = Boolean(state.sessions.length);
    el.workspace.classList.toggle('hidden', !teDades);
    el.empty.classList.toggle('hidden', teDades);
    if (!teDades) {
      const title = el.empty.querySelector('h2');
      const copy = el.empty.querySelector('p');
      if (state.persistenceStatus === 'loading') {
        if (title) title.textContent = 'Carregant dades compartides';
        if (copy) copy.textContent = 'Connectant amb Quota i el curs acadèmic actiu.';
      } else {
        if (title) title.textContent = 'Carrega l’horari per començar';
        if (copy) {
          copy.textContent = state.canWrite
            ? 'Obre Arxius de configuració i completa els quatre passos de preparació.'
            : 'Encara no s’han carregat els fitxers de configuració d’aquest curs.';
        }
      }
    }
    if (!teDades) return;

    renderInitialData();
    renderGroupPicker();
    renderSchedule();
    renderCoverage();
    renderReleasedList();
  }


  function renderSchedule() {
    const dia = diaXmlSeleccionat();
    if (!state.professor) {
      el.scheduleTitle.textContent = 'Sessions del professor';
      el.addAllHours.disabled = true;
      el.clearMissing.disabled = true;
      el.scheduleGrid.innerHTML = '<div class="empty-small">Cerca i selecciona el professor que falta.</div>';
      return;
    }
    const professorLabel = labelProfessor(state.professor);
    const items = currentProfessorDayItems();
    const selectableItems = items.filter(isAbsenceSelectable);

    trimCurrentProfessorAbsences(items);
    el.scheduleTitle.textContent = `${professorLabel} · ${parser.diaLabel(dia)}`;
    el.addAllHours.disabled = state.dayStatus === 'closed' || !selectableItems.length;
    el.clearMissing.disabled = state.dayStatus === 'closed' || !selectableItems.some((item) => state.absencies.has(item.id));

    if (!items.length) {
      renderEmptySchedule(dia);
      return;
    }

    el.scheduleGrid.innerHTML = items.map((item) => {
      const selectable = isAbsenceSelectable(item);
      const checked = state.absencies.has(item.id) ? 'checked' : '';
      const disabled = selectable && state.dayStatus !== 'closed' ? '' : 'disabled';
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
        else {
          state.absencies.delete(input.dataset.absence);
          state.assignacions.delete(input.dataset.absence);
          state.comentaris.delete(input.dataset.absence);
        }
        renderCoverage();
      });
    });
  }

  function renderEmptySchedule(dia) {
    const weekItems = allProfessorWeekItems();
    if (!weekItems.length) {
      el.scheduleGrid.innerHTML = '<div class="empty-small">Aquest professor no té sessions al XML carregat.</div>';
      return;
    }

    const byDay = new Map();
    weekItems.forEach((item) => {
      if (!byDay.has(item.dia)) byDay.set(item.dia, []);
      byDay.get(item.dia).push(item);
    });

    const dayButtons = Array.from(byDay.entries())
      .sort(([diaA], [diaB]) => Number(diaA) - Number(diaB))
      .map(([itemDia, dayItems]) => {
        const hores = Array.from(new Set(dayItems.map((item) => item.hora).filter(Boolean)))
          .sort((a, b) => a.localeCompare(b, 'ca', { numeric: true }));
        return `
          <button type="button" class="ghost" data-jump-day="${escapeHtml(itemDia)}">
            ${escapeHtml(parser.diaLabel(itemDia))} · ${escapeHtml(hores.join(', ') || 'sense hora')}
          </button>
        `;
      })
      .join('');

    el.scheduleGrid.innerHTML = `
      <div class="empty-small schedule-empty">
        <p>Aquest professor no té sessions a ${escapeHtml(parser.diaLabel(dia))}.</p>
        <div class="day-jumps">${dayButtons}</div>
      </div>
    `;

    el.scheduleGrid.querySelectorAll('[data-jump-day]').forEach((button) => {
      button.addEventListener('click', () => {
        setDateToXmlDay(button.dataset.jumpDay);
        state.absencies.clear();
        state.assignacions.clear();
        state.comentaris.clear();
        state.grupsFora.clear();
        state.grupProfessorsFora.clear();
        state.grupProfessorsAlliberats.clear();
        pendingGroupReleasedSelections.clear();
        state.partialGroups.clear();
        state.outingAbsenceIds.clear();
        render();
      });
    });
  }

  function renderCoverage() {
    const selected = selectedAbsenceItems();
    selected.forEach((item) => {
      const assignat = state.assignacions.get(item.id);
      if (!assignat) return;
      const encaraDisponible = guardiesPerFranja(item.dia, item.hora, item.placa, item.id)
        .some((candidate) => candidate.placa === assignat && !candidate.unavailable);
      if (!encaraDisponible) state.assignacions.delete(item.id);
    });
    el.printDateLabel.textContent = formatData(state.date);

    const warning = hasGuardiaCandidates()
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
        ${hora === 'PATI' ? renderPatiForDate() : ''}
        ${items.length ? `
          <div class="coverage-session-list">
            <div class="coverage-table">
              <div class="coverage-row coverage-row-head">
                <span>Professor</span>
                <span>Grup, matèria i aula</span>
                <span>Professor preassignat</span>
                <span>Observacions</span>
              </div>
              ${items.map(renderCoverageRow).join('')}
            </div>
          </div>
        ` : ''}
      </section>
    `;
    }).join('');

    el.coverageList.querySelectorAll('[data-assignacio]').forEach((select) => {
      select.addEventListener('change', () => {
        if (state.dayStatus === 'closed') return;
        state.cancelledAssignments.delete(select.dataset.assignacio);
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

    el.coverageList.querySelectorAll('[data-comment]').forEach((input) => {
      input.addEventListener('input', () => {
        if (state.dayStatus === 'closed') return;
        const value = input.value.trim();
        if (value) state.comentaris.set(input.dataset.comment, value);
        else state.comentaris.delete(input.dataset.comment);
        const printComment = Array.from(el.coverageList.querySelectorAll('[data-comment-print]'))
          .find((node) => node.dataset.commentPrint === input.dataset.comment);
        if (printComment) {
          printComment.textContent = value ? `Comentari: ${value}` : '';
        }
        scheduleDaySave();
      });
    });

    el.coverageList.querySelectorAll('[data-remove-absence]').forEach((button) => {
      button.addEventListener('click', () => {
        if (state.dayStatus === 'closed') return;
        state.absencies.delete(button.dataset.removeAbsence);
        state.assignacions.delete(button.dataset.removeAbsence);
        state.comentaris.delete(button.dataset.removeAbsence);
        state.cancelledAssignments.delete(button.dataset.removeAbsence);
        renderSchedule();
        renderCoverage();
      });
    });
    el.coverageList.querySelectorAll('[data-cancel-assignment]').forEach((input) => {
      input.addEventListener('change', () => {
        if (state.dayStatus === 'closed') return;
        if (input.checked) state.cancelledAssignments.add(input.dataset.cancelAssignment);
        else state.cancelledAssignments.delete(input.dataset.cancelAssignment);
        renderCoverage();
      });
    });
    scheduleDaySave();
  }

  function renderConvivenciaForHour(dia, hora) {
    const professors = convivenciaProfessors(dia, hora);
    if (!professors.length) return '';
    const hasAbsence = professors.some((placa) => isProfessorAbsentAtHour(dia, hora, placa));
    return `
      <div class="convivencia-strip ${hasAbsence ? 'has-absence' : ''}">
        <span>Convivència</span>
        <div>
          ${professors.map((placa) => {
            const absent = isProfessorAbsentAtHour(dia, hora, placa);
            return `
              <strong class="${absent ? 'absent' : ''}">
                ${escapeHtml(labelProfessor(placa))}
                ${absent ? '<em>Absent</em>' : ''}
              </strong>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function renderPatiForDate() {
    if (!state.patiConfig) {
      return '<div class="pati-info-strip empty"><span>Zones de pati</span><p>Encara no hi ha una rotació configurada.</p></div>';
    }
    const reason = nonTeachingReason(state.date, state.patiConfig);
    if (reason) {
      return `
        <div class="pati-info-strip holiday">
          <span>Pati no lectiu</span>
          <p>${escapeHtml(reason.label)} · la rotació no avança</p>
        </div>
      `;
    }
    const assignments = patioAssignmentsForDate(state.date, state.patiConfig);
    if (!assignments.length) {
      return '<div class="pati-info-strip empty"><span>Zones de pati</span><p>Sense professorat de GP configurat per a aquest dia.</p></div>';
    }
    return `
      <div class="pati-info-strip">
        <span>Zones de pati</span>
        <div>
          ${assignments.map((assignment) => {
            const absent = Array.from(state.absencies.values()).some((item) => (
              item.placa === assignment.teacherId && item.dia === diaXmlSeleccionat()
            ));
            return `
              <strong class="${absent ? 'absent' : ''}">
                <em>${escapeHtml(assignment.zoneName)}</em>
                ${escapeHtml(labelProfessor(assignment.teacherId))}
                ${absent ? '<small>Absent · no se substitueix</small>' : ''}
              </strong>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  function mergeSessions(scheduleSessions, guardSessions) {
    const sessions = new Map();
    [...scheduleSessions, ...guardSessions].forEach((session) => {
      const semanticKey = [
        session.placa,
        session.dia,
        session.hora,
        session.teClasse ? 'classe' : 'activitat',
        session.activitat,
        session.materia,
        session.grup,
        session.aula,
      ].join('|');
      if (!sessions.has(semanticKey)) {
        sessions.set(semanticKey, session);
      } else if (session.origenGuardia === 'GPU001') {
        sessions.set(semanticKey, {
          ...sessions.get(semanticKey),
          ...session,
        });
      }
    });
    return Array.from(sessions.values()).map((session) => (
      isPatiGuardiaSession(session)
        ? { ...session, hora: 'PATI', franja: parser.franjaKey(session.dia, 'PATI') }
        : session
    )).sort((a, b) => {
      const dayDifference = Number(a.dia) - Number(b.dia);
      if (dayDifference) return dayDifference;
      const hourDifference = sortHours(a.hora, b.hora);
      if (hourDifference) return hourDifference;
      return labelProfessor(a.placa).localeCompare(labelProfessor(b.placa), 'ca', { numeric: true });
    });
  }

  function renderAbsentNormalGuardiesForHour(dia, hora) {
    const professors = parser.ocupacioFranja(state.sessions, dia, hora, state.guardiaCodes)
      .filter((professor) => professor.guardies.length && isProfessorAbsentAtHour(dia, hora, professor.placa))
      .map((professor) => professor.placa);
    const unique = Array.from(new Set(professors));
    if (!unique.length) return '';
    return `
      <div class="guard-absence-strip">
        <span>Guàrdia normal absent</span>
        <div>
          ${unique.map((placa) => `<strong>${escapeHtml(labelProfessor(placa))}</strong>`).join('')}
        </div>
      </div>
    `;
  }

  function sessionsProfessorDia(placa, dia) {
    return state.sessions.filter((sessio) => sessio.placa === placa && sessio.dia === dia && isMeaningfulSession(sessio));
  }

  function allProfessorWeekItems() {
    return parser.agruparSessionsCobertura(state.sessions.filter((sessio) => sessio.placa === state.professor && isMeaningfulSession(sessio)))
      .sort((a, b) => {
        const dia = Number(a.dia) - Number(b.dia);
        if (dia) return dia;
        return (a.hora || '').localeCompare(b.hora || '', 'ca', { numeric: true });
      });
  }

  function currentProfessorDayItems() {
    const dia = diaXmlSeleccionat();
    return dedupeScheduleItems(parser.agruparSessionsCobertura(sessionsProfessorDia(state.professor, dia)))
      .sort((a, b) => (a.hora || '').localeCompare(b.hora || '', 'ca', { numeric: true }));
  }

  function dedupeScheduleItems(items) {
    const seen = new Set();
    return items.filter((item) => {
      const key = [
        item.hora,
        isAbsenceSelectable(item) ? 'classe' : tipusItem(item),
        formatMateria(item),
        formatBlocCurt(item),
      ].join('|');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function selectedAbsenceItems() {
    const dia = diaXmlSeleccionat();
    return Array.from(state.absencies.values())
      .filter((item) => item.dia === dia)
      .sort(sortCoverageItems);
  }

  function convivenciaKey(dia, hora) {
    return `${dia || ''}|${hora || ''}`;
  }

  function guardiaSessionText(sessio) {
    return [
      sessio?.activitat,
      sessio?.activitatCurta,
      sessio?.activitatNom,
    ]
      .filter(Boolean)
      .join(' ')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function isConvivenciaGuardiaSession(sessio) {
    const text = guardiaSessionText(sessio);
    return (
      /(^|\s)(gc|gconv)(\s|$)/.test(text) ||
      text.includes('convivencia')
    );
  }

  function isPatiGuardiaSession(sessio) {
    const text = guardiaSessionText(sessio);
    return sessio?.activitat === 'GP' || text.includes('guardia pati');
  }

  function guardiaProfessorsForSlot(dia, hora) {
    const professors = new Map();
    const hasGpu001Guardies = state.sessions.some((sessio) => sessio.origenGuardia === 'GPU001');
    state.sessions
      .filter((sessio) => (
        sessio.dia === dia &&
        sessio.hora === hora &&
        sessio.placa &&
        (!hasGpu001Guardies || sessio.origenGuardia === 'GPU001') &&
        isGuardiaSession(sessio) &&
        !isPatiGuardiaSession(sessio)
      ))
      .forEach((sessio) => {
        const current = professors.get(sessio.placa) || {
          placa: sessio.placa,
          label: labelProfessor(sessio.placa),
          convivencia: false,
        };
        current.convivencia ||= isConvivenciaGuardiaSession(sessio);
        professors.set(sessio.placa, current);
      });
    return Array.from(professors.values())
      .sort((a, b) => {
        if (a.convivencia !== b.convivencia) return a.convivencia ? -1 : 1;
        return a.label.localeCompare(b.label, 'ca', { numeric: true });
      });
  }

  function detectedConvivenciaProfessors(dia, hora) {
    return guardiaProfessorsForSlot(dia, hora)
      .filter((professor) => professor.convivencia)
      .map((professor) => professor.placa);
  }

  function convivenciaProfessors(dia, hora) {
    const key = convivenciaKey(dia, hora);
    const professors = state.convivencia.get(key);
    const effective = state.convivencia.has(key)
      ? Array.from(professors || [])
      : detectedConvivenciaProfessors(dia, hora);
    return effective
      .filter(Boolean)
      .sort((a, b) => labelProfessor(a).localeCompare(labelProfessor(b), 'ca', { numeric: true }));
  }

  function isConvivenciaProfessor(dia, hora, placa) {
    return convivenciaProfessors(dia, hora).includes(placa);
  }

  function isMeaningfulSession(sessio) {
    return Boolean(sessio?.teClasse || sessio?.teActivitat);
  }

  function guardiesPerFranja(dia, hora, professorAbsent, currentAbsenceId = '') {
    const ocupacio = parser.ocupacioFranja(state.sessions, dia, hora, state.guardiaCodes);
    const ocupacioByPlaca = new Map(ocupacio.map((professor) => [professor.placa, professor]));
    const candidates = new Map();

    ocupacio
      .filter((professor) => (
        professor.placa !== professorAbsent &&
        professor.guardies.length
      ))
      .forEach((professor) => {
        candidates.set(professor.placa, {
          ...professor,
          alliberaments: [],
          convivencia: isConvivenciaProfessor(dia, hora, professor.placa),
          unavailable: isProfessorAbsentAtHour(dia, hora, professor.placa) || isAssignedElsewhere(dia, hora, professor.placa, currentAbsenceId),
        });
      });

    convivenciaProfessors(dia, hora).forEach((placa) => {
      if (placa === professorAbsent) return;
      if (candidates.has(placa)) {
        candidates.get(placa).convivencia = true;
        return;
      }
      const base = ocupacioByPlaca.get(placa) || {
        placa,
        label: labelProfessor(placa),
        sessions: [],
        classes: [],
        guardies: [],
        activitats: [],
        lliure: false,
      };
      candidates.set(placa, {
        ...base,
        alliberaments: [],
        convivencia: true,
        unavailable: isProfessorAbsentAtHour(dia, hora, placa) || isAssignedElsewhere(dia, hora, placa, currentAbsenceId),
      });
    });

    releasedItemsForSlot(dia, hora).forEach((item) => {
      if (item.placa === professorAbsent) return;

      if (!candidates.has(item.placa)) {
        const base = ocupacioByPlaca.get(item.placa) || {
          placa: item.placa,
          label: labelProfessor(item.placa),
          sessions: [],
          classes: [],
          guardies: [],
          activitats: [],
          lliure: false,
        };
        candidates.set(item.placa, {
          ...base,
          alliberaments: [],
          convivencia: isConvivenciaProfessor(dia, hora, item.placa),
          unavailable: isProfessorAbsentAtHour(dia, hora, item.placa) || isAssignedElsewhere(dia, hora, item.placa, currentAbsenceId),
        });
      }

      candidates.get(item.placa).alliberaments.push(item);
      if (isConvivenciaProfessor(dia, hora, item.placa)) candidates.get(item.placa).convivencia = true;
    });

    return Array.from(candidates.values())
      .sort((a, b) => {
        const rankA = a.unavailable ? 3 : a.convivencia ? 2 : a.alliberaments.length ? 0 : 1;
        const rankB = b.unavailable ? 3 : b.convivencia ? 2 : b.alliberaments.length ? 0 : 1;
        if (rankA !== rankB) return rankA - rankB;
        const countDifference = guardCount(a.placa) - guardCount(b.placa);
        if (countDifference) return countDifference;
        return (professorShort(a.placa) || a.placa)
          .localeCompare(professorShort(b.placa) || b.placa, 'ca', { numeric: true });
      });
  }

  function isProfessorAbsentAtHour(dia, hora, placa) {
    return isTeacherAbsentAtSlot(state.absencies, dia, hora, placa);
  }

  function guardCount(placa) {
    return Number(state.guardCounts.get(placa)) || 0;
  }

  function isAssignedElsewhere(dia, hora, placa, currentAbsenceId) {
    return Array.from(state.assignacions.entries()).some(([absenceId, assigned]) => {
      if (absenceId === currentAbsenceId || assigned !== placa) return false;
      const absence = state.absencies.get(absenceId);
      return absence?.dia === dia && absence?.hora === hora;
    });
  }

  function releasedItemsForDay() {
    const completeGroups = new Set(Array.from(state.grupsFora).filter((groupId) => !state.partialGroups.has(groupId)));
    const accompanyingTeachers = allCompanionTeacherIds();
    const releasedTeachers = new Map();
    completeGroups.forEach((groupId) => {
      const confirmed = state.grupProfessorsAlliberats.get(groupId) || new Set();
      releasedTeachers.set(groupId, new Set(Array.from(confirmed).filter((key) => (
        !accompanyingTeachers.has(key.split('|').slice(1).join('|'))
      ))));
    });
    return releasedTeachingBlocks({
      sessions: state.sessions,
      date: state.date,
      groupsOut: completeGroups,
      enabledTeachersByGroup: releasedTeachers,
    })
      .sort(sortCoverageItems);
  }

  function syncOutingAbsences() {
    state.outingAbsenceIds.forEach((id) => {
      state.absencies.delete(id);
      state.assignacions.delete(id);
      state.comentaris.delete(id);
    });
    state.outingAbsenceIds.clear();
    const accompanyingTeachers = new Set();
    state.grupProfessorsFora.forEach((keys) => keys.forEach((key) => accompanyingTeachers.add(key.split('|').slice(1).join('|'))));
    const day = diaXmlSeleccionat();
    accompanyingTeachers.forEach((teacherId) => {
      parser.agruparSessionsCobertura(
        state.sessions.filter((session) => session.placa === teacherId && session.dia === day && isMeaningfulSession(session)),
      ).filter(isAbsenceSelectable).forEach((item) => {
        state.absencies.set(item.id, item);
        state.outingAbsenceIds.add(item.id);
      });
    });
  }

  function releasedItemsForSlot(dia, hora) {
    return releasedItemsForDay().filter((item) => item.dia === dia && item.hora === hora);
  }

  function trimCurrentProfessorAbsences(items) {
    const valid = new Set(items.filter(isAbsenceSelectable).map((item) => item.id));
    Array.from(state.absencies.entries()).forEach(([id, item]) => {
      if (item.placa === state.professor && item.dia === diaXmlSeleccionat() && !valid.has(id)) {
        state.absencies.delete(id);
        state.assignacions.delete(id);
        state.comentaris.delete(id);
      }
    });
  }

  function clearCurrentProfessorAbsences() {
    const dia = diaXmlSeleccionat();
    Array.from(state.absencies.entries()).forEach(([id, item]) => {
      if (item.placa === state.professor && item.dia === dia) {
        state.absencies.delete(id);
        state.assignacions.delete(id);
        state.comentaris.delete(id);
      }
    });
  }

  function addAllCurrentProfessorAbsences() {
    currentProfessorDayItems()
      .filter(isAbsenceSelectable)
      .forEach((item) => {
        state.absencies.set(item.id, item);
      });
  }

  function sortCoverageItems(a, b) {
    const ordered = hoursForSelectedDay();
    const hora = ordered.indexOf(a.hora) - ordered.indexOf(b.hora);
    if (hora) return hora;
    const group = (groupLabel(a) || tipusItem(a)).localeCompare(groupLabel(b) || tipusItem(b), 'ca', { numeric: true });
    if (group) return group;
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

  function renderReleasedList() {
    const released = releasedItemsForDay();
    const professors = new Set(released.map((item) => item.placa));
    el.releasedCount.textContent = plural(professors.size, 'professor', 'professors');
    el.clearGroups.disabled = !state.canWrite || state.dayStatus === 'closed' || !state.grupsFora.size;

    if (!state.grupsFora.size) {
      el.releasedList.innerHTML = '<div class="empty-small">Selecciona un grup de sortida.</div>';
      return;
    }

    const releasedByHour = new Map(groupBySession(released).map((group) => [group.hora, group.items]));
    const dayHours = hoursForSelectedDay();
    el.releasedList.innerHTML = dayHours.map((hora) => {
      const items = releasedByHour.get(hora) || [];
      return `
        <section class="released-session">
          <div class="coverage-session-head">
            <h3>${escapeHtml(horaLabel(hora))}</h3>
            <span>${items.length ? plural(new Set(items.map((item) => item.placa)).size, 'professor', 'professors') : 'Sense alliberats'}</span>
          </div>
          <div class="released-session-list">
            ${items.length ? items.map(renderReleasedItem).join('') : '<div class="coverage-empty">Cap classe dels grups seleccionats.</div>'}
          </div>
        </section>
      `;
    }).join('');
  }

  function renderReleasedItem(item) {
    return `
      <article class="released-item">
        <div>
          <strong>${escapeHtml(labelProfessor(item.placa))}</strong>
          <span>${escapeHtml(formatMateria(item))} · ${escapeHtml(formatBlocCurt(item))}</span>
        </div>
        <span class="released-tag">Candidat</span>
      </article>
    `;
  }

  function hoursForSelectedDay() {
    const dia = diaXmlSeleccionat();
    const hores = (state.resum?.franges || [])
      .filter((franja) => franja.dia === dia)
      .map((franja) => franja.hora);
    const unique = Array.from(new Set(hores));
    if (unique.length) {
      return orderedHours(unique);
    }
    return orderedHours(state.resum?.hores || []);
  }

  function orderedHours(values) {
    return completeGuardDutyHours(values);
  }

  function sortHours(a, b) {
    if (a === b) return 0;
    const ordered = hoursForSelectedDay();
    const indexA = ordered.indexOf(a);
    const indexB = ordered.indexOf(b);
    if (indexA >= 0 && indexB >= 0) return indexA - indexB;
    if (indexA >= 0) return -1;
    if (indexB >= 0) return 1;
    return String(a || '').localeCompare(String(b || ''), 'ca', { numeric: true });
  }

  function renderCoverageRow(item) {
    const isPati = item.sessions?.some(isPatiGuardiaSession);
    const candidates = isPati ? [] : guardiesPerFranja(item.dia, item.hora, item.placa, item.id);
    const assignat = state.assignacions.get(item.id) || '';
    const hasCandidates = candidates.length > 0;
    const hasAvailableCandidates = candidates.some((candidate) => !candidate.unavailable);
    const hasReleasedCandidates = candidates.some((candidate) => (
      !candidate.unavailable && candidate.alliberaments.length
    ));
    const comentari = state.comentaris.get(item.id) || '';
    const group = groupLabel(item) || 'Sense grup';
    const subject = formatMateria(item) || 'Sense matèria';
    const room = aulaLabel(item);
    const assignatIsConvivencia = assignat && isConvivenciaProfessor(item.dia, item.hora, assignat);
    const cancelled = state.cancelledAssignments.has(item.id);
    const taskLabel = isPati ? 'Pati · GP' : isGuardiaItem(item) ? formatMateria(item) : group;
    const locked = state.dayStatus === 'closed';

    return `
      <article class="coverage-item coverage-row ${assignat ? 'covered' : ''} ${cancelled ? 'not-completed' : ''} ${isPati ? 'informational' : ''}">
        <div class="coverage-professor-cell">
          <span class="cell-kicker">Falta</span>
          <strong>${escapeHtml(labelProfessor(item.placa))}</strong>
          <button type="button" class="icon-remove no-print" aria-label="Elimina aquesta absència" data-remove-absence="${escapeHtml(item.id)}" ${locked ? 'disabled' : ''}>X</button>
        </div>
        <div class="coverage-detail-cell">
          <span class="cell-kicker">Sessió</span>
          <strong>${escapeHtml(taskLabel)}</strong>
          <span>${escapeHtml(isGuardiaItem(item) ? 'Torn sense cobrir' : subject)}</span>
          ${room ? `<span>${escapeHtml(room)}</span>` : ''}
        </div>
        <div class="coverage-assignment-cell ${hasReleasedCandidates ? 'has-released-candidates' : ''} ${hasCandidates && !hasAvailableCandidates ? 'only-unavailable' : ''}">
          ${isPati ? '<span class="info-only-label">Informatiu · no se substitueix</span>' : `
          <select data-assignacio="${escapeHtml(item.id)}" ${hasCandidates && !locked ? '' : 'disabled'}>
            <option value="">Sense preassignar</option>
            ${candidates.map((candidate) => `
              <option
                class="candidate-option ${candidateOptionClass(candidate)}"
                value="${escapeHtml(candidate.placa)}"
                ${candidate.placa === assignat ? 'selected' : ''}
                ${candidate.unavailable ? 'disabled' : ''}
              >
                ${escapeHtml(candidateSelectLabel(candidate))}
              </option>
            `).join('')}
          </select>`}
          ${assignatIsConvivencia ? '<span class="convivencia-badge">Convivència · ús excepcional</span>' : ''}
          <span class="print-only print-assignment">${escapeHtml(assignat ? labelProfessor(assignat) : '')}</span>
          ${assignat && !isPati ? `<label class="completion-toggle no-print"><input type="checkbox" data-cancel-assignment="${escapeHtml(item.id)}" ${cancelled ? 'checked' : ''} ${locked ? 'disabled' : ''} /> No realitzada</label>` : ''}
        </div>
        <label class="coverage-comment-cell">
          <textarea data-comment="${escapeHtml(item.id)}" rows="2" placeholder="Observacions" ${locked ? 'disabled' : ''}>${escapeHtml(comentari)}</textarea>
          <span class="print-only" data-comment-print="${escapeHtml(item.id)}">${escapeHtml(comentari)}</span>
        </label>
      </article>
    `;
  }

  function renderCoverageItem(item) {
    const candidates = guardiesPerFranja(item.dia, item.hora, item.placa, item.id);
    const assignat = state.assignacions.get(item.id) || '';
    const hasCandidates = candidates.length > 0;
    const assignatLabel = assignat ? labelProfessor(assignat) : 'Pendent';
    const comentari = state.comentaris.get(item.id) || '';
    const details = coverageDetails(item);

    return `
      <article class="coverage-item ${assignat ? 'covered' : ''}">
        <div class="coverage-head">
          <div>
            <div class="session-title">${escapeHtml(labelProfessor(item.placa))}</div>
            <div class="session-meta">${escapeHtml(details)}</div>
          </div>
          <button type="button" class="icon-remove no-print" aria-label="Elimina aquesta absència" data-remove-absence="${escapeHtml(item.id)}">X</button>
        </div>
        <div class="assignment">
          <select data-assignacio="${escapeHtml(item.id)}" ${hasCandidates ? '' : 'disabled'}>
            <option value="">Professor preassignat</option>
            ${candidates.map((candidate) => `
              <option
                class="candidate-option ${candidateOptionClass(candidate)}"
                value="${escapeHtml(candidate.placa)}"
                ${candidate.placa === assignat ? 'selected' : ''}
                ${candidate.unavailable ? 'disabled' : ''}
              >
                ${escapeHtml(candidateSelectLabel(candidate))}
              </option>
            `).join('')}
          </select>
          <button type="button" class="ghost" data-clear-assignacio="${escapeHtml(item.id)}">Neteja</button>
          <span class="print-only print-assignment">Guàrdia: ${escapeHtml(assignatLabel)}</span>
        </div>
        <label class="comment-field no-print">
          Comentari
          <textarea data-comment="${escapeHtml(item.id)}" rows="2" placeholder="Aula, feina, incidència...">${escapeHtml(comentari)}</textarea>
        </label>
        <div class="print-only print-comment" data-comment-print="${escapeHtml(item.id)}">${comentari ? `Comentari: ${escapeHtml(comentari)}` : ''}</div>
      </article>
    `;
  }

  function coverageDetails(item) {
    return [
      groupLabel(item),
      formatMateria(item),
      aulaLabel(item),
    ].filter(Boolean).join(' · ') || 'Sense detall';
  }

  function groupLabel(item) {
    if (item.grupsVisibles?.length) return item.grupsVisibles.join(' + ');
    if (item.cursosVisibles?.length) return item.cursosVisibles.join(' + ');
    return '';
  }

  function aulaLabel(item) {
    if (item.aulaNom) return item.aulaNom;
    return '';
  }

  function assignmentLoadLabel(item, placa) {
    const count = countAssignmentsSameSlot(item.dia, item.hora, placa);
    return plural(count, 'en aquesta hora', 'en aquesta hora');
  }

  function countAssignmentsSameSlot(dia, hora, placa) {
    let count = 0;
    state.assignacions.forEach((assignedPlaca, absenceId) => {
      if (assignedPlaca !== placa) return;
      const absence = state.absencies.get(absenceId);
      if (absence?.dia === dia && absence?.hora === hora) count += 1;
    });
    return count;
  }

  function horaLabel(hora) {
    if (hora === 'PATI') return 'Pati · 10:45–11:15';
    const normalHours = hoursForSelectedDay().filter((value) => value !== 'PATI');
    const index = normalHours.indexOf(hora);
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
    return professorInfo(placa).short || '';
  }

  function labelProfessor(placa) {
    const info = professorInfo(placa);
    if (info.name && info.short && info.name !== info.short) return `${info.name} · ${info.short}`;
    if (info.name) return info.name;
    return info.short || 'Professor sense nom';
  }

  function activityInfo(code) {
    const info = state.referencia?.activitats?.get(code);
    const label = info
      ? info.label || info.descripcio || 'Activitat'
      : 'Activitat';
    return { label, info };
  }

  function tipusItem(item) {
    if (isGuardiaItem(item)) return 'Guàrdia';
    if (item.activitat) return 'Activitat';
    if (!item.sessions?.some((sessio) => sessio.teClasse)) return 'Sense sessio';
    return 'Classe';
  }

  function isAbsenceSelectable(item) {
    const hasTeachingSession = item.sessions.some((sessio) => sessio.teClasse);
    return hasTeachingSession || isGuardiaItem(item);
  }

  function isGuardiaItem(item) {
    return item.sessions?.some(isGuardiaSession);
  }

  function isGuardiaSession(sessio) {
    return Boolean(
      sessio.activitatEsGuardia ||
      sessio.activitatEsGuardiaGeneral ||
      (sessio.activitat && state.guardiaCodes.has(sessio.activitat))
    );
  }

  function hasGuardiaCandidates() {
    return state.sessions.some((sessio) => (
      sessio.activitatEsGuardiaGeneral ||
      (sessio.activitat && state.guardiaCodes.has(sessio.activitat))
    ));
  }

  function formatSessionsActivitat(sessions) {
    const labels = Array.from(new Set(sessions.map((sessio) => (
      sessio.activitatCurta || sessio.activitatNom || sessio.activitat
    )).filter(Boolean)));
    return labels.length ? labels.join(', ') : 'Guàrdia';
  }

  function formatCandidateAvailability(candidate) {
    const labels = [];
    if (candidate.guardies?.length) labels.push(formatSessionsActivitat(candidate.guardies));
    if (candidate.alliberaments?.length) labels.push(formatAlliberamentLabel(candidate.alliberaments));
    if (candidate.convivencia) labels.push('Convivencia');
    return labels.length ? labels.join(' + ') : 'Disponible';
  }

  function candidateSelectLabel(candidate) {
    const count = guardCount(candidate.placa);
    if (candidate.unavailable) return `No disponible - ${labelProfessor(candidate.placa)}`;
    if (candidate.alliberaments?.length) return `Alliberat · ${count} fetes - ${labelProfessor(candidate.placa)}`;
    const prefix = candidate.convivencia ? 'Convivència - ' : 'Guàrdia - ';
    return `${prefix}${count} fetes - ${labelProfessor(candidate.placa)}`;
  }

  function candidateOptionClass(candidate) {
    if (candidate.unavailable) return 'candidate-unavailable';
    if (candidate.alliberaments?.length) return 'candidate-released';
    return 'candidate-guard';
  }

  function formatAlliberamentLabel(items) {
    const grups = Array.from(new Set(items.flatMap((item) => (
      item.grupsVisibles?.length
        ? item.grupsVisibles
        : item.grups.map((grup) => `Grup ${grup}`)
    )).filter(Boolean)));
    return grups.length ? `Alliberat: ${grups.join(' + ')}` : 'Alliberat';
  }

  function formatMateria(item) {
    if (isGuardiaItem(item) && !item.materia) return 'Guàrdia';
    if (item.materia) return item.materiaCurta || item.materiaNom || 'Matèria sense nom';
    if (item.activitat) return item.activitatCurta || item.activitatNom || 'Activitat sense nom';
    return 'Sessió';
  }

  function formatBlocCurt(item) {
    const parts = [];
    if (item.grupsVisibles?.length) parts.push(item.grupsVisibles.join(' + '));
    else if (item.grups.length) parts.push('Grup sense nom');
    else if (item.cursosVisibles?.length) parts.push(item.cursosVisibles.join(' + '));
    else if (item.cursos.length) parts.push('Curs sense nom');
    if (item.aulaNom) parts.push(item.aulaNom);
    else if (item.aula) parts.push('Aula sense nom');
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
    return xmlDayForDate(state.date);
  }

  function setDateToXmlDay(xmlDay) {
    const date = dateForXmlDayInSameWeek(state.date, xmlDay);
    if (!date) return;
    state.changeDate(date);
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
