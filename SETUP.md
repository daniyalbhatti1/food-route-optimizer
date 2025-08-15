# 🚀 Quick Setup Guide

## 1. Clone and Install
```bash
git clone <your-repo-url>
cd food-route-optimizer
npm install
```

## 2. Set Up Environment Variables
```bash
npm run setup-env
```
Then edit `.env.local` with your actual API keys.

## 3. Verify Setup
```bash
npm run check-env
```

## 4. Set Up Database
1. Create a Supabase project
2. Run the SQL from `database.sql` in your Supabase SQL editor
3. Get your API keys from Supabase settings

## 5. Seed Database
```bash
npm run seed
```

## 6. Start Development
```bash
npm run dev
```

Visit http://localhost:3000

## 🔑 Required API Keys

- **Mapbox**: Get from https://account.mapbox.com/access-tokens/
- **Supabase**: Get from your project settings

## 🔒 Security
Your `.env.local` file is automatically ignored by Git, so your API keys won't be uploaded to GitHub.

## 📖 Full Documentation
See [README.md](README.md) for detailed instructions.
