# Pantalles

Aplicació de cartelleria en mode quiosc, separada de la gestió de Guàrdies.

## Adreces locals

- Quiosc: `/labs/pantalles/?pantalla=sala-professorat`
- Gestió: `/labs/pantalles/?gestio=1&pantalla=sala-professorat`

Quan estigui disponible el DNS, el mateix desplegament es podrà associar a
`pantalles.iessureda.com` mantenint l'identificador de pantalla.

## Dades

- `pantalles/{id}` conté la configuració remota del dispositiu.
- `cursos/{cursId}/guardiesPublicDays/{date}` és una projecció mínima de la
  jornada publicada. No exposa XML, recomptes ni configuració interna.

La projecció es crea o actualitza en publicar o modificar una jornada i
s'elimina en despublicar-la o reiniciar les dades del curs.

## Vistes

Cada pantalla pot tenir fins a dotze vistes. La gestió permet crear-les,
ordenar-les, triar-ne els continguts i indicar quant de temps es mostra
cadascuna. El quiosc les alterna automàticament, llevat que des de gestió se
seleccioni una vista concreta.
