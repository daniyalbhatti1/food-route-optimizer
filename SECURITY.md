# 🔒 Security Checklist

Before deploying this application, ensure you've completed all security measures:

## ✅ Pre-Deployment Checklist

### Environment Variables
- [ ] `.env.local` is in `.gitignore` (✅ Already done)
- [ ] No API keys are hardcoded in source code
- [ ] Environment variables are set in deployment platform
- [ ] Using public Mapbox token (`pk.*`) not secret token (`sk.*`)

### Database Security
- [ ] Supabase RLS policies are properly configured
- [ ] Database credentials are not exposed
- [ ] Service role key is only used server-side

### Authentication
- [ ] Proper authentication is implemented for production
- [ ] Dev login is disabled in production
- [ ] Session management is secure

### API Security
- [ ] All API routes validate user permissions
- [ ] Input validation is implemented
- [ ] Rate limiting is considered

## 🚨 Critical Security Points

### 1. Never Commit Sensitive Files
```bash
# These files should NEVER be committed:
.env.local
.env.production
*.key
*.pem
secrets.json
```

### 2. Environment Variables Only
```javascript
// ✅ Good - Use environment variables
const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ❌ Bad - Never hardcode
const mapboxToken = "pk.eyJ1IjoiZXhhbXBsZSI...";
```

### 3. Client vs Server Tokens
```javascript
// ✅ Client-side (public token)
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiZXhhbXBsZSI...

// ✅ Server-side (private token - if needed)
MAPBOX_SECRET_TOKEN=sk.eyJ1IjoiZXhhbXBsZSI...
```

## 🔍 Security Audit Commands

### Check for Exposed Secrets
```bash
# Search for potential API keys in code
grep -r "pk\." src/
grep -r "sk\." src/
grep -r "eyJ" src/

# Check for environment files
find . -name ".env*" -not -path "./node_modules/*"
```

### Verify Git Ignore
```bash
# Check if .env.local is ignored
git check-ignore .env.local
```

## 🚀 Deployment Security

### Vercel
1. Set environment variables in Vercel dashboard
2. Enable HTTPS (automatic)
3. Set up proper domain

### Supabase
1. Configure RLS policies
2. Set up proper authentication
3. Monitor API usage

## 📞 Security Contacts

If you find a security vulnerability:
1. **DO NOT** create a public issue
2. Contact the repository owner privately
3. Provide detailed reproduction steps

## 🔄 Regular Security Maintenance

- [ ] Rotate API keys quarterly
- [ ] Update dependencies regularly
- [ ] Monitor for security advisories
- [ ] Review access logs
- [ ] Test authentication flows

---

**Remember:** Security is everyone's responsibility! 🛡️
