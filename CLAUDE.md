Soy Monica, administradora de un instituto de secundaria (IES Josep Sureda i Blanes, Mallorca).

Tengo una app en Vue 3 + Vite + Firebase (Firestore + Auth) + Pinia + Tailwind CSS desplegada en quota.iessureda.com.

## QUÉ HACE LA APP

Gestiona la distribución de horas del profesorado. El admin importa la quota desde Google Sheets, los jefes de departamento reparten las horas entre sus profesores, y al final se exporta a Untis. Soporta múltiples cursos académicos.

## STACK

- Vue 3 + Vite
- Firebase Firestore (tiempo real) + Firebase Auth (Google OAuth)
- Pinia (estado global)
- Tailwind CSS
- Desplegada en Netlify

## ESTRUCTURA FIRESTORE

Las colecciones de datos están anidadas bajo el curs activo:

- `cursos/{cursId}` → año académico (nom, bloqueig, createdAt)
  - `cursos/{cursId}/classes` → asignaciones (curs, grup, materia, hores, departament, departaments[], tipus, professors[], professorAssignat, participants[])
  - `cursos/{cursId}/professors` → (nom, departament, preferencia, jornada, motiuAllegat, comentaris, gpAssignades, palicAssignades)
  - `cursos/{cursId}/departaments` → (nom, tancat, tancatPer, tancatAt)

Colecciones globales (fuera de cursos):

- `usuaris/{uid}` → usuarios autenticados (email, nom, photoURL, rol, departament, createdAt)
- `preautoritzats/{email}` → pre-autorizaciones antes del primer login (rol, departament)
- `config/app_settings` → ajustes globales (tancamentAdmin, departamentsTancats, missatgeTancament)
- `presence/{departament_sessionId}` → presencia en tiempo real en /departament

El store `cursStore` (src/stores/curs.js) proporciona helpers `col()`, `docRef()`, `nouDoc()` que apuntan al curs activo. Siempre usar estos helpers en lugar de rutas Firestore hardcodeadas.

## AUTENTICACIÓN

- Google OAuth restringido al dominio `@iesjosepsuredaiblanes.com`
- Al hacer login, se busca el usuario en `usuaris/{uid}`. Si no existe, se crea con el rol de `preautoritzats/{email}` si lo hay, o sin rol (pendent).
- `authReady` + `waitForAuth()` en auth store garantizan que el router guard espera a que Firebase resuelva la sesión antes de evaluar permisos.
- `main.js` inicializa Pinia antes del router para evitar que `useAuthStore()` falle en el guard.

## ROLES

- `admin` → acceso a `/admin`, `/departament`, `/resums`
- `cap_departament` / `departament` → acceso a `/departament` y `/resums` (equivalentes)
- `professor` → acceso a `/departament` y `/resums` en modo solo lectura (`solsLectura`)
- Sin rol (pendent) → solo pantalla de inicio

## RUTAS Y GUARDS (src/router/index.js)

- `/` → público (Home.vue — login Google)
- `/admin` → `requiresAdmin` (solo `admin`)
  - `/admin/cursos` → GestioCursos
  - `/admin/sincronitzacio` → Sincronitzacio
  - `/admin/dades` → DadesImportades
  - `/admin/tancament` → Tancament
  - `/admin/untis` → ExportUntis
  - `/admin/usuaris` → UsuarisAdmin (gestión de roles Google)
- `/departament` → `requiresCapDepartament` (`admin`, `cap_departament`, `departament`)
- `/resums` → `requiresAuth` (cualquier rol)

## REGLAS DE NEGOCIO - TIPUS

- (vacío): clase normal → grupo ✅ profesor ✅
- D (Desdoble): grupo ❌, profesor ✅
- O, O1, O2... (Optativa): 1 sola vez por franja para el grupo ✅, profesor ✅
- F (Flexible): grupo ❌, profesor ✅
- S (Suport): co-docencia misma aula → grupo ❌, profesor ✅
- C (Coordinació): tipo especial con `participants[]`. No cuenta para horas lectivas.
- T (Optativa compartida): las horas se reparten entre los profesores asignados (hores/numProfessors)
- GP (Guàrdia de Pati): grupo ❌, no cuenta para las 18h lectivas. Pool por departamento, asignado 1 a 1 por profesor via `gpAssignades`
- PALIC: grupo ❌, profesor ✅. Pool por departamento, asignado 1 a 1 via `palicAssignades`
- *Tutoria: grupo ❌, profesor ✅
- A1, A2... (Autodesdoble): grupo ✅ horas reducidas (hores - N), profesor ✅ horas completas

## GRUPOS COMBINADOS

- ACE → A+C+E (función `normalitzarGrup`)
- El profesor toma el bloque completo; las horas se repiten para cada grupo individual

## HORAS LECTIVAS PROFESOR

- Ideal: 18h (o según `jornada`)
- PALIC cuenta para las horas lectivas; GP no
- `limitsHoresProfessor()` en `src/utils/horesProfessor.js` calcula ideal y máximo según preferencia/jornada

## SINCRONIZACIÓN GOOGLE SHEETS

- URL Apps Script: https://script.google.com/macros/s/AKfycbykQQXn6_oZ1iTtkASuHSA1P1kr5eSqGlIEdm5IBfuxSvr0wDh2I6Ec_yjILnHCXDKe/exec
- Sheet ID: 1uKYDn_2-KyHVJrlfLAHWvZ-YvPIRpv2SlSDUhdQfnA0
- Pestaña "Resultado": CURS|GRUP|MATERIA|HORES|DEPARTAMENT|TIPUS
- Pestaña "Professorat": NOM|DEPARTAMENT
- La sincronización conserva professors[], gpAssignades, palicAssignades del documento existente

## FUNCIONALIDADES CLAVE

- **Presencia en tiempo real**: `/departament` muestra quién está conectado (colección `presence`, heartbeat cada 10s, TTL 30s)
- **Tancament de departament**: los caps pueden cerrar su departamento; solo el admin puede reabrirlo
- **App settings**: `config/app_settings` controla `tancamentAdmin` y `missatgeTancament`
- **Multi-curs**: cada año académico es un `cursId`. El `cursStore` gestiona el activo y provee helpers Firestore.
- **Exportación Untis**: `src/services/untisExport.js` + `src/components/ExportUntis.vue`
- **Resums**: múltiples componentes de resumen (ResumGrups, ResumProfessors, ResumDepartaments, ResumCoordinacions, ResumTutories, ResumCapsDepartament, ResumMajors55, ResumValidacioFinal, ResumTracabilitatProfessor, ResumPocesHores)

## ARCHIVOS CLAVE

- `src/main.js` — bootstrap: Pinia antes que router
- `src/router/index.js` — rutas y guards
- `src/stores/auth.js` — Firebase Auth + roles + waitForAuth()
- `src/stores/curs.js` — curs activo + helpers Firestore
- `src/services/appSettings.js` — settings globales
- `src/services/sincronitzacio.js` — importación desde Sheets
- `src/views/Home.vue` — login Google
- `src/views/Admin.vue` — shell admin con sidebar
- `src/views/Departament.vue` — repartimiento de horas (lógica principal)
- `src/views/Resums.vue` — vista de resúmenes
- `src/components/RepartimentHores.vue` — asignación drag/drop de clases a profesor
- `src/components/departament/ProfessorCard.vue` — tarjeta por profesor
- `src/components/UsuarisAdmin.vue` — gestión de usuarios Google
- `src/utils/horesProfessor.js` — cálculo de límites de horas
