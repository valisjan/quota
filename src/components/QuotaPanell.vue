<template>
  <div class="quota-panell" :class="{ 'quota-panell-complet': pantallaCompleta }">
    <!-- Capçalera: totals del centre, cerca i accions -->
    <section class="quota-capcalera card dark:border-slate-700 dark:bg-gray-800">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-lg font-bold text-slate-950 dark:text-white">
            Quota del curs {{ cursStore.cursActiu?.nom || cursStore.cursActiuId }}
          </h3>
          <p class="text-sm text-slate-600 dark:text-slate-400">
            Les classes de cada departament. Arrossega una fila a un altre departament (o a la tira) per moure-la.
            Toca els departaments de la tira per comparar-los de costat.
          </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <span v-if="desant" class="text-xs font-semibold text-slate-500" role="status">Desant...</span>
          <button type="button" class="quota-boto" :aria-pressed="pantallaCompleta" @click="alternarPantallaCompleta">
            {{ pantallaCompleta ? 'Surt de la pantalla completa' : 'Pantalla completa' }}
          </button>
        </div>
      </div>

      <dl class="quota-totals" data-testid="quota-totals">
        <div><dt>Classes</dt><dd>{{ totals.classes }}</dd></div>
        <div><dt>Hores</dt><dd>{{ formatDecimal(totals.hores, 2) }}</dd></div>
        <div><dt>Places (h/{{ HORES_PLACA }})</dt><dd>{{ formatDecimal(totals.places) }}</dd></div>
        <div><dt>Professorat</dt><dd>{{ totals.professors }}<span class="quota-totals-detall"> · {{ formatDecimal(totals.capacitat) }} h</span></dd></div>
        <div><dt>Balanç</dt><dd :class="`quota-balanc-${estatBalanc(totals)}`">{{ textBalanc(totals) }}</dd></div>
      </dl>

      <div class="mt-3 flex flex-wrap items-center gap-2">
        <input
          v-model="cerca"
          type="search"
          class="form-input max-w-xs py-1.5 text-sm"
          placeholder="Cerca matèria, curs, grup o tipus"
          aria-label="Cerca a la quota"
        />
        <span v-if="seleccioActiva.length" class="text-sm text-slate-700 dark:text-slate-300">
          Comparant {{ seleccioActiva.length }} {{ seleccioActiva.length === 1 ? 'departament' : 'departaments' }}
          <button type="button" class="ml-1 font-semibold text-primary hover:underline" @click="seleccio = []">Mostra'ls tots</button>
        </span>
        <span v-if="darrerEsborrat" class="quota-desfer" role="status">
          S'ha esborrat «{{ darrerEsborrat.materia }}» de {{ darrerEsborrat.departament }}.
          <button type="button" class="font-semibold underline" @click="desferEsborrat">Desfés</button>
        </span>
      </div>

      <!-- Correspondència amb el catàleg de GestIB del curs (el que després va a Untis) -->
      <div class="quota-gestib" data-testid="quota-gestib">
        <template v-if="cataleg">
          <span>
            {{ infoGestib?.anyGestib ? `GestIB ${infoGestib.anyGestib}:` : 'GestIB:' }}
            <strong>{{ resumGestib.ok }}</strong> de {{ resumGestib.total }} files amb correspondència
          </span>
          <span v-if="resumGestib.trencat" class="quota-gestib-avis">{{ resumGestib.trencat }} per revisar</span>
          <button v-if="editable && resumGestib.sense" type="button" class="quota-boto" @click="obrirPropostes">
            Proposa correspondències ({{ resumGestib.sense }})
          </button>
          <label v-if="resumGestib.ok < resumGestib.total" class="inline-flex items-center gap-1.5">
            <input v-model="nomesPendentsGestib" type="checkbox" class="h-4 w-4 accent-primary" />
            Només les que falten
          </label>
          <label v-if="editable" class="quota-enllac cursor-pointer" title="Canvia l'XML de GestIB d'aquest curs">
            Canvia l'XML<input type="file" accept=".xml,text/xml" class="sr-only" @change="carregarXml" />
          </label>
        </template>
        <span v-else-if="carregantGestib">Carregant el catàleg de GestIB...</span>
        <template v-else>
          <span>
            Falta el catàleg de GestIB d'aquest curs: l'XML <em>exportacioDadesHoraris</em>, amb les places, matèries
            i activitats que s'impartiran. Cada fila de la quota s'hi relaciona i és el que després va a Untis.
          </span>
          <label v-if="editable" class="quota-boto cursor-pointer">
            Carrega l'XML de GestIB<input type="file" accept=".xml,text/xml" class="sr-only" data-testid="xml-gestib" @change="carregarXml" />
          </label>
        </template>
      </div>
    </section>

    <!-- Curs sense classes -->
    <section v-if="carregat && !classes.length" class="card p-5 dark:border-slate-700 dark:bg-gray-800">
      <p class="font-semibold text-slate-900 dark:text-white">Aquest curs encara no té quota.</p>
      <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Copia la quota d'un altre curs (sense el professorat assignat) i ajusta-la, o afegeix les files a cada departament.
      </p>
      <div v-if="cursosOrigen.length" class="mt-3 flex flex-wrap items-end gap-2">
        <label class="text-sm font-medium text-slate-700 dark:text-slate-200">
          Curs d'origen
          <select v-model="cursOrigen" class="form-input mt-1 block">
            <option v-for="curs in cursosOrigen" :key="curs.id" :value="curs.id">{{ curs.nom || curs.id }}</option>
          </select>
        </label>
        <button
          type="button"
          :disabled="!cursOrigen || desant > 0"
          class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-dark disabled:opacity-50"
          @click="copiarCurs"
        >
          Copia la quota
        </button>
      </div>
    </section>

    <p
      v-if="cursStore.esBloqueig"
      class="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-200"
    >
      El curs està bloquejat: la quota només es pot consultar.
    </p>

    <!-- Tira de departaments: resum de tots i selecció per comparar -->
    <nav class="quota-tira" aria-label="Departaments de la quota">
      <button
        v-for="resum in resums"
        :key="resum.nom"
        type="button"
        class="quota-xip"
        :class="[
          `quota-xip-${estatBalanc(resum)}`,
          { 'quota-xip-triat': seleccioActiva.includes(resum.nom), 'quota-xip-desti': destiArrossegament === resum.nom },
        ]"
        :aria-pressed="seleccioActiva.includes(resum.nom)"
        :title="`${resum.nom}: ${formatDecimal(resum.hores, 2)} h, ${formatDecimal(resum.places)} places, professorat ${formatProfessorat(resum)}. ${textBalanc(resum)}.`"
        :data-xip="resum.nom"
        @click="alternarSeleccio(resum.nom)"
        @dragover="sobreDesti(resum.nom, $event)"
        @dragleave="sortirDesti(resum.nom)"
        @drop.prevent="deixarA(resum.nom)"
      >
        <span class="quota-xip-nom">{{ resum.nom }}</span>
        <span class="quota-xip-xifres">
          {{ formatDecimal(resum.hores, 2) }} h · {{ formatDecimal(resum.places) }} pl.
          <span class="quota-xip-balanc">{{ textBalancCurt(resum) }}</span>
        </span>
      </button>
    </nav>

    <p v-if="!carregat" class="px-5 py-8 text-center text-sm text-slate-500">Carregant...</p>
    <p v-else-if="cerca && !visibles.length" class="px-5 py-8 text-center text-sm text-slate-500">Cap classe coincideix amb la cerca.</p>

    <!-- Targetes de departament -->
    <div class="quota-graella">
      <article
        v-for="resum in visibles"
        :key="resum.nom"
        class="quota-targeta"
        :class="{ 'quota-targeta-desti': destiArrossegament === resum.nom }"
        :data-departament="resum.nom"
        @dragover="sobreDesti(resum.nom, $event)"
        @dragleave="sortirDesti(resum.nom, $event)"
        @drop.prevent="deixarA(resum.nom)"
        @paste="enganxar(resum.nom, $event)"
      >
        <header class="quota-targeta-cap">
          <h4 :title="resum.nom">{{ resum.nom }}</h4>
          <div class="quota-xifres">
            <span><strong>{{ formatDecimal(resum.hores, 2) }}</strong> h</span>
            <span><strong>{{ formatDecimal(resum.places) }}</strong> places</span>
            <span title="Professorat actiu amb aquest departament principal (completa + parcial)">Prof. <strong>{{ formatProfessorat(resum) }}</strong></span>
            <span class="quota-balanc" :class="`quota-balanc-${estatBalanc(resum)}`">{{ textBalanc(resum) }}</span>
          </div>
        </header>

        <table class="quota-taula">
          <colgroup>
            <col v-if="editable" class="w-[1.1rem]" />
            <col class="w-[3.4rem]" />
            <col class="w-[3.3rem]" />
            <col />
            <col class="w-[2.5rem]" />
            <col class="w-[3rem]" />
            <col v-if="cataleg" class="w-[1.5rem]" />
            <col v-if="editable" class="w-[1.6rem]" />
          </colgroup>
          <thead>
            <tr>
              <th v-if="editable"><span class="sr-only">Mou</span></th>
              <th>Curs</th>
              <th>Grup</th>
              <th>Matèria</th>
              <th class="text-right">H</th>
              <th>Tipus</th>
              <th v-if="cataleg" title="Correspondència amb GestIB">G</th>
              <th v-if="editable"><span class="sr-only">Accions</span></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="classe in filtrades(resum)"
              :key="classe.id"
              :data-classe="classe.id"
              :class="{ 'quota-fila-arrossegada': arrossegant?.id === classe.id }"
            >
              <td
                v-if="editable"
                class="quota-asa"
                draggable="true"
                title="Arrossega per moure a un altre departament"
                @dragstart="iniciarArrossegament(classe, $event)"
                @dragend="acabarArrossegament"
              >⋮⋮</td>
              <td>
                <input
                  class="quota-cela dark:bg-transparent"
                  data-col="curs"
                  :value="classe.curs"
                  :disabled="!editable || esMulticurs(classe)"
                  :aria-label="`Curs de ${classe.materia}`"
                  @change="desarCamp(classe, 'curs', $event)"
                  @keydown.enter.prevent="seguentFila($event)"
                />
              </td>
              <td>
                <input
                  class="quota-cela dark:bg-transparent"
                  data-col="grup"
                  :value="classe.grup"
                  :disabled="!editable || esMulticurs(classe)"
                  :aria-label="`Grup de ${classe.materia}`"
                  @change="desarCamp(classe, 'grup', $event)"
                  @keydown.enter.prevent="seguentFila($event)"
                />
              </td>
              <td>
                <input
                  class="quota-cela dark:bg-transparent"
                  data-col="materia"
                  :value="classe.materia"
                  :title="esMulticurs(classe) ? `${classe.materia} (multicurs: ${classe.curs})` : classe.materia"
                  :disabled="!editable || esMulticurs(classe)"
                  :aria-label="`Matèria (${classe.curs} ${classe.grup})`"
                  @change="desarCamp(classe, 'materia', $event)"
                  @keydown.enter.prevent="seguentFila($event)"
                />
              </td>
              <td>
                <input
                  class="quota-cela dark:bg-transparent text-right tabular-nums"
                  data-col="hores"
                  inputmode="decimal"
                  :value="formatDecimal(classe.hores, 2)"
                  :disabled="!editable"
                  :aria-label="`Hores de ${classe.materia}`"
                  @change="desarCamp(classe, 'hores', $event)"
                  @keydown.enter.prevent="seguentFila($event)"
                />
              </td>
              <td>
                <span class="quota-tipus" :class="{ 'quota-tipus-buit': !classe.tipus }" :title="etiquetaTipus(classe.tipus)">
                  {{ classe.tipus || '—' }}
                  <select
                    :value="classe.tipus || ''"
                    :disabled="!editable"
                    class="dark:bg-transparent"
                    :aria-label="`Tipus de ${classe.materia}`"
                    @change="desarCamp(classe, 'tipus', $event)"
                  >
                    <option v-for="tipus in opcionsTipus(classe.tipus)" :key="tipus.codi" :value="tipus.codi">
                      {{ tipus.codi ? `${tipus.codi} · ${tipus.etiqueta}` : tipus.etiqueta }}
                    </option>
                  </select>
                </span>
              </td>
              <td v-if="cataleg" class="text-center">
                <button
                  type="button"
                  class="quota-gestib-estat"
                  :class="`quota-gestib-${estatGestib(classe).estat}`"
                  :title="titolGestib(classe)"
                  :aria-label="`Correspondència GestIB de ${classe.materia}`"
                  :data-estat-gestib="estatGestib(classe).estat"
                  @click="obrirEditorGestib(classe)"
                >{{ SIMBOL_GESTIB[estatGestib(classe).estat] }}</button>
              </td>
              <td v-if="editable" class="text-center">
                <button
                  type="button"
                  class="quota-mes"
                  :aria-label="`Mou o esborra ${classe.materia}`"
                  @click="obrirMenu(classe, $event)"
                >⋯</button>
              </td>
            </tr>

            <!-- Fila nova: Enter l'afegeix. També s'hi poden enganxar files d'un full de càlcul. -->
            <tr v-if="editable && esborranys[resum.nom]" class="quota-fila-nova" data-nova>
              <td></td>
              <td>
                <input v-model="esborranys[resum.nom].curs" class="quota-cela dark:bg-transparent" data-col="curs" placeholder="Curs" :aria-label="`Curs nou a ${resum.nom}`" @keydown.enter.prevent="afegir(resum.nom, $event)" />
              </td>
              <td>
                <input v-model="esborranys[resum.nom].grup" class="quota-cela dark:bg-transparent" data-col="grup" placeholder="Grup" :aria-label="`Grup nou a ${resum.nom}`" @keydown.enter.prevent="afegir(resum.nom, $event)" />
              </td>
              <td>
                <input v-model="esborranys[resum.nom].materia" class="quota-cela dark:bg-transparent" data-col="materia" placeholder="Matèria nova" list="quota-noms-gestib" :aria-label="`Matèria nova a ${resum.nom}`" @keydown.enter.prevent="afegir(resum.nom, $event)" />
              </td>
              <td>
                <input v-model="esborranys[resum.nom].hores" class="quota-cela dark:bg-transparent text-right" data-col="hores" inputmode="decimal" placeholder="h" :aria-label="`Hores noves a ${resum.nom}`" @keydown.enter.prevent="afegir(resum.nom, $event)" />
              </td>
              <td>
                <span class="quota-tipus" :class="{ 'quota-tipus-buit': !esborranys[resum.nom].tipus }">
                  {{ esborranys[resum.nom].tipus || '—' }}
                  <select v-model="esborranys[resum.nom].tipus" class="dark:bg-transparent" :aria-label="`Tipus nou a ${resum.nom}`">
                    <option v-for="tipus in TIPUS_QUOTA" :key="tipus.codi" :value="tipus.codi">
                      {{ tipus.codi ? `${tipus.codi} · ${tipus.etiqueta}` : tipus.etiqueta }}
                    </option>
                  </select>
                </span>
              </td>
              <td v-if="cataleg"></td>
              <td class="text-center">
                <button type="button" class="quota-mes" :aria-label="`Afegeix la fila a ${resum.nom}`" @click="afegir(resum.nom, $event)">+</button>
              </td>
            </tr>
          </tbody>
        </table>
        <p v-if="!resum.classes.length && !editable" class="px-3 py-3 text-xs text-slate-500">Sense classes.</p>
      </article>
    </div>

    <datalist v-if="cataleg" id="quota-noms-gestib">
      <option v-for="nom in nomsCataleg" :key="nom" :value="nom" />
    </datalist>

    <!-- Menú d'una fila: moure-la a un altre departament o esborrar-la -->
    <div v-if="menu" class="fixed inset-0 z-[120]" @click="menu = null">
      <div
        class="quota-menu"
        role="menu"
        :style="{ top: `${menu.top}px`, left: `${menu.left}px` }"
        @click.stop
      >
        <p class="quota-menu-titol">{{ menu.classe.curs }} {{ menu.classe.grup }} · {{ menu.classe.materia }}</p>
        <p class="quota-menu-seccio">Mou a</p>
        <div class="max-h-60 overflow-y-auto">
          <button
            v-for="resum in resums.filter((item) => item.nom !== menu.classe.departament)"
            :key="resum.nom"
            type="button"
            role="menuitem"
            class="quota-menu-item"
            @click="moure(menu.classe, resum.nom); menu = null"
          >
            {{ resum.nom }}
          </button>
        </div>
        <button type="button" role="menuitem" class="quota-menu-item quota-menu-perill" @click="esborrar(menu.classe); menu = null">
          Esborra la fila
        </button>
      </div>
    </div>

    <!-- Correspondència d'una fila amb el catàleg de GestIB -->
    <div v-if="editor" class="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="editor = null">
      <div class="my-8 w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800" data-testid="editor-gestib">
        <h4 class="text-lg font-semibold text-slate-950 dark:text-white">
          {{ [editor.classe.curs, editor.classe.grup, editor.classe.materia].filter(Boolean).join(' · ') }}
        </h4>
        <p class="text-sm text-slate-600 dark:text-slate-400">
          {{ editor.classe.departament }} · {{ formatDecimal(editor.classe.hores, 2) }} h<template v-if="editor.classe.tipus"> · {{ etiquetaTipus(editor.classe.tipus) }}</template>
        </p>
        <p v-if="estatGestib(editor.classe).estat === 'trencat'" class="mt-2 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">
          {{ estatGestib(editor.classe).motiu }}
        </p>
        <div v-if="editor.proposta" class="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
          <span>
            Proposta ({{ editor.proposta.confianca === 'segura' ? 'segura' : 'cal revisar-la' }}):
            <strong>{{ editor.proposta.codis.map((codi) => descripcioGestib(editor.proposta.tipus, codi)).join(' + ') }}</strong>
          </span>
          <button v-if="editable" type="button" class="quota-boto" @click="aplicarPropostaEditor">Fes-la servir</button>
        </div>

        <div class="mt-3 flex flex-wrap items-center gap-2">
          <div class="inline-flex rounded-md border border-slate-200 p-0.5 dark:border-slate-600">
            <button
              v-for="opcio in TIPUS_CATALEG"
              :key="opcio.id"
              type="button"
              class="rounded px-3 py-1 text-sm font-semibold"
              :class="editor.tipus === opcio.id ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-300'"
              @click="canviarTipusEditor(opcio.id)"
            >{{ opcio.label }}</button>
          </div>
          <input v-model="editor.cerca" type="search" class="form-input max-w-xs py-1 text-sm" placeholder="Cerca al catàleg" aria-label="Cerca al catàleg de GestIB" />
          <label v-if="editor.tipus === 'materia' && editor.classe.curs" class="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-300">
            <input v-model="editor.totsCursos" type="checkbox" class="h-4 w-4 accent-primary" /> Tots els cursos
          </label>
        </div>

        <ul class="mt-2 max-h-80 overflow-y-auto rounded-md border border-slate-200 text-sm dark:border-slate-700">
          <li v-for="item in opcionsEditor" :key="item.codi" class="border-b border-slate-100 last:border-0 dark:border-slate-700">
            <label class="flex cursor-pointer items-start gap-2 px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-gray-700/50">
              <input
                :type="editor.tipus === 'materia' ? 'checkbox' : 'radio'"
                name="gestib-activitat"
                class="mt-0.5 h-4 w-4 accent-primary"
                :checked="editor.seleccio.includes(item.codi)"
                :disabled="!editable"
                @change="alternarSeleccioEditor(item.codi)"
              />
              <span class="min-w-0">
                <span class="block text-slate-900 dark:text-white">{{ item.nom }}</span>
                <span class="block text-xs text-slate-500">{{ item.detall }}</span>
              </span>
            </label>
          </li>
          <li v-if="!opcionsEditor.length" class="px-3 py-3 text-slate-500">Cap element del catàleg coincideix.</li>
        </ul>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            v-if="editable && editor.classe.gestib?.codis?.length"
            type="button"
            class="text-sm font-semibold text-rose-700 hover:underline dark:text-rose-300"
            @click="desarEditor(null)"
          >Treu la correspondència</button>
          <span v-else />
          <div class="flex gap-2">
            <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200" @click="editor = null">Tanca</button>
            <button
              v-if="editable"
              type="button"
              :disabled="!editor.seleccio.length"
              class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
              @click="desarEditor({ tipus: editor.tipus, codis: [...editor.seleccio] })"
            >Desa</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Revisió de les propostes per a totes les files sense correspondència -->
    <div v-if="revisio" class="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/40 p-4" @click.self="revisio = null">
      <div class="my-8 w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl dark:bg-gray-800" data-testid="revisio-gestib">
        <h4 class="text-lg font-semibold text-slate-950 dark:text-white">Correspondències proposades</h4>
        <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Les segures ja van marcades. Les altres, revisa-les: es poden marcar aquí o triar després a la fila (columna G).
          <template v-if="revisio.ambMapeig"> També es fan servir les correspondències manuals que s'havien fet a la pàgina Untis.</template>
        </p>
        <div v-for="grup in grupsRevisio" :key="grup.id" class="mt-4">
          <p class="text-sm font-bold uppercase tracking-wide" :class="grup.classe">{{ grup.titol }} ({{ grup.items.length }})</p>
          <ul class="mt-1 divide-y divide-slate-100 rounded-md border border-slate-200 text-sm dark:divide-slate-700 dark:border-slate-700">
            <li v-for="item in grup.items" :key="item.fila.id" class="px-3 py-1.5" :data-revisio="item.fila.id">
              <label class="flex items-start gap-2" :class="item.proposta ? 'cursor-pointer' : ''">
                <input v-if="item.proposta" v-model="item.triada" type="checkbox" class="mt-0.5 h-4 w-4 accent-primary" />
                <span class="min-w-0">
                  <span class="text-slate-900 dark:text-white">{{ [item.fila.curs, item.fila.grup, item.fila.materia].filter(Boolean).join(' · ') }}</span>
                  <span class="ml-1 text-xs text-slate-500">{{ item.fila.departament }}</span>
                  <span v-if="item.proposta" class="block text-xs text-slate-600 dark:text-slate-400">
                    → {{ item.proposta.codis.map((codi) => descripcioGestib(item.proposta.tipus, codi)).join(' + ') }}
                    <span class="text-slate-400">· {{ item.proposta.motiu }}</span>
                  </span>
                </span>
              </label>
            </li>
          </ul>
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button type="button" class="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200" @click="revisio = null">Tanca</button>
          <button
            type="button"
            :disabled="!triadesRevisio.length || desant > 0"
            class="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
            @click="aplicarRevisio"
          >Desa les marcades ({{ triadesRevisio.length }})</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue';
import { useCursStore } from '../stores/curs';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { subscriureProfessorat } from '../services/professorat';
import {
  analitzarMateriaGestib,
  codiActivitat,
  cursFila,
  cursMateriaGestib,
  esFilaActivitat,
  estatEnllac,
  proposarCorrespondencia,
  proposarCorrespondencies,
} from '../utils/gestibCorrespondencia';
import {
  actualitzarClasse,
  carregarCatalegGestib,
  desarCatalegGestib,
  desarCorrespondencies,
  llegirMapeigAntic,
  copiarQuotaDeCurs,
  crearClasses,
  esborrarClasse,
  restaurarClasse,
  subscriureClasses,
  subscriureDepartaments,
} from '../services/quota';
import {
  HORES_PLACA,
  TIPUS_QUOTA,
  campsClasse,
  canvisClasse,
  errorsClasse,
  etiquetaTipus,
  formatDecimal,
  formatProfessorat,
  llegirFilesEnganxades,
  llegirHores,
  resumDepartaments,
  teAssignacio,
  totalsQuota,
} from '../utils/quota';

const cursStore = useCursStore();
const authStore = useAuthStore();
const toast = useToastStore();

const CLAU_SELECCIO = 'quota_panell_seleccio';
const CLAU_PANTALLA = 'quota_panell_pantalla_completa';

function llegirLocal(clau, perDefecte) {
  try {
    const valor = localStorage.getItem(clau);
    return valor === null ? perDefecte : JSON.parse(valor);
  } catch {
    return perDefecte;
  }
}

function desarLocal(clau, valor) {
  try {
    localStorage.setItem(clau, JSON.stringify(valor));
  } catch {
    // Sense emmagatzematge (navegació privada): només es perd la preferència.
  }
}

const classes = ref([]);
const professors = ref([]);
const departaments = ref([]);
const carregat = ref(false);
const cerca = ref('');
const seleccio = ref(llegirLocal(CLAU_SELECCIO, []));
const pantallaCompleta = ref(Boolean(llegirLocal(CLAU_PANTALLA, false)));
const esborranys = reactive({});
const menu = ref(null);
const arrossegant = ref(null);
const destiArrossegament = ref('');
const darrerEsborrat = ref(null);
const desant = ref(0);
const cursOrigen = ref('');

// ─── Catàleg de GestIB del curs i correspondències ─────────────────────────────
const cataleg = ref(null);
const infoGestib = ref(null);
const carregantGestib = ref(false);
const mapeigAntic = ref(null);
const nomesPendentsGestib = ref(false);
const editor = ref(null);
const revisio = ref(null);
const SIMBOL_GESTIB = { ok: '✓', trencat: '!', sense: '·' };
const TIPUS_CATALEG = [{ id: 'materia', label: 'Matèries' }, { id: 'activitat', label: 'Activitats' }];
let temporitzadorDesfer = null;

const actor = computed(() => authStore.usuari || authStore.email || 'admin');
const editable = computed(() => !cursStore.esBloqueig);
const cursosOrigen = computed(() => (cursStore.cursos || []).filter((curs) => curs.id !== cursStore.cursActiuId));

const resums = computed(() => resumDepartaments(
  classes.value,
  professors.value,
  departaments.value.map((dep) => dep.nom),
));
const totals = computed(() => totalsQuota(resums.value));

const seleccioActiva = computed(() => seleccio.value.filter((nom) => resums.value.some((resum) => resum.nom === nom)));

const textCerca = computed(() => normalitzar(cerca.value));
function normalitzar(valor) {
  return String(valor || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function filtrades(resum) {
  const classesVisibles = nomesPendentsGestib.value && cataleg.value
    ? resum.classes.filter((classe) => estatGestib(classe).estat !== 'ok')
    : resum.classes;
  if (!textCerca.value) return classesVisibles;
  return classesVisibles.filter((classe) => normalitzar(
    [classe.curs, classe.grup, classe.materia, classe.tipus, etiquetaTipus(classe.tipus)].join(' '),
  ).includes(textCerca.value));
}

const visibles = computed(() => resums.value.filter((resum) => {
  if (seleccioActiva.value.length && !seleccioActiva.value.includes(resum.nom)) return false;
  if (textCerca.value || (nomesPendentsGestib.value && cataleg.value)) return filtrades(resum).length > 0;
  return true;
}));

// ─── Correspondència amb GestIB ─────────────────────────────────────────────────
const estatsGestib = computed(() => new Map(classes.value.map((classe) => [classe.id, estatEnllac(classe, cataleg.value)])));
function estatGestib(classe) {
  return estatsGestib.value.get(classe.id) || estatEnllac(classe, cataleg.value);
}

const resumGestib = computed(() => {
  const resum = { total: classes.value.length, ok: 0, trencat: 0, sense: 0 };
  estatsGestib.value.forEach(({ estat }) => { resum[estat] += 1; });
  return resum;
});

// Quan ja no en falta cap, el filtre «Només les que falten» deixaria el panell buit.
watch(() => resumGestib.value.ok === resumGestib.value.total, (completes) => {
  if (completes) nomesPendentsGestib.value = false;
});

function descripcioGestib(tipus, codi) {
  if (tipus === 'activitat') {
    return (cataleg.value?.activitats || []).find((activitat) => codiActivitat(activitat) === String(codi))?.descripcio || codi;
  }
  return (cataleg.value?.materies || []).find((materia) => materia.curta === codi)?.descripcio || codi;
}

function titolGestib(classe) {
  const { estat, motiu } = estatGestib(classe);
  if (estat !== 'ok') return `${motiu}. Clica per triar-la.`;
  return `GestIB: ${classe.gestib.codis.map((codi) => descripcioGestib(classe.gestib.tipus, codi)).join(' + ')}`;
}

// Noms del catàleg per suggerir-los a la matèria d'una fila nova.
const nomsCataleg = computed(() => [...new Set([
  ...(cataleg.value?.materies || []).map((materia) => analitzarMateriaGestib(materia).base),
  ...(cataleg.value?.activitats || []).map((activitat) => activitat.descripcio.replace(/^\*/, '').trim()),
].filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ca')));

const codisMateriaUsats = (excepteId = '') => new Set(classes.value
  .filter((classe) => classe.id !== excepteId && classe.gestib?.tipus === 'materia')
  .flatMap((classe) => classe.gestib.codis || []));

function proposaPer(fila, excepteId = '') {
  if (!cataleg.value) return null;
  return proposarCorrespondencia(fila, cataleg.value, { mapeig: mapeigAntic.value, usats: codisMateriaUsats(excepteId) });
}

async function carregarGestib(cursId) {
  cataleg.value = null;
  infoGestib.value = null;
  mapeigAntic.value = null;
  if (!cursId) return;
  carregantGestib.value = true;
  try {
    const [carregat, mapeig] = await Promise.all([carregarCatalegGestib(cursId), llegirMapeigAntic(cursId).catch(() => null)]);
    if (cursStore.cursActiuId !== cursId) return;
    cataleg.value = carregat?.cataleg || null;
    infoGestib.value = carregat?.info || null;
    mapeigAntic.value = mapeig;
  } catch (error) {
    toast.error(`No s'ha pogut llegir l'XML de GestIB: ${error.message}`);
  } finally {
    carregantGestib.value = false;
  }
}

async function carregarXml(event) {
  const fitxer = event.target.files?.[0];
  event.target.value = '';
  if (!fitxer) return;
  const text = await fitxer.text();
  await executar(async () => {
    const carregat = await desarCatalegGestib(cursStore.cursActiuId, { text, nom: fitxer.name });
    cataleg.value = carregat?.cataleg || null;
    infoGestib.value = carregat?.info || null;
    toast.ok(`Catàleg de GestIB carregat: ${cataleg.value?.materies.length || 0} matèries i ${cataleg.value?.activitats.length || 0} activitats.`);
  }, "No s'ha pogut desar l'XML");
}

function obrirEditorGestib(classe) {
  const estat = estatGestib(classe).estat;
  editor.value = {
    classe,
    tipus: classe.gestib?.tipus || (esFilaActivitat(classe) ? 'activitat' : 'materia'),
    seleccio: [...(classe.gestib?.codis || [])],
    cerca: '',
    totsCursos: false,
    proposta: estat === 'ok' ? null : proposaPer(classe, classe.id),
  };
}

const opcionsEditor = computed(() => {
  if (!editor.value || !cataleg.value) return [];
  const { tipus, cerca: text, totsCursos, classe, seleccio } = editor.value;
  const cerca = normalitzar(text);
  const coincideix = (...valors) => !cerca || normalitzar(valors.join(' ')).includes(cerca);
  const ordenar = (a, b) => Number(seleccio.includes(b.codi)) - Number(seleccio.includes(a.codi)) || a.nom.localeCompare(b.nom, 'ca');
  if (tipus === 'activitat') {
    return cataleg.value.activitats
      .filter((activitat) => coincideix(activitat.descripcio, activitat.curta))
      .map((activitat) => ({
        codi: codiActivitat(activitat),
        nom: activitat.descripcio,
        detall: [activitat.curta, activitat.teAsterisc ? 'lectiva' : 'complementària'].join(' · '),
      }))
      .sort(ordenar);
  }
  const curs = cursFila(classe);
  return cataleg.value.materies
    .filter((materia) => totsCursos || !curs || cursMateriaGestib(materia) === curs || seleccio.includes(materia.curta))
    .filter((materia) => coincideix(materia.descripcio, materia.curta))
    .map((materia) => ({ codi: materia.curta, nom: materia.descripcio, detall: [materia.curta, materia.cursDescripcio].filter(Boolean).join(' · ') }))
    .sort(ordenar);
});

function canviarTipusEditor(tipus) {
  if (editor.value.tipus === tipus) return;
  editor.value.tipus = tipus;
  editor.value.seleccio = [];
}

function alternarSeleccioEditor(codi) {
  const actual = editor.value.seleccio;
  if (editor.value.tipus === 'activitat') editor.value.seleccio = [codi];
  else editor.value.seleccio = actual.includes(codi) ? actual.filter((item) => item !== codi) : [...actual, codi];
}

function aplicarPropostaEditor() {
  editor.value.tipus = editor.value.proposta.tipus;
  editor.value.seleccio = [...editor.value.proposta.codis];
}

function desarEditor(gestib) {
  const { classe } = editor.value;
  executar(async () => {
    await desarCorrespondencies({ cursId: cursStore.cursActiuId, enllacos: [{ id: classe.id, gestib }], actor: actor.value });
    editor.value = null;
    toast.ok(gestib ? 'Correspondència desada.' : 'Correspondència treta.');
  });
}

function obrirPropostes() {
  if (!cataleg.value) return;
  const items = proposarCorrespondencies(classes.value, cataleg.value, { mapeig: mapeigAntic.value })
    .map(({ fila, proposta }) => ({ fila, proposta, triada: proposta?.confianca === 'segura' }));
  revisio.value = { items, ambMapeig: Boolean(mapeigAntic.value) };
}

const grupsRevisio = computed(() => {
  const items = revisio.value?.items || [];
  return [
    { id: 'segures', titol: 'Segures', classe: 'text-emerald-700 dark:text-emerald-300', items: items.filter((item) => item.proposta?.confianca === 'segura') },
    { id: 'revisar', titol: 'Per revisar', classe: 'text-amber-700 dark:text-amber-300', items: items.filter((item) => item.proposta && item.proposta.confianca !== 'segura') },
    { id: 'sense', titol: 'Sense proposta (tria-les a la fila)', classe: 'text-slate-500', items: items.filter((item) => !item.proposta) },
  ].filter((grup) => grup.items.length);
});
const triadesRevisio = computed(() => (revisio.value?.items || []).filter((item) => item.triada && item.proposta));

function aplicarRevisio() {
  const enllacos = triadesRevisio.value.map(({ fila, proposta }) => ({ id: fila.id, gestib: { tipus: proposta.tipus, codis: [...proposta.codis] } }));
  executar(async () => {
    await desarCorrespondencies({ cursId: cursStore.cursActiuId, enllacos, actor: actor.value });
    revisio.value = null;
    toast.ok(`${enllacos.length} correspondències desades.`);
  });
}

// Una fila nova amb correspondència segura ja surt enllaçada.
function ambCorrespondencia(camps, departament) {
  const proposta = proposaPer({ ...camps, departament });
  return proposta?.confianca === 'segura' ? { ...camps, gestib: { tipus: proposta.tipus, codis: proposta.codis } } : camps;
}

// Una fila nova per targeta, que es conserva mentre s'escriu.
watch(resums, (llista) => {
  llista.forEach((resum) => {
    if (!esborranys[resum.nom]) esborranys[resum.nom] = { curs: '', grup: '', materia: '', hores: '', tipus: '' };
  });
}, { immediate: true });

watch(seleccio, (valor) => desarLocal(CLAU_SELECCIO, valor), { deep: true });
watch(pantallaCompleta, (valor) => desarLocal(CLAU_PANTALLA, valor));

// --- Balanç: hores que el professorat pot fer menys les hores de la quota ------------
function estatBalanc(resum) {
  if (!resum.professors && !resum.hores) return 'buit';
  if (Math.abs(resum.balanc) < 1) return 'quadra';
  return resum.balanc < 0 ? 'falten' : 'sobren';
}

function textBalanc(resum) {
  const estat = estatBalanc(resum);
  if (estat === 'buit') return 'Sense dades';
  if (estat === 'quadra') return 'Quadra';
  return estat === 'falten'
    ? `Falten ${formatDecimal(-resum.balanc)} h`
    : `Sobren ${formatDecimal(resum.balanc)} h`;
}

function textBalancCurt(resum) {
  const estat = estatBalanc(resum);
  if (estat === 'buit') return '';
  if (estat === 'quadra') return '✓';
  return `${resum.balanc > 0 ? '+' : '−'}${formatDecimal(Math.abs(resum.balanc))}`;
}

const esMulticurs = (classe) => Boolean(classe.subclasses?.length);

function opcionsTipus(actual) {
  if (!actual || TIPUS_QUOTA.some((tipus) => tipus.codi === actual)) return TIPUS_QUOTA;
  return [...TIPUS_QUOTA, { codi: actual, etiqueta: 'Tipus antic' }];
}

// --- Subscripcions -------------------------------------------------------------------
let desubscriure = [];

watch(() => cursStore.cursActiuId, (cursId) => {
  desubscriure.forEach((aturar) => aturar?.());
  carregat.value = false;
  menu.value = null;
  const error = (que) => (err) => toast.error(`No s'han pogut carregar ${que}: ${err.message}`);
  desubscriure = [
    subscriureClasses(cursId, (llista) => {
      classes.value = llista;
      carregat.value = true;
    }, error('les classes')),
    subscriureDepartaments(cursId, (llista) => { departaments.value = llista; }, error('els departaments')),
    subscriureProfessorat(cursId, (llista) => { professors.value = llista; }, error('el professorat')),
  ];
  cursOrigen.value = cursosOrigen.value[0]?.id || '';
  editor.value = null;
  revisio.value = null;
  carregarGestib(cursId);
}, { immediate: true });

watch(cursosOrigen, (llista) => {
  if (!llista.some((curs) => curs.id === cursOrigen.value)) cursOrigen.value = llista[0]?.id || '';
});

function teclaGlobal(event) {
  if (event.key !== 'Escape') return;
  if (menu.value) menu.value = null;
  else if (editor.value) editor.value = null;
  else if (revisio.value) revisio.value = null;
  else if (pantallaCompleta.value) pantallaCompleta.value = false;
}

onMounted(() => window.addEventListener('keydown', teclaGlobal));
onUnmounted(() => {
  desubscriure.forEach((aturar) => aturar?.());
  window.removeEventListener('keydown', teclaGlobal);
  clearTimeout(temporitzadorDesfer);
});

// --- Accions -------------------------------------------------------------------------
async function executar(accio, missatgeError = "No s'ha pogut desar") {
  desant.value += 1;
  try {
    return (await accio()) ?? true;
  } catch (error) {
    toast.error(`${missatgeError}: ${error.message}`);
    return null;
  } finally {
    desant.value -= 1;
  }
}

function alternarPantallaCompleta() {
  pantallaCompleta.value = !pantallaCompleta.value;
}

function alternarSeleccio(nom) {
  seleccio.value = seleccioActiva.value.includes(nom)
    ? seleccioActiva.value.filter((item) => item !== nom)
    : [...seleccioActiva.value, nom];
}

function valorVisible(camp, valor) {
  return camp === 'hores' ? formatDecimal(valor, 2) : (valor ?? '');
}

function desarCamp(classe, camp, event) {
  if (!editable.value) return;
  const valor = event.target.value;
  if (camp === 'hores' && !(llegirHores(valor) > 0)) {
    event.target.value = valorVisible('hores', classe.hores);
    toast.error('Les hores han de ser un nombre més gran que 0.');
    return;
  }
  if (camp === 'materia' && !valor.trim()) {
    event.target.value = classe.materia;
    toast.error('La matèria no pot quedar buida. Per treure la fila, fes servir «Esborra la fila» (⋯).');
    return;
  }
  const canvis = canvisClasse(classe, { [camp]: valor });
  // Es mostra el valor net (p. ex. «bdf» → «B+D+F»), també quan no canvia res.
  if (camp !== 'tipus') event.target.value = valorVisible(camp, camp in canvis ? canvis[camp] : classe[camp]);
  if (!Object.keys(canvis).length) return;
  executar(() => actualitzarClasse({ cursId: cursStore.cursActiuId, id: classe.id, canvis, actor: actor.value }));
}

// Enter baixa a la mateixa columna de la fila següent, com en un full de càlcul.
function seguentFila(event) {
  const columna = event.target.dataset.col;
  const seguent = event.target.closest('tr')?.nextElementSibling?.querySelector(`[data-col="${columna}"]`);
  if (seguent) {
    seguent.focus();
    seguent.select?.();
  } else {
    event.target.blur();
  }
}

async function afegir(nom, event) {
  if (!editable.value) return;
  const esborrany = esborranys[nom];
  const camps = campsClasse(esborrany);
  const errors = errorsClasse(camps);
  if (errors.length) {
    toast.error(errors.join(' '));
    return;
  }
  const fet = await executar(() => crearClasses({ cursId: cursStore.cursActiuId, departament: nom, files: [ambCorrespondencia(camps, nom)], actor: actor.value }));
  if (!fet) return;
  Object.assign(esborrany, { curs: '', grup: '', materia: '', hores: '', tipus: '' });
  await nextTick();
  const fila = event?.target?.closest('[data-departament]')?.querySelector('[data-nova] [data-col="curs"]');
  fila?.focus();
}

// Enganxar diverses files (amb tabuladors o salts de línia) les afegeix al departament.
function enganxar(nom, event) {
  if (!editable.value) return;
  const text = event.clipboardData?.getData('text/plain') || '';
  if (!/[\t\n]/.test(text.trim())) return;
  event.preventDefault();
  const { files, ignorades } = llegirFilesEnganxades(text);
  if (!files.length) {
    toast.error("No s'hi ha trobat cap fila amb matèria i hores.");
    return;
  }
  executar(async () => {
    await crearClasses({ cursId: cursStore.cursActiuId, departament: nom, files: files.map((camps) => ambCorrespondencia(camps, nom)), actor: actor.value });
    const avis = ignorades.length ? ` ${ignorades.length} sense matèria o sense hores no s'hi han afegit.` : '';
    toast.ok(`${files.length} ${files.length === 1 ? 'fila afegida' : 'files afegides'} a ${nom}.${avis}`);
  });
}

function obrirMenu(classe, event) {
  const rect = event.currentTarget.getBoundingClientRect();
  menu.value = {
    classe,
    top: Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 340)),
    left: Math.max(8, Math.min(rect.right - 256, window.innerWidth - 264)),
  };
}

function moure(classe, nom) {
  const canvis = canvisClasse(classe, { departament: nom });
  if (!Object.keys(canvis).length) return;
  executar(async () => {
    await actualitzarClasse({ cursId: cursStore.cursActiuId, id: classe.id, canvis, actor: actor.value });
    const assignada = teAssignacio(classe) ? ' Conserva el professorat assignat.' : '';
    toast.ok(`«${classe.materia}» passa a ${nom}.${assignada}`);
  });
}

function esborrar(classe) {
  if (teAssignacio(classe)) {
    const noms = [...new Set([...(classe.professors || []), classe.professorAssignat].filter(Boolean))].join(', ');
    const descripcio = [classe.curs, classe.grup, classe.materia].filter(Boolean).join(' ');
    if (!window.confirm(`«${descripcio}» té professorat assignat (${noms || 'participants'}). Si l'esborres, es perd aquest repartiment. Vols esborrar-la?`)) return;
  }
  executar(async () => {
    await esborrarClasse({ cursId: cursStore.cursActiuId, id: classe.id });
    darrerEsborrat.value = { ...classe };
    clearTimeout(temporitzadorDesfer);
    temporitzadorDesfer = setTimeout(() => { darrerEsborrat.value = null; }, 20000);
  });
}

function desferEsborrat() {
  const classe = darrerEsborrat.value;
  if (!classe) return;
  darrerEsborrat.value = null;
  executar(() => restaurarClasse({ cursId: cursStore.cursActiuId, classe }));
}

// --- Arrossegar files entre departaments ---------------------------------------------
function iniciarArrossegament(classe, event) {
  arrossegant.value = classe;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', classe.id);
  const fila = event.target.closest('tr');
  if (fila) event.dataTransfer.setDragImage(fila, 12, 12);
}

function sobreDesti(nom, event) {
  if (!arrossegant.value) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  destiArrossegament.value = nom;
}

function sortirDesti(nom, event) {
  if (event?.currentTarget?.contains(event.relatedTarget)) return;
  if (destiArrossegament.value === nom) destiArrossegament.value = '';
}

function deixarA(nom) {
  const classe = arrossegant.value;
  acabarArrossegament();
  if (classe && classe.departament !== nom) moure(classe, nom);
}

function acabarArrossegament() {
  arrossegant.value = null;
  destiArrossegament.value = '';
}

function copiarCurs() {
  executar(async () => {
    const resultat = await copiarQuotaDeCurs({ origen: cursOrigen.value, desti: cursStore.cursActiuId, actor: actor.value });
    toast.ok(`${resultat.copiades} classes copiades.`);
  });
}
</script>

<style scoped>
.quota-panell {
  --quota-falten: #be123c;
  --quota-falten-vora: #e11d48;
  --quota-sobren: #0369a1;
  --quota-sobren-vora: #0284c7;
  --quota-quadra: #15803d;
  --quota-quadra-vora: #16a34a;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.quota-panell-complet {
  position: fixed;
  inset: 0;
  z-index: 105;
  overflow-y: auto;
  padding: 0.75rem 1rem 2rem;
  background: var(--app-bg);
}

.quota-capcalera {
  padding: 0.875rem 1rem;
}

.quota-boto {
  border-radius: 0.375rem;
  border: 1px solid var(--border-soft);
  background: var(--surface);
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}
.quota-boto:hover { background: var(--surface-hover); }

.quota-totals {
  margin-top: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1.5rem;
}
.quota-totals dt {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--text-muted);
}
.quota-totals dd {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-main);
  font-variant-numeric: tabular-nums;
}
.quota-totals-detall {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--text-muted);
}

.quota-desfer {
  border-radius: 0.375rem;
  background: var(--surface-muted);
  padding: 0.25rem 0.625rem;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.quota-gestib {
  margin-top: 0.625rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.375rem 0.875rem;
  padding-top: 0.625rem;
  border-top: 1px solid var(--border-soft);
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
.quota-gestib-avis { font-weight: 700; color: var(--quota-falten); }
.quota-enllac { font-weight: 600; color: var(--primary); text-decoration: underline; }

/* Estat de la correspondència amb GestIB de cada fila. */
.quota-gestib-estat {
  width: 1.25rem;
  height: 1.25rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
}
.quota-gestib-ok { color: var(--quota-quadra); }
.quota-gestib-trencat { color: white; background: var(--quota-falten-vora); }
.quota-gestib-sense { color: var(--text-muted); border: 1px dashed var(--border-strong); }
.quota-gestib-estat:hover { box-shadow: 0 0 0 2px var(--primary); }

/* Tira de departaments: sempre a la vista per tenir el conjunt. */
.quota-tira {
  position: sticky;
  top: 4.75rem;
  z-index: 20;
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  padding: 0.5rem;
  border: 1px solid var(--border-soft);
  border-radius: 0.5rem;
  background: var(--nav-bg);
  backdrop-filter: blur(6px);
}
.quota-panell-complet .quota-tira { top: 0; }

.quota-xip {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 10.5rem;
  min-width: 0;
  padding: 0.25rem 0.5rem;
  border: 1px solid var(--border-soft);
  border-left-width: 4px;
  border-radius: 0.375rem;
  background: var(--surface);
  text-align: left;
  line-height: 1.25;
}
.quota-xip:hover { background: var(--surface-hover); }
.quota-xip-nom {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
}
.quota-xip-xifres {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.quota-xip-balanc { margin-left: 0.25rem; font-weight: 700; }
.quota-xip-triat {
  background: var(--pastel-blue-bg);
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
.quota-xip-desti,
.quota-targeta-desti {
  outline: 2px dashed var(--primary);
  outline-offset: 2px;
}

.quota-xip-falten { border-left-color: var(--quota-falten-vora); }
.quota-xip-falten .quota-xip-balanc { color: var(--quota-falten); }
.quota-xip-sobren { border-left-color: var(--quota-sobren-vora); }
.quota-xip-sobren .quota-xip-balanc { color: var(--quota-sobren); }
.quota-xip-quadra { border-left-color: var(--quota-quadra-vora); }
.quota-xip-quadra .quota-xip-balanc { color: var(--quota-quadra); }
.quota-xip-buit { border-left-color: var(--border-soft); }

/* Targetes en columnes (com un tauler): tantes com hi càpiguen. */
.quota-graella {
  columns: 22rem;
  column-gap: 0.75rem;
}

.quota-targeta {
  break-inside: avoid;
  margin-bottom: 0.75rem;
  border: 1px solid var(--border-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: var(--card-shadow-soft);
  overflow: hidden;
}

.quota-targeta-cap {
  padding: 0.5rem 0.625rem 0.375rem;
  border-bottom: 1px solid var(--border-soft);
  background: var(--surface-soft);
}
.quota-targeta-cap h4 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--text-main);
}
.quota-xifres {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.125rem 0.75rem;
  font-size: 0.75rem;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.quota-xifres strong { color: var(--text-main); }

.quota-balanc {
  margin-left: auto;
  border-radius: 999px;
  padding: 0 0.5rem;
  font-weight: 700;
}
.quota-balanc-falten { color: var(--quota-falten); background: var(--pastel-rose-bg); }
.quota-balanc-sobren { color: var(--quota-sobren); background: var(--pastel-blue-bg); }
.quota-balanc-quadra { color: var(--quota-quadra); background: var(--pastel-green-bg); }
.quota-balanc-buit { color: var(--text-muted); }
.quota-totals dd.quota-balanc-falten { color: var(--quota-falten); }
.quota-totals dd.quota-balanc-sobren { color: var(--quota-sobren); }
.quota-totals dd.quota-balanc-quadra { color: var(--quota-quadra); }
/* Mode fosc. (Amb «:global(.dark) .x» aquesta versió de Vue només genera «.dark».) */
:global(.dark .quota-panell) {
  --quota-falten: #fda4af;
  --quota-falten-vora: #fb7185;
  --quota-sobren: #7dd3fc;
  --quota-sobren-vora: #38bdf8;
  --quota-quadra: #86efac;
  --quota-quadra-vora: #4ade80;
}

.quota-taula {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.8125rem;
}
.quota-taula th {
  padding: 0.25rem 0.25rem 0.125rem;
  font-size: 0.75rem;
  font-weight: 600;
  text-align: left;
  color: var(--text-muted);
}
.quota-taula td {
  padding: 0;
  border-top: 1px solid var(--surface-muted);
}
.quota-taula tbody tr:hover { background: var(--surface-soft); }

.quota-cela {
  display: block;
  width: 100%;
  min-width: 0;
  padding: 0.25rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  background: transparent;
  color: var(--text-main);
  font: inherit;
  text-overflow: ellipsis;
}
.quota-cela:hover:not(:disabled) { border-color: var(--border-soft); }
.quota-cela:focus {
  outline: none;
  border-color: var(--primary);
  background: var(--surface);
  box-shadow: 0 0 0 1px var(--primary);
}
.quota-cela:disabled {
  color: var(--text-main);
  -webkit-text-fill-color: var(--text-main);
  opacity: 1;
}
.quota-cela::placeholder { color: var(--text-muted); }

.quota-tipus {
  position: relative;
  display: block;
  padding: 0.25rem;
  border: 1px solid transparent;
  border-radius: 0.25rem;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
}
.quota-tipus-buit { color: var(--text-muted); font-weight: 400; }
.quota-tipus:hover { border-color: var(--border-soft); }
.quota-tipus:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 1px var(--primary);
}
/* El desplegable natiu fa la feina; a la cel·la només es veu el codi. */
.quota-tipus select {
  position: absolute;
  inset: 0;
  width: 100%;
  opacity: 0;
  cursor: pointer;
}
.quota-tipus select:disabled { cursor: default; }

.quota-asa {
  cursor: grab;
  color: var(--text-muted);
  font-size: 0.75rem;
  letter-spacing: -0.15em;
  text-align: center;
  user-select: none;
}
.quota-fila-arrossegada { opacity: 0.45; }

.quota-mes {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 0.25rem;
  color: var(--text-muted);
  font-weight: 700;
  line-height: 1;
}
.quota-mes:hover { background: var(--surface-hover); color: var(--text-main); }

.quota-fila-nova td { background: var(--surface-soft); }
.quota-fila-nova .quota-cela { border-color: var(--border-soft); background: var(--surface); }

.quota-menu {
  position: fixed;
  width: 16rem;
  padding: 0.375rem;
  border: 1px solid var(--border-soft);
  border-radius: 0.5rem;
  background: var(--surface);
  box-shadow: var(--card-shadow);
}
.quota-menu-titol {
  padding: 0.25rem 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.8125rem;
  font-weight: 700;
  color: var(--text-main);
}
.quota-menu-seccio {
  padding: 0.25rem 0.5rem 0;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
}
.quota-menu-item {
  display: block;
  width: 100%;
  padding: 0.375rem 0.5rem;
  border-radius: 0.25rem;
  text-align: left;
  font-size: 0.8125rem;
  color: var(--text-secondary);
}
.quota-menu-item:hover { background: var(--surface-hover); }
.quota-menu-perill {
  margin-top: 0.25rem;
  border-top: 1px solid var(--border-soft);
  color: var(--quota-falten);
}
</style>
