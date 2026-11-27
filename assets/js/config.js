/* =====================================================================
   Configuración del sitio GuateStar. Edita solo este archivo.
   ---------------------------------------------------------------------
   ga4:          ID de Google Analytics 4 (G-XXXXXXXXXX). Vacío = sin analítica.
   web3formsKey: clave de Web3Forms del correo que recibe los formularios.
   campaigns:    campañas de recaudación (Colorado Gives Day, fin de año, etc.).
                 Cada campaña aparece sola como franja amarilla en Inicio, Donar
                 y Formas de dar entre su fecha de inicio y su fecha de fin, y
                 desaparece sola después. Puede haber varias en la lista.
   ===================================================================== */
window.GS_CONFIG = {
  "ga4": "",
  "web3formsKey": "69f2e498-2905-4a92-b4c9-d4123444b536",
  "campaigns": [
    /* EJEMPLO. Para activarlo, borra la línea de arriba que empieza con barra y
       asterisco y la de abajo que termina con asterisco y barra, y cambia los datos.
       Las fechas van en formato AÑO-MES-DÍA. Confirma la fecha oficial de
       Colorado Gives Day en coloradogives.org antes de publicarla.
    {
      "nombre": "Colorado Gives Day 2027",
      "inicio": "2027-11-01",
      "fin": "2027-12-07",
      "titulo_es": "Colorado Gives Day",
      "titulo_en": "Colorado Gives Day",
      "texto_es": "Las donaciones en línea a GuateStar cuentan para el día de dar más grande de Colorado.",
      "texto_en": "Online gifts to GuateStar count toward Colorado’s biggest day of giving.",
      "boton_es": "Donar en Colorado Gives",
      "boton_en": "Give on Colorado Gives",
      "enlace": "https://www.coloradogives.org/donate/Guatestar"
    },
    */
  ]
};
