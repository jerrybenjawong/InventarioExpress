// =======================================================
// CHAT EN TIEMPO REAL - Logica del lado del cliente
// Este script se conecta al servidor via Socket.io
// y maneja: envio de mensajes, recepcion de mensajes,
// lista de usuarios conectados, notificaciones de union/salida
// =======================================================
(function () {
  'use strict';

  // Inicializamos la conexion Socket.io con el servidor
  // io() detecta automaticamente la URL del servidor actual
  var socket = io();

  // Nombre del usuario actual (inyectado desde la vista Handlebars)
  // window.currentUser se define en el <script> de chat.hbs
  var currentUser = window.currentUser || 'Anónimo';

  // Referencias a elementos del DOM (interfaz)
  var chatMessages = document.getElementById('chatMessages');
  var messageInput = document.getElementById('messageInput');
  var sendBtn = document.getElementById('sendMessage');
  var userList = document.getElementById('userList');

  // =======================================================
  // UTILIDADES
  // =======================================================

  // Formatea una fecha a HH:MM (hora y minutos)
  // Se usa para mostrar la hora de cada mensaje
  function formatTime(date) {
    var d = new Date(date);
    var h = d.getHours().toString().padStart(2, '0');
    var m = d.getMinutes().toString().padStart(2, '0');
    return h + ':' + m;
  }

  // Agrega un mensaje al area de chat en el DOM
  // data: objeto con { from, text, time }
  // type: clase CSS ('user-message', 'other-message', 'system-message')
  function addMessage(data, type) {
    if (!chatMessages) return;
    var div = document.createElement('div');
    div.className = 'chat-message ' + (type || 'other-message');

    var time = data.time ? formatTime(data.time) : '';

    if (type === 'system-message') {
      // Mensajes del sistema (uniones, salidas): solo texto centrado
      div.innerHTML = '<span class="message-text">' + escapeHtml(data.text) + '</span>';
    } else {
      // Mensajes de usuarios: autor + texto + hora
      var authorHtml = data.from && type !== 'user-message'
        ? '<span class="message-author">' + escapeHtml(data.from) + '</span>'
        : '';
      var timeHtml = time
        ? '<span class="message-time">' + time + '</span>'
        : '';
      div.innerHTML = authorHtml +
        '<span class="message-text">' + escapeHtml(data.text) + '</span>' +
        timeHtml;
    }

    // Agregamos al final del chat y hacemos scroll hasta abajo
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // Escapa caracteres HTML para prevenir XSS (inyeccion de codigo)
  // Convierte < > & " ' en entidades HTML seguras
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // Actualiza la lista de usuarios conectados en la barra lateral
  // Elimina duplicados y marca al usuario actual
  function updateUserList(users) {
    if (!userList) return;
    userList.innerHTML = '';
    if (!users || users.length === 0) {
      var li = document.createElement('li');
      li.className = 'user-list-empty';
      li.textContent = 'Sin usuarios';
      userList.appendChild(li);
      return;
    }
    // Filtramos duplicados (puede pasar si un usuario abre multiples pestañas)
    var uniqueUsers = [];
    for (var i = 0; i < users.length; i++) {
      if (uniqueUsers.indexOf(users[i]) === -1) {
        uniqueUsers.push(users[i]);
      }
    }
    // Mostramos cada usuario en la lista
    for (var j = 0; j < uniqueUsers.length; j++) {
      var li = document.createElement('li');
      li.textContent = uniqueUsers[j];
      // Si es el usuario actual, lo marcamos con "(tú)"
      if (uniqueUsers[j] === currentUser) {
        li.textContent += ' (tú)';
      }
      userList.appendChild(li);
    }
  }

  // =======================================================
  // ENVIO DE MENSAJES
  // =======================================================

  // Toma el texto del input, lo envia al servidor y limpia el campo
  // El servidor lo reenviara a todos los clientes (incluyendonos)
  function sendMessage() {
    var text = messageInput.value.trim();
    if (!text) return; // No enviar mensajes vacios

    // Emitimos el evento 'chatMessage' al servidor con el texto
    socket.emit('chatMessage', text);

    // Limpiamos el input y ponemos el foco para seguir escribiendo
    messageInput.value = '';
    messageInput.focus();
  }

  // =======================================================
  // EVENTOS DE SOCKET.IO
  // Escuchamos los eventos que el servidor nos envia
  // =======================================================

  // 'connect': se activa cuando logramos conectarnos al servidor
  socket.on('connect', function () {
    console.log('Conectado al chat');
    // Avisamos al servidor que este usuario se unio
    if (currentUser) {
      socket.emit('userJoined', currentUser);
    }
  });

  // 'chatMessage': el servidor nos envia un mensaje (puede ser nuestro o de otro)
  socket.on('chatMessage', function (data) {
    // Clasificamos el mensaje segun quien lo envio
    if (data.from === 'Sistema') {
      // Mensaje del sistema: alguien entro/salio
      addMessage(data, 'system-message');
    } else if (data.from === currentUser) {
      // Mensaje propio: se alinea a la derecha con estilo diferente
      addMessage(data, 'user-message');
    } else {
      // Mensaje de otro usuario: se alinea a la izquierda
      addMessage(data, 'other-message');
    }
  });

  // 'userList': el servidor nos envia la lista actualizada de usuarios
  socket.on('userList', function (users) {
    updateUserList(users);
  });

  // 'disconnect': se perdio la conexion con el servidor
  socket.on('disconnect', function () {
    console.log('Desconectado del chat');
    addMessage(
      { from: 'Sistema', text: 'Conexión perdida. Reconectando...' },
      'system-message'
    );
  });

  // =======================================================
  // EVENT LISTENERS DE LA INTERFAZ
  // =======================================================

  // Boton "Enviar": al hacer click, envia el mensaje
  if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
  }

  // Input de texto: al presionar Enter, envia el mensaje
  if (messageInput) {
    messageInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
})();