GlamStock Pagination + POS Performance Fix v2

Replaces:
- electron/inventoryDatabase.cjs
- electron/main.cjs
- electron/preload.cjs
- src/pages/Products.jsx
- src/pages/POS.jsx

What changes:
- Products page uses SQLite-side pagination (100 rows/page)
- Product search is debounced (~250 ms)
- POS uses SQLite-side product search and returns at most 50 in-stock products
- Typing Amount Paid, Discount, quantity, etc. no longer rerenders thousands of product cards
- Existing create/edit/delete, licensing, receipts, checkout, permissions and backup logic are preserved

Use this v2 bundle instead of GlamStock-Pagination-Fix-v1.zip.

After copying files:
1. node --check .\electron\inventoryDatabase.cjs
2. node --check .\electron\main.cjs
3. node --check .\electron\preload.cjs
4. npm run pack
5. Start-Process ".\release\win-unpacked\GlamStock.exe"

Keep the 10,000 STRESS products until performance is confirmed.
