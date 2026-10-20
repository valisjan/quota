// Rols del full «Professorat». «professor» és la base de tothom; la resta hi sumen
// drets. Una cel·la en pot tenir diversos separats per comes, amb espais o sense:
// «cap_departament, PSC», «admin,psc».

// Rols que entén Quota, de més a menys drets.
export const ROLS_QUOTA = ['admin', 'cap_departament', 'departament', 'professor'];
// Rols d'altres aplicacions (Retards). A Quota i Guàrdies compten com a professor.
export const ROLS_ALTRES_APPS = ['psc'];

const CONEGUTS = new Set([...ROLS_QUOTA, ...ROLS_ALTRES_APPS]);

function normalitzarRol(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
}

// Retorna els rols reconeguts (sense repetir, en l'ordre del full) i els que no ho són.
export function llegirRols(raw) {
  const rols = [];
  const desconeguts = [];
  String(raw || '').split(/[,;]/).map(normalitzarRol).filter(Boolean).forEach((rol) => {
    const llista = CONEGUTS.has(rol) ? rols : desconeguts;
    if (!llista.includes(rol)) llista.push(rol);
  });
  return { rols, desconeguts };
}

// Rol efectiu a Quota: el de més drets entre els de Quota; si no n'hi ha cap, professor.
export function rolQuota(rols = []) {
  return ROLS_QUOTA.find((rol) => rols.includes(rol)) || 'professor';
}
