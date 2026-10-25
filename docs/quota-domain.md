# Domini de Quota: del catàleg de GestIB a Untis

Aquest document fixa com funciona Quota des de la reorganització d'octubre de 2026 i què cal comprovar perquè el canvi de curs (juny) surti bé. La guia d'ús per a l'administració és `public/docs/tutorial-admin.html` (enllaçada des de l'aplicació).

## El cicle del curs

1. **GestIB** (fora de Quota): la cap d'estudis prepara el curs següent amb les places (cadires, no persones), les matèries i les activitats. Se n'exporta l'XML `exportacioDadesHoraris`.
2. **Curs** (`/admin/cursos`): curs nou copiant professorat i quota de l'anterior (`copiarProfessoratDeCurs`, `copiarQuotaDeCurs`), sense repartiment.
3. **Catàleg GestIB**: l'XML es desa a `cursos/{curs}/untis/gestib_xml` (`gestibXmlStorage.js`). El carreguen el panell Quota, la pàgina Curs i l'exportació Untis.
4. **Professorat** (`/admin/professorat`): fitxes, rols i accés. `codiUntis` és la plaça (`PLACA` curta de l'XML).
5. **Quota** (`/admin/quota`): les classes de cada departament i la seva correspondència amb GestIB.
6. **Repartiment** (`/departament`): els caps assignen professorat i tanquen el departament.
7. **Untis** (`/admin/untis`): genera `GPU002/003/004/006.TXT`.

Ja no hi ha full de càlcul: la sincronització, l'Apps Script, Importació, Usuaris, Tancament i Consum s'han eliminat. Les adreces antigues redirigeixen (`src/router/index.js`).

## Dades

- `cursos/{curs}/classes/{id}`: una fila de la quota. Camps: `curs`, `grup` (`A+C+E`), `materia`, `hores`, `tipus`, `departament`, `departaments[]`, `subclasses[]` (multicurs), repartiment (`professors[]`, `professorAssignat`, `participants[]`) i **`gestib`**.
- `gestib`: `{ tipus: 'materia', codis: ['MAT-A-1E', 'MAT-C-1E'] }` o `{ tipus: 'activitat', codis: ['17'] }`.
  - Matèries per l'**abreviatura curta**, que es manté entre cursos llevat de canvis de currículum.
  - Activitats pel **codi de GestIB** (`ACTIVITAT@codi`), perquè dues activitats poden compartir abreviatura (tutoria FCT presencial i no presencial).
- `cursos/{curs}/professors`, `departaments` (`tancat`, `exclos`), `config/app_settings` (només guàrdies de pati), `config/untis_mapeig` (mapeig manual antic, de reserva).
- Les col·leccions antigues (`sync_history`, `sync_backups`, `presence`) es conserven però ja no s'escriuen.

## L'XML de GestIB

`CENTRE(codi, any)` › `CURSOS/CURS(codi, descripcio)/GRUP(codi, nom)`, `PLACES/PLACA(codi, curta)`, `DEPARTAMENTS`, `MATERIES/MATERIA(codi, curs, descripcio, curta, departament)`, `ACTIVITATS/ACTIVITAT(codi, descripcio, curta)`, `AULES`. Es llegeix amb `parseGestibXml` (`DOMParser`, només al navegador).

Les descripcions de matèria segueixen `Nom-GRUPS[-MARCA]-CURS`:

- `Matemàtiques-A-1E`: un grup.
- `Taller de finances i consum reponsable-BD-3E`: un bloc de grups (amb una errada de GestIB inclosa).
- `Entorns digitals i multimèdia-ACE1-1E` / `-ACE2-1E`: blocs paral·lels.
- `Tècniques experimentals-AB-FQ-1B`: marca de departament.
- `Anglès professional-BAGA22`: grup enganxat al curs (FP).
- `Llengua estrangera - Anglès-A-1E`: el guió amb espais forma part del nom.

`analitzarMateriaGestib` en separa base, grups i marques.

## Correspondència (`src/utils/gestibCorrespondencia.js`)

- **`proposarCorrespondencia(fila, cataleg, { mapeig, usats })`**: proposa per a una fila sense enllaç i retorna `{ tipus, codis, confianca: 'segura' | 'probable', motiu }`.
  - **Matèries**: primer el mapeig antic; després el nom, amb tots els criteris següents:
    - semblança per paraules, amb errades d'una lletra;
    - números romans i lletra final com a marca;
    - sigles de l'abreviatura o inicials (AE, EPVA, IPO, EDMN);
    - exactitud (guanya `Matemàtiques` sobre `Taller de matemàtiques`);
    - cobertura de grups (un bloc exacte o una matèria per grup);
    - marca de departament;
    - blocs paral·lels repartits entre files (`usats`).

    Una fila sense cap paraula en comú no rep proposta.
  - **Activitats**: primer les **regles del centre** (`REGLES_ACTIVITAT`), si són segures; després el mapeig antic i el nom.
- **`proposarCorrespondencies(files, cataleg)`**: totes les files sense enllaç, sense repetir blocs paral·lels.
- **`estatEnllac(fila, cataleg)`**: retorna `ok`, `sense` o `trencat` (codi desaparegut, o grups de la fila que cap matèria enllaçada cobreix).
- **`resoldreEnllac(fila, cataleg)`**: l'element del catàleg que toca a una línia d'exportació (el tros d'un grup d'una fila).

Regles del centre decidides l'octubre de 2026:

| Fila | Activitat |
|---|---|
| `>55 …` | *Majors de 55 anys |
| Cap de departament / subdepartament | *Dedicació a cap de departament / a subdepartament |
| Cap d'estudis, cap d'estudis adjunt/a, CE adjunta | *Dedicació a prefectura d'estudis |
| FEMPO, FCT | *Tutoria formació en empresa (presencial, codi 45 a 2026-27) |
| Desdoblament CFGB/CFGM | *Hores dedicades a reforç i ampliació |
| Coord… | *Dedicació a coordinació (PROA+ → *Dedicació a PROA+) |
| Suport, altres desdoblaments | per revisar |

El mapeig antic de 2026-27 tenia `Cap d'estudis adjunta → *Preparació mòdul en anglès (FP)` i `FEMPO → tutoria no presencial`: la regla mana sobre aquestes entrades.

## Exportació a Untis (`src/services/gpuFormatter.js`)

- `prepararExportUntis(curs, opcions)` llegeix classes i professorat; `generarExportUntis({ classes, professors, referenciaGestibXmlText, … })` genera sense Firestore (es prova al navegador, `tests/visual/untis.spec.js`).
- La matèria de cada línia: `trobarMateriaGestibAmbOverride` (`gestibMapper.js`) fa servir primer `fila.gestib` (`materiaEnllacada`). Sense enllaç, cau al mapeig i a la semblança antiga i ho apunta als pendents («Sense correspondència desada», «Correspondència dubtosa»).
- Les files virtuals de suport i desdoblament divisible hereten l'enllaç de la fila de la quota del mateix curs, grup i matèria (`heretarEnllacGestib`). Les activitats generades (guàrdies, CCP, atenció a famílies, reunions) no en porten.
- L'exportació s'atura si un professor actiu té una plaça que no és a l'XML (`incidenciesCodisProfessorGestib`).
- Fitxers:
  - `GPU002` (lliçons; camps 0 número, 1 hores, 2 hores de grup, 3 hores de professor, 4 grup, 5 professor, 6 matèria);
  - `GPU003` (grups), `GPU004` (professorat), `GPU006` (matèries);
  - `GPU000_REVISIO_EXPORTACIO` (pendents).

## Què no es pot trencar (altres aplicacions)

Guàrdies, Pantalles i Retards llegeixen de Quota:

- `usuaris/{uid}.rol`;
- la llista de cursos;
- `cursos/{curs}/professors` (`nom`, `codiUntis`, `email`);
- `preautoritzats` (Retards: `rols` amb `psc`);
- `cursos/{curs}/guardies/directoriVersion`.

No en canviïs la forma. Les regles de Firestore són a `firestore.rules` (projecte `quota-e1424`).

## Comprovacions abans del canvi de curs

1. `npm run test:domain`, `npm run verify:untis` i `npm run test:visual`.
2. **Assaig amb dades reals** (primavera):
   - pren la còpia de Firestore del Mac (`/home/jose/docker/backups/firestore/quota-e1424/*.ndjson.gz`);
   - extreu-ne `classes`, `professors`, `untis/gestib_xml` i `config/untis_mapeig` del curs;
   - passa `proposarCorrespondencies`;
   - compara `generarExportUntis` sense enllaços i amb enllaços.

   A l'octubre de 2026 totes les diferències van ser correccions:
   - optatives exportades com a «Atenció educativa»;
   - blocs paral·lels amb el mateix codi;
   - un professor amb hores comptades dues vegades.

   Esborra les còpies locals de dades personals en acabar.
3. **Places**: a 2026-27, ALS1 i PAS1 no eren a l'XML i una fitxa no tenia plaça, i l'exportació s'aturava. Revisa-ho a Professorat abans de generar.
