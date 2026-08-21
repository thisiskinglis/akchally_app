# Android Wrapper for Akchally

Two ways to ship to Android:

### Option 1: TWA (Recommended for Play Store)
PWA -> Native app via Trusted Web Activity, keeps your PWA installable.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://akchally.com/manifest.json
bubblewrap build
```

This gives you signed .aab to upload to Play Console.

### Option 2: Native WebView (this MainActivity.kt)
1. Create Android Studio project: com.akchally.app
2. Replace MainActivity with MainActivity.kt in this folder
3. Add permissions in AndroidManifest.xml:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```
4. Build APK.

Both request mic permission for voice input.