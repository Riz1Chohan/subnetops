# Phase 8 — Engine Truth Fix

## Purpose

Phase 8 fixed the highest-risk credibility issue in SubnetOps: IPv4 CIDR math around addresses above `127.255.255.255`.

## Changes

- Forced unsigned network calculations in backend CIDR parsing.
- Forced unsigned network calculations in frontend CIDR parsing.
- Added boundary tests for `192.168.1.0/24`, `172.16.0.0/12`, and public non-overlap checks.
- Corrected WAN transit sizing so two-host point-to-point links may use `/31` instead of being inflated by generic growth buffers.

## Files

- `backend/src/lib/cidr.ts`
- `frontend/src/lib/cidrCore.ts`
- `backend/src/lib/cidrBoundary.selftest.ts`
- `backend/package.json`

## Gate

Run:

```bash
cd backend
npm run engine:selftest:all
```
