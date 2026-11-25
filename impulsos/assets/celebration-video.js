/* =====================================================================
 * celebration-video.js
 * ---------------------------------------------------------------------
 * Reproductor de video "Celebración de Vida de Lorenzo Anderson", ubicado
 * en la barra lateral derecha (panel de Marcadores). Es un elemento
 * <video controls> nativo del navegador: el usuario presiona el botón de
 * "play" propio del reproductor y el navegador carga y reproduce el
 * archivo automáticamente, sin ningún control personalizado adicional.
 *
 * Igual que en assets/audiobook.js, se declaran dos fuentes candidatas
 * para el mismo archivo (mismo repositorio/commit de GitHub):
 *   1) jsDelivr (normalmente entrega el "Content-Type" correcto)
 *   2) raw.githubusercontent.com (respaldo)
 * Si la primera fuente falla al cargar, se reintenta automáticamente con
 * la siguiente, sin intervención del usuario.
 *
 * Este archivo es independiente del resto del sitio: no toca ningún
 * otro elemento, estilo ni lógica existente.
 * ===================================================================== */

(function () {
  "use strict";

  var video = document.getElementById("celebrationVideo");
  if (!video) {
    return;
  }

  var GITHUB_USER = "teacheredwincaceres-png";
  var GITHUB_REPO = "ImpulSOS";
  var GITHUB_COMMIT = "2f0ecf9a32273ae29c307eaefd5e18b2994f6874";
  var FILE_PATH = "Celebraci%C3%B3n%20de%20Vida%20de%20Lorenzo%20Anderson%202.mp4";

  var sources = [
    "https://cdn.jsdelivr.net/gh/" + GITHUB_USER + "/" + GITHUB_REPO + "@" + GITHUB_COMMIT + "/audio/" + FILE_PATH,
    "https://raw.githubusercontent.com/" + GITHUB_USER + "/" + GITHUB_REPO + "/" + GITHUB_COMMIT + "/audio/" + FILE_PATH
  ];

  var sourceIndex = 0;
  video.src = sources[sourceIndex];

  // Si la fuente actual falla (enlace caído, tipo de contenido no
  // soportado, etc.), se reintenta automáticamente con la siguiente URL
  // candidata, de forma transparente para el usuario.
  video.addEventListener("error", function () {
    sourceIndex++;
    if (sources[sourceIndex]) {
      video.src = sources[sourceIndex];
    }
  });
})();
