Soy Monica, administradora de un instituto de secundaria (IES Josep Sureda i Blanes, Mallorca).

Tengo una app en Vue 3 + Vite + Firebase (Firestore + Auth) + Pinia + Tailwind CSS desplegada en quota.iessureda.com.

## QUÉ HACE LA APP

Prepara cada curso la quota del centro y el repartimiento de horas del profesorado, y genera los ficheros para importarlo en Untis. Además es la fuente del profesorado y de los accesos de Guàrdies, Pantalles y Retards.

Ciclo anual (a final de curso, para el curso siguiente): **GestIB** (catálogo de plazas, materias y actividades) → **Curs** → **Professorat** → **Quota** → **Repartiment** → **Untis**. Desde octubre de 2026 no hay hoja de Google Sheets: todo se gestiona en la app.

Documentación:
- `docs/quota-domain.md`: dominio, datos, correspondencia con GestIB, exportación a Untis y comprobaciones antes del cambio de curso.
- `public/docs/tutorial-admin.html`: guía de uso para la administración (enlazada desde el «?» de la barra), con la lista del cambio de curso.
- `public/docs/tutorial-caps.html`: guía para los caps de departamento.

## STACK

- Vue 3 + Vite, Pinia, Tailwind CSS
- Firebase Firestore (tiempo real) + Firebase Auth (Google OAuth), proyecto `quota-e1424`
- Netlify (despliega al hacer push a `main`)

## ESTRUCTURA FIRESTORE

Bajo cada curso (`cursos/{cursId}`, con `nom` y `bloqueig`):

- `classes` → filas de la quota: curs, grup (`A+C+E`), materia, hores, departament, departaments[], tipus, subclasses[], professors[], professorAssignat, participants[] y **`gestib`** (`{ tipus: 'materia' | 'activitat', codis: [...] }`, la correspondencia con el catálogo de GestIB).
- `professors` → fichas: nom, email, codiUntis (= plaza `PLACA` de GestIB), departaments[], jornada, rols[], eliminatDelFull (Anteriors) y la planificación (gpAssignades, palicAssignades, sdAssignacions, ddAssignacions…).
- `departaments` → nom, tancat, tancatPer, tancatAt, exclos.
- `untis/gestib_xml` → el XML de GestIB del curso (catálogo).
- `config/app_settings` → solo cuotas de guardias de patio (totalGuardiesPati, gpExclusions, gpReductions).
- `config/untis_mapeig` → mapeo manual antiguo de la página Untis (solo para filas sin `gestib`).
- `guardies*`, `config/guardies-*` → datos de Guàrdies (no tocar desde Quota).

Globales: `usuaris/{uid}` (rol que leen las reglas y las otras apps), `preautoritzats/{email}` (accesos derivados de Professorat), `pantalles`, `guardiesCorreus`, `retards*`.

El store `cursStore` (src/stores/curs.js) proporciona `col()`, `docRef()`, `nouDoc()` sobre el curso activo.

## AUTENTICACIÓN Y ROLES

- Google OAuth restringido a `@iesjosepsuredaiblanes.com`. Al entrar se crea o actualiza `usuaris/{uid}` con el rol de `preautoritzats/{email}`.
- Los roles se dan en **Professorat** (ficha): `admin`, `cap_departament`, `psc` (Retards). Todos son `professor`. El antiguo `departament` (compte de departament) se lee como `cap_departament`.
- Solo el **curso vigente** (el del calendario) cambia los permisos de acceso.
- `admin` → `/admin`, `/departament`, `/informes`; `cap_departament` → `/departament`, `/informes`; profesorado → `/informes`.

## RUTAS (src/router/index.js)

- `/` → Home (login)
- `/admin` (solo admin): `cursos` (GestioCursos: estado del ciclo, curso nuevo, borrados), `professorat` (ProfessoratAdmin, incluye cuentas sin ficha), `quota` (QuotaPanell), `untis` (ExportUntis), `parametres` (Configuracio). Las rutas antiguas (`dades`, `usuaris`, `tancament`, `seguiment`, `consum`…) redirigen.
- `/departament` → repartimiento (caps y admin; el admin reabre o excluye departamentos aquí)
- `/informes` → Informes (Seguimiento para admin + Resúmenes para todos). `/resums` redirige.

## REGLAS DE NEGOCIO - TIPUS

- (vacío): clase normal → grupo ✅ profesor ✅
- D (Desdoble): grupo ❌, profesor ✅
- O, O1, O2... (Optativa): 1 sola vez por franja para el grupo ✅, profesor ✅
- F (Flexible): grupo ❌, profesor ✅
- S (Suport): co-docencia misma aula → grupo ❌, profesor ✅
- C / CO (Coordinació): no cuenta para horas lectivas y no se exporta a Untis. C tiene `participants[]`.
- T (Optativa compartida): las horas se reparten entre los profesores asignados (hores/numProfessors)
- GP (Guàrdia de Pati): grupo ❌, no cuenta para las 18h lectivas. Pool por departamento, asignado 1 a 1 por profesor via `gpAssignades`
- PALIC: grupo ❌, profesor ✅. Pool por departamento, asignado 1 a 1 via `palicAssignades`
- *Tutoria: grupo ❌, profesor ✅
- A1, A2... (Autodesdoble): grupo ✅ horas reducidas (hores - N), profesor ✅ horas completas

## GRUPOS COMBINADOS

- ACE → A+C+E (función `normalitzarGrup`)
- Una fila de varios grupos suma las horas de todos: Matemàtiques 1ESO A+C+E 12 h = 4 h por grupo.
- En GestIB algunas materias son por grupo (`MAT-A-1E`) y otras por bloque (`TFCR-BD-3E`, `EDM-ACE1-1E`): la correspondencia de la fila lo recoge.

## HORAS LECTIVAS PROFESOR

- Ideal: 18h (13 con reducción de 1/3, 9 media jornada)
- PALIC cuenta para las horas lectivas; GP no
- `limitsHoresProfessor()` en `src/utils/horesProfessor.js`

## ARCHIVOS CLAVE

- `src/views/Admin.vue` — menú de administración por el ciclo del curso
- `src/components/QuotaPanell.vue` — panel Quota (departamentos, balance, correspondencia GestIB)
- `src/utils/quota.js` — lógica pura de la quota
- `src/utils/gestibCorrespondencia.js` — propuestas y resolución de la correspondencia con GestIB (reglas del centro incluidas)
- `src/services/gestibMapper.js` — lectura del XML de GestIB y resolución para la exportación
- `src/services/gpuFormatter.js` — exportación a Untis (`generarExportUntis`, sin Firestore)
- `src/services/lessonBuilder.js` — agrupación de filas en lecciones de Untis
- `src/components/ProfessoratAdmin.vue`, `src/services/professorat.js`, `src/utils/professorat.js` — profesorado y accesos
- `src/views/Departament.vue` — repartimiento (lógica principal de los caps)
- `src/views/Informes.vue` — informes
- `src/stores/auth.js`, `src/stores/curs.js`

## PRUEBAS

- `npm run test:domain` (node:test, lógica pura)
- `npm run test:visual` (Playwright en modo E2E con datos en memoria: `VITE_E2E_AUTH_BYPASS=true`)
- `npm run verify:untis` (verificación de la exportación con los ficheros locales de `src/assets`, que no se suben al repositorio)

## REGLAS DE TRABAJO

- Nunca romper la forma de los datos que leen Guàrdies, Pantalles y Retards (ver `docs/quota-domain.md`).
- No escribir en Firestore de producción sin confirmación. Las reglas (`firestore.rules`) se despliegan aparte.
- `src/assets/GPU001.TXT` y el XML de GestIB locales contienen datos personales: no se suben.
