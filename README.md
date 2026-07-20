# CIC Unit B Stock App

## Local development

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy the environment template
   ```bash
   cp .env.example .env
   ```
3. Fill in your Supabase project values in `.env`
4. Start the app
   ```bash
   npm run dev
   ```

## Supabase setup

1. Create a Supabase project.
2. Run the SQL from `SUPABASE_SCHEMA.sql` in the SQL editor.
3. Add your project URL and anon key to `.env`.

## Notes

If the Supabase values are not set, the app will continue to work in local fallback mode using browser storage.
