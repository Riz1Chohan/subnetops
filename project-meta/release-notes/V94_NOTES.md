# SubnetOps v94 Notes

## Purpose of v94
This version continues the Recovery Roadmap after v93 by making traffic paths, security boundaries, and DMZ behavior more explicit and less generic.

## What changed

### 1. Stronger DMZ / edge modeling
- The synthesis now tries to identify a DMZ-capable server/service subnet at the primary site.
- DMZ-capable services are surfaced as explicit `dmz-service` placement objects.
- Published services now include external exposure context and ingress path hints.

### 2. Security boundaries now carry real policy details
Boundary rows now include:
- inbound policy
- east-west policy
- management source expectation
- NAT posture

This makes the security output more like an actual boundary design instead of a zone label with generic notes.

### 3. Traffic flows now include route, NAT, and enforcement logic
Critical flows now surface:
- route model
- NAT behavior
- enforcement policy

This improves the realism of:
- user to internet
- guest to internet
- user to shared service
- management to infrastructure
- branch to centralized service
- internet to DMZ service
- site to cloud service
- remote user to internal service

### 4. Topology-aware path behavior improved
Flow rows now change their route model based on topology type, especially for:
- collapsed core
- hub-and-spoke
- hybrid-cloud
- peer multi-site

### 5. Overview and report surfaces updated
The overview and report now expose the new route/NAT/enforcement details instead of only showing basic path text.

## What v94 still does NOT solve yet
- final report restructure around full site-by-site LLD
- full validation-to-fix navigation
- full UI cleanup / control cleanup
- real topology diagram engine with device icons and real link types
- brownfield ingestion and reconciliation
- vendor-aware implementation templates

## Recommended next version
v95 should focus on:
- report rebuild around explicit design facts
- stronger site-by-site LLD sections
- cleaner consumption of topology / placement / security / flow data across the report
