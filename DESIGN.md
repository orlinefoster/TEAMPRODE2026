# Guía de Diseño Visual y Experiencia (DESIGN.md)

Este documento define la estética, la paleta de colores y las pautas UX/UI para la web-app **Prode Mundial 2026**.
Buscamos un diseño **limpio, minimalista y ultra-premium**, huyendo de colores saturados genéricos. Utilizaremos variables HSL para una gestión elegante del color, permitiendo una experiencia premium tanto en modo oscuro (por defecto) como en transiciones de interacción.

---

## 1. Concepto Visual: "Sleek Stadium"
La interfaz evoca la elegancia y la emoción del fútbol de élite mundialista. Usamos grises profundos, acentos dorados y toques de verde césped suave para crear una atmósfera inmersiva, limpia y deportiva pero ejecutada con un estándar premium (efectos de glassmorphism y tipografía moderna).

---

## 2. Paleta de Colores (Tokens HSL)

Definiremos los siguientes tokens de color en nuestro archivo `index.css`. Todos los componentes deben usar estas variables.

```css
:root {
  /* Fondo y Contenedores */
  --bg-main: HSL(220, 20%, 8%);        /* Gris oscuro profundo (estadio nocturno) */
  --bg-card: HSL(220, 16%, 12%);       /* Gris intermedio para tarjetas y paneles */
  --bg-overlay: HSL(220, 16%, 16%);    /* Grises para modales o popups */
  
  /* Bordes y Líneas */
  --border-light: HSL(220, 12%, 18%);   /* Bordes muy sutiles */
  --border-active: HSL(45, 80%, 45%);  /* Dorado suave para elementos seleccionados */

  /* Colores de Acento (Deportivos y Premium) */
  --accent-gold: HSL(45, 85%, 50%);    /* Dorado de la copa mundial (destacados, puntajes) */
  --accent-green: HSL(142, 60%, 45%);   /* Verde césped suave (aciertos, completado) */
  --accent-blue: HSL(200, 85%, 55%);   /* Azul suave para enlaces secundarios o información */
  --accent-error: HSL(0, 75%, 50%);    /* Rojo sutil para alertas o errores */

  /* Tipografía */
  --text-main: HSL(220, 15%, 92%);     /* Blanco roto para máxima legibilidad sin fatiga */
  --text-muted: HSL(220, 10%, 65%);    /* Gris claro para subtítulos y metadatos */
  --text-dark: HSL(220, 20%, 15%);     /* Color de texto para contrastes claros */

  /* Sombras y Efectos */
  --shadow-sm: 0 2px 8px RGBA(0, 0, 0, 0.2);
  --shadow-md: 0 8px 24px RGBA(0, 0, 0, 0.4);
  --glass-bg: RGBA(20, 24, 33, 0.7);
  --glass-blur: blur(12px);
}
```

---

## 3. Tipografía y Jerarquía

Utilizaremos **Outfit** (o **Inter** como fallback) para dar un aspecto extremadamente moderno, tecnológico y limpio.

- **Títulos Principales (`h1`)**: `size: 2.25rem (36px)`, `weight: 800 (Extra Bold)`. Tracking estrecho para un aspecto fuerte.
- **Títulos de Tarjetas / Secciones (`h2`, `h3`)**: `size: 1.5rem / 1.25rem`, `weight: 600 (Semi Bold)`.
- **Cuerpo de Texto (`p`, `span`)**: `size: 1rem (16px)`, `weight: 400 (Regular)`.
- **Datos Estadísticos / Marcadores**: `size: 1.75rem (28px)`, `weight: 700 (Bold)`. Monospace o fuentes de números de alta legibilidad para marcadores del Prode.

---

## 4. Lineamientos de Componentes Clave

### A. Ficha de Partido (Match Card)
- **Estructura**: Horizontal en desktop, compacta y vertical en mobile.
- **Alineación**: Escudos de equipos a los lados, predicción numérica centralizada con un marco dorado o verde sutil según acierto.
- **Micro-interacción**: Al hacer hover sobre una fila de predicción, el borde se ilumina sutilmente con `--border-active`.

### B. Tabla de Posiciones y Rankings
- **Estilo**: Tabla limpia con filas alternadas muy sutilmente en `--bg-overlay`.
- **Destacados**: Los primeros 3 puestos del ranking deben llevar medallas visuales sutiles (Dorado `--accent-gold`, Plata, Bronce) en lugar de números planos.
- **Privacidad**: Mostrar un indicador visual de si el Prode de esa persona está completo (`--accent-green` con check) o pendiente (`--text-muted` con reloj).

### C. Formulario de Predicción (Llenado de Prode)
- **Validación en tiempo real**: Si el usuario introduce valores no numéricos, el input debe tornarse `--accent-error` de forma suave.
- **Guardado Automático (Auto-Save)**: Al cambiar de foco en cada input de gol, debe dispararse una micro-animación en la esquina (ej. spinner diminuto de guardando en Firestore) para dar feedback inmediato al usuario de que no perderá sus datos.

---

## 5. Accesibilidad y Responsividad

- **Contraste**: Cumplir con los estándares WCAG AA en todas las combinaciones de texto sobre fondo.
- **Mobile-First**: El llenado del Prode se realiza típicamente desde teléfonos. Toda la botonera de grupos y los inputs de marcadores deben ser de tamaño amigable al tacto (mínimo 44x44px de área interactiva).
- **Esqueletos de Carga (Skeletons)**: En lugar de spinners de carga genéricos que rompen el diseño, usaremos animaciones de gradientes (shimmer effects) sobre las formas exactas de las tarjetas de partidos.
