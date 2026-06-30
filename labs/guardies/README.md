# Laboratori de guàrdies

Prototip local per validar la gestió diària de guàrdies a partir d'un XML d'horaris.

Aquest laboratori no toca Firebase, no modifica la base de dades i no forma part de la navegació de producció.

## Com provar-lo

Obre `index.html` al navegador i carrega un XML amb estructura:

```xml
<HORARI>
  <SESSIONS>
    <SESSIO placa="..." dia="..." hora="..." curs="..." grup="..." materia="..." activitat="..." aula="..." />
  </SESSIONS>
</HORARI>
```

## Què valida

- Lectura de sessions del XML.
- Agrupació per professor, dia i hora.
- Selecció de codis d'activitat que equivalen a guàrdia.
- Marcatge de professorat absent.
- Sessions que queden descobertes.
- Assignació provisional de cobertura en memòria.

## Què no fa encara

- No guarda dades.
- No tradueix automàticament els codis de professor, grup, matèria o activitat.
- No aplica regles definitives de prioritat.
- No genera historial.
