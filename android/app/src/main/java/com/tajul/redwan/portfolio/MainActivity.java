package com.tajul.redwan.portfolio;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.PopupMenu;
import android.widget.TextView;

public class MainActivity extends Activity {
    private static final String HOME = "https://tajul.jayan.workers.dev/";
    private static final String ADMIN = HOME + "admin";
    private static final String SITE_HOST = "tajul.jayan.workers.dev";
    private static final String PAGE_BG = "#0b1220";

    private WebView webView;
    private LinearLayout root;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 18, 32));
        getWindow().setNavigationBarColor(Color.rgb(11, 18, 32));
        getWindow().getDecorView().setSystemUiVisibility(0);

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(11, 18, 32));

        LinearLayout toolbar = new LinearLayout(this);
        toolbar.setGravity(android.view.Gravity.CENTER_VERTICAL);
        toolbar.setPadding(dp(16), 0, dp(8), 0);
        toolbar.setBackgroundColor(Color.rgb(11, 18, 32));
        TextView appTitle = new TextView(this);
        appTitle.setText("Tajul Portfolio");
        appTitle.setTextColor(Color.WHITE);
        appTitle.setTextSize(17);
        appTitle.setTypeface(null, Typeface.BOLD);
        toolbar.addView(appTitle, new LinearLayout.LayoutParams(0, dp(52), 1f));
        Button menuButton = new Button(this);
        menuButton.setText("⋮");
        menuButton.setTextColor(Color.WHITE);
        menuButton.setTextSize(24);
        menuButton.setAllCaps(false);
        menuButton.setContentDescription("Open app menu");
        menuButton.setBackgroundColor(Color.TRANSPARENT);
        toolbar.addView(menuButton, new LinearLayout.LayoutParams(dp(48), dp(52)));
        menuButton.setOnClickListener(v -> {
            PopupMenu menu = new PopupMenu(this, menuButton);
            menu.getMenu().add(0, 1, 0, "Home");
            menu.getMenu().add(0, 2, 1, "Admin panel");
            menu.setOnMenuItemClickListener(item -> {
                if (item.getItemId() == 1) webView.loadUrl(HOME);
                else if (item.getItemId() == 2) webView.loadUrl(ADMIN);
                else return false;
                return true;
            });
            menu.show();
        });
        root.addView(toolbar, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(52)));

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(11, 18, 32));
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) settings.setSafeBrowsingEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        CookieManager.getInstance().setAcceptCookie(true);

        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                return routeUrl(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return routeUrl(Uri.parse(url));
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showOfflineMessage();
            }
        });

        webView.setDownloadListener(new DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition,
                                       String mimeType, long contentLength) {
                try {
                    DownloadManager.Request request = new DownloadManager.Request(Uri.parse(url));
                    request.setTitle(URLUtil.guessFileName(url, contentDisposition, mimeType));
                    request.setDescription("Downloading from Tajul's portfolio");
                    request.setMimeType(mimeType);
                    request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,
                            URLUtil.guessFileName(url, contentDisposition, mimeType));
                    String cookie = CookieManager.getInstance().getCookie(url);
                    if (cookie != null) request.addRequestHeader("Cookie", cookie);
                    if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                    ((DownloadManager) getSystemService(DOWNLOAD_SERVICE)).enqueue(request);
                } catch (Exception ignored) {
                    openExternal(Uri.parse(url));
                }
            }
        });

        root.addView(webView, new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        setContentView(root);

        if (savedInstanceState != null && webView.restoreState(savedInstanceState) != null) {
            // Keep the current page when Android recreates the activity.
        } else {
            webView.loadUrl(HOME);
        }
    }

    private int dp(float value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private boolean routeUrl(Uri uri) {
        String scheme = uri.getScheme();
        if (scheme == null) return true;
        if ("https".equalsIgnoreCase(scheme) || "http".equalsIgnoreCase(scheme)) {
            if (SITE_HOST.equalsIgnoreCase(uri.getHost())) return false;
            openExternal(uri);
            return true;
        }
        // Email, phone, WhatsApp, and other app links are handed to Android.
        openExternal(uri);
        return true;
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (Exception ignored) {
            // Leave the portfolio usable when no app can handle a link.
        }
    }

    private void showOfflineMessage() {
        String html = "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                + "<meta charset='utf-8'><style>body{margin:0;padding:36px 24px;background:" + PAGE_BG
                + ";color:#f1f5f9;font:16px sans-serif;text-align:center}h2{margin-top:30vh}p{color:#aab5c8}"
                + "button{background:#55d6be;border:0;border-radius:10px;padding:13px 22px;font-weight:bold}</style></head>"
                + "<body><h2>Can't connect right now</h2><p>Check your internet connection and try again.</p>"
                + "<button onclick='location.href=&quot;" + HOME + "&quot;'>Try again</button></body></html>";
        webView.loadDataWithBaseURL(HOME, html, "text/html", "UTF-8", null);
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        if (webView != null) webView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
