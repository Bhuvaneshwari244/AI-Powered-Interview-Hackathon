# 🤖 Google Gemini Setup Guide (FREE!)

## Why Google Gemini?

- ✅ **100% FREE** - No credit card required
- ✅ **Generous free tier** - 15 requests per minute
- ✅ **Fast** - Gemini 1.5 Flash is optimized for speed
- ✅ **Powerful** - Better than GPT-3.5, comparable to GPT-4
- ✅ **No billing** - Unlike OpenAI, no payment setup needed

## How to Get Your FREE Gemini API Key

### Step 1: Visit Google AI Studio
Go to: **https://makersuite.google.com/app/apikey**

Or: **https://aistudio.google.com/app/apikey**

### Step 2: Sign in with Google
- Use any Google account (Gmail, etc.)
- No payment information required

### Step 3: Create API Key
1. Click **"Create API Key"** button
2. Select **"Create API key in new project"** (or use existing project)
3. Copy your API key (starts with `AIza...`)

### Step 4: Add to Your Project
1. Open your `.env` file
2. Add this line:
   ```
   GEMINI_API_KEY=AIzaSy...your_actual_key_here
   ```
3. Save the file
4. Restart the backend: `node smart-backend.js`

## Verification

After adding the key and restarting, you should see:
```
🤖 Google Gemini 1.5 Flash: ✅ ENABLED (FREE, will try first)
```

## Free Tier Limits

- **15 requests per minute** (RPM)
- **1 million tokens per minute** (TPM)
- **1,500 requests per day** (RPD)

This is **more than enough** for:
- Personal projects
- Hackathons
- Testing and development
- Small to medium applications

## What Happens Without API Key?

The system automatically falls back to the **Smart Algorithm**:
- Still generates intelligent questions
- Still evaluates answers accurately
- No AI features, but fully functional

## Comparison

| Feature | OpenAI GPT-3.5 | Google Gemini 1.5 Flash | Smart Algorithm |
|---------|----------------|-------------------------|-----------------|
| Cost | Requires credits | **FREE** | FREE |
| Quality | Good | **Excellent** | Good |
| Speed | Fast | **Very Fast** | Instant |
| Setup | Credit card needed | **No payment** | No setup |
| Limits | Pay per use | 15 RPM free | Unlimited |

## Recommended: Use Gemini!

For the best experience with **zero cost**, get your free Gemini API key! 🚀

## Troubleshooting

### "API key not valid"
- Make sure you copied the entire key
- Check for extra spaces in `.env` file
- Restart the backend after adding the key

### "Quota exceeded"
- Free tier: 15 requests/minute
- Wait 1 minute and try again
- System will automatically use Smart Algorithm as fallback

### "GEMINI_API_KEY not found"
- Check `.env` file exists in project root
- Make sure the line is: `GEMINI_API_KEY=your_key`
- No quotes needed around the key

## Support

- Google AI Studio: https://aistudio.google.com
- Gemini API Docs: https://ai.google.dev/docs
- Get API Key: https://makersuite.google.com/app/apikey
