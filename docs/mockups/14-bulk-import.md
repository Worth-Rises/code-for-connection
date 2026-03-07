# Wireframe: Bulk User Import

**Screen:** `BulkImportPage`
**Route:** `/residents/bulk-import`

---

## Screen 1: Upload

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Bulk Import — Residents                                                  │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │                                                                          │
│  👥 Residents│  ┌──────────────────────────────────────────────────────────────────────┐│
│  🤝 Contacts │  │  ℹ  Import resident profiles from a CSV file. Profiles will be      ││
│  🚪 Visitors │  │     auto-created and assigned to housing units at this facility.     ││
│              │  │     Max 500 rows per import.                                         ││
│  MONITORING  │  └──────────────────────────────────────────────────────────────────────┘│
│  📞 Voice    │                                                                          │
│  📹 Video    │  📄 Download CSV Template                                                │
│  💬 Messages │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│  INTELLIGENCE│  │                                                                      ││
│  🔍 Search   │  │                                                                      ││
│              │  │                      ┌───────────────────┐                            ││
│  OPERATIONS  │  │                      │  📁  Drag & drop  │                            ││
│  🏠 Housing  │  │                      │  a CSV file here  │                            ││
│  📈 Reports  │  │                      │                   │                            ││
│  📋 Audit Log│  │                      │  or [Browse...]   │                            ││
│  ⚙️ Settings │  │                      └───────────────────┘                            ││
│              │  │                                                                      ││
│              │  │  Accepted: .csv only  |  Max: 500 rows  |  Max file size: 2 MB       ││
│              │  └──────────────────────────────────────────────────────────────────────┘│
│              │                                                                          │
│              │  ── Required Columns ─────────────────────────────────────────────────  │
│              │                                                                          │
│              │  firstName, lastName, dateOfBirth, inmateId, pin,                        │
│              │  housingUnitName, clearanceLevel                                         │
│              │                                                                          │
│              │  ── Optional Columns ─────────────────────────────────────────────────  │
│              │                                                                          │
│              │  email, phone, notes                                                     │
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- "Download CSV Template" downloads a pre-filled template with headers and 2 example rows.
- Drag-and-drop zone accepts `.csv` files only. Non-CSV files show an inline error: "Only .csv files are accepted."
- File size limit is 2 MB. Files over 500 rows are rejected at parse time with a clear error.
- After a file is dropped/selected, the page transitions to Screen 2 (Preview & Validation).
- Only Agency Admins and Facility Admins can access this page. Read-only roles see a 403.

---

## Screen 2: Preview & Validation

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ Open Connect Admin          [Facility: Sing Sing ▼]              🔔(3)  Admin Name ▼   │
├──────────────┬──────────────────────────────────────────────────────────────────────────┤
│  📊 Dashboard│  Bulk Import — Preview & Validation                                       │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  MANAGEMENT  │  File: sing_sing_intake_mar2026.csv  |  148 rows  |  12 KB               │
│  👥 Residents│  [← Upload Different File]                                                │
│  🤝 Contacts ├──────────────────────────────────────────────────────────────────────────┤
│  🚪 Visitors │                                                                          │
│              │  ┌──────────────────────┐ ┌──────────────────────┐ ┌───────────────────┐ │
│  MONITORING  │  │  ✓ Valid             │ │  ⚠ Warnings          │ │  ✕ Errors          │ │
│  📞 Voice    │  │       140            │ │         5            │ │       3            │ │
│  📹 Video    │  │  Ready to import     │ │  Importable          │ │  Must fix          │ │
│  💬 Messages │  └──────────────────────┘ └──────────────────────┘ └───────────────────┘ │
│              ├──────────────────────────────────────────────────────────────────────────┤
│  INTELLIGENCE│  [Show: *All*]  [Valid Only]  [Warnings Only]  [Errors Only]             │
│  🔍 Search   ├──────────────────────────────────────────────────────────────────────────┤
│              │                                                                          │
│  OPERATIONS  │  ┌────┬──────────┬──────────┬────────────┬────────┬──────────┬──────────┐│
│  🏠 Housing  │  │ ## │ Name     │ Inmate ID│ DOB        │ Unit   │Clearance │ Status   ││
│  📈 Reports  │  ├────┼──────────┼──────────┼────────────┼────────┼──────────┼──────────┤│
│  📋 Audit Log│  │  1 │ John     │ SNG-4821 │ 1990-01-15 │ A-01   │ Standard │ ✓ Valid  ││
│  ⚙️ Settings │  │    │ Doe      │          │            │        │          │          ││
│              │  ├────┼──────────┼──────────┼────────────┼────────┼──────────┼──────────┤│
│              │  │  2 │ Michael  │ SNG-3302 │ 1985-06-22 │ B-12   │ Medium   │ ✓ Valid  ││
│              │  │    │ Smith    │          │            │        │          │          ││
│              │  ├────┼──────────┼──────────┼────────────┼────────┼──────────┼──────────┤│
│              │  │  3 │ Robert   │ SNG-2190 │ 1978-11-30 │ C-14   │ High     │ ⚠ Warn  ││
│              │  │    │ Johnson  │          │            │        │          │ Dup. ID  ││
│              │  ├────┼──────────┼──────────┼────────────┼────────┼──────────┼──────────┤│
│              │  │  4 │ David    │          │ 1992-03-08 │ A-01   │ Standard │ ✕ Error  ││
│              │  │    │ Williams │  (empty) │            │        │          │ Missing  ││
│              │  │    │          │          │            │        │          │ inmateId ││
│              │  ├────┼──────────┼──────────┼────────────┼────────┼──────────┼──────────┤│
│              │  │  5 │ James    │ SNG-1847 │ not-a-date │ Z-99   │ Standard │ ✕ Error  ││
│              │  │    │ Brown    │          │            │        │          │ Bad DOB, ││
│              │  │    │          │          │            │        │          │ Bad Unit ││
│              │  └────┴──────────┴──────────┴────────────┴────────┴──────────┴──────────┘│
│              │                                                                          │
│              │  Showing 1-5 of 148    [< Prev]  1  2  3  ...  30  [Next >]              │
│              │                                                                          │
│              │  ┌──────────────────────────────────────────────────────────────────────┐│
│              │  │  [Cancel]                              [Import 145 Valid Records]    ││
│              │  └──────────────────────────────────────────────────────────────────────┘│
│              │                                                                          │
└──────────────┴──────────────────────────────────────────────────────────────────────────┘
```

**Annotations:**
- **Status column** uses three levels:
  - `✓ Valid` — All fields pass validation. Will be imported.
  - `⚠ Warn` — Importable but flagged (e.g., duplicate inmateId already in system, clearance level mismatch). Hovering shows details.
  - `✕ Error` — Cannot be imported. Missing required fields, invalid data format, or unknown housing unit. Error details shown inline.
- **Stat cards** at top summarize totals. Clicking a card filters the table to that status.
- **Filter tabs** allow toggling between All / Valid / Warnings / Errors views.
- **[Import N Valid Records]** imports only Valid + Warning rows. Errors are skipped. The count reflects Valid + Warning total (140 + 5 = 145 in this example).
- **[Cancel]** returns to the Upload screen. No data is imported.
- **[← Upload Different File]** discards the current preview and returns to Screen 1.
- After clicking Import, a confirmation modal appears: "Import 145 records into Sing Sing? This will create resident profiles and assign PINs. This action cannot be undone." with [Cancel] and [Confirm Import].
- Import runs async with a progress indicator. On completion, a summary shows: "Imported: 145 | Skipped: 3 errors | Warnings: 5 (see audit log)."
- All bulk imports are logged in the Audit Log with the admin username, file name, row count, and timestamp.
