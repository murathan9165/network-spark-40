# Supabase Secrets Setup

This guide explains how to add secrets to your Supabase project for the Student Networking Assistant.

## Required Secrets

Your application needs these two API keys stored as Supabase secrets:

1. `FIRECRAWL_API_KEY` - For web scraping LinkedIn profiles
2. `PERPLEXITY_API_KEY` - For AI-powered email and talking points generation

## Setup Instructions

### 1. Install Supabase CLI

If you haven't already, install the Supabase CLI:

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

If this is a new project, you'll need to link it to your Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

Replace `YOUR_PROJECT_REF` with your actual Supabase project reference ID.

### 4. Set Secrets

Add your API keys as secrets:

```bash
# Add Firecrawl API Key
supabase secrets set FIRECRAWL_API_KEY=your_firecrawl_api_key_here

# Add Perplexity API Key  
supabase secrets set PERPLEXITY_API_KEY=your_perplexity_api_key_here
```

### 5. Verify Secrets

You can list your secrets to verify they were added:

```bash
supabase secrets list
```

### 6. Deploy Edge Functions

After setting secrets, deploy your edge functions:

```bash
supabase functions deploy firecrawl-crawl
supabase functions deploy perplexity-generate
```

## Getting API Keys

### Firecrawl API Key
1. Go to [Firecrawl.dev](https://firecrawl.dev)
2. Sign up for an account
3. Navigate to your dashboard
4. Copy your API key

### Perplexity API Key
1. Go to [Perplexity AI](https://www.perplexity.ai)
2. Sign up for an account
3. Navigate to API settings
4. Generate and copy your API key

## Local Development

For local development, you can also set these as environment variables in your local Supabase setup:

```bash
# In your project root
echo "FIRECRAWL_API_KEY=your_key_here" >> supabase/.env.local
echo "PERPLEXITY_API_KEY=your_key_here" >> supabase/.env.local
```

## Security Notes

- Never commit API keys to version control
- Use different API keys for development and production
- Regularly rotate your API keys
- Monitor API usage to detect any unauthorized access

## Troubleshooting

If your edge functions can't access the secrets:

1. Verify secrets are set: `supabase secrets list`
2. Redeploy functions: `supabase functions deploy --no-verify-jwt`
3. Check function logs: `supabase functions logs`

The secrets will be available as environment variables in your edge functions using `Deno.env.get("SECRET_NAME")`.