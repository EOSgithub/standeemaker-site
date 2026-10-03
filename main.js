/* ===========================================================================
   Standee Maker - pagina di vendita

   I commenti restano in italiano come nel resto del progetto; in inglese e'
   tutto cio' che finisce sotto gli occhi di chi compra.

   Tutto quello che cambia al rilascio sta in SITE, qui sotto. Finche' un
   indirizzo e' null il pulsante che lo userebbe resta spento e lo dice:
   meglio un bottone onesto che un link che porta a una pagina che non c'e'.
   ========================================================================= */
(function () {
  "use strict";

  var SITE = {
    // deploy.py ne fa version.json, che l'app legge per dire che c'e' una
    // versione nuova: cambiarla qui e' annunciarla. `notes` e' la riga che
    // l'avviso nell'app mostra sotto il titolo (vuota: una frase generica).
    version: "0.9.0",
    notes: "",
    // Il setup della Beta. Il nome `trial` e' rimasto (e con lui l'id
    // dlg-trial e l'ancora #download, che l'app usa): e' il download che la
    // pagina offre, e cambiarne il nome rompeva i link.
    trial: {
      // Li scrive `python site/release.py` (Release di GitHub, che conta anche i download)
      url: "https://github.com/EOSgithub/standeemaker-site/releases/download/v0.9.0/StandeeMaker-Beta-0.9.0-Setup.exe",
      size: "44 MB",
      sha256: "5b6bbb36bfc784831778807fc5c00be74b8d8e8e4287690c346d656cfc4b31fe"
    },
    // Il prezzo del lancio. Non c'e' ancora un checkout: la Beta e' gratis e la
    // Commercial non si vende (EULA 3.3). Va tenuto uguale a LAUNCH_PRICE in
    // license.py e all'offerta nel JSON-LD di index.html.
    price: "19.99",
    // La Beta e' finita? deploy.py lo scrive in version.json e le copie Beta
    // installate lo leggono col controllo degli aggiornamenti: da quel momento
    // smettono di essere una Beta (license.BETA). Mettere true SOLO nel giorno
    // in cui la 1.0 si scarica davvero da qui.
    betaEnded: false,
    // GoatCounter, solo durante la Beta, per contare quanta gente guarda la
    // pagina e quanta preme Download. Il codice e' quello scelto registrandosi
    // su goatcounter.com (https://CODICE.goatcounter.com). Finche' e' null non
    // parte nessuna richiesta. A Beta finita rimetterlo a null e togliere la
    // sezione 3.4 della Privacy (legal/PRIVACY.txt), poi rifare make_legal.
    stats: "toolsmithdev",
    // Le foto vere del pezzo stampato (solo soggetti di samples/; WebP, lato
    // lungo 1500 px, senza metadati). Finche' e' null la hero mostra il pezzo
    // che gira; con la foto, la foto prende la hero e il pezzo scende al terzo
    // dei tre passi.
    photos: {
      hero: null                    // es. "assets/photo/hero.webp"
    }
  };

  var $ = function (id) { return document.getElementById(id); };
  var root = document.documentElement;
  // Chi chiede meno movimento non vede ne' inerzia, ne' dimostrazioni, ne'
  // entrate: il CSS spegne le transizioni, qui si spengono i giri in JS.
  var CALM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------- il pezzo: girarlo a mano */
  // Settantadue viste del pezzo, una ogni 5 gradi, col fondo trasparente (la
  // carta millimetrata si vede intorno, non attraverso). Si gira trascinando,
  // con lo scorrimento orizzontale (touchpad, o Shift+rotella) e con le frecce.
  // Lo scorrimento verticale resta della pagina: chi scorre non deve trovarsi a
  // girare il pezzo invece di andare avanti.
  //
  // Si disegna su un canvas, con le viste gia' decodificate: cambiare lo `src`
  // di un'immagine a ogni passo costringeva il browser a decodificarla in quel
  // momento, e il giro andava a scatti. L'<img> resta come prima vista (e per
  // chi non ha JavaScript) finche' il canvas non ha disegnato.
  var TURN_N = 72, TURN_PX = 6;              // pixel di trascinamento per vista
  // Le viste hanno sempre lo stesso nome, ma il browser ne tiene una copia
  // buona dieci minuti: rifattele, la prima (che sta nella pagina) si
  // riscarica e le altre no, e il pezzo cambiava aspetto girandolo. Questo
  // numero si alza a ogni `make_turn.py`, e la copia vecchia non viene piu'
  // chiesta. Va tenuto uguale ai `?v=` delle viste nella pagina.
  var TURN_V = "?v=6";
  var turnBox = $("turn"), turnImg = $("turn-img"), turnTag = $("turn-tag");
  var turnSrc = function (i) { return "assets/turn/t" + (i < 10 ? "0" : "") + i + ".webp" + TURN_V; };
  // Il trascinamento accumula una posizione continua (in viste, 0..72), ma si
  // mostra sempre una vista intera, la piu' vicina: la miscela fra due viste
  // vicine, provata, a mano lenta si vedeva come due pezzi sovrapposti.
  // `turnAt` e' la vista mostrata, quella che si dice allo screen reader.
  var turnPos = 0, turnAt = 0, turnDrag = null;
  var views = [], ready = [];
  var canvas = document.createElement("canvas"), ctx = canvas.getContext("2d");
  canvas.width = turnImg.getAttribute("width");
  canvas.height = turnImg.getAttribute("height");
  canvas.setAttribute("aria-hidden", "true");
  turnBox.insertBefore(canvas, turnImg.nextSibling);

  var wrap = function (i) { return ((i % TURN_N) + TURN_N) % TURN_N; };
  // una vista: la si chiede una volta, e la si puo' disegnare solo decodificata
  function view(i) {
    if (!views[i]) {
      var im = views[i] = new Image();
      im.src = turnSrc(i);
      // Decodificata, la vista diventa un ImageBitmap: sta gia' pronta per la
      // scheda grafica, e disegnarla a ogni passo del giro costa meno di
      // disegnare l'<img>. Dove non c'e', resta l'immagine.
      (im.decode ? im.decode() : new Promise(function (ok) { im.onload = ok; }))
        .then(function () {
          return window.createImageBitmap ? createImageBitmap(im).then(function (bm) { views[i] = bm; }, function () {}) : null;
        })
        .then(function () { ready[i] = true; if (i === turnAt) { paint(); } })
        .catch(function () {});
    }
    return views[i];
  }
  // Una vista non ancora pronta non si disegna: resta la precedente, e la si
  // disegna appena arriva se e' ancora quella voluta. Niente lampi di vuoto.
  function paint() {
    view(turnAt);
    if (!ready[turnAt]) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(views[turnAt], 0, 0, canvas.width, canvas.height);
    turnBox.classList.add("live");
  }
  // Le viste si chiedono a partire da quelle piu' vicine alla vista di adesso,
  // alternando i due versi (0, 1, 71, 2, 70...): in ordine 0..71, trascinando
  // verso destra (71, 70, 69...) le viste che servivano erano le ultime della
  // coda, e sul telefono il pezzo restava fermo e poi saltava. Il browser le
  // scarica nell'ordine in cui le si chiede.
  function turnNear(count) {
    for (var d = 0; d <= count; d++) {
      view(wrap(turnAt + d));
      if (d) { view(wrap(turnAt - d)); }
    }
  }
  var turnLoaded = false;
  function turnLoad() {                      // tutte le viste, la prima volta che servono
    if (turnLoaded) return;
    turnLoaded = true;
    turnNear(TURN_N / 2);
  }
  // Prima ancora del tocco, a pagina ferma e col pezzo in vista, le dodici
  // viste piu' vicine (60 gradi per parte, un paio di centinaia di KB): sul
  // telefono il tocco e l'inizio del giro sono lo stesso istante, e senza
  // questo il primo giro partiva a vuoto. Le altre arrivano al primo tocco.
  if ("IntersectionObserver" in window) {
    var turnSeen = new IntersectionObserver(function (list) {
      if (!list[0].isIntersecting) return;
      turnSeen.disconnect();
      var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 1200); };
      idle(function () { if (!turnLoaded) turnNear(12); }, { timeout: 2500 });
    });
    turnSeen.observe(turnBox);
  }
  function turnTo(p) {
    turnPos = ((p % TURN_N) + TURN_N) % TURN_N;
    var at = wrap(Math.round(turnPos));
    if (at !== turnAt) { turnAt = at; paint(); }
    turnBox.setAttribute("aria-valuenow", turnAt);
    turnTag.classList.add("gone");
  }
  function turnBy(px) { turnTo(turnPos - px / TURN_PX); }

  // Lasciato andare, il pezzo prosegue un poco con la velocita' della mano e
  // si ferma da solo, come un piatto girevole. La velocita' e' quella degli
  // ultimi 80 ms di trascinamento, non dell'ultimo evento: un ultimo evento
  // lento dopo un gesto svelto la azzererebbe.
  var turnTrail = [], turnSpin = 0, turnFrame = 0;
  function turnCoast(t0) {
    var last = t0;
    function step(t) {
      var dt = Math.min(48, t - last); last = t;
      turnBy(turnSpin * dt);
      turnSpin *= Math.pow(0.991, dt);            // circa 14% ogni fotogramma a 60 Hz
      turnFrame = Math.abs(turnSpin) > 0.004 ? requestAnimationFrame(step) : 0;
    }
    turnFrame = requestAnimationFrame(step);
  }
  turnBox.addEventListener("pointerenter", turnLoad);
  turnBox.addEventListener("pointerdown", function (e) {
    turnLoad();
    cancelAnimationFrame(turnFrame); turnSpin = 0;
    turnDrag = e.clientX;
    turnTrail = [[e.clientX, e.timeStamp]];
    turnBox.setPointerCapture(e.pointerId);
    turnBox.classList.add("grabbing");
    e.preventDefault();
  });
  turnBox.addEventListener("pointermove", function (e) {
    if (turnDrag === null) return;
    turnBy(e.clientX - turnDrag);
    turnDrag = e.clientX;
    turnTrail.push([e.clientX, e.timeStamp]);
    while (turnTrail.length > 2 && e.timeStamp - turnTrail[0][1] > 80) { turnTrail.shift(); }
  });
  function turnUp(e) {
    if (turnDrag === null) return;
    turnDrag = null;
    turnBox.classList.remove("grabbing");
    try { turnBox.releasePointerCapture(e.pointerId); } catch (err) {}
    var a = turnTrail[0], b = turnTrail[turnTrail.length - 1];
    if (!CALM && a && b && b[1] - a[1] > 0 && e.timeStamp - b[1] < 60) {
      // px per ms, smorzata: il pezzo accompagna la mano per un tratto breve
      // (un lancio svelto vale meno di un quarto di giro), non fa la trottola
      turnSpin = 0.7 * Math.max(-2, Math.min(2, (b[0] - a[0]) / (b[1] - a[1])));
      if (Math.abs(turnSpin) > 0.08) { turnCoast(performance.now()); }
    }
  }
  turnBox.addEventListener("pointerup", turnUp);
  turnBox.addEventListener("pointercancel", turnUp);
  turnBox.addEventListener("wheel", function (e) {
    var dx = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    if (!dx || Math.abs(dx) < Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
    e.preventDefault();
    turnLoad();
    turnBy(-dx);
  }, { passive: false });
  turnBox.addEventListener("keydown", function (e) {
    var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    turnLoad();
    turnTo(turnAt + d);
  });

  // La foto vera, quando c'e', prende la hero; il pezzo che gira scende nel
  // riquadro del terzo passo, al posto della vista ferma.
  // La carta col disegno di partenza sta davanti al pezzo: davanti alla foto
  // no, la foto mostra gia' la carta vera.
  if (SITE.photos.hero) {
    var slot = $("print-slot"), photo = new Image(), card = document.querySelector(".hero-card");
    photo.src = SITE.photos.hero;
    photo.className = "hero-photo";
    photo.alt = "A printed standee in its stand, next to a card in its toploader";
    slot.innerHTML = "";
    slot.appendChild(turnBox);
    $("hero-art").appendChild(photo);
    if (card) { card.remove(); }
  }

  // All'apertura il pezzo sta fermo: niente mezzo giro da solo (c'era, tolto
  // su richiesta). A dire che si gira bastano il cursore e "Drag to turn".

  // La luce del palco va un poco verso il puntatore: si muove poco (un terzo
  // della strada) e con calma, e la transizione la fa il CSS (@property).
  var heroArt = $("hero-art");
  if (!CALM && window.matchMedia && matchMedia("(hover: hover)").matches) {
    heroArt.addEventListener("pointermove", function (e) {
      var r = heroArt.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      heroArt.style.setProperty("--lx", (50 + (x - 0.5) * 34).toFixed(1) + "%");
      heroArt.style.setProperty("--ly", (30 + (y - 0.5) * 24).toFixed(1) + "%");
    });
    heroArt.addEventListener("pointerleave", function () {
      heroArt.style.removeProperty("--lx");
      heroArt.style.removeProperty("--ly");
    });
  }

  /* --------------------------------------------------------- schermate */
  // La prima e' anche scritta nella pagina: chi arriva col JavaScript spento
  // deve leggerla lo stesso. Le due devono restare uguali.
  var NOTES = [
    // in pezzi di frase (.ph), come i sottotitoli: si va a capo fra un pezzo
    // e l'altro, mai a meta' ("side by / side")
    '<span class="ph"><b>Trace</b> puts the picture and its outline</span> <span class="ph">side by side, at the same height.</span> <span class="ph">Size and line width are on the right.</span>',
    '<span class="ph"><b>Figure</b> turns the outline into a solid</span> <span class="ph">on a base that slides into the stand.</span> <span class="ph">The drawing at the top right shows</span> <span class="ph">how much of the figure</span> <span class="ph">stands above the card: 57 mm here.</span>',
    '<span class="ph"><b>Stand</b> makes the block.</span> <span class="ph">Pick the figure</span> <span class="ph">and the width of the card slot:</span> <span class="ph">width, depth and height</span> <span class="ph">follow from the two.</span>'
  ];
  var unote = $("unote");
  var tabs = [0, 1, 2].map(function (i) { return $("p" + i); });
  var shots = [0, 1, 2].map(function (i) { return $("u" + i); });

  var tabInd = document.querySelector(".tab-ind"), pageAt = -1, noteTimer = 0;
  function placeTab() {
    var b = tabs[pageAt];
    if (!b || !tabInd) return;
    tabInd.style.setProperty("--x", b.offsetLeft + "px");
    tabInd.style.setProperty("--w", b.offsetWidth + "px");
  }
  function showPage(i) {
    var first = pageAt < 0;
    pageAt = i;
    tabs.forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
    shots.forEach(function (im, j) { im.classList.toggle("on", j === i); });
    placeTab();
    if (first || CALM) { unote.innerHTML = NOTES[i]; return; }
    unote.classList.add("swap");
    clearTimeout(noteTimer);
    noteTimer = setTimeout(function () { unote.innerHTML = NOTES[i]; unote.classList.remove("swap"); }, 200);
  }
  window.addEventListener("resize", placeTab);
  if (document.fonts && document.fonts.ready) { document.fonts.ready.then(placeTab); }
  tabs.forEach(function (b, i) {
    b.addEventListener("click", function () { showPage(i); });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (i + d + tabs.length) % tabs.length;
      tabs[n].focus(); showPage(n);
    });
  });
  showPage(0);

  /* ------------------------------------------------------------ esempi */
  // Solo i soggetti di samples/, di cui abbiamo il permesso (samples/CREDITS.txt):
  // le immagini le rifa' make_examples.py. Un confronto solo, grande, perche' la
  // qualita' delle linee si vede solo cosi'; le miniature scelgono il soggetto.
  var EX = [
    ["kelpurr", "Kelpurr"], ["cervinox", "Cervinox"],
    ["houndivolt", "Houndivolt"], ["anchorjaw", "Anchorjaw"]
  ];
  var cmp = $("cmp"), exPicks = $("ex-picks");
  cmp.innerHTML =
    '<div class="cmp-box paper">' +
      '<img class="a" alt="">' +
      '<img class="b" alt="">' +
      '<span class="cmp-side l" aria-hidden="true">Trace</span>' +
      '<span class="cmp-side r" aria-hidden="true">Picture</span>' +
      '<div class="cmp-bar"><span class="cmp-grip" tabindex="0" role="slider" ' +
        'aria-valuemin="0" aria-valuemax="100" aria-valuenow="50">' +
        '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18-6-6 6-6"/><path d="m15 6 6 6-6 6"/></svg>' +
      '</span></div>' +
    '</div>';
  var box = cmp.querySelector(".cmp-box"), grip = cmp.querySelector(".cmp-grip");
  var imA = cmp.querySelector("img.a"), imB = cmp.querySelector("img.b");
  var cmpAt = 50, cmpDown = false, exAt = -1;

  function cmpSet(p) {
    cmpAt = Math.max(0, Math.min(100, p));
    box.style.setProperty("--p", cmpAt + "%");
    box.style.setProperty("--r", (100 - cmpAt) + "%");
    grip.setAttribute("aria-valuenow", Math.round(cmpAt));
    // l'etichetta di un lato sparisce quando la linea le passa sopra
    box.classList.toggle("edge-l", cmpAt < 16);
    box.classList.toggle("edge-r", cmpAt > 84);
  }
  function cmpFrom(e) {
    var r = box.getBoundingClientRect();
    cmpSet((e.clientX - r.left) / r.width * 100);
  }
  box.addEventListener("pointerdown", function (e) {
    cmpStop();
    cmpDown = true; box.classList.add("dragging");
    box.setPointerCapture(e.pointerId); cmpFrom(e); e.preventDefault();
  });
  box.addEventListener("pointermove", function (e) { if (cmpDown) { cmpFrom(e); e.preventDefault(); } });
  function cmpUp(e) {
    if (!cmpDown) return;
    cmpDown = false;
    box.classList.remove("dragging");
    try { box.releasePointerCapture(e.pointerId); } catch (err) {}
  }
  box.addEventListener("pointerup", cmpUp);
  box.addEventListener("pointercancel", cmpUp);
  grip.addEventListener("keydown", function (e) {
    var d = e.key === "ArrowRight" ? 4 : e.key === "ArrowLeft" ? -4 : 0;
    if (!d) return;
    e.preventDefault();
    cmpStop();
    cmpSet(cmpAt + d);
  });

  // Il cambio di soggetto passa per una dissolvenza breve: le due immagini
  // nuove si mostrano solo quando sono tutte e due decodificate, insieme.
  function showEx(k) {
    if (k === exAt) return;
    exAt = k;
    var slug = EX[k][0], name = EX[k][1];
    Array.prototype.forEach.call(exPicks.children, function (b, j) {
      b.setAttribute("aria-selected", j === k ? "true" : "false");
      b.tabIndex = j === k ? 0 : -1;
    });
    grip.setAttribute("aria-label", "How much of the " + name + " trace to uncover");
    var a = new Image(), b = new Image();
    a.src = "assets/ex/" + slug + "_a.webp";
    b.src = "assets/ex/" + slug + "_b.webp";
    var both = [a, b].map(function (im) {
      return im.decode ? im.decode().catch(function () {}) : Promise.resolve();
    });
    box.classList.add("swap");
    Promise.all(both).then(function () {
      if (exAt !== k) return;
      imA.src = a.src; imA.alt = name + ", the starting image";
      imB.src = b.src; imB.alt = name + " traced: silhouette in grey, line art in black";
      box.classList.remove("swap");
    });
  }

  EX.forEach(function (e, k) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "ex-pick";
    b.setAttribute("role", "tab");
    b.innerHTML = '<span class="thumb paper"><img loading="lazy" alt="" src="assets/ex/' + e[0] +
      '_t.webp"></span><span class="n">' + e[1] + "</span>";
    b.addEventListener("click", function () { showEx(k); });
    b.addEventListener("keydown", function (ev) {
      var d = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      ev.preventDefault();
      var n = (k + d + EX.length) % EX.length;
      exPicks.children[n].focus(); showEx(n);
    });
    exPicks.appendChild(b);
  });
  cmpSet(50);
  showEx(0);

  // La prima volta che il confronto e' in vista la linea fa da sola un giro
  // breve, avanti e indietro, per dire che si trascina. Una volta sola, e si
  // ferma appena la mano la tocca.
  var cmpFrame = 0;
  function cmpStop() { cancelAnimationFrame(cmpFrame); cmpFrame = 0; }
  function cmpDemo() {
    var keys = [[0, 50], [700, 74], [1500, 30], [2200, 50]], t0 = 0;
    var ease = function (x) { return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    function step(t) {
      if (!t0) t0 = t;
      var e = t - t0, i = 1;
      while (i < keys.length - 1 && e > keys[i][0]) i++;
      var a = keys[i - 1], b = keys[i], f = Math.min(1, (e - a[0]) / (b[0] - a[0]));
      cmpSet(a[1] + (b[1] - a[1]) * ease(f));
      cmpFrame = e < keys[keys.length - 1][0] ? requestAnimationFrame(step) : 0;
    }
    cmpFrame = requestAnimationFrame(step);
  }
  if (!CALM && "IntersectionObserver" in window) {
    var cmpSeen = new IntersectionObserver(function (list) {
      if (!list[0].isIntersecting) return;
      cmpSeen.disconnect();
      setTimeout(cmpDemo, 500);
    }, { threshold: 0.6 });
    cmpSeen.observe(box);
  }

  /* ------------------------------------- come funziona: i tre stati */
  // Il passo che sta a meta' schermo decide lo stato del riquadro fermo. Solo
  // su schermo largo: stretto il riquadro non c'e' e ogni passo ha la sua immagine.
  var howFrame = $("how-frame"), howBar = $("how-bar"), howLabels = $("how-labels");
  var howSteps = document.querySelectorAll(".how-step"), howAt = 0;
  function howShow(k) {
    // dal disegno al tracciato passa lo scanner: la riga attraversa il foglio
    // insieme al taglio che scopre il tracciato
    if (k === 1 && howAt === 0 && !CALM) {
      howFrame.classList.remove("scanning");
      void howFrame.offsetWidth;                  // per far ripartire l'animazione
      howFrame.classList.add("scanning");
    }
    howAt = k;
    howFrame.setAttribute("data-step", k);
    Array.prototype.forEach.call(howSteps, function (li, j) { li.classList.toggle("on", j === k); });
    Array.prototype.forEach.call(howLabels.children, function (t, j) { t.classList.toggle("on", j <= k); });
    // il filo: dove il CSS lo lega allo scorrimento questo valore non conta
    howBar.style.setProperty("--f", [0.12, 0.55, 1][k]);
  }
  if ("IntersectionObserver" in window) {
    var howSeen = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        if (e.isIntersecting) { howShow(parseInt(e.target.getAttribute("data-k"), 10)); }
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    Array.prototype.forEach.call(howSteps, function (li) { howSeen.observe(li); });
  } else {
    Array.prototype.forEach.call(howSteps, function (li) { li.classList.add("on"); });
  }

  /* ------------------------------------------------------------ modali */
  document.querySelectorAll("[data-open]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dlg = $(b.getAttribute("data-open"));
      if (dlg && typeof dlg.showModal === "function") { dlg.showModal(); }
      else if (dlg) { dlg.setAttribute("open", ""); }
    });
  });
  document.querySelectorAll("dialog").forEach(function (dlg) {
    dlg.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { dlg.close(); });
    });
    // un link a un'ancora della pagina, cliccato dentro un modale, lo chiude:
    // se no la pagina scorre dietro e chi legge non se ne accorge
    dlg.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function () { dlg.close(); });
    });
    // clic sullo sfondo: il target e' il dialog stesso solo fuori dalla scatola
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) { dlg.close(); }
    });
  });

  /* ---------------------------------------------------------- tutorial */
  // Il giro intero su un soggetto vero, una schermata per passo. Le schermate
  // sono dell'app vera, guidata da uno script su una cartella di lavoro a parte
  // (vedi README). I segni sono in pixel dell'immagine: [x, y, larghezza,
  // altezza] per un riquadro, ["click", x, y] per un clic. Il numero del segno
  // e' la sua posizione nella lista delle note.
  //
  // Un passo con img a null resta e dice cosa manca (il testo di todo),
  // invece di sparire: serve se un giorno manca di nuovo un'immagine.
  var SHOT = [1500, 920], BOARD = [1180, 880];
  var CHAPTERS = ["Image", "Background", "Trace", "Figure", "Stand", "Print"];
  var TOUR = [
    { ch: 0, img: "library", size: SHOT,
      title: "Add the image",
      lede: "Everything starts from the library, on the left of the <b>Subject</b> page. The " +
            "picture for this tutorial is Houndivolt, an armoured beast, on a plain white " +
            "background: the kind of image you save from anywhere.",
      notes: [
        [[226, 73, 81, 42], "<b>Add</b>, at the top of the library, opens the file picker. Drawings, renders and " +
          "photos in the common image formats all go in, converted on the way if needed. The file " +
          "is copied, so the original stays where it was."],
        [[25, 119, 284, 37], "The filter narrows the list as you type. <b>Ctrl+F</b> jumps straight " +
          "into it, which matters once the library holds hundreds of subjects. " +
          "<b>Ctrl+K</b> searches more widely: subjects, steps and commands, from anywhere in the app."],
        [[17, 162, 300, 685], "The library: one row per subject, with its thumbnail. Pick a row and " +
          "it is the subject for every step that follows."],
        [[1115, 422, 352, 30], "<b>Extra Effort</b>, switched on once: it stays on for every " +
          "subject that follows. More on it in step 3."]
      ],
      tip: "<b>Best results</b>, in order: line art, then PNGs with a transparent background, " +
           "then pictures with clear edges on a plain background. Photos work too, with more " +
           "touch-up. For a soft or shaded picture, an AI image tool such as Gemini can draw a " +
           "line-art version first: ask it &ldquo;Can you give me the lineart version of this " +
           "image?&rdquo; and add the result to the library." },

    { ch: 0, img: "added", size: SHOT,
      title: "Pick it and look",
      lede: "Picking the row loads the image and traces a preview straight away. The two panels " +
            "share the same height: the right one is what the left one will become.",
      notes: [
        [[23, 260, 288, 44], "Houndivolt, now in the library and selected."],
        [[331, 109, 379, 693], "The image as it is, still on its white background."],
        [[711, 109, 380, 693], "The live preview: <b>silhouette in grey, line art in black</b>. " +
          "Every setting you change redraws it."],
        [[556, 117, 146, 34], "<b>Remove background</b> opens the cut-out window. A flat white " +
          "background would be read correctly anyway, but a real cut-out gives a cleaner edge, " +
          "and with a photo it is the step that makes the difference."]
      ],
      tip: "Images, SVGs and STLs are kept in <b>Documents\\Standee Maker</b>, not in the program " +
           "folder: uninstalling does not take your work with it." },

    { ch: 1, img: "cutout-wand", size: BOARD,
      title: "Three clicks with the wand",
      lede: "The window works on a copy of the image. The <b>wand</b> removes the connected area " +
            "of similar colour around the point you click: one click on the white, and the whole " +
            "background is marked. Almost: the white showing between the legs is not connected " +
            "to it, and each pocket takes a click of its own.",
      notes: [
        [[17, 13, 36, 36], "<b>Wand</b> (W). Beside it: <b>Box</b> (B), a rectangle drawn around the " +
          "subject that finds the background inside it on its own, which is the tool for photos; " +
          "then <b>Keep</b> (K) and <b>Remove</b> (R), two brushes that have the last word."],
        [[174, 14, 290, 34], "<b>Tolerance</b>: how far a colour may drift from the one you clicked. " +
          "Move it after the click and the click is redone with the new value, so you set it by " +
          "watching."],
        [["click", 228, 81], "The first click, on the white around the subject."],
        [["click", 692, 576], "The second, on the white between the two front legs: closed all " +
          "round, the first click could not reach it."],
        [["click", 763, 447], "The third, on the small gap behind the knee."],
        [[225, 831, 287, 30], "Red is what goes, green is what you kept by hand. The count says how " +
          "much of the picture is being removed: 64% here."]
      ],
      tip: "The wheel zooms under the pointer, the right button pans, <b>Ctrl+Z</b> undoes. A " +
           "<b>Keep</b> stroke also works as a fence: the wand does not cross it." },

    { ch: 1, img: "cutout-result", size: BOARD,
      title: "Check it, then save",
      lede: "Before saving, look at the cut-out the way it will come out.",
      notes: [
        [[565, 15, 124, 30], "<b>Show result</b> swaps the red veil for the transparency " +
          "chequerboard."],
        [[220, 72, 740, 730], "Check the edges and the closed pockets, like the ones between the " +
          "legs: the wand only takes what is connected to the click, so a pocket needs a click of " +
          "its own, and a missed one would print as a solid patch."],
        [[1062, 824, 104, 44], "Saving adds the cut-out to the library as a new image, " +
          "<b>Houndivolt_cutout</b>, next to the original, which is left exactly as it was, and " +
          "picks it for you."]
      ] },

    { ch: 2, img: "trace", size: SHOT,
      title: "Size and line source",
      lede: "After saving, <b>Houndivolt_cutout</b> is already picked and traced. The column on " +
            "the right holds the few settings you decide for every subject; everything else is " +
            "calibration, folded away under Advanced.",
      notes: [
        [[23, 308, 288, 44], "The cut-out, as a subject of its own."],
        [[1115, 153, 352, 186], "<b>Height</b> and <b>Width</b> are the size of the finished part, " +
          "150 &times; 148 mm here. Move one and the other follows: the proportions stay the " +
          "drawing&rsquo;s. <b>Line width</b> is how wide the black lines come out: below 0.8 mm " +
          "they barely print with a 0.4 mm nozzle."],
        [[1115, 387, 352, 65], "<b>Extra Effort</b> is on: it redraws a coloured picture as clean " +
          "lines first, and only then traces them. Slower, and on a drawing like this one the " +
          "lines come out steadier. <b>Line Art Mode</b> is the other switch, for black strokes on " +
          "white like a colouring page: one or the other, never both."],
        [[1117, 465, 352, 30], "<b>Advanced</b>: line detail, smoothing, and <b>Join floating " +
          "parts</b>, which keeps a print in one piece. Set once, then left alone."],
        [[1003, 117, 80, 34], "The trace is already good as it is. <b>Touch up</b> is where you " +
          "change it by hand: here a stray mark goes, and a heart goes on the neck."]
      ],
      tip: "Point at any control and the line at the bottom of the column says what it changes." },

    { ch: 2, img: "touchup-erase", size: BOARD,
      title: "Touch up: erase what is wrong",
      lede: "Touch up opens the line art on its own, large enough to work on. The sliders act on " +
            "the whole drawing at once; here you fix one line at a time.",
      notes: [
        [[17, 13, 36, 36], "<b>Erase</b> (E) removes line art under the brush."],
        [[210, 14, 374, 34], "The diameter is given in millimetres of the finished part as well as in " +
          "pixels, so you can tell how big the stroke really is."],
        [[423, 595, 32, 24], "A short dash floating on the front leg, a patch of shading read as a " +
          "line. One stroke, and it turns red: it is about to go."],
        [[225, 831, 115, 30], "A running total of what you have removed, in mm&sup2;."]
      ],
      tip: "Hold <b>Shift</b> for a straight stroke. <b>[</b> and <b>]</b> shrink and grow the " +
           "brush." },

    { ch: 2, img: "touchup-draw", size: BOARD,
      title: "Draw something new",
      lede: "On the neck, the pencil draws a heart. New ink is traced exactly like the rest of the " +
            "drawing, and prints in relief the same way.",
      notes: [
        [[53, 13, 36, 36], "<b>Draw</b> (D) adds line art where the trace missed it. The heart " +
          "is drawn at 0.9 mm, the same width as the traced lines; below 0.8 mm the readout warns " +
          "that the stroke is too thin. New ink stops at the edge of the silhouette: outside it, " +
          "it would hang in mid-air."],
        [[464, 247, 62, 58], "The heart, in green until you apply it."],
        [[89, 13, 108, 36], "The other three tools. <b>Restore</b> (R) brings back what was traced " +
          "under the brush. <b>Hollow</b> (H) cuts a closed area out of the silhouette in one " +
          "click. <b>Outline</b> (O) empties a solid black patch and keeps only its rim."],
        [[1090, 824, 76, 44], "<b>Apply</b> takes the touch-up back to the main window. Closing " +
          "without it asks first, so work is never thrown away by mistake."]
      ] },

    { ch: 2, img: "traced", size: SHOT,
      title: "Trace to SVG",
      lede: "The preview now shows the heart on the neck. <b>Trace to SVG</b> writes the two " +
            "files, silhouette and line art, with the same bounding box, so they sit exactly on " +
            "top of each other.",
      notes: [
        [[838, 361, 36, 34], "The heart, now part of the trace."],
        [[991, 117, 92, 34], "The green dot on <b>Touch up</b> says this subject carries edits " +
          "made by hand."],
        [[1104, 864, 380, 44], "<b>Trace to SVG</b>, or <b>Ctrl+Enter</b>. The big button always does " +
          "the job of the step you are on."],
        [[561, 74, 378, 103], "The notice confirms the two SVGs and goes away by itself after five " +
          "seconds. Click it to open the folder."],
        [[247, 317, 58, 26], "In the library the subject is now tagged <b>traced</b>."]
      ] },

    { ch: 3, img: "figure", size: SHOT,
      title: "Put the figure on its base",
      lede: "Switch to <b>Figure</b>. The two SVGs are extruded and mounted on a base, the strip " +
            "that joins the feet and slides into the stand. You work face-on, because the part is " +
            "an extrusion: from the front it hides nothing.",
      notes: [
        [[430, 68, 84, 28], "Step 2, <b>Figure</b>. <b>Ctrl+Tab</b> gets here from the keyboard."],
        [[526, 684, 416, 50], "The base, hatched in blue. It starts centred on the silhouette, " +
          "just inside its lowest point: here the front foot, while the hind foot on the right " +
          "barely touches it. Nudged up by 4 mm, it takes in both."],
        [[346, 122, 36, 36], "<b>Move base</b> (M): drag the base where it belongs."],
        [[1117, 417, 352, 58], "<b>Base length</b> should span the two outermost feet. Houndivolt " +
          "stands wide, and at the 85 mm it starts from the feet would stick out past the ends: " +
          "130 mm reaches them all. <b>Raise the figure</b> stays at zero, because a tall subject " +
          "already clears the card."],
        [[1105, 109, 378, 240], "The drawing to scale answers what the numbers leave out: <b>how " +
          "much of the figure stands above the card</b> in its toploader. 55 mm here."],
        [[1117, 525, 352, 30], "<b>Advanced</b>: how thick the silhouette and the line art come " +
          "out, and <b>Base height</b>, 10 mm inside the slot plus what stays in sight."]
      ],
      tip: "Everything above the base stays as it is: the base goes up, the figure does not move." },

    { ch: 3, img: "figure-cut", size: SHOT,
      title: "Cut below the base",
      lede: "With the base higher, the front foot now pokes out underneath: it would print as a " +
            "loose bit sticking out under the stand. One button takes it away.",
      notes: [
        [[343, 803, 138, 34], "<b>Cut below the base</b> removes everything underneath, except a " +
          "4 mm overlap: that is what welds figure and base into one solid instead of two pieces " +
          "that only touch."],
        [[526, 684, 416, 50], "Nothing hangs below the base any more."],
        [[860, 807, 109, 26], "How much was removed: 77 mm&sup2;. The base itself stays whole."]
      ],
      tip: "For anything that is not a straight cut, a shadow or a stray mark, use <b>Erase</b> " +
           "(E) and <b>Restore</b> (R) on this same view." },

    { ch: 3, img: "figure-written", size: SHOT,
      title: "Write the figure STL",
      lede: "The figure comes out as a single STL, already assembled: the silhouette, the line art " +
            "standing 2.5 mm proud of it, and the base welded underneath.",
      notes: [
        [[1104, 864, 380, 44], "<b>Generate figure STL</b>, or <b>Ctrl+Enter</b>."],
        [[561, 74, 378, 103], "<b>Houndivolt_cutout.stl is ready to print.</b> Click the notice to " +
          "open its folder."],
        [[1105, 680, 378, 54], "Every subject gets a folder of its own, and the stand made for it " +
          "lands in the same one. The gear at the top lets you choose where models go."],
        [[1117, 482, 352, 30], "<b>Multicolor printing</b>, off unless you switch it on: two .3mf " +
          "files come out as well, with the line art as a second part. Open <b>_Bambu-Orca</b> in " +
          "Bambu Studio or OrcaSlicer, <b>_Prusa</b> in PrusaSlicer. With a single nozzle, Output " +
          "then shows the height at which to change filament."],
        [[948, 806, 129, 28], "The size of the part: 150 &times; 154 &times; 10 mm, base included."],
        [[253, 317, 52, 26], "In the library the tag moves on from <b>traced</b> to " +
          "<b>ready</b>: the figure is ready to print."]
      ] },

    { ch: 4, img: "stand", size: SHOT,
      title: "The stand",
      lede: "The <b>Stand</b> page makes the block the figure slides into, next to the card. It is " +
            "not tied to a picture: it is built from the slot widths of the figure and the card.",
      notes: [
        [[751, 14, 73, 32], "The <b>Stand</b> page, in the switch at the top of the window."],
        [[1111, 105, 352, 36], "<b>Remove toploader slot</b> is for a figure printed on its own: " +
          "the stand keeps only the figure slot, and the card settings disappear."],
        [[1111, 141, 352, 62], "<b>Card slot</b>: how wide the toploader slot is. A card in a " +
          "rigid toploader is 77 mm across."],
        [[1111, 210, 352, 106], "<b>Figure slot</b>: pick the figure this stand is for. The list " +
          "starts empty on purpose, and the slot comes out 1 mm longer than that figure&rsquo;s " +
          "base: 131 mm here."],
        [[1111, 320, 352, 36], "<b>Raise the figure</b>: the same setting as on the Figure page, " +
          "off here. On, it cuts the figure slot on a raised plateau behind the card."],
        [[1111, 398, 352, 92], "Width, depth and height are not set by hand: they follow from the " +
          "two slots. The long base makes this stand 135 mm wide."],
        [[21, 77, 1062, 703], "The stand in 3D. Drag to turn it, use the wheel to zoom."]
      ] },

    { ch: 4, img: "stand-written", size: SHOT,
      title: "Write the stand STL",
      lede: "One more button, and both parts are ready.",
      notes: [
        [[1104, 864, 380, 44], "<b>Generate stand STL</b>."],
        [[561, 74, 378, 103], "<b>Stand_base130.stl</b>: the name carries the base length, so a " +
          "stand and a figure that do not match show at a glance."],
        [[1101, 650, 378, 64], "The same folder as the figure: <b>Houndivolt_cutout</b> now holds " +
          "both parts to print."]
      ] },

    // Le due foto del pezzo vero arrivano quando Houndivolt sara' stampato:
    // fino ad allora il passo resta e dice cosa manca (img a null, vedi sotto).
    // Per metterle: WebP, lato lungo 1500 px, senza metadati (una foto del
    // telefono si porta dietro modello e posizione GPS), e la misura in `size`.
    { ch: 5, img: null, size: [1125, 1500],
      todo: "Photo coming soon: Houndivolt and its stand on the print bed",
      title: "On the print bed",
      lede: "Open the two STLs in your slicer like any other model: nothing to scale, align or " +
            "join, because they come out at their real size and already in one piece each. " +
            "The figure lies flat with the line art on top, the stand stands on its bottom, and " +
            "they print side by side.",
      notes: [] },

    { ch: 5, img: null, size: [1125, 1500],
      todo: "Photo coming soon: the printed Houndivolt, standing next to its card",
      title: "Printed and assembled",
      lede: "The base of the figure slides into the slot at the back, and the card in its " +
            "toploader goes into the slot in front of it. The line art stands out in relief, so " +
            "it doubles as a guide if you paint the piece by hand.",
      notes: [] }
  ];

  // Un passo senza immagine (le foto del pezzo stampato non ci sono ancora)
  // non va in pubblico: un segnaposto su una pagina che vende sembra lavoro
  // lasciato a meta'. Torna da solo quando `img` ha il nome del file. Via
  // anche i capitoli rimasti senza passi, che sono in fondo.
  TOUR = TOUR.filter(function (s) { return s.img; });
  while (CHAPTERS.length && !TOUR.some(function (s) { return s.ch === CHAPTERS.length - 1; })) {
    CHAPTERS.pop();
  }

  var tour = $("dlg-tour");
  var tv = {
    sub: $("tour-sub"), bar: $("tour-bar"), stage: $("tour-stage"), shot: $("tour-shot"),
    img: $("tour-img"), svg: $("tour-svg"), todo: $("tour-todo"), text: $("tour-text"),
    kicker: $("tour-kicker"), title: $("tour-title"), lede: $("tour-lede"), notes: $("tour-notes"),
    tip: $("tour-tip"), prev: $("tour-prev"), next: $("tour-next"), nextLabel: $("tour-next-label"),
    count: $("tour-count")
  };
  var NS = "http://www.w3.org/2000/svg";
  var at = 0, lit = null, pinned = null;

  // Come TURN_V: i riquadri di TOUR sono in pixel delle schermate, e una
  // schermata vecchia ancora nella cache sotto i riquadri nuovi li mette nel
  // posto sbagliato. Si alza a ogni `make_tutorial.py`.
  var TOUR_V = "?v=14";
  function src(step) { return step.img ? "assets/tutorial/" + step.img + ".webp" + TOUR_V : null; }

  // la barra dei capitoli: un segmento per passo, e il capitolo si preme
  var ticks = [];
  CHAPTERS.forEach(function (name, c) {
    var first = -1, b = document.createElement("button");
    b.type = "button";
    b.className = "tour-chap";
    b.innerHTML = '<span class="l">' + name + '</span><span class="ticks"></span>';
    TOUR.forEach(function (s, i) {
      if (s.ch !== c) return;
      if (first < 0) first = i;
      ticks[i] = b.lastChild.appendChild(document.createElement("i"));
    });
    b.setAttribute("aria-label", "Chapter " + (c + 1) + ": " + name);
    b.addEventListener("click", function () { show(first); });
    tv.bar.appendChild(b);
  });
  tv.bar.style.setProperty("--chapters", CHAPTERS.length);

  // La schermata sta intera nel palco: la misura la si calcola, perche' i
  // segni sopra devono restare incollati all'immagine a qualunque grandezza.
  function fit() {
    var size = TOUR[at].size, ar = size[0] / size[1];
    var cs = getComputedStyle(tv.stage);
    var w = tv.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = tv.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var stacked = getComputedStyle(tv.stage.parentNode).flexDirection === "column";
    if (!stacked && w / h > ar) { w = h * ar; }
    // Impilato (il telefono), la schermata sta ferma in alto e sotto scorre
    // solo il testo: il palco e' largo quanto lo schermo e alto quanto serve.
    // Non piu' di due quinti dell'altezza, perche' al testo resti spazio per
    // leggere; una foto verticale si stringe in larghezza invece di crescere.
    if (stacked) { w = Math.min(w, window.innerHeight * 0.4 * ar); }
    tv.shot.style.width = Math.floor(w) + "px";
    tv.shot.style.height = Math.floor(w / ar) + "px";
    draw();
  }

  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    for (var k in attrs) { n.setAttribute(k, attrs[k]); }
    if (parent) { parent.appendChild(n); }
    return n;
  }

  // I segni si ridisegnano a ogni cambio di misura: il velo, i riquadri e i
  // numeri hanno spessori in pixel di schermo, non di schermata.
  function draw() {
    var step = TOUR[at], svg = tv.svg;
    var W = step.size[0], H = step.size[1];
    var u = W / (tv.shot.clientWidth || W);          // pixel di schermata per pixel di schermo
    while (svg.firstChild) { svg.removeChild(svg.firstChild); }
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    if (!step.img || !step.notes.length) { return; }

    var active = pinned || lit;
    var mask = el("mask", { id: "tour-holes" }, el("defs", {}, svg));
    el("rect", { width: W, height: H, fill: "white" }, mask);
    var pad = 5 * u;
    step.notes.forEach(function (note, i) {
      if (active && active !== i + 1) return;
      var m = note[0];
      if (m[0] === "click") {
        el("circle", { cx: m[1], cy: m[2], r: 22 * u, fill: "black" }, mask);
      } else {
        el("rect", { x: m[0] - pad, y: m[1] - pad, width: m[2] + 2 * pad, height: m[3] + 2 * pad,
                     rx: 3 * u, fill: "black" }, mask);
      }
    });
    el("rect", { "class": "tour-dim", width: W, height: H, mask: "url(#tour-holes)" }, svg);

    var r = 11.5 * u, badges = [];
    step.notes.forEach(function (note, i) {
      var n = i + 1, m = note[0], bx, by;
      var g = el("g", { "class": "tour-mark" + (active && active !== n ? " off" : ""), "data-n": n }, svg);
      if (m[0] === "click") {
        el("circle", { "class": "tour-halo", cx: m[1], cy: m[2], r: 16 * u }, g);
        el("circle", { "class": "tour-ring", cx: m[1], cy: m[2], r: 16 * u }, g);
        el("circle", { "class": "tour-pulse", cx: m[1], cy: m[2], r: 16 * u }, g);
        bx = m[1] + 30 * u; by = m[2] + 22 * u;
      } else {
        var x = m[0] - pad, y = m[1] - pad, w = m[2] + 2 * pad, h = m[3] + 2 * pad;
        el("rect", { "class": "tour-halo", x: x, y: y, width: w, height: h, rx: 3 * u }, g);
        el("rect", { "class": "tour-ring", x: x, y: y, width: w, height: h, rx: 3 * u }, g);
        // il numero sull'angolo in alto a sinistra, spinto dentro se esce dall'immagine
        bx = Math.max(r + 2 * u, Math.min(W - r - 2 * u, x));
        by = Math.max(r + 2 * u, Math.min(H - r - 2 * u, y));
      }
      badges.push([g, bx, by]);
      g.addEventListener("click", function () { pin(n, true); });
    });
    // i numeri dopo tutti i riquadri: un riquadro vicino non deve coprirli
    badges.forEach(function (b, i) {
      var badge = el("g", { "class": "tour-badge" + (active && active !== i + 1 ? " off" : "") }, svg);
      el("circle", { cx: b[1], cy: b[2], r: r }, badge);
      el("text", { x: b[1], y: b[2] + 0.5 * u, "font-size": 12 * u }, badge).textContent = i + 1;
      badge.addEventListener("click", function () { pin(i + 1, true); });
    });
  }

  function light(n) {
    lit = n;
    Array.prototype.forEach.call(tv.notes.children, function (li, i) {
      li.firstChild.classList.toggle("on", (pinned || lit) === i + 1);
    });
    draw();
  }
  function pin(n, reveal) {
    pinned = pinned === n ? null : n;
    light(lit);
    if (reveal && pinned) {
      var li = tv.notes.children[n - 1];
      if (li) { li.scrollIntoView({ block: "nearest", behavior: "smooth" }); }
    }
  }

  function show(i) {
    at = Math.max(0, Math.min(TOUR.length - 1, i));
    lit = pinned = null;
    var step = TOUR[at], url = src(step);

    // Il numero del passo e' quello del capitolo: le schermate dentro lo stesso
    // capitolo sono momenti dello stesso passo, non passi in piu'.
    var label = CHAPTERS[step.ch];
    tv.sub.textContent = "Step " + (step.ch + 1) + " of " + CHAPTERS.length + ": " + CHAPTERS[step.ch];
    tv.count.textContent = (step.ch + 1) + " / " + CHAPTERS.length;
    ticks.forEach(function (t, j) {
      t.className = j < at ? "done" : j === at ? "now" : "";
    });
    Array.prototype.forEach.call(tv.bar.children, function (b, c) {
      b.setAttribute("aria-current", c === step.ch ? "true" : "false");
    });

    tv.kicker.textContent = label;
    tv.title.innerHTML = step.title;
    tv.lede.innerHTML = step.lede;
    tv.notes.innerHTML = "";
    step.notes.forEach(function (note, j) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button";
      b.className = "tour-note";
      b.innerHTML = '<span class="k">' + (j + 1) + "</span><span>" + note[1] + "</span>";
      b.addEventListener("mouseenter", function () { light(j + 1); });
      b.addEventListener("mouseleave", function () { light(null); });
      b.addEventListener("focus", function () { light(j + 1); });
      b.addEventListener("blur", function () { light(null); });
      b.addEventListener("click", function () { pin(j + 1, false); });
      li.appendChild(b);
      tv.notes.appendChild(li);
    });
    tv.tip.hidden = !step.tip;
    tv.tip.innerHTML = step.tip || "";
    tv.text.scrollTop = 0;
    tv.text.classList.remove("enter");
    void tv.text.offsetWidth;
    tv.text.classList.add("enter");

    if (url) {
      tv.todo.hidden = true;
      tv.img.hidden = false;
      if (tv.img.getAttribute("src") !== url) {
        tv.img.classList.add("loading");
        tv.img.onload = function () { tv.img.classList.remove("loading"); };
        tv.img.src = url;
      }
      tv.img.alt = step.title;
    } else {
      tv.img.hidden = true;
      tv.img.removeAttribute("src");
      tv.todo.hidden = false;
      tv.todo.textContent = step.todo;
    }

    tv.prev.disabled = at === 0;
    tv.nextLabel.textContent = at === TOUR.length - 1 ? "Try it yourself" : "Next";
    fit();
    // la prossima e la precedente si scaricano adesso, cosi' il passo non lampeggia
    [at + 1, at - 1].forEach(function (j) {
      var s = TOUR[j];
      if (s && s.img) { new Image().src = src(s); }
    });
  }

  tv.prev.addEventListener("click", function () { show(at - 1); });
  tv.next.addEventListener("click", function () {
    if (at < TOUR.length - 1) { show(at + 1); return; }
    tour.close();                          // l'ultimo passo porta alla prova
    var trial = $("dlg-trial");
    if (trial && typeof trial.showModal === "function") { trial.showModal(); }
  });
  tour.addEventListener("keydown", function (e) {
    var to = e.key === "ArrowRight" || e.key === "PageDown" ? at + 1
           : e.key === "ArrowLeft" || e.key === "PageUp" ? at - 1
           : e.key === "Home" ? 0 : e.key === "End" ? TOUR.length - 1 : null;
    if (to === null) return;
    e.preventDefault();
    show(to);
  });
  if (typeof ResizeObserver === "function") {
    new ResizeObserver(function () { if (tour.open) { fit(); } }).observe(tv.stage);
  } else {
    window.addEventListener("resize", function () { if (tour.open) { fit(); } });
  }

  document.querySelectorAll("[data-tour]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (typeof tour.showModal === "function") { tour.showModal(); }
      else { tour.setAttribute("open", ""); }
      show(parseInt(b.getAttribute("data-tour"), 10) || 0);
      tv.next.focus();
    });
  });

  /* ------------------------------------------------- prova: il download */
  var dl = $("trial-dl"), dlMeta = $("trial-meta");
  if (SITE.trial.url) {
    dl.href = SITE.trial.url;
    dl.removeAttribute("aria-disabled");
    dl.setAttribute("download", "");
    dlMeta.textContent = "Windows installer (.exe), " + (SITE.trial.size || "64-bit");
    // L'impronta sta in una sezione chiusa ("If you want to be sure"), per chi
    // vuole controllare: non in vista, dove spaventa chi non sa cos'e'.
    if (SITE.trial.sha256) {
      $("trial-sha").textContent = SITE.trial.sha256;
      $("trial-sure").hidden = false;
    }
  } else {
    dlMeta.textContent = "The download is not available yet.";
    dl.addEventListener("click", function (e) { e.preventDefault(); });
  }
  // #download apre subito questa finestra: e' l'indirizzo a cui l'app manda
  // chi ha visto l'avviso di una versione nuova (vedi updates.py). Deve
  // continuare a esistere, come #tutorial e #pricing.
  var trialDlg = $("dlg-trial");
  if (location.hash === "#download" && trialDlg && typeof trialDlg.showModal === "function") {
    trialDlg.showModal();
  }

  /* ------------------------------------------------ le cose che entrano */
  // I titoli con data-split entrano parola per parola: ogni parola va nel suo
  // <span class="w">, con il suo numero d'ordine per il ritardo. Gli elementi
  // dentro il titolo (la seconda frase in grigio) restano dove sono, e le loro
  // parole continuano la numerazione. Lo screen reader legge il testo intero.
  function split(el) {
    var n = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 1) { walk(c); return; }
        if (c.nodeType !== 3 || !c.nodeValue.trim()) return;
        var frag = document.createDocumentFragment();
        c.nodeValue.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          var w = document.createElement("span");
          w.className = "w";
          w.style.setProperty("--i", n++);
          w.textContent = part;
          frag.appendChild(w);
        });
        node.replaceChild(frag, c);
      });
    })(el);
  }
  document.querySelectorAll("[data-split]").forEach(split);

  // La hero entra subito (quando i caratteri sono pronti, per non far
  // entrare una parola nel font di ripiego); il resto quando arriva in vista.
  var hero = document.querySelector(".hero");
  function heroIn() {
    // arrivati qui lo script ha girato tutto: la rete in testa alla pagina
    // (.late dopo tre secondi) non serve piu'
    clearTimeout(window.lateTimer);
    root.classList.add("ready");
    hero.querySelectorAll("[data-reveal], [data-split]").forEach(function (el) { el.classList.add("in"); });
  }
  var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (ok) { setTimeout(ok, 700); })]).then(function () {
    // un giro di pausa perche' il browser disegni lo stato di partenza: senza,
    // le transizioni partirebbero gia' arrivate
    setTimeout(heroIn, 30);
  });

  var later = Array.prototype.filter.call(document.querySelectorAll("main [data-reveal], main [data-split]"),
    function (el) { return !hero.contains(el); });
  if ("IntersectionObserver" in window && !CALM) {
    var seen = new IntersectionObserver(function (list) {
      list.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); seen.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -9% 0px", threshold: 0.01 });
    later.forEach(function (el) { seen.observe(el); });
  } else {
    later.forEach(function (el) { el.classList.add("in"); });
  }

  /* --------------------------------------------- la barra e le sezioni */
  // Appena la pagina scorre la barra diventa una pillola di vetro; il segno
  // sotto le voci sta sulla sezione che occupa il centro dello schermo.
  var nav = document.querySelector(".topnav"), navInd = document.querySelector(".nav-ind");
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll("a")) : [];
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (list) {
      root.classList.toggle("scrolled", !list[0].isIntersecting);
    }).observe(document.querySelector(".sentinel"));

    var live = {};
    function mark() {
      var cur = null;
      navLinks.forEach(function (a) {
        var on = !!live[a.getAttribute("href").slice(1)] && !cur;
        if (on) cur = a;
        a.setAttribute("aria-current", on ? "true" : "false");
      });
      if (!navInd) return;
      navInd.classList.toggle("on", !!cur);
      if (cur) {
        navInd.style.setProperty("--x", cur.offsetLeft + "px");
        navInd.style.setProperty("--w", cur.offsetWidth + "px");
      }
    }
    var spy = new IntersectionObserver(function (list) {
      list.forEach(function (e) { live[e.target.id] = e.isIntersecting; });
      mark();
    }, { rootMargin: "-45% 0px -50% 0px" });
    navLinks.forEach(function (a) {
      var sec = document.getElementById(a.getAttribute("href").slice(1));
      if (sec) spy.observe(sec);
    });
  }

  // Sui prezzi la luce segue il puntatore: sul fondo e sul bordo delle due
  // card insieme, ognuna misurata sulla propria posizione.
  var plans = document.querySelector(".plans");
  if (plans && !CALM && window.matchMedia && matchMedia("(hover: hover)").matches) {
    var cards = plans.querySelectorAll(".plan");
    plans.addEventListener("pointermove", function (e) {
      Array.prototype.forEach.call(cards, function (c) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", (e.clientX - r.left) + "px");
        c.style.setProperty("--my", (e.clientY - r.top) + "px");
      });
    });
  }

  /* -------------------------------------------------- statistiche (Beta) */
  // GoatCounter conta le visite aggregate: niente cookie, niente archivio
  // locale, e il suo gestore non conserva ne' l'indirizzo IP ne' lo
  // User-Agent (https://www.goatcounter.com/privacy). Non parte per chi ha
  // chiesto di non essere tracciato (Do Not Track o Global Privacy Control),
  // ne' dalla macchina di chi sviluppa. I click che interessano (apertura del
  // download, download, lista di lancio, tutorial, Patreon) si segnano con gli attributi
  // data-goatcounter-click, che vanno messi PRIMA di caricare lo script.
  if (SITE.stats && !location.hostname.match(/^(localhost|127\.|\[::1\])/) &&
      navigator.doNotTrack !== "1" && !navigator.globalPrivacyControl) {
    var tag = function (sel, name) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.setAttribute("data-goatcounter-click", name);
      });
    };
    tag('[data-open="dlg-trial"]', "open-download");
    tag("#trial-dl", "download");
    tag('a[href^="mailto:"][href*="launch"]', "join-launch-list");
    tag("[data-tour]", "watch-tutorial");
    tag('a[href*="patreon.com"]', "patreon");
    var gc = document.createElement("script");
    gc.async = true;
    gc.src = "//gc.zgo.at/count.js";
    gc.setAttribute("data-goatcounter", "https://" + SITE.stats + ".goatcounter.com/count");
    document.head.appendChild(gc);
  }

  /* ---------------------------------------------- segnaposto ancora vivi */
  document.querySelectorAll("a.todo[href='#']").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); });
  });
})();
