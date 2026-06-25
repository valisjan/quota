import { departamentPrincipalProfessor, departamentsProfessor } from './departaments';

export function normalitzarSDAssignacions(assignacions = [], legacyCount = 0) {
  const llista = Array.isArray(assignacions) ? assignacions : [];
  const normalitzades = llista
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `sd-${index}`,
          grup: item,
          curs: '',
          materia: '',
          departament: '',
        };
      }
      if (!item || typeof item !== 'object') return null;
      return {
        id: item.id || `sd-${index}`,
        grup: (item.grup || item.grupObjectiu || item.destinacio || '').toString().trim(),
        curs: (item.curs || '').toString().trim(),
        materia: (item.materia || '').toString().trim(),
        departament: (item.departament || '').toString().trim(),
      };
    })
    .filter(Boolean);

  const totalLegacy = Math.max(0, Number(legacyCount) || 0);
  for (let index = normalitzades.length; index < totalLegacy; index++) {
    normalitzades.push({
      id: `sd-legacy-${index}`,
      grup: '',
      curs: '',
      materia: '',
      departament: '',
    });
  }

  return normalitzades;
}

export function sdAssignacionsProfessor(professor = {}, departament = '') {
  const assignacions = normalitzarSDAssignacions(
    professor.sdAssignacions,
    professor.sdAssignades
  );

  const departamentNormalitzat = normalitzarClau(departament);
  if (!departamentNormalitzat) return assignacions;

  const principal = departamentPrincipalProfessor(professor);
  return assignacions.filter((assignacio) => {
    const departamentAssignacio = assignacio.departament || principal;
    return normalitzarClau(departamentAssignacio) === departamentNormalitzat;
  });
}

export function comptarSDAssignacions(professor = {}, departament = '') {
  return sdAssignacionsProfessor(professor, departament).length;
}

export function crearSDAssignacio(grup = '', departament = '') {
  return {
    id: `sd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    grup: (grup || '').toString().trim(),
    curs: '',
    materia: '',
    departament: (departament || '').toString().trim(),
  };
}

export function normalitzarDDAssignacions(assignacions = [], legacyCount = 0) {
  const llista = Array.isArray(assignacions) ? assignacions : [];
  const normalitzades = llista
    .map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: `dd-${index}`,
          grup: item,
          curs: '',
          materia: '',
          departament: '',
        };
      }
      if (!item || typeof item !== 'object') return null;
      return {
        id: item.id || `dd-${index}`,
        grup: (item.grup || item.grupObjectiu || item.destinacio || '').toString().trim(),
        curs: (item.curs || '').toString().trim(),
        materia: (item.materia || '').toString().trim(),
        departament: (item.departament || '').toString().trim(),
      };
    })
    .filter(Boolean);

  const totalLegacy = Math.max(0, Number(legacyCount) || 0);
  for (let index = normalitzades.length; index < totalLegacy; index++) {
    normalitzades.push({
      id: `dd-legacy-${index}`,
      grup: '',
      curs: '',
      materia: '',
      departament: '',
    });
  }

  return normalitzades;
}

export function ddAssignacionsProfessor(professor = {}, departament = '') {
  const assignacions = normalitzarDDAssignacions(
    professor.ddAssignacions,
    professor.ddAssignades
  );

  const departamentNormalitzat = normalitzarClau(departament);
  if (!departamentNormalitzat) return assignacions;

  const principal = departamentPrincipalProfessor(professor);
  return assignacions.filter((assignacio) => {
    const departamentAssignacio = assignacio.departament || principal;
    return normalitzarClau(departamentAssignacio) === departamentNormalitzat;
  });
}

export function comptarDDAssignacions(professor = {}, departament = '') {
  return ddAssignacionsProfessor(professor, departament).length;
}

export function crearDDAssignacio(grup = '', departament = '') {
  return {
    id: `dd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    grup: (grup || '').toString().trim(),
    curs: '',
    materia: '',
    departament: (departament || '').toString().trim(),
  };
}

function senseAccents(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalitzarClau(valor) {
  return senseAccents(valor).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function variantsCurs(curs) {
  const normal = normalitzarClau(curs);
  const variants = new Set([normal]);

  const eso = normal.match(/^([1-4])(?:R|N|T)?ESO/);
  if (eso) {
    variants.add(`${eso[1]}ESO`);
    variants.add(`${eso[1]}E`);
  }

  const batx = normal.match(/^([12])(?:R|N)?B(?:AT|ATX|ACH|TX)?/);
  if (batx) {
    variants.add(`${batx[1]}BAT`);
    variants.add(`${batx[1]}B`);
  }

  return [...variants].filter(Boolean);
}

function grupsClasse(classe = {}) {
  return (classe.grup || '')
    .toString()
    .split('+')
    .map((grup) => grup.trim())
    .filter(Boolean);
}

function etiquetesGrupClasse(classe = {}) {
  const curs = (classe.curs || '').toString().trim();
  if (!curs) return [];
  return grupsClasse(classe).map((grup) => ({ curs, grup, label: `${curs} ${grup}` }));
}

function opcionsGrup(classes = []) {
  const perClau = new Map();
  classes.flatMap(etiquetesGrupClasse).forEach((opcio) => {
    const variants = variantsCurs(opcio.curs).flatMap((cursVariant) => [
      `${cursVariant}${normalitzarClau(opcio.grup)}`,
      normalitzarClau(`${cursVariant} ${opcio.grup}`),
      normalitzarClau(`${cursVariant}-${opcio.grup}`),
    ]);
    variants.forEach((variant) => {
      if (variant && !perClau.has(variant)) perClau.set(variant, opcio);
    });
  });
  return perClau;
}

export function resoldreGrupSDAssignacio(assignacio = {}, classes = []) {
  const cursDirecte = (assignacio.curs || '').toString().trim();
  const grupDirecte = (assignacio.grupCodi || '').toString().trim();
  if (cursDirecte && grupDirecte) {
    return { curs: cursDirecte, grup: grupDirecte, label: `${cursDirecte} ${grupDirecte}` };
  }

  const valor = (assignacio.grup || '').toString().trim();
  if (!valor) return null;

  const resoltes = opcionsGrup(classes);
  const directa = resoltes.get(normalitzarClau(valor));
  if (directa) return directa;

  const net = valor.replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();
  const parts = net.split(' ');
  if (parts.length >= 2) {
    const grup = parts.at(-1);
    const curs = parts.slice(0, -1).join(' ');
    return { curs, grup, label: `${curs} ${grup}` };
  }

  return null;
}

function departamentsClasse(classe = {}) {
  return [
    ...(Array.isArray(classe.departaments) ? classe.departaments : []),
    classe.departament,
  ]
    .map((valor) => (valor || '').toString().trim())
    .filter(Boolean);
}

function mateixDepartament(classe, departament) {
  const dep = normalitzarClau(departament);
  if (!dep) return false;
  return departamentsClasse(classe).some((valor) => normalitzarClau(valor) === dep);
}

function esSD(classe = {}) {
  return normalitzarClau(classe.tipus) === 'SD';
}

function esDD(classe = {}) {
  return normalitzarClau(classe.tipus) === 'DD';
}

function materiaGenericaSD(materia) {
  const normal = normalitzarClau(materia);
  return !normal || normal === 'SD' || normal.includes('SUPORTDIVISIBLE');
}

function materiaGenericaDD(materia) {
  const normal = normalitzarClau(materia);
  return !normal || normal === 'DD' || normal.includes('DESDOBLAMENTDIVISIBLE');
}

function materiaPerSuport({ assignacio, professor, grupResol, classes, poolMateria }) {
  if (assignacio.materia) return assignacio.materia;
  const departamentAssignacio = assignacio.departament || departamentPrincipalProfessor(professor);

  const mateixaMateria = classes
    .filter((classe) =>
      !esSD(classe) &&
      !esDD(classe) &&
      classe.materia &&
      mateixDepartament(classe, departamentAssignacio) &&
      normalitzarClau(classe.curs) === normalitzarClau(grupResol.curs) &&
      grupsClasse(classe).some((grup) => normalitzarClau(grup) === normalitzarClau(grupResol.grup))
    )
    .sort((a, b) => {
      const aStar = (a.materia || '').toString().trim().startsWith('*') ? 1 : 0;
      const bStar = (b.materia || '').toString().trim().startsWith('*') ? 1 : 0;
      if (aStar !== bStar) return aStar - bStar;
      return (a.materia || '').localeCompare(b.materia || '', 'ca');
    })[0];

  if (mateixaMateria?.materia) return mateixaMateria.materia;
  if (!materiaGenericaSD(poolMateria)) return poolMateria;
  return departamentAssignacio || 'Suport';
}

function materiaPerDesdoblament({ assignacio, professor, grupResol, classes, poolMateria }) {
  if (assignacio.materia) return assignacio.materia;
  const departamentAssignacio = assignacio.departament || departamentPrincipalProfessor(professor);

  const mateixaMateria = classes
    .filter((classe) =>
      !esSD(classe) &&
      !esDD(classe) &&
      classe.materia &&
      mateixDepartament(classe, departamentAssignacio) &&
      normalitzarClau(classe.curs) === normalitzarClau(grupResol.curs) &&
      grupsClasse(classe).some((grup) => normalitzarClau(grup) === normalitzarClau(grupResol.grup))
    )
    .sort((a, b) => {
      const aStar = (a.materia || '').toString().trim().startsWith('*') ? 1 : 0;
      const bStar = (b.materia || '').toString().trim().startsWith('*') ? 1 : 0;
      if (aStar !== bStar) return aStar - bStar;
      return (a.materia || '').localeCompare(b.materia || '', 'ca');
    })[0];

  if (mateixaMateria?.materia) return mateixaMateria.materia;
  if (!materiaGenericaDD(poolMateria)) return poolMateria;
  return departamentAssignacio || 'Desdoblament';
}

function poolMateriesSD(professor, classes, departament) {
  const pool = [];
  const departamentPool = departament || departamentPrincipalProfessor(professor);
  classes
    .filter((classe) => esSD(classe) && mateixDepartament(classe, departamentPool))
    .forEach((classe) => {
      const hores = Math.max(1, Number(classe.hores) || 0);
      for (let index = 0; index < hores; index += 1) {
        pool.push(classe.materia || '');
      }
    });
  return pool;
}

function poolMateriesDD(professor, classes, departament) {
  const pool = [];
  const departamentPool = departament || departamentPrincipalProfessor(professor);
  classes
    .filter((classe) => esDD(classe) && mateixDepartament(classe, departamentPool))
    .forEach((classe) => {
      const hores = Math.max(1, Number(classe.hores) || 0);
      for (let index = 0; index < hores; index += 1) {
        pool.push(classe.materia || '');
      }
    });
  return pool;
}

export function crearClassesSuportDivisible(professors = [], classes = []) {
  const agrupades = new Map();

  professors
    .filter((professor) => professor?.nom && !professor.eliminatDelFull)
    .forEach((professor) => {
      const assignacions = normalitzarSDAssignacions(
        professor.sdAssignacions,
        professor.sdAssignades
      );

      assignacions.forEach((assignacio, index) => {
        const grupResol = resoldreGrupSDAssignacio(assignacio, classes);
        if (!grupResol?.curs || !grupResol?.grup) return;
        const departamentAssignacio =
          assignacio.departament ||
          departamentPrincipalProfessor(professor) ||
          departamentsProfessor(professor)[0] ||
          '';
        const pool = poolMateriesSD(professor, classes, departamentAssignacio);

        const materia = materiaPerSuport({
          assignacio,
          professor,
          grupResol,
          classes,
          poolMateria: pool[index] || pool[0] || '',
        });
        const key = [
          professor.nom,
          normalitzarClau(grupResol.curs),
          normalitzarClau(grupResol.grup),
          normalitzarClau(materia),
        ].join('|');

        const existent = agrupades.get(key);
        if (existent) {
          existent.hores += 1;
          existent._sdAssignacions.push(assignacio.id || `sd-${index}`);
          return;
        }

        agrupades.set(key, {
          id: `sd-${professor.id || normalitzarClau(professor.nom)}-${normalitzarClau(grupResol.curs)}-${normalitzarClau(grupResol.grup)}-${normalitzarClau(materia)}`,
          curs: grupResol.curs,
          grup: grupResol.grup,
          materia,
          hores: 1,
          departament: departamentAssignacio,
          departaments: departamentAssignacio ? [departamentAssignacio] : [],
          tipus: 'SD',
          professorAssignat: professor.nom,
          professors: [professor.nom],
          _virtualSuportDivisible: true,
          _sdAssignacions: [assignacio.id || `sd-${index}`],
        });
      });
    });

  return [...agrupades.values()];
}

export function crearClassesDesdoblamentDivisible(professors = [], classes = []) {
  const agrupades = new Map();

  professors
    .filter((professor) => professor?.nom && !professor.eliminatDelFull)
    .forEach((professor) => {
      const assignacions = normalitzarDDAssignacions(
        professor.ddAssignacions,
        professor.ddAssignades
      );

      assignacions.forEach((assignacio, index) => {
        const grupResol = resoldreGrupSDAssignacio(assignacio, classes);
        if (!grupResol?.curs || !grupResol?.grup) return;
        const departamentAssignacio =
          assignacio.departament ||
          departamentPrincipalProfessor(professor) ||
          departamentsProfessor(professor)[0] ||
          '';
        const pool = poolMateriesDD(professor, classes, departamentAssignacio);

        const materia = materiaPerDesdoblament({
          assignacio,
          professor,
          grupResol,
          classes,
          poolMateria: pool[index] || pool[0] || '',
        });
        const key = [
          professor.nom,
          normalitzarClau(grupResol.curs),
          normalitzarClau(grupResol.grup),
          normalitzarClau(materia),
        ].join('|');

        const existent = agrupades.get(key);
        if (existent) {
          existent.hores += 1;
          existent._ddAssignacions.push(assignacio.id || `dd-${index}`);
          return;
        }

        agrupades.set(key, {
          id: `dd-${professor.id || normalitzarClau(professor.nom)}-${normalitzarClau(grupResol.curs)}-${normalitzarClau(grupResol.grup)}-${normalitzarClau(materia)}`,
          curs: grupResol.curs,
          grup: grupResol.grup,
          materia,
          hores: 1,
          departament: departamentAssignacio,
          departaments: departamentAssignacio ? [departamentAssignacio] : [],
          tipus: 'DD',
          professorAssignat: professor.nom,
          professors: [professor.nom],
          _virtualDesdoblamentDivisible: true,
          _ddAssignacions: [assignacio.id || `dd-${index}`],
        });
      });
    });

  return [...agrupades.values()];
}
