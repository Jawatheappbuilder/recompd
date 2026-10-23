# Apple Health via Shortcuts (free web-app option)

The iPhone home-screen web app cannot directly read Apple Health. This first version imports **daily summaries** locally on the iPhone. Nothing is uploaded to RECOMP'D's server. You must be signed in.

## iPhone Shortcut

1. Open **Shortcuts** → **+** → create a shortcut called **RECOMP'D Health Export**.
2. Add **Find Health Samples**, filter **Type = Step Count** and **Start Date = Today**. Get the **Sum** of their values; save as variable **Steps**. IMPORTANT: Health samples can overlap across sources; Apple's Health app may deduplicate them, whereas a raw sum might not. Compare the number with the Health app before importing.
3. Add **Current Date**, then **Format Date**, custom format `yyyy-MM-dd`, and save as **Day**.
4. Add **Text** with the following exact JSON, replacing each placeholder using the corresponding Shortcuts magic variable:
   `{"date":"[Day]","steps":[Steps]}`
   Make sure the steps variable is a plain number without comma separators.
5. Add **Copy to Clipboard**.
6. Open RECOMP'D → Settings → Health & activity → Apple Health, paste into the box, and tap **Import**.

Optional: add `"activeCalories":123` and `"averageHeartRate":110` when you have reliable daily totals. These are **daily summaries**, not workout-specific measurements. Do not treat them as matched RECOMP'D workout calories or live heart rate.

### Example
```json
{"date":"2026-10-24","steps":7420,"activeCalories":430,"averageHeartRate":91}
```

You can also paste an array of up to 90 days. Importing a date again replaces that date. Stored locally per signed-in user in this browser/device; clearing browser/site data removes it. No background sync or automatic Health permissions are claimed. Android Health Connect continues to work separately.
