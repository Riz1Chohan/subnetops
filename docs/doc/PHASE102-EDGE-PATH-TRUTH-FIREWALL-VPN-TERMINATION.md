# Phase 102 — Edge Path Truth and Firewall/VPN Termination

Marker: `PHASE_102_EDGE_PATH_TRUTH_FIREWALL_VPN_TERMINATION`

## Purpose

Phase 102 fixes the remaining diagram truth problem found after Phase 101: physical and WAN views could still let a core gateway steal the WAN/security-edge role when its notes mentioned security or VPN context. That made the HQ firewall appear disconnected even when the UI copy promised that VPN tunnels terminate on the security edge when present.

## Fixes

- Security/VPN edge detection is now label-first.
- A device labeled firewall/security/perimeter is preferred over a core gateway for VPN termination.
- Notes are no longer allowed to turn `HQ Core Gateway` into a firewall/VPN edge.
- Local Internet/ISP underlay connects to the security/VPN edge first.
- Security/VPN edge connects inward to the core/distribution gateway.
- Branch IPsec VPN overlay tunnels terminate on the HQ firewall/security edge when present.
- Icon role detection is also label-first so gateway icons are not accidentally rendered as firewalls.

## Expected visual path

For a site with firewall and core devices:

`Local ISP / Internet -> Security or VPN Edge -> Core / Distribution Gateway`

For branches without a dedicated firewall:

`Local ISP / Internet -> Branch Gateway -> IPsec VPN tunnel -> HQ Security/VPN Edge`

## Verification boundary

Static checks prove the source contains the corrected label-first role detection, explicit edge/core helpers, Phase 102 runtime marker, and release artifact discipline. Final truth still requires Render deployment and screenshots showing the firewall/security edge in-path.
