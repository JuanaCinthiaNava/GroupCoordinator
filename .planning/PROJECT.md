# GroupCoordinator

## What This Is

Un hub web (PWA mobile-first) donde grupos de amigos de 3–15 personas organizan viajes, conciertos, festivales y otras experiencias compartidas sin que la información crítica se pierda en el scroll de WhatsApp. Centraliza itinerario, mapa, votaciones y notas/links/docs en un mismo lugar, accesible por link de invitación.

## Core Value

Que cualquier persona del grupo pueda **encontrar lo importante** (reserva, código, link, decisión) y **cerrar decisiones** del plan sin pelear con el chat — un solo lugar al que volver, no cinco apps.

## Wedge (Positioning)

- **Headline:** Findability — *"Nunca más pierdas la reserva en el chat del grupo."* El lugar donde la info importante no se pierde, no "otra app de planning de viajes".
- **Proof:** Day-of mode — la vista optimizada para el momento del evento (esenciales al frente, mobile-first, funciona aunque el wifi falle) es lo que hace creíble el headline.
- **GTM:** Spanish-first / LATAM — lanzar primero en español apuntando a grupos de amigos en LATAM (viajes, festivales, despedidas) antes de competir en inglés contra TripIt/Heya/Wanderlog.

El wedge prioriza orden de construcción y copy, no recorta features: el itinerario, mapa, votos y notas siguen siendo v1, pero la búsqueda global y el "pin de esenciales" son hero features, no "nice to have".

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

(None yet — ship to validate)

### Active

<!-- Current scope. Building toward these. v1 hypotheses until shipped. -->

- [ ] Crear un "plan de evento" y compartirlo por link de invitación
- [ ] Vista del plan accesible a cualquiera con el link, sin requerir cuenta
- [ ] Cuenta (OAuth Google/Apple) requerida para editar, votar o aportar contenido
- [ ] Itinerario / timeline cronológico con horarios, lugares y notas por item
- [ ] Mapa con lugares guardados (hotel, restaurantes, puntos de interés) compartido y visible para todos
- [ ] Votaciones / encuestas grupales con opciones y cierre claro de la decisión
- [ ] Notas, links, documentos y screenshots compartidos, fácilmente recuperables (anti-WhatsApp-graveyard)
- [ ] Roles flexibles: la app sirve tanto al modo organizador-líder como al modo wiki colaborativo
- [ ] Landing pública en el mismo dominio para soporte de marketing

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Reemplazar WhatsApp como chat principal del grupo — no peleamos contra el chat, lo complementamos
- Grupos persistentes con múltiples eventos en v1 — agrega overhead de membresías; eventos sueltos primero, grupo persistente como capa en v2 si funciona
- Gestión de gastos compartidos en v1 — es un producto en sí mismo (Splitwise); se evalúa para v2 una vez validado el núcleo de coordinación
- Chat / comentarios dentro de la app en v1 — overlapa con WhatsApp; v2 si surge necesidad
- Apps nativas iOS/Android separadas — PWA mobile-first cubre el caso de uso on-the-go con una sola codebase
- Backend self-hosted complejo / infraestructura empresarial — es un side project, no debe sobre-ingenierarse

## Context

- **Mercado existente y crowded:** TripIt, Heya, Backstreet, Notion templates, Splitwise, y los pedazos sueltos de WhatsApp + Google Maps cubren partes de este problema. Ninguno gana claramente para "amigos coordinando un viaje/evento puntual".
- **El dolor más citado por el creador es la pérdida de información en el scroll de chat** (link de reserva, código de entrada, dirección). La app gana o pierde por *findability*, no por features sofisticadas.
- **Patrón de uso esperado:** pico de actividad pre-evento (planificación), uso intenso durante el evento (consulta on-the-go), enfriamiento post-evento. Por eso PWA mobile-first.
- **Modelo de onboarding híbrido** elegido porque la fricción al consultar mata la adopción grupal: si un miembro necesita signup solo para ver el itinerario, el grupo abandona y vuelve a WhatsApp.
- **Roadmap diferido conocido:** gestión de gastos (Splitwise integrado) y álbum/recap post-evento (retención + viralidad) son candidatos fuertes para v2 una vez validado el núcleo.
- **Wedge competitivo aún no definido** — pendiente de surfacing en la fase de research (analizar TripIt, Heya, Notion, Splitwise) y validar hipótesis: "setup en 30 segundos", "todo-en-uno realmente unificado", o "UX para el momento del viaje".

## Constraints

- **Tipo de proyecto**: Side project con ambición de portfolio y marketing público — el polish y la marca importan, pero no se justifican inversiones de tiempo en infraestructura empresarial (SOC2, escalado masivo, multi-tenancy compleja).
- **Plataforma**: Web responsive con PWA mobile-first — un solo codebase, instalable, link compartible es la URL real, mismo dominio para landing/marketing. A confirmar en research.
- **Stack**: Sin preferencia rígida; investigar y elegir algo moderno, marketable y con buena curva de aprendizaje (probable Next.js + Postgres/Supabase, a validar).
- **Tamaño de grupo objetivo**: 3–15 personas; no optimizar para grupos de 50+ en v1.
- **Auth**: OAuth Google/Apple para minimizar fricción; sin email/password en v1.
- **Idioma inicial**: Español (mercado primario del creador); i18n no obligatorio en v1 pero diseñar sin asumir inglés hardcodeado.

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Core value = "coordinar planes con findability", no "centralizar todo" | El dolor real es perder info en el scroll y no cerrar decisiones, no la falta de un drive grupal | — Pending |
| Eventos sueltos en v1, grupos persistentes en v2 | Simplifica modelo de datos, onboarding y permisos; permite validar el core antes de invertir en gestión de membresías | — Pending |
| Onboarding híbrido: ver con link sin cuenta, editar con OAuth | Cero fricción para consulta (clave para adopción grupal); fricción aceptable solo para acciones con consecuencias | — Pending |
| Gestión de gastos fuera de v1 | Es un producto completo en sí mismo; meterlo diluye el foco del core. Roadmap v2 confirmado. | — Pending |
| PWA mobile-first sobre un dominio web público (no apps nativas) | Side project con ambición de marketing → un solo deploy sirve app + landing; PWA cubre uso on-the-go | — Pending — validar en research |
| Stack delegado a research | Sin preferencia del creador; mejor decidirlo con investigación contextual | ✓ Resuelto — Next.js 15.5 + Supabase + MapLibre + shadcn (ver research/STACK.md) |
| Wedge: Findability + Day-of + Spanish-first | 4 researchers convergieron; mercado bimodal deja vacante el momento on-trip; "todo-en-uno" es anti-wedge de 8+ competidores muertos; LATAM underserved | ✓ Locked en research/SUMMARY.md |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-20 after initialization*
