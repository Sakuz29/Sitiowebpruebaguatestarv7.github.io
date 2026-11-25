/* =====================================================================
 * audiobook.js
 * ---------------------------------------------------------------------
 * Lógica completa del reproductor "AUDIO LIBRO" (barra lateral izquierda,
 * dentro de .col-author). Reemplaza el antiguo reproductor simple
 * ("Lectura en voz alta") por una experiencia tipo app moderna de
 * música/audiolibros:
 *
 *   - Menú de capítulos generado automáticamente a partir del arreglo
 *     "audios" (no se escribe cada elemento a mano).
 *   - Al hacer clic en un capítulo: cambia el título, cambia la duración
 *     mostrada, carga el audio, empieza a reproducirse automáticamente,
 *     resalta el capítulo activo y detiene cualquier reproducción previa
 *     (se reutiliza un único elemento <audio>, así que al cambiar su
 *     "src" la reproducción anterior se detiene de forma natural).
 *   - Controles: reproducir/pausa, siguiente, anterior, barra de
 *     progreso, tiempo actual, duración total, volumen, velocidad
 *     (0.75x/1x/1.25x/1.5x), repetir y descargar.
 *
 * REPRODUCTOR MULTI-FUENTE (mejora):
 *   Cada capítulo ahora puede declarar varias URLs candidatas ("urls")
 *   en vez de una sola. El motivo: al servir los MP3 directamente desde
 *   "raw.githubusercontent.com", GitHub a veces responde con la
 *   cabecera "Content-Type: application/octet-stream" en lugar de
 *   "audio/mpeg", lo que hace que algunos navegadores se nieguen a
 *   reproducir el archivo (aunque el enlace "funcione" para descargarlo).
 *   Para corregir esto sin cambiar el diseño ni la estructura visual:
 *     1) Se intenta primero servir el audio vía jsDelivr (CDN que
 *        replica el mismo repositorio/commit de GitHub, pero SIEMPRE
 *        entrega el tipo de contenido correcto, "audio/mpeg").
 *     2) Si esa fuente fallara por cualquier motivo (caída del CDN,
 *        nombre de archivo distinto, etc.), el reproductor reintenta
 *        automáticamente con la siguiente URL candidata (por ejemplo,
 *        la versión directa de "raw.githubusercontent.com"), sin
 *        intervención del usuario y sin bloquear la interfaz.
 *     3) Solo si TODAS las fuentes candidatas fallan se muestra el
 *        aviso amigable de error (ver "showAudioError").
 *   Esto es completamente transparente para el usuario: el resto del
 *   comportamiento (clic para reproducir, resaltado, título, etc.) es
 *   exactamente el mismo de antes.
 *
 * Este archivo es independiente del resto del sitio: no toca ningún
 * otro elemento, estilo ni lógica existente. Solo mejora la sección
 * del Audiolibro.
 * ===================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------
   * 1. ARREGLO DE AUDIOS (capítulos del audiolibro)
   *    Para agregar/quitar capítulos, solo se edita este arreglo: el
   *    menú y el reproductor se generan automáticamente a partir de él.
   *    "urls" es una lista de fuentes candidatas, en orden de prioridad:
   *    si la primera falla, se reintenta automáticamente con la
   *    siguiente, y así sucesivamente.
   * ---------------------------------------------------------------- */
  var GITHUB_USER = "teacheredwincaceres-png";
  var GITHUB_REPO = "ImpulSOS";
  var GITHUB_COMMIT = "03a66486a478053d546029921e3179062f3f8f82";
  // Los dos capítulos nuevos ("Cuan Grande es Él" y "En la Cruz") viven en
  // un commit distinto del mismo repositorio; se declara aparte sin tocar
  // el commit de los capítulos existentes.
  var GITHUB_COMMIT_2 = "f5e28c6684d2b82df575559f3cbfd0fa6c04a14a";

  // Genera, para un mismo archivo del repositorio, la fuente jsDelivr
  // (prioridad 1: entrega "Content-Type: audio/mpeg" correcto) y la
  // fuente raw.githubusercontent.com (prioridad 2, como respaldo), para
  // el commit que se indique.
  function githubAudioSourcesAt(commit, path) {
    return [
      "https://cdn.jsdelivr.net/gh/" + GITHUB_USER + "/" + GITHUB_REPO + "@" + commit + "/audio/" + path,
      "https://raw.githubusercontent.com/" + GITHUB_USER + "/" + GITHUB_REPO + "/" + commit + "/audio/" + path
    ];
  }
  // Atajo para el commit de los capítulos originales (mismo comportamiento de siempre).
  function githubAudioSources(path) {
    return githubAudioSourcesAt(GITHUB_COMMIT, path);
  }

  var audios = [
    {
      titulo: "Cuan Grande es Él",
      // Duración real desconocida de antemano: se calcula sola en cuanto
      // carga el archivo (ver "probeChapterDurations" más abajo) y este
      // texto se reemplaza automáticamente por el valor real.
      duracion: "—:—",
      probeDuration: true,
      urls: githubAudioSourcesAt(GITHUB_COMMIT_2, "Track01.mp3.mpeg")
    },
    {
      titulo: "En la Cruz: Ingles-Español-Kiche",
      duracion: "—:—",
      probeDuration: true,
      urls: githubAudioSourcesAt(GITHUB_COMMIT_2, "En%20la%20Cruz-Ingles-Espa%C3%B1ol%2BKiche.mp3")
    },
    {
      titulo: "Prólogo",
      duracion: "03:42",
      urls: githubAudioSources("1-%20Prologo.mp3")
    },
    {
      titulo: "Sección 1",
      duracion: "12:18",
      urls: githubAudioSources("2%20-%20Secion%201.mp3")
    },
    {
      titulo: "Sección 2",
      duracion: "09:51",
      urls: githubAudioSources("3%20Secion%201.5-2.mp3")
    },
    {
      titulo: "Sección 3 y 4",
      duracion: "15:06",
      // Varias variantes de nombre como respaldo adicional, por si el
      // archivo real en el repositorio difiere ligeramente en mayúsculas,
      // espacios o guiones.
      urls: githubAudioSources("4-seccion%203%20y%204.mp3").concat(
        githubAudioSources("4-Secion%203%20y%204.mp3"),
        githubAudioSources("4%20Secion%203-4.mp3")
      )
    }
  ];

  /* -------------------------------------------------------------------
   * 2. REFERENCIAS AL DOM
   *    Si el reproductor no existe en la página, el script no continúa.
   * ---------------------------------------------------------------- */
  var listEl = document.getElementById("audiobookList");
  if (!listEl) {
    return;
  }

  var audio = document.getElementById("abAudio");
  var nowPlayingEl = document.getElementById("abNowPlaying");
  var trackTitleEl = document.getElementById("abTrackTitle");
  var trackSubEl = document.getElementById("abTrackSub");

  var seek = document.getElementById("abSeek");
  var currentTimeEl = document.getElementById("abCurrentTime");
  var durationEl = document.getElementById("abDuration");

  var playPauseBtn = document.getElementById("abPlayPause");
  var prevBtn = document.getElementById("abPrev");
  var nextBtn = document.getElementById("abNext");

  var repeatBtn = document.getElementById("abRepeat");
  var volumeSlider = document.getElementById("abVolume");
  var volIcon = document.getElementById("abVolIcon");
  var speedSelect = document.getElementById("abSpeed");
  var downloadLink = document.getElementById("abDownload");
  var errorMsgEl = document.getElementById("abErrorMsg"); // Aviso amigable si un audio falla al cargar

  var currentIndex = -1;  // -1 = ningún capítulo cargado todavía
  var currentUrlIndex = 0; // qué fuente candidata del capítulo actual se está intentando
  var blobFallbackTried = false; // evita reintentar el respaldo por Blob más de una vez por capítulo

  /* -------------------------------------------------------------------
   * 3. UTILIDADES
   * ---------------------------------------------------------------- */

  // Formatea segundos a "mm:ss".
  function fmtTime(seconds) {
    if (!isFinite(seconds) || seconds < 0) return "00:00";
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  // Elige el icono de volumen según el nivel actual / silenciado.
  function volumeIconFor(vol, muted) {
    if (muted || vol === 0) return '<svg class="ui-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.5 6.5 8.5H3v7h3.5L11 19.5z"/><path d="M16.5 9.5l5 5"/><path d="M21.5 9.5l-5 5"/></svg>';
    if (vol < 0.5) return '<svg class="ui-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.5 6.5 8.5H3v7h3.5L11 19.5z"/><path d="M15.5 8.8a4.4 4.4 0 0 1 0 6.4"/></svg>';
    return '<svg class="ui-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4.5 6.5 8.5H3v7h3.5L11 19.5z"/><path d="M15.5 8.8a4.4 4.4 0 0 1 0 6.4"/><path d="M18.4 6a8.4 8.4 0 0 1 0 12"/></svg>';
  }

  // Muestra/oculta un aviso amigable cuando un audio no puede cargarse o
  // reproducirse (URL caída, formato no soportado, sin conexión, etc.),
  // sin bloquear el resto de la interfaz.
  function showAudioError(text) {
    if (!errorMsgEl) return;
    errorMsgEl.textContent = text;
    errorMsgEl.classList.add("show");
  }
  function hideAudioError() {
    if (!errorMsgEl) return;
    errorMsgEl.textContent = "";
    errorMsgEl.classList.remove("show");
  }

  /* -------------------------------------------------------------------
   * 4. GENERACIÓN AUTOMÁTICA DEL MENÚ DE CAPÍTULOS
   *    Se recorre el arreglo "audios" con forEach: nada se escribe a mano.
   * ---------------------------------------------------------------- */
  /* Marca los títulos que no caben. Se comprueba con scrollWidth contra
     clientWidth: si el texto ocupa más de lo que se ve, está recortado.
     Sin esto la capa flotante aparecería también sobre títulos cortos,
     que no la necesitan. */
  function marcaRecortados() {
    var titulos = listEl.querySelectorAll(".ab-item-title");
    Array.prototype.forEach.call(titulos, function (t) {
      t.setAttribute("data-full", t.textContent);
      t.classList.toggle("recortado", t.scrollWidth > t.clientWidth + 1);
    });
  }
  window.addEventListener("resize", function () {
    if (listEl) marcaRecortados();
  });

  function buildChapterList() {
    listEl.innerHTML = "";

    audios.forEach(function (track, index) {
      var li = document.createElement("li");
      li.className = "ab-item";
      li.setAttribute("data-index", String(index));
      li.setAttribute("role", "button");
      li.setAttribute("tabindex", "0");
      /* El título completo también como atributo: el desplegado al pasar
         el ratón no existe en pantallas táctiles, y así queda accesible
         para lectores de pantalla y para una pulsación larga. */
      li.setAttribute("title", track.titulo);

      li.innerHTML =
        '<div class="ab-item-main">' +
          '<div class="ab-item-title">' + track.titulo + "</div>" +
          '<div class="ab-item-duration">' + track.duracion + "</div>" +
        "</div>" +
        '<span class="ab-item-playing-icon" aria-hidden="true"><i></i><i></i><i></i></span>';

      // Clic: cargar y reproducir automáticamente ese capítulo.
      li.addEventListener("click", function () {
        loadChapter(index, true);
      });

      // Accesibilidad: también se puede seleccionar con teclado (Enter/Espacio).
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          loadChapter(index, true);
        }
      });

      listEl.appendChild(li);
    });
  }

  // Marca visualmente el capítulo activo (barra lateral + color) y
  // desplaza el menú suavemente hasta él si hiciera falta.
  function highlightActiveChapter(index) {
    var items = listEl.querySelectorAll(".ab-item");
    items.forEach(function (item, i) {
      item.classList.toggle("active", i === index);
    });

    var activeItem = listEl.querySelector(".ab-item.active");
    if (activeItem && activeItem.scrollIntoView) {
      activeItem.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  /* -------------------------------------------------------------------
   * 5. CARGA Y REPRODUCCIÓN DE UN CAPÍTULO
   * ---------------------------------------------------------------- */
  function loadChapter(index, autoplay) {
    // Navegación circular: después del último capítulo vuelve al primero
    // y viceversa (para los botones "siguiente"/"anterior").
    if (index < 0) index = audios.length - 1;
    if (index >= audios.length) index = 0;

    currentIndex = index;
    currentUrlIndex = 0;
    blobFallbackTried = false;
    var track = audios[index];

    // Oculta cualquier aviso de error del capítulo anterior antes de intentar
    // cargar el nuevo, para no dejar mensajes viejos en pantalla.
    hideAudioError();

    // ✔ cambia el título ✔ cambia la duración mostrada
    /* Desenfoque durante el cambio: sin él se ve el título viejo
       desaparecer y el nuevo aparecer, dos objetos en vez de uno. */
    var np = document.getElementById("abNowPlaying");
    if (np) {
      np.classList.add("ab-cambiando");
      setTimeout(function () { np.classList.remove("ab-cambiando"); }, 180);
    }
    trackTitleEl.textContent = track.titulo;
    trackSubEl.textContent = "Duración: " + track.duracion;
    durationEl.textContent = track.duracion; // se ajusta con loadedmetadata si el archivo real difiere

    currentTimeEl.textContent = "00:00";
    seek.value = 0;

    // Botón de descarga apuntando siempre a la fuente principal del capítulo.
    downloadLink.href = track.urls[0];
    downloadLink.setAttribute("download", track.titulo + ".mp3");

    // ✔ resalta el capítulo seleccionado ✔ desplaza el menú si hace falta
    highlightActiveChapter(index);

    // Pequeña animación de entrada al cambiar de capítulo.
    nowPlayingEl.classList.remove("ab-anim");
    void nowPlayingEl.offsetWidth; // fuerza reflow para poder re-disparar la animación
    nowPlayingEl.classList.add("ab-anim");

    // Intenta reproducir usando la primera fuente candidata del capítulo.
    playFromCurrentSource(track, autoplay);
  }

  // Asigna al elemento <audio> la fuente candidata indicada por
  // "currentUrlIndex" para el capítulo dado, y reproduce si corresponde.
  function playFromCurrentSource(track, autoplay) {
    // Al asignar un nuevo "src" al mismo <audio>, cualquier reproducción
    // anterior se detiene automáticamente: nunca suenan dos capítulos a la vez.
    audio.pause();
    audio.src = track.urls[currentUrlIndex];
    audio.playbackRate = parseFloat(speedSelect.value);

    // ✔ comienza la reproducción automáticamente
    if (autoplay) {
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(function () {
          // Reproducción bloqueada por el navegador (poco común tras un
          // clic real del usuario): se ignora silenciosamente.
        });
      }
    }
  }

  /* -------------------------------------------------------------------
   * 6. CONTROLES PRINCIPALES: reproducir/pausa, siguiente, anterior
   * ---------------------------------------------------------------- */
  function togglePlayPause() {
    if (currentIndex === -1) {
      // Si aún no se ha elegido capítulo, el botón central reproduce el primero.
      loadChapter(0, true);
      return;
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }

  playPauseBtn.addEventListener("click", togglePlayPause);
  nextBtn.addEventListener("click", function () {
    loadChapter(currentIndex === -1 ? 0 : currentIndex + 1, true);
  });
  prevBtn.addEventListener("click", function () {
    loadChapter(currentIndex === -1 ? 0 : currentIndex - 1, true);
  });

  // Sincroniza el icono del botón central con el estado real del audio.
  audio.addEventListener("play", function () {
    playPauseBtn.innerHTML = '<svg class="ui-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7.5 5h3.2v14H7.5z"/><path d="M13.3 5h3.2v14h-3.2z"/></svg>';
    playPauseBtn.setAttribute("aria-label", "Pausar");
  });
  audio.addEventListener("pause", function () {
    playPauseBtn.innerHTML = '<svg class="ui-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4L19 12z"/></svg>';
    playPauseBtn.setAttribute("aria-label", "Reproducir");
  });

  // Al terminar un capítulo, si no está en modo "repetir", avanza solo al siguiente.
  audio.addEventListener("ended", function () {
    if (!audio.loop) {
      loadChapter(currentIndex + 1, true);
    }
  });

  // Si una fuente de audio falla (enlace caído, tipo de contenido no
  // soportado, sin conexión, etc.), el reproductor multi-fuente reintenta
  // automáticamente con la siguiente URL candidata del mismo capítulo.
  // Solo si TODAS las fuentes fallan se muestra un aviso amigable, sin
  // bloquear el resto de la interfaz: los demás capítulos y controles
  // siguen funcionando con normalidad.
  audio.addEventListener("error", function () {
    if (currentIndex === -1) return; // aún no se eligió ningún capítulo
    var track = audios[currentIndex];

    currentUrlIndex++;
    if (track.urls && currentUrlIndex < track.urls.length) {
      // Reintento silencioso con la siguiente fuente candidata.
      playFromCurrentSource(track, true);
      return;
    }

    // Se agotaron todas las URLs directas. Como último recurso (por
    // ejemplo, cuando GitHub/jsDelivr etiquetan por error un archivo de
    // audio como "video/mpeg" según su extensión de archivo), se
    // descarga el archivo y se reproduce forzando el tipo "audio/mpeg",
    // sin intervención del usuario.
    if (!blobFallbackTried) {
      blobFallbackTried = true;
      tryBlobFallback(track);
      return;
    }

    // Ni las URLs directas ni el respaldo por Blob funcionaron.
    playPauseBtn.innerHTML = '<svg class="ui-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4L19 12z"/></svg>';
    playPauseBtn.setAttribute("aria-label", "Reproducir");
    showAudioError(
      "No se pudo reproducir este capítulo en este momento. Intenta de nuevo más tarde o elige otro capítulo."
    );
  });

  // Último recurso ante un audio mal etiquetado por el servidor (por
  // ejemplo, un .mp3 servido con "Content-Type: video/mpeg"): se
  // descarga el archivo con fetch() y se reproduce como Blob forzando
  // el tipo correcto ("audio/mpeg"), sin cambiar nada más de la interfaz
  // ni del comportamiento habitual.
  function tryBlobFallback(track) {
    if (!window.fetch) {
      playPauseBtn.innerHTML = '<svg class="ui-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4L19 12z"/></svg>';
      playPauseBtn.setAttribute("aria-label", "Reproducir");
      showAudioError(
        "No se pudo reproducir este capítulo en este momento. Intenta de nuevo más tarde o elige otro capítulo."
      );
      return;
    }
    fetch(track.urls[0]).then(function (resp) {
      if (!resp.ok) { throw new Error("network"); }
      return resp.blob();
    }).then(function (rawBlob) {
      var forced = new Blob([rawBlob], { type: "audio/mpeg" });
      var objectUrl = URL.createObjectURL(forced);
      audio.pause();
      audio.src = objectUrl;
      audio.playbackRate = parseFloat(speedSelect.value);
      var p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () {});
      }
    }).catch(function () {
      playPauseBtn.innerHTML = '<svg class="ui-ico" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.8v14.4L19 12z"/></svg>';
      playPauseBtn.setAttribute("aria-label", "Reproducir");
      showAudioError(
        "No se pudo reproducir este capítulo en este momento. Intenta de nuevo más tarde o elige otro capítulo."
      );
    });
  }

  /* -------------------------------------------------------------------
   * 7. BARRA DE PROGRESO, TIEMPO ACTUAL Y DURACIÓN TOTAL
   * ---------------------------------------------------------------- */
  audio.addEventListener("loadedmetadata", function () {
    if (isFinite(audio.duration)) {
      durationEl.textContent = fmtTime(audio.duration);
    }
  });

  audio.addEventListener("timeupdate", function () {
    if (audio.duration) {
      seek.value = (audio.currentTime / audio.duration) * 100;
    }
    currentTimeEl.textContent = fmtTime(audio.currentTime);
  });

  seek.addEventListener("input", function () {
    if (audio.duration) {
      audio.currentTime = (seek.value / 100) * audio.duration;
    }
  });

  /* -------------------------------------------------------------------
   * 8. VOLUMEN (subir / bajar / silenciar)
   * ---------------------------------------------------------------- */
  volumeSlider.addEventListener("input", function () {
    audio.volume = volumeSlider.value / 100;
    audio.muted = false;
    volIcon.innerHTML = volumeIconFor(audio.volume, audio.muted);
  });

  // Clic en el icono de volumen: silenciar / restaurar sonido.
  volIcon.addEventListener("click", function () {
    audio.muted = !audio.muted;
    volIcon.innerHTML = volumeIconFor(audio.volume, audio.muted);
  });

  /* -------------------------------------------------------------------
   * 9. VELOCIDAD DE REPRODUCCIÓN
   * ---------------------------------------------------------------- */
  speedSelect.addEventListener("change", function () {
    audio.playbackRate = parseFloat(speedSelect.value);
  });

  /* -------------------------------------------------------------------
   * 10. REPETIR CAPÍTULO
   * ---------------------------------------------------------------- */
  repeatBtn.addEventListener("click", function () {
    audio.loop = !audio.loop;
    repeatBtn.classList.toggle("active", audio.loop);
  });

  /* -------------------------------------------------------------------
   * 11. INICIALIZACIÓN
   * ---------------------------------------------------------------- */
  buildChapterList();
  marcaRecortados();
  audio.volume = volumeSlider.value / 100;

  // Para los capítulos marcados con "probeDuration: true" (duración real
  // no conocida de antemano), se calcula sola: se crea un elemento
  // <audio> temporal (invisible, nunca se agrega a la página) que solo
  // carga los metadatos del archivo, sin reproducirlo ni afectar el
  // reproductor principal; al obtener la duración real se actualiza el
  // arreglo "audios" y el número mostrado junto al capítulo en la lista.
  function probeChapterDurations() {
    audios.forEach(function (track, index) {
      if (!track.probeDuration || !track.urls || !track.urls.length) return;

      var probe = document.createElement("audio");
      probe.preload = "metadata";
      var probeUrlIndex = 0;
      probe.src = track.urls[probeUrlIndex];

      probe.addEventListener("loadedmetadata", function () {
        if (!isFinite(probe.duration)) return;
        track.duracion = fmtTime(probe.duration);
        var badge = listEl.querySelector('.ab-item[data-index="' + index + '"] .ab-item-duration');
        if (badge) {
          badge.textContent = track.duracion;
        }
      });

      // Si esta fuente falla, se intenta la siguiente URL candidata del
      // mismo capítulo (mismo criterio de respaldo que el reproductor
      // principal); si todas fallan, se deja el texto por defecto sin
      // afectar la reproducción real del capítulo.
      probe.addEventListener("error", function () {
        probeUrlIndex++;
        if (track.urls[probeUrlIndex]) {
          probe.src = track.urls[probeUrlIndex];
        }
      });
    });
  }
  probeChapterDurations();
})();
