# Scanner Bridge (Desktop App)

Electron + React desktop app for fingerprint attendance. Talks to any
Windows-Biometric-Framework (WBF) compatible scanner — the ChipSailing
WA28 module and similar generic USB fingerprint readers are supported
without needing a vendor-specific SDK.

## Architecture

```
  +--------------------+       stdin/stdout JSON       +------------------+
  |  Electron + React  |  <------------------------->  | ScannerHelper.exe |
  |  (renderer)        |                               |  .NET 8 (C#)      |
  +--------------------+                               +------------------+
          |                                                      |
          |                                                      |  WinBio API
          |                                                      v
          |                                            +------------------+
          |                                            | ChipSailing WBF  |
          |                                            | driver (USB)     |
          |                                            +------------------+
          |                                                      |
          v                                                      v
  +------------------+                                  +------------------+
  |    Firebase      |                                  |  Local template  |
  |  Firestore/Auth  |                                  |  store (on PC)   |
  +------------------+                                  +------------------+
```

- **WinBio** captures raw fingerprint samples from any WBF-compatible scanner.
- **SourceAFIS** (open-source, MPL licensed) extracts templates and matches
  fingerprints. No vendor matching engine required.
- Biometric templates stay on the PC; only employee IDs and scan times go
  to Firebase.

## First-time setup

Install these on the PC that will run the scanner bridge:

1. **Node.js 18+**  - https://nodejs.org
2. **.NET 8.0 SDK** - https://dotnet.microsoft.com/download
3. **Scanner driver** - ChipSailing WBF driver should already be installed
   (if Windows Hello works, this is fine).

## Build the Windows installer

Double-click **`build-windows.bat`**. It runs these four steps:

1. `npm install` (installs Electron, React, Firebase SDK)
2. `dotnet publish native/` -> compiles ScannerHelper.exe
3. `npm run build:renderer` -> Vite bundles the React UI
4. `npm run build:win` -> electron-builder wraps everything into an NSIS installer

Output: `release\Stock Manager Scanner Bridge Setup 1.0.0.exe`

Copy that `.exe` to the office PC, double-click, install. The installer
includes ScannerHelper.exe inside `resources/bin/`, so nothing extra has
to be copied.

## Dev mode

```
cd scanner-bridge
npm install
cd native && dotnet publish -c Release -r win-x64 --self-contained false -o ..\resources\bin
cd ..
npm run dev
```

## How attendance works end-to-end

1. Admin logs into the web dashboard, adds an employee "Bilal" with phone,
   CNIC, hourly rate, 4-digit backup PIN.
2. Admin opens the Scanner Bridge on the factory PC, logs in with the
   same credentials, goes to the **Enroll fingerprint** tab.
3. Admin clicks "Enroll finger" on Bilal's row. Bilal presses his finger
   on the scanner three times. ScannerHelper.exe captures each sample via
   WinBio, converts to a SourceAFIS template, keeps the best one, saves
   it locally and writes `fingerprintId` to Firebase.
4. Admin opens the **Attendance mode** tab, clicks **Start listening**.
   The app loops: capture -> match against all local templates -> if a
   match above threshold, write an attendance event to Firebase tagged
   `source: "scanner"` and the score.
5. Web dashboard, Attendance log, Employee attendance, and Payroll pages
   all see those events immediately.

## Tuning

- **Match threshold** lives in `native/Matcher.cs` (`Matcher.Threshold`).
  Default is 40 (SourceAFIS scale). Lower = more permissive (more false
  matches). Higher = stricter (more "not recognised" rejections). Try 40
  first; raise to 50-60 if you see wrong employees getting identified.
- **Sample count per enrollment** is 3 (in `Program.cs`). Keep it at 3
  for reliability.

## Why the scanner might report "not connected"

1. The ChipSailing WBF driver isn't installed -> reinstall via the CD
   that came with the device, or let Windows Update fetch it.
2. ScannerHelper.exe didn't compile -> re-run `build-windows.bat` and
   check for dotnet errors.
3. Another app is holding the device -> close any vendor utility
   ("ChipSailing Tool", "Fingerprint Manager") before starting Bridge.

## File layout

```
scanner-bridge/
|-- main.js                       Electron main process
|-- preload.js
|-- index.html
|-- vite.config.mjs
|-- package.json                  Electron + React + electron-builder config
|-- build-windows.bat             One-click Windows build
|-- build-unix.sh                 Equivalent for macOS/Linux (dev only)
|-- native/                       C# helper source
|   |-- ScannerHelper.csproj
|   |-- Program.cs                stdio JSON loop
|   |-- WinBio.cs                 P/Invoke to winbio.dll
|   |-- Matcher.cs                SourceAFIS extract + match + local store
|   `-- build.bat                 Compile only the C# helper
|-- resources/bin/                Compiled ScannerHelper.exe goes here
`-- src/                          React renderer
    |-- App.jsx
    |-- firebase.js               Same Firebase project as the web
    |-- lib/scanner.js            Spawns ScannerHelper.exe, speaks JSON to it
    |-- lib/useScannerStatus.js   React hook for connection state
    |-- components/ScannerStatus.jsx
    `-- pages/
        |-- Login.jsx
        |-- Dashboard.jsx
        `-- tabs/
            |-- EnrollTab.jsx
            `-- ScanTab.jsx
```

## Honest known caveats

- The WinBio raw-capture parser in `WinBio.cs` assumes the ANSI-381
  image format. Some scanners wrap their samples differently; if
  `CaptureSample` throws "Could not locate ANSI-381 fingerprint image",
  the fix is in `ParseBir()` and only takes a few lines once we see the
  actual header bytes of your scanner's output.
- SourceAFIS threshold needs real-world tuning. Start at 40, adjust.
- The helper runs synchronously per capture (~1-2s). For very large
  employee rosters (100+ people) matching will get noticeably slower
  because SourceAFIS compares against every template. That's still
  fine for factory-scale use.
