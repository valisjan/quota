export function normalitzarDepartament(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function separarDepartaments(valor) {
  const valors = Array.isArray(valor) ? valor : [valor];
  const resultat = [];
  const vistos = new Set();

  valors
    .flatMap((item) => (item || '').toString().split(','))
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      const clau = normalitzarDepartament(item);
      if (!clau || vistos.has(clau)) return;
      vistos.add(clau);
      resultat.push(item);
    });

  return resultat;
}

export function departamentsClasse(classe = {}) {
  const valors = [
    ...(Array.isArray(classe.departaments) ? classe.departaments : []),
    classe.departament,
  ]
    .map((valor) => (valor || '').toString().trim())
    .filter(Boolean);

  return [...new Set(valors)];
}

export function departamentsProfessor(professor = {}) {
  return separarDepartaments([
    ...(Array.isArray(professor.departaments) ? professor.departaments : [professor.departaments]),
    professor.departament,
  ]);
}

export function departamentPrincipalProfessor(professor = {}) {
  return departamentsProfessor(professor)[0] || '';
}

export function professorPertanyDepartament(professor = {}, departament) {
  const departamentNormalitzat = normalitzarDepartament(departament);
  if (!departamentNormalitzat) return false;

  return departamentsProfessor(professor).some(
    (valor) => normalitzarDepartament(valor) === departamentNormalitzat
  );
}

export function formatDepartamentsProfessor(professor = {}) {
  return departamentsProfessor(professor).join(', ');
}

export function classePertanyDepartament(classe, departament) {
  const departamentNormalitzat = normalitzarDepartament(departament);
  if (!departamentNormalitzat) return false;

  return departamentsClasse(classe).some(
    (valor) => normalitzarDepartament(valor) === departamentNormalitzat
  );
}
