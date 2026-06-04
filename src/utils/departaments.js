export function normalitzarDepartament(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

export function classePertanyDepartament(classe, departament) {
  const departamentNormalitzat = normalitzarDepartament(departament);
  if (!departamentNormalitzat) return false;

  return departamentsClasse(classe).some(
    (valor) => normalitzarDepartament(valor) === departamentNormalitzat
  );
}

