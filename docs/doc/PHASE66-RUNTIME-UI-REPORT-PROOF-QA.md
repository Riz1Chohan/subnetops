# Phase 66 — Runtime/UI/Report Proof and Requirement Scenario QA

Phase 66 is a proof-and-gap-closure pass for the requirement planner. It does not add a new shiny engine. It tightens the existing Phase 61–65 pipeline so saved requirement changes keep propagating through backend materialization, design-core evidence, UI proof panels, diagram inputs, and exports.

## What was fixed

### 1. Requirement-managed rows now refresh instead of going stale

Phase 61 created real Sites and VLANs from saved requirements, but the update path preserved most existing VLAN values once a row existed. That was dangerous because a user could change users/site, address base, or segment sizing inputs and still see stale host demand or stale addressing on rows that were originally created by the requirement materializer.

Phase 66 adds explicit detection for requirement-managed Sites/VLANs and refreshes deterministic materializer-owned fields on those rows:

- requirement-managed site block refresh
- requirement-managed VLAN name/purpose/role refresh
- subnet/gateway refresh from the current site/base addressing input
- DHCP posture refresh
- estimated host demand refresh
- department/purpose refresh

Manual/non-materialized rows are still treated conservatively: the materializer fills missing values rather than blindly overwriting engineer-entered data.

### 2. False/zero answers are no longer treated as missing design output

The closure audit previously treated captured negative answers such as `voice = false`, `cameras = false`, or `phoneCount = 0` as captured direct fields that lacked concrete output. That creates noisy fake gaps.

Phase 66 adds negative/zero evidence handling so “not selected,” zero counts, and not-applicable style answers are recognized as captured requirement evidence, not failed materialization.

### 3. Voice output no longer appears just because a voice QoS text field exists

The default requirements profile carries a voice QoS description, even when the `voice` checkbox is false. Phase 65 could still activate voice materialization/proof from that text alone.

Phase 66 fixes this:

- voice VLAN is created only when voice is selected or phone count is positive
- voice scenario proof only activates for affirmative voice/phone evidence
- voice security-flow proof no longer triggers from QoS text alone

### 4. Operations-plane flows now respond to operations requirements

Monitoring, logging, backup, and operations-owner selections were already used by materialization and scenario proof. The security-flow model was weaker because its operations flow trigger depended mainly on compliance/management conditions.

Phase 66 wires the operations flow trigger to:

- monitoring model
- logging model
- backup policy
- operations owner model
- compliance profile
- management network selection

### 5. CSV export now includes requirement proof

PDF/DOCX report generation already had the requirement traceability and scenario proof section. Phase 66 adds matching CSV rows for:

- Requirement Impact Closure
- Requirement Scenario Proof

This prevents CSV from becoming the weak export path.

## Proof gate added

New static gate:

```bash
npm run check:phase66-runtime-ui-report-proof
```

The gate checks that:

- requirement-managed materialized rows refresh on requirement changes
- voice QoS text alone does not create voice output
- operations requirements drive operations flow evidence
- false/zero requirement answers are treated as captured negative evidence
- all major scenario proof signals still exist
- requirement saves invalidate project, sites, VLANs, design-core, enterprise IPAM, and validation queries
- Project Overview exposes closure and scenario proof
- Diagram workspace waits for project/sites/VLANs and uses backend diagram truth
- PDF/DOCX report model includes closure/scenario proof
- CSV export includes closure/scenario proof

## Verification performed in this package

Passed directly in the sandbox:

```bash
node scripts/check-phase61-requirements-materialization.cjs
node scripts/check-phase62-requirements-impact-traceability.cjs
node scripts/check-phase63-requirements-policy-consequences.cjs
node scripts/check-phase64-requirements-completion-closure.cjs
node scripts/check-phase65-requirement-scenario-proof.cjs
node scripts/check-phase66-runtime-ui-report-proof.cjs
node scripts/check-release-artifacts.cjs
timeout 20 bash -x scripts/assert-release-discipline.sh
```

## Build/runtime limitation

Backend/frontend `npm ci` and full TypeScript/Vite build were not proven in this sandbox because dependency installation and long TypeScript commands timed out or could not complete reliably here. The source package remains disciplined and dependency-free, but Render/GitHub remains the final proof for full install/build/runtime execution.

## What Phase 66 does not claim

This phase does not claim the UI was clicked through in a real browser session inside the sandbox. It proves source-level propagation and closes the specific stale/false-positive gaps found during Phase 66 inspection. The next real proof should be a Render deployment followed by manual UI scenario testing across the same requirement scenarios.
