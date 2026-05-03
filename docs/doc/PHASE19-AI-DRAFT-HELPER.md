# Phase 19 — AI Draft/Helper Contract

`PHASE19_AI_DRAFT_HELPER_CONTRACT` makes the AI helper safe by refusing to let AI become engineering authority.

## Contract role

Phase 19 role:

`AI_DRAFT_HELPER_NOT_ENGINEERING_AUTHORITY`

AI authority level:

`DRAFT_ONLY_NOT_AUTHORITATIVE`

Source-of-truth level:

`ai-draft-only-review-gated`

## What AI is allowed to do

AI can suggest draft planning inputs such as:

- requirements
- sites
- VLANs
- project notes
- validation explanations
- review checklists

These are drafts only. They are not addressing truth, routing truth, security truth, report truth, diagram truth, or implementation truth.

## Required conversion chain

AI output must follow this chain before it can influence engineering outputs:

1. AI draft suggestion
2. User selective review/apply action
3. Structured requirement/source object conversion
4. Requirements materialization
5. Validation/readiness review
6. Engine 1 addressing proof
7. Engine 2 IPAM reconciliation when relevant
8. Standards and traceability checks
9. Report/export/diagram display only with review-required truth labels until accepted

## Markers

AI-created objects imported from the AI workspace receive this provenance marker in notes:

`PHASE19_AI_DRAFT_APPLIED_REVIEW_REQUIRED`

That marker means the object is structured input, but still review-required.

## Backend control summary

The design-core snapshot now exposes:

- `phase19AiDraftHelper.contract`
- `phase19AiDraftHelper.aiAuthority`
- `phase19AiDraftHelper.overallReadiness`
- `phase19AiDraftHelper.gateRows`
- `phase19AiDraftHelper.draftObjectRows`
- `phase19AiDraftHelper.findings`
- `phase19AiDraftHelper.proofBoundary`

## Validation behavior

Validation surfaces Phase 19 findings as:

- `PHASE19_AI_DRAFT_BLOCKING`
- `PHASE19_AI_DRAFT_REVIEW_REQUIRED`

AI-derived objects should not silently pass as implementation-ready just because they were converted into sites or VLANs.

## Report/export behavior

Reports and CSV exports include `Phase 19 AI Draft/Helper` sections that label AI evidence as draft-only and review-required.

The report must not say an AI-created object is authoritative unless the deterministic backend engines prove it through the normal SubnetOps contract.

## Frontend behavior

The frontend now shows Phase 19 safety evidence in:

- `AIWorkspacePage`
- `AIPlanningPanel`
- `NewProjectPage`
- `ProjectOverviewPage`

The UI language must not imply AI is a network engineer, a source of truth, or an implementation authority.

## Hard rule

If AI output bypasses structured review and deterministic engine proof, it is garbage. Keep AI helpful, but keep it weak on purpose.
