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
    version: "1.0.0",
    trial: {
      // TODO rilascio: URL del setup firmato, dimensione e impronta
      url: null,                    // es. "https://.../Standee Maker Setup 1.0.0.exe"
      size: null,                   // es. "48 MB"
      sha256: null                  // es. "9f2c..."
    },
    buy: {
      // TODO rilascio: i due checkout Polar (vedi license.py)
      pro: null,                    // es. "https://.../checkout/buy/..."
      commercial: null,
      vendor: "Polar"               // Polar Software, Inc.: il merchant of record
    },
    prices: { pro: "19.99", commercial: "99.99" }
  };

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------------------------------------------------- la catena */
  var CAPS = [
    ["Chopper_cutout", "image &middot; 604 &times; 799 px"],
    ["Chopper_cutout_silhouette.svg  +  _lineart.svg", "112 &times; 150 mm"],
    ["Chopper_cutout.stl  +  Stand_base85.stl", "31,108 + 188 triangles"]
  ];
  var cap = $("cap");
  var steps = [0, 1, 2].map(function (i) { return $("s" + i); });
  var layers = [0, 1, 2].map(function (i) { return $("h" + i); });

  function showStep(i) {
    steps.forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
    layers.forEach(function (im, j) { im.classList.toggle("on", j === i); });
    cap.innerHTML = "<b>" + CAPS[i][0] + "</b><span>" + CAPS[i][1] + "</span>";
  }
  steps.forEach(function (b, i) {
    b.addEventListener("click", function () { showStep(i); });
    b.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1
            : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = (i + d + steps.length) % steps.length;
      steps[n].focus(); showStep(n);
    });
  });
  showStep(0);

  /* ------------------------------------------- il pezzo: girarlo a mano */
  // Trenta viste del pezzo, una ogni 12 gradi. Si gira trascinando, con lo
  // scorrimento orizzontale (touchpad, o Shift+rotella) e con le frecce. Lo
  // scorrimento verticale resta della pagina: chi scorre non deve trovarsi a
  // girare il pezzo invece di andare avanti.
  var TURN_N = 30, TURN_PX = 14;             // pixel di trascinamento per vista
  // Le trenta viste hanno sempre lo stesso nome, ma il browser ne tiene una
  // copia buona dieci minuti: rifattele, la prima (che sta nella pagina) si
  // riscarica e le altre no, e il pezzo cambiava aspetto girandolo. Questo
  // numero si alza a ogni `make_turn.py`, e la copia vecchia non viene piu'
  // chiesta. Va tenuto uguale al `?v=` dell'immagine nella pagina.
  var TURN_V = "?v=2";
  var turnBox = $("h2"), turnImg = $("turn-img"), turnTag = $("turn-tag");
  var turnSrc = function (i) { return "assets/turn/t" + (i < 10 ? "0" : "") + i + ".webp" + TURN_V; };
  var turnAt = 0, turnAcc = 0, turnDrag = null, turnLoaded = false;

  function turnLoad() {                      // le viste si scaricano la prima volta che servono
    if (turnLoaded) return;
    turnLoaded = true;
    for (var i = 1; i < TURN_N; i++) { new Image().src = turnSrc(i); }
  }
  function turnTo(i) {
    turnAt = ((Math.round(i) % TURN_N) + TURN_N) % TURN_N;
    turnImg.src = turnSrc(turnAt);
    turnBox.setAttribute("aria-valuenow", turnAt);
    turnTag.classList.add("gone");
  }
  function turnBy(px) {
    turnAcc += px;
    var steps = Math.trunc(turnAcc / TURN_PX);
    if (steps) { turnAcc -= steps * TURN_PX; turnTo(turnAt - steps); }
  }
  steps[2].addEventListener("click", turnLoad);
  turnBox.addEventListener("pointerenter", turnLoad);
  turnBox.addEventListener("pointerdown", function (e) {
    turnLoad();
    turnDrag = e.clientX;
    turnBox.setPointerCapture(e.pointerId);
    turnBox.classList.add("grabbing");
    e.preventDefault();
  });
  turnBox.addEventListener("pointermove", function (e) {
    if (turnDrag === null) return;
    turnBy(e.clientX - turnDrag);
    turnDrag = e.clientX;
  });
  function turnUp(e) {
    if (turnDrag === null) return;
    turnDrag = null;
    turnBox.classList.remove("grabbing");
    try { turnBox.releasePointerCapture(e.pointerId); } catch (err) {}
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

  /* --------------------------------------------------------- schermate */
  // La prima e' anche scritta nella pagina: chi arriva col JavaScript spento
  // deve leggerla lo stesso. Le due devono restare uguali.
  var NOTES = [
    "The image on the left, what comes out of it on the right, at the same height.",
    "You work face-on, in 2D, and that is not a simplification: the part is an extrusion, so seen from the front it hides nothing. The little drawing at the top right answers what the numbers leave out, <b>how much of the figure stands above the card</b>: 61 mm here.",
    "Two measurements: how wide the toploader slot is, and which figure this stand is for. A switch drops the toploader slot, for a figure that stands on its own. The dropdown <b>starts empty</b> on purpose: a stand is printed for one figure, and a choice the app makes on your behalf is a choice nobody re-reads."
  ];
  var unote = $("unote");
  var tabs = [0, 1, 2].map(function (i) { return $("p" + i); });
  var shots = [0, 1, 2].map(function (i) { return $("u" + i); });

  function showPage(i) {
    tabs.forEach(function (b, j) { b.setAttribute("aria-selected", j === i ? "true" : "false"); });
    shots.forEach(function (im, j) { im.classList.toggle("on", j === i); });
    unote.innerHTML = NOTES[i];
  }
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
  var EX = [
    ["charizard", "Charizard"], ["gengar", "Gengar"], ["ninetales", "Ninetales"],
    ["absol", "Absol"], ["lucario", "Lucario"], ["gardevoir", "Gardevoir"],
    ["zoroark", "Zoroark"], ["umbreon", "Umbreon"], ["scizor", "Scizor"],
    ["tyranitar", "Tyranitar"], ["infernape", "Infernape"], ["decidueye", "Decidueye"]
  ];
  var grid = $("grid");

  function compare(slug, name, hidden) {
    var fig = document.createElement("figure");
    fig.className = "cmp" + (hidden ? " hidden-row" : "");
    fig.innerHTML =
      '<div class="cmp-box">' +
        '<img loading="lazy" src="assets/ex/' + slug + '_a.webp" alt="' + name + ', the starting image">' +
        '<img loading="lazy" class="b" src="assets/ex/' + slug + '_b.webp" alt="' + name + ' traced: silhouette in grey, line art in black">' +
        '<div class="cmp-tag l">image</div><div class="cmp-tag r">trace</div>' +
        '<div class="cmp-bar"><span class="cmp-grip" tabindex="0" role="slider" ' +
          'aria-label="How much of the ' + name + ' trace to uncover" ' +
          'aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></span></div>' +
      '</div><figcaption>' + name + '</figcaption>';

    var box = fig.querySelector(".cmp-box"), grip = fig.querySelector(".cmp-grip");
    var at = 50, down = false;

    function set(p) {
      at = Math.max(0, Math.min(100, p));
      box.style.setProperty("--p", at + "%");
      box.style.setProperty("--r", (100 - at) + "%");
      grip.setAttribute("aria-valuenow", Math.round(at));
    }
    function from(e) {
      var r = box.getBoundingClientRect();
      set((e.clientX - r.left) / r.width * 100);
    }
    box.addEventListener("pointerdown", function (e) {
      down = true; box.setPointerCapture(e.pointerId); from(e); e.preventDefault();
    });
    box.addEventListener("pointermove", function (e) { if (down) { from(e); e.preventDefault(); } });
    function up(e) {
      if (!down) return;
      down = false;
      try { box.releasePointerCapture(e.pointerId); } catch (err) {}
    }
    box.addEventListener("pointerup", up);
    box.addEventListener("pointercancel", up);
    grip.addEventListener("keydown", function (e) {
      var d = e.key === "ArrowRight" ? 4 : e.key === "ArrowLeft" ? -4 : 0;
      if (!d) return;
      e.preventDefault();
      set(at + d);
    });
    set(50);
    return fig;
  }

  // Quattro in vista, una riga sola: gli altri otto li chiede chi vuole vederli.
  var SHOWN = 4;
  EX.forEach(function (e, i) { grid.appendChild(compare(e[0], e[1], i >= SHOWN)); });
  $("more").addEventListener("click", function () {
    grid.classList.add("all");
    this.remove();
  });

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
            "picture for this tutorial is a Squirtle on a plain white background: the kind of " +
            "image you save from anywhere.",
      notes: [
        [[1367, 64, 113, 35], "<b>Add image&hellip;</b> opens the file picker. Drawings, renders and " +
          "photos in the common image formats all go in, converted on the way if needed. The file " +
          "is copied, so the original stays where it was."],
        [[20, 64, 1335, 34], "The filter narrows the list as you type. <b>Ctrl+F</b> jumps straight " +
          "into it, which matters once the library holds hundreds of subjects."],
        [[21, 117, 335, 714], "The library: one row per subject, with its thumbnail. Pick a row and " +
          "it is the subject for every step that follows."]
      ],
      tip: "Images, SVGs and STLs are kept in <b>Documents\\Standee Maker</b>, not in the program " +
           "folder: uninstalling does not take your work with it." },

    { ch: 0, img: "added", size: SHOT,
      title: "Pick it and look",
      lede: "Picking the row loads the image and traces a preview straight away, before you have " +
            "touched a single setting. The two panels share the same height: the right one is " +
            "what the left one will become.",
      notes: [
        [[21, 514, 335, 44], "Squirtle, now in the library and selected."],
        [[373, 159, 355, 630], "The image as it is, still on its white background."],
        [[729, 159, 355, 630], "The live preview: <b>silhouette in grey, line art in black</b>. " +
          "Every setting you change redraws it."],
        [[587, 169, 131, 33], "<b>Remove background</b> opens the cut-out window. A flat white " +
          "background would be read correctly anyway, but a real cut-out gives a cleaner edge, " +
          "and with a photo it is the step that makes the difference."]
      ] },

    { ch: 1, img: "cutout-wand", size: BOARD,
      title: "One click with the wand",
      lede: "The window works on a copy of the image. The <b>wand</b> removes the connected area " +
            "of similar colour around the point you click: one click on the white, and the whole " +
            "background is marked.",
      notes: [
        [[15, 11, 39, 33], "<b>Wand</b> (W). Beside it: <b>Box</b> (B), a rectangle drawn around the " +
          "subject that finds the background inside it on its own, which is the tool for photos; " +
          "then <b>Keep</b> (K) and <b>Remove</b> (R), two brushes that have the last word."],
        [[186, 12, 290, 30], "<b>Tolerance</b>: how far a colour may drift from the one you clicked. " +
          "Move it after the click and the click is redone with the new value, so you set it by " +
          "watching."],
        [["click", 236, 78], "The single click, on the white."],
        [[268, 832, 270, 24], "Red is what goes, green is what you kept by hand. The count says how " +
          "much of the picture is being removed: 70% here."]
      ],
      tip: "The wheel zooms under the pointer, the right button pans, <b>Ctrl+Z</b> undoes. A " +
           "<b>Keep</b> stroke also works as a fence: the wand does not cross it." },

    { ch: 1, img: "cutout-result", size: BOARD,
      title: "Check it, then save",
      lede: "Before saving, look at the cut-out the way it will come out.",
      notes: [
        [[572, 15, 94, 26], "<b>Show result</b> swaps the red veil for the transparency " +
          "chequerboard."],
        [[225, 66, 730, 730], "Check the edges and the closed pockets, like a gap between an arm " +
          "and the body: the wand only takes what is connected to the click, so a pocket needs a " +
          "click of its own."],
        [[1021, 822, 145, 45], "Saving adds the cut-out to the library as a new image, " +
          "<b>Squirtle_cutout</b>, next to the original, which is left exactly as it was, and " +
          "picks it for you."]
      ] },

    { ch: 2, img: "trace", size: SHOT,
      title: "Size and line source",
      lede: "After saving, <b>Squirtle_cutout</b> is already picked and traced. The column on the " +
            "right holds the few settings you decide for every subject; everything else is " +
            "calibration, folded away under Advanced.",
      notes: [
        [[21, 558, 335, 44], "The cut-out, as a subject of its own."],
        [[1108, 208, 362, 164], "<b>Height</b> and <b>Width</b> are the size of the finished part, " +
          "150 &times; 145 mm here. Move one and the other follows: the proportions stay the " +
          "drawing&rsquo;s. <b>Line width</b> is how wide the black lines come out: below 0.8 mm " +
          "they barely print with a 0.4 mm nozzle."],
        [[1108, 422, 362, 64], "Squirtle needs neither switch: the lines already drawn in the art " +
          "are followed as they are. <b>Line Art Mode</b> is for black strokes on white, like a " +
          "colouring page. <b>Extra Effort</b> redraws a coloured picture as clean lines first: " +
          "slower, and worth a try when lines go missing."],
        [[1108, 502, 362, 26], "<b>Advanced</b>: line detail, smoothing, and <b>Join floating " +
          "parts</b>, which keeps a print in one piece. Set once, then left alone."],
        [[1000, 169, 73, 33], "The trace is already good as it is. <b>Touch up</b> is where you " +
          "change it by hand: here the lines in the middle of the shell will make room for a " +
          "heart."]
      ],
      tip: "Point at any control and the line at the bottom of the column says what it changes." },

    { ch: 2, img: "touchup-erase", size: BOARD,
      title: "Touch up: erase what is wrong",
      lede: "Touch up opens the line art on its own, large enough to work on. The sliders act on " +
            "the whole drawing at once; here you fix one line at a time.",
      notes: [
        [[15, 11, 39, 33], "<b>Erase</b> (E) removes line art under the brush."],
        [[225, 12, 370, 30], "The diameter is given in millimetres of the finished part, not just " +
          "in pixels: you can tell how big the stroke really is."],
        [[392, 425, 186, 215], "Two strokes along the cross in the middle of the shell, and the " +
          "four plates become one. What is about to go turns red."],
        [[268, 832, 124, 24], "A running total of what you have removed, in mm&sup2;."]
      ],
      tip: "Hold <b>Shift</b> for a straight stroke. <b>[</b> and <b>]</b> shrink and grow the " +
           "brush." },

    { ch: 2, img: "touchup-draw", size: BOARD,
      title: "Draw something new",
      lede: "Where the lines were, the pencil draws a heart. New ink is traced exactly like the rest " +
            "of the drawing, and prints in relief the same way.",
      notes: [
        [[54, 11, 39, 33], "<b>Draw</b> (D) adds line art where the trace missed it. Below 0.8 mm " +
          "the readout warns that the stroke is too thin. New ink stops at the edge of the " +
          "silhouette: outside it, it would hang in mid-air."],
        [[418, 474, 136, 120], "The heart, in green until you apply it."],
        [[93, 11, 117, 33], "The other three tools. <b>Restore</b> (R) brings back what was traced " +
          "under the brush. <b>Hollow</b> (H) cuts a closed area out of the silhouette in one " +
          "click. <b>Outline</b> (O) empties a solid black patch and keeps only its rim."],
        [[1021, 822, 145, 45], "<b>Apply</b> takes the touch-up back to the main window. Closing " +
          "without it asks first, so work is never thrown away by mistake."]
      ] },

    { ch: 2, img: "traced", size: SHOT,
      title: "Trace to SVG",
      lede: "The preview now shows the heart on the shell. <b>Trace to SVG</b> writes the two files, " +
            "silhouette and line art, with the same bounding box, so they sit exactly on top of " +
            "each other.",
      notes: [
        [[818, 484, 78, 70], "The heart, now part of the trace."],
        [[986, 169, 87, 33], "The green dot on <b>Touch up</b> says this subject carries edits " +
          "made by hand."],
        [[20, 862, 145, 45], "<b>Trace to SVG</b>, or <b>Ctrl+Enter</b>. The big button always does " +
          "the job of the step you are on."],
        [[635, 62, 231, 66], "The notice confirms the two SVGs and goes away by itself after five " +
          "seconds. Click it to open the folder."],
        [[296, 569, 52, 22], "In the library the subject is now tagged <b>traced</b>."]
      ] },

    { ch: 3, img: "figure-moved", size: SHOT,
      title: "Put the figure on its base",
      lede: "Switch to <b>Figure</b>. The two SVGs are extruded and mounted on a base, the strip " +
            "that joins the feet and slides into the stand. You work face-on, because the part is " +
            "an extrusion: from the front it hides nothing.",
      notes: [
        [[469, 125, 80, 26], "Step 2, <b>Figure</b>. <b>Ctrl+Tab</b> gets here from the keyboard."],
        [[386, 169, 39, 33], "<b>Move base</b> (M): drag the base where it belongs. It starts " +
          "centred under the silhouette, just inside its lowest point."],
        [[590, 660, 250, 52], "The base, hatched in blue. For this tutorial it has been dragged up " +
          "a few millimetres, so the feet stick out below it."],
        [[1108, 165, 362, 230], "The drawing to scale answers what the numbers leave out: <b>how " +
          "much of the figure stands above the card</b> in its toploader. 52 mm here."],
        [[1108, 412, 362, 160], "<b>Raise the figure</b> lifts it above the card, for short and wide " +
          "subjects the card would hide. <b>Base length</b> should span the two outermost feet. " +
          "<b>Base height</b> is 10 mm inside the slot plus what stays in sight."]
      ] },

    { ch: 3, img: "figure-cut", size: SHOT,
      title: "Cut below the base",
      lede: "Whatever hangs below the base would print as loose bits sticking out under the stand. " +
            "One button takes it away.",
      notes: [
        [[385, 787, 129, 34], "<b>Cut below the base</b> removes everything underneath, except a " +
          "4 mm overlap: that is what welds figure and base into one solid instead of two pieces " +
          "that only touch."],
        [[590, 660, 250, 52], "The feet no longer stick out."],
        [[772, 795, 192, 20], "How much was removed. The base itself stays whole."]
      ],
      tip: "For anything that is not a straight cut, a shadow or a stray mark, use <b>Erase</b> " +
           "(E) and <b>Restore</b> (R) on this same view." },

    { ch: 3, img: "figure-written", size: SHOT,
      title: "Write the figure STL",
      lede: "The figure comes out as a single STL, already assembled: the silhouette, the line art " +
            "standing 2.5 mm proud of it, and the base welded underneath.",
      notes: [
        [[20, 862, 191, 45], "<b>Generate figure STL</b>, or <b>Ctrl+Enter</b>."],
        [[612, 62, 277, 66], "<b>Squirtle_cutout.stl is ready to print.</b> Click the notice to " +
          "open its folder."],
        [[1108, 700, 362, 46], "Every subject gets a folder of its own, and the stand made for it " +
          "lands in the same one. The gear at the top lets you choose where models go."],
        [[944, 795, 126, 20], "The size of the part: 145 &times; 151 &times; 10 mm."],
        [[300, 569, 48, 22], "In the library the tag moves on from <b>traced</b> to " +
          "<b>ready</b>: the figure is ready to print."]
      ] },

    { ch: 4, img: "stand", size: SHOT,
      title: "The stand",
      lede: "The <b>Stand</b> page makes the block the figure slides into, next to the card. It is " +
            "not a subject: it does not count as one during the trial.",
      notes: [
        [[1425, 6, 55, 36], "The <b>Stand</b> page, top right."],
        [[1218, 98, 252, 30], "<b>Remove toploader slot</b> is for a figure printed on its own: " +
          "the stand keeps only the figure slot, and the card settings disappear."],
        [[1218, 134, 252, 50], "<b>Card slot</b>: how wide the toploader slot is. A card in a " +
          "rigid toploader is 77 mm across."],
        [[1218, 198, 252, 90], "<b>Figure slot</b>: pick the figure this stand is for. The list " +
          "starts empty on purpose, and the slot comes out 1 mm longer than that figure&rsquo;s " +
          "base."],
        [[1218, 302, 252, 30], "<b>Raise the figure</b>: the same setting as on the Figure page, " +
          "which cuts the figure slot on a raised plateau behind the card."],
        [[1218, 350, 252, 106], "Width, depth and height are not set by hand: they follow from the " +
          "two slots."],
        [[21, 63, 1173, 712], "The stand in 3D. Drag to turn it, use the wheel to zoom."]
      ] },

    { ch: 4, img: "stand-written", size: SHOT,
      title: "Write the stand STL",
      lede: "One more button, and both parts are ready.",
      notes: [
        [[20, 862, 188, 45], "<b>Generate stand STL</b>."],
        [[615, 62, 271, 66], "<b>Stand_base85.stl</b>: the name carries the base length, so a " +
          "stand and a figure that do not match show at a glance."],
        [[1218, 602, 252, 46], "The same folder as the figure: <b>Squirtle_cutout</b> now holds " +
          "both parts to print."]
      ] },

    // Le tre foto sono verticali: la misura e' quella del file, e il palco le
    // stringe in altezza invece di tagliarle (vedi fit).
    { ch: 5, img: "print-bed", size: [1125, 1500],
      title: "On the print bed",
      lede: "Open the two STLs in your slicer like any other model: nothing to scale, align or " +
            "join, because they come out at their real size and already in one piece each. " +
            "Figure and stand lie flat and print side by side.",
      notes: [] },

    { ch: 5, img: "printed", size: [1146, 1500],
      title: "Printed and assembled",
      lede: "The base of the figure slides into the slot at the back, and the card in its " +
            "toploader goes into the slot in front of it.",
      notes: [] },

    { ch: 5, img: "painted", size: [1204, 1500],
      title: "Painted by hand",
      lede: "The line art stands out in relief, so it doubles as a guide for the brush. From an " +
            "image on a white background to the finished piece.",
      notes: [] }
  ];

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
  var TOUR_V = "?v=3";
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

  // La schermata sta intera nel palco: la misura la si calcola, perche' i
  // segni sopra devono restare incollati all'immagine a qualunque grandezza.
  function fit() {
    var size = TOUR[at].size, ar = size[0] / size[1];
    var cs = getComputedStyle(tv.stage);
    var w = tv.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    var h = tv.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    var stacked = getComputedStyle(tv.stage.parentNode).display === "block";
    if (!stacked && w / h > ar) { w = h * ar; }
    // Impilato, il palco e' largo quanto lo schermo e alto quanto serve: una
    // foto verticale a tutta larghezza spingerebbe titolo e testo sotto il
    // bordo. Non piu' di tre quinti dell'altezza, e si stringe in larghezza.
    if (stacked) { w = Math.min(w, window.innerHeight * 0.6 * ar); }
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
    var label = "Step " + (step.ch + 1) + " · " + CHAPTERS[step.ch];
    tv.sub.textContent = "Step " + (step.ch + 1) + " of " + CHAPTERS.length + " · " + CHAPTERS[step.ch];
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
  var dl = $("trial-dl"), dlState = $("trial-state"), dlMeta = $("trial-meta");
  if (SITE.trial.url) {
    dl.href = SITE.trial.url;
    dl.removeAttribute("aria-disabled");
    dl.setAttribute("download", "");
    dlState.innerHTML = "The download starts straight away: no email, no sign-up.";
    dlMeta.innerHTML = ".exe &middot; " + (SITE.trial.size || "unknown size") +
      (SITE.trial.sha256 ? " &middot; SHA-256 " + SITE.trial.sha256 : "");
  } else {
    dl.addEventListener("click", function (e) { e.preventDefault(); });
  }

  /* -------------------------------------------------- acquisto: i piani */
  var picks = $("picks"), go = $("buy-go"), goLabel = $("buy-go-label"), buyMeta = $("buy-meta");
  var NAMES = { pro: "Pro", commercial: "Commercial" };

  function chosen() {
    var r = picks.querySelector("input[name=edition]:checked");
    return r ? r.value : "pro";
  }
  function refreshBuy() {
    var k = chosen(), url = SITE.buy[k];
    goLabel.innerHTML = "Go to checkout: " + NAMES[k] + ", &euro;&nbsp;" + SITE.prices[k];
    if (url) {
      go.href = url;
      go.target = "_blank";
      go.rel = "noopener";
      go.removeAttribute("aria-disabled");
      buyMeta.innerHTML = "Checkout opens on " + (SITE.buy.vendor || "the reseller") +
        " in a new tab.";
    } else {
      go.href = "#";
      go.setAttribute("aria-disabled", "true");
      buyMeta.innerHTML = "<b>The checkout is not open yet.</b> At release this button takes you to payment.";
    }
  }
  picks.addEventListener("change", refreshBuy);
  go.addEventListener("click", function (e) {
    if (go.getAttribute("aria-disabled") === "true") { e.preventDefault(); }
  });
  refreshBuy();

  /* ---------------------------------------------- segnaposto ancora vivi */
  document.querySelectorAll("a.todo[href='#']").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); });
  });
})();
