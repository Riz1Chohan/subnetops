# Phase 74 — Report and Diagram Truth Lock

## Purpose

Phase 74 prevents SubnetOps from presenting a polished report or diagram as usable when the selected requirements have not generated engineering evidence.

The user-facing failure that triggered this phase was severe: requirements declared a multi-site design, but exports still showed zero sites, zero addressing rows, blocked scenario proof, and fallback single-site language.

## Scope

This phase does not add new planner features. It hardens truth presentation:

- Reports must compare requirement-selected site count against materialized Site rows.
- Reports must expose missing requirement-output evidence near the top.
- Reports must not fall back to compact single-site architecture language when requirements declare multi-site intent.
- Report metadata must become blocked when requirement outputs are missing.
- Backend diagram empty states must list the missing object chain instead of saying only that topology is unavailable.
- Exported backend truth must include a Phase 74 truth-lock section tying report readiness, scenario proof, and diagram topology evidence together.

## Runtime truth rules

A report is blocked when selected requirements imply output that is missing, including:

- siteCount greater than materialized Site rows
- usersPerSite present but no VLAN/addressing row
- guest Wi-Fi selected but no guest segment
- management selected but no management segment
- printers, IoT, cameras, voice, or wireless selected but no matching segment
- remote access or cloud selected with no security-edge/cloud boundary evidence
- multi-site selected but not multiple materialized sites

## Diagram truth rules

When backend authoritative topology is missing, the diagram empty state must name the missing inputs:

- materialized Site rows
- VLAN/addressing rows from the allocator
- modeled network devices
- modeled network interfaces
- modeled network links or WAN/site relationships
- backend design graph relationships

## Non-goal

Phase 74 does not claim full runtime success. If materialization is still broken, the report and diagram must now say so clearly instead of hiding it.
