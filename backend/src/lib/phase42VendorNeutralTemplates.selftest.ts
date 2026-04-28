import assert from "node:assert/strict";
import { buildDesignCoreSnapshot } from "../services/designCore.service.js";
import { PHASE41_SCENARIOS } from "./phase41ScenarioMatrix.fixtures.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

type Snapshot = NonNullable<ReturnType<typeof buildDesignCoreSnapshot>>;

function assertVendorNeutralModel(snapshot: Snapshot, scenarioId: string) {
  const model = snapshot.vendorNeutralImplementationTemplates;
  const implementationPlan = snapshot.networkObjectModel.implementationPlan;

  assert.ok(model, `${scenarioId}: vendorNeutralImplementationTemplates must exist on backend design-core snapshot`);
  assert.equal(model.summary.source, "backend-implementation-plan", `${scenarioId}: template model must be compiled from backend implementation plan`);
  assert.equal(model.summary.commandGenerationAllowed, false, `${scenarioId}: command generation must remain disabled in Phase 42`);
  assert.equal(model.summary.vendorSpecificCommandCount, 0, `${scenarioId}: Phase 42 must not emit vendor-specific commands`);
  assert.equal(model.summary.templateCount, implementationPlan.steps.length, `${scenarioId}: every implementation step should have a vendor-neutral template`);
  assert.ok(model.summary.groupCount >= implementationPlan.stages.length, `${scenarioId}: implementation stages must be represented as template groups`);
  assert.ok(model.summary.variableCount >= 5, `${scenarioId}: template variables must document target, readiness, evidence, verification, and rollback inputs`);
  assert.ok(model.safetyNotice.toLowerCase().includes("vendor-neutral"), `${scenarioId}: safety notice must explicitly say vendor-neutral`);
  assert.ok(model.safetyNotice.toLowerCase().includes("command syntax"), `${scenarioId}: safety notice must reject command syntax`);
  assert.ok(model.proofBoundary.some((boundary) => boundary.toLowerCase().includes("not proven")), `${scenarioId}: template proof boundary must document what is not proven`);

  const implementationStepIds = new Set(implementationPlan.steps.map((step) => step.id));
  const templateStepIds = new Set(model.templates.map((template) => template.stepId));
  for (const stepId of implementationStepIds) {
    assert.ok(templateStepIds.has(stepId), `${scenarioId}: missing template for implementation step ${stepId}`);
  }

  for (const template of model.templates) {
    assert.equal(template.commandGenerationAllowed, false, `${scenarioId}: ${template.id} must not allow command generation`);
    assert.ok(template.commandGenerationReason.toLowerCase().includes("later gated phase"), `${scenarioId}: ${template.id} must explain why commands are deferred`);
    assert.ok(template.preChecks.length > 0, `${scenarioId}: ${template.id} must include pre-checks`);
    assert.ok(template.neutralActions.length > 0, `${scenarioId}: ${template.id} must include neutral actions`);
    assert.ok(template.proofBoundary.some((boundary) => boundary.toLowerCase().includes("not proven")), `${scenarioId}: ${template.id} must carry a proof boundary`);
    assert.ok(template.variableIds.includes("template-variable-required-evidence"), `${scenarioId}: ${template.id} must require evidence variable binding`);
    assert.ok(template.variableIds.includes("template-variable-rollback-intent"), `${scenarioId}: ${template.id} must require rollback variable binding`);
  }

  const commandLeakWords = [
    "ip route ",
    "access-list",
    "set rulebase",
    "configure terminal",
    "commit",
    "write memory",
  ];
  const serializedTemplates = JSON.stringify(model.templates).toLowerCase();
  for (const leak of commandLeakWords) {
    assert.equal(serializedTemplates.includes(leak), false, `${scenarioId}: Phase 42 template leaked vendor command-like text: ${leak}`);
  }
}

run("phase 42 templates are generated from the scenario regression matrix", () => {
  assert.ok(PHASE41_SCENARIOS.length >= 8, "Phase 42 should reuse the Phase 41 scenario library instead of testing one toy input.");
});

for (const scenario of PHASE41_SCENARIOS) {
  run(`phase 42 vendor-neutral templates: ${scenario.id}`, () => {
    const snapshot = buildDesignCoreSnapshot(scenario.project as never);
    assert.ok(snapshot, `${scenario.id}: snapshot was not generated`);
    assertVendorNeutralModel(snapshot, scenario.id);
  });
}

run("phase 42 keeps command generation gated", () => {
  const snapshots = PHASE41_SCENARIOS.map((scenario) => buildDesignCoreSnapshot(scenario.project as never)).filter((snapshot): snapshot is Snapshot => Boolean(snapshot));
  const totalTemplates = snapshots.reduce((sum, snapshot) => sum + snapshot.vendorNeutralImplementationTemplates.summary.templateCount, 0);
  const totalVendorCommands = snapshots.reduce((sum, snapshot) => sum + snapshot.vendorNeutralImplementationTemplates.summary.vendorSpecificCommandCount, 0);
  const blockedOrReviewTemplates = snapshots.reduce(
    (sum, snapshot) => sum + snapshot.vendorNeutralImplementationTemplates.summary.blockedTemplateCount + snapshot.vendorNeutralImplementationTemplates.summary.reviewTemplateCount,
    0,
  );

  assert.ok(totalTemplates > 0, "Phase 42 must produce real template artifacts from scenarios.");
  assert.equal(totalVendorCommands, 0, "Phase 42 must not generate vendor-specific command artifacts.");
  assert.ok(blockedOrReviewTemplates > 0, "Scenario-backed templates should preserve blocked/review truth rather than greenwashing execution readiness.");
});
