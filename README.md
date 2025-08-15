# Food Route Optimizer 🍕🚚

A Next.js application for restaurant delivery route optimization using Mapbox and Supabase.

## 🔒 Security Notice

**IMPORTANT:** This repository contains sensitive API keys and database credentials. Follow these security practices:

### ✅ What's Safe to Commit:
- Source code
- Configuration files (except `.env.local`)
- Documentation
- Database schema

### ❌ What's NEVER Committed:
- `.env.local` file (contains API keys)
- Database credentials
- Mapbox tokens
- Supabase service keys

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd food-route-optimizer
```

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory:

```bash
# Copy the example file
cp env.example .env.local

# Edit with your actual values
nano .env.local
```

**Required Environment Variables:**
```ini
# Mapbox (Public token only - pk.* not sk.*)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_public_token_here

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Set Up Database
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `database.sql` in your Supabase SQL Editor
3. Get your project URL and anon key from Settings > API

### 5. Run the Application
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Development

### Database Seeding
```bash
npm run seed
```

### Clean Up Test Data
```bash
npm run cleanup-db
npm run reset-orders
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_MAPBOX_TOKEN`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
3. Deploy!

### Environment Variables for Production
Make sure to set these in your deployment platform:
- **Mapbox**: Use a public token (`pk.*`) for client-side access
- **Supabase**: Use your project URL and anon key

## 🛡️ Security Best Practices

### For Contributors:
1. **Never commit `.env.local`** - it's already in `.gitignore`
2. **Use environment variables** for all sensitive data
3. **Rotate API keys** regularly
4. **Use public tokens** for client-side operations

### For Production:
1. **Set environment variables** in your hosting platform
2. **Use HTTPS** for all API calls
3. **Implement proper authentication** (currently using dev login for demo)
4. **Monitor API usage** to prevent abuse

## 📁 Project Structure

```
food-route-optimizer/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/          # React components
│   ├── contexts/           # React contexts (Auth)
│   └── lib/                # Utilities (Supabase, Mapbox)
├── scripts/                # Database scripts
├── database.sql           # Database schema
└── env.example            # Environment variables template
```

## 🔐 Authentication

Currently supports:
- **Dev Login**: Quick local testing (stored in localStorage)
- **Supabase Auth**: Email magic link authentication

## 🗺️ Features

- **Customer Flow**: Browse restaurants, order food, track delivery
- **Owner Dashboard**: View orders, optimize delivery routes
- **Real-time Updates**: Live order status updates
- **Route Optimization**: Mapbox-powered delivery route planning

## 📝 License

This project is for educational/demo purposes. Please ensure you have proper licenses for Mapbox and Supabase usage.

---

**⚠️ Remember:** Keep your API keys secure and never share them publicly!
