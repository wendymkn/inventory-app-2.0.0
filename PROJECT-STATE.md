# GlamStock Project State

## RELEASE CANDIDATE
- Version: 1.1.0
- Status: Commercial pre-release / second-PC acceptance testing
- Bulk CSV product import added
- Automatic verified backup rotation added
- Database health/optimization controls added
- Private licensing secrets excluded from commercial source branch

## REQUIRED BEFORE SALE
- Windows npm ci/build/pack must pass
- Build exact NSIS installer with npm run dist
- Install on another PC
- Run docs/COMMERCIAL-RELEASE-1.1.0.md acceptance checklist
- Do not ship if POS money/stock, login, licensing, permissions, backup/restore, or database health tests fail
