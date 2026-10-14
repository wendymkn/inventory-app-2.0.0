# GlamStock Commercial 1.1.0

## Release purpose
This branch is the controlled pre-commercial release candidate for clean-PC testing.

## Added/hardened
- Product catalogue remains SQLite-paginated for large catalogues.
- CSV bulk product import (admin only), maximum 20,000 rows per import.
- Backend re-validates every imported row; invalid rows stop the import.
- Existing matching products are skipped instead of overwritten.
- Automatic verified SQLite backup when due (minimum 24 hours between automatic backups).
- Automatic backup rotation (keeps the newest 30 automatic backups).
- Database integrity health check in Support & Diagnostics.
- Safe SQLite WAL checkpoint/PRAGMA optimize action in Support & Diagnostics.
- Version bumped to 1.1.0.
- Commercial source package excludes private signing keys, issued licenses, databases, previous installers and historical patch folders.

## CSV columns
Name, Brand, Category, Unit, Buying Price, Selling Price, Stock, Low Stock, Supplier

Unit must be `piece` or `ml`. Piece stock and low-stock levels must be whole numbers. Selling price must be greater than zero.

## Build on Windows
From the project root:

```powershell
npm ci
npm run build
npm run pack
```

Test `release\win-unpacked\GlamStock.exe` first.

When the unpacked build passes:

```powershell
npm run dist
```

Expected installer:

`release\GlamStock-Setup-1.1.0-x64.exe`

## Never distribute
- developer-secrets/
- license-authority/private-key.pem
- any private `.pem` signing key
- issued-licenses/
- customer or development `.db` files
- source ZIPs containing secrets
- node_modules/

## Second-PC acceptance test
1. Install the exact 1.1.0 installer on a PC without Node/VS Code.
2. Confirm first-run owner setup and login.
3. Close/reopen and login again.
4. Configure business settings and verify persistence after restart.
5. Verify trial/license Installation ID and activate a test license.
6. Add one piece product and one ml product.
7. Download CSV template and import a small CSV.
8. Verify a duplicate row is skipped and invalid data is rejected.
9. Test Stock In and Stock Out for both units.
10. Complete Cash, M-Pesa and Card sales; verify low-cash blocking and change calculation.
11. Confirm stock decreases exactly once per completed sale.
12. Reopen and print/view a receipt.
13. Test Admin vs Worker permissions.
14. Create a backup, change data, restore the backup and verify recovery after restart.
15. Open Support & Diagnostics, run Database Check, then Optimize Database.
16. Restart Windows and repeat a POS sale.
17. Only after all critical tests pass should this installer be used for the customer.
