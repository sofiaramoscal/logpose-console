# Log Pose Console

Consola de la Guild de Cazarrecompensas — Hackathon Frontend CS2031 DBP (One Piece: Rumbo al Grand Line).

## Integrantes

| Nombre | Código |
| --- | --- |
| _aNTHONY_ | _202510031 |
| _Sofia ramos_ | _2025_ |
| _completar_ | _completar_ |

## Cómo ejecutar

Requisitos: Node 24 LTS y npm.

```bash
npm install
cp .env.example .env.local   # contiene VITE_API_BASE_URL
npm run dev                  # http://localhost:5173
```

Otros comandos:

```bash
npm run typecheck   # TypeScript estricto
npm run build       # build de producción en dist/
```

## Variables de entorno

| Variable | Valor |
| --- | --- |
| `VITE_API_BASE_URL` | `https://logpose-api-jg7f.onrender.com/api/v1` |

La URL base nunca está escrita en el código: se lee de `import.meta.env.VITE_API_BASE_URL`.

## Rutas

| Ruta | Checkpoint |
| --- | --- |
| `/login`, `/register` | CP1 |
| `/dashboard` | CP1 |
| `/wanted?page&size&status&crewId&fruit&q&sort` y `/wanted/:id` | CP2 |
| `/news?type&priority&status` y `/news/:id` | CP4 |
| `/sagas` y `/sagas/:id?etapa=<slug>` | CP5 |
| cualquier otra | Página 404 |

## Decisiones técnicas

- **Sesión (CP1):** el JWT y su `expiresAt` se guardan en `localStorage`. Al recargar, `AuthContext` queda en estado `checking` y valida el token con `GET /auth/me` sin mostrar el login. Un interceptor de Axios agrega `Authorization: Bearer` y, ante un `401`, cierra la sesión. Un `500` al verificar no cierra la sesión: muestra un reintento. `RequireAuth` guarda la URL completa pedida (`from`) para volver exactamente ahí después del login o del registro.
- **Registro (CP1):** validación local con las reglas del contrato y errores del servidor junto al campo (`EMAIL_ALREADY_REGISTERED` → email, `TEAM_NAME_TAKEN` → nombre, `details[].field` de `VALIDATION_ERROR`).
- **Carteles (CP2):** la URL es la única fuente de verdad (`useSearchParams`). Los valores inválidos caen a su default y la URL se corrige con `replace`. Cambiar filtros vuelve a la página 0, y si la página no existe se lleva a la última que sí existe. La búsqueda usa debounce. Cada cambio aborta la request anterior (`AbortController`) y se descarta cualquier respuesta que no sea la última (`requestId`). La tabla reserva la altura de una página completa. El detalle es una ruta hija dibujada encima del listado, que no se desmonta.
- **Noticias (CP4):** infinite scroll con `IntersectionObserver` sobre un sentinel. Hay una sola request en vuelo (ref `inFlight`), deduplicación por id con `Map` y un contador de generación que descarta respuestas de filtros viejos. Un error posterior conserva lo cargado. Un cursor inválido reinicia el feed. Al verificar, el feed se reconcilia (reemplaza o retira la noticia según el filtro); el `409` usa `current`.
- **Saga (CP5):** cada etapa es una `<section>` activada por `IntersectionObserver`. Mapa SVG con las coordenadas de la API: islas, ruta recorrida con `stroke-dashoffset` y barco en la isla activa. Paleta y métricas de la etapa activa. Progreso con CSS Scroll-driven Animations (`view-timeline` + `timeline-scope`) y fallback en JS. La View Transition API se usa entre `/sagas` y la historia, con navegación normal si no hay soporte. La etapa activa vive en `?etapa=<slug>`. Se respeta `prefers-reduced-motion`. Teclado: Tab, flechas y botones por etapa.
- **Sin librerías prohibidas:** no se usa React Query/SWR, UI kits ni librerías de animación o infinite scroll.
