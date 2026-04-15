# SubnetOps v72

## Main focus
Fuller dynamic branching in the Requirements workspace.

## What changed
- Reworked the Requirements page into a true visible-step planner.
- Earlier requirement choices now determine which steps appear in the workflow.
- Added a dynamic step rail in the left sidebar.
- Added conditional branches for:
  - Scenario triggers
  - Security and trust
  - Cloud and hybrid
  - Access edge and services
  - Apps / WAN / performance
- Kept the later always-needed planning areas visible:
  - Core brief
  - Addressing strategy
  - Operations
  - Physical and endpoints
  - Delivery and outputs
  - Readiness review
- Added step-by-step navigation with Back / Next / Save.
- Preserved the requirements anchors used by earlier validation-link work where relevant.

## Result
The planner now behaves much closer to a guided branching workflow instead of a long static form with a few conditional fields.

## Still pending later
- deeper dependency logic across even more downstream stages
- autosave / save confidence layer
- assumptions / decisions / open issues log
- compare-plan capability
- more cloud-aware and security-aware downstream validation behavior
