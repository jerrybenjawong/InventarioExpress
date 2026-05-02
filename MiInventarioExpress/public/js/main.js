// =======================================================
// SCRIPT PRINCIPAL - Funcionalidad global del sitio
// Este archivo se carga en TODAS las paginas via el layout
// Contiene utilidades que aplican a toda la aplicacion
// =======================================================
(function () {
  'use strict';

  // =======================================================
  // AUTO-DESAPARICION DE MENSAJES FLASH
  // Los mensajes de exito/error desaparecen solos
  // despues de 4 segundos con una animacion de fade out
  // Asi no ocupan espacio permanente en la pantalla
  // =======================================================
  document.addEventListener('DOMContentLoaded', function () {
    // Buscamos todos los elementos con clase 'alert'
    var alerts = document.querySelectorAll('.alert');
    alerts.forEach(function (alert) {
      // Programamos la desaparicion despues de 4 segundos
      setTimeout(function () {
        // Aplicamos transicion para que se desvanezca suavemente
        alert.style.transition = 'opacity 0.5s';
        alert.style.opacity = '0';
        // Despues de la animacion, eliminamos el elemento del DOM
        setTimeout(function () {
          if (alert.parentNode) {
            alert.parentNode.removeChild(alert);
          }
        }, 500); // 500ms = duracion de la animacion CSS
      }, 4000); // Esperamos 4 segundos antes de iniciar el fade
    });
  });
})();