const fs=require('fs'), path=require('path'); const r=f=>fs.readFileSync(path.join(process.cwd(),f),'utf8'); function a(f,ns){const c=r(f); for(const n of ns) if(!c.includes(n)) throw new Error(`${f} missing ${n}`)}
a('backend/src/services/designCore/designCore.phase13ImplementationPlanningControl.ts',['PHASE13_IMPLEMENTATION_PLANNING_CONTRACT','VERIFIED_SOURCE_OBJECT_GATED_IMPLEMENTATION_PLAN_NOT_VENDOR_CONFIG','buildPhase13ImplementationPlanningControl','sourceRequirementIds','rollbackStep','PHASE13_READY_STEP_INFERRED_SOURCE_OBJECT']);
a('backend/src/services/designCore.types.ts',['Phase13ImplementationPlanningControlSummary','phase13ImplementationPlanning']);
a('backend/src/services/designCore.service.ts',['buildPhase13ImplementationPlanningControl','phase13ImplementationPlanning']);
a('frontend/src/lib/designCoreSnapshot.ts',['Phase13ImplementationPlanningControlSummary','phase13ImplementationPlanning']);
a('frontend/src/pages/ProjectImplementationPage.tsx',['Phase 13 implementation planning control','phase13ImplementationPlanning']);
a('backend/src/lib/phase13ImplementationPlanning.selftest.ts',['Implementation planning selftest passed','PHASE13_READY_STEP_INFERRED_SOURCE_OBJECT']);
console.log('[phase13] release contract checks passed');
