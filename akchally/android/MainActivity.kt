package com.akchally.app

import android.os.Bundle
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity

// Option A: Simple WebView wrapper for akchally.com PWA
// Option B (for Play Store): Use Bubblewrap TWA - recommended
class MainActivity : AppCompatActivity() {
    lateinit var webView: WebView
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        webView = WebView(this)
        webView.settings.javaScriptEnabled = true
        webView.settings.domStorageEnabled = true
        webView.settings.mediaPlaybackRequiresUserGesture = false
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                request.grant(request.resources) // Grant mic for voice input
            }
        }
        // Load your PWA
        webView.loadUrl("https://akchally.com")
        setContentView(webView)
    }
    override fun onBackPressed() {
        if(webView.canGoBack()) webView.goBack() else super.onBackPressed()
    }
}