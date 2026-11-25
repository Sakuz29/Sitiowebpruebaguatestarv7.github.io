/* =====================================================================
 * historic-carousel.js
 * ---------------------------------------------------------------------
 * Carrusel de videos "Momentos Históricos", construido con Swiper.js
 * (cargado por CDN en index.html, justo antes de este archivo).
 *
 * Comportamiento (SIN autoplay):
 *   - Ningún video se reproduce automáticamente ni el carrusel avanza
 *     solo: el usuario navega con las flechas, la paginación o
 *     arrastrando.
 *   - Únicamente el video que queda CENTRADO (diapositiva activa) se
 *     muestra más grande y es el único interactivo: el usuario puede
 *     reproducir, pausar, subir/bajar o silenciar el audio, y usar
 *     pantalla completa mediante los controles nativos del navegador.
 *   - Los videos laterales son solo una vista previa (sin controles,
 *     sin clics) hasta que el usuario los desplaza al centro.
 *   - Al cambiar de diapositiva, el video que deja de estar centrado
 *     se pausa automáticamente.
 *   - Lazy loading: cada video solo descarga su fuente real cuando su
 *     diapositiva está a punto de entrar en pantalla (no se descargan
 *     los 8 videos de una sola vez).
 *
 * Este script es completamente independiente del resto del sitio: no
 * toca ningún otro elemento, estilo ni lógica existente.
 *
 * Para cambiar los videos, solo edita el arreglo VIDEO_URLS de abajo.
 * ===================================================================== */

(function () {
  "use strict";

  /* -------------------------------------------------------------------
   * 1. ARREGLO DE VIDEOS
   *
   *    CAMBIO: se sirven por jsDelivr, no por raw.githubusercontent.
   *    Motivo — raw.githubusercontent devuelve estos .mp4 con la
   *    cabecera "Content-Type: application/octet-stream", es decir,
   *    "archivo binario cualquiera". El navegador no reproduce un
   *    <video> cuyo tipo declarado no es de vídeo, así que el carrusel
   *    salía vacío aunque los archivos se descargaran bien. jsDelivr
   *    entrega exactamente los mismos archivos del mismo repositorio y
   *    el mismo commit, pero con "Content-Type: video/mp4".
   *    (Comprobado sobre el primer vídeo del arreglo.)
   *
   *    Si jsDelivr fallara, más abajo se reintenta con la URL raw
   *    original, que es lo que había antes.
   * ---------------------------------------------------------------- */
  var GH = "teacheredwincaceres-png/ImpulSOS";
  var COMMIT = "e6d78db231ea8bbceb1cbd09ba836656f8791f24";
  function cdn(archivo){
    return "https://cdn.jsdelivr.net/gh/" + GH + "@" + COMMIT + "/" + archivo;
  }
  function raw(archivo){
    return "https://raw.githubusercontent.com/" + GH + "/" + COMMIT + "/" + archivo;
  }

  var VIDEO_FILES = [
    "0-nuestra_historia_-_los_pioneros_v1%20(360p).mp4",
    "1-nuestra_historia_-_cuarteto_v1%20(720p).mp4",
    "2-nuestra_historia__don_pablo_y_ibq_v1%20(540p).mp4",
    "3-nuestra_historia_-_los_ecos_v1%20(540p).mp4",
    "4-nuestra_historia_-_guillermo_hays_v1%20(360p).mp4",
    "5-nuestra_historia__seminario_y_sean_v1%20(540p).mp4",
    "6-nuestra_historia_-_el_tren_v1%20(540p).mp4",
    "nuestra_historia_-_un_legado_duradero_v1%20(240p).mp4"
  ];
  var VIDEO_URLS = VIDEO_FILES.map(cdn);
  var VIDEO_URLS_RESPALDO = VIDEO_FILES.map(raw);

  var VIDEO_URLS_VIEJAS = [
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/0-nuestra_historia_-_los_pioneros_v1%20(360p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/1-nuestra_historia_-_cuarteto_v1%20(720p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/2-nuestra_historia__don_pablo_y_ibq_v1%20(540p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/3-nuestra_historia_-_los_ecos_v1%20(540p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/4-nuestra_historia_-_guillermo_hays_v1%20(360p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/5-nuestra_historia__seminario_y_sean_v1%20(540p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/6-nuestra_historia_-_el_tren_v1%20(540p).mp4",
    "https://raw.githubusercontent.com/teacheredwincaceres-png/ImpulSOS/e6d78db231ea8bbceb1cbd09ba836656f8791f24/nuestra_historia_-_un_legado_duradero_v1%20(240p).mp4"
  ];

  /* -------------------------------------------------------------------
   * 2. REFERENCIAS AL DOM
   *    Si el contenedor no existe en la página, el script no continúa.
   * ---------------------------------------------------------------- */
  var wrapper = document.getElementById("historicSwiperWrapper");
  if (!wrapper) {
    return;
  }

  /* -------------------------------------------------------------------
   * 3. GENERACIÓN DE DIAPOSITIVAS
   *    Una <div class="swiper-slide"> por video. Cada video:
   *      - NO tiene "autoplay": nunca arranca solo.
   *      - NO tiene "muted": el usuario controla el volumen libremente
   *        (subir/bajar/silenciar) con los controles nativos.
   *      - NO lleva "src" todavía: la URL real se guarda en "data-src"
   *        y solo se asigna cuando la diapositiva está por entrar en
   *        pantalla (lazy loading, ver sección 5).
   *      - "controls" se activa/desactiva dinámicamente vía JS: solo el
   *        video centrado (swiper-slide-active) lo tiene.
   *      - "loop": si el usuario lo reproduce, no se corta abruptamente.
   *      - "playsinline": evita que en iOS se abra a pantalla completa
   *        de forma forzada al reproducir.
   * ---------------------------------------------------------------- */
  var slidesHtml = VIDEO_URLS.map(function (url, index) {
    return (
      '<div class="swiper-slide" aria-label="Momento histórico ' + (index + 1) + '">' +
        '<div class="hm-video-frame">' +
          '<video data-src="' + url + '" data-i="' + index + '" loop playsinline preload="metadata"></video>' +
        "</div>" +
      "</div>"
    );
  }).join("");

  wrapper.innerHTML = slidesHtml;

  /* -------------------------------------------------------------------
   * 4. INICIALIZACIÓN DE SWIPER (SIN autoplay)
   * ---------------------------------------------------------------- */
  if (typeof window.Swiper === "undefined") {
    // El SDK de Swiper no cargó (por ejemplo, sin conexión al CDN):
    // se deja el contenedor con los videos apilados en fila, sin morir.
    console.error("Swiper.js no está disponible; el carrusel no se pudo inicializar.");
    return;
  }

  var historicSwiper = new window.Swiper("#historicSwiper", {
    // --- El video centrado queda de frente y más grande (ver CSS
    //     ".swiper-slide-active .hm-video-frame"); los laterales quedan
    //     más pequeños a los costados. ---
    centeredSlides: true,
    slidesPerView: "auto",
    watchSlidesProgress: true,
    grabCursor: true,

    /* Sin bucle. Swiper avisaba en cada arranque de que no hay
       diapositivas suficientes para darle la vuelta: con slidesPerView
       "auto" no puede calcular cuántas copias necesita, y duplicar los
       ocho vídeos otra vez (loopAdditionalSlides) significaba pedir el
       doble de descargas para una lista que se recorre en diez segundos.
       Ocho vídeos con principio y final se navegan igual de bien, y los
       botones de los extremos ahora dicen la verdad: que ahí se acaba. */
    loop: false,

    // --- Movimiento suave al navegar manualmente ---
    speed: 800,
    easing: "ease-out",

    // NOTA: sin bloque "autoplay" — el carrusel NUNCA avanza solo.

    // --- Paginación inferior (bullets clicables) ---
    pagination: {
      el: "#historicSwiper .swiper-pagination",
      clickable: true
    },

    // --- Flechas de navegación ---
    navigation: {
      nextEl: "#historicSwiper .swiper-button-next",
      prevEl: "#historicSwiper .swiper-button-prev"
    },

    // --- Responsive: espaciado entre diapositivas según ancho de pantalla ---
    breakpoints: {
      0:    { spaceBetween: 12 },
      600:  { spaceBetween: 20 },
      1000: { spaceBetween: 28 }
    }
  });

  /* -------------------------------------------------------------------
   * 5. LAZY LOADING DE LOS VIDEOS
   *    Un IntersectionObserver vigila cada <video>: apenas su diapositiva
   *    está a punto de quedar visible, se le asigna la URL real
   *    (data-src -> src) y se llama load(). Como no hay "autoplay", el
   *    video queda listo para reproducirse en cuanto el usuario lo pida.
   * ---------------------------------------------------------------- */
  function loadVideoSrc(video) {
    if (video.dataset.src) {
      /* El "#t=0.6" no es decorativo: un <video> sin "poster" y sin
         reproducir se dibuja como un rectángulo vacío. Pidiendo el
         segundo 0,6 el navegador descarga ese fotograma y lo deja en
         pantalla, así el carrusel se ve poblado antes de que nadie
         pulse play. Sin esto salían ocho recuadros negros. */
      video.src = video.dataset.src + "#t=0.6";
      video.removeAttribute("data-src");
      video.load();
    }
  }

  /* Respaldo: si el CDN no responde, se reintenta UNA vez con la URL
     raw de GitHub. Es peor (manda un Content-Type que muchos
     navegadores rechazan) pero es mejor que no tener nada, y evita
     quedar atados a que jsDelivr esté disponible. */
  function conRespaldo(video) {
    video.addEventListener("error", function () {
      if (video.dataset.respaldo === "1") { return; }
      var i = parseInt(video.dataset.i, 10);
      var alterna = VIDEO_URLS_RESPALDO[i];
      if (!alterna) { return; }
      video.dataset.respaldo = "1";
      /* Aviso, no error: el respaldo funciona. Se deja en console.info
         para que no ensucie la consola con algo que ya está resuelto. */
      console.info("Momentos Históricos: el CDN no sirvió este vídeo; se usa la copia de GitHub.", alterna);
      video.src = alterna + "#t=0.6";
      video.load();
    });
  }

  var videoEls = wrapper.querySelectorAll("video");
  Array.prototype.forEach.call(videoEls, conRespaldo);

  if ("IntersectionObserver" in window) {
    var lazyObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          loadVideoSrc(entry.target);
          lazyObserver.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "200px", threshold: 0.01 }
    );

    videoEls.forEach(function (video) {
      lazyObserver.observe(video);
    });
  } else {
    // Navegadores sin soporte de IntersectionObserver: se cargan todos
    // de una vez, para no dejar la sección vacía.
    videoEls.forEach(loadVideoSrc);
  }

  /* -------------------------------------------------------------------
   * 6. SOLO EL VIDEO CENTRAL ES INTERACTIVO
   *    - Se le agrega el atributo "controls" únicamente al video de la
   *      diapositiva activa (la que Swiper marca con "swiper-slide-active").
   *    - A todos los demás videos se les quita "controls" y se pausan,
   *      para que nunca quede sonando un video fuera del centro.
   * ---------------------------------------------------------------- */
  function updateActiveVideo() {
    var slides = historicSwiper.slides; // incluye duplicados del loop
    for (var i = 0; i < slides.length; i++) {
      var slideEl = slides[i];
      var video = slideEl.querySelector("video");
      if (!video) continue;

      var isActive = slideEl.classList.contains("swiper-slide-active");

      if (isActive) {
        video.setAttribute("controls", "controls");
      } else {
        video.removeAttribute("controls");
        if (!video.paused) {
          video.pause();
        }
      }
    }
  }

  // Actualizar al iniciar y cada vez que cambie la diapositiva centrada.
  historicSwiper.on("init", updateActiveVideo);
  historicSwiper.on("slideChange", updateActiveVideo);
  historicSwiper.on("slideChangeTransitionEnd", updateActiveVideo);
  historicSwiper.on("loopFix", updateActiveVideo);

  // Swiper puede haberse inicializado antes de registrar los listeners:
  // se ejecuta una vez de inmediato para dejar el estado inicial correcto.
  updateActiveVideo();
})();
