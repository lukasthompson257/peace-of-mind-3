# 💸 Pennies — Setup Guide
### From zero to on your iPhone in ~30 minutes. No coding experience needed.

---

## Overview of what you're doing

You're setting up 3 free services that work together:

- **Supabase** — the database where your transactions live in the cloud
- **GitHub** — where your app code lives (like Google Drive, but for code)
- **Vercel** — turns your code into a live website both phones can open

```
iPhone (You)  ──┐
                ├──▶  Vercel (runs the app)  ──▶  Supabase (stores data)
iPhone (Wife) ──┘
```

---

## PART 1 — Set up Supabase (your database)

### 1.1 Create your account
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with your Google account (easiest)

### 1.2 Create a project
1. Click "New project"
2. Fill in:
   - Name: pennies
   - Database Password: make one up and save it somewhere safe
   - Region: pick the closest one to you (e.g. US East)
3. Click "Create new project"
4. Wait about 1 minute while it sets up

### 1.3 Create the database table
1. In the left sidebar, click "SQL Editor" (the >_ icon)
2. Click "New query"
3. Copy and paste this entire block into the box:

------------------------------------------------------------
create table pennies_data (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);

alter table pennies_data enable row level security;

create policy "Allow all access"
  on pennies_data
  for all
  using (true)
  with check (true);

alter publication supabase_realtime add table pennies_data;
------------------------------------------------------------

4. Click the green "Run" button
5. You should see "Success. No rows returned" — that means it worked ✅

### 1.4 Copy your API keys
1. In the left sidebar, click "Project Settings" (the gear icon at the bottom)
2. Click "API"
3. Copy these two things into your Notes app:
   - Project URL — looks like https://abcdefgh.supabase.co
   - anon public key — a long string starting with eyJ...

---

## PART 2 — Put the code on GitHub

### 2.1 Create a GitHub account
1. Go to https://github.com
2. Click "Sign up" and create a free account

### 2.2 Add your Supabase keys to the code
1. Unzip the pennies-app.zip file on your computer
2. Open the file src/App.jsx in any text editor
   - On Mac: right-click the file → Open With → TextEdit
   - On Windows: right-click → Open With → Notepad
3. Near the top, find these two lines:

   const SUPABASE_URL = "YOUR_SUPABASE_URL";
   const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

4. Replace YOUR_SUPABASE_URL with your Project URL from Step 1.4
5. Replace YOUR_SUPABASE_ANON_KEY with your anon public key from Step 1.4
6. Save the file (Cmd+S on Mac, Ctrl+S on Windows)

### 2.3 Upload to GitHub
1. Go to github.com, click the "+" in the top right → "New repository"
2. Name it: pennies
3. Select "Private"
4. Click "Create repository"
5. On the next screen, click "uploading an existing file"
6. Open the unzipped pennies folder on your computer
7. Select ALL the files inside and drag them into the GitHub upload box
8. Scroll down and click "Commit changes"

---

## PART 3 — Deploy to Vercel

1. Go to https://vercel.com
2. Click "Sign up" → "Continue with GitHub"
3. Click "Add New Project"
4. You'll see your pennies repo — click "Import"
5. Leave every setting exactly as it is — don't change anything
6. Click "Deploy"
7. Wait about 60 seconds — you'll see a success screen with confetti 🎉
8. Your app URL will look like: pennies-abc123.vercel.app
9. Click it to confirm it loads

---

## PART 4 — Add to both iPhones

Do this on BOTH iPhones:

1. Open Safari (must be Safari — Chrome won't work for this step)
2. Go to your Vercel URL
3. Tap the Share button at the bottom of the screen
   (it looks like a box with an arrow pointing up)
4. Scroll down and tap "Add to Home Screen"
5. Name it Pennies and tap Add

The app icon will appear on your home screen. Tap it and it opens full
screen like a real app — no browser bar, no address bar, just the app.

---

## PART 5 — Export your existing data (do this first!)

Before switching to the new version, back up what you have:

1. Open the Pennies app inside this Claude conversation
2. Go to the History tab
3. Click "Export All CSV"
4. Save that file somewhere safe — it's your transaction backup

---

## Making changes later

When you want to update the app:

1. Come back to Claude and ask for changes
2. Claude gives you an updated App.jsx file
3. Go to github.com → your pennies repo → click the src folder → click App.jsx
4. Click the pencil icon (Edit this file)
5. Select all the text and delete it
6. Paste the new code Claude gave you
7. Click "Commit changes"
8. Vercel automatically detects the change and updates in ~60 seconds
9. Both iPhones refresh automatically — no action needed on the phones

---

## Troubleshooting

App loads but shows blank screen
→ The Supabase keys weren't added correctly. Re-do Step 2.2.

"Add to Home Screen" isn't showing
→ Switch to Safari. Chrome and Firefox don't support this.

Changes not appearing after update
→ Wait 2 minutes, then pull down to refresh in Safari.

I want to see my raw data
→ Go to supabase.com → your project → Table Editor → pennies_data
  All your data is stored there and you can view or edit it directly.

---

## Your data is safe because...

- Deleting the app from your phone does NOT delete your data
- Getting a new phone — just add the app again, everything is there
- Both phones always see the same data in real time
- Supabase automatically backs up your database daily
- You still have your iPhone Note as the original source of truth
