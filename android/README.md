# Tajul Portfolio — Android app source

এটি `https://tajul.jayan.workers.dev/` ওয়েবসাইটের Android WebView app। অ্যাপটি ওয়েবসাইটের লাইভ সংস্করণ দেখায়; আলাদা backend বা content copy APK-র মধ্যে রাখা হয়নি। তাই ওয়েবসাইট, AI chat, contact form ও CV download ব্যবহার করতে ইন্টারনেট সংযোগ প্রয়োজন। সাইটে বাইরে যাওয়ার লিংক Android-এর browser/app-এ খোলে।

অ্যাপের উপরের `⋮` menu থেকে Home বা Admin panel খোলা যায়। Admin panel-এ sign in করলে website content add/remove/reorder/save/reset, inbox message দেখা/মুছা এবং password settings পরিচালনা করা যায়।

AI-র Tajul-সম্পর্কিত উত্তর শুধু website profile ও প্রকাশিত CV-র তথ্য ব্যবহার করে; ওই প্রশ্নগুলো বাইরের search-এ পাঠানো হয় না। সাধারণ প্রশ্নে query Bing ও Wikipedia search-এ পাঠানো হয় এবং পাওয়া source link উত্তরের সঙ্গে দেখানো হয়।

## Build

Android Studio-তে এই folder খুলে Gradle sync করে `app`-এর `assembleDebug` চালান। অথবা command line-এ:

```bash
./gradlew assembleDebug
```

আউটপুট: `app/build/outputs/apk/debug/app-debug.apk`। Android SDK platform 35 এবং Java 17 বা পরবর্তী সংস্করণ দরকার। `minSdk` 23; target SDK 34।

## App info

- App label: Tajul Portfolio
- Application ID: `com.tajul.redwan.portfolio`
- Version: 1.0 (versionCode 1)
- APK: debug-signed, সরাসরি Android-এ install/test করার জন্য। Google Play release-এর জন্য আলাদা production signing key ও Play Store প্রস্তুতি লাগবে।
