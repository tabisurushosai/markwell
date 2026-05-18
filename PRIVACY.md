# Markwell Privacy Policy

**Effective date:** 2026-05-18

Markwell is a Chrome extension for highlighting web text and using optional AI features. This policy describes what data the extension handles and where it goes, based on the current implementation.

## Information Markwell collects

**Markwell does not collect personal information on its own servers.**

All highlights, tags, projects, syntheses, settings, license status, and device identifiers used by the extension are stored only in **`chrome.storage.local`** on your device. Markwell does not operate a user account database or sync your highlights to the cloud.

## External data transmission

Data leaves your device only in the cases below.

### Google Gemini API (optional)

When you enable AI features and configure a Gemini API key in Options:

- **What is sent:** Highlight text (`selected_text`) and notes attached to highlights (`note`), plus prompts built from that content for features such as synthesis, translation, rephrasing, Q&A, quote extraction, page summary, fact-checking, and related highlights.
- **When:** Only when you use an AI feature that calls Gemini.
- **Who receives it:** Requests go **directly from your browser to Google** (`generativelanguage.googleapis.com`). Your API key is included in those requests. **Markwell does not route this traffic through Markwell servers**, and Markwell does not receive your API key.

If you do not set an API key, the extension does not call the Gemini API.

### markwell-api.vercel.app (Premium license only)

When you verify a Premium license key (including periodic re-checks for active Premium licenses, about every seven days):

- **What is sent:** Your license key and a device ID generated and stored locally in `chrome.storage.local`.
- **When:** When you apply a license key in Options and during scheduled license re-verification while Premium is active.
- **Endpoint:** `https://markwell-api.vercel.app/api/verify-license`

Markwell does not send highlight content, notes, or your Gemini API key to this service.

Purchasing Premium via Stripe opens Stripe’s site in your browser; that flow is governed by Stripe’s privacy policy, not this document.

## Blocked domains and URL patterns

In Options you can list **blocked domains** and **blocked URL patterns**. On matching pages, Markwell’s content script does not run: the extension does not record highlights, show the selection toolbar, or interact with page text on those sites. No highlight data from those pages is stored locally by Markwell.

## Cookies

Markwell does not use cookies.

## Sharing with third parties

Markwell does not sell or share your data with third parties. The only external recipients are **Google** (when you use Gemini with your own API key) and **markwell-api.vercel.app** (for license verification as described above), each under your explicit use of those features.

## Deleting your data

- **In the extension:** Options → Data lets you export or delete local data. Deleting all data removes highlights, tags, projects, syntheses, and settings from `chrome.storage.local` while keeping license fields unless you change them separately.
- **Uninstalling:** Removing the extension from Chrome deletes its `chrome.storage.local` data for Markwell automatically.

## Contact

Questions about this policy: **tabisurushosai+markwell@gmail.com**
