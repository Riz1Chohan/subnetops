const fs=require('fs'), path=require('path'); const r=f=>fs.readFileSync(path.join(process.cwd(),f),'utf8'); function a(f,ns){const c=r(f); for(const n of ns) if(!c.includes(n)) throw new Error(`${f} missing ${n}`)}
a('backend/src/services/designCore/designCore.phase14ImplementationTemplatesControl.ts',['PHASE14_VENDOR_NEUTRAL_IMPLEMENTATION_TEMPLATES_CONTRACT','VENDOR_NEUTRAL_TEMPLATES_NO_PLATFORM_COMMANDS_SOURCE_OBJECT_GATED','sourceRequirementIds','sourceObjectIds','missingDataBlockers','commandGenerationAllowed: false','PHASE14_VENDOR_COMMAND_LEAK']);
a('backend/src/services/designCore.types.ts',['Phase14ImplementationTemplateControlSummary','phase14ImplementationTemplates']);
a('backend/src/services/designCore.service.ts',['buildPhase14ImplementationTemplatesControl','phase14ImplementationTemplates']);
a('backend/src/services/validation.service.ts',['PHASE14_VENDOR_NEUTRAL_TEMPLATE_BLOCKING','phase14ImplementationTemplates']);
a('backend/src/services/exportDesignCoreReport.service.ts',['Phase 14 Vendor-Neutral Implementation Templates','phase14ImplementationTemplates']);
a('frontend/src/lib/designCoreSnapshot.ts',['Phase14ImplementationTemplateControlSummary','phase14ImplementationTemplates']);
a('frontend/src/pages/ProjectImplementationPage.tsx',['Phase 14 vendor-neutral templates control','phase14ImplementationTemplates','This is not vendor CLI generation']);
a('backend/src/lib/phase14ImplementationTemplates.selftest.ts',['Vendor-neutral implementation templates selftest passed','PHASE14_TEMPLATE_VARIABLE_GAP']);
a('backend/src/lib/phase0EngineInventory.ts',['phase: 14','designCore.phase14ImplementationTemplatesControl.ts','currentPhase0Verdict: "CONTROLLED"']);
console.log('[phase14] static release contract passed');
