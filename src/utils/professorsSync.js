// Decideix què fer amb cada professor del full «Professorat» a la sincronització.
// El codi Untis és la plaça: titular i substitut el poden compartir. Cada professor
// s'identifica pel nom, i el seu document es conserva encara que li canviï el codi.

const normalitzarNom = (s) => (s || '').toString().toLowerCase().trim();

// Un guió al codi («-») vol dir que la persona no té plaça pròpia ara mateix. Si a més ja
// té document i una persona nova porta la seva plaça, és un titular de baixa.
export const esGuio = (valor) => /^[-–—]+$/.test(String(valor || '').trim());

function titularsDeBaixa(existents, professors) {
  const perNom = new Map(existents.map((item) => [normalitzarNom(item.nom), item]));
  const baixes = new Map();
  professors.forEach((professor) => {
    if (!professor.senseCodi) return;
    const document = perNom.get(normalitzarNom(professor.nom));
    if (!document?.codiUntis) return;
    const reclamada = professors.some((altre) => (
      altre !== professor
      && !altre.senseCodi
      && altre.codiUntis === document.codiUntis
      && !perNom.has(normalitzarNom(altre.nom))
    ));
    if (reclamada) baixes.set(professor, { docId: document.id, codiUntis: document.codiUntis });
  });
  return baixes;
}

// existents: [{ id, nom, codiUntis }] (documents actuals). professors: files del full.
// Retorna { actualitzar: [{ id, professor, ocupaPlaca }], crear: [{ id, professor }], eliminar: [id],
//           titularsDeBaixa: [{ professor, docId, codiUntis, substitut }] }.
// - Un professor que ja existeix (pel nom) conserva el seu document.
// - Un professor nou ocupa el document de la seva plaça si qui el tenia ja no és al full
//   (p. ex. la vacant «MAT4» quan arriba la persona) o n'és un titular de baixa: n'hereta
//   la planificació (i la sincronització li passa les classes).
// - Si la plaça encara és d'algú actiu al full (titular amb substitut), es crea un document nou.
//   A «crear», id és el codi si encara és lliure o null (identificador automàtic).
export function planificarProfessors(existents, professors) {
  const baixes = titularsDeBaixa(existents, professors);
  const actius = professors.filter((professor) => !baixes.has(professor));
  const nomsFull = new Set(actius.map((professor) => normalitzarNom(professor.nom)));
  const perNom = new Map(existents.map((item) => [normalitzarNom(item.nom), item.id]));
  const idsOcupats = new Set(existents.map((item) => item.id));
  const placesLliures = existents.filter((item) => !nomsFull.has(normalitzarNom(item.nom)));
  const ocupats = new Set();
  const actualitzar = [];
  const crear = [];

  actius.forEach((professor) => {
    const id = perNom.get(normalitzarNom(professor.nom));
    if (id && !ocupats.has(id)) {
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
  const resultatBaixes = [...baixes].map(([professor, baixa]) => ({
    professor,
    ...baixa,
    substitut: actualitzar.find((item) => item.id === baixa.docId && item.ocupaPlaca)?.professor || null,
  }));
  return { actualitzar, crear, eliminar, titularsDeBaixa: resultatBaixes };
}
