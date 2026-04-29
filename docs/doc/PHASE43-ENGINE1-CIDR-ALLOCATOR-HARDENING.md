# Phase 43 — Engine 1 CIDR and Allocator Hardening

## Scope

This pass is intentionally limited to Engine 1:

- CIDR parsing and subnet math
- Prefix recommendation logic
- Address allocator safety
- Backend snapshot CIDR output fields
- Frontend consumption of CIDR facts

Routing, security policy, implementation templates, report truth, and other engines were not expanded in this pass except where they consume existing CIDR outputs.

## Problem fixed

The previous CIDR prefix recommendation function had a serious bug:

```ts
parseCidr(`0.0.0.0/`)
```

It should have evaluated each candidate prefix:

```ts
parseCidr(`0.0.0.0/${prefix}`)
```

That bug could break host-count-to-prefix recommendations and poison downstream allocator decisions.

## Engineering hardening added

### 1. Strict CIDR parsing

The CIDR engine now rejects malformed CIDR strings with extra slash parts, invalid prefixes, invalid IPv4 integers, and leading-zero IPv4 octets.

### 2. Buffered capacity planning

Engine 1 now exposes a `recommendedCapacityPlanForHosts()` function. It reports:

- requested hosts
- segment role
- buffer multiplier
- required usable host target
- recommended prefix
- recommended usable capacity
- explanation notes

The design core now marks a subnet as undersized when it fails the role-aware buffered host target, not merely when it fails the raw host count.

Example:

- 50 user hosts
- 30% user growth buffer
- required usable hosts: 65
- `/26` has 62 usable hosts
- result: undersized
- recommendation: `/25`

### 3. WAN transit sizing corrected

WAN transit still recommends `/31` for one or two endpoints. For more than two requested endpoints, it no longer blindly returns `/30`; it finds a prefix that actually fits the requested endpoint count.

### 4. Allocator safety

The allocator now:

- rejects invalid requested prefixes
- validates block-size prefixes
- ignores malformed used ranges instead of letting bad range data poison placement

### 5. Backend output made richer

Address rows now expose backend CIDR facts, including:

- network address
- broadcast address
- first usable IP
- last usable IP
- dotted mask
- wildcard mask
- total addresses
- usable hosts
- required usable hosts
- recommended usable hosts
- recommended prefix
- capacity headroom
- capacity basis
- proposed correction subnet and gateway

Site blocks and organization blocks now expose CIDR capacity facts too.

### 6. Frontend usage improved

The frontend now surfaces Engine 1 output instead of hiding it:

- configured subnet
- proposed subnet correction
- mask and wildcard mask
- network-to-broadcast range
- usable range
- gateway state and convention
- usable vs estimated vs required capacity
- recommended prefix
- capacity state
- site block capacity from backend output
- organization capacity from backend output

No browser-side subnet math was added. The frontend remains a display/explain/filter/visualize layer for backend CIDR truth.

## Timeout containment

A scoped Engine 1 proof command was added:

```bash
npm run check:engine1-cidr
```

This first runs a dependency-free static output check, then runs only the CIDR/allocator/design-core selftests. It avoids using the full all-engine selftest chain when the current work is only Engine 1.

## Verification limits

The package still needs full dependency install and TypeScript build proof in a real local/GitHub/Render environment. The sandbox cannot prove `npm ci` when package dependencies are unavailable or network access times out.
