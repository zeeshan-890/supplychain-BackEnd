# Heroku Database Setup Guide

## Step 1: Update DATABASE_URL on Heroku

1. Go to: https://dashboard.heroku.com/apps/supply-chain-af930a398ca8/settings
2. Scroll to **Config Vars** section
3. Click **Reveal Config Vars**
4. Find `DATABASE_URL` (or click **Add** if it doesn't exist)
5. Set the value to:
   ```
   mysql://uqqrysurzxrglyu8:NrsKSq32wMQJmm1mzp0u@bbrq2gijqhivc8irebhd-mysql.services.clever-cloud.com:3306/bbrq2gijqhivc8irebhd
   ```
6. Click **Add** or **Update**

## Step 2: Run Migrations on Heroku

Since you prefer the dashboard, we'll add the migration to your build process:

### Option A: One-time migration via Heroku Console (Dashboard)
1. Go to: https://dashboard.heroku.com/apps/supply-chain-af930a398ca8
2. Click **More** (top right) → **Run console**
3. Type: `npx prisma migrate deploy`

4. Click **Run**

### Option B: Automatic migration on every deploy
This is already set up in your `package.json` with the `heroku-postbuild` script.
Just redeploy your app after updating the DATABASE_URL.

## Step 3: Redeploy the App

1. Go to: https://dashboard.heroku.com/apps/supply-chain-af930a398ca8/deploy/github
2. Scroll to **Manual deploy** section
3. Select branch: `main`
4. Click **Deploy Branch**

## Verify

After deployment, check the logs:
1. Go to: https://dashboard.heroku.com/apps/supply-chain-af930a398ca8
2. Click **More** → **View logs**
3. Look for successful database connection messages

## Troubleshooting

If migrations don't run automatically:
- Use Option A above (Run console)
- Or update the heroku-postbuild script in package.json to include migrations
