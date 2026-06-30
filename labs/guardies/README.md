# Laboratori de guàrdies

Prototip local per validar la gestió diària de guàrdies a partir dels XML d'horaris.

Aquest laboratori no toca Firebase, no modifica la base de dades i no forma part de la navegació de producció.

## Com provar-lo

Obre `index.html` al navegador i carrega aquests dos fitxers:

1. **XML GestIB**: fitxer de referència amb places, grups, matèries, activitats i aules.
2. **XML horari**: fitxer retornat amb estructura:

```xml
<HORARI>
  <SESSIONS>
    <SESSIO placa="..." dia="..." hora="..." curs="..." grup="..." materia="..." activitat="..." aula="..." />
  </SESSIONS>
</HORARI>
```

Els dos XML queden guardats a la memòria local del navegador. Quan tornes a obrir el laboratori al mateix navegador, es carreguen automàticament. El botó **Neteja memòria** elimina aquesta còpia local.

## Què valida

- Lectura del XML de referència de GestIB.
- Traducció de plaça, grup, matèria, activitat i aula a noms llegibles.
- Detecció automàtica de l'activitat de guàrdia general.
- Selecció d'una data i conversió al dia setmanal del XML.
- Selecció del professorat absent.
- Visualització de l'horari d'aquest professor en aquella data.
- Marcatge de les sessions concretes que falten.
- Cerca del professorat que té guàrdia a la mateixa franja.
- Assignació provisional de cobertura en memòria.

## Què no fa encara

- No guarda absències ni assignacions definitives.
- No aplica regles de prioritat.
- No genera historial.
