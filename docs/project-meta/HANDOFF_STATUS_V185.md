# SubnetOps Handoff Status (v185 clean handoff)

## Packaging rule
- Runtime / deployment files remain in the project root.
- Version notes and internal progress markdown are stored in `project-meta/release-notes/`.

## Current recovery-roadmap position

### Biggest new change in this handoff
- A new **Unified Design Model** layer has been added so topology, route domains, service placement, security boundaries, WAN adjacencies, and flow contracts can be reviewed from one linked engineering model.
- This does **not** mean the entire planner is fully unified yet, but it is a meaningful step away from pure helper-pack growth.

### Mostly advanced / materially progressed
- **Phase H — UX rescue roadmap**
  - Requirements and review workspaces remain materially stronger than before.
- **Phase I — Interaction reliability pass**
  - Save/review confidence direction still stands.
- **Phase J — Real topology diagram engine (foundation only, not final)**
  - Diagram stage remains one of the strongest recovery areas.
  - It now also points back to the shared truth-model layer.

### Meaningfully progressed further in v185
- **Phase B — Build the real design data model**
  - The app now carries an explicit Unified Design Model workspace and internal linked model.
  - Site nodes, route domains, service domains, boundary domains, WAN adjacencies, and flow contracts are now related inside one shared structure.
- **Phase C — Make synthesis topology-specific**
  - Topology roles are now carried inside the shared model instead of only through review text.
- **Phase E — Build a real flow engine**
  - Flow contracts now tie back to route domains, boundary domains, services, and WAN adjacencies where possible.
- **Phase F — Replace generic security with concrete boundary design**
  - Boundary domains now sit inside the same linked model as services and flows.

### Still needs major deeper work
- The truth model is now present, but the generator logic still needs to mature so fewer unresolved references appear.
- The planner still needs deeper requirement-driven branching and stronger direct generation of design objects from requirements rather than post-processed synthesis alone.
- Report/export should continue moving toward fact-first output driven directly from this shared model.

## Recommended next chat continuation
1. Strengthen the Unified Design Model so unresolved references shrink further.
2. Push more routing intent, service placement rules, and security boundary logic directly into the shared model.
3. Make the report/export pipeline consume this model more directly.
4. Continue keeping auth/onboarding extras as secondary roadmap work, not the main recovery track.

## Current honest state
SubnetOps is no longer only improving as a topology-review surface. It now has a clearer shared engineering model underneath key workspaces. The next recovery step is to make that model deeper, cleaner, and more evidence-driven so helper/review packs become downstream views instead of parallel logic layers.
