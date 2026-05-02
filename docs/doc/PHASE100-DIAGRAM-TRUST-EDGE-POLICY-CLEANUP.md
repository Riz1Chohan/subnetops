# Phase 100 — Diagram Trust, Edge Semantics, and Policy Classification Cleanup

Marker: `PHASE_100_DIAGRAM_TRUST_EDGE_POLICY_CLEANUP`

Phase 100 is a trust and cleanup pass for the professional topology canvas after the Phase 99 hub/spoke topology correction.

## Fixed

- Security policy matrix classification now gives deny/block/isolation language precedence over allow/approved language, preventing rules such as “Deny users to management plane” from appearing under Allowed / Permitted.
- Physical and WAN canvases no longer render the Site object as a peer topology bubble; the site is shown as a container/area label.
- Physical and WAN canvases drop raw model relationship edges before adding professional presentation connectors.
- VPN overlay connectors are generated deterministically between branch edge devices and the HQ edge device, instead of reusing raw WAN summary relationships.
- Local ISP/Internet underlay and firewall-to-core/internal handoff remain visually separate from VPN overlay tunnels.
- DHCP pools are no longer rendered as fake physical topology devices; DHCP remains a service/addressing attribute rather than a router/switch/firewall object.
- Raw relationship labels such as VLAN membership, site device, site core, site edge, and DHCP scope summary are suppressed from professional topology views.
- Floating route-domain objects are removed from normal topology canvases to prevent the logical view from reading like a database graph.
- Security matrix policy cards use longer summaries and normal wrapping to reduce trust-killing truncation.

## Remaining truth

This phase improves the diagram credibility and fixes the classification bug seen in screenshots. It does not claim vendor-specific implementation readiness. Implementation execution is still blocked until live inventory, management addressing, backups, rollback proof, device/vendor details, and change-window evidence are modeled.
