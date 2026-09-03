# Domini de Guàrdies

Aquest document fixa el contracte funcional que ha de sobreviure a la refactorització. La interfície, Firebase i els parsers són adaptadors; no defineixen les regles de negoci.

## Límits del domini

`Guàrdies` comparteix projecte Firebase, autenticació, usuaris i cursos amb Quota, però té col·leccions, permisos, serveis i estat propis. Els fitxers originals van a Firebase Storage. Firestore conserva metadades, revisions normalitzades i l'operativa diària.

Els fitxers de configuració es poden substituir per curs; cada jornada conserva el seu estat operatiu i una revisió per evitar sobreescriptures concurrents.

## Vocabulari

- **Franja (`slot`)**: dia lectiu 1–5 i període estable de l'horari. L'hora visible és una etiqueta, no la identitat.
- **Bloc lectiu**: sessions simultànies d'un professor que formen una sola unitat substituïble.
- **Absència**: indisponibilitat d'un professor en un bloc i una data.
- **Cobertura**: professor assignat a una absència. Només n'hi pot haver una d'activa per absència.
- **Guàrdia**: activitat que converteix un professor en candidat de cobertura.
- **Convivència**: guàrdia setmanal especial. Hi ha com a màxim un responsable configurat per franja.
- **Sortida**: grup complet o parcial fora del centre, amb un o més acompanyants i un interval de dates.
- **Professor alliberat**: professor sense bloc lectiu efectiu perquè tots els grups del bloc són fora i no acompanya la sortida.
- **Pati**: franja informativa entre la tercera i la quarta sessió; una absència GP no es cobreix en aquesta fase.

## Invariants

1. Tota dada pertany a un `courseId`; no hi ha estat operatiu global.
2. Una jornada usa una sola `scheduleRevisionId`.
3. La identitat d'una absència és determinista: data, professor, franja i bloc lectiu.
4. Marcar dues sessions del mateix bloc no crea dues absències.
5. Un professor no es pot cobrir a si mateix ni cobrir mentre consta absent a la mateixa franja.
6. El candidat procedeix exclusivament de guàrdia ordinària, alliberament o convivència excepcional.
7. Un bloc compartit només queda alliberat si tots els seus grups són fora.
8. Cancel·lar una absència cancel·la la seva cobertura activa.
9. Una jornada tancada no admet canvis ordinaris. Reobrir-la deixa rastre d'auditoria.
10. Les escriptures operatives incrementen `revision` dins una transacció; un client obsolet no pot sobreescriure canvis nous.
11. La jornada conserva les dates de publicació, darrera actualització i tancament; no es manté un historial complet de canvis.
12. A una mateixa franja, un professor només pot tenir una cobertura; a franges diferents es pot tornar a assignar.
13. Els candidats s'ordenen: alliberats, guàrdia ordinària i convivència; dins cada grup, menor recompte anual i ordre alfabètic.
14. Només les cobertures no anul·lades es compten en tancar la jornada. Reobrir i tancar aplica només el delta.
15. Una sortida parcial no allibera professorat, però els acompanyants continuen generant absències.

## Estats de jornada

```text
draft <-> published <-> closed
```

- `draft`: preparació interna.
- `published`: full vigent que pot continuar actualitzant-se.
- `closed`: jornada finalitzada, només reobrible per un rol autoritzat.

## Persistència implementada

```text
cursos/{courseId}
├─ guardies/{reference|untis|duties|schedule}
├─ guardies/convivencia
├─ guardies/stats
└─ guardiesDays/{yyyy-mm-dd}
```

Storage:

```text
guardies/{courseId}/imports/{kind}/{filename}
```

`kind` és `reference`, `untis`, `schedule` o `duties`. GPU001 deixa de formar part del bundle de l'aplicació.

## Autorització

- Usuari sense rol: cap lectura del domini.
- Professor: lectura de jornades publicades.
- Cap de departament/departament: lectura de jornades publicades o tancades.
- Administrador: imports, configuració, preparació, publicació, actualització, tancament i reobertura.

## Fora de la primera fase

- Correu automàtic de les 08:00.
- Rotació setmanal de zones de pati.
- Tasques especials genèriques diferents de convivència.
