# PIKE Rush — Mac iMessage Bridge

This is a tiny local helper that lets the **PIKE Rush** app send mass texts
through **iMessage** from a Rush Chair's MacBook. The app itself queues the
messages; this bridge picks them up and sends them through `Messages.app`.

It must run on a **Mac** that is signed into iMessage. It will not work on
Windows or Linux.

```
You queue texts in the PIKE Rush app
            │
            ▼
   bridge.js (this script, on a Mac)
            │  polls every 5s for pending messages
            ▼
   Messages.app  ──►  iMessage  ──►  PNMs' phones
```

---

## What you need

- A **Mac** (MacBook, iMac, Mac mini — anything running macOS).
- **Messages.app** open and signed into iMessage with an Apple ID.
- **Node.js 18 or newer** (this is the only software you have to install).
- The PIKE Rush app running on the same network, and your **API key + app URL**
  (both are shown on the app's **Settings** page).

---

## One-time setup

### 1. Install Node.js

1. Go to <https://nodejs.org>.
2. Download the **LTS** version (the big green button) and run the installer.
3. Accept the defaults. When it finishes, you can verify it worked: open the
   **Terminal** app (press `Cmd + Space`, type "Terminal", hit Return) and run:

   ```bash
   node --version
   ```

   You should see something like `v20.x.x` (any version 18 or higher is fine).

### 2. Get the bridge folder onto your Mac

If you installed the PIKE Rush desktop app, this `bridge` folder is bundled
inside it. You can find it under the app's resources:

- **macOS app bundle:** right-click the app → *Show Package Contents* →
  `Contents/Resources/bridge`
- Copy that `bridge` folder somewhere easy to find, like your **Desktop**.

(If a Rush Chair sent you the `bridge` folder directly, just save it to your
Desktop.)

### 3. Configure your `.env` file

1. In the `bridge` folder, find the file named **`.env.example`**.
2. Make a copy of it and rename the copy to exactly **`.env`** (no `.example`).
3. Open `.env` in any text editor (TextEdit is fine) and fill in the two values
   from the app's **Settings** page:

   ```
   RUSHMANAGER_API_KEY=paste_the_key_from_Settings_here
   RUSHMANAGER_API_URL=http://192.168.1.42:47600
   ```

   - **`RUSHMANAGER_API_KEY`** — the bridge API key shown on the Settings page.
   - **`RUSHMANAGER_API_URL`** — the app URL shown on the Settings page (it will
     look like `http://` followed by an IP address and a port). Use the LAN URL
     the app shows, not `localhost`, unless the app is on this same Mac.

4. Save the file.

> No `npm install` is required — the bridge has **zero dependencies** and uses
> features built into Node.js 18+.

---

## Running a text blast

1. Make sure **Messages.app is open** and signed into iMessage.
2. Open **Terminal** and go to the bridge folder. For example, if it's on your
   Desktop:

   ```bash
   cd ~/Desktop/bridge
   ```

3. Start the bridge:

   ```bash
   node bridge.js
   ```

   (You can also run `npm start` — it does the same thing.)

4. You'll see something like:

   ```
   [3:14:07 PM] PIKE Rush iMessage bridge starting…
   [3:14:07 PM] API URL: http://192.168.1.42:47600
   [3:14:07 PM] Polling every 5s. Leave this Terminal window open while sending.
   ```

5. **Leave the Terminal window open.** Go to the app, queue your messages, and
   the bridge will start sending them. You'll see a live log of each send:

   ```
   [3:14:12 PM] Found 24 pending message(s).
   [3:14:13 PM]   ✓ sent  -> (615) 555-0142
   [3:14:14 PM]   ✗ failed -> (615) 555-0199: not reachable over iMessage
   ...
   [3:14:40 PM] Batch complete — 23 sent, 1 failed.
   ```

6. When you're done, press **`Ctrl + C`** in the Terminal to stop the bridge.

### The first time you send

macOS may pop up a permission dialog asking whether **Terminal** is allowed to
control **Messages**. Click **OK / Allow**. (If you accidentally deny it, go to
*System Settings → Privacy & Security → Automation* and enable Messages for
Terminal.)

---

## Important limitations

- **iMessage only (blue bubbles).** This method sends through iMessage. Numbers
  that are **not** registered with iMessage (most Android phones — the "green
  bubble" numbers) will **fail**. SMS fallback would require Twilio and is a
  future feature, not supported here. Failed numbers are reported back to the
  app as `failed`, so you can follow up another way.
- **Rate limit: ~1 message per second.** The bridge deliberately waits 1 second
  between sends so Apple doesn't flag the account for spam. A large blast takes
  a little while — that's expected. Don't close the Terminal mid-blast.
- **Messages.app must stay signed in and running** on this Mac the entire time.
- **The Mac must stay awake** and on the same network as the app while sending.
- Use a **single designated Mac** for sending so the queue isn't double-pulled.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Missing configuration` on startup | Your `.env` is missing or empty. Re-check step 3 — the file must be named exactly `.env` and have both values filled in. |
| `GET /api/messages/pending -> 401` | The API key is wrong. Re-copy it from the app's Settings page into `.env`. |
| `Poll error: fetch failed` | The app URL is wrong or the app isn't running/reachable. Confirm `RUSHMANAGER_API_URL` matches the URL on the Settings page and that both devices are on the same Wi-Fi. |
| Every message shows `✗ failed` | Messages.app isn't open / not signed into iMessage, or Terminal wasn't granted Automation permission for Messages. |
| A few messages fail | Those numbers probably aren't on iMessage (green-bubble / Android). Expected — see limitations above. |

---

Questions? Ask your Rush Chair / whoever administers the PIKE Rush app.
