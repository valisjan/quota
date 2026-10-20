// Decideix què fer amb cada professor del full «Professorat» a la sincronització.
// El codi Untis és la plaça: titular i substitut el poden compartir. Cada professor
// s'identifica pel nom, i el seu document es conserva encara que li canviï el codi.

const normalitzarNom = (s) => (s || '').toString().toLowerCase().trim();

// existents: [{ id, nom, codiUntis }] (documents actuals). professors: files del full.
// Retorna { actualitzar: [{ id, professor, ocupaPlaca }], crear: [{ id, professor }], eliminar: [id] }.
// - Un professor que ja existeix (pel nom) conserva el seu document.
// - Un professor nou ocupa el document de la seva plaça si qui el tenia ja no és al full
//   (p. ex. la vacant «MAT4» quan arriba la persona): n'hereta preferències i assignacions.
// - Si la plaça encara és d'algú del full (titular amb substitut), es crea un document nou.
//   A «crear», id és el codi si encara és lliure o null (identificador automàtic).
export function planificarProfessors(existents, professors) {
  const nomsFull = new Set(professors.map((professor) => normalitzarNom(professor.nom)));
  const perNom = new Map(existents.map((item) => [normalitzarNom(item.nom), item.id]));
  const idsOcupats = new Set(existents.map((item) => item.id));
  const placesLliures = existents.filter((item) => !nomsFull.has(normalitzarNom(item.nom)));
  const ocupats = new Set();
  const actualitzar = [];
  const crear = [];

  professors.forEach((professor) => {
    const id = perNom.get(normalitzarNom(professor.nom));
    if (id) {
      actualitzar.push({ id, professor, ocupaPlaca: false });
      return;
    }
    const codi = professor.codiUntis;
    const placa = codi && (
      placesLliures.find((item) => item.id === codi && !ocupats.has(item.id))
      || placesLliures.find((item) => item.codiUntis === codi && !ocupats.has(item.id))
    );
    if (placa) {
      ocupats.add(placa.id);
      actualitzar.push({ id: placa.id, professor, ocupaPlaca: true });
      return;
    }
    const idNou = codi && !idsOcupats.has(codi) ? codi : null;
    if (idNou) idsOcupats.add(idNou);
    crear.push({ id: idNou, professor });
  });

  const eliminar = placesLliures.filter((item) => !ocupats.has(item.id)).map((item) => item.id);
  return { actualitzar, crear, eliminar };
}
