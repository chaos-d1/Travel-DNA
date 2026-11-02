
/* ============================================================
   LOOK TUNING — four sliders writing to CSS custom properties.
   Each theme starts at the values its reference template used;
   anything the user changes is remembered per theme.
   ============================================================ */
(function(){
  const buttons=document.querySelectorAll('.theme-btn');
  const status=document.getElementById('themeStatus');
  const copy={tropical:'Tropical · Kerala',arid:'Arid · Jaipur',winter:'Winter · Himachal Pradesh'};
  const destinations={tropical:'kerala',arid:'jaipur',winter:'himachal pradesh'};

  function updateLocationParam(location){
    const url=new URL(window.location.href);
    url.searchParams.set('location',location);
    window.history.pushState({location},'',url.toString());
  }

  function setTheme(theme, updateUrl=true, note=''){
    document.body.classList.remove('theme-tropical','theme-arid','theme-winter');
    document.body.classList.add('theme-'+theme);
    buttons.forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));
    status.textContent=note||copy[theme]||copy.tropical;
    if(window.__applyThemeTuning) window.__applyThemeTuning(theme);
    try{localStorage.setItem('travelDNA.theme',theme)}catch{}
    if(updateUrl && destinations[theme]){
      const location=destinations[theme];
      updateLocationParam(location);
      sharedLocationInput.value=location;
      loadLocationOnMap(location);
      if(window.__loadPlaceMedia) window.__loadPlaceMedia(location);
    }
  }
  buttons.forEach(b=>b.addEventListener('click',()=>setTheme(b.dataset.theme,true)));
  window.__setTheme=setTheme;
  let saved=null; try{saved=localStorage.getItem('travelDNA.theme')}catch{}
  setTheme(['tropical','arid','winter'].includes(saved)?saved:'tropical',false);
})();

/* ============================================================
   START MODE — a one-time "here's what to do" banner shown until
   the first place is searched, then dismissed for the rest of the
   session (not brought back if the search box is later cleared).
   ============================================================ */
const startModeBanner = document.getElementById('startMode');
const mainContent = document.getElementById('mainContent');
function dismissStartMode() {
    if (startModeBanner && !startModeBanner.hidden) startModeBanner.hidden = true;
    if (mainContent && mainContent.hidden) {
        mainContent.hidden = false;
        // The Leaflet map initializes while its container is still
        // hidden (display:none gives it zero size), so it needs to
        // recompute its dimensions now that it's actually visible —
        // otherwise the tiles render into the wrong-sized box.
        if (typeof map !== 'undefined') setTimeout(() => map.invalidateSize(), 0);
    }
}

/* ============================================================
   Nav buttons — every panel is visible on one long scrolling
   page, so these just smooth-scroll and stay in sync with
   whatever is actually on screen.
   ============================================================ */
/* Keep the booking search pointed at whatever place is loaded. */
const bookBtn = document.getElementById('bookBtn');
const bookBtnLabel = bookBtn.querySelector('.info-bubble-label');
function updateBookLink(name) {
    const place = (name || '').trim();
    bookBtn.href = 'https://www.google.com/search?q=' +
        encodeURIComponent(`book tickets ${place || 'India'}`);
    const text = place ? `Book ticket to ${place}` : 'Book ticket';
    bookBtn.title = text;
    bookBtnLabel.textContent = text;
}

const trainBtn = document.getElementById('trainBtn');
const trainBtnLabel = trainBtn.querySelector('.info-bubble-label');
function updateTrainLink(name) {
    const place = (name || '').trim();
    trainBtn.href = 'https://www.google.com/search?q=' +
        encodeURIComponent(`train tickets ${place || 'India'}`);
    const text = place ? `Trains to ${place}` : 'Search trains';
    trainBtn.title = text;
    trainBtnLabel.textContent = text;
}

const PANELS = [
    // The four Outfit/Media sections are displayed with `display: contents`
    // so their actual cards can participate in one shared 2x2 grid. The
    // first real section is used as the scroll/observer anchor for navigation.
    { name: 'map',       button: document.getElementById('tabBtnMap'),       panel: document.getElementById('map-panel') },
    { name: 'itinerary', button: document.getElementById('tabBtnItinerary'), panel: document.getElementById('itinerary-panel') },
    { name: 'outfits',   button: document.getElementById('tabBtnOutfits'),   panel: document.querySelector('.outfit-main-section') },
    { name: 'media',     button: document.getElementById('tabBtnMedia'),     panel: document.querySelector('#media-panel section') },
];

function markActivePanel(name) {
    for (const entry of PANELS) entry.button.classList.toggle('active', entry.name === name);
}

function scrollToPanel(name) {
    const entry = PANELS.find(p => p.name === name) || PANELS[0];
    entry.panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    markActivePanel(entry.name);
}

for (const entry of PANELS) {
    entry.button.addEventListener('click', () => scrollToPanel(entry.name));
}

const scrollObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const match = PANELS.find(p => p.panel === entry.target);
        if (match) markActivePanel(match.name);
    }
}, { threshold: 0.4 });
for (const entry of PANELS) scrollObserver.observe(entry.panel);

// Not a section to switch to — just scrolls up. The State Map tab will
// pick up "active" on its own once it scrolls back into view.
document.getElementById('tabBtnTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});



/* ============================================================
   ITINERARY
   The stop lists are sample content, seeded from whichever mood
   the searched state resolved to. Everything after that is real:
   edit, reorder, add and remove, saved per place.
   ============================================================ */
(function () {
    const SEEDS = {
        tropical: [
            [['7:30 AM', 'Sunrise at the waterfront', 'Go before the boats do'],
             ['10:00 AM', 'Old quarter walk', ''],
             ['1:00 PM', 'Banana-leaf lunch', 'Ask for the fish curry'],
             ['4:30 PM', 'Backwater boat', ''],
             ['7:30 PM', 'Night market', '']],
            [['8:00 AM', 'Spice plantation', ''],
             ['12:30 PM', 'Coastal road drive', 'Stop wherever it looks good'],
             ['3:00 PM', 'Waterfall trail', ''],
             ['6:00 PM', 'Sunset point', '']],
            [['9:00 AM', 'Temple morning', ''],
             ['12:00 PM', 'Cooking class', ''],
             ['4:00 PM', 'Unhurried beach hours', '']],
        ],
        arid: [
            [['7:00 AM', 'Fort at first light', 'Coolest hour of the day'],
             ['10:30 AM', 'Stepwell and bazaar', ''],
             ['1:30 PM', 'Thali lunch', ''],
             ['5:00 PM', 'Dunes for sunset', ''],
             ['8:00 PM', 'Folk music evening', '']],
            [['8:00 AM', 'Palace museum', ''],
             ['11:30 AM', 'Block-print workshop', ''],
             ['3:00 PM', 'Lake pavilion', 'Shade until the heat breaks'],
             ['6:30 PM', 'Rooftop dinner', '']],
            [['9:00 AM', 'Craft village', ''],
             ['12:00 PM', 'Old city on foot', ''],
             ['4:00 PM', 'Last bazaar run', '']],
        ],
        winter: [
            [['8:00 AM', 'Valley viewpoint', 'Clearest before midday haze'],
             ['11:00 AM', 'Monastery visit', ''],
             ['1:30 PM', 'Thukpa and hot tea', ''],
             ['3:30 PM', 'Pine forest walk', ''],
             ['6:00 PM', 'Bonfire and quiet', '']],
            [['7:30 AM', 'Drive to the snow line', 'Check road status first'],
             ['11:00 AM', 'Cable car up', ''],
             ['2:00 PM', 'Frozen lake', ''],
             ['5:00 PM', 'Tea house', '']],
            [['9:00 AM', 'Village trail', ''],
             ['12:30 PM', 'Local museum', ''],
             ['3:00 PM', 'Hot springs', '']],
        ],
    };

    const daysEl   = document.getElementById('itinDays');
    const stopsEl  = document.getElementById('itinStops');
    const emptyEl  = document.getElementById('itinEmpty');
    const placeEl  = document.getElementById('itinPlace');
    const countEl  = document.getElementById('itinCount');
    const resetBtn = document.getElementById('itinReset');

    let place = '';
    let theme = 'tropical';
    let days = [];
    let active = 0;

    const storageKey = () => `travelDNA.itinerary.${place.toLowerCase()}`;

    function save() {
        if (!place) return;
        try { localStorage.setItem(storageKey(), JSON.stringify(days)); } catch {}
    }

    // Named routes for the three mood destinations. Anywhere else falls
    // back to the generic climate plan above.
    const ROUTES = {
        kerala: [
            [['8:00 AM', 'Fort Kochi waterfront', 'Chinese fishing nets at low tide'],
             ['10:30 AM', 'Mattancherry Palace & Jew Town', 'Spice warehouses on the same lane'],
             ['1:00 PM', 'Lunch on Princess Street', ''],
             ['5:30 PM', 'Kathakali show, Ernakulam', 'Arrive early for the make-up'],
             ['8:00 PM', 'Drive to Alleppey', '']],
            [['9:00 AM', 'Alleppey houseboat, Punnamada', 'Board before the afternoon crowd'],
             ['1:00 PM', 'Karumadi and the narrow canals', ''],
             ['4:30 PM', 'Marari Beach', ''],
             ['7:00 PM', 'Overnight on the backwaters', '']],
            [['6:00 AM', 'Drive up to Munnar', 'Four hours through the ghats'],
             ['11:00 AM', 'Tea estates and Tata Tea Museum', ''],
             ['3:00 PM', 'Eravikulam National Park', 'Closed Feb–Mar for calving'],
             ['6:00 PM', 'Top Station for sunset', '']],
        ],
        jaipur: [
            [['8:00 AM', 'Amber Fort', 'Up the ramp before the heat'],
             ['11:00 AM', 'Panna Meena ka Kund', 'Stepwell, five minutes downhill'],
             ['12:30 PM', 'Jal Mahal viewpoint', ''],
             ['3:00 PM', 'City Palace', ''],
             ['5:30 PM', 'Hawa Mahal from Hawa Mahal Road', 'Best light late afternoon']],
            [['9:00 AM', 'Jantar Mantar', ''],
             ['11:30 AM', 'Albert Hall Museum', ''],
             ['2:00 PM', 'Johari and Bapu Bazaar', 'Block prints, lac bangles'],
             ['6:00 PM', 'Nahargarh Fort for sunset', 'City spread out below'],
             ['8:30 PM', 'Chokhi Dhani', '']],
            [['9:00 AM', 'Galtaji monkey temple', ''],
             ['12:00 PM', 'Sanganer block-print workshops', ''],
             ['4:00 PM', 'Jaigarh Fort', ''],
             ['7:00 PM', 'Last run through the old city', '']],
        ],
        himachal: [
            [['9:00 AM', 'Shimla Mall Road and the Ridge', ''],
             ['11:30 AM', 'Jakhoo Temple', 'Steep walk up, watch the monkeys'],
             ['2:00 PM', 'Christ Church and Lakkar Bazaar', ''],
             ['4:30 PM', 'Kufri', ''],
             ['7:00 PM', 'Evening on the Ridge', '']],
            [['7:00 AM', 'Shimla to Manali via Mandi', 'Long drive, start early'],
             ['1:00 PM', 'Kullu valley stop', ''],
             ['4:00 PM', 'Hadimba Devi Temple, Manali', 'Deodar forest around it'],
             ['6:30 PM', 'Old Manali', '']],
            [['8:00 AM', 'Solang Valley', ''],
             ['11:00 AM', 'Atal Tunnel to Sissu', 'Check road and permit status'],
             ['3:00 PM', 'Vashisht hot springs', ''],
             ['6:00 PM', 'Manalsu riverside', '']],
        ],
    };

    function routeFor(name) {
        const key = (name || '').toLowerCase();
        for (const candidate in ROUTES) {
            if (key.includes(candidate)) return ROUTES[candidate];
        }
        // Shimla and Manali are the two the mood button resolves to.
        if (/shimla|manali|kullu|dharamshala/.test(key)) return ROUTES.himachal;
        if (/kochi|alleppey|alappuzha|munnar|wayanad/.test(key)) return ROUTES.kerala;
        return null;
    }

    function seed() {
        const route = routeFor(place) || SEEDS[theme] || SEEDS.tropical;
        return route.map((stops, i) => ({
            label: `Day ${i + 1}`,
            stops: stops.map(([time, name, note]) => ({ time, name, note })),
        }));
    }

    function load() {
        try {
            const raw = localStorage.getItem(storageKey());
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length) return parsed;
            }
        } catch {}
        return seed();
    }

    function totalStops() {
        return days.reduce((sum, day) => sum + day.stops.length, 0);
    }

    function field(value, placeholder, className, onInput) {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = value || '';
        input.placeholder = placeholder;
        input.className = className;
        input.addEventListener('input', () => { onInput(input.value); save(); });
        return input;
    }

    function iconButton(glyph, label, disabled, onClick) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'itin-icon';
        button.textContent = glyph;
        button.title = label;
        button.setAttribute('aria-label', label);
        button.disabled = !!disabled;
        button.addEventListener('click', onClick);
        return button;
    }

    function renderDays() {
        daysEl.replaceChildren();
        days.forEach((day, index) => {
            const tab = document.createElement('button');
            tab.type = 'button';
            tab.className = 'itin-day';
            tab.setAttribute('role', 'tab');
            tab.setAttribute('aria-selected', String(index === active));
            tab.append(`${day.label} · ${day.stops.length}`);
            tab.addEventListener('click', () => { active = index; render(); });

            if (days.length > 1) {
                const drop = document.createElement('span');
                drop.className = 'itin-daydrop';
                drop.textContent = '×';
                drop.title = `Remove ${day.label}`;
                drop.addEventListener('click', event => {
                    event.stopPropagation();
                    days.splice(index, 1);
                    days.forEach((d, i) => { d.label = `Day ${i + 1}`; });
                    active = Math.min(active, days.length - 1);
                    save(); render();
                });
                tab.append(drop);
            }
            daysEl.append(tab);
        });
    }

    // Photo per stop — keyed by "place + what the stop says" so identical
    // text never triggers a second network call, and so editing a stop's
    // text naturally invalidates the old picture (new key = new lookup).
    const stopPhotoCache = new Map();

    function refreshStopPhoto(row, photoEl, stop) {
        if (!place || !stop.name.trim()) {
            photoEl.style.backgroundImage = '';
            photoEl.classList.remove('is-loaded');
            row.classList.remove('has-photo');
            return;
        }
        const query = `${place} ${stop.name}`;
        if (stopPhotoCache.has(query)) {
            applyStopPhoto(row, photoEl, stopPhotoCache.get(query));
            return;
        }
        // The Place Media panel's search helper may not have initialised
        // yet on first paint; skip silently rather than throwing.
        if (!window.__fetchStopImage) return;
        window.__fetchStopImage(query).then(url => {
            stopPhotoCache.set(query, url || null);
            // The row can have been discarded by a re-render (reorder,
            // remove) by the time the search resolves — only paint it
            // if it's still the one on screen.
            if (row.isConnected) applyStopPhoto(row, photoEl, url);
        }).catch(() => { stopPhotoCache.set(query, null); });
    }

    function applyStopPhoto(row, photoEl, url) {
        if (!url) {
            photoEl.style.backgroundImage = '';
            photoEl.classList.remove('is-loaded');
            row.classList.remove('has-photo');
            return;
        }
        photoEl.style.backgroundImage = `url("${url.replace(/"/g, '')}")`;
        row.classList.add('has-photo');
        requestAnimationFrame(() => photoEl.classList.add('is-loaded'));
    }

    function renderStops() {
        stopsEl.replaceChildren();
        const day = days[active];
        emptyEl.hidden = day.stops.length > 0;

        day.stops.forEach((stop, index) => {
            const row = document.createElement('li');
            row.className = 'itin-stop';

            const photo = document.createElement('div');
            photo.className = 'itin-stop-photo';
            row.appendChild(photo);

            const nameField = field(stop.name, 'What are you doing?', 'itin-name', v => { stop.name = v; });
            // Re-fetch on blur (not on every keystroke) so typing a new
            // stop doesn't fire a search per letter.
            nameField.addEventListener('blur', () => refreshStopPhoto(row, photo, stop));

            row.append(
                field(stop.time, 'Time', 'itin-time', v => { stop.time = v; }),
                nameField,
            );

            const actions = document.createElement('div');
            actions.className = 'itin-actions';
            actions.append(
                iconButton('↑', 'Move earlier', index === 0, () => {
                    [day.stops[index - 1], day.stops[index]] = [day.stops[index], day.stops[index - 1]];
                    save(); renderStops();
                }),
                iconButton('↓', 'Move later', index === day.stops.length - 1, () => {
                    [day.stops[index + 1], day.stops[index]] = [day.stops[index], day.stops[index + 1]];
                    save(); renderStops();
                }),
                iconButton('×', 'Remove stop', false, () => {
                    day.stops.splice(index, 1);
                    save(); render();
                }),
            );
            row.append(actions);
            row.append(field(stop.note, 'Add a note', 'itin-note', v => { stop.note = v; }));
            stopsEl.append(row);
            refreshStopPhoto(row, photo, stop);
        });
    }

    function render() {
        renderDays();
        renderStops();
        const stops = totalStops();
        countEl.textContent = place
            ? `${days.length} day${days.length === 1 ? '' : 's'}, ${stops} stop${stops === 1 ? '' : 's'}`
            : '';
    }

    document.getElementById('itinAddStop').addEventListener('click', () => {
        days[active].stops.push({ time: '', name: '', note: '' });
        save(); render();
        const inputs = stopsEl.querySelectorAll('.itin-stop:last-child input');
        if (inputs[1]) inputs[1].focus();
    });

    document.getElementById('itinAddDay').addEventListener('click', () => {
        days.push({ label: `Day ${days.length + 1}`, stops: [] });
        active = days.length - 1;
        save(); render();
    });

    resetBtn.addEventListener('click', () => {
        days = seed();
        active = 0;
        save(); render();
    });

    // Called once a search resolves, so the plan matches the place.
    window.__buildItinerary = function (placeName, themeName) {
        place = placeName;
        theme = SEEDS[themeName] ? themeName : theme;
        days = load();
        active = 0;
        placeEl.textContent = `A suggested ${days.length}-day plan for ${place}. Edit anything.`;
        resetBtn.hidden = false;
        render();
    };

    // Nothing searched yet: show one empty day so the panel isn't blank.
    days = [{ label: 'Day 1', stops: [] }];
    render();
})();


/* ============================================================
   PLACE MEDIA (place-media.html)
   ============================================================ */
(function () {
    const SEARXNG_INSTANCES = [
          { url: 'https://search.catboy.house',                    direct: false },
{ url: 'https://search.mectov.my.id',                   direct: false },
{ url: 'https://searx.ononoki.org',                     direct: false },
{ url: 'https://sear.lurx.net',                         direct: false },
{ url: 'https://search.ethibox.fr',                     direct: false },
{ url: 'https://search.indst.eu',                       direct: false },
{ url: 'https://search.minus27315.dev',                 direct: false },
{ url: 'https://searxng.gdebest.net',                   direct: false },
{ url: 'https://searxng.paralaxitaentomology.org',      direct: false },
{ url: 'https://searx.tsmdt.de',                        direct: false },
{ url: 'https://searxng.cups.moe',                      direct: false },
{ url: 'https://search.2b9t.xyz',                       direct: false },
{ url: 'https://searxng.fishfvch.com',                  direct: false },
            { url: 'https://12388321.xyz',    direct: false },
        { url: 'https://chrispaganon.com', direct: false },
        { url: 'https://searx.smlnd.xyz',         direct: false },
        { url: 'https://searx.oloke.xyz',         direct: false },
        { url: 'https://searx.ch',                direct: false },
        { url: 'https://search.lumy.live',      direct: false },
        { url: 'https://search.rhscz.eu',       direct: true },
        { url: 'https://searxng.website',       direct: false },
        { url: 'https://searxng.site',          direct: false },
        { url: 'https://searx.rhscz.eu',        direct: true },
        { url: 'https://searx.dresden.network', direct: false },
        { url: 'https://searxng.gr',            direct: false },
        { url: 'https://search.unredacted.org', direct: false },
        { url: 'https://search.mdosch.de',      direct: false },
        { url: 'https://etsi.me',               direct: false },
        { url: 'https://search.anoni.net',      direct: false },
        { url: 'https://sx.xo.st',              direct: false },
        { url: 'https://baresearch.org',        direct: false },
        { url: 'https://priv.au',               direct: false },
        { url: 'https://paulgo.io',             direct: false },
        { url: 'https://opnxng.com',            direct: false },
        { url: 'https://libresearch.space',     direct: false },
        { url: 'https://searx.tiekoetter.com',  direct: false },
        { url: 'https://searx.namejeff.xyz',    direct: false },
        { url: 'https://searx.ononoki.org',     direct: false },
        { url: 'https://searx.sev.monster',     direct: false },
        { url: 'https://searxng.shreven.org',   direct: false },
        { url: 'https://searx.perennialte.ch',  direct: false },
        { url: 'https://searx.thefloatinglab.world', direct: false },
        { url: 'https://searxng.wuemeli.com',   direct: false },
        { url: 'https://xka.cz',                direct: false },
        { url: 'https://kantan.cat',            direct: false },
        { url: 'https://searx.ro',              direct: false },
        { url: 'https://anonsearch.win',        direct: false },
        { url: 'https://failsearx.culturanerd.it', direct: false },
    ];

    /* ============================================================
       SEARCH BACKENDS
       Four metasearch projects, each with its own JSON API. They are
       tried in list order: 4get, then Websurfx, then Degoog, then
       SearXNG last (it is the most rate-limited and the most likely to
       have JSON disabled). Every instance still goes through the same
       direct-then-proxy fallback and the same failure tally, so adding
       backends did not change the retry behaviour — only lengthened
       the queue.
       ============================================================ */

    // 4get — https://4get.ca/api.txt
    // /api/v1/web?s=  and  /api/v1/images?s=
    const FOURGET_INSTANCES = [
        { url: 'https://4get.ca',              engine: '4get', direct: false },
        { url: 'https://4get.nadeko.net',      engine: '4get', direct: false },
        { url: 'https://4get.silly.computer',  engine: '4get', direct: false },
        { url: 'https://4get.sijh.net',        engine: '4get', direct: false },
        { url: 'https://4get.hbubli.cc',       engine: '4get', direct: false },
        { url: 'https://4get.lunar.icu',       engine: '4get', direct: false },
        { url: 'https://4get.dcs0.hu',         engine: '4get', direct: false },
        { url: 'https://4get.neco.lol',        engine: '4get', direct: false },
        { url: 'https://4get.edmateo.site',    engine: '4get', direct: false },
        { url: 'https://4get.sudovanilla.org', engine: '4get', direct: false },
        { url: 'https://search.mint.lgbt',     engine: '4get', direct: false },
        { url: 'https://4get.aishiteiru.moe',  engine: '4get', direct: false },
        { url: 'https://4.nboeck.de',          engine: '4get', direct: false },
        { url: 'https://search.yonderly.org',  engine: '4get', direct: false },
        { url: 'https://4get.lurx.net',        engine: '4get', direct: false },
        { url: 'https://4get.canine.tools',    engine: '4get', direct: false },
        { url: 'https://4get.sny.sh',          engine: '4get', direct: false },
        { url: 'https://4g.opnxng.com',        engine: '4get', direct: false },
        { url: 'https://4get.privadency.com',  engine: '4get', direct: false },
        { url: 'https://4get.eloy.ar',         engine: '4get', direct: false },
        { url: 'https://search.fischbytes.de', engine: '4get', direct: false },
    ];

    // Websurfx — /search?q=…&json=true. Web results only; it has no
    // image endpoint, so the adapter declines the images category and
    // the loop moves straight on to the next instance.
    const WEBSURFX_INSTANCES = [
        { url: 'https://websurfx.co',                  engine: 'websurfx', direct: false },
        { url: 'https://websurfx.onrender.com',        engine: 'websurfx', direct: false },
        { url: 'https://alamin655-websurfx.hf.space',  engine: 'websurfx', direct: false },
    ];

    // Degoog — /api/search?q=…&type=web|images
    // Degoog has no published public-instance list that could be
    // verified, and instances ship with zero engines until their owner
    // installs some. Add any you trust here, or type "degoog:https://…"
    // into the Custom box.
    const DEGOOG_INSTANCES = [
    ];

    const ENGINES = {
        searxng: {
            label: 'SearXNG',
            supports: () => true,
            build: (base, query, categories) =>
                `${base}/search?q=${encodeURIComponent(query)}&categories=${categories}&format=json`,
            extract: data => data.results || [],
        },

        '4get': {
            label: '4get',
            supports: () => true,
            build: (base, query, categories) => {
                const endpoint = categories === 'images' ? 'images' : 'web';
                return `${base}/api/v1/${endpoint}?s=${encodeURIComponent(query)}`;
            },
            extract: (data, categories) => {
                // 4get always reports its own outcome in "status"; a
                // non-"ok" value with HTTP 200 means a captcha pass is
                // required or the scraper broke.
                if (data && data.status && data.status !== 'ok') {
                    throw failure('instance', `4get returned status "${data.status}"`);
                }
                if (categories === 'images') {
                    return (data.image || []).map(item => {
                        const sources = Array.isArray(item.source) ? item.source.filter(s => s && s.url) : [];
                        if (!sources.length) return null;
                        // The last source is documented as the thumbnail.
                        const full = sources[0].url;
                        const thumb = sources[sources.length - 1].url;
                        return {
                            title: item.title || '',
                            url: item.url || full,
                            img_src: full,
                            thumbnail_src: thumb,
                        };
                    }).filter(Boolean);
                }
                return (data.web || []).map(item => ({
                    title: item.title || '',
                    url: item.url,
                    content: item.description || '',
                    thumbnail: item.thumb && item.thumb.url ? item.thumb.url : undefined,
                })).filter(r => r.url);
            },
        },

        websurfx: {
            label: 'Websurfx',
            supports: categories => categories !== 'images',
            build: (base, query) => `${base}/search?q=${encodeURIComponent(query)}&json=true`,
            extract: data => (data.results || []).map(item => ({
                title: item.title || '',
                url: item.url,
                content: item.description || item.content || '',
            })).filter(r => r.url),
        },

        degoog: {
            label: 'Degoog',
            supports: () => true,
            build: (base, query, categories) => {
                const type = categories === 'images' ? 'images' : 'web';
                return `${base}/api/search?q=${encodeURIComponent(query)}&type=${type}`;
            },
            extract: (data, categories) => (data.results || []).map(item => {
                const thumb = item.thumbnail || item.imageUrl || item.image;
                if (categories === 'images') {
                    const full = item.imageUrl || item.image || thumb;
                    if (!full) return null;
                    return {
                        title: item.title || '',
                        url: item.url || full,
                        img_src: full,
                        thumbnail_src: thumb || full,
                    };
                }
                return {
                    title: item.title || '',
                    url: item.url,
                    content: item.snippet || item.content || '',
                    thumbnail: thumb,
                };
            }).filter(r => r && r.url),
        },
    };

    function engineFor(instance) {
        return ENGINES[(instance && instance.engine) || 'searxng'] || ENGINES.searxng;
    }

    // Try order: 4get → Websurfx → Degoog → SearXNG (secondary).
    const SEARCH_INSTANCES = [
        ...FOURGET_INSTANCES,
        ...WEBSURFX_INSTANCES,
        ...DEGOOG_INSTANCES,
        ...SEARXNG_INSTANCES.map(i => ({ ...i, engine: 'searxng' })),
    ];

    const mediaControls = document.getElementById('sharedSearchBlock');
    const instanceSelect = document.getElementById('instanceSelect');
    const customInstanceInput = document.getElementById('customInstanceInput');

    const imagesGrid = document.getElementById('imagesGrid');
    const shortsGrid = document.getElementById('shortsGrid');
    const reelsGrid = document.getElementById('reelsGrid');
    const imagesStatus = document.getElementById('imagesStatus');
    const shortsStatus = document.getElementById('shortsStatus');
    const reelsStatus = document.getElementById('reelsStatus');

    /* --------------------------------------------------------
       A request here passes through two layers that can each
       fail independently: the CORS proxy, and the SearXNG
       instance behind it. A proxy can return a perfectly healthy
       HTTP 200 while the instance inside it returned 429, so the
       outer status tells us almost nothing. Every failure below
       is tagged with the layer it came from, so one dead proxy
       can't mask a working one's diagnosis.
       -------------------------------------------------------- */

    function failure(kind, message, extra) {
        return Object.assign(new Error(message), { kind }, extra || {});
    }

    const LOOKS_LIKE_HTML = /^\s*(?:<!doctype|<html|<head|<body)/i;
    const LOOKS_RATE_LIMITED = /too many requests|rate.?limit/i;

    // Anything that comes back as a body — rather than as an HTTP status —
    // is always attributed to the instance, never to the proxy that
    // relayed it. Some proxies pass the upstream body through verbatim
    // with their own 200, so blaming the proxy here would retire a
    // perfectly healthy one.
    function parsePayload(text, source) {
        if (LOOKS_RATE_LIMITED.test(text.slice(0, 200))) {
            throw failure('instance', 'the instance responded HTTP 429', { status: 429 });
        }
        if (LOOKS_LIKE_HTML.test(text)) {
            throw failure('instance', `${source} served an HTML page instead of JSON (usually a bot check)`);
        }
        try {
            return JSON.parse(text);
        } catch {
            throw failure('instance', `${source} returned a response that isn't JSON`);
        }
    }

    const PROXIES = [
        { name: 'cors.io',    build: target => `https://cors.io/?url=${encodeURIComponent(target)}` },
        { name: 'cors-get-proxy', build: target => `https://cors-get-proxy.sirjosh.workers.dev/?url=${encodeURIComponent(target)}` },
        { name: 'allorigins', build: target => `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}` },
    ];

    // A proxy that is down stays down for the whole session. Without
    // this, a dead proxy burns a full timeout on every instance and
    // every section, which is what makes one bad proxy feel like a
    // total outage.
    const deadProxies = new Set();

    async function fetchJson(fetchUrl, proxyName) {
        const source = proxyName || 'the instance';

        let response;
        try {
            response = await fetch(fetchUrl, { signal: AbortSignal.timeout(12000) });
        } catch (err) {
            const reason = err.name === 'TimeoutError' ? 'timed out' : 'could not be reached';
            // A direct fetch that never returns is almost always the
            // browser's CORS policy, not a statement about the instance.
            // Tagging it 'transport' keeps it out of the diagnosis.
            throw failure(proxyName ? 'proxy' : 'transport', `${source} ${reason}`);
        }

        // A non-2xx here is the proxy (or a direct instance) failing,
        // not the instance behind a proxy.
        if (!response.ok) {
            throw failure(proxyName ? 'proxy' : 'instance', `${source} responded HTTP ${response.status}`, { status: response.status });
        }

        const parsed = parsePayload(await response.text(), source);

        // cors.io hands back an envelope: { url, status, headers, body }.
        // The real instance status lives inside it.
        if (parsed && typeof parsed.body === 'string' && typeof parsed.status === 'number') {
            if (parsed.status < 200 || parsed.status >= 300) {
                throw failure('instance', `the instance responded HTTP ${parsed.status}`, { status: parsed.status });
            }
            return parsePayload(parsed.body, 'the instance');
        }
        return parsed;
    }

    function dedupeCards(results, buildCard) {
        const seen = new Set();
        const cards = [];
        for (const result of results) {
            const card = buildCard(result);
            if (!card) continue;
            const key = card.dataset.key || card.href;
            if (seen.has(key)) continue;
            seen.add(key);
            cards.push(card);
        }
        return cards;
    }

    const INSTANCE_STORAGE_KEY = 'placeMedia.searxngInstance';

    function readStored(key) {
        try { return localStorage.getItem(key); } catch { return null; }
    }
    function writeStored(key, value) {
        try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
    }

    function normalizeInstanceUrl(raw) {
        let value = (raw || '').trim();
        if (!value) return null;
        if (!/^https?:\/\//i.test(value)) value = 'https://' + value;
        try {
            const u = new URL(value);
            return (u.origin + u.pathname).replace(/\/+$/, '');
        } catch {
            return null;
        }
    }

    function buildInstanceOptions() {
        const add = (value, label) => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = label;
            instanceSelect.appendChild(option);
        };
        add('auto', 'Auto (4get → Websurfx → Degoog → SearXNG)');
        for (const instance of SEARCH_INSTANCES) {
            const label = `${engineFor(instance).label} · ${new URL(instance.url).host}` + (instance.direct ? '' : ' (via proxy)');
            add(instance.url, label);
        }
        add('custom', 'Custom…');
    }

    function applyInstanceChoice(raw) {
        const known = SEARCH_INSTANCES.find(i => i.url === normalizeInstanceUrl(raw));
        if (!raw || raw === 'auto') {
            instanceSelect.value = 'auto';
        } else if (known) {
            instanceSelect.value = known.url;
        } else {
            instanceSelect.value = 'custom';
            customInstanceInput.value = raw === 'custom' ? '' : raw;
        }
        customInstanceInput.hidden = instanceSelect.value !== 'custom';
    }

    function currentInstanceChoice() {
        if (instanceSelect.value !== 'custom') return instanceSelect.value;
        const raw = (customInstanceInput.value || '').trim();
        return (parseCustomEntry(raw) ? raw : '') || 'custom';
    }

    // A custom entry may name its backend with a prefix, e.g.
    // "4get:https://4get.ca" or "degoog:https://my.box". Without one we
    // assume SearXNG, which is what the field originally accepted.
    function parseCustomEntry(raw) {
        const value = (raw || '').trim();
        const match = value.match(/^(searxng|4get|websurfx|degoog)\s*:\s*(.+)$/i);
        const engine = match ? match[1].toLowerCase() : 'searxng';
        const url = normalizeInstanceUrl(match ? match[2] : value);
        return url ? { url, engine, direct: null } : null;
    }

    function selectedInstances() {
        const value = instanceSelect.value;
        if (value === 'auto') return SEARCH_INSTANCES;
        if (value === 'custom') {
            const entry = parseCustomEntry(customInstanceInput.value);
            return entry ? [entry] : [];
        }
        return SEARCH_INSTANCES.filter(i => i.url === value);
    }

    async function searxSearch(query, categories, buildCard, instances) {
        // Tally why things failed, per layer, so the message at the end
        // names the real cause rather than whichever attempt happened
        // to be last.
        const tally = { instance: [], proxy: [], transport: [] };
        let rateLimited = 0;
        let blocked = 0;
        let anySucceeded = false;

        for (const instance of instances) {
            const engine = engineFor(instance);
            // Websurfx has no image endpoint; skipping is not a failure,
            // so it must not land in the tally.
            if (!engine.supports(categories)) continue;
            const target = engine.build(instance.url, query, categories);

            const attempts = [];
            if (instance.direct !== false) attempts.push({ url: target, proxy: null });
            for (const proxy of PROXIES) {
                if (deadProxies.has(proxy.name)) continue;
                attempts.push({ url: proxy.build(target), proxy: proxy.name });
            }

            let instanceSucceeded = false;
            for (const attempt of attempts) {
                try {
                    const data = await fetchJson(attempt.url, attempt.proxy);
                    // extract() can still reject a 200 (4get reports its
                    // own errors in the body), so it runs before the
                    // success flags are set.
                    const results = engine.extract(data, categories) || [];
                    anySucceeded = true;
                    instanceSucceeded = true;
                    const cards = dedupeCards(results, buildCard);
                    if (cards.length > 0) return cards;
                    // Reached the instance fine, it just had nothing usable.
                    // Another proxy would return the same thing, so move on
                    // to the next instance.
                    break;
                } catch (err) {
                    const kind = tally[err.kind] ? err.kind : 'instance';
                    tally[kind].push(err.message);
                    if (err.status === 429) rateLimited++;
                    if (/bot check/.test(err.message)) blocked++;

                    if (kind === 'proxy' && attempt.proxy) {
                        // Only a transport failure condemns a proxy. An
                        // instance error relayed through it means the proxy
                        // is doing its job.
                        deadProxies.add(attempt.proxy);
                        console.warn(`Proxy ${attempt.proxy} is down for this session: ${err.message}`);
                    } else {
                        console.warn(`${instance.url}: ${err.message}`);
                    }
                }
            }
            if (instanceSucceeded) continue;
        }

        if (anySucceeded) return [];

        // Nothing got through. Lead with the instance-side reason if we
        // have one, because "the proxy is down" is only the real story
        // when no instance ever answered.
        if (rateLimited > 0) {
            throw failure('instance', `Instances are rate-limiting right now (HTTP 429). Wait a minute, or pick a specific instance.`);
        }
        if (blocked > 0) {
            throw failure('instance', `Instances are serving bot checks instead of results. Try a different instance.`);
        }
        if (tally.instance.length > 0) {
            throw failure('instance', tally.instance[0]);
        }
        const names = [...deadProxies];
        const downProxies = names.length > 1
            ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
            : names[0] || '';
        if (downProxies) {
            throw failure('proxy', `The CORS proxies are unavailable (${downProxies}). Pick an instance marked as direct, or set a custom one.`);
        }
        throw failure('transport', 'No instance could be reached. Check your connection, or set a custom instance.');
    }

    // The Show-more button is a sibling of the grid, not a child, so
    // emptying the grid would otherwise leave a button behind pointing at
    // cards that no longer exist.
    function clear(el) {
        el.innerHTML = '';
        const button = el.parentElement && el.parentElement.querySelector('.show-more');
        if (button) button.remove();
    }

    // How many cards a section shows before it collapses the rest.
    const COLLAPSE_LIMIT = 6;
    // Outfits is 4 columns wide; one row is 4 cards.
    const OUTFITS_COLLAPSE_LIMIT = 4;

    function applyCollapse(grid, limit = COLLAPSE_LIMIT) {
        const overflow = Array.from(grid.children).slice(limit);
        if (overflow.length === 0) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'show-more';
        let expanded = false;

        function paint() {
            // Cards can delete themselves after this runs — a thumbnail
            // that fails to load pulls its own card — so the live set is
            // recounted every time rather than trusted from setup.
            const live = overflow.filter(card => card.isConnected);
            if (live.length === 0) { button.remove(); return; }
            live.forEach(card => { card.hidden = !expanded; });
            button.textContent = expanded ? 'Show less' : `Show ${live.length} more`;
        }

        button.addEventListener('click', () => {
            expanded = !expanded;
            paint();
            if (!expanded) button.scrollIntoView({ block: 'nearest' });
        });

        paint();
        grid.after(button);
    }

    function imageCard(result) {
        const a = document.createElement('a');
        a.className = 'card';
        a.href = result.url || result.img_src;
        a.target = '_blank';
        a.rel = 'noopener';
        const img = document.createElement('img');
        img.className = 'thumb';
        img.loading = 'lazy';
        img.src = result.thumbnail_src || result.img_src;
        img.alt = result.title || '';
        // Some thumbnail URLs from search results are dead, blocked by
        // hotlink protection, or time out. Rather than leaving a broken
        // image icon in the grid, remove the whole card the moment it
        // fails to load. If the status line is showing "0 results" text
        // for this section (because every card in the grid failed), swap
        // it back on so the user isn't left staring at an empty section
        // with no explanation.
        function removeCard() {
            a.remove();
            if (imagesGrid.children.length === 0) {
                imagesStatus.textContent = 'No images could be loaded.';
                imagesStatus.classList.add('error');
            }
        }
        img.addEventListener('error', removeCard);
        // Some hotlink-protected servers respond 200 with a tiny
        // placeholder pixel instead of a real 404, so `error` never
        // fires even though the thumbnail is useless. Catch those too.
        img.addEventListener('load', () => {
            if (img.naturalWidth < 10 || img.naturalHeight < 10) removeCard();
        });
        a.appendChild(img);
        return a;
    }

    // YouTube results are searched broadly rather than requiring a /shorts URL.
    // Many search engines/indexers return ordinary /watch URLs for Shorts, so
    // normalize all common YouTube URL forms and render them consistently.
    function extractYouTubeId(rawUrl) {
        if (!rawUrl) return null;
        try {
            const u = new URL(rawUrl);
            const host = u.hostname.toLowerCase().replace(/^www\./, '');
            if (host === 'youtu.be') {
                const id = u.pathname.split('/').filter(Boolean)[0] || '';
                return /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
            }
            if (host === 'youtube.com' || host === 'm.youtube.com') {
                const shorts = u.pathname.match(/^\/shorts\/([a-zA-Z0-9_-]{11})/);
                if (shorts) return shorts[1];
                const embed = u.pathname.match(/^\/embed\/([a-zA-Z0-9_-]{11})/);
                if (embed) return embed[1];
                const v = u.searchParams.get('v');
                if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
            }
        } catch {
            const fallback = String(rawUrl).match(/(?:youtube\.com\/(?:shorts\/|watch\?[^#]*v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return fallback ? fallback[1] : null;
        }
        return null;
    }

    function shortsCard(result) {
        const id = extractYouTubeId(result.url || result.link || '');
        if (!id) return null;

        const div = document.createElement('div');
        div.className = 'card video';
        div.dataset.key = id;

        const iframe = document.createElement('iframe');
        iframe.className = 'thumb';
        iframe.loading = 'lazy';
        iframe.src = `https://www.youtube.com/embed/${id}?rel=0`;
        iframe.title = result.title || 'YouTube travel video';
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share');
        iframe.allowFullscreen = true;

        const cap = document.createElement('div');
        cap.className = 'caption';
        cap.textContent = result.title || 'YouTube video';

        div.appendChild(iframe);
        div.appendChild(cap);
        return div;
    }

    function reelCard(result) {
        // Instagram results do not always expose a thumbnail through SearXNG.
        // We try up to three sources in sequence; if all fail we show an inline
        // SVG poster so the card is always visible and tappable.
        //
        // Fallback chain (most to least likely to work across devices/networks):
        //   1. SearXNG-provided thumbnail (direct CDN URL — fastest, no extra hop)
        //   2. thum.io screenshot (works on desktop, blocked by some mobile CSPs)
        //   3. htmlcsstoimage.com screenshot (alternative screenshot service)
        //   4. Inline SVG placeholder (always works — no network needed)
        const directThumb = result.thumbnail || result.img_src || result.thumbnail_src;
        const encodedUrl = result.url ? encodeURIComponent(result.url) : '';
        const fallbacks = [
            directThumb,
            encodedUrl ? `https://image.thum.io/get/width/600/crop/900/noanimate/${result.url}` : null,
            encodedUrl ? `https://api.urlbox.io/v1/render/png?url=${encodedUrl}&width=600&height=900&format=png` : null,
        ].filter(Boolean);

        const a = document.createElement('a');
        a.className = 'card video';
        a.href = result.url || '#';
        a.target = '_blank';
        a.rel = 'noopener';

        const img = document.createElement('img');
        img.className = 'thumb';
        img.loading = 'lazy';
        img.alt = result.title || 'Instagram Reel';
        img.crossOrigin = 'anonymous';

        let fallbackIndex = 0;

        function tryNext() {
            if (fallbackIndex < fallbacks.length) {
                img.src = fallbacks[fallbackIndex++];
            } else {
                // All remote sources failed — show an inline SVG so the card
                // remains present and tappable on every device.
                img.remove();
                const poster = document.createElement('div');
                poster.className = 'thumb reel-poster';
                poster.innerHTML = `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg"
                    style="width:48px;height:auto;opacity:.55">
                    <rect width="60" height="80" rx="8" fill="none"/>
                    <circle cx="30" cy="40" r="18" stroke="currentColor" stroke-width="3" fill="none"/>
                    <polygon points="25,32 25,48 41,40" fill="currentColor"/>
                </svg>`;
                a.insertBefore(poster, a.firstChild);
            }
        }

        img.addEventListener('error', () => {
            // Reject tiny placeholder pixels the same as a real error.
            tryNext();
        });
        img.addEventListener('load', () => {
            if (img.naturalWidth > 0 && img.naturalWidth < 10) tryNext();
        });

        tryNext();  // kick off with the first candidate

        const cap = document.createElement('div');
        cap.className = 'caption';
        cap.textContent = result.title || 'Instagram Reel';
        a.appendChild(img);
        a.appendChild(cap);
        return a;
    }

    let mediaLoadToken = 0;

    async function loadSection(grid, statusEl, query, categories, buildCard, emptyMsg, instances, token) {
        statusEl.textContent = 'Loading…';
        statusEl.classList.remove('error');
        clear(grid);
        try {
            const cards = await searxSearch(query, categories, buildCard, instances);
            if (token !== mediaLoadToken) return;
            clear(grid);
            cards.forEach(card => grid.appendChild(card));
            applyCollapse(grid);
            statusEl.textContent = cards.length > 0 ? '' : emptyMsg;
        } catch (err) {
            if (token !== mediaLoadToken) return;
            console.error(query, categories, err);
            // searxSearch already worked out which layer failed, so show
            // that rather than a generic message that blames nothing.
            statusEl.textContent = err.kind
                ? err.message
                : (instances.length === 1
                    ? `Could not load results from ${new URL(instances[0].url).host}. Try another instance.`
                    : 'Could not load results right now.');
            statusEl.classList.add('error');
        }
    }

    let currentPlace = '';
    // Gender-specific outfit cards are retained while the current destination is open.
    const outfitGenderCache = new Map();

    const sectionsOverlay = document.getElementById('sectionsLoadingOverlay');
    const outfitMediaLayout = document.querySelector('.outfit-media-layout');
    const SECTIONS_FADE_MS = 300; // matches .sections-loading's transition duration

    function showSectionsOverlay() {
        if (!sectionsOverlay) return;
        outfitMediaLayout?.classList.add('is-loading');
        sectionsOverlay.hidden = false;
        // Force layout so the browser registers the element as visible
        // before the class below flips opacity — otherwise, since both
        // changes would land in the same frame, the fade-in never plays.
        void sectionsOverlay.offsetWidth;
        sectionsOverlay.classList.add('is-visible');
    }

    function hideSectionsOverlay() {
        if (!sectionsOverlay) return;
        sectionsOverlay.classList.remove('is-visible');
        setTimeout(() => {
            // Only actually reveal/hide once faded out, and only if a
            // newer search hasn't already faded it back in during that
            // wait. Keeping is-loading (which caps section growth) until
            // this point means nothing resizes while the overlay is still
            // visibly fading — the content only pops to full size once
            // the overlay covering it is already gone.
            if (!sectionsOverlay.classList.contains('is-visible')) {
                sectionsOverlay.hidden = true;
                outfitMediaLayout?.classList.remove('is-loading');
            }
        }, SECTIONS_FADE_MS);
    }

    function loadPlace(rawName) {
        outfitGenderCache.clear();
        const name = rawName.trim();
        if (!name) return;
        currentPlace = name;
        const token = ++mediaLoadToken;

        const instances = selectedInstances();
        if (instances.length === 0) {
            for (const [grid, statusEl] of [[imagesGrid, imagesStatus], [shortsGrid, shortsStatus], [reelsGrid, reelsStatus], [outfitsGrid, outfitsStatus]]) {
                clear(grid);
                statusEl.textContent = 'Enter a valid instance URL (optionally prefixed with 4get:, websurfx: or degoog:).';
                statusEl.classList.add('error');
            }
            return;
        }

        showSectionsOverlay();

        const jobs = [
            loadSection(imagesGrid, imagesStatus, name, 'images', imageCard, 'No images found.', instances, token),
            loadSection(shortsGrid, shortsStatus, `${name} India travel YouTube Shorts`, 'general', shortsCard, 'No shorts found.', instances, token),
            loadSection(reelsGrid, reelsStatus, `${name} site:instagram.com/reel`, 'general', reelCard, 'No reels found.', instances, token),
            loadOutfits(name, instances, token),
        ];
        // allSettled, not all — one section failing shouldn't leave the
        // overlay stuck up over the three that succeeded. Only clear it if
        // this is still the most recent search (a newer one already
        // showed the overlay again and owns hiding it).
        Promise.allSettled(jobs).then(() => {
            if (token === mediaLoadToken) hideSectionsOverlay();
        });
    }

    function onInstanceChanged() {
        customInstanceInput.hidden = instanceSelect.value !== 'custom';
        writeStored(INSTANCE_STORAGE_KEY, currentInstanceChoice());
        if (instanceSelect.value === 'custom' && !customInstanceInput.value.trim()) {
            customInstanceInput.focus();
            return;
        }
        if (currentPlace) loadPlace(currentPlace);
    }
    instanceSelect.addEventListener('change', onInstanceChanged);
    customInstanceInput.addEventListener('change', onInstanceChanged);

    buildInstanceOptions();

    const params = new URLSearchParams(window.location.search);
    applyInstanceChoice(params.get('instance') || readStored(INSTANCE_STORAGE_KEY));
    // ?location= is handled once, at the bottom of this file, where every
    // dependency of loadPlace() has already been initialised.

    /* --------------------------------------------------------
       DESTINATION TYPE -> OUTFIT ROUTING
       The visible choices are derived from the selected destination's
       state. Choosing a type routes the outfit search toward a
       weather-aware clothing query.
       -------------------------------------------------------- */
    let selectedOutfitStyle = 'traditional wear';
    let selectedPlaceType = '';
    let selectedOutfitGender = 'men';
    let currentOutfitStateKey = '';
    let currentOutfitWeather = '';

    const DESTINATION_TYPES = [
        {key:'beaches', icon:'🏖️', label:'Beaches', states:['goa','kerala','tamil nadu','maharashtra','karnataka','odisha','andhra pradesh','west bengal','gujarat','andaman and nicobar islands','lakshadweep'], style:'swimsuits', query:'beachwear swimsuits', note:'Choose swimwear plus a light cover-up; keep fabrics breathable in hot or humid weather.'},
        {key:'wildlife', icon:'🦁', label:'Safari / Wildlife', states:['rajasthan','madhya pradesh','karnataka','maharashtra','assam','uttarakhand','kerala','gujarat','west bengal','odisha','uttar pradesh','tamil nadu'], style:'casual wear', query:'safari wear camo shorts', note:'For safari, choose neutral/camo shorts or trousers, a light breathable top and closed shoes. Add a warm layer in cool weather.'},
        {key:'mountains', icon:'🏔️', label:'Mountains', states:['himachal pradesh','uttarakhand','jammu and kashmir','ladakh','sikkim','arunachal pradesh','west bengal'], style:'casual wear', query:'mountain travel wear layers', note:'Use layered casual wear: breathable base + fleece/jacket when cool, with weatherproof shoes if needed.'},
        {key:'hill-stations', icon:'🌲', label:'Hill Stations', states:['himachal pradesh','uttarakhand','tamil nadu','kerala','karnataka','west bengal','sikkim','maharashtra'], style:'casual wear', query:'hill station outfits layers', note:'Cool hill weather calls for layers; use lighter cotton layers in warmer daytime conditions.'},
        {key:'desert', icon:'🏜️', label:'Desert', states:['rajasthan','gujarat'], style:'casual wear', query:'desert travel outfits breathable', note:'For hot dry weather, pick loose breathable clothing, sunglasses and comfortable closed footwear; add a layer after sunset.'},
        {key:'lakes', icon:'🏞️', label:'Lakes', states:['jammu and kashmir','uttarakhand','rajasthan','sikkim','manipur','meghalaya'], style:'casual wear', query:'lake travel outfits', note:'Lake weather can shift quickly, so use comfortable layers suited to the local temperature.'},
        {key:'waterfalls', icon:'💦', label:'Waterfalls', states:['karnataka','kerala','meghalaya','tamil nadu','maharashtra','odisha','chhattisgarh','jharkhand','goa'], style:'casual wear', query:'waterfall trekking outfits quick dry', note:'Wear quick-dry casual clothing, grippy shoes and a light rain layer when the area is wet.'},
        {key:'backwaters', icon:'🌴', label:'Backwaters', states:['kerala'], style:'casual wear', query:'kerala backwaters outfits breathable', note:'Choose light breathable fabrics; carry a rain-ready layer for humid or monsoon conditions.'},
        {key:'temples', icon:'🛕', label:'Temples / Pilgrimage', states:['uttar pradesh','uttarakhand','tamil nadu','odisha','andhra pradesh','telangana','karnataka','maharashtra','gujarat','rajasthan','bihar','punjab'], style:'traditional wear', query:'modest traditional ethnic wear temple', note:'For temples and holy places, choose modest/traditional wear with covered shoulders and knees where appropriate.'},
        {key:'heritage', icon:'🕌', label:'Historic / Heritage', states:['delhi','uttar pradesh','rajasthan','madhya pradesh','maharashtra','punjab','west bengal','goa','tamil nadu','kerala'], style:'traditional wear', query:'ethnic traditional heritage outfits', note:'Heritage destinations pair well with ethnic/traditional wear. Choose a lighter or warmer version according to the local weather.'},
        {key:'forts', icon:'🏰', label:'Forts & Palaces', states:['rajasthan','maharashtra','madhya pradesh','karnataka','telangana','andhra pradesh','gujarat'], style:'traditional wear', query:'ethnic wear fort palace travel', note:'Traditional/ethnic outfits work especially well for forts and palaces; prioritise breathable fabrics in hot weather.'},
        {key:'colonial', icon:'🏛️', label:'Colonial Heritage', states:['west bengal','goa','maharashtra','tamil nadu','kerala','delhi'], style:'formal wear', query:'smart heritage travel outfits', note:'Smart-casual or polished outfits suit colonial streets; adjust layers to humidity, rain or cooler weather.'},
        {key:'ancient', icon:'🗿', label:'Ancient / Archaeological', states:['madhya pradesh','uttar pradesh','bihar','odisha','karnataka','tamil nadu','andhra pradesh','gujarat','maharashtra'], style:'traditional wear', query:'ethnic archaeological site travel wear', note:'Comfortable ethnic or modest casual wear works well for long site walks; choose weather-appropriate breathable layers.'},
        {key:'culture', icon:'🎨', label:'Culture & Heritage', states:['rajasthan','gujarat','west bengal','kerala','tamil nadu','odisha','punjab','assam','karnataka'], style:'traditional wear', query:'ethnic traditional cultural outfits', note:'Start with ethnic/traditional wear, then choose lighter or warmer fabrics according to the destination weather.'},
        {key:'tea', icon:'🌿', label:'Tea Gardens', states:['assam','west bengal','tamil nadu','kerala'], style:'casual wear', query:'tea garden outfits rainy cool', note:'Comfortable layers and walking shoes are ideal; carry a rain layer for wet garden conditions.'},
        {key:'monsoon', icon:'🌧️', label:'Monsoon / Lush Escapes', states:['kerala','goa','meghalaya','karnataka','maharashtra','tamil nadu'], style:'casual wear', query:'monsoon travel outfits quick dry', note:'Choose quick-dry fabrics, breathable layers and footwear with good grip.'},
        {key:'snow', icon:'❄️', label:'Snow Destinations', states:['jammu and kashmir','himachal pradesh','uttarakhand','sikkim','arunachal pradesh','ladakh'], style:'casual wear', query:'snow destination winter outfits thermals', note:'Use thermal layers, insulated jackets and warm footwear; avoid relying on a single heavy layer.'},
        {key:'adventure', icon:'🧗', label:'Adventure', states:['uttarakhand','himachal pradesh','jammu and kashmir','ladakh','sikkim','goa','karnataka','meghalaya','arunachal pradesh'], style:'casual wear', query:'adventure travel outfits activewear', note:'Choose breathable activewear and secure footwear; layer up in mountain or cold conditions.'},
        {key:'water-sports', icon:'🏄', label:'Water Sports', states:['goa','kerala','karnataka','andaman and nicobar islands','lakshadweep','tamil nadu','odisha'], style:'swimsuits', query:'water sports swimwear beachwear', note:'Swimwear is the starting point; add a sun-safe cover-up and light layer according to heat and wind.'},
        {key:'diving', icon:'🤿', label:'Scuba / Snorkeling', states:['andaman and nicobar islands','lakshadweep','goa','tamil nadu'], style:'swimsuits', query:'scuba snorkeling swimwear rash guard', note:'Choose swimwear or a rash guard suited to water activity, plus a cover-up for time out of the water.'},
        {key:'boating', icon:'🚤', label:'Boating / Cruises', states:['kerala','goa','jammu and kashmir','rajasthan','assam','andaman and nicobar islands'], style:'casual wear', query:'boat cruise travel outfits', note:'Pick comfortable breathable outfits and bring an extra layer because wind can make the water feel cooler.'},
        {key:'rainforest', icon:'🌳', label:'Rainforests / Jungle', states:['kerala','karnataka','assam','arunachal pradesh','meghalaya','odisha','west bengal'], style:'casual wear', query:'jungle rainforest travel wear quick dry', note:'Quick-dry casual clothing, sturdy shoes and a rain layer are the safest outfit direction.'},
        {key:'camping', icon:'🏕️', label:'Camping', states:['himachal pradesh','uttarakhand','ladakh','rajasthan','jammu and kashmir','sikkim','meghalaya'], style:'casual wear', query:'camping outfits layers outdoor', note:'Choose practical outdoor layers and closed footwear; night temperatures can drop sharply.'},
        {key:'stargazing', icon:'🌌', label:'Stargazing', states:['ladakh','rajasthan','himachal pradesh','uttarakhand','sikkim'], style:'casual wear', query:'stargazing night travel outfits warm', note:'Night temperatures matter most: carry warm layers even when daytime weather is pleasant.'},
        {key:'islands', icon:'🏝️', label:'Islands', states:['andaman and nicobar islands','lakshadweep','west bengal','odisha'], style:'swimsuits', query:'island beachwear swimwear outfits', note:'Swimwear and breezy beach layers work well; protect against strong sun and humidity.'},
        {key:'sunset', icon:'🌅', label:'Sunset / Scenic Coast', states:['goa','kerala','tamil nadu','maharashtra','odisha','gujarat'], style:'casual wear', query:'coastal sunset outfits', note:'Choose breezy outfits for the coast and add a light layer when evenings become windy or cool.'},
        {key:'valleys', icon:'🌄', label:'Valleys', states:['himachal pradesh','uttarakhand','jammu and kashmir','sikkim','arunachal pradesh'], style:'casual wear', query:'valley travel outfits layers', note:'Layered casual wear is the safest choice because valley temperatures can vary through the day.'},
        {key:'shopping', icon:'🛍️', label:'Shopping / Markets', states:['delhi','rajasthan','maharashtra','gujarat','west bengal','karnataka','tamil nadu'], style:'casual wear', query:'shopping market comfortable outfits India', note:'Prioritise breathable, comfortable clothing and shoes for long market walks; adapt layers to weather.'},
        {key:'food', icon:'🍛', label:'Food Tourism', states:['punjab','rajasthan','gujarat','maharashtra','goa','kerala','tamil nadu','west bengal','telangana','uttar pradesh'], style:'casual wear', query:'food tourism outfits India', note:'Comfortable casual wear works best for food walks; choose breathable fabrics in hot or humid climates.'},
        {key:'festivals', icon:'🎭', label:'Festivals', states:['rajasthan','gujarat','kerala','west bengal','punjab','tamil nadu','assam','odisha','goa'], style:'traditional wear', query:'festive ethnic traditional wear India', note:'Traditional/festive wear is a good starting point; choose fabric weight based on heat, rain or cold.'},
        {key:'romantic', icon:'💑', label:'Romantic / Honeymoon', states:['kerala','goa','jammu and kashmir','himachal pradesh','uttarakhand','rajasthan','andaman and nicobar islands'], style:'casual wear', query:'romantic honeymoon outfits India', note:'Comfortable polished outfits work well; use breezy fabrics for warm destinations and layers for cooler ones.'},
        {key:'wellness', icon:'🧘', label:'Wellness / Yoga', states:['kerala','uttarakhand','goa','karnataka','tamil nadu'], style:'casual wear', query:'yoga wellness travel outfits', note:'Breathable flexible clothing is best; choose moisture-friendly fabrics for warm humid locations.'},
        {key:'spiritual', icon:'🧘‍♀️', label:'Spiritual Retreats', states:['uttarakhand','kerala','tamil nadu','uttar pradesh','bihar','rajasthan'], style:'traditional wear', query:'modest spiritual retreat ethnic wear', note:'Choose modest, comfortable traditional clothing, with lighter layers for heat and warmer layers when needed.'},
        {key:'urban', icon:'🏙️', label:'Urban / City Tourism', states:['delhi','maharashtra','karnataka','west bengal','telangana','tamil nadu','gujarat'], style:'formal wear', query:'city travel smart casual outfits India', note:'Smart-casual or formal wear fits city tourism; adjust for heat, monsoon and walking.'},
        {key:'road-trips', icon:'🏎️', label:'Road Trips', states:['rajasthan','ladakh','himachal pradesh','kerala','karnataka','gujarat','tamil nadu'], style:'casual wear', query:'road trip comfortable outfits India', note:'Comfortable casual travel clothes and supportive shoes are best; layer according to route temperature.'},
        {key:'train', icon:'🚂', label:'Scenic Train Journeys', states:['maharashtra','tamil nadu','west bengal','himachal pradesh','karnataka','kerala'], style:'casual wear', query:'scenic train journey outfits India', note:'Choose comfortable travel layers and a light jacket for air-conditioned coaches or cooler routes.'},
        {key:'river', icon:'🌊', label:'River Tourism', states:['assam','kerala','goa','uttarakhand','west bengal','arunachal pradesh'], style:'casual wear', query:'river tourism outfits breathable', note:'Light breathable clothing is useful, with a rain or warm layer based on the local conditions.'},
        {key:'offbeat', icon:'🌳', label:'Offbeat / Hidden Gems', states:['meghalaya','arunachal pradesh','nagaland','mizoram','tripura','sikkim','chhattisgarh','odisha'], style:'casual wear', query:'offbeat travel outfits India', note:'Practical casual layers work best; expect changing weather and less predictable terrain.'}
    ];


    /* ============================================================
       SOUVENIRS OF THE REGION
       Curated per-state dataset. Keys are normalizeState() output,
       so they match whatever the geocoder resolves the search to.
       Each item links out to a marketplace search for the same craft,
       which keeps the list useful without needing a live API.
       ============================================================ */
    const STATE_SOUVENIRS = {
        'rajasthan': { note: 'Johari Bazaar (Jaipur), Sardar Market (Jodhpur) and Hathi Pol (Udaipur) are the classic craft bazaars.', items: [
            { icon: '🧣', name: 'Bandhani textiles', note: 'Tie-dyed dupattas, turbans and sarees', q: 'bandhani dupatta rajasthan' },
            { icon: '🏺', name: 'Blue pottery', note: 'Jaipur glazed ceramic bowls, tiles, vases', q: 'jaipur blue pottery' },
            { icon: '👡', name: 'Mojari jutti', note: 'Hand-stitched leather footwear', q: 'rajasthani mojari jutti' },
            { icon: '🪆', name: 'Kathputli puppets', note: 'Painted string puppets from folk theatre', q: 'rajasthani kathputli puppet' },
            { icon: '🖼️', name: 'Miniature paintings', note: 'Mughal and Rajput style work on paper or silk', q: 'rajasthani miniature painting' },
            { icon: '🪔', name: 'Lac bangles & brassware', note: 'Coloured lac bangles, engraved metal decor', q: 'rajasthani lac bangles' }
        ]},
        'kerala': { note: 'Spice markets in Fort Kochi and Thekkady, and handloom co-operatives for Kasavu.', items: [
            { icon: '🌶️', name: 'Cardamom & spices', note: 'Cardamom, pepper, cloves, cinnamon', q: 'kerala cardamom pepper spices' },
            { icon: '🥻', name: 'Kasavu saree', note: 'Off-white cotton with gold zari border', q: 'kerala kasavu saree' },
            { icon: '🪵', name: 'Coir & rosewood crafts', note: 'Coir mats, carved wooden figures', q: 'kerala coir mat handicraft' },
            { icon: '🎭', name: 'Kathakali masks', note: 'Miniature painted faces and wall pieces', q: 'kathakali mask wall decor' },
            { icon: '🫖', name: 'Munnar tea', note: 'High-range estate teas', q: 'munnar tea kerala' },
            { icon: '🧴', name: 'Ayurvedic oils', note: 'Coconut-based hair and massage oils', q: 'kerala ayurvedic hair oil' }
        ]},
        'himachal pradesh': { note: 'Lakkar Bazaar (Shimla), Mall Road (Manali) and Kullu handloom societies.', items: [
            { icon: '🧥', name: 'Kullu shawls', note: 'Geometric-bordered woollen shawls', q: 'kullu shawl himachal' },
            { icon: '🧢', name: 'Himachali cap', note: 'Velvet-trimmed traditional topi', q: 'himachali cap topi' },
            { icon: '🧦', name: 'Woollen knits', note: 'Socks, gloves, mufflers, angora wraps', q: 'himachal woollen socks gloves' },
            { icon: '🍎', name: 'Apple products', note: 'Apple jam, cider vinegar, dried fruit', q: 'himachal apple jam' },
            { icon: '☸️', name: 'Tibetan crafts', note: 'Thangka prints, prayer flags, silver jewellery (Dharamshala)', q: 'tibetan thangka prayer flags' },
            { icon: '🪵', name: 'Deodar woodcraft', note: 'Carved boxes and kitchenware', q: 'himachal wooden carved box' }
        ]},
        'karnataka': { note: 'Cauvery emporiums, Devaraja Market (Mysuru) and Channapatna toy town on the Mysuru road.', items: [
            { icon: '🥻', name: 'Mysore silk saree', note: 'Pure silk with gold zari', q: 'mysore silk saree' },
            { icon: '🪵', name: 'Sandalwood carvings', note: 'Figurines, oil, soap', q: 'mysore sandalwood soap oil' },
            { icon: '🧸', name: 'Channapatna toys', note: 'Lacquered wooden toys in natural dyes', q: 'channapatna wooden toys' },
            { icon: '☕', name: 'Coorg coffee', note: 'Arabica and robusta from the estates', q: 'coorg coffee beans' },
            { icon: '🍬', name: 'Mysore pak', note: 'Ghee-rich gram flour sweet', q: 'mysore pak sweet box' },
            { icon: '🪘', name: 'Bidriware', note: 'Blackened metal inlaid with silver', q: 'bidriware bidar handicraft' }
        ]},
        'goa': { note: 'Anjuna flea market (Wednesdays), Mapusa market (Fridays) and Panaji boutiques.', items: [
            { icon: '🥜', name: 'Goan cashews', note: 'Roasted, salted or masala-coated', q: 'goan cashew nuts' },
            { icon: '🍰', name: 'Bebinca', note: 'Layered coconut-egg cake, travels well', q: 'goan bebinca' },
            { icon: '🌶️', name: 'Recheado & vindaloo masala', note: 'Goan spice pastes and pickles', q: 'goan recheado masala' },
            { icon: '🐚', name: 'Shell & beach crafts', note: 'Lamps, wind chimes, jewellery', q: 'seashell handicraft lamp' },
            { icon: '👕', name: 'Boho beachwear', note: 'Printed cottons, sarongs, handmade silver', q: 'goa boho beachwear' },
            { icon: '🍶', name: 'Feni', note: 'Cashew or coconut spirit (check transport rules)', q: 'goa feni' }
        ]},
        'tamil nadu': { note: 'Kanchipuram weaver societies, Swamimalai bronze workshops and Poompuhar emporiums.', items: [
            { icon: '🥻', name: 'Kanchipuram silk', note: 'Heavy silk sarees with contrast borders', q: 'kanchipuram silk saree' },
            { icon: '🪔', name: 'Bronze idols', note: 'Swamimalai lost-wax casting', q: 'swamimalai bronze idol' },
            { icon: '🖼️', name: 'Tanjore painting', note: 'Gold-foil relief art', q: 'tanjore painting' },
            { icon: '☕', name: 'Filter coffee set', note: 'Steel dabara tumbler and coffee powder', q: 'south indian filter coffee set' },
            { icon: '🧺', name: 'Palm-leaf & korai mats', note: 'Woven baskets, mats and fans', q: 'korai grass mat tamil nadu' },
            { icon: '🪵', name: 'Thanjavur dolls', note: 'Bobble-head dancing dolls', q: 'thanjavur thalayatti bommai' }
        ]},
        'maharashtra': { note: 'Colaba Causeway (Mumbai), Tulsi Baug (Pune) and Kolhapur leather lanes.', items: [
            { icon: '🥻', name: 'Paithani saree', note: 'Silk with peacock and lotus motifs', q: 'paithani saree' },
            { icon: '👡', name: 'Kolhapuri chappals', note: 'Hand-tooled leather sandals', q: 'kolhapuri chappal' },
            { icon: '💎', name: 'Kolhapuri saaj', note: 'Traditional gold-toned neckpiece', q: 'kolhapuri saaj necklace' },
            { icon: '🍬', name: 'Chikki & bakarwadi', note: 'Lonavala chikki, Pune bakarwadi', q: 'lonavala chikki bakarwadi' },
            { icon: '🍇', name: 'Nashik wine & grapes', note: 'Bottles from the Nashik valley', q: 'nashik wine india' },
            { icon: '🪵', name: 'Warli art', note: 'Tribal white-on-ochre painting', q: 'warli painting wall art' }
        ]},
        'uttarakhand': { note: 'Tibetan market (Dehradun), Mall Road (Nainital) and village co-operatives.', items: [
            { icon: '🍯', name: 'Himalayan honey', note: 'Raw multi-floral and buransh honey', q: 'himalayan raw honey' },
            { icon: '🌾', name: 'Pahadi grains & dals', note: 'Mandua, jhangora, bhatt, gahat', q: 'pahadi mandua flour bhatt dal' },
            { icon: '🧣', name: 'Woollen shawls', note: 'Pashmina-style wraps and stoles', q: 'uttarakhand woollen shawl' },
            { icon: '🌸', name: 'Buransh juice', note: 'Rhododendron squash from the hills', q: 'buransh juice rhododendron' },
            { icon: '🪵', name: 'Ringal bamboo craft', note: 'Baskets, mats, lampshades', q: 'ringal bamboo basket' },
            { icon: '🖼️', name: 'Aipan art', note: 'Red-and-white Kumaoni motif work', q: 'aipan art uttarakhand' }
        ]},
        'west bengal': { note: 'New Market and College Street (Kolkata), Bishnupur for terracotta and Baluchari.', items: [
            { icon: '🥻', name: 'Baluchari & tant sarees', note: 'Narrative silk and crisp cotton handloom', q: 'baluchari saree bengal' },
            { icon: '🏺', name: 'Bishnupur terracotta', note: 'Temple-style horses, plaques, panels', q: 'bankura terracotta horse' },
            { icon: '🫖', name: 'Darjeeling tea', note: 'First and second flush leaf', q: 'darjeeling tea first flush' },
            { icon: '🪡', name: 'Kantha embroidery', note: 'Running-stitch stoles and quilts', q: 'kantha stitch stole' },
            { icon: '🎭', name: 'Dokra metalcraft', note: 'Lost-wax brass tribal figures', q: 'dokra art brass figurine' },
            { icon: '🍬', name: 'Nolen gur sweets', note: 'Date-palm jaggery, sandesh boxes', q: 'nolen gur jaggery bengal' }
        ]},
        'assam': { note: 'Sualkuchi weaving village and the Guwahati emporium circuit.', items: [
            { icon: '🥻', name: 'Muga & pat silk', note: 'Golden muga mekhela chador', q: 'assam muga silk mekhela' },
            { icon: '🫖', name: 'Assam tea', note: 'Malty CTC and orthodox leaf', q: 'assam tea orthodox' },
            { icon: '🎋', name: 'Bamboo & cane craft', note: 'Jaapi hats, baskets, furniture pieces', q: 'assam bamboo jaapi' },
            { icon: '🍽️', name: 'Bell metal ware', note: 'Sarthebari xorai and bota', q: 'assam bell metal xorai' },
            { icon: '🎭', name: 'Majuli masks', note: 'Sattra bamboo-and-clay theatre masks', q: 'majuli mask assam' },
            { icon: '🌶️', name: 'Bhut jolokia products', note: 'Ghost chilli pickles and powders', q: 'bhut jolokia pickle' }
        ]},
        'gujarat': { note: 'Law Garden night market (Ahmedabad) and Bhujodi/Ajrakhpur craft villages in Kutch.', items: [
            { icon: '🧵', name: 'Kutchi embroidery', note: 'Mirror-work bags, wall hangings, cholis', q: 'kutch embroidery wall hanging' },
            { icon: '🧣', name: 'Ajrakh block prints', note: 'Natural indigo and madder textiles', q: 'ajrakh block print stole' },
            { icon: '🥻', name: 'Patola & bandhani', note: 'Double-ikat Patan silk, tie-dyed cottons', q: 'patola saree patan' },
            { icon: '👜', name: 'Leather & beadwork', note: 'Kutchi mochi bags, camel leather goods', q: 'kutch leather bag handicraft' },
            { icon: '🪵', name: 'Rogan art & woodcraft', note: 'Castor-oil painted cloth, Sankheda furniture', q: 'rogan art kutch' },
            { icon: '🍪', name: 'Theplas & namkeen', note: 'Travel-friendly snack boxes', q: 'gujarati thepla namkeen' }
        ]},
        'delhi': { note: 'Dilli Haat, Janpath, Chandni Chowk and the state emporium row on Baba Kharak Singh Marg.', items: [
            { icon: '🧺', name: 'Dilli Haat handicrafts', note: 'Rotating stalls from every state', q: 'indian handicraft home decor' },
            { icon: '🧥', name: 'Pashmina & shawls', note: 'Janpath and emporium stock', q: 'pashmina shawl india' },
            { icon: '💍', name: 'Silver & oxidised jewellery', note: 'Chandni Chowk and Janpath lanes', q: 'oxidised silver jewellery india' },
            { icon: '🌶️', name: 'Khari Baoli spices', note: 'Asia\u2019s largest wholesale spice market', q: 'indian whole spices gift box' },
            { icon: '📚', name: 'Books & prints', note: 'Daryaganj Sunday book bazaar finds', q: 'indian art print poster' },
            { icon: '🪔', name: 'Brass & marble inlay', note: 'Diyas, coasters, decorative boxes', q: 'marble inlay coaster brass diya' }
        ]},
        'ladakh': { note: 'Leh Main Bazaar, Tibetan Refugee Market and monastery shops.', items: [
            { icon: '🧣', name: 'Pashmina', note: 'Changthangi goat wool shawls', q: 'ladakh pashmina shawl' },
            { icon: '☸️', name: 'Prayer wheels & flags', note: 'Handheld wheels, lungta flag strings', q: 'tibetan prayer wheel flags' },
            { icon: '🖼️', name: 'Thangka paintings', note: 'Buddhist scroll art', q: 'thangka painting buddhist' },
            { icon: '🍑', name: 'Dried apricots', note: 'Ladakhi khubani and apricot oil', q: 'ladakh dried apricot' },
            { icon: '💍', name: 'Turquoise & coral jewellery', note: 'Silver-set Himalayan stones', q: 'tibetan turquoise coral jewellery' },
            { icon: '🧦', name: 'Yak wool knits', note: 'Socks, caps, blankets', q: 'yak wool blanket socks' }
        ]},
        'jammu and kashmir': { note: 'Srinagar\u2019s Lal Chowk, houseboat showrooms and government craft emporiums.', items: [
            { icon: '🧥', name: 'Pashmina & kani shawls', note: 'Hand-spun, sozni-embroidered', q: 'kashmiri pashmina shawl' },
            { icon: '🌸', name: 'Kashmiri saffron', note: 'Pampore mongra threads', q: 'kashmiri saffron kesar' },
            { icon: '🪵', name: 'Walnut woodcarving', note: 'Trays, boxes, carved panels', q: 'kashmiri walnut wood carving' },
            { icon: '🧺', name: 'Papier-mâché', note: 'Painted boxes and ornaments', q: 'kashmiri papier mache box' },
            { icon: '🧶', name: 'Crewel & namda rugs', note: 'Chain-stitch fabric, felted wool rugs', q: 'kashmiri namda rug crewel' },
            { icon: '🌰', name: 'Dry fruits & kahwa', note: 'Walnuts, almonds, kahwa spice mix', q: 'kashmiri kahwa dry fruits' }
        ]},
        'punjab': { note: 'Hall Bazaar (Amritsar) and Patiala\u2019s jutti and phulkari lanes.', items: [
            { icon: '🧵', name: 'Phulkari dupatta', note: 'Dense floss-silk floral embroidery', q: 'phulkari dupatta punjab' },
            { icon: '👡', name: 'Punjabi jutti', note: 'Embroidered flat footwear', q: 'punjabi jutti' },
            { icon: '👖', name: 'Patiala salwar', note: 'Classic pleated salwar suits', q: 'patiala salwar suit' },
            { icon: '🥘', name: 'Amritsari papad & wadi', note: 'Sun-dried lentil wadis and papads', q: 'amritsari wadi papad' },
            { icon: '🪘', name: 'Bhangra accessories', note: 'Parandi tassels, small dhols', q: 'parandi punjabi hair tassel' },
            { icon: '🍯', name: 'Desi ghee & jaggery', note: 'Village gur and ghee tins', q: 'punjab desi ghee gur' }
        ]},
        'sikkim': { note: 'MG Marg and Lal Bazaar in Gangtok, plus monastery gift counters.', items: [
            { icon: '🫖', name: 'Temi tea', note: 'Sikkim\u2019s single-estate black tea', q: 'temi tea sikkim' },
            { icon: '☸️', name: 'Buddhist ritual items', note: 'Prayer wheels, flags, incense', q: 'tibetan incense prayer flags' },
            { icon: '🧶', name: 'Lepcha weaves', note: 'Handloom shawls and bags', q: 'sikkim handloom shawl' },
            { icon: '🌶️', name: 'Dalle khursani pickle', note: 'Fiery round-chilli preserve', q: 'dalle khursani pickle' },
            { icon: '🍶', name: 'Chhurpi', note: 'Hard yak-milk cheese', q: 'chhurpi yak cheese' },
            { icon: '🪵', name: 'Choktse tables', note: 'Carved folding wooden tables', q: 'choktse table tibetan carved' }
        ]},
        'odisha': { note: 'Pipli appliqué village, Raghurajpur artist village and Boyanika emporiums.', items: [
            { icon: '🖼️', name: 'Pattachitra', note: 'Palm-leaf and cloth scroll painting', q: 'pattachitra painting odisha' },
            { icon: '🎪', name: 'Pipli appliqué', note: 'Bright stitched lampshades and canopies', q: 'pipli applique lamp shade' },
            { icon: '🥻', name: 'Sambalpuri ikat', note: 'Bandha-tied cotton and silk', q: 'sambalpuri ikat saree' },
            { icon: '🪙', name: 'Silver filigree', note: 'Cuttack tarakasi jewellery', q: 'cuttack silver filigree' },
            { icon: '🪨', name: 'Konark stone carving', note: 'Miniature chariot wheels and idols', q: 'konark stone carving idol' },
            { icon: '🎋', name: 'Dhokra & horn work', note: 'Tribal brass and buffalo-horn pieces', q: 'dhokra brass odisha' }
        ]},
        'bihar': { note: 'Madhubani craft villages and Patna\u2019s Bihar state emporium.', items: [
            { icon: '🖼️', name: 'Madhubani painting', note: 'Mithila line art on paper and cloth', q: 'madhubani painting' },
            { icon: '🧺', name: 'Sikki grass craft', note: 'Golden grass boxes and baskets', q: 'sikki grass craft bihar' },
            { icon: '🥻', name: 'Bhagalpuri tussar silk', note: 'Textured wild-silk sarees and stoles', q: 'bhagalpuri tussar silk' },
            { icon: '🍬', name: 'Silao khaja & tilkut', note: 'Flaky and sesame sweets', q: 'silao khaja tilkut' },
            { icon: '🪵', name: 'Lac bangles', note: 'Muzaffarpur lacquer work', q: 'lac bangles india' },
            { icon: '🌾', name: 'Makhana', note: 'Fox nuts from Mithila ponds', q: 'bihar makhana fox nuts' }
        ]},
        'jharkhand': { note: 'Ranchi and Khunti tribal craft markets.', items: [
            { icon: '🥻', name: 'Tussar silk', note: 'Bhagalpur-style wild silk woven locally', q: 'tussar silk saree' },
            { icon: '🎭', name: 'Dokra metalcraft', note: 'Lost-wax brass tribal figures', q: 'dokra brass figurine' },
            { icon: '🎋', name: 'Bamboo craft', note: 'Baskets, trays, hunting-motif pieces', q: 'bamboo basket handicraft' },
            { icon: '🖼️', name: 'Sohrai & Kohvar art', note: 'Harvest wall-painting motifs', q: 'sohrai painting jharkhand' },
            { icon: '🪵', name: 'Wooden toys & masks', note: 'Carved tribal figures', q: 'tribal wooden mask india' },
            { icon: '🍯', name: 'Forest honey & mahua', note: 'Wild-harvest produce', q: 'wild forest honey india' }
        ]},
        'chhattisgarh': { note: 'Bastar haats and the Raipur state emporium.', items: [
            { icon: '🎭', name: 'Bastar dhokra', note: 'Brass tribal figures and lamps', q: 'bastar dhokra art' },
            { icon: '🪵', name: 'Bastar woodcraft', note: 'Carved panels and totems', q: 'bastar wood carving' },
            { icon: '⚒️', name: 'Wrought iron craft', note: 'Slim iron figures and candle stands', q: 'bastar wrought iron craft' },
            { icon: '🥻', name: 'Kosa silk', note: 'Golden tussar weaves', q: 'kosa silk saree chhattisgarh' },
            { icon: '🧺', name: 'Bamboo & terracotta', note: 'Utility baskets and clay animals', q: 'terracotta animal figurine' },
            { icon: '🌾', name: 'Tribal jewellery', note: 'Bell-metal and bead ornaments', q: 'tribal bell metal jewellery' }
        ]},
        'telangana': { note: 'Laad Bazaar and Shilparamam in Hyderabad, Pochampally weaving cluster.', items: [
            { icon: '💚', name: 'Hyderabadi pearls', note: 'The city\u2019s signature strings', q: 'hyderabadi pearls necklace' },
            { icon: '💫', name: 'Lac bangles', note: 'Stone-studded Laad Bazaar bangles', q: 'hyderabad lac bangles' },
            { icon: '🥻', name: 'Pochampally ikat', note: 'Geometric double-ikat weaves', q: 'pochampally ikat saree' },
            { icon: '🪘', name: 'Bidriware', note: 'Silver-inlaid blackened metal', q: 'bidriware handicraft' },
            { icon: '🧸', name: 'Nirmal & Cheriyal', note: 'Painted toys and scroll art', q: 'nirmal toys cheriyal painting' },
            { icon: '🍬', name: 'Karachi biscuits & haleem masala', note: 'Hyderabad edible take-homes', q: 'hyderabad karachi biscuits' }
        ]},
        'andhra pradesh': { note: 'Kalamkari workshops at Pedana and Srikalahasti; Lepakshi emporiums.', items: [
            { icon: '🖼️', name: 'Kalamkari', note: 'Hand-painted and block-printed cotton', q: 'kalamkari fabric painting' },
            { icon: '🧸', name: 'Kondapalli toys', note: 'Soft-wood painted figures', q: 'kondapalli toys' },
            { icon: '🥻', name: 'Venkatagiri & Uppada silk', note: 'Fine cotton and jamdani weaves', q: 'venkatagiri saree uppada silk' },
            { icon: '🪨', name: 'Etikoppaka lacquer toys', note: 'Natural-dye turned wood', q: 'etikoppaka toys' },
            { icon: '💎', name: 'Budithi brassware', note: 'Beaten brass vessels', q: 'budithi brass handicraft' },
            { icon: '🥭', name: 'Avakaya pickle', note: 'Andhra mango and gongura pickles', q: 'andhra avakaya gongura pickle' }
        ]},
        'madhya pradesh': { note: 'Chanderi and Maheshwar weaving towns; Bhopal\u2019s Chowk market.', items: [
            { icon: '🥻', name: 'Chanderi & Maheshwari sarees', note: 'Sheer cotton-silk handloom', q: 'chanderi maheshwari saree' },
            { icon: '🖼️', name: 'Gond art', note: 'Dot-and-line tribal painting', q: 'gond painting madhya pradesh' },
            { icon: '🪵', name: 'Bagh prints', note: 'Natural-dye block-printed cotton', q: 'bagh print fabric' },
            { icon: '🎭', name: 'Dhokra & iron craft', note: 'Bastar-style tribal metalwork', q: 'dhokra iron craft' },
            { icon: '🧺', name: 'Bamboo & zari zardozi', note: 'Bhopal embroidery and cane goods', q: 'zardozi embroidery bag' },
            { icon: '🌿', name: 'Herbal & tribal produce', note: 'Honey, mahua, forest herbs', q: 'forest honey herbal india' }
        ]},
        'uttar pradesh': { note: 'Chowk (Lucknow), Vishwanath Gali (Varanasi) and Agra\u2019s marble workshops.', items: [
            { icon: '🥻', name: 'Banarasi silk', note: 'Brocade sarees and dupattas', q: 'banarasi silk saree' },
            { icon: '🧵', name: 'Chikankari', note: 'Lucknow shadow-work embroidery', q: 'lucknow chikankari kurta' },
            { icon: '🪨', name: 'Marble inlay', note: 'Agra pietra dura coasters and boxes', q: 'agra marble inlay box' },
            { icon: '🏺', name: 'Khurja & blue pottery', note: 'Painted ceramic bowls and mugs', q: 'khurja pottery' },
            { icon: '🌸', name: 'Kannauj attar', note: 'Traditional distilled perfumes', q: 'kannauj attar perfume' },
            { icon: '🍬', name: 'Petha & brassware', note: 'Agra petha, Moradabad brass', q: 'agra petha moradabad brass' }
        ]},
        'haryana': { note: 'Surajkund Mela (February) and Panipat handloom markets.', items: [
            { icon: '🧶', name: 'Panipat handloom', note: 'Rugs, durries, bed linen', q: 'panipat cotton durrie rug' },
            { icon: '🪑', name: 'Phulkari & bagh work', note: 'Shared Punjab-Haryana embroidery', q: 'phulkari dupatta' },
            { icon: '🧺', name: 'Cane & bamboo craft', note: 'Baskets, mooda stools', q: 'cane mooda stool' },
            { icon: '🍶', name: 'Desi ghee & churn goods', note: 'Dairy specialities from the belt', q: 'desi ghee india' },
            { icon: '🏺', name: 'Terracotta', note: 'Village pottery and clay figures', q: 'terracotta pottery decor' },
            { icon: '👡', name: 'Embroidered juttis', note: 'Colourful flat footwear', q: 'embroidered jutti' }
        ]},
        'meghalaya': { note: 'Police Bazaar (Shillong) and Iewduh, one of the region\u2019s largest markets.', items: [
            { icon: '🧺', name: 'Cane & bamboo work', note: 'Baskets, mats, knot-work stools', q: 'bamboo cane basket northeast' },
            { icon: '🧣', name: 'Khasi & Garo weaves', note: 'Jainsem cloth, eri silk shawls', q: 'eri silk shawl meghalaya' },
            { icon: '🍯', name: 'Sohliya honey', note: 'Wild hill honey', q: 'meghalaya wild honey' },
            { icon: '🌶️', name: 'Bird\u2019s eye chilli', note: 'Fiery local dried chillies', q: 'birds eye chilli dried' },
            { icon: '💍', name: 'Tribal jewellery', note: 'Coral and bead necklaces', q: 'khasi tribal bead necklace' },
            { icon: '🫖', name: 'Local tea & spices', note: 'Hill-grown produce', q: 'meghalaya tea spices' }
        ]},
        'tripura': { note: 'Agartala\u2019s Purbasha emporium and craft villages.', items: [
            { icon: '🎋', name: 'Bamboo & cane craft', note: 'Tripura is a bamboo craft hub', q: 'tripura bamboo handicraft' },
            { icon: '🧶', name: 'Risa & rignai weaves', note: 'Traditional tribal handloom cloth', q: 'tripura handloom risa' },
            { icon: '🪵', name: 'Wood & bamboo furniture', note: 'Light cane seating and screens', q: 'cane bamboo furniture' },
            { icon: '🫖', name: 'Tripura tea', note: 'Local estate leaf', q: 'tripura tea' },
            { icon: '🧺', name: 'Screwpine mats', note: 'Fine woven floor mats', q: 'screwpine mat handwoven' },
            { icon: '💍', name: 'Tribal ornaments', note: 'Beads, shell and metal jewellery', q: 'tribal bead jewellery india' }
        ]},
        'mizoram': { note: 'Bara Bazar in Aizawl.', items: [
            { icon: '🧣', name: 'Puan textiles', note: 'Handwoven wrap cloth with stripes', q: 'mizo puan handloom' },
            { icon: '🎋', name: 'Bamboo craft', note: 'Baskets, hats, khumbeu rain-hats', q: 'bamboo hat basket northeast' },
            { icon: '🎺', name: 'Bamboo instruments', note: 'Flutes and percussion pieces', q: 'bamboo flute india' },
            { icon: '🍯', name: 'Mizo honey & chilli', note: 'Hill honey, bird\u2019s eye chilli', q: 'mizoram honey birds eye chilli' },
            { icon: '👜', name: 'Cane bags', note: 'Woven shoulder bags', q: 'cane woven shoulder bag' },
            { icon: '💍', name: 'Traditional ornaments', note: 'Beaded necklaces and headgear', q: 'tribal beaded necklace' }
        ]},
        'nagaland': { note: 'Kohima\u2019s local markets and the Hornbill Festival stalls (December).', items: [
            { icon: '🧣', name: 'Naga shawls', note: 'Tribe-specific woven patterns', q: 'naga shawl handloom' },
            { icon: '💍', name: 'Beaded jewellery', note: 'Bone, bead and shell neckpieces', q: 'naga tribal beaded necklace' },
            { icon: '🎋', name: 'Bamboo & cane work', note: 'Baskets, mugs, headgear', q: 'bamboo mug basket northeast' },
            { icon: '🪵', name: 'Wood carvings', note: 'Hornbill and morung motifs', q: 'naga wood carving' },
            { icon: '🌶️', name: 'Raja mircha', note: 'King chilli, dried or in pickle', q: 'king chilli raja mircha' },
            { icon: '🥁', name: 'Log drums & horns', note: 'Miniature ceremonial replicas', q: 'tribal drum decor india' }
        ]},
        'manipur': { note: 'Ima Keithel in Imphal — a market run entirely by women.', items: [
            { icon: '🥻', name: 'Phanek & innaphi', note: 'Handwoven wrap and stole sets', q: 'manipuri phanek handloom' },
            { icon: '🎋', name: 'Kauna reed craft', note: 'Water-reed mats, cushions, bags', q: 'kauna reed mat manipur' },
            { icon: '🏺', name: 'Longpi pottery', note: 'Black stoneware cooked over fire', q: 'longpi pottery manipur' },
            { icon: '🪡', name: 'Moirang Phee', note: 'Temple-motif bordered textiles', q: 'moirang phee manipuri' },
            { icon: '🎭', name: 'Manipuri dance dolls', note: 'Costumed figurines', q: 'manipuri dance doll' },
            { icon: '🌿', name: 'Local produce', note: 'Black rice (chak-hao), herbs', q: 'chak hao black rice' }
        ]},
        'arunachal pradesh': { note: 'Tawang, Ziro and Itanagar craft centres.', items: [
            { icon: '🧣', name: 'Apatani & Adi weaves', note: 'Geometric handloom shawls and bags', q: 'arunachal handloom shawl' },
            { icon: '🎋', name: 'Cane & bamboo craft', note: 'Hats, baskets, cane belts', q: 'cane bamboo hat northeast' },
            { icon: '🪵', name: 'Wood carving & masks', note: 'Monpa monastery-style masks', q: 'monpa wooden mask' },
            { icon: '📜', name: 'Monpa handmade paper', note: 'Shugu sheets made near Tawang', q: 'handmade paper journal india' },
            { icon: '🧶', name: 'Yak wool carpets', note: 'Tawang woollen rugs', q: 'tawang carpet woollen' },
            { icon: '🍶', name: 'Local produce', note: 'Kiwi products, orange wine, honey', q: 'arunachal kiwi wine honey' }
        ]},
        'chandigarh': { note: 'Sector 17 plaza and the Rock Garden shop.', items: [
            { icon: '🧵', name: 'Phulkari', note: 'Punjab-style floss embroidery', q: 'phulkari dupatta' },
            { icon: '👡', name: 'Punjabi jutti', note: 'Embroidered flats', q: 'punjabi jutti' },
            { icon: '🗿', name: 'Rock Garden-style mosaic', note: 'Recycled ceramic and mosaic decor', q: 'mosaic ceramic decor india' },
            { icon: '🧺', name: 'Cane furniture', note: 'Moodas and cane baskets', q: 'cane mooda stool' },
            { icon: '🍯', name: 'Desi ghee & pinni', note: 'North Indian edible gifts', q: 'punjabi pinni sweets' },
            { icon: '🎨', name: 'Local art prints', note: 'Corbusier-era architecture prints', q: 'chandigarh architecture print' }
        ]},
        'puducherry': { note: 'Auroville boutiques, Mission Street and Sunday market.', items: [
            { icon: '🕯️', name: 'Auroville candles & incense', note: 'Handmade scented goods', q: 'auroville incense candle' },
            { icon: '📜', name: 'Handmade paper', note: 'Sri Aurobindo Ashram paper goods', q: 'handmade paper notebook india' },
            { icon: '🧴', name: 'Natural skincare', note: 'Aroma oils, soaps, balms', q: 'auroville handmade soap' },
            { icon: '🪵', name: 'Colonial-style decor', note: 'French-influenced furnishings', q: 'french colonial decor india' },
            { icon: '👕', name: 'Cotton & batik wear', note: 'Breezy printed garments', q: 'batik cotton kurta' },
            { icon: '🍫', name: 'Artisan chocolate & pickles', note: 'Local small-batch produce', q: 'artisan chocolate india' }
        ]},
        'andaman and nicobar islands': { note: 'Sagarika emporium and Aberdeen Bazaar, Port Blair.', items: [
            { icon: '🐚', name: 'Shell craft', note: 'Lamps, jewellery, wind chimes', q: 'seashell craft lamp' },
            { icon: '🥥', name: 'Coconut shell craft', note: 'Bowls, spoons, carved decor', q: 'coconut shell bowl craft' },
            { icon: '🪵', name: 'Padauk woodwork', note: 'Local hardwood bowls and figures', q: 'wooden bowl handicraft india' },
            { icon: '🧺', name: 'Cane & bamboo goods', note: 'Baskets, mats, hats', q: 'cane basket handicraft' },
            { icon: '💎', name: 'Pearl jewellery', note: 'Island-sourced pearl sets', q: 'pearl jewellery set' },
            { icon: '🌴', name: 'Island spices', note: 'Cinnamon, nutmeg, cloves', q: 'island spices nutmeg cinnamon' }
        ]},
        'lakshadweep': { note: 'Permit-only islands — buy from the co-operative outlets.', items: [
            { icon: '🥥', name: 'Coconut products', note: 'Oil, coir rope, shell craft', q: 'coconut oil coir craft' },
            { icon: '🐚', name: 'Shell & coral-free crafts', note: 'Ethically made shell decor', q: 'seashell decor handicraft' },
            { icon: '🎣', name: 'Masmin tuna', note: 'Traditional smoked-dried tuna', q: 'dried tuna masmin' },
            { icon: '🧺', name: 'Coir mats', note: 'Handwoven coir floor mats', q: 'coir mat handwoven' },
            { icon: '🪵', name: 'Boat models', note: 'Miniature traditional craft', q: 'wooden boat model decor' },
            { icon: '🌴', name: 'Island spices', note: 'Small-batch local produce', q: 'island spices india' }
        ]}
    };
    STATE_SOUVENIRS['nct of delhi'] = STATE_SOUVENIRS['delhi'];
    STATE_SOUVENIRS['national capital territory of delhi'] = STATE_SOUVENIRS['delhi'];
    STATE_SOUVENIRS['pondicherry'] = STATE_SOUVENIRS['puducherry'];
    STATE_SOUVENIRS['orissa'] = STATE_SOUVENIRS['odisha'];
    STATE_SOUVENIRS['uttaranchal'] = STATE_SOUVENIRS['uttarakhand'];
    STATE_SOUVENIRS['ladakh'] = STATE_SOUVENIRS['ladakh'];
    STATE_SOUVENIRS['jammu and kashmir'] = STATE_SOUVENIRS['jammu and kashmir'];

    // Fallback for any state without a curated list yet, so the box never
    // sits empty after a successful search.
    const SOUVENIR_FALLBACK = { note: 'Look for a state emporium or a government handloom outlet — fixed prices and reliable provenance.', items: [
        { icon: '🧵', name: 'Local handloom', note: 'Sarees, stoles or fabric woven in the region', q: 'indian handloom stole' },
        { icon: '🏺', name: 'Regional handicrafts', note: 'Pottery, metalwork or wood carving', q: 'indian handicraft decor' },
        { icon: '🌶️', name: 'Spices & local food', note: 'Pickles, sweets, tea or coffee from the area', q: 'indian spices gift box' },
        { icon: '💍', name: 'Traditional jewellery', note: 'Silver, bead or lac work in the local style', q: 'indian traditional jewellery' }
    ]};

    function souvenirsFor(stateKey) {
        const key = normalizeState(stateKey);
        return STATE_SOUVENIRS[key] || null;
    }

    // Background photo per souvenir card — reuses the same image search
    // hook the itinerary stop photos use (window.__fetchStopImage), keyed
    // by the item's own product query so results don't collide across
    // states or get refetched on every re-render.
    const souvenirPhotoCache = new Map();

    function applySouvenirPhoto(card, photoEl, url) {
        if (!url) {
            photoEl.style.backgroundImage = '';
            photoEl.classList.remove('is-loaded');
            card.classList.remove('has-photo');
            return;
        }
        photoEl.style.backgroundImage = `url("${url.replace(/"/g, '')}")`;
        card.classList.add('has-photo');
        requestAnimationFrame(() => photoEl.classList.add('is-loaded'));
    }

    function loadSouvenirPhoto(card, photoEl, query) {
        if (souvenirPhotoCache.has(query)) {
            applySouvenirPhoto(card, photoEl, souvenirPhotoCache.get(query));
            return;
        }
        // Same as the itinerary hook: it may not be initialised yet on
        // first paint, so skip silently rather than throwing.
        if (!window.__fetchStopImage) return;
        window.__fetchStopImage(query).then(url => {
            souvenirPhotoCache.set(query, url || null);
            // The card can have been discarded by a re-render (new
            // search, state change) by the time the lookup resolves.
            if (card.isConnected) applySouvenirPhoto(card, photoEl, url);
        }).catch(() => { souvenirPhotoCache.set(query, null); });
    }

    function renderSouvenirs(stateName) {
        const body = document.getElementById('souvenirBody');
        const label = document.getElementById('souvenirState');
        if (!body) return;
        const pretty = prettyState(stateName) || 'this region';
        const entry = souvenirsFor(stateName) || SOUVENIR_FALLBACK;
        if (label) label.textContent = pretty;
        body.innerHTML = '';

        const list = document.createElement('ul');
        list.className = 'souvenir-list';
        entry.items.forEach(item => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'souvenir-item';
            a.href = `https://www.amazon.in/s?k=${encodeURIComponent(item.q)}`;
            a.target = '_blank';
            a.rel = 'noopener';
            a.title = `Find ${item.name} online`;

            const photo = document.createElement('span');
            photo.className = 'souvenir-photo';
            a.appendChild(photo);

            const icon = document.createElement('span');
            icon.className = 'souvenir-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.textContent = item.icon;

            const text = document.createElement('span');
            text.className = 'souvenir-text';
            const name = document.createElement('span');
            name.className = 'souvenir-name';
            name.textContent = item.name;
            const note = document.createElement('span');
            note.className = 'souvenir-note';
            note.textContent = item.note;
            text.append(name, note);

            a.append(icon, text);
            li.appendChild(a);
            list.appendChild(li);

            loadSouvenirPhoto(a, photo, item.q);
        });
        body.appendChild(list);

        if (entry.note) {
            const foot = document.createElement('div');
            foot.className = 'souvenir-foot';
            const footIcon = document.createElement('span');
            footIcon.setAttribute('aria-hidden', 'true');
            footIcon.textContent = '🛍️';
            const footText = document.createElement('span');
            footText.textContent = entry.note;
            foot.append(footIcon, footText);
            body.appendChild(foot);
        }
    }

    function renderPlaceTypeOptions(stateKey, weather) {
        const wrap = document.getElementById('placeTypeOptions');
        const guidance = document.getElementById('placeTypeGuidance');
        const label = document.getElementById('placeTypeLabel');
        renderSouvenirs(stateKey);
        if (!wrap) return;
        currentOutfitStateKey = normalizeState(stateKey);
        currentOutfitWeather = weather || '';
        const MAX_PLACE_TYPES = 8;
        const allMatches = DESTINATION_TYPES.filter(t => t.states.includes(currentOutfitStateKey));
        // Keep whatever is already selected visible even if it sits past the cap.
        const pinned = allMatches.filter(t => t.key === selectedPlaceType);
        const matches = [...pinned, ...allMatches.filter(t => t.key !== selectedPlaceType)]
            .slice(0, MAX_PLACE_TYPES);
        wrap.innerHTML = '';
        if (!matches.length) {
            wrap.innerHTML = '<div class="pref-empty">No curated place types for this state yet. You can still browse outfits below.</div>';
            label.textContent = 'Place types';
            if (guidance) guidance.textContent = '';
            const heading = document.getElementById('clothingBuyHeading');
            if (heading) heading.textContent = 'Clothing to buy';
            return;
        }
        label.textContent = allMatches.length > matches.length
            ? `Top ${matches.length} of ${allMatches.length} experiences in ${prettyState(stateKey)}`
            : `${matches.length} experiences in ${prettyState(stateKey)}`;
        matches.forEach((type, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'pref-option';
            btn.dataset.placeType = type.key;
            btn.title = type.note;
            const icon = document.createElement('span');
            icon.className = 'pref-option-icon';
            icon.textContent = type.icon;
            icon.setAttribute('aria-hidden', 'true');
            const text = document.createElement('span');
            text.className = 'pref-option-label';
            text.textContent = type.label;
            const check = document.createElement('span');
            check.className = 'pref-option-check';
            check.setAttribute('aria-hidden', 'true');
            check.textContent = '✓';
            btn.append(icon, text, check);
            btn.addEventListener('click', () => selectPlaceType(type));
            wrap.appendChild(btn);
            if (index === 0 && !selectedPlaceType) btn.classList.add('active');
        });
        if (!selectedPlaceType || !matches.some(t => t.key === selectedPlaceType)) {
            selectedPlaceType = matches[0].key;
            updateTypeGuidance(matches[0]);
        } else {
            const selected = matches.find(t => t.key === selectedPlaceType);
            if (selected) {
                wrap.querySelector(`[data-place-type="${selected.key}"]`)?.classList.add('active');
                updateTypeGuidance(selected);
            }
        }
    }

    function updateTypeGuidance(type) {
        const guidance = document.getElementById('placeTypeGuidance');
        const heading = document.getElementById('clothingBuyHeading');
        if (heading) heading.textContent = type ? `Clothing for ${type.label}` : 'Clothing to buy';
        if (!guidance || !type) return;
        const weatherText = currentOutfitWeather ? `${currentOutfitWeather} weather` : 'local weather';
        guidance.textContent = `${type.note} Search: ${type.query} • ${weatherText}`;
    }

    function selectPlaceType(type) {
        selectedPlaceType = type.key;
        selectedOutfitStyle = type.style;
        document.querySelectorAll('[data-place-type]').forEach(btn => btn.classList.toggle('active', btn.dataset.placeType === type.key));
        updateTypeGuidance(type);
        if (window.__reloadOutfitsForPreference) window.__reloadOutfitsForPreference();
        const outfitSection = document.querySelector('#outfitsGrid')?.closest('section');
        if (outfitSection) outfitSection.scrollIntoView({ behavior:'smooth', block:'start' });
    }


    /* --------------------------------------------------------
       OUTFITS

       Two different things feed this grid:

         1. A SearXNG image search for `<place> fits`, which is the
            same path every other section uses.
         2. One scrape per store (Amazon.in, Myntra) of the *search
            results page HTML*, pulled through the same CORS proxy
            list, with the product image and price read out of the
            markup.

       Storefront scraping is the fragile half and it is expected to
       fail some of the time: both sites serve a bot check to the
       datacenter IPs that public CORS proxies run on, and Myntra
       renders its grid from a JSON blob that it is free to rename.
       The store cards stay primary when they load; SearXNG is the
       secondary fallback/inspiration layer, so a blocked store
       degrades to a note in the status line
       instead of an empty grid.
       -------------------------------------------------------- */

    const outfitsGrid = document.getElementById('outfitsGrid');
    const outfitsStatus = document.getElementById('outfitsStatus');
    const amazonSecondary = document.getElementById('amazonSecondary');
    const amazonSearchLink = document.getElementById('amazonSearchLink');

    // Amazon and Myntra both answer a bot check with HTTP 200, so the
    // status code can't be trusted — the body has to be sniffed.
    const LOOKS_LIKE_BOT_CHECK = /captcha|robot check|are you a human|enter the characters you see|unusual traffic/i;

    // Same proxy list and same dead-proxy memory as the JSON path, but
    // returning text, because a store page is HTML and there is nothing
    // to JSON.parse at the top level.
    async function fetchViaProxy(target) {
        let lastError = null;
        for (const proxy of PROXIES) {
            if (deadProxies.has(proxy.name)) continue;

            let response;
            try {
                response = await fetch(proxy.build(target), { signal: AbortSignal.timeout(15000) });
            } catch (err) {
                // Unlike the search path, there's no direct-fetch option to
                // fall back on, so a proxy that won't answer is just dead.
                deadProxies.add(proxy.name);
                lastError = failure('proxy', `${proxy.name} ${err.name === 'TimeoutError' ? 'timed out' : 'could not be reached'}`);
                continue;
            }

            if (!response.ok) {
                lastError = failure('proxy', `${proxy.name} responded HTTP ${response.status}`);
                continue;
            }

            const text = await response.text();

            // cors.io wraps the upstream response in an envelope; the
            // store's own status lives inside it, not on the outer 200.
            try {
                const envelope = JSON.parse(text);
                if (envelope && typeof envelope.body === 'string' && typeof envelope.status === 'number') {
                    if (envelope.status < 200 || envelope.status >= 300) {
                        throw failure('store', `the store responded HTTP ${envelope.status}`);
                    }
                    return envelope.body;
                }
            } catch (err) {
                // A parse failure just means this proxy returned the HTML
                // raw, which is the normal case. Only a tagged failure —
                // the store's own bad status — is worth re-throwing.
                if (err.kind) throw err;
            }

            return text;
        }
        throw lastError || failure('proxy', 'every CORS proxy is down for this session');
    }

    function priceText(value) {
        if (value === null || value === undefined || value === '') return '';
        const number = Number(value);
        if (!Number.isFinite(number)) return String(value);
        return '\u20B9' + number.toLocaleString('en-IN');
    }

    /* Amazon's search results are plain server-rendered HTML, so the
       product tiles can be walked directly. The price is read from the
       screen-reader-only `.a-offscreen` node because the visible price
       is split across separate whole-rupee and fraction spans. */
    function parseAmazon(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const items = [];
        doc.querySelectorAll('div[data-component-type="s-search-result"]').forEach(node => {
            const img = node.querySelector('img.s-image');
            if (!img || !img.getAttribute('src')) return;
            const priceNode = node.querySelector('.a-price > .a-offscreen');
            const asin = node.getAttribute('data-asin');
            const link = node.querySelector('a.a-link-normal[href]');
            let url = '';
            if (asin) {
                url = `https://www.amazon.in/dp/${asin}`;
            } else if (link) {
                try { url = new URL(link.getAttribute('href'), 'https://www.amazon.in').href; } catch { /* skip */ }
            }
            items.push({
                source: 'Amazon',
                img: img.getAttribute('src'),
                title: img.getAttribute('alt') || '',
                price: priceNode ? priceNode.textContent.trim() : '',
                url,
            });
        });
        return items;
    }

    /* Myntra ships an empty grid and hydrates it on the client, so there
       are no product nodes to query. The data is in a `window.__myx`
       assignment inside a <script> tag, which is what gets parsed here.
       If Myntra renames that global this returns nothing, which is
       handled the same way as a block. */
    function parseMyntra(html) {
        const match = html.match(/window\.__myx\s*=\s*(\{[\s\S]*?\})\s*;?\s*<\/script>/);
        if (!match) return [];
        let data;
        try { data = JSON.parse(match[1]); } catch { return []; }
        const products = (data && data.searchData && data.searchData.results && data.searchData.results.products) || [];
        return products.map(product => ({
            source: 'Myntra',
            img: product.searchImage,
            title: [product.brand, product.additionalInfo || product.product].filter(Boolean).join(' '),
            price: priceText(product.price),
            url: product.landingPageUrl ? `https://www.myntra.com/${product.landingPageUrl}` : '',
        })).filter(item => item.img);
    }

    const STORES = [
        {
            label: 'Amazon',
            url: query => `https://www.amazon.in/s?k=${encodeURIComponent(query)}`,
            parse: parseAmazon,
        },
        {
            label: 'Myntra',
            // Myntra's search path is the slugged query, with the raw text
            // repeated in a parameter.
            url: query => `https://www.myntra.com/${encodeURIComponent(query.trim().toLowerCase().replace(/\s+/g, '-'))}?rawQuery=${encodeURIComponent(query)}`,
            parse: parseMyntra,
        },
    ];

    const STORE_LIMIT = 12;

    async function scrapeStore(store, query) {
        const html = await fetchViaProxy(store.url(query));
        if (LOOKS_LIKE_BOT_CHECK.test(html.slice(0, 4000))) {
            throw failure('store', `${store.label} served a bot check instead of results`);
        }
        const items = store.parse(html).slice(0, STORE_LIMIT);
        if (items.length === 0) {
            throw failure('store', `${store.label} returned a page with no readable products`);
        }
        return items;
    }

    function outfitCard(item) {
        const a = document.createElement('a');
        a.className = 'card outfit';
        a.href = item.url || item.img;
        a.target = '_blank';
        a.rel = 'noopener';
        a.dataset.key = item.url || item.img;

        const shot = document.createElement('div');
        shot.className = 'shot';

        const img = document.createElement('img');
        img.className = 'thumb';
        img.loading = 'lazy';
        img.referrerPolicy = 'no-referrer';
        img.src = item.img;
        img.alt = item.title || '';

        // Same treatment as the image grid: a thumbnail that never loads
        // takes its whole card with it rather than leaving a broken tile.
        function removeCard() {
            a.remove();
            if (outfitsGrid.children.length === 0) {
                outfitsStatus.textContent = 'No outfit images could be loaded.';
                outfitsStatus.classList.add('error');
            }
        }
        img.addEventListener('error', removeCard);
        img.addEventListener('load', () => {
            if (img.naturalWidth < 10 || img.naturalHeight < 10) removeCard();
        });
        shot.appendChild(img);

        if (item.source) {
            const src = document.createElement('span');
            src.className = 'src-tag';
            src.textContent = item.source;
            shot.appendChild(src);
        }
        // The overlay is only drawn when there is actually a price on the
        // listing — out-of-stock tiles have an image and no price, and an
        // empty pill reads as a rendering bug.
        if (item.price) {
            const tag = document.createElement('span');
            tag.className = 'price-tag';
            tag.textContent = item.price;
            shot.appendChild(tag);
        }

        a.appendChild(shot);

        if (item.title) {
            const cap = document.createElement('div');
            cap.className = 'caption';
            cap.textContent = item.title;
            a.appendChild(cap);
        }
        return a;
    }

    const outfitWeatherCache = new Map();

    async function resolveOutfitWeather(placeName) {
        const key = placeName.trim().toLowerCase();
        if (outfitWeatherCache.has(key)) return outfitWeatherCache.get(key);
        let result = { state: 'India', weather: 'weather appropriate' };
        try {
            const indian = await geocode(new URLSearchParams({ q: placeName, addressdetails: '1', countrycodes: 'in' }));
            if (indian) {
                const match = detectState(indian);
                const stateName = match ? prettyState(match.name) : ((indian.address || {}).state || 'India');
                const stateKey = match ? normalizeState(match.name) : normalizeState((indian.address || {}).state);
                result = {
                    state: stateName,
                    weather: STATE_OUTFIT_WEATHER[stateKey] || ((match && match.theme === 'winter') ? 'cool cold' : ((match && match.theme === 'arid') ? 'hot dry' : 'hot humid monsoon'))
                };
            }
        } catch (err) {
            console.warn('Could not resolve outfit weather:', err);
        }
        outfitWeatherCache.set(key, result);
        return result;
    }

    // Keep the rendered cards for each gender so switching tabs never
    // re-fetches or re-renders a result that has already loaded. The cache
    // is keyed by the actual outfit search inputs, so a new destination or
    // place-type selection naturally gets a fresh result set.

    function outfitCacheKey(place, state, weather, routedQuery) {
        const instancesKey = selectedInstances().map(i => i.url).join('|');
        return [place, state, weather, routedQuery, selectedPlaceType, selectedOutfitStyle, selectedOutfitGender, instancesKey].join('\u001f');
    }

    function renderCachedOutfits(cache) {
        clear(outfitsGrid);
        const liveCards = (cache.cards || []).filter(card => card && !card.__outfitDestroyed);
        liveCards.forEach(card => {
            card.hidden = false;
            outfitsGrid.appendChild(card);
        });
        if (cache.cards) cache.cards = liveCards;
        applyCollapse(outfitsGrid, OUTFITS_COLLAPSE_LIMIT);
        outfitsStatus.textContent = cache.status || '';
        outfitsStatus.classList.toggle('error', !!cache.error);
        amazonSecondary.hidden = false;
        amazonSearchLink.href = `https://www.amazon.in/s?k=${encodeURIComponent(cache.query || '')}`;
    }

    async function loadOutfits(place, instances, token) {
        const { state, weather } = await resolveOutfitWeather(place);
        renderPlaceTypeOptions(state, weather);
        const selectedType = DESTINATION_TYPES.find(t => t.key === selectedPlaceType && t.states.includes(normalizeState(state)));
        const routedQuery = selectedType ? selectedType.query : `${selectedOutfitStyle}`;
        const genderQuery = selectedOutfitGender ? `${selectedOutfitGender} ` : '';
        const query = `${genderQuery}${weather} ${routedQuery} India ${state}`;
        const cacheKey = outfitCacheKey(place, state, weather, routedQuery);
        const cached = outfitGenderCache.get(cacheKey);

        if (cached) {
            renderCachedOutfits(cached);
            return;
        }

        outfitsStatus.textContent = `Loading ${selectedType ? selectedType.label.toLowerCase() : selectedOutfitStyle} outfits for ${state} • ${weather}…`;
        outfitsStatus.classList.remove('error');
        clear(outfitsGrid);

        const amazonQuery = query;
        amazonSecondary.hidden = false;
        amazonSearchLink.href = `https://www.amazon.in/s?k=${encodeURIComponent(amazonQuery)}`;

        // Stores and the image search are raced together so one slow
        // proxy can't hold up the half that did work.
        const storeJobs = STORES.map(store =>
            scrapeStore(store, query).catch(err => ({ error: err.message || `${store.label} failed` }))
        );
        const imageJob = searxSearch(query, 'images', imageCard, instances)
            .catch(err => ({ error: err.message || 'the image search failed' }));

        const [storeResults, imageResult] = await Promise.all([Promise.all(storeJobs), imageJob]);
        if (token !== mediaLoadToken) return;

        const notes = [];
        const seen = new Set();
        const cards = [];

        // Shopping results lead: Amazon/Myntra product cards use the
        // restored price-over-image treatment. SearXNG image results are
        // appended afterward as secondary visual inspiration.
        storeResults.forEach(result => {
            if (result && result.error) { notes.push(result.error); return; }
            result.forEach(item => {
                const key = item.url || item.img;
                if (seen.has(key)) return;
                seen.add(key);
                const card = outfitCard(item);
                card.dataset.storeResult = 'true';
                cards.push(card);
            });
        });

        if (imageResult && imageResult.error) {
            notes.push(imageResult.error);
        } else if (Array.isArray(imageResult)) {
            imageResult.forEach(card => {
                const key = card.dataset.key || card.href;
                if (seen.has(key)) return;
                seen.add(key);
                card.classList.add('outfit');
                card.dataset.searxResult = 'true';
                cards.push(card);
            });
        }

        cards.forEach(card => {
            const originalRemove = card.remove.bind(card);
            card.__outfitDestroyed = false;
            card.remove = function(){
                card.__outfitDestroyed = true;
                originalRemove();
            };
            outfitsGrid.appendChild(card);
        });

        const loaded = cards.filter(card => !card.__outfitDestroyed).length;
        const status = loaded === 0
            ? (notes.length ? `No outfits found. ${notes.join('. ')}.` : 'No outfits found.')
            : (notes.length ? `Showing what loaded \u2014 ${notes.join('. ')}.` : '');

        outfitGenderCache.set(cacheKey, {
            cards: cards.filter(card => !card.__outfitDestroyed),
            status,
            error: loaded === 0,
            query,
        });

        applyCollapse(outfitsGrid, OUTFITS_COLLAPSE_LIMIT);
        outfitsStatus.textContent = status;
        outfitsStatus.classList.toggle('error', loaded === 0);
    }

    // Male/female tabs now swap already-loaded card nodes instead of
    // starting a fresh network request every time the user switches.
    document.querySelectorAll('.outfit-gender-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const nextGender = btn.dataset.gender || 'men';
            if (nextGender === selectedOutfitGender) return;
            selectedOutfitGender = nextGender;
            document.querySelectorAll('.outfit-gender-tab').forEach(item => {
                const active = item === btn;
                item.classList.toggle('active', active);
                item.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            if (window.__reloadOutfitsForPreference) window.__reloadOutfitsForPreference();
        });
    });

    // Re-run the outfit panel only when the search inputs changed. Gender
    // switches reuse the gender-specific cache above whenever available.
    window.__reloadOutfitsForPreference = function(){
        const name = (document.getElementById('sharedLocationInput')?.value || '').trim();
        if (!name) return;
        const instances = selectedInstances();
        if (instances.length === 0) return;
        const token = ++mediaLoadToken;
        loadOutfits(name, instances, token);
    };

    // Expose for the shared load-a-location hook below.
    window.__loadPlaceMedia = loadPlace;

    // Single-image lookup for the itinerary panel's stop backgrounds.
    // Reuses the same instance/proxy/dedup machinery as the grids above
    // instead of a separate fetch path, so it inherits the same
    // rate-limit and CORS handling for free.
    //
    // "Highest resolution" is only knowable when the instance reports one
    // (SearXNG sometimes includes a "resolution" field like "1920x1080");
    // when it doesn't, downloading every candidate just to measure it
    // would turn one background fetch into several — so the practical
    // fallback is "higher": prefer the full-size img_src over the
    // (usually much smaller) thumbnail_src, which is true for the large
    // majority of results even without explicit dimensions.
    function stopImagePixels(result) {
        if (typeof result.resolution === 'string') {
            const m = result.resolution.match(/(\d+)\s*[x×]\s*(\d+)/i);
            if (m) return Number(m[1]) * Number(m[2]);
        }
        if (result.img_width && result.img_height) {
            return Number(result.img_width) * Number(result.img_height);
        }
        return 0;
    }

    window.__fetchStopImage = async function (query) {
        const instances = selectedInstances();
        if (!instances.length) return null;
        try {
            const cards = await searxSearch(query, 'images', result => {
                const full = result.img_src || result.thumbnail_src;
                if (!full) return null;
                const marker = document.createElement('span');
                // Ranking still looks at the full-size URL/resolution — that's
                // what tells us which *photo* is the best match. But a stop
                // background is a small, cropped, gradient-darkened backdrop
                // behind text, not something viewed at full size, so what
                // actually gets loaded is the compressed thumbnail: same
                // photo, a fraction of the bytes.
                marker.dataset.key = full;
                marker.dataset.display = result.thumbnail_src || full;
                marker.dataset.pixels = String(stopImagePixels(result));
                marker.dataset.hasFullSrc = result.img_src ? '1' : '0';
                return marker;
            }, instances);
            if (!cards.length) return null;

            // Rank by reported resolution first, then by whether it's a
            // full-size URL at all, and otherwise keep the instance's own
            // relevance order (earlier result wins ties).
            const best = cards.slice(0, 10).reduce((top, card) => {
                const pixels = Number(card.dataset.pixels);
                const topPixels = Number(top.dataset.pixels);
                if (pixels !== topPixels) return pixels > topPixels ? card : top;
                const hasFull = card.dataset.hasFullSrc === '1';
                const topHasFull = top.dataset.hasFullSrc === '1';
                return (hasFull && !topHasFull) ? card : top;
            }, cards[0]);

            return best.dataset.display;
        } catch {
            return null;
        }
    };
})();


/* ============================================================
   STATE MAP (location-map.html)
   ============================================================ */
const mapCardTitle = document.getElementById('mapCardTitle');
const mapCardSubtitle = document.getElementById('mapCardSubtitle');
const map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    tap: false,
}).setView([20, 0], 2);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Imagery &copy; Esri',
}).addTo(map);

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Boundaries &copy; Esri',
}).addTo(map);

let marker = null;

function setMapStatus(text, isError) {
    mapCardSubtitle.textContent = text;
    mapCardSubtitle.classList.toggle('error', !!isError);
}

async function geocode(params) {
    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}&format=jsonv2&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    if (!res.ok) throw new Error(`Geocoding failed (HTTP ${res.status})`);
    const results = await res.json();
    return results[0] || null;
}

/* ============================================================
   STATE → THEME ROUTING
   A search for any place resolves to its state first, then the
   state picks the mood. So "Munnar" lands on tropical because
   Kerala does, and "Leh" lands on winter because Ladakh does.
   ============================================================ */
const STATE_THEMES = {
    // Winter — Himalaya and the high north-east: snow, pine, thin air.
    'jammu and kashmir': 'winter',
    'ladakh': 'winter',
    'himachal pradesh': 'winter',
    'uttarakhand': 'winter',
    'uttaranchal': 'winter',
    'sikkim': 'winter',
    'arunachal pradesh': 'winter',

    // Arid — desert, dry Deccan and the dusty northern plains.
    'rajasthan': 'arid',
    'gujarat': 'arid',
    'haryana': 'arid',
    'punjab': 'arid',
    'chandigarh': 'arid',
    'delhi': 'arid',
    'nct of delhi': 'arid',
    'national capital territory of delhi': 'arid',
    'uttar pradesh': 'arid',
    'bihar': 'arid',
    'madhya pradesh': 'arid',
    'telangana': 'arid',

    // Tropical — coast, ghats, delta and rainforest.
    'kerala': 'tropical',
    'goa': 'tropical',
    'karnataka': 'tropical',
    'tamil nadu': 'tropical',
    'andhra pradesh': 'tropical',
    'maharashtra': 'tropical',
    'odisha': 'tropical',
    'orissa': 'tropical',
    'west bengal': 'tropical',
    'jharkhand': 'tropical',
    'chhattisgarh': 'tropical',
    'assam': 'tropical',
    'meghalaya': 'tropical',
    'nagaland': 'tropical',
    'manipur': 'tropical',
    'mizoram': 'tropical',
    'tripura': 'tropical',
    'puducherry': 'tropical',
    'pondicherry': 'tropical',
    'andaman and nicobar islands': 'tropical',
    'lakshadweep': 'tropical',
    'dadra and nagar haveli and daman and diu': 'tropical',
    'dadra and nagar haveli': 'tropical',
    'daman and diu': 'tropical',
};


// Outfit-weather routing: practical search labels for Indian states/UTs.
const STATE_OUTFIT_WEATHER = {
    'jammu and kashmir': 'cold snowy', 'ladakh': 'cold snowy', 'himachal pradesh': 'cold snowy',
    'uttarakhand': 'cool cold', 'sikkim': 'cool wet', 'arunachal pradesh': 'cool wet',
    'rajasthan': 'hot dry', 'gujarat': 'hot dry', 'haryana': 'hot dry', 'punjab': 'hot dry',
    'delhi': 'hot dry', 'nct of delhi': 'hot dry', 'national capital territory of delhi': 'hot dry',
    'uttar pradesh': 'hot dry', 'madhya pradesh': 'hot dry', 'telangana': 'hot dry', 'chandigarh': 'hot dry',
    'bihar': 'hot humid monsoon', 'kerala': 'hot humid monsoon', 'goa': 'hot humid monsoon',
    'karnataka': 'warm humid monsoon', 'tamil nadu': 'hot humid', 'andhra pradesh': 'hot humid monsoon',
    'maharashtra': 'hot humid monsoon', 'odisha': 'hot humid monsoon', 'orissa': 'hot humid monsoon',
    'west bengal': 'hot humid monsoon', 'jharkhand': 'warm humid monsoon', 'chhattisgarh': 'hot humid monsoon',
    'assam': 'hot humid monsoon', 'meghalaya': 'cool wet monsoon', 'nagaland': 'mild wet monsoon',
    'manipur': 'mild wet monsoon', 'mizoram': 'warm wet monsoon', 'tripura': 'warm humid monsoon',
    'puducherry': 'hot humid', 'pondicherry': 'hot humid', 'andaman and nicobar islands': 'hot humid tropical',
    'lakshadweep': 'hot humid tropical', 'dadra and nagar haveli and daman and diu': 'hot humid',
    'dadra and nagar haveli': 'hot humid', 'daman and diu': 'hot humid'
};

const THEME_NAMES = { tropical: 'Tropical', arid: 'Arid', winter: 'Winter' };

// Nominatim's official spellings read badly in a caption.
const STATE_DISPLAY = {
    'nct of delhi': 'Delhi',
    'national capital territory of delhi': 'Delhi',
    'uttaranchal': 'Uttarakhand',
    'orissa': 'Odisha',
    'pondicherry': 'Puducherry',
    'dadra and nagar haveli and daman and diu': 'Daman & Diu',
    'andaman and nicobar islands': 'Andaman & Nicobar',
};

function prettyState(value) {
    return STATE_DISPLAY[normalizeState(value)] || value;
}

function normalizeState(value) {
    return (value || '')
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z ]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

// Nominatim puts the state in different keys depending on the place
// (a union territory often lands in `state` or `city`, a village in
// `state` but sometimes only in `display_name`), so try each in turn.
function detectState(place) {
    const address = place.address || {};
    const candidates = [
        address.state,
        address['ISO3166-2-lvl4'],
        address.region,
        address.state_district,
        address.county,
        address.city,
    ];
    for (const candidate of candidates) {
        const key = normalizeState(candidate);
        if (STATE_THEMES[key]) return { name: candidate, theme: STATE_THEMES[key] };
    }
    // Last resort: scan the full display name for any state we know.
    const haystack = normalizeState(place.display_name);
    for (const key in STATE_THEMES) {
        if (haystack.includes(key)) {
            const pretty = key.replace(/\b[a-z]/g, c => c.toUpperCase());
            return { name: pretty, theme: STATE_THEMES[key] };
        }
    }
    return null;
}

function applyThemeForPlace(place) {
    const match = detectState(place);
    if (!match) return;
    if (window.__setTheme) {
        // `false` keeps this from re-triggering the search that got us here.
        window.__setTheme(match.theme, false, `${THEME_NAMES[match.theme]} · ${prettyState(match.name)}`);
    }
    if (window.__buildItinerary) {
        window.__buildItinerary(place.name || prettyState(match.name), match.theme);
    }
    updateBookLink(place.name || prettyState(match.name));
    updateTrainLink(place.name || prettyState(match.name));
}

/* ------------------------------------------------------------------
   HEADER WEATHER

   Current conditions for whatever place the search resolved to, shown
   top-right of the brand header. Open-Meteo is keyless and CORS-open,
   so this needs no proxy; a failed call just hides the pill rather
   than surfacing an error, since this is decoration, not the point of
   the page.
   ------------------------------------------------------------------ */
const WEATHER_CODES = {
    0:['Clear sky','☀️'], 1:['Mainly clear','🌤️'], 2:['Partly cloudy','⛅'], 3:['Overcast','☁️'],
    45:['Fog','🌫️'], 48:['Rime fog','🌫️'],
    51:['Light drizzle','🌦️'], 53:['Drizzle','🌦️'], 55:['Heavy drizzle','🌦️'],
    56:['Freezing drizzle','🌧️'], 57:['Freezing drizzle','🌧️'],
    61:['Light rain','🌦️'], 63:['Rain','🌧️'], 65:['Heavy rain','🌧️'],
    66:['Freezing rain','🌧️'], 67:['Freezing rain','🌧️'],
    71:['Light snow','🌨️'], 73:['Snow','🌨️'], 75:['Heavy snow','❄️'], 77:['Snow grains','🌨️'],
    80:['Rain showers','🌦️'], 81:['Rain showers','🌧️'], 82:['Heavy showers','⛈️'],
    85:['Snow showers','🌨️'], 86:['Snow showers','❄️'],
    95:['Thunderstorm','⛈️'], 96:['Thunderstorm & hail','⛈️'], 99:['Thunderstorm & hail','⛈️']
};

let weatherRequestId = 0;

async function updateHeaderWeather(lat, lon, placeLabel) {
    const box = document.getElementById('headerWeather');
    const tempEl = document.getElementById('hwTemp');
    const conditionEl = document.getElementById('hwCondition');
    const metaEl = document.getElementById('hwMeta');
    if (!box || !Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const id = ++weatherRequestId;
    box.classList.add('show');
    tempEl.textContent = '—';
    conditionEl.textContent = 'Loading…';
    metaEl.textContent = placeLabel || '';

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(3)}`
            + `&longitude=${lon.toFixed(3)}&current=temperature_2m,weather_code&timezone=auto`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (id !== weatherRequestId) return; // a newer search has taken over

        const cur = data.current || {};
        const temp = cur.temperature_2m;
        const [label] = WEATHER_CODES[cur.weather_code] || ['Current weather'];
        if (typeof temp !== 'number') throw new Error('no temperature in response');

        // Local time at the place, from the timezone Open-Meteo resolved
        // (timezone=auto) rather than the browser's own zone.
        let timeStr = '';
        try {
            timeStr = new Intl.DateTimeFormat('en-GB', {
                hour: '2-digit', minute: '2-digit',
                timeZone: data.timezone
            }).format(new Date());
        } catch (e) { /* unknown tz string — just skip the time */ }

        tempEl.textContent = `${Math.round(temp)}°`;
        conditionEl.textContent = label;
        metaEl.textContent = [placeLabel, timeStr].filter(Boolean).join(' · ');
    } catch (err) {
        if (id !== weatherRequestId) return;
        console.warn('Weather lookup failed:', err);
        box.classList.remove('show');
    }
}

async function loadLocationOnMap(rawName) {
    const name = rawName.trim();
    if (!name) return;

    mapCardTitle.textContent = name;
    setMapStatus('Loading…');

    try {
        // Ambiguous names ("Tawang", "Salem") resolve abroad on a plain
        // global lookup, which breaks the state routing below. Try India
        // first, but only trust it if the match is a confident one —
        // otherwise "Paris" finds a hamlet in Maharashtra scoring 0.00008.
        const indian = await geocode(new URLSearchParams({ q: name, addressdetails: '1', countrycodes: 'in' }));
        const place = (indian && (indian.importance ?? 0) >= 0.05)
            ? indian
            : (await geocode(new URLSearchParams({ q: name, addressdetails: '1' })) || indian);
        if (!place) {
            setMapStatus(`Couldn't find "${name}"`, true);
            return;
        }
        dismissStartMode();

        const address = place.address || {};
        const state = address.state;
        const country = address.country;
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);

        mapCardTitle.textContent = place.name || name;
        setMapStatus(state || country || 'Location found');

        updateHeaderWeather(lat, lon, [place.name || name, state].filter(Boolean).join(', '));

        applyThemeForPlace(place);

        if (window.__updateHero) window.__updateHero(place);

        map.setView([lat, lon], 7);

        if (marker) map.removeLayer(marker);
        const accent = getComputedStyle(document.body)
            .getPropertyValue('--accent').trim() || '#c1440e';
        marker = L.circleMarker([lat, lon], {
            radius: 7,
            color: '#fff',
            fillColor: accent,
            fillOpacity: 1,
            weight: 2,
        }).addTo(map);

        map.invalidateSize();
    } catch (err) {
        console.error(err);
        setMapStatus('Something went wrong looking that up.', true);
    }
}

// One shared search bar drives both the map and the media grids.
const sharedSearchForm = document.getElementById('sharedSearchForm');
const sharedLocationInput = document.getElementById('sharedLocationInput');

/* ============================================================
   PLACE MATCHING — a short curated list filtered in the browser.
   This is intentionally not a geocoder-backed autocomplete: every
   keystroke would mean a network round trip, rate limits, and a
   visible lag. A static list covering states + well-known
   destinations gives most of the benefit (fast, predictable
   suggestions) for a fraction of the complexity.
   ============================================================ */
(function () {
    const suggestList = document.getElementById('sharedSearchSuggest');
    if (!suggestList) return;

    const STATES = ['Kerala','Rajasthan','Himachal Pradesh','Karnataka','Goa','Tamil Nadu',
        'Maharashtra','Uttarakhand','West Bengal','Assam','Gujarat','Delhi','Ladakh','Punjab',
        'Sikkim','Odisha','Madhya Pradesh','Uttar Pradesh','Jammu and Kashmir','Meghalaya',
        'Andaman and Nicobar Islands','Telangana','Andhra Pradesh','Bihar','Chhattisgarh',
        'Jharkhand','Haryana'];

    const PLACES = ['Jaipur','Jodhpur','Udaipur','Jaisalmer','Pushkar','Ranthambore',
        'Munnar','Kochi','Alleppey','Alappuzha','Varkala','Wayanad','Thekkady',
        'Shimla','Manali','Dharamshala','Spiti','Kasol','Dalhousie',
        'Bengaluru','Mysuru','Hampi','Coorg','Chikmagalur','Gokarna','Udupi',
        'Panaji','North Goa','South Goa',
        'Chennai','Madurai','Ooty','Kodaikanal','Mahabalipuram','Rameswaram','Thanjavur',
        'Mumbai','Pune','Lonavala','Mahabaleshwar','Nashik','Ajanta','Ellora',
        'Rishikesh','Mussoorie','Nainital','Auli','Haridwar',
        'Kolkata','Darjeeling','Kalimpong','Sundarbans','Bishnupur',
        'Guwahati','Kaziranga','Majuli',
        'Ahmedabad','Kutch','Dwarka','Somnath','Gir',
        'Leh','Nubra Valley','Pangong Lake','Tso Moriri',
        'Agra','Varanasi','Amritsar','Mount Abu','Khajuraho','Hyderabad','Puducherry',
        'Shillong','Cherrapunji','Gangtok','Bhubaneswar','Puri'];

    const ENTRIES = [
        ...STATES.map(name => ({ name, kind: 'State' })),
        ...PLACES.map(name => ({ name, kind: 'Place' })),
    ];

    const MAX_RESULTS = 7;
    let activeIndex = -1;
    let currentMatches = [];

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
    }

    function highlight(name, query) {
        const i = name.toLowerCase().indexOf(query.toLowerCase());
        if (i === -1) return escapeHtml(name);
        return escapeHtml(name.slice(0, i)) + '<mark>' + escapeHtml(name.slice(i, i + query.length)) + '</mark>' + escapeHtml(name.slice(i + query.length));
    }

    function match(query) {
        const q = query.trim().toLowerCase();
        if (!q) return [];
        // Prefix matches first (more likely to be what's being typed),
        // then anywhere-in-the-name matches, each alphabetised.
        const starts = [], contains = [];
        for (const entry of ENTRIES) {
            const lower = entry.name.toLowerCase();
            if (lower.startsWith(q)) starts.push(entry);
            else if (lower.includes(q)) contains.push(entry);
        }
        const byName = (a, b) => a.name.localeCompare(b.name);
        return [...starts.sort(byName), ...contains.sort(byName)].slice(0, MAX_RESULTS);
    }

    function closeSuggestions() {
        suggestList.hidden = true;
        suggestList.innerHTML = '';
        sharedLocationInput.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
        currentMatches = [];
    }

    function renderSuggestions(query) {
        currentMatches = match(query);
        activeIndex = -1;
        if (!currentMatches.length) { closeSuggestions(); return; }
        suggestList.innerHTML = currentMatches.map((entry, i) =>
            `<li role="option" data-index="${i}">${highlight(entry.name, query)}<span class="suggest-kind">${entry.kind}</span></li>`
        ).join('');
        suggestList.hidden = false;
        sharedLocationInput.setAttribute('aria-expanded', 'true');
    }

    function paintActive() {
        suggestList.querySelectorAll('li').forEach((li, i) => li.classList.toggle('active', i === activeIndex));
        const activeLi = suggestList.querySelector('li.active');
        if (activeLi) activeLi.scrollIntoView({ block: 'nearest' });
    }

    function choose(entry) {
        sharedLocationInput.value = entry.name;
        closeSuggestions();
        sharedSearchForm.requestSubmit();
    }

    sharedLocationInput.addEventListener('input', () => renderSuggestions(sharedLocationInput.value));
    sharedLocationInput.addEventListener('focus', () => { if (sharedLocationInput.value) renderSuggestions(sharedLocationInput.value); });

    sharedLocationInput.addEventListener('keydown', event => {
        if (suggestList.hidden) return;
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            activeIndex = Math.min(activeIndex + 1, currentMatches.length - 1);
            paintActive();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            activeIndex = Math.max(activeIndex - 1, 0);
            paintActive();
        } else if (event.key === 'Enter') {
            if (activeIndex >= 0 && currentMatches[activeIndex]) {
                event.preventDefault();
                choose(currentMatches[activeIndex]);
            } else {
                closeSuggestions();
            }
        } else if (event.key === 'Escape') {
            closeSuggestions();
        }
    });

    suggestList.addEventListener('mousedown', event => {
        // mousedown (not click) so this fires before the input's blur hides the list.
        const li = event.target.closest('li');
        if (!li) return;
        const entry = currentMatches[Number(li.dataset.index)];
        if (entry) choose(entry);
    });

    document.addEventListener('click', event => {
        if (!event.target.closest('.search-input-wrap')) closeSuggestions();
    });
})();

sharedSearchForm.addEventListener('submit', e => {
    e.preventDefault();
    const name = sharedLocationInput.value;
    loadLocationOnMap(name);   // updates the State Map panel
    window.__loadPlaceMedia(name); // updates the Place Media panel (images/shorts/reels)
});

// ?location=<name> preloads both panels at once, same as a manual search.
const globalParams = new URLSearchParams(window.location.search);
const globalLocation = globalParams.get('location');
if (globalLocation) {
    sharedLocationInput.value = globalLocation;
    loadLocationOnMap(globalLocation);
    window.__loadPlaceMedia(globalLocation);
}
setTimeout(() => map.invalidateSize(), 0);

