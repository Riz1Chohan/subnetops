# Phase 52 — Engine 2 DHCP / Reservation Truth

Phase 52 stops treating DHCP as only a boolean flag.

## What changed

- Durable DHCP scope records are now included in design-core data.
- Durable reservation records are now included in design-core data.
- Engine 2 validates:
  - scope CIDR parsing,
  - default gateway inside the scope,
  - DNS evidence presence,
  - duplicate reservations,
  - reservation inside the scope,
  - reservation conflict with gateway.

## Boundary

The engine validates DHCP truth when scope/reservation records exist. The current UI still needs full CRUD screens for managing these objects directly.
