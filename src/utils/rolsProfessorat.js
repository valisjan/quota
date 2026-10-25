// Rols del professorat. «professor» és la base de tothom; la resta hi sumen drets. Un
// text en pot tenir diversos separats per comes, amb espais o sense: «cap_departament, PSC».

// Rols que entén Quota, de més a menys drets.
export const ROLS_QUOTA = ['admin', 'cap_departament', 'professor'];
// El «compte de departament» feia el mateix que cap de departament: s'hi ha fusionat.
const SINONIMS = { departament: 'cap_departament' };
// Rols d'altres aplicacions (Retards). A Quota i Guàrdies compten com a professor.
export const ROLS_ALTRES_APPS = ['psc'];

const CONEGUTS = new Set([...ROLS_QUOTA, ...ROLS_ALTRES_APPS]);

function normalitzarRol(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

// Retorna els rols reconeguts (sense repetir, en l'ordre escrit) i els que no ho són.
export function llegirRols(raw) {
  const rols = [];
  const desconeguts = [];
  String(raw || '').split(/[,;]/).map(normalitzarRol).filter(Boolean).map((rol) => SINONIMS[rol] || rol).forEach((rol) => {
    const llista = CONEGUTS.has(rol) ? rols : desconeguts;
    if (!llista.includes(rol)) llista.push(rol);
  });
  return { rols, desconeguts };
}

// Rol efectiu a Quota: el de més drets entre els de Quota; si no n'hi ha cap, professor.
export function rolQuota(rols = []) {
  return ROLS_QUOTA.find((rol) => rols.includes(rol)) || 'professor';
}
