import assert from "node:assert/strict";
import { executeV1ScenarioMatrix } from "./scenarioMatrix.execution.js";
import { V1_SCENARIOS } from "./scenarioMatrix.fixtures.js";

function run(name: string, fn: () => void) {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (error) {
    console.error(`FAIL  ${name}`);
    throw error;
  }
}

const EXECUTED_AT = "2026-01-01T00:00:00.000Z";
const executionResults = executeV1ScenarioMatrix(V1_SCENARIOS, EXECUTED_AT);

run("V1 scenario library is broad enough to be useful", () => {
  assert.ok(V1_SCENARIOS.length >= 8, "V1 needs at least eight scenario fixtures, not a toy matrix.");
  const riskClasses = new Set(V1_SCENARIOS.map((scenario) => scenario.riskClass));
  for (const required of ["baseline", "security", "routing", "addressing", "implementation", "known-gap"] as const) {
    assert.ok(riskClasses.has(required), `V1 matrix is missing risk class ${required}`);
  }
});

for (const result of executionResults) {
  run(`V1 executed scenario: ${result.scenarioId}`, () => {
    assert.equal(result.executedAt, EXECUTED_AT, `${result.scenarioId}: execution timestamp must be deterministic in selftest`);
    assert.ok(result.assertions.length > 0, `${result.scenarioId}: scenario produced no executable assertions`);
    assert.ok(result.snapshotResult, `${result.scenarioId}: scenario must preserve snapshot result evidence`);
    assert.ok(result.reportEvidence.length > 0, `${result.scenarioId}: report evidence missing`);
    assert.ok(result.diagramEvidence.length > 0, `${result.scenarioId}: diagram evidence missing`);
    assert.ok(result.validationEvidence.length > 0, `${result.scenarioId}: validation evidence missing`);
    assert.ok(result.affectedEngines.length >= 5, `${result.scenarioId}: affected engines evidence too thin`);
    const failed = result.assertions.filter((assertion) => assertion.status === "FAIL");
    assert.deepEqual(failed, [], `${result.scenarioId}: scenario execution had failed assertions`);
  });
}

run("V1 scenario matrix protects export/report/diagram truth from drift", () => {
  const blockedScenarioCount = V1_SCENARIOS.filter((scenario) => scenario.expected.mustHaveBlockedReportTruth).length;
  const diagramScenarioCount = V1_SCENARIOS.filter((scenario) => (scenario.expected.minDiagramRenderNodes ?? 0) > 0).length;
  const verificationScenarioCount = V1_SCENARIOS.filter((scenario) => (scenario.expected.minVerificationChecks ?? 0) > 0).length;
  const executedScenarioCount = executionResults.length;
  const totalAssertionCount = executionResults.reduce((sum, result) => sum + result.assertions.length, 0);

  assert.equal(executedScenarioCount, V1_SCENARIOS.length, "Every fixture must produce a scenario execution result.");
  assert.ok(totalAssertionCount >= executedScenarioCount * 8, "Scenario execution must assert real backend evidence, not just smoke-test snapshots.");
  assert.ok(blockedScenarioCount >= 6, "Most V1 scenarios should intentionally prove blocked truth, not greenwashed readiness.");
  assert.equal(diagramScenarioCount, V1_SCENARIOS.length, "Every scenario must protect backend diagram render truth.");
  assert.equal(verificationScenarioCount, V1_SCENARIOS.length, "Every scenario must protect verification matrix generation.");
});
