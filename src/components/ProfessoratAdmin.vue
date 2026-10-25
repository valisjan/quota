<template>
  <div class="sections space-y-4">
    <!-- Capçalera -->
    <section class="card p-5 dark:border-slate-700 dark:bg-gray-800">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-xl font-bold text-slate-950 dark:text-white">
            Fitxes del curs {{ cursStore.cursActiu?.nom || cursStore.cursActiuId }}
          </h3>
          <p class="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Departaments, jornada, plaça (codi Untis), correu i rols de cada professor/a.
            Els canvis arriben a Quota, a Guàrdies i als permisos d'accés.
          </p>
        </div>
        <button
          v-if="editable"
          type="button"
          data-testid="nou-professor"
          class="shrink-0 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark"
          @click="obrirNou"
        >
          + Nou professor/a
        </button>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div v-for="item in resum" :key="item.label" class="rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
          <div class="text-2xl font-semibold text-slate-950 dark:text-white">{{ item.valor }}</div>
          <div class="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{{ item.label }}</div>
        </div>
      </div>
    </section>

    <!-- Curs sense professorat -->
    <section v-if="carregat && !professors.length" class="card p-5 dark:border-slate-700 dark:bg-gray-800">
      <p class="font-semibold text-slate-900 dark:text-white">Aquest curs encara no té professorat.</p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Copia el professorat actiu d'un altre curs (sense la planificació, que és de cada curs) i a partir d'aquí gestiona'l des d'aquesta pàgina.
      </p>
      <div class="mt-3 flex flex-wrap items-end gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-200">
          Curs d'origen
          <select v-model="cursOrigen" class="form-input mt-1 block">
            <option v-for="curs in cursosOrigen" :key="curs.id" :value="curs.id">{{ curs.nom || curs.id }}</option>
          </select>
        </label>
        <button
          type="button"
          :disabled="!cursOrigen || desant"
          class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          @click="copiarCurs"
        >
          {{ desant ? 'Copiant...' : 'Copia el professorat' }}
        </button>
      </div>
    </section>

    <!-- Curs no vigent -->
    <p
      v-if="editable && !cursVigent"
      class="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
    >
      Aquest no és el curs vigent: els canvis no modifiquen qui pot entrar a les aplicacions fins que ho sigui.
    </p>

    <!-- Possibles errors -->
    <section
      v-if="riscosCritics.length || avisosLlista.length"
      class="rounded-lg border p-4"
      :class="riscosCritics.length
        ? 'border-rose-200 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/30'
        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-gray-800'"
    >
      <p class="font-semibold" :class="riscosCritics.length ? 'text-rose-900 dark:text-rose-200' : 'text-slate-800 dark:text-slate-200'">
        {{ riscosCritics.length ? `${riscosCritics.length} ${riscosCritics.length === 1 ? 'error per revisar' : 'errors per revisar'}` : 'Avisos' }}
      </p>
      <ul class="mt-2 space-y-1 text-sm">
        <li v-for="(risc, index) in [...riscosCritics, ...avisosLlista]" :key="`${risc.tipus}-${index}`" class="flex gap-2">
          <span
            class="mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-bold uppercase"
            :class="risc.severitat === 'critic' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'"
          >{{ risc.severitat === 'critic' ? 'Error' : 'Avís' }}</span>
          <span class="text-slate-800 dark:text-slate-200"><strong>{{ risc.resum }}</strong> — {{ risc.detall }}</span>
        </li>
      </ul>
    </section>

    <!-- Permisos d'accés desquadrats -->
    <section
      v-if="permisosPendents"
      class="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100"
    >
      <span>
        Els permisos d'accés no coincideixen amb aquesta llista:
        <strong>{{ planPermisosViu.escriure.length }}</strong> per crear o actualitzar,
        <strong>{{ planPermisosViu.esborrar.length }}</strong> per treure i
        <strong>{{ planUsuarisViu.length }}</strong> {{ planUsuarisViu.length === 1 ? 'compte' : 'comptes' }} amb el rol desfasat.
      </span>
      <button type="button" class="shrink-0 rounded-md border border-amber-400 bg-white px-3 py-1.5 font-semibold text-amber-900 hover:bg-amber-100" @click="revisarPermisosAra">
        Revisa'ls
      </button>
    </section>

    <!-- Comptes sense fitxa (abans, la pàgina «Usuaris») -->
    <section
      v-if="editable && (adminsSenseFitxa.length || entradesSenseFitxa.length)"
      class="card p-4 dark:border-slate-700 dark:bg-gray-800"
      data-testid="comptes-sense-fitxa"
    >
      <p class="font-semibold text-slate-900 dark:text-white">Comptes sense fitxa</p>
      <p class="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
        Qui entra a les aplicacions amb un compte que no és de cap professor/a actiu d'aquesta llista.
        Els rols del professorat es donen a la seva fitxa.
      </p>
      <ul class="mt-3 divide-y divide-slate-100 text-sm dark:divide-slate-700">
        <li v-for="compte in adminsSenseFitxa" :key="compte.id" class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span class="min-w-0">
            <span class="font-semibold text-slate-900 dark:text-white">{{ compte.nom || compte.email }}</span>
            <span class="ml-1 text-slate-500">{{ compte.email }}</span>
            <span class="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-800">Administració afegida a mà</span>
          </span>
          <button
            v-if="compte.email !== authStore.email"
            type="button"
            class="boto-fila"
            :disabled="desant"
            @click="canviarAcces(compte, false)"
          >Treu l'accés</button>
          <span v-else class="text-xs text-slate-500">Ets tu</span>
        </li>
        <li v-for="compte in entradesSenseFitxa" :key="compte.id" class="flex flex-wrap items-center justify-between gap-2 py-2">
          <span class="min-w-0">
            <span class="font-semibold text-slate-900 dark:text-white">{{ compte.nom || compte.email }}</span>
            <span class="ml-1 text-slate-500">{{ compte.email }}</span>
            <span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-800">Sense accés · {{ formatData(compte.darreraEntrada) }}</span>
          </span>
          <span class="flex gap-2">
            <button type="button" class="boto-fila" @click="obrirNouDe(compte)">Crea'n la fitxa</button>
            <button type="button" class="boto-fila" :disabled="desant" @click="canviarAcces(compte, true)">Fes-lo administrador</button>
          </span>
        </li>
      </ul>
    </section>

    <!-- Filtres -->
    <section class="card p-4 dark:border-slate-700 dark:bg-gray-800">
      <div class="flex flex-wrap items-center gap-1">
        <button
          v-for="opcio in [{ id: 'actius', label: `Actius (${actius.length})` }, { id: 'anteriors', label: `Anteriors (${anteriors.length})` }]"
          :key="opcio.id"
          type="button"
          class="rounded-md px-4 py-2 text-sm font-semibold transition"
          :class="vista === opcio.id
            ? 'bg-primary text-white dark:bg-primary-dark'
            : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-gray-700'"
          @click="vista = opcio.id"
        >
          {{ opcio.label }}
        </button>
      </div>
      <div class="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
        <label class="block text-sm font-medium text-slate-700 lg:col-span-2 dark:text-slate-200">
          Cerca
          <input v-model="filtres.text" type="search" class="form-input mt-1 w-full" placeholder="Nom, correu, codi o comentari" />
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Departament
          <select v-model="filtres.departament" class="form-input mt-1 w-full">
            <option value="">Tots</option>
            <option v-for="dep in departamentsDisponibles" :key="dep" :value="dep">{{ dep }}</option>
          </select>
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Rol
          <select v-model="filtres.rol" class="form-input mt-1 w-full">
            <option value="">Tots</option>
            <option value="professor">Només professor/a</option>
            <option v-for="rol in ROLS_FITXA" :key="rol.valor" :value="rol.valor">{{ rol.etiqueta }}</option>
          </select>
        </label>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
          Jornada
          <select v-model="filtres.jornada" class="form-input mt-1 w-full">
            <option value="*">Totes</option>
            <option v-for="jornada in JORNADES" :key="jornada.valor" :value="jornada.valor">{{ jornada.etiqueta }}</option>
          </select>
        </label>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Mostrant {{ files.length }} de {{ llistaVista.length }}</span>
        <button v-if="hiHaFiltres" type="button" class="font-semibold text-primary hover:underline" @click="netejarFiltres">Neteja els filtres</button>
      </div>
    </section>

    <!-- Llistat: taula a pantalla ampla i targetes al mòbil. Cada fila obre la fitxa. -->
    <section class="overflow-hidden card dark:border-slate-700 dark:bg-gray-800">
      <div class="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2 text-xs md:hidden dark:border-slate-700">
        <label class="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
          Ordena per
          <select class="form-input py-1 text-xs" :value="ordre.clau" @change="ordre.clau = $event.target.value">
            <option v-for="columna in columnes" :key="columna.clau" :value="columna.clau">{{ columna.label }}</option>
          </select>
        </label>
        <button type="button" class="boto-fila" @click="ordre.sentit = ordre.sentit === 'asc' ? 'desc' : 'asc'">
          {{ ordre.sentit === 'asc' ? '▲ A-Z' : '▼ Z-A' }}
        </button>
      </div>

      <table class="hidden w-full text-sm md:table" data-testid="taula-professorat">
        <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-600 dark:bg-gray-700 dark:text-slate-300">
          <tr>
            <th v-for="columna in columnes" :key="columna.clau" class="px-3 py-2.5">
              <button type="button" class="inline-flex items-center gap-1 font-semibold uppercase hover:text-slate-950 dark:hover:text-white" @click="ordenarPer(columna.clau)">
                {{ columna.label }}
                <span class="w-3 text-[10px]">{{ ordre.clau === columna.clau ? (ordre.sentit === 'asc' ? '▲' : '▼') : '' }}</span>
              </button>
            </th>
            <th v-if="vista === 'anteriors' && editable" class="px-3 py-2.5"><span class="sr-only">Accions</span></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
          <tr
            v-for="professor in files"
            :key="professor.id"
            class="align-top hover:bg-slate-50 dark:hover:bg-gray-700/50"
            :class="editable ? 'cursor-pointer' : ''"
            :data-professor="professor.nom"
            @click="obrir(professor)"
          >
            <td class="px-3 py-2.5">
              <button
                type="button"
                class="text-left font-semibold text-slate-900 enabled:hover:text-primary enabled:hover:underline dark:text-white"
                :disabled="!editable"
                @click.stop="obrir(professor)"
              >{{ professor.nom }}</button>
              <div class="text-xs" :class="professor.email ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-amber-700'">
                {{ professor.email || 'Sense correu' }}
              </div>
              <div v-if="professor.substitueixA" class="text-xs text-slate-500">Substitueix {{ nomDe(professor.substitueixA) }}</div>
              <div v-if="professor.comentariFull" class="max-w-xs truncate text-xs text-slate-500" :title="professor.comentariFull">{{ professor.comentariFull }}</div>
            </td>
            <td class="whitespace-nowrap px-3 py-2.5 font-mono text-slate-800 dark:text-slate-200">
              {{ professor.codiUntis || '—' }}
              <span
                v-if="vista === 'actius' && professor.codiUntis && (placesCompartides.get(professor.codiUntis) || 0) > 1"
                class="ml-1 rounded bg-slate-100 px-1 py-0.5 font-sans text-[10px] font-semibold text-slate-600 dark:bg-gray-700 dark:text-slate-300"
                title="Plaça compartida (titular i substitut, o dues persones)"
              >compartida</span>
            </td>
            <td class="px-3 py-2.5 text-slate-700 dark:text-slate-300">{{ departamentsDe(professor).join(', ') || '—' }}</td>
            <template v-if="vista === 'actius'">
              <td class="whitespace-nowrap px-3 py-2.5 text-slate-700 dark:text-slate-300">{{ etiquetaJornada(professor.jornada) }}</td>
              <td class="px-3 py-2.5">
                <div class="flex flex-wrap gap-1">
                  <span
                    v-for="rol in rolsVisibles(professor)"
                    :key="rol"
                    class="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                    :class="CLASSE_ROL[rol] || 'bg-slate-100 text-slate-700'"
                  >{{ etiquetaRol(rol) }}</span>
                  <span v-if="!rolsVisibles(professor).length" class="text-xs text-slate-400">Professor/a</span>
                  <span v-if="professor.exempteGuardies" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">Exempt G</span>
                </div>
              </td>
            </template>
            <template v-else>
              <td class="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                <div>{{ formatData(professor.desactivatAt) }}</div>
                <div class="text-xs text-slate-500">
                  {{ professor.motiuBaixa || '—' }}<template v-if="professor.substituitPer"> · substituït per {{ professor.substituitPer }}</template>
                </div>
              </td>
              <td v-if="editable" class="px-3 py-2.5 text-right">
                <button type="button" class="boto-fila" @click.stop="obrirReactivar(professor)">Reactiva</button>
              </td>
            </template>
          </tr>
        </tbody>
      </table>

      <ul class="divide-y divide-slate-100 md:hidden dark:divide-slate-700">
        <li v-for="professor in files" :key="professor.id" :data-professor="professor.nom">
          <button type="button" class="block w-full px-4 py-3 text-left enabled:active:bg-slate-50 dark:enabled:active:bg-gray-700" :disabled="!editable" @click="obrir(professor)">
            <span class="block font-semibold text-slate-900 dark:text-white">{{ professor.nom }}</span>
            <span class="block text-xs" :class="professor.email ? 'text-slate-500 dark:text-slate-400' : 'font-semibold text-amber-700'">
              {{ professor.email || 'Sense correu' }}
            </span>
            <span v-if="professor.substitueixA" class="block text-xs text-slate-500">Substitueix {{ nomDe(professor.substitueixA) }}</span>
            <span class="mt-1 block text-xs text-slate-700 dark:text-slate-300">
              <span class="font-mono">{{ professor.codiUntis || '—' }}</span>
              · {{ departamentsDe(professor).join(', ') || 'Sense departament' }}
              <template v-if="vista === 'actius'"> · {{ etiquetaJornada(professor.jornada) }}</template>
            </span>
            <span v-if="vista === 'actius' && (rolsVisibles(professor).length || professor.exempteGuardies)" class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="rol in rolsVisibles(professor)"
                :key="rol"
                class="rounded px-1.5 py-0.5 text-[11px] font-semibold"
                :class="CLASSE_ROL[rol] || 'bg-slate-100 text-slate-700'"
              >{{ etiquetaRol(rol) }}</span>
              <span v-if="professor.exempteGuardies" class="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">Exempt G</span>
            </span>
            <span v-if="vista === 'anteriors'" class="mt-1 block text-xs text-slate-500">
              {{ formatData(professor.desactivatAt) }} · {{ professor.motiuBaixa || '—' }}<template v-if="professor.substituitPer"> · substituït per {{ professor.substituitPer }}</template>
            </span>
          </button>
          <div v-if="vista === 'anteriors' && editable" class="px-4 pb-3">
            <button type="button" class="boto-fila" @click="obrirReactivar(professor)">Reactiva</button>
          </div>
        </li>
      </ul>

      <p v-if="carregat && !files.length && professors.length" class="px-5 py-8 text-center text-sm text-slate-500">
        {{ vista === 'anteriors' && !anteriors.length ? 'Encara no hi ha professorat a Anteriors.' : 'Cap professor coincideix amb els filtres.' }}
      </p>
      <p v-if="!carregat" class="px-5 py-8 text-center text-sm text-slate-500">Carregant...</p>
    </section>

    <!-- Fitxa (nova o edició) i substitució -->
    <div v-if="modal === 'fitxa' || modal === 'substitucio'" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="tancar">
      <form class="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800" data-testid="fitxa-professor" @submit.prevent="desar">
        <h4 class="text-lg font-semibold text-slate-950 dark:text-white">
          <template v-if="modal === 'substitucio'">Substitució de {{ seleccionat.nom }}</template>
          <template v-else>{{ seleccionat ? 'Edita la fitxa' : 'Nou professor/a' }}</template>
        </h4>
        <p v-if="modal === 'substitucio'" class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          El substitut ocupa la mateixa plaça{{ seleccionat.codiUntis ? ` (${seleccionat.codiUntis})` : '' }}.
          {{ seleccionat.nom }} passa a Anteriors i es pot reactivar quan torni.
        </p>

        <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label class="block text-sm font-medium text-slate-700 sm:col-span-2 dark:text-slate-200">
            Nom
            <input v-model="form.nom" type="text" required class="form-input mt-1 w-full" placeholder="COGNOMS, NOM" autocomplete="off" />
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Correu
            <input v-model="form.email" type="text" class="form-input mt-1 w-full" placeholder="usuari" autocomplete="off" />
            <span class="mt-0.5 block text-xs font-normal text-slate-500">Si no hi poses @, s'hi afegeix @{{ DOMINI_CENTRE }}.</span>
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Plaça (codi Untis)
            <input v-model="form.codiUntis" type="text" class="form-input mt-1 w-full font-mono uppercase" placeholder="ADEL" autocomplete="off" />
            <span class="mt-0.5 block text-xs font-normal text-slate-500">Titular i substitut poden compartir-la.</span>
          </label>
          <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">
            Jornada
            <select v-model="form.jornada" class="form-input mt-1 w-full">
              <option v-for="jornada in JORNADES" :key="jornada.valor" :value="jornada.valor">{{ jornada.etiqueta }}</option>
            </select>
          </label>
          <div class="text-sm font-medium text-slate-700 dark:text-slate-200">
            Departaments
            <div class="mt-1 flex flex-wrap gap-1">
              <span
                v-for="(dep, index) in form.departaments"
                :key="dep"
                class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-800 dark:bg-gray-700 dark:text-white"
              >
                {{ dep }}<template v-if="index === 0 && form.departaments.length > 1"> (principal)</template>
                <button type="button" class="font-bold" :aria-label="`Treu ${dep}`" @click="treureDepartament(dep)">×</button>
              </span>
              <span v-if="!form.departaments.length" class="text-xs font-normal text-slate-500">Cap departament</span>
            </div>
            <div class="mt-1 flex gap-1">
              <select class="form-input w-full" :value="''" aria-label="Afegeix un departament" @change="afegirDepartament($event.target.value); $event.target.value = ''">
                <option value="">Afegeix...</option>
                <option v-for="dep in departamentsPerAfegir" :key="dep" :value="dep">{{ dep }}</option>
              </select>
            </div>
            <div class="mt-1 flex gap-1">
              <input v-model="nouDepartament" type="text" class="form-input w-full" placeholder="Departament nou" @keydown.enter.prevent="afegirDepartament(nouDepartament)" />
              <button type="button" class="rounded-md border border-slate-300 px-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200" @click="afegirDepartament(nouDepartament)">Afegeix</button>
            </div>
          </div>
          <fieldset class="text-sm font-medium text-slate-700 sm:col-span-2 dark:text-slate-200">
            <legend>Rols</legend>
            <p class="text-xs font-normal text-slate-500">Tothom és professor/a; marca només els rols que hi sumen drets.</p>
            <div class="mt-1 grid grid-cols-1 gap-1 sm:grid-cols-2">
              <label v-for="rol in ROLS_FITXA" :key="rol.valor" class="flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 p-2 dark:border-slate-700">
                <input v-model="form.rols" type="checkbox" :value="rol.valor" class="mt-0.5 h-4 w-4 accent-primary" />
                <span>
                  <span class="block font-semibold">{{ rol.etiqueta }}</span>
                  <span class="block text-xs font-normal text-slate-500">{{ rol.ajuda }}</span>
                </span>
              </label>
            </div>
          </fieldset>
          <label class="block text-sm font-medium text-slate-700 sm:col-span-2 dark:text-slate-200">
            Comentari
            <textarea v-model="form.comentariFull" rows="2" class="form-input mt-1 w-full" />
          </label>
          <label class="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
            <input v-model="form.exempteGuardies" type="checkbox" class="h-4 w-4 accent-primary" />
            Exempt de guàrdies
          </label>
        </div>

        <div v-if="modal === 'substitucio'" class="mt-4 space-y-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <label class="flex cursor-pointer items-start gap-2 text-slate-800 dark:text-slate-200">
            <input v-model="traspassarPlaca" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" />
            <span>Traspassa-li la plaça: classes assignades i guàrdies, SD i DD planificades.</span>
          </label>
          <label class="block font-medium text-slate-700 dark:text-slate-200">
            Motiu de {{ seleccionat.nom }}
            <select v-model="motiu" class="form-input mt-1 w-full">
              <option v-for="opcio in MOTIUS_BAIXA" :key="opcio" :value="opcio">{{ opcio }}</option>
            </select>
          </label>
        </div>

        <p v-if="canviNom" class="mt-3 text-sm text-slate-600 dark:text-slate-400">
          En canviar el nom, les classes assignades a «{{ seleccionat.nom }}» passaran al nom nou.
        </p>
        <ul v-if="validacio.errors.length || validacio.avisos.length" class="mt-3 space-y-1 text-sm">
          <li v-for="error in validacio.errors" :key="error" class="text-rose-700 dark:text-rose-300">✕ {{ error }}</li>
          <li v-for="avis in validacio.avisos" :key="avis" class="text-amber-700 dark:text-amber-300">! {{ avis }}</li>
        </ul>

        <div class="mt-6 flex flex-wrap items-center justify-between gap-2">
          <div v-if="modal === 'fitxa' && seleccionat" class="flex gap-2">
            <button
              type="button"
              class="rounded-md border border-rose-300 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-950/30"
              @click="obrirDesactivar(seleccionat)"
            >
              Desactiva
            </button>
            <button
              type="button"
              class="rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-gray-700"
              @click="obrirSubstitucio(seleccionat)"
            >
              Substitueix
            </button>
          </div>
          <span v-else />
          <div class="flex gap-2">
            <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-gray-700" @click="tancar">
              Cancel·la
            </button>
            <button
              type="submit"
              :disabled="desant || validacio.errors.length > 0"
              class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
            >
              {{ desant ? 'Desant...' : modal === 'substitucio' ? 'Dona d\'alta el substitut' : 'Desa' }}
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- Desactivar -->
    <div v-if="modal === 'desactivar'" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="tancar">
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h4 class="text-lg font-semibold text-slate-950 dark:text-white">Desactiva {{ seleccionat.nom }}</h4>
        <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">
          No s'esborra: passa a <strong>Anteriors</strong> i es pot reactivar. Deixa de sortir a Quota i a Guàrdies
          <template v-if="cursVigent">i perd el permís d'accés</template>. Les classes que tingui assignades es mantenen al seu nom.
        </p>
        <label class="mt-4 block text-sm font-medium text-slate-700 dark:text-slate-200">
          Motiu
          <select v-model="motiu" class="form-input mt-1 w-full">
            <option v-for="opcio in MOTIUS_BAIXA" :key="opcio" :value="opcio">{{ opcio }}</option>
          </select>
        </label>
        <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Si ve un substitut a fer el seu horari, fes servir <strong>Substitueix</strong>: li passa la plaça i les classes.
        </p>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200" @click="tancar">Cancel·la</button>
          <button type="button" :disabled="desant" class="rounded-md bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50" @click="confirmarDesactivar">
            {{ desant ? 'Desactivant...' : 'Desactiva' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Reactivar -->
    <div v-if="modal === 'reactivar'" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="tancar">
      <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h4 class="text-lg font-semibold text-slate-950 dark:text-white">Reactiva {{ seleccionat.nom }}</h4>
        <p class="mt-2 text-sm text-slate-700 dark:text-slate-300">Torna a la llista d'actius amb les dades que tenia.</p>
        <label v-if="substitutActiu" class="mt-4 flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-800 dark:border-slate-700 dark:text-slate-200">
          <input v-model="retornarPlaca" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" />
          <span>
            Desactiva el substitut <strong>{{ substitutActiu.nom }}</strong> i retorna la plaça a {{ seleccionat.nom }}
            (classes assignades i planificació actual).
          </span>
        </label>
        <ul v-if="errorsReactivar.length" class="mt-3 space-y-1 text-sm text-rose-700 dark:text-rose-300">
          <li v-for="error in errorsReactivar" :key="error">✕ {{ error }}</li>
        </ul>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200" @click="tancar">Cancel·la</button>
          <button type="button" :disabled="desant || errorsReactivar.length > 0" class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50" @click="confirmarReactivar">
            {{ desant ? 'Reactivant...' : 'Reactiva' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Revisió de permisos -->
    <div v-if="modal === 'permisos'" class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="tancar">
      <div class="my-8 w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl dark:bg-gray-800">
        <h4 class="text-lg font-semibold text-slate-950 dark:text-white">Permisos d'accés</h4>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Qui pot entrar a les aplicacions i amb quin rol, segons el professorat actiu d'aquest curs.
        </p>
        <div v-if="planRevisat" class="mt-4 space-y-3 text-sm">
          <div v-if="planRevisat.escriure.length">
            <p class="font-semibold text-slate-900 dark:text-white">Es crearan o actualitzaran ({{ planRevisat.escriure.length }})</p>
            <ul class="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-slate-700 dark:text-slate-300">
              <li v-for="permis in planRevisat.escriure" :key="permis.email">{{ permis.email }} · {{ permis.nom }} · {{ permis.rols.map(etiquetaRol).join(', ') }}</li>
            </ul>
          </div>
          <div v-if="planRevisat.esborrar.length">
            <p class="font-semibold text-rose-800 dark:text-rose-300">Es trauran ({{ planRevisat.esborrar.length }})</p>
            <ul class="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-slate-700 dark:text-slate-300">
              <li v-for="email in planRevisat.esborrar" :key="email">{{ email }}</li>
            </ul>
          </div>
          <div v-if="planRevisat.usuaris?.length">
            <p class="font-semibold text-slate-900 dark:text-white">Comptes que ja han entrat i canviaran de rol ({{ planRevisat.usuaris.length }})</p>
            <ul class="mt-1 max-h-48 space-y-0.5 overflow-y-auto text-slate-700 dark:text-slate-300">
              <li v-for="canvi in planRevisat.usuaris" :key="canvi.uid">
                {{ canvi.email }}<template v-if="canvi.nom"> · {{ canvi.nom }}</template> ·
                {{ etiquetaAcces(canvi.actual.rol) }} → <strong>{{ etiquetaAcces(canvi.nou.rol) }}</strong>
              </li>
            </ul>
            <p class="mt-1 text-xs text-slate-500">
              Es fa servir a Quota, Guàrdies i Pantalles. Qui no és actiu a Professorat es queda sense accés;
              l'administració afegida a mà des d'Usuaris (sense cap fitxa aquí) no es toca.
            </p>
          </div>
          <p v-if="!planRevisat.escriure.length && !planRevisat.esborrar.length && !planRevisat.usuaris?.length" class="text-slate-700 dark:text-slate-300">Tot coincideix.</p>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200" @click="tancar">Tanca</button>
          <button
            v-if="planRevisat && (planRevisat.escriure.length || planRevisat.esborrar.length || planRevisat.usuaris?.length)"
            type="button"
            :disabled="desant"
            class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            @click="aplicarPermisosRevisats"
          >
            {{ desant ? 'Aplicant...' : 'Aplica' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref, watch } from 'vue';
import { useCursStore } from '../stores/curs';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import {
  aplicarPermisos,
  canviarAccesCompte,
  copiarProfessoratDeCurs,
  desactivarProfessor,
  desarProfessor,
  esCursVigent,
  llegirUsuaris,
  reactivarProfessor,
  revisarPermisos,
  subscriurePermisos,
  subscriureProfessorat,
  substituirProfessor,
} from '../services/professorat';
import {
  DOMINI_CENTRE,
  JORNADES,
  MOTIUS_BAIXA,
  ROLS_FITXA,
  campsFitxa,
  completarEmail,
  departamentsDe,
  esActiu,
  etiquetaJornada,
  filtrarProfessors,
  formulariDe,
  formulariSubstitut,
  ordenarProfessors,
  planPermisos,
  planUsuaris,
  rolsDe,
  validarFitxa,
} from '../utils/professorat';
import { validarProfessorat } from '../utils/validacioProfessorat';
import { E2E_AUTH_BYPASS } from '../services/e2e';

const cursStore = useCursStore();
const authStore = useAuthStore();
const toast = useToastStore();

const professors = ref([]);
const permisos = ref([]);
// Fitxes d'usuari (comptes que ja han entrat a Quota): la còpia del rol que fan servir les apps.
const usuaris = ref([]);
const carregat = ref(false);
const vista = ref('actius');
const filtres = reactive({ text: '', departament: '', rol: '', jornada: '*' });
const ordre = reactive({ clau: 'nom', sentit: 'asc' });

const modal = ref('');
const seleccionat = ref(null);
const form = ref(formulariDe({}));
const nouDepartament = ref('');
const motiu = ref(MOTIUS_BAIXA[0]);
const traspassarPlaca = ref(true);
const retornarPlaca = ref(true);
const desant = ref(false);
const planRevisat = ref(null);
const cursOrigen = ref('');

const CLASSE_ROL = {
  admin: 'bg-violet-100 text-violet-800',
  cap_departament: 'bg-sky-100 text-sky-800',
  psc: 'bg-amber-100 text-amber-800',
};
const etiquetaRol = (rol) => ROLS_FITXA.find((item) => item.valor === rol)?.etiqueta || (rol === 'professor' ? 'Professor/a' : rol);
const rolsVisibles = (professor) => rolsDe(professorAmbRols(professor));

const actor = computed(() => authStore.usuari || authStore.email || 'admin');
// Qui fa el canvi: ningú no es pot treure l'administració a si mateix.
const sessio = computed(() => ({ email: authStore.email, rol: authStore.rol }));
const etiquetaAcces = (rol) => (rol ? etiquetaRol(rol) : 'sense accés');
const cursVigent = computed(() => E2E_AUTH_BYPASS || esCursVigent(cursStore.cursActiuId));
const editable = computed(() => !cursStore.esBloqueig);

// Fitxes antigues sense rols: es prenen dels permisos d'accés actuals.
const permisosPerEmail = computed(() => new Map(permisos.value.map((permis) => [permis.email || permis.id, permis])));
function professorAmbRols(professor) {
  if (Array.isArray(professor.rols) && professor.rols.length) return professor;
  const permis = permisosPerEmail.value.get(professor.email);
  return permis ? { ...professor, rols: permis.rols?.length ? permis.rols : [permis.rol] } : professor;
}

const actius = computed(() => professors.value.filter(esActiu));
const anteriors = computed(() => professors.value.filter((professor) => !esActiu(professor)));
const llistaVista = computed(() => (vista.value === 'actius' ? actius.value : anteriors.value).map(professorAmbRols));
const files = computed(() => ordenarProfessors(filtrarProfessors(llistaVista.value, filtres), ordre.clau, ordre.sentit));
const hiHaFiltres = computed(() => Boolean(filtres.text || filtres.departament || filtres.rol || filtres.jornada !== '*'));
const nomDe = (id) => professors.value.find((professor) => professor.id === id)?.nom || 'una altra persona';

const columnes = computed(() => [
  { clau: 'nom', label: 'Nom' },
  { clau: 'codiUntis', label: 'Plaça' },
  { clau: 'departament', label: 'Departament' },
  ...(vista.value === 'actius'
    ? [{ clau: 'jornada', label: 'Jornada' }, { clau: 'rols', label: 'Rols' }]
    : [{ clau: 'baixa', label: 'Baixa' }]),
]);

const departamentsDisponibles = computed(() => [...new Set(professors.value.flatMap(departamentsDe))]
  .sort((a, b) => a.localeCompare(b, 'ca')));
const departamentsPerAfegir = computed(() => departamentsDisponibles.value.filter((dep) => !form.value.departaments.includes(dep)));

const placesCompartides = computed(() => {
  const comptes = new Map();
  actius.value.forEach((professor) => {
    if (professor.codiUntis) comptes.set(professor.codiUntis, (comptes.get(professor.codiUntis) || 0) + 1);
  });
  return comptes;
});

const resum = computed(() => [
  { label: 'Actius', valor: actius.value.length },
  { label: 'Anteriors', valor: anteriors.value.length },
  { label: 'Sense correu', valor: actius.value.filter((professor) => !professor.email).length },
  { label: 'Places compartides', valor: [...placesCompartides.value.values()].filter((n) => n > 1).length },
]);

// Errors del llistat sencer (correus repetits o creuats, noms repetits...).
const riscosLlista = computed(() => validarProfessorat(
  actius.value.map((professor) => ({ nom: professor.nom, email: professor.email, codiUntis: professor.codiUntis })),
));
const riscosCritics = computed(() => riscosLlista.value.filter((risc) => risc.severitat === 'critic'));
const avisosLlista = computed(() => riscosLlista.value.filter((risc) => risc.severitat !== 'critic'));

const planPermisosViu = computed(() => planPermisos(professors.value, permisos.value));
const planUsuarisViu = computed(() => planUsuaris(usuaris.value, professors.value, { actorEmail: authStore.email }));
const permisosPendents = computed(() => editable.value && cursVigent.value && carregat.value && actius.value.length > 0
  && (planPermisosViu.value.escriure.length + planPermisosViu.value.esborrar.length + planUsuarisViu.value.length) > 0);

async function refrescarUsuaris() {
  try {
    usuaris.value = await llegirUsuaris();
  } catch (error) {
    console.warn("No s'han pogut llegir els comptes:", error);
  }
}
refrescarUsuaris();

// Comptes que han entrat i no són de cap fitxa activa: l'administració afegida a mà i,
// dels darrers 60 dies, qui ha intentat entrar sense tenir-ne.
const DIES_ENTRADES = 60;
const dataDe = (valor) => (valor?.toDate ? valor.toDate() : valor ? new Date(valor) : null);
const comptesSenseFitxa = computed(() => {
  const ambFitxa = new Set(actius.value.map((professor) => completarEmail(professor.email)).filter(Boolean));
  return usuaris.value
    .filter((compte) => compte.email && !ambFitxa.has(completarEmail(compte.email)))
    .map((compte) => ({ ...compte, darreraEntrada: dataDe(compte.lastLogin) || dataDe(compte.createdAt) }));
});
const adminsSenseFitxa = computed(() => comptesSenseFitxa.value
  .filter((compte) => compte.rol === 'admin')
  .sort((a, b) => (a.nom || a.email).localeCompare(b.nom || b.email, 'ca')));
const entradesSenseFitxa = computed(() => {
  const limit = Date.now() - DIES_ENTRADES * 24 * 60 * 60 * 1000;
  return comptesSenseFitxa.value
    .filter((compte) => !compte.rol && compte.darreraEntrada && compte.darreraEntrada.getTime() >= limit)
    .sort((a, b) => b.darreraEntrada - a.darreraEntrada);
});

const cursosOrigen = computed(() => (cursStore.cursos || []).filter((curs) => curs.id !== cursStore.cursActiuId));

const fitxaActual = computed(() => campsFitxa(form.value));
const validacio = computed(() => validarFitxa(
  fitxaActual.value,
  professors.value,
  modal.value === 'fitxa' ? seleccionat.value?.id || null : null,
));
const canviNom = computed(() => modal.value === 'fitxa' && seleccionat.value && fitxaActual.value.nom
  && fitxaActual.value.nom !== seleccionat.value.nom);
const substitutActiu = computed(() => (seleccionat.value
  ? actius.value.find((professor) => professor.substitueixA === seleccionat.value.id) || null
  : null));
// En reactivar només importen els conflictes amb l'actiu (nom o correu ja en ús); la
// resta (p. ex. sense departament) es pot corregir després editant la fitxa.
const errorsReactivar = computed(() => (seleccionat.value && modal.value === 'reactivar'
  ? validarFitxa(campsFitxa(formulariDe(professorAmbRols(seleccionat.value))), professors.value, seleccionat.value.id).errors
    .filter((error) => !error.startsWith('Cal almenys un departament') && !error.startsWith('Cal el nom'))
  : []));

// --- Subscripcions -------------------------------------------------------------
let desubscriureProfessorat = null;
const desubscriurePermisos = subscriurePermisos(
  (llista) => { permisos.value = llista; },
  (error) => console.warn("No s'han pogut llegir els permisos:", error),
);

watch(() => cursStore.cursActiuId, (cursId) => {
  desubscriureProfessorat?.();
  carregat.value = false;
  desubscriureProfessorat = subscriureProfessorat(cursId, (llista) => {
    professors.value = llista;
    carregat.value = true;
  }, (error) => toast.error(`No s'ha pogut carregar el professorat: ${error.message}`));
  cursOrigen.value = cursosOrigen.value[0]?.id || '';
}, { immediate: true });

watch(cursosOrigen, (llista) => {
  if (!llista.some((curs) => curs.id === cursOrigen.value)) cursOrigen.value = llista[0]?.id || '';
});

onUnmounted(() => {
  desubscriureProfessorat?.();
  desubscriurePermisos?.();
});

// --- Accions -------------------------------------------------------------------
function ordenarPer(clau) {
  if (ordre.clau === clau) ordre.sentit = ordre.sentit === 'asc' ? 'desc' : 'asc';
  else Object.assign(ordre, { clau, sentit: 'asc' });
}

function netejarFiltres() {
  Object.assign(filtres, { text: '', departament: '', rol: '', jornada: '*' });
}

function formatData(valor) {
  if (!valor) return '—';
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? '—' : data.toLocaleDateString('ca-ES');
}

function tancar() {
  if (desant.value) return;
  modal.value = '';
  seleccionat.value = null;
  planRevisat.value = null;
}

// La fila obre la fitxa (actius) o la reactivació (anteriors).
function obrir(professor) {
  if (!editable.value) return;
  if (vista.value === 'actius') obrirEdicio(professor);
  else obrirReactivar(professor);
}

function obrirNou() {
  seleccionat.value = null;
  form.value = formulariDe({});
  nouDepartament.value = '';
  modal.value = 'fitxa';
}

function obrirNouDe(compte) {
  obrirNou();
  form.value = formulariDe({ nom: compte.nom || '', email: compte.email || '' });
}

function canviarAcces(compte, admin) {
  const missatge = admin
    ? `${compte.nom || compte.email} podrà administrar Quota, Guàrdies i Retards. Ho confirmes?`
    : `${compte.nom || compte.email} deixarà de poder entrar a les aplicacions. Ho confirmes?`;
  if (!window.confirm(missatge)) return;
  executar(async () => {
    await canviarAccesCompte({ uid: compte.id, admin });
    toast.ok(admin ? `${compte.nom || compte.email} ja és administrador/a.` : `${compte.nom || compte.email} ja no té accés.`);
  });
}

function obrirEdicio(professor) {
  seleccionat.value = professor;
  form.value = formulariDe(professorAmbRols(professor));
  nouDepartament.value = '';
  modal.value = 'fitxa';
}

function obrirSubstitucio(professor) {
  seleccionat.value = professor;
  form.value = formulariSubstitut(professor);
  nouDepartament.value = '';
  motiu.value = 'Baixa';
  traspassarPlaca.value = true;
  modal.value = 'substitucio';
}

function obrirDesactivar(professor) {
  seleccionat.value = professor;
  motiu.value = MOTIUS_BAIXA[0];
  modal.value = 'desactivar';
}

function obrirReactivar(professor) {
  seleccionat.value = professor;
  retornarPlaca.value = true;
  modal.value = 'reactivar';
}

function afegirDepartament(valor) {
  const nom = String(valor || '').trim();
  if (nom && !form.value.departaments.some((dep) => dep.toLowerCase() === nom.toLowerCase())) {
    form.value.departaments = [...form.value.departaments, nom];
  }
  nouDepartament.value = '';
}

function treureDepartament(nom) {
  form.value.departaments = form.value.departaments.filter((dep) => dep !== nom);
}

function informar(resultat, missatge) {
  toast.ok(missatge);
  (resultat?.avisos || []).forEach((avis) => toast.error(avis));
}

async function executar(accio) {
  if (desant.value) return;
  desant.value = true;
  try {
    await accio();
    if (modal.value !== 'permisos') refrescarUsuaris();
  } catch (error) {
    toast.error(`No s'ha pogut desar: ${error.message}`);
  } finally {
    desant.value = false;
  }
}

function desar() {
  if (validacio.value.errors.length) return;
  executar(async () => {
    if (modal.value === 'substitucio') {
      const titular = seleccionat.value;
      const resultat = await substituirProfessor({
        cursId: cursStore.cursActiuId,
        titular,
        form: form.value,
        traspassarPlaca: traspassarPlaca.value,
        motiu: motiu.value,
        actor: actor.value,
        sessio: sessio.value,
      });
      informar(resultat, `${fitxaActual.value.nom} substitueix ${titular.nom}.`);
    } else {
      const professor = seleccionat.value;
      const resultat = await desarProfessor({ cursId: cursStore.cursActiuId, professor, form: form.value, actor: actor.value, sessio: sessio.value });
      const classes = resultat.classesReanomenades ? ` ${resultat.classesReanomenades} classes amb el nom nou.` : '';
      informar(resultat, `${professor ? 'Fitxa desada' : 'Professor/a afegit'}: ${fitxaActual.value.nom}.${classes}`);
    }
    desant.value = false;
    tancar();
  });
}

function confirmarDesactivar() {
  executar(async () => {
    const professor = seleccionat.value;
    const resultat = await desactivarProfessor({ cursId: cursStore.cursActiuId, professor, motiu: motiu.value, actor: actor.value, sessio: sessio.value });
    informar(resultat, `${professor.nom} és a Anteriors.`);
    desant.value = false;
    tancar();
  });
}

function confirmarReactivar() {
  executar(async () => {
    const professor = seleccionat.value;
    const resultat = await reactivarProfessor({
      cursId: cursStore.cursActiuId,
      professor,
      substitut: substitutActiu.value,
      retornarPlaca: Boolean(substitutActiu.value && retornarPlaca.value),
      actor: actor.value,
      sessio: sessio.value,
    });
    informar(resultat, `${professor.nom} torna a estar actiu.`);
    vista.value = 'actius';
    desant.value = false;
    tancar();
  });
}

function revisarPermisosAra() {
  executar(async () => {
    planRevisat.value = await revisarPermisos(cursStore.cursActiuId, sessio.value);
    modal.value = 'permisos';
  });
}

function aplicarPermisosRevisats() {
  executar(async () => {
    await aplicarPermisos(cursStore.cursActiuId, planRevisat.value);
    toast.ok("Permisos d'accés actualitzats.");
    desant.value = false;
    tancar();
  });
}

function copiarCurs() {
  executar(async () => {
    const resultat = await copiarProfessoratDeCurs({ origen: cursOrigen.value, desti: cursStore.cursActiuId, actor: actor.value });
    toast.ok(`${resultat.copiats} professors copiats.`);
  });
}
</script>

<style scoped>
.boto-fila {
  border-radius: 0.375rem;
  border: 1px solid rgb(203 213 225);
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgb(51 65 85);
  white-space: nowrap;
}
.boto-fila:hover { background: rgb(241 245 249); }
/* «:global(.dark) .boto-fila» es compilava com «.dark» i pintava tota l'aplicació. */
:global(.dark .boto-fila) { border-color: rgb(71 85 105); color: rgb(226 232 240); }
:global(.dark .boto-fila:hover) { background: rgb(55 65 81); }
</style>
