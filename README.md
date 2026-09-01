# PRESSZILA

Production-style multi-page website for PRESSZILA, a digital PR & branding agency.

## Requirements
- Node.js 18+
- npm

## Installation
1. Install Node.js 18+
2. Open terminal in the `PRESSZILA` folder
3. Run `npm install`
4. Run `npm start`
5. Open http://localhost:3000

## Admin
Open `/admin.html` and enter the value of `ADMIN_KEY` from `.env`.

Before deployment, replace the example `ADMIN_KEY` with a strong secret. The SQLite database is created automatically at `data/presszila.db`.

## Notes
- Forms submit to `/api/inquiries`.
- Admin data is protected by the `x-admin-key` header.
- All visual assets are local SVGs; no external image hosting is required.
- The default content is demo/placeholder agency content and should be replaced with verified client work before public launch.
