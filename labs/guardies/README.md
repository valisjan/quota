# Gestió de guàrdies

Aplicació integrada amb Quota per preparar les absències diàries, les cobertures i les guàrdies de convivència.

## Fitxers

A l'apartat **Arxius de configuració** es carreguen, en aquest ordre:

1. **XML GestIB**: places, grups, matèries, activitats i aules.
2. **GPU004.TXT**: codis i noms del professorat d'Untis.
3. **GPU001.TXT**: horari complet, classes, grups, activitats i guàrdies.

No cal carregar l'XML complet d'Untis: GPU001 conté les mateixes sessions en un fitxer molt més lleuger. Els noms complets del professorat continuen provenint de GPU004.

Els fitxers i la configuració setmanal queden guardats a Firestore dins el curs acadèmic actiu. Es carreguen automàticament des de qualsevol navegador amb una sessió vàlida de Quota. Un usuari administrador pot substituir o eliminar cada fitxer des del mateix assistent.

## Què valida

- Lectura del XML de referència de GestIB.
- Traducció de plaça, grup, matèria, activitat i aula a noms llegibles.
- Detecció automàtica de l'activitat de guàrdia general.
- Selecció d'una data i conversió al dia setmanal del XML.
- Cerca interactiva del professorat absent.
- Visualització vertical de l'horari del professor seleccionat.
- Marcatge de les sessions concretes que falten.
- Acció ràpida per afegir tot el dia i replicació en un interval de dies lectius.
- Llistat diari amb les hores apilades per anar afegint absències.
- Comentari per cada absència.
- Candidats jerarquitzats per origen i menor nombre de cobertures anuals.
- Cerca del professorat que té guàrdia a la mateixa franja.
- Sortides completes o parcials, amb selecció dels acompanyants.
- Detecció del professorat que queda alliberat perquè tenia classe amb aquests grups.
- Ús del professorat alliberat com a candidat de cobertura a la mateixa franja.
- Autoguardat, publicació, actualització i tancament de la jornada.
- Implicació automàtica dels acompanyants en totes les seves classes i guàrdies.
- Impressió A4 amb set sessions i pati.
- Rotació setmanal de zones de pati, festius i canvis de zona per a una data concreta.
- Còmput anual de cobertures efectivament realitzades, separat entre professorat alliberat, G i assignacions extraordinàries.

## Fases posteriors

- Correu automàtic a les 08:00.
- Altres tasques especials configurables.
