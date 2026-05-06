import { strict as assert } from "assert";
import { applyProfessionalReportEvidenceBoundary } from "./professional-report-boundary.js";

const report = applyProfessionalReportEvidenceBoundary({
  title: "Clinic Network Plan Technical Design Report",
  sections: [
    { title: "1. Introduction and Project Scope", paragraphs: ["Professional section"] },
    { title: "Report Export Readiness Gate", paragraphs: ["Evidence section"] },
    { title: "V1 Runtime Proof Dump", paragraphs: ["Internal proof"] },
  ],
  appendices: [
    {
      title: "Full Evidence Appendix",
      paragraphs: ["Detailed evidence"],
      tables: [
        { title: "Omitted Evidence Summary", headers: ["A"], rows: [["B"]] },
        { title: "Anti-overclaim Rules", headers: ["A"], rows: [["B"]] },
      ],
    },
  ],
});

assert.deepEqual(report.sections.map((section) => section.title), ["1. Introduction and Project Scope"]);
assert(report.appendices?.some((section) => /Engineering Evidence/.test(section.title)), "evidence sections should move to appendices");
assert(!report.appendices?.some((section) => /Runtime Proof Dump/.test(section.title)), "internal proof dumps must not enter professional report appendices");
assert(!report.appendices?.some((section) => section.tables?.some((table) => /Anti-overclaim Rules/.test(table.title))), "anti-overclaim product rules must not appear in professional report appendices");

console.log("professional-report-boundary selftest passed");
