<template>
  <div class="max-w-4xl space-y-5">
    <!-- Header card -->
    <div class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 class="text-2xl font-semibold text-slate-950">
            Flux de treball Untis
          </h3>
          <p class="mt-2 text-base text-slate-600 dark:text-slate-300">
            Carrega l'XML de GestIB a Untis i usa aquesta pantalla per generar
            el GPU002.TXT amb professor, matèria, grup i hores.
          </p>
        </div>
        <button
          @click="generar"
          :disabled="carregant || !referenciaGestibXmlText"
          class="rounded-md bg-[#0024B6] px-5 py-3 text-base font-medium text-white transition hover:bg-[#001A8A] disabled:opacity-50"
        >
          {{ carregant ? 'Generant...' : simular ? 'Genera simulació' : 'Genera GPU002' }}
        </button>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-5">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
          <p class="text-xs font-medium text-slate-500">1. GestIB</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Descarregar XML</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
          <p class="text-xs font-medium text-slate-500">2. App</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Carregar referència</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
          <p class="text-xs font-medium text-slate-500">3. Simular</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Muntar GPU002</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
          <p class="text-xs font-medium text-slate-500">4. Baixar</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">GPU002.TXT</p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-gray-900">
          <p class="text-xs font-medium text-slate-500">5. Untis</p>
          <p class="mt-1 text-sm font-semibold text-slate-900 dark:text-white">Importar i testar</p>
        </div>
      </div>

      <div class="mt-5 grid gap-3 sm:grid-cols-2">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-gray-900">
          <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            XML de GestIB <span class="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept=".xml,text/xml,application/xml"
            class="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-[#0024B6] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[#001A8A] dark:text-slate-300 dark:file:bg-[#3355CC]"
            @change="carregarGestibXml"
          />
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span v-if="gestibXmlNom">{{ gestibXmlNom }}</span>
            <span v-else>exportacioDadesHoraris de GestIB</span>
          </p>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-gray-900">
          <label class="block text-sm font-semibold text-slate-800 dark:text-slate-200">
            GPU002.TXT de referència
          </label>
          <input
            type="file"
            accept=".txt,text/plain"
            class="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-600 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700 dark:text-slate-300 dark:file:bg-slate-500"
            @change="carregarGpu002Referencia"
          />
          <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span v-if="gpu002ReferenciaNom">{{ gpu002ReferenciaNom }}</span>
            <span v-else>GPU002 anterior (opcional, per numeració i resolució automàtica)</span>
          </p>
        </div>
      </div>

      <!-- Mapeig manual de matèries -->
      <div v-if="analitzant" class="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
        Analitzant correspondències GestIB...
      </div>

      <div
        v-else-if="totes.length > 0"
        class="mt-4 rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-gray-900"
      >
        <div class="flex flex-col gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-sm font-semibold text-slate-900 dark:text-white">
              Correspondències GestIB
              <span
                v-if="pendentsCount > 0"
                class="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-900/30 dark:text-amber-300"
              >{{ pendentsCount }} pendents</span>
            </p>
            <div class="mt-0.5 flex items-center gap-3">
              <p class="text-xs text-slate-500 dark:text-slate-400">
                Selecciona la matèria de GestIB per a les pendents. Es guarda automàticament.
              </p>
              <button
                @click="confirmarEsborra = true"
                class="shrink-0 text-xs text-red-500 underline-offset-2 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
              >Esborra mapeig</button>
            </div>
          </div>
          <div class="flex gap-1">
            <button
              v-for="tab in [{ valor: 'totes', etiqueta: 'Totes', count: totes.length }, { valor: 'resoltes', etiqueta: 'Resoltes', count: resoltesCount }, { valor: 'pendents', etiqueta: 'Pendents', count: pendentsCount }]"
              :key="tab.valor"
              @click="filtreMapateg = tab.valor"
              class="rounded px-2.5 py-1 text-xs font-medium transition"
              :class="filtreMapateg === tab.valor
                ? (tab.valor === 'pendents' && pendentsCount > 0 ? 'bg-amber-500 text-white' : 'bg-[#0024B6] text-white')
                : (tab.valor === 'pendents' && pendentsCount > 0
                    ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700')"
            >
              {{ tab.etiqueta }}
              <span class="ml-1 opacity-80">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div class="divide-y divide-slate-100 dark:divide-slate-800">
          <div
            v-for="m in classesFiltrades"
            :key="m.clau"
            class="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-3"
          >
            <span
              class="shrink-0 self-start rounded px-1.5 py-0.5 text-xs font-semibold sm:self-auto"
              :class="estatMapeigBadgeClass(m)"
            >{{ estatMapeigEtiqueta(m) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-slate-900 dark:text-white">{{ m.materia }}</p>
              <p class="text-xs text-slate-500 dark:text-slate-400">
                <span v-if="m.curs">{{ m.curs }}</span>
                <span v-if="m.grup" class="ml-1 font-medium text-slate-700 dark:text-slate-300">· {{ m.grup }}</span>
                <span v-else-if="m.senseAmbdos" class="ml-1 italic text-amber-600 dark:text-amber-400">· sense curs i grup</span>
                <span v-else-if="!m.grup" class="ml-1 italic text-amber-600 dark:text-amber-400">· sense grup</span>
              </p>
            </div>
            <div class="flex w-full items-center gap-2 sm:w-96">
              <SelectBuscador
                :modelValue="codiActualMapeig(m)"
                :opcions="opcionsPerClau(m)"
                placeholder="Cerca matèria de GestIB..."
                class="flex-1"
                @update:modelValue="assignarOverride(m.clau, $event)"
              />
              <span
                v-if="codiActualMapeig(m)"
                class="shrink-0 text-sm font-semibold text-green-700 dark:text-green-400"
              >✓</span>
            </div>
          </div>
          <p v-if="classesFiltrades.length === 0" class="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
            <span v-if="filtreMapateg === 'pendents'">Totes les classes estan resoltes</span>
            <span v-else>Cap resultat</span>
          </p>
        </div>
      </div>

      <!-- Simulació checkbox -->
      <label class="mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-gray-900">
        <input
          type="checkbox"
          v-model="simular"
          class="h-4 w-4 rounded border-slate-300 text-[#0024B6] accent-[#0024B6]"
        />
        <span class="text-sm font-medium text-slate-800 dark:text-slate-200">
          Mode simulació: assigna codis de les places de l’XML a totes les classes exportables, sense guardar res a Firestore
        </span>
      </label>
    </div>

    <div
      v-if="error"
      class="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300"
    >
      {{ error }}
    </div>

    <!-- Generated files -->
    <div
      v-if="exportacio"
      class="rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div class="border-b border-slate-200 p-5 dark:border-slate-700">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-xl font-semibold text-slate-950">
                Fitxers preparats
              </h4>
              <span
                v-if="simular"
                class="rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-slate-800"
              >
                SIMULACIÓ
              </span>
            </div>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ exportacio.totals.professors }} professors ·
              {{ exportacio.totals.classes }} grups ·
              {{ exportacio.totals.materies }} matèries ·
              {{ exportacio.totals.llicons }} lliçons
              <span v-if="exportacio.totals.simulades"> · {{ exportacio.totals.simulades }} simulades</span>
            </p>
            <p v-if="gestibXmlNom || gpu002ReferenciaNom" class="mt-1 text-sm font-medium text-slate-600 dark:text-slate-400">
              {{ [gestibXmlNom && `GestIB: ${gestibXmlNom}`, gpu002ReferenciaNom && `GPU002: ${gpu002ReferenciaNom}`].filter(Boolean).join(' · ') }}
            </p>
            <p v-if="exportacio.referenciaGestibStats" class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              XML GestIB: {{ exportacio.referenciaGestibStats.materies }} matèries ·
              {{ exportacio.referenciaGestibStats.places }} places ·
              {{ exportacio.referenciaGestibStats.aules }} aules
            </p>
          </div>
          <button
            @click="obrirVistaPreviaDescarga"
            class="rounded-md bg-[#0024B6] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#001A8A]"
          >
            Revisa i descarrega GPU002
          </button>
        </div>
      </div>

      <div
        v-if="mostrarVistaPrevia && exportacio.vistaPrevia?.length"
        class="border-b border-slate-200 p-5 dark:border-slate-700"
      >
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h5 class="text-lg font-semibold text-slate-950">
              Vista prèvia de lliçons
            </h5>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ vistaPreviaFiltrada.length }} de {{ exportacio.vistaPrevia.length }} lliçons preparades per importar.
            </p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <input
              v-model="filtreVistaPrevia"
              type="search"
              class="form-input w-full bg-white py-2 text-sm dark:bg-gray-900 lg:w-80"
              placeholder="Filtra per grup, matèria o professor"
            />
            <button
              @click="descarregarGpu002"
              class="rounded-md bg-[#0024B6] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#001A8A]"
            >
              Descarrega ara
            </button>
          </div>
        </div>

        <div class="mt-4 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
          <table class="w-full min-w-[860px] text-sm">
            <thead>
              <tr class="bg-slate-50 text-left dark:bg-gray-900">
                <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">#</th>
                <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Grup</th>
                <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Matèria</th>
                <th class="px-3 py-2 text-center font-semibold text-slate-600 dark:text-slate-300">Hores</th>
                <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Professors</th>
                <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Codis Untis</th>
                <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Origen</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
              <tr
                v-for="item in vistaPreviaFiltrada"
                :key="item.numero"
                class="align-top hover:bg-slate-50 dark:hover:bg-gray-900/60"
              >
                <td class="px-3 py-2 font-mono text-slate-500">{{ item.numero }}</td>
                <td class="px-3 py-2">
                  <div class="font-mono font-semibold text-slate-900 dark:text-white">
                    {{ item.codiGrups }}
                  </div>
                  <div class="text-xs text-slate-500 dark:text-slate-400">
                    {{ item.curs }} {{ item.grup }}
                  </div>
                </td>
                <td class="px-3 py-2">
                  <div class="font-medium text-slate-900 dark:text-white">{{ item.materia }}</div>
                  <div class="mt-1 flex flex-wrap gap-1">
                    <span
                      v-if="item.tipus"
                      class="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {{ item.tipus }}
                    </span>
                  </div>
                  <div v-if="item.filesAgrupades.length > 1" class="mt-2 space-y-1">
                    <div
                      v-for="(fila, index) in item.filesAgrupades"
                      :key="index"
                      class="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600 dark:bg-gray-900 dark:text-slate-300"
                    >
                      {{ fila.curs }} {{ fila.grup }} · {{ fila.materia }} · {{ fila.hores }}h
                      <span v-if="fila.tipus">· {{ fila.tipus }}</span>
                      <span v-if="fila.professor">· {{ fila.professor }}</span>
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2 text-center font-mono font-bold text-slate-900 dark:text-white">
                  {{ item.hores }}
                </td>
                <td class="px-3 py-2">
                  <div class="space-y-1">
                    <div
                      v-for="professor in item.professors"
                      :key="professor"
                      class="text-slate-800 dark:text-slate-200"
                    >
                      {{ professor }}
                    </div>
                  </div>
                </td>
                <td class="px-3 py-2 font-mono text-xs text-slate-600 dark:text-slate-300">
                  <div>{{ item.codiMateria }}</div>
                  <div>{{ item.codisProfessors.join(' + ') }}</div>
                </td>
                <td class="px-3 py-2">
                  <span
                    class="rounded px-2 py-1 text-xs font-bold"
                    :class="item.font === 'referencia'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-700 dark:bg-gray-700 dark:text-gray-200'"
                  >
                    {{ item.font === 'referencia' ? 'Referència' : 'Generat' }}
                  </span>
                </td>
              </tr>
              <tr v-if="vistaPreviaFiltrada.length === 0">
                <td colspan="7" class="px-3 py-6 text-center text-slate-400 dark:text-slate-500">
                  Cap lliço coincideix amb el filtre.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="divide-y divide-slate-200 dark:divide-slate-700">
        <div
          v-for="fitxer in exportacio.fitxers"
          :key="fitxer.nom"
          class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p class="font-mono text-base font-semibold text-slate-900 dark:text-white">
              {{ fitxer.nom }}
            </p>
            <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {{ fitxer.descripcio }}
            </p>
          </div>
          <button
            @click="descarregar(fitxer)"
            class="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-950 dark:hover:bg-white"
          >
            Descarrega
          </button>
        </div>
      </div>
    </div>

    <!-- Pending review -->
    <div
      v-if="exportacio?.pendents?.length"
      class="rounded-lg border border-orange-200 bg-orange-50 p-5"
    >
      <h4 class="text-lg font-semibold text-slate-900">
        Pendents de revisar: {{ exportacio.pendents.length }}
      </h4>
      <div class="mt-3 max-h-80 space-y-2 overflow-auto pr-2">
        <div
          v-for="(pendent, index) in exportacio.pendents"
          :key="index"
          class="rounded-lg bg-white p-3 text-sm text-orange-900 shadow-sm dark:bg-gray-900 dark:text-orange-200"
        >
          <p class="font-semibold">{{ pendent.motiu }}</p>
          <p class="mt-1 text-orange-800 dark:text-orange-300">
            {{ resumClasse(pendent.classe) }}
          </p>
        </div>
      </div>
    </div>

    <!-- Comparador GPU002 -->
    <div class="rounded-lg border border-slate-200 bg-white shadow-sm">
      <div class="border-b border-slate-200 px-5 py-4 dark:border-slate-700">
        <h4 class="text-xl font-semibold text-slate-950">
          Comparador amb GPU002.TXT
        </h4>
        <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Compara les dades de l'app amb un GPU002.TXT existent d'Untis.
        </p>
      </div>

      <div class="p-5">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div class="flex-1">
            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              GPU002.TXT per comparar
            </label>
            <input
              type="file"
              accept=".txt,text/plain"
              class="mt-2 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-slate-700 dark:text-slate-300 dark:file:bg-slate-600"
              @change="carregarGpu002Comparar"
            />
            <p v-if="gpu002ComparacioNom" class="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {{ gpu002ComparacioNom }}
            </p>
          </div>
          <button
            @click="comparar"
            :disabled="!gpu002ComparacioText || comparacioCarregant"
            class="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-40 dark:bg-slate-600 dark:hover:bg-slate-500"
          >
            {{ comparacioCarregant ? 'Comparant...' : 'Comparar' }}
          </button>
        </div>

        <div v-if="comparacioError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          {{ comparacioError }}
        </div>

        <!-- Results -->
        <template v-if="comparacio">
          <!-- Summary stats -->
          <div class="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div class="rounded-lg bg-slate-50 p-3 text-center dark:bg-gray-900">
              <div class="text-2xl font-extrabold text-slate-800 dark:text-slate-100">{{ comparacio.resum.total }}</div>
              <div class="text-xs font-medium text-slate-500 dark:text-slate-400">Total GPU002</div>
            </div>
            <div class="rounded-lg bg-[#00BF33]/10 p-3 text-center dark:bg-[#00BF33]/5">
              <div class="text-2xl font-extrabold text-[#007820] dark:text-[#00BF33]">{{ comparacio.resum.ok }}</div>
              <div class="text-xs font-medium text-[#007820] dark:text-[#33EE66]">Coincideix</div>
            </div>
            <div class="rounded-lg bg-blue-50 p-3 text-center dark:bg-blue-950/20">
              <div class="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{{ comparacio.resum.diferentProf }}</div>
              <div class="text-xs font-medium text-blue-600 dark:text-blue-400">Prof diferent</div>
            </div>
            <div class="rounded-lg bg-[#FF8040]/10 p-3 text-center dark:bg-[#FF8040]/5">
              <div class="text-2xl font-extrabold text-[#CC5020] dark:text-[#FF8040]">{{ comparacio.resum.noTrobat }}</div>
              <div class="text-xs font-medium text-[#CC5020] dark:text-[#FF9060]">No a l'app</div>
            </div>
            <div class="rounded-lg bg-amber-50 p-3 text-center dark:bg-amber-950/20">
              <div class="text-2xl font-extrabold text-amber-700 dark:text-amber-300">{{ comparacio.resum.diferentHores }}</div>
              <div class="text-xs font-medium text-amber-600 dark:text-amber-400">Hores diferents</div>
            </div>
            <div class="rounded-lg bg-orange-50 p-3 text-center dark:bg-orange-950/20">
              <div class="text-2xl font-extrabold text-orange-700 dark:text-orange-300">{{ comparacio.resum.senseProfGpu }}</div>
              <div class="text-xs font-medium text-orange-600 dark:text-orange-400">Sense prof GPU</div>
            </div>
            <div class="rounded-lg bg-purple-50 p-3 text-center dark:bg-purple-950/20">
              <div class="text-2xl font-extrabold text-purple-700 dark:text-purple-300">{{ comparacio.resum.senseProfApp }}</div>
              <div class="text-xs font-medium text-purple-600 dark:text-purple-400">Sense prof App</div>
            </div>
            <div class="rounded-lg bg-rose-50 p-3 text-center dark:bg-rose-950/20">
              <div class="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{{ comparacio.resum.senseEntrada }}</div>
              <div class="text-xs font-medium text-rose-600 dark:text-rose-400">No al GPU002</div>
            </div>
          </div>

          <!-- Filter buttons -->
          <div class="mt-4 flex flex-wrap gap-2">
            <button
              v-for="f in filtres"
              :key="f.valor"
              @click="filtreActiu = f.valor"
              :class="[
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                filtreActiu === f.valor
                  ? 'bg-[#0024B6] text-white dark:bg-[#3355CC]'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600',
              ]"
            >
              {{ f.etiqueta }} ({{ f.valor === 'tots' ? comparacio.entrades.length : comparacio.entrades.filter((e) => e.estat === f.valor).length }})
            </button>
          </div>

          <!-- Comparison table -->
          <div class="mt-3 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table class="w-full min-w-[640px] text-xs">
              <thead>
                <tr class="bg-slate-50 text-left dark:bg-gray-900">
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">#</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Classe GPU</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Matèria GPU</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Prof GPU</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Classe App</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Prof App</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">H</th>
                  <th class="px-3 py-2 font-semibold text-slate-600 dark:text-slate-400">Estat</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                <tr
                  v-for="entrada in entradesFiltrades"
                  :key="entrada.num"
                  :class="estatRowClass(entrada.estat)"
                >
                  <td class="px-3 py-2 font-mono text-slate-500">{{ entrada.num }}</td>
                  <td class="px-3 py-2 font-mono font-semibold text-slate-800 dark:text-slate-200">{{ entrada.classeGpu }}</td>
                  <td class="px-3 py-2 font-mono text-slate-700 dark:text-slate-300">{{ entrada.materiaGpu }}</td>
                  <td class="px-3 py-2">
                    <span v-if="entrada.profGpu" class="font-mono text-slate-700 dark:text-slate-300">{{ entrada.profGpu }}</span>
                    <span v-if="entrada.profNomGpu && entrada.profNomGpu !== entrada.profGpu" class="ml-1 text-slate-400 dark:text-slate-500">{{ entrada.profNomGpu }}</span>
                    <span v-if="!entrada.profGpu" class="text-slate-400">—</span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="entrada.classeApp" class="text-slate-700 dark:text-slate-300">
                      {{ entrada.classeApp.curs }} {{ entrada.classeApp.grup }}
                    </span>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                  <td class="px-3 py-2">
                    <span v-if="entrada.profNomApp" class="text-slate-700 dark:text-slate-300">
                      {{ entrada.profNomApp }}
                      <span v-if="entrada.profCodeApp" class="ml-1 font-mono text-slate-400">({{ entrada.profCodeApp }})</span>
                    </span>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                  <td class="px-3 py-2 text-center">
                    <span v-if="entrada.classeApp && Number(entrada.horesGpu) !== Number(entrada.classeApp.hores)" class="font-semibold text-amber-700 dark:text-amber-300">
                      {{ entrada.horesGpu }}/{{ entrada.classeApp.hores }}
                    </span>
                    <span v-else>{{ entrada.horesGpu }}</span>
                  </td>
                  <td class="px-3 py-2">
                    <span :class="['rounded px-1.5 py-0.5 text-xs font-bold', estatBadgeClass(entrada.estat)]">
                      {{ estatEtiqueta(entrada.estat) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!entradesFiltrades.length">
                  <td colspan="8" class="px-3 py-4 text-center text-slate-400 dark:text-slate-500">Cap entrada per al filtre seleccionat.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- App classes not in GPU002 -->
          <div v-if="comparacio.senseEntrada.length" class="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950/20">
            <h5 class="text-sm font-bold text-rose-900 dark:text-rose-200">
              Lliçons de l'app no trobades al GPU002 ({{ comparacio.senseEntrada.length }})
            </h5>
            <div class="mt-2 max-h-48 space-y-1 overflow-auto">
              <div
                v-for="(c, i) in comparacio.senseEntrada"
                :key="i"
                class="rounded bg-white px-3 py-1.5 text-xs text-rose-800 dark:bg-gray-900 dark:text-rose-300"
              >
                <span class="font-mono font-semibold">{{ c.curs }} {{ c.grup }}</span>
                · {{ c.materia }} · {{ c.hores }}h
                · {{ c.professorAssignat || c.professors?.[0] || '—' }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>

  <!-- Modal confirmació esborra mapeig -->
  <div
    v-if="confirmarEsborra"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    @click.self="confirmarEsborra = false"
  >
    <div class="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900">
      <h4 class="text-lg font-semibold text-slate-900 dark:text-white">Esborra mapeig</h4>
      <p class="mt-2 text-sm text-slate-600 dark:text-slate-300">
        S'esborrarà tot el mapeig guardat per a aquest curs. Hauràs de tornar a assignar les correspondències manualment.
      </p>
      <div class="mt-4 flex justify-end gap-3">
        <button
          @click="confirmarEsborra = false"
          class="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-gray-800"
        >
          Cancel·lar
        </button>
        <button
          @click="esborraMapeig"
          class="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Esborra
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import SelectBuscador from './SelectBuscador.vue';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  descarregarFitxerUntis,
  descarregarTotsElsFitxersUntis,
  prepararExportUntis,
  compararAmbGpu002,
  previsualitzarMapeigGestib,
  clauOverride,
} from '../services/untisExport';
import { useCursStore } from '../stores/curs';
import { useToastStore } from '../stores/toast';

const cursStore = useCursStore();
const toast = useToastStore();

const carregant = ref(false);
const error = ref('');
const exportacio = ref(null);
const referenciaGpu002Text = ref('');
const referenciaGestibXmlText = ref('');
const gestibXmlNom = ref('');
const gpu002ReferenciaNom = ref('');
const simular = ref(true);

// Mapeig GestIB
const totes = ref([]);
const analitzant = ref(false);
const mapeigManual = ref({});
const gestibActual = ref(null);
const filtreMapateg = ref('totes');

const totesMateriesOpcions = computed(() => {
  if (!gestibActual.value?.materies) return [];
  return gestibActual.value.materies
    .map((m) => ({ codiUntis: m.codiUntis, label: `${m.codiUntis} · ${m.descripcio}`, cursDescripcio: m.cursDescripcio || '' }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

const totesActivitatsOpcions = computed(() => {
  if (!gestibActual.value?.activitatsMap) return [];
  return [...gestibActual.value.activitatsMap.values()]
    .map((a) => ({ codiUntis: a.codiUntis, label: `${a.codiUntis} · ${a.descripcio.replace(/^\*/, '').trim()}`, cursDescripcio: '' }))
    .sort((a, b) => a.codiUntis.localeCompare(b.codiUntis));
});

function codiActualMapeig(m) {
  return mapeigManual.value[m.clau] || m.autoCodiUntis || '';
}

function estatMapeigActual(m) {
  if (mapeigManual.value[m.clau]) return 'manual';
  return m.estat;
}

function estatMapeigBadgeClass(m) {
  const estat = estatMapeigActual(m);
  if (estat === 'manual') return 'bg-[#0024B6]/10 text-[#0024B6] dark:bg-[#0024B6]/20 dark:text-blue-300';
  if (estat === 'autoMatch') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (estat === 'autoGpu002') return 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300';
  return 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-300';
}

function estatMapeigEtiqueta(m) {
  const estat = estatMapeigActual(m);
  if (estat === 'manual') return 'Manual';
  if (estat === 'autoMatch') return 'Auto';
  if (estat === 'autoGpu002') return 'GPU002';
  return 'Pendent';
}

function opcionsPerClau(m) {
  const pool = m.esActivitat ? totesActivitatsOpcions.value : totesMateriesOpcions.value;
  const suggeritsSet = new Set((m.candidats || []).map((c) => c.codiUntis));
  const suggerits = (m.candidats || []).map((c) => ({
    value: c.codiUntis,
    nom: c.label.replace(/^[A-Z0-9-]+\s*·\s*/, '').trim(),
    suggerit: true,
  }));
  const rest = pool
    .filter((item) => !suggeritsSet.has(item.codiUntis))
    .map((item) => ({
      value: item.codiUntis,
      nom: [item.label.replace(/^[A-Z0-9-]+\s*·\s*/, '').trim(), item.cursDescripcio].filter(Boolean).join(' — '),
      suggerit: false,
    }));
  return [...suggerits, ...rest];
}

const pendentsCount = computed(() => totes.value.filter((m) => !codiActualMapeig(m)).length);
const resoltesCount = computed(() => totes.value.filter((m) => codiActualMapeig(m)).length);

const classesFiltrades = computed(() => {
  if (filtreMapateg.value === 'pendents') return totes.value.filter((m) => !codiActualMapeig(m));
  if (filtreMapateg.value === 'resoltes') return totes.value.filter((m) => codiActualMapeig(m));
  return totes.value;
});

const MAPEIG_DOC = 'untis_mapeig';
const mapeigRef = (cursId) => doc(db, 'cursos', cursId, 'config', MAPEIG_DOC);

watch(() => cursStore.cursActiuId, async (cursId) => {
  if (!cursId) { mapeigManual.value = {}; return; }
  try {
    const snap = await getDoc(mapeigRef(cursId));
    if (snap.exists()) {
      mapeigManual.value = snap.data().overrides || {};
      return;
    }
    const legacySnap = await getDoc(doc(db, 'config', MAPEIG_DOC));
    const legacyMapeig = legacySnap.exists() ? (legacySnap.data()[cursId] || {}) : {};
    mapeigManual.value = legacyMapeig;
    if (Object.keys(legacyMapeig).length) {
      await setDoc(mapeigRef(cursId), { overrides: legacyMapeig }, { merge: true });
    }
  } catch {
    mapeigManual.value = {};
  }
}, { immediate: true });

const confirmarEsborra = ref(false);

async function esborraMapeig() {
  confirmarEsborra.value = false;
  mapeigManual.value = {};
  try {
    await setDoc(
      mapeigRef(cursStore.cursActiuId),
      { overrides: {} },
      { merge: true }
    );
    toast.ok('Mapeig esborrat.');
  } catch (err) {
    console.error('Error esborrant mapeig:', err);
    toast.error('Error esborrant el mapeig.');
  }
}

async function assignarOverride(clau, codiUntis) {
  if (codiUntis) {
    mapeigManual.value = { ...mapeigManual.value, [clau]: codiUntis };
  } else {
    const { [clau]: _, ...rest } = mapeigManual.value;
    mapeigManual.value = rest;
  }
  try {
    await setDoc(
      mapeigRef(cursStore.cursActiuId),
      { overrides: mapeigManual.value },
      { merge: true }
    );
  } catch (err) {
    console.error('Error guardant mapeig:', err);
    toast.error('Error guardant el mapeig de matèries.');
  }
}

const filtreVistaPrevia = ref('');
const mostrarVistaPrevia = ref(false);

const gpu002ComparacioText = ref('');
const gpu002ComparacioNom = ref('');
const comparacioCarregant = ref(false);
const comparacioError = ref('');
const comparacio = ref(null);
const filtreActiu = ref('tots');

const filtres = [
  { valor: 'tots', etiqueta: 'Tots' },
  { valor: 'ok', etiqueta: 'Coincideix' },
  { valor: 'diferentProf', etiqueta: 'Prof diferent' },
  { valor: 'diferentHores', etiqueta: 'Hores diferents' },
  { valor: 'noTrobat', etiqueta: 'No a l\'app' },
  { valor: 'senseProfGpu', etiqueta: 'Sense prof GPU' },
  { valor: 'senseProfApp', etiqueta: 'Sense prof App' },
];

const entradesFiltrades = computed(() => {
  if (!comparacio.value) return [];
  if (filtreActiu.value === 'tots') return comparacio.value.entrades;
  return comparacio.value.entrades.filter((e) => e.estat === filtreActiu.value);
});

const gpu002Fitxer = computed(() =>
  exportacio.value?.fitxers?.find((fitxer) => fitxer.nom === 'GPU002.TXT') || null
);

const vistaPreviaFiltrada = computed(() => {
  const llista = exportacio.value?.vistaPrevia || [];
  const filtre = normalitzarFiltre(filtreVistaPrevia.value);
  if (!filtre) return llista;

  return llista.filter((item) =>
    normalitzarFiltre([
      item.numero,
      item.curs,
      item.grup,
      item.codiGrups,
      item.materia,
      item.codiMateria,
      item.tipus,
      ...(item.professors || []),
      ...(item.codisProfessors || []),
    ].join(' ')).includes(filtre)
  );
});

function normalitzarFiltre(valor) {
  return (valor || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

async function generar() {
  carregant.value = true;
  error.value = '';
  filtreVistaPrevia.value = '';
  mostrarVistaPrevia.value = false;
  try {
    exportacio.value = await prepararExportUntis(cursStore.cursActiuId, {
      referenciaGpu002Text: referenciaGpu002Text.value,
      referenciaGestibXmlText: referenciaGestibXmlText.value,
      simular: simular.value,
      overrides: Object.keys(mapeigManual.value).length ? mapeigManual.value : null,
    });
  } catch (err) {
    console.error('Error generant exportació Untis:', err);
    error.value = `No s'han pogut generar els fitxers per a Untis: ${err.message || err}`;
  } finally {
    carregant.value = false;
  }
}

async function carregarGestibXml(event) {
  const fitxer = event.target.files?.[0];
  referenciaGestibXmlText.value = '';
  gestibXmlNom.value = '';
  exportacio.value = null;
  filtreVistaPrevia.value = '';
  mostrarVistaPrevia.value = false;
  totes.value = [];
  error.value = '';
  if (!fitxer) return;
  try {
    referenciaGestibXmlText.value = await fitxer.text();
    gestibXmlNom.value = fitxer.name;
    await analitzarMapeig();
  } catch (err) {
    console.error('Error llegint XML de GestIB:', err);
    error.value = 'No s\'ha pogut llegir l\'XML de GestIB.';
  }
}

async function carregarGpu002Referencia(event) {
  const fitxer = event.target.files?.[0];
  referenciaGpu002Text.value = '';
  gpu002ReferenciaNom.value = '';
  exportacio.value = null;
  filtreVistaPrevia.value = '';
  mostrarVistaPrevia.value = false;
  error.value = '';
  if (!fitxer) return;
  try {
    referenciaGpu002Text.value = await fitxer.text();
    gpu002ReferenciaNom.value = fitxer.name;
    if (referenciaGestibXmlText.value) {
      await analitzarMapeig();
    }
  } catch (err) {
    console.error('Error llegint GPU002 de referència:', err);
    error.value = 'No s\'ha pogut llegir el GPU002.TXT.';
  }
}

async function analitzarMapeig() {
  if (!referenciaGestibXmlText.value) return;
  analitzant.value = true;
  totes.value = [];
  try {
    const resultat = await previsualitzarMapeigGestib(
      cursStore.cursActiuId,
      referenciaGestibXmlText.value,
      referenciaGpu002Text.value,
    );
    gestibActual.value = resultat.gestib;
    totes.value = resultat.classes;

    const nousMapeigs = {};
    for (const m of resultat.classes) {
      if (m.estat === 'autoGpu002' && !mapeigManual.value[m.clau]) {
        nousMapeigs[m.clau] = m.autoCodiUntis;
      }
    }
    if (Object.keys(nousMapeigs).length) {
      mapeigManual.value = { ...mapeigManual.value, ...nousMapeigs };
      try {
        await setDoc(
          mapeigRef(cursStore.cursActiuId),
          { overrides: mapeigManual.value },
          { merge: true }
        );
      } catch (saveErr) {
        console.error('Error guardant mapeig automàtic:', saveErr);
      }
    }
  } catch (e) {
    console.error('Error analitzant mapeig GestIB:', e);
    error.value = e.message || 'Error analitzant mapeig GestIB';
  } finally {
    analitzant.value = false;
  }
}

async function carregarGpu002Comparar(event) {
  const fitxer = event.target.files?.[0];
  gpu002ComparacioText.value = '';
  gpu002ComparacioNom.value = '';
  comparacio.value = null;
  comparacioError.value = '';
  if (!fitxer) return;
  try {
    gpu002ComparacioText.value = await fitxer.text();
    gpu002ComparacioNom.value = fitxer.name;
  } catch (err) {
    comparacioError.value = 'No s\'ha pogut llegir el fitxer.';
  }
}

async function comparar() {
  if (!gpu002ComparacioText.value || comparacioCarregant.value) return;
  comparacioCarregant.value = true;
  comparacioError.value = '';
  filtreActiu.value = 'tots';
  try {
    comparacio.value = await compararAmbGpu002(cursStore.cursActiuId, gpu002ComparacioText.value);
  } catch (err) {
    console.error('Error comparant GPU002:', err);
    comparacioError.value = 'Error en comparar: ' + err.message;
  } finally {
    comparacioCarregant.value = false;
  }
}

function descarregar(fitxer) {
  descarregarFitxerUntis(fitxer);
}

function descarregarTots() {
  descarregarTotsElsFitxersUntis(exportacio.value.fitxers);
}

function obrirVistaPreviaDescarga() {
  if (!exportacio.value?.vistaPrevia?.length) {
    descarregarGpu002();
    return;
  }
  mostrarVistaPrevia.value = true;
}

function descarregarGpu002() {
  if (gpu002Fitxer.value) descarregarFitxerUntis(gpu002Fitxer.value);
}

function resumClasse(classe) {
  return [
    classe.curs,
    classe.grup,
    classe.materia,
    classe.hores ? `${classe.hores} h` : '',
    classe.professorAssignat || '',
  ].filter(Boolean).join(' | ');
}

function estatRowClass(estat) {
  const base = 'transition-colors';
  if (estat === 'ok') return `${base} bg-[#00BF33]/5 dark:bg-[#00BF33]/5`;
  if (estat === 'diferentProf') return `${base} bg-blue-50 dark:bg-blue-950/20`;
  if (estat === 'diferentHores') return `${base} bg-amber-50 dark:bg-amber-950/20`;
  if (estat === 'noTrobat') return `${base} bg-[#FF8040]/10 dark:bg-[#FF8040]/5`;
  if (estat === 'senseProfGpu') return `${base} bg-orange-50 dark:bg-orange-950/20`;
  if (estat === 'senseProfApp') return `${base} bg-purple-50 dark:bg-purple-950/20`;
  return base;
}

function estatBadgeClass(estat) {
  if (estat === 'ok') return 'bg-[#00BF33]/20 text-[#007820] dark:text-[#33EE66]';
  if (estat === 'diferentProf') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  if (estat === 'diferentHores') return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
  if (estat === 'noTrobat') return 'bg-[#FF8040]/20 text-[#CC5020] dark:text-[#FF9060]';
  if (estat === 'senseProfGpu') return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
  if (estat === 'senseProfApp') return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
  return 'bg-slate-100 text-slate-700';
}

function estatEtiqueta(estat) {
  const etiquetes = {
    ok: 'OK',
    diferentProf: 'Prof ≠',
    diferentHores: 'Hores ≠',
    noTrobat: 'No trobat',
    senseProfGpu: 'Sense prof GPU',
    senseProfApp: 'Sense prof App',
  };
  return etiquetes[estat] || estat;
}
</script>
