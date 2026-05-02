# MiInventarioExpress

Sistema de gestión de productos con autenticación de usuarios y chat en tiempo real.

```
Universidad Politécnica Salesiana
Aplicaciones Web - Unidad 2
```

## Datos del Estudiante

| Campo | Valor |
|---|---|
| **Nombre** | Jerry Wong |
| **Materia** | Aplicaciones Web |
| **Unidad** | 2 |
| **Periodo** | 2026 |

## Funcionalidades Implementadas

- [x] CRUD completo de productos (Crear, Listar, Actualizar, Eliminar)
- [x] Autenticación de usuarios (registro, login, logout) con bcrypt
- [x] Sesiones de usuario con express-session
- [x] Carga de imágenes de productos con Multer (validación de tipo y tamaño)
- [x] Validación de formularios con express-validator
- [x] Vistas dinámicas con Handlebars (layouts, partials, helpers)
- [x] Chat en tiempo real entre usuarios autenticados con Socket.io
- [x] Diseño responsivo con CSS personalizado
- [x] Protección de rutas (middleware de autenticación)
- [x] Manejo de errores y páginas 404
- [x] Mensajes flash para feedback al usuario
- [x] Control de acceso por roles (admin/user)

## Tecnologías Utilizadas

| Tecnología | Uso |
|---|---|
| **Node.js** | Entorno de ejecución |
| **Express** | Framework web y enrutamiento |
| **MongoDB / Mongoose** | Base de datos y ODM |
| **Handlebars (hbs)** | Motor de plantillas |
| **Socket.io** | Comunicación en tiempo real (chat) |
| **Multer** | Carga de archivos (imágenes) |
| **bcryptjs** | Encriptación de contraseñas |
| **express-session** | Manejo de sesiones |
| **connect-flash** | Mensajes flash |
| **express-validator** | Validación de formularios |

## Estructura del Proyecto (MVC)

```
MiInventarioExpress/
├── app.js                    # Servidor principal (Express + Socket.io)
├── package.json              # Dependencias y scripts
├── .gitignore                # Archivos ignorados por Git
├── README.md                 # Este archivo
│
├── models/
│   ├── Product.js            # Esquema de producto (Mongoose)
│   └── User.js               # Esquema de usuario (Mongoose)
│
├── routes/
│   ├── auth.js               # Rutas de autenticación (login/register/logout)
│   └── products.js           # Rutas CRUD de productos
│
├── views/
│   ├── layouts/
│   │   └── main.hbs          # Layout principal (HTML base)
│   ├── partials/
│   │   ├── navbar.hbs        # Barra de navegación
│   │   └── footer.hbs        # Pie de página
│   ├── home.hbs              # Página de inicio
│   ├── login.hbs             # Inicio de sesión
│   ├── register.hbs          # Registro de usuario
│   ├── chat.hbs              # Chat en tiempo real
│   ├── 404.hbs               # Página no encontrada
│   ├── error.hbs             # Página de error
│   └── products/
│       ├── list.hbs          # Listado de productos
│       ├── create.hbs        # Formulario de creación
│       └── edit.hbs          # Formulario de edición
│
├── public/
│   ├── css/
│   │   └── style.css         # Estilos de la aplicación
│   └── js/
│       ├── main.js           # Utilidades globales
│       └── chat.js           # Lógica del chat con Socket.io
│
├── uploads/                  # Imágenes subidas por los usuarios
└── capturas/                 # Capturas de pantalla de la aplicación
```

## Capturas de Pantalla

### Página de Login

![Login](capturas/login.png)

*Formulario de inicio de sesión con validación de credenciales.*

### Chat en Tiempo Real

![Chat](capturas/chat.png)

*Chat en vivo entre usuarios administradores usando Socket.io.*

### Listado de Productos

![Productos](capturas/productos.png)

*Vista de todos los productos con imágenes, precios y acciones CRUD.*

### Página de Inicio

![Home](capturas/home.png)

*Dashboard principal con acceso a todas las funcionalidades.*

## Instalación y Uso

### Requisitos Previos

- **Node.js** 
- **MongoDB** (local)

### Pasos de Instalación

1. **Clonar el repositorio:**

   ```bash
   git clone <url-del-repositorio>
   ```

2. **Instalar dependencias:**

   ```bash
   npm install
   ```

3. **Configurar MongoDB:**

   La aplicación se conecta a `mongodb://localhost:27017/MiInventarioExpress` por defecto.
   Para cambiar la URI, editar la variable `MONGO_URI` en `app.js`.

4. **Iniciar el servidor:**

   ```bash
   npm start
   ```

   O para desarrollo con recarga automática:

   ```bash
   npm run dev
   ```

5. **Abrir en el navegador:**

   ```
   http://localhost:3000
   ```

### Uso de la Aplicación

1. **Registrarse** en `/auth/register`.
2. **Gestionar productos** desde `/products` (crear, editar, eliminar).
3. **Subir imágenes** al crear o editar un producto (JPG, PNG, GIF, WebP, máx 5MB).
4. **Usar el chat** en `/chat` (solo usuarios autenticados).
5. **Cerrar sesión** desde el botón en la barra de navegación.

## Notas

- La carpeta `uploads/` almacena las imágenes subidas.
- La sesión expira después de 1 hora de inactividad.
- Las contraseñas se almacenan encriptadas con bcrypt (nunca en texto plano).
