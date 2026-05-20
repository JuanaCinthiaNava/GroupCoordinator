# Requirements: GroupCoordinator

**Defined:** 2026-05-20
**Core Value:** Que cualquier persona del grupo pueda encontrar lo importante y cerrar decisiones del plan sin pelear con el chat — un solo lugar al que volver, no cinco apps.
**Wedge:** Findability (headline) + Day-of mode (proof) + Spanish-first (GTM)

## v1 Requirements

Requirements para el lanzamiento inicial. Cada uno mapea a una fase del roadmap.

### Authentication (AUTH)

- [ ] **AUTH-01**: Usuario puede ver un plan compartido por link de invitación sin crear cuenta (sesión anónima)
- [ ] **AUTH-02**: Usuario puede iniciar sesión con Google OAuth
- [ ] **AUTH-03**: Usuario puede iniciar sesión con Apple OAuth
- [ ] **AUTH-04**: Una sesión anónima existente se "upgradea" a cuenta autenticada al hacer login (no se pierde el contexto del plan en el que está)
- [ ] **AUTH-05**: La sesión de usuario persiste entre refreshes del navegador
- [ ] **AUTH-06**: Cualquier acción que modifica datos (editar, votar, agregar) requiere cuenta autenticada con redirect transparente al login

### Plan Lifecycle (PLAN)

- [ ] **PLAN-01**: Usuario autenticado puede crear un nuevo plan de evento con título, fechas y descripción opcional
- [ ] **PLAN-02**: El creador de un plan obtiene un link de invitación único y compartible (URL legible para WhatsApp)
- [ ] **PLAN-03**: Cualquier persona con el link de invitación puede acceder a la vista de solo-lectura del plan sin crear cuenta
- [ ] **PLAN-04**: El creador del plan puede revocar el link de invitación (regenerar) si se filtró
- [ ] **PLAN-05**: El creador del plan puede archivar/eliminar el plan
- [ ] **PLAN-06**: Usuario autenticado puede ver una lista de los planes en los que participa

### Itinerary (ITIN)

- [ ] **ITIN-01**: Usuario autenticado puede agregar un item al itinerario con título, fecha/hora, lugar (opcional) y notas (opcional)
- [ ] **ITIN-02**: Usuario autenticado puede editar y eliminar items del itinerario
- [ ] **ITIN-03**: El itinerario se muestra en vista cronológica agrupada por día
- [ ] **ITIN-04**: Items del itinerario pueden vincular a un lugar guardado del mapa
- [ ] **ITIN-05**: Cambios al itinerario se reflejan al refrescar (no requiere realtime en v1)

### Map & Places (MAP)

- [ ] **MAP-01**: Usuario autenticado puede agregar un "lugar guardado" al plan con nombre, dirección (geocodificada) y categoría (hotel/comida/punto de interés/otro)
- [ ] **MAP-02**: Todos los miembros del plan ven el mismo mapa con los lugares guardados como pins
- [ ] **MAP-03**: Tocar un pin abre detalle del lugar con nombre, dirección, link a Google Maps/Apple Maps externos
- [ ] **MAP-04**: Usuario autenticado puede editar y eliminar lugares guardados
- [ ] **MAP-05**: El mapa funciona sin clave de API propia (usa tile provider gratuito tipo MapTiler/OpenFreeMap)

### Voting & Decisions (VOTE)

- [ ] **VOTE-01**: Usuario autenticado puede crear una votación con pregunta y 2-10 opciones
- [ ] **VOTE-02**: Una votación puede ser simple (una opción) o múltiple (varias opciones por persona)
- [ ] **VOTE-03**: Una votación tiene fecha de cierre opcional; al cerrarse muestra resultado final claro
- [ ] **VOTE-04**: Usuario autenticado puede votar/cambiar su voto antes del cierre
- [ ] **VOTE-05**: Los resultados se ven en tiempo real (recuento por opción, opcional: quién votó qué)
- [ ] **VOTE-06**: El creador puede cerrar manualmente una votación antes de la fecha de cierre

### Notes, Links & Documents (NOTE)

- [ ] **NOTE-01**: Usuario autenticado puede crear una "nota" con texto rico básico (markdown o WYSIWYG ligero)
- [ ] **NOTE-02**: Usuario autenticado puede pegar un link y agregarlo como item con título y descripción
- [ ] **NOTE-03**: Usuario autenticado puede subir un archivo (imagen, PDF) hasta 10 MB
- [ ] **NOTE-04**: Las notas, links y archivos se organizan en una lista consultable separada del itinerario
- [ ] **NOTE-05**: Usuario autenticado puede editar y eliminar notas/links/archivos propios

### Findability (FIND) — wedge enabler

- [ ] **FIND-01**: Hay una búsqueda global del plan accesible con un solo tap/atajo de teclado
- [ ] **FIND-02**: La búsqueda encuentra contenido en notas, items del itinerario, lugares del mapa y opciones de votación
- [ ] **FIND-03**: Resultados muestran tipo de item (icono), título y snippet del contexto donde se encontró el match
- [ ] **FIND-04**: Existe un panel "Esenciales" pineado al inicio del plan donde cualquier miembro puede pinear items críticos (códigos, reservas, direcciones)
- [ ] **FIND-05**: Un item pineado muestra qué tipo es (nota/link/lugar/itinerario) y abre su detalle al tocarlo
- [ ] **FIND-06**: Hay un feed de actividad "¿Qué pasó?" que muestra cambios desde la última visita del usuario al plan
- [ ] **FIND-07**: El feed agrupa eventos por tipo (X agregó, X votó, X cambió) y se marca como leído al ser visto

### Virality & Magic (VIRAL)

- [ ] **VIRAL-01**: Al pegar una URL en una nota o item, la app extrae metadata automáticamente (título, descripción, imagen, lugar si aplica) y la muestra como preview enriquecido

### Day-of Mode (DAYOF) — wedge proof

- [ ] **DAYOF-01**: Existe una vista "modo evento" optimizada para mobile que muestra los items de hoy del itinerario al frente
- [ ] **DAYOF-02**: El "modo evento" muestra los items pineados de Esenciales prominentemente
- [ ] **DAYOF-03**: El plan accedido se cachea localmente (service worker) para consulta offline básica de items ya cargados
- [ ] **DAYOF-04**: La app es instalable como PWA (manifest + service worker + icono)

### Localization (I18N)

- [ ] **I18N-01**: Toda la UI está en español neutro como idioma por defecto
- [ ] **I18N-02**: El código está estructurado con i18n (next-intl o similar) — sin strings hardcodeados en componentes
- [ ] **I18N-03**: Fechas, horas y números se muestran con formato adecuado a la locale del usuario

### Public Landing (LAND)

- [ ] **LAND-01**: Existe una landing pública en `/` con copy del wedge (Findability), CTA para crear un plan, y screenshot del producto
- [ ] **LAND-02**: La landing tiene OG tags básicos para que se vea bien al compartirla en WhatsApp/Twitter
- [ ] **LAND-03**: La landing tiene secciones: hero, "cómo funciona" (3 pasos), features destacadas, FAQ corto
- [ ] **LAND-04**: La landing está optimizada para Lighthouse mobile ≥90 en performance/accessibility/SEO

## v2 Requirements

Diferidas conscientemente al siguiente milestone.

### Expense Splitting (EXP)

- **EXP-01**: Usuario autenticado puede registrar un gasto (quién pagó, monto, descripción)
- **EXP-02**: Gastos se dividen entre miembros (igualmente o con porcentajes/montos custom)
- **EXP-03**: La app calcula deudas netas (quién le debe a quién) en el cierre del plan
- **EXP-04**: Soporte multi-moneda básico (al menos USD/ARS/EUR/MXN/CLP)

### Photo Album & Recap (RECAP)

- **RECAP-01**: Miembros pueden subir fotos del evento a un álbum compartido
- **RECAP-02**: Al cerrarse el plan se genera un "recap" automático: timeline + fotos + decisiones tomadas
- **RECAP-03**: El recap es compartible como página pública (opcional) o privada

### Persistent Groups (GRP)

- **GRP-01**: Un grupo de amigos persistente puede tener múltiples planes a lo largo del tiempo
- **GRP-02**: Miembros de un grupo se reutilizan automáticamente al crear un nuevo plan dentro del grupo
- **GRP-03**: Historial del grupo y reconocimiento de "habituales"

### Realtime Collaboration (RT)

- **RT-01**: Cambios al itinerario y votaciones se propagan en tiempo real entre miembros conectados
- **RT-02**: Indicadores de "X está editando" durante edición concurrente

### Polish & Adoption (POLISH)

- **POLISH-01**: OG link previews dinámicos del plan (cuando se comparte el link, sale preview con título/fecha/ubicación)
- **POLISH-02**: Notificaciones push para cambios importantes (votación creada, item pineado nuevo, día del evento)
- **POLISH-03**: Recordatorios automáticos pre-evento ("tu viaje empieza en 2 días")
- **POLISH-04**: Plantillas pre-armadas (viaje a la playa, festival, concierto) que pueblan items de ejemplo

## Out of Scope

Excluido explícitamente. Documentado para prevenir scope creep.

| Feature | Razón |
|---------|-------|
| Chat / mensajería dentro de la app | Compite contra WhatsApp directamente — el wedge dice "complementamos WhatsApp, no lo reemplazamos" |
| Generación de itinerarios con AI | Anti-feature de FEATURES.md — vende humo, baja retención, todos los competidores lo intentaron y fallaron |
| Booking / pagos integrados (hoteles, vuelos) | Complejidad regulatoria, integraciones costosas, no es el core del problema |
| Parsing automático de emails (estilo TripIt) | OAuth a Gmail es fricción enorme y deshace el atractivo del onboarding por link |
| Live location sharing | Privacy hot potato, no relacionado al wedge, agrega responsabilidad enorme |
| Roles granulares / RBAC (admin/editor/viewer separados) | Para grupos de 3-15 amigos es overkill; sistema simple "miembro autenticado vs link-viewer" alcanza |
| Apps nativas iOS/Android separadas | PWA mobile-first cubre el caso de uso; mantener una sola codebase es crítico para side project |
| Multi-moneda con conversión en tiempo real | Diferido junto con expense splitting a v2 |
| Email/password como método de auth | OAuth Google/Apple cubre 99% del mercado objetivo con menos fricción y código |
| Soporte para grupos de 50+ personas | Optimización innecesaria para v1; el sweet spot es 3-15 |

## Traceability

Mapeo de requirements a fases. Se completa durante la creación del roadmap.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | TBD | Pending |
| AUTH-02 | TBD | Pending |
| AUTH-03 | TBD | Pending |
| AUTH-04 | TBD | Pending |
| AUTH-05 | TBD | Pending |
| AUTH-06 | TBD | Pending |
| PLAN-01 | TBD | Pending |
| PLAN-02 | TBD | Pending |
| PLAN-03 | TBD | Pending |
| PLAN-04 | TBD | Pending |
| PLAN-05 | TBD | Pending |
| PLAN-06 | TBD | Pending |
| ITIN-01 | TBD | Pending |
| ITIN-02 | TBD | Pending |
| ITIN-03 | TBD | Pending |
| ITIN-04 | TBD | Pending |
| ITIN-05 | TBD | Pending |
| MAP-01 | TBD | Pending |
| MAP-02 | TBD | Pending |
| MAP-03 | TBD | Pending |
| MAP-04 | TBD | Pending |
| MAP-05 | TBD | Pending |
| VOTE-01 | TBD | Pending |
| VOTE-02 | TBD | Pending |
| VOTE-03 | TBD | Pending |
| VOTE-04 | TBD | Pending |
| VOTE-05 | TBD | Pending |
| VOTE-06 | TBD | Pending |
| NOTE-01 | TBD | Pending |
| NOTE-02 | TBD | Pending |
| NOTE-03 | TBD | Pending |
| NOTE-04 | TBD | Pending |
| NOTE-05 | TBD | Pending |
| FIND-01 | TBD | Pending |
| FIND-02 | TBD | Pending |
| FIND-03 | TBD | Pending |
| FIND-04 | TBD | Pending |
| FIND-05 | TBD | Pending |
| FIND-06 | TBD | Pending |
| FIND-07 | TBD | Pending |
| VIRAL-01 | TBD | Pending |
| DAYOF-01 | TBD | Pending |
| DAYOF-02 | TBD | Pending |
| DAYOF-03 | TBD | Pending |
| DAYOF-04 | TBD | Pending |
| I18N-01 | TBD | Pending |
| I18N-02 | TBD | Pending |
| I18N-03 | TBD | Pending |
| LAND-01 | TBD | Pending |
| LAND-02 | TBD | Pending |
| LAND-03 | TBD | Pending |
| LAND-04 | TBD | Pending |

**Coverage:**
- v1 requirements: 51 total
- Mapped to phases: 0 (pending roadmap)
- Unmapped: 51 ⚠️ (resolved at roadmap creation)

---
*Requirements defined: 2026-05-20*
*Last updated: 2026-05-20 after initial definition*
