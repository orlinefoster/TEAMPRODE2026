# 🏆 TEAM PRODE 2026 — Pronósticos del Mundial (Edición Privada)

¡Bienvenido a **TEAM PRODE 2026**! Una plataforma de pronósticos deportivos y competencia grupal de alta fidelidad, diseñada a medida para la **Copa Mundial de la FIFA 2026**.

A diferencia de las herramientas públicas de predicción, este sistema está diseñado exclusivamente para comunidades cerradas (amigos, compañeros de trabajo o grupos privados) que buscan llevar un torneo altamente competitivo con autenticación segura, recálculo de puntajes en tiempo real y estadísticas visuales.

---

## 🎨 Pilares Arquitectónicos y Stack Tecnológico

Este proyecto fue construido desde cero siguiendo patrones de **Clean Architecture** y principios **SOLID** para garantizar un desacoplamiento absoluto, mantenibilidad excepcional y un rendimiento óptimo en producción.

*   **Fundación UI:** [React 19](https://react.dev/) + [TypeScript 6](https://www.typescriptlang.org/) + [Vite 8](https://vite.dev/) para HMR ultra veloz, interfaces estrictamente tipadas y compilaciones estáticas robustas.
*   **Decoplamiento de Componentes (Container-Presentational Pattern):**
    *   **Contenedores Inteligentes (`src/containers/`)**: Coordinan consultas de datos, verificaciones de autenticación, escuchan actualizaciones de base de datos en tiempo real y gestionan escrituras en Firestore.
    *   **Componentes Presentacionales (`src/components/`)**: UI Pura. Reciben datos estrictamente por `props`, invocan callbacks en eventos de interacción y no producen efectos secundarios. Altamente testeables y eficientes.
*   **Infraestructura (Serverless y Real-Time):** Potenciado por **Firebase (v12)**:
    *   **Firebase Authentication**: Registro e inicio de sesión seguros mediante Correo/Contraseña.
    *   **Cloud Firestore**: Actualizaciones en tiempo real, consultas estructuradas y transacciones por lotes (*batches*).
*   **Sistema de Diseño ("Sleek Stadium"):** Implementado con **variables CSS puras** mediante una paleta de colores HSL curada para ofrecer excelencia visual. Incluye efectos de glassmorphism sutiles, transiciones fluidas, tipografía premium (**Outfit**) y un diseño responsivo enfocado en la experiencia táctil en celulares (*Mobile-First*).

---

## 🔒 Aviso Importante: Repositorio vs. Entorno

> [!WARNING]
> **Este repositorio de GitHub es PÚBLICO, pero nuestra instancia de producción de Firebase es CERRADA y PRIVADA.**
>
> El código se expone públicamente para mostrar la arquitectura del software, pero el torneo real es privado. No intentes registrarte en la instancia de producción a menos que tu dirección de correo electrónico haya sido previamente autorizada por un administrador del torneo.

---

## 🚀 Características Clave y Modelo de Dominio

### 1. Registro Obligatorio por Whitelist
Para evitar registros públicos no autorizados, el flujo de creación de cuenta compara el correo electrónico sanitizado contra una colección segura `/whitelist` en Firestore.
*   Si el correo está en la lista de permitidos, la cuenta se crea y se le asigna el rol correspondiente (`user` o `admin`).
*   Si el correo no figura en la lista, el registro es rechazado inmediatamente con un mensaje de error.

### 2. Motor de Recálculo en Cascada
Cuando un administrador ingresa el resultado final de un partido del mundial:
1.  El partido cambia su estado a `status: "played"`.
2.  Un **lote de escritura de Firestore (Write Batch)** actualiza todas las predicciones de los usuarios para ese partido.
3.  Los puntajes se computan bajo las siguientes reglas:
    *   **6 Puntos (Acierto Exacto):** Acertar la cantidad exacta de goles de ambos equipos.
    *   **3 Puntos (Acierto de Ganador/Empate):** Acertar qué equipo gana o si hay empate, pero sin pegar el marcador exacto.
    *   **0 Puntos:** Pronóstico incorrecto.
4.  Un segundo lote actualiza el perfil de cada participante afectado recalculando sus campos `points`, `exactMatchesCount` y `outcomeMatchesCount`.
5.  Las tablas de posiciones y ránkings se actualizan de forma instantánea para todos los usuarios conectados.

### 3. "Usuarios Fantasmas" (Ghosts) para Pruebas Administrativas
Los administradores pueden crear "Participantes Fantasma" directamente desde su panel de control.
*   **Privados e Identificables:** No representan cuentas reales y se visualizan con un ícono `👻`.
*   **Completado Automático:** Los administradores pueden aleatorizar el 100% de los pronósticos de un fantasma (de 0 a 4 goles por partido) con un solo clic.
*   **Pruebas de Escala:** Ideal para simular miles de combinaciones de puntajes, verificar el ordenamiento de desempates de la tabla y evaluar el rendimiento visual de la interfaz.

---

## 🛠️ Estructura del Proyecto

```text
src/
├── assets/          # Imágenes, logos y recursos vectoriales estáticos
├── components/      # Componentes de UI puramente presentacionales (Dumb)
│   ├── admin/       # Control de whitelist, carga de marcadores, creador de fantasmas
│   ├── auth/        # Tarjetas de Login y flujo de registro restringido
│   ├── common/      # Shimmer skeletons, botones premium HSL, cards reutilizables
│   ├── prode/       # Fixture interactivo por grupos y controles de predicción
│   └── profile/     # Estadísticas del perfil y visualizador de avatars
├── containers/      # Orquestadores y lógica de estado en Firestore (Smart)
│   └── AppContainer.tsx
├── contexts/        # Proveedores de estado global (Autenticación y Sesión)
├── hooks/           # Hooks personalizados para modularizar efectos secundarios
├── services/        # Capa de infraestructura (APIs de Firebase y base de datos)
│   ├── db.ts        # Métodos de lectura/escritura, lotes y aleatorizador de fantasmas
│   ├── firebase.ts  # Configuración inicial del SDK y detector de modo Mock
│   └── scoringEngine.ts # Reglas del juego para evaluar aciertos de goles
├── types/           # Interfaces y definiciones de tipos de TypeScript
├── index.css        # Tokens de diseño HSL y estilos globales de reset
└── main.tsx         # Punto de entrada para el renderizado del DOM
```

---

## ⚡ Instalación y Desarrollo Local

### 1. Configuración de Variables
Para ejecutar el proyecto conectado a una base de datos real de Firebase, crea un archivo `.env.local` en la raíz del proyecto:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_auth_domain.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_storage_bucket.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=1:tu_app_id
```

> [!TIP]
> Si no configuras las variables de entorno, la aplicación **inicia automáticamente en Modo Mock Local**. Emula Firestore y Auth usando `LocalStorage`, permitiéndote probar toda la interfaz, la whitelist y los usuarios fantasmas sin conexión a internet y al instante.

### 2. Comandos Disponibles
Instalar las dependencias del proyecto:
```bash
npm install
```

Iniciar el servidor de desarrollo con Vite:
```bash
npm run dev
```

Compilar y empaquetar para producción:
```bash
npm run build
```

---

## 🛡️ Reglas de Seguridad de Firestore (`firestore.rules`)

El acceso a los documentos en Cloud Firestore está resguardado mediante reglas de seguridad estrictas:
*   **Matches (Partidos):** Solo editables por usuarios administradores; de lectura libre para usuarios autenticados.
*   **Predictions (Predicciones):** Los usuarios solo pueden crear o editar predicciones *propias*, y *únicamente* si el partido correspondiente está en estado `pending` (pendiente de juego).
*   **Whitelist (Lista autorizada):** Modificable únicamente por administradores.
*   **Users (Perfiles):** Los usuarios pueden editar sus propios datos públicos; los administradores tienen visibilidad total sobre perfiles reales y fantasmas.

---

🏆 *Desarrollado con máxima precisión para la competencia grupal definitiva.*
