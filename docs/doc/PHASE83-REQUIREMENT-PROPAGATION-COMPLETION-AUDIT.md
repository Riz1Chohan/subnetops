# Phase 83 — Requirement Propagation Completion Audit

Phase 83 finishes the next real propagation gap after Phase 79–82 made requirement materialization visible and usable.

## Scope

- Keep the runtime marker current with `PHASE_83_REQUIREMENT_PROPAGATION_COMPLETION_AUDIT`.
- Fix the Phase 81 truth gate that counted only proposal rows and therefore reported `addressing rows 0` even when authoritative design-core addressing rows existed.
- Make the requirement impact closure distinguish captured fields from handled/inventoried fields so the remaining 81/83 style gap is explicit instead of ambiguous.
- Repair the management scenario proof by recognizing management VLAN/interface object evidence instead of requiring a literal interface name containing `management`.
- Promote DHCP from a boolean VLAN flag into durable `DesignDhcpScope` rows during requirements materialization/read-repair.
- Extend read-repair so an existing project with Sites/VLANs but missing DHCP scopes is repaired on design/report reads.

## Expected runtime result

For the 10-site hybrid/security scenario, the app should continue to show materialized Sites, VLANs, addressing rows, topology evidence, and report inputs. The requirement scenario proof should no longer block only because management object-model evidence was missed, and the Phase 83 report gate should show the real authoritative addressing row count.

## Boundary

Phase 83 does not claim implementation readiness. Security policy defaults, operational safety, live inventory, vendor syntax, DHCP options, reservations, brownfield import, IPAM pools, and platform/BOM still require later review or dedicated phases.
