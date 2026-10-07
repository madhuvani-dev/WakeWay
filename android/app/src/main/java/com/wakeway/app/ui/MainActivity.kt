package com.wakeway.app.ui

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.util.Base64
import android.util.Log
import android.webkit.ConsoleMessage
import android.webkit.GeolocationPermissions
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLDecoder
import java.net.URLEncoder
import java.util.Locale
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.pow


class MainActivity : ComponentActivity() {

    companion object {

        private const val TAG_SHARE = "WakeWayShare"
        private const val TAG_PLUS = "WakeWayPlusCode"
        private const val TAG_WEB = "WakeWayWebView"

        private const val PREFS_NAME = "wakeway_prefs"
        private const val PREF_AUDIO_URI = "custom_audio_uri"
        private const val PREF_AUDIO_NAME = "custom_audio_name"

        private const val DEFAULT_AUDIO_NAME =
            "WakeWay Gentle Chime (Default)"
    }

    private lateinit var webView: WebView

    private var pendingAudioCallback:
            ValueCallback<Array<Uri>>? = null


    /*
     * ============================================================
     * LOCATION PERMISSION
     * ============================================================
     */

    private val locationPermissionLauncher =
        registerForActivityResult(
            ActivityResultContracts.RequestMultiplePermissions()
        ) { permissions ->

            val granted =
                permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                        permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true

            Log.d(
                TAG_WEB,
                "Location permission result: $granted"
            )

            if (::webView.isInitialized) {

                webView.evaluateJavascript(
                    """
                    window.dispatchEvent(
                        new CustomEvent(
                            'wakewayLocationPermissionChanged',
                            {
                                detail: {
                                    granted: $granted
                                }
                            }
                        )
                    );
                    """.trimIndent(),
                    null
                )
            }
        }

    private fun requestLocationPermissionIfNeeded() {

        val fineGranted =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

        val coarseGranted =
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED

        if (!fineGranted && !coarseGranted) {

            locationPermissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }


    /*
     * ============================================================
     * AUDIO PICKER
     * ============================================================
     */

    private val audioPickerLauncher =
        registerForActivityResult(
            ActivityResultContracts.OpenDocument()
        ) { uri ->

            pendingAudioCallback?.let { callback ->

                if (uri != null) {

                    try {

                        contentResolver.takePersistableUriPermission(
                            uri,
                            Intent.FLAG_GRANT_READ_URI_PERMISSION
                        )

                    } catch (e: Exception) {

                        Log.w(
                            TAG_WEB,
                            "Could not persist URI permission: ${e.message}"
                        )
                    }

                    saveCustomAudio(uri)

                    callback.onReceiveValue(
                        arrayOf(uri)
                    )

                } else {

                    callback.onReceiveValue(
                        emptyArray()
                    )
                }
            }

            pendingAudioCallback = null
        }


    /*
     * ============================================================
     * ACTIVITY
     * ============================================================
     */

    override fun onCreate(
        savedInstanceState: Bundle?
    ) {

        super.onCreate(savedInstanceState)

        setupWebView()

        requestLocationPermissionIfNeeded()

        handleIncomingIntent(intent)
    }

    override fun onNewIntent(
        intent: Intent
    ) {

        super.onNewIntent(intent)

        setIntent(intent)

        handleIncomingIntent(intent)
    }


    /*
     * ============================================================
     * WEBVIEW
     * ============================================================
     */

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {

        webView = WebView(this)

        setContentView(webView)

        webView.settings.apply {

            javaScriptEnabled = true

            domStorageEnabled = true

            @Suppress("DEPRECATION")
            databaseEnabled = true

            allowFileAccess = true

            allowContentAccess = true

            @Suppress("DEPRECATION")
            allowFileAccessFromFileURLs = true

            @Suppress("DEPRECATION")
            allowUniversalAccessFromFileURLs = true

            mediaPlaybackRequiresUserGesture = false

            cacheMode = WebSettings.LOAD_DEFAULT
        }

        webView.webViewClient =
            object : WebViewClient() {

                override fun shouldOverrideUrlLoading(
                    view: WebView,
                    request: WebResourceRequest
                ): Boolean {

                    return false
                }
            }

        webView.webChromeClient =
            object : WebChromeClient() {

                override fun onConsoleMessage(
                    consoleMessage: ConsoleMessage
                ): Boolean {

                    Log.d(
                        TAG_WEB,
                        "${consoleMessage.message()} " +
                                "(${consoleMessage.sourceId()}:" +
                                "${consoleMessage.lineNumber()})"
                    )

                    return true
                }

                override fun onGeolocationPermissionsShowPrompt(
                    origin: String,
                    callback: GeolocationPermissions.Callback
                ) {

                    val fineGranted =
                        ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.ACCESS_FINE_LOCATION
                        ) == PackageManager.PERMISSION_GRANTED

                    val coarseGranted =
                        ContextCompat.checkSelfPermission(
                            this@MainActivity,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        ) == PackageManager.PERMISSION_GRANTED

                    if (fineGranted || coarseGranted) {

                        callback.invoke(
                            origin,
                            true,
                            false
                        )

                    } else {

                        requestLocationPermissionIfNeeded()

                        callback.invoke(
                            origin,
                            false,
                            false
                        )
                    }
                }

                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {

                    pendingAudioCallback?.onReceiveValue(null)

                    pendingAudioCallback = filePathCallback

                    try {

                        audioPickerLauncher.launch(
                            arrayOf("audio/*")
                        )

                    } catch (e: Exception) {

                        pendingAudioCallback = null

                        filePathCallback?.onReceiveValue(null)

                        Log.e(
                            TAG_WEB,
                            "Audio picker failed",
                            e
                        )
                    }

                    return true
                }
            }

        webView.addJavascriptInterface(
            WakeWayAndroidBridge(),
            "WakeWayAndroid"
        )

        try {

            webView.loadUrl(
                "file:///android_asset/index.html"
            )

        } catch (e: Exception) {

            Log.e(
                TAG_WEB,
                "Failed to load index.html",
                e
            )
        }
    }


    /*
     * ============================================================
     * CUSTOM AUDIO
     * ============================================================
     */

    private fun getPrefs() =
        getSharedPreferences(
            PREFS_NAME,
            Context.MODE_PRIVATE
        )

    private fun saveCustomAudio(
        uri: Uri
    ) {

        val name =
            getFileName(uri)
                ?: DEFAULT_AUDIO_NAME

        getPrefs()
            .edit()
            .putString(
                PREF_AUDIO_URI,
                uri.toString()
            )
            .putString(
                PREF_AUDIO_NAME,
                name
            )
            .apply()

        Log.d(
            TAG_WEB,
            "Custom audio saved: $name"
        )
    }

    private fun getSavedAudioUri(): Uri? {

        val value =
            getPrefs()
                .getString(
                    PREF_AUDIO_URI,
                    null
                )

        return value?.let {
            Uri.parse(it)
        }
    }

    private fun getSavedAudioName(): String {

        return getPrefs()
            .getString(
                PREF_AUDIO_NAME,
                DEFAULT_AUDIO_NAME
            )
            ?: DEFAULT_AUDIO_NAME
    }

    private fun getFileName(
        uri: Uri
    ): String? {

        return try {

            contentResolver
                .query(
                    uri,
                    arrayOf(
                        android.provider.OpenableColumns.DISPLAY_NAME
                    ),
                    null,
                    null,
                    null
                )
                ?.use { cursor ->

                    if (cursor.moveToFirst()) {

                        val index =
                            cursor.getColumnIndex(
                                android.provider.OpenableColumns.DISPLAY_NAME
                            )

                        if (index >= 0) {
                            cursor.getString(index)
                        } else {
                            null
                        }

                    } else {
                        null
                    }
                }

        } catch (e: Exception) {

            Log.e(
                TAG_WEB,
                "Could not get audio filename",
                e
            )

            null
        }
    }

    private fun getAudioDataUrl(): String? {

        val uri =
            getSavedAudioUri()
                ?: return null

        return try {

            val bytes =
                contentResolver
                    .openInputStream(uri)
                    ?.use { input ->

                        val output =
                            ByteArrayOutputStream()

                        val buffer =
                            ByteArray(8192)

                        var count: Int

                        while (
                            input.read(buffer)
                                .also { count = it } != -1
                        ) {

                            output.write(
                                buffer,
                                0,
                                count
                            )
                        }

                        output.toByteArray()

                    }
                    ?: return null

            val base64 =
                Base64.encodeToString(
                    bytes,
                    Base64.NO_WRAP
                )

            val mime =
                contentResolver.getType(uri)
                    ?: "audio/mpeg"

            "data:$mime;base64,$base64"

        } catch (e: Exception) {

            Log.e(
                TAG_WEB,
                "Could not create audio data URL",
                e
            )

            null
        }
    }

    private fun deleteCustomAudio() {

        getPrefs()
            .edit()
            .remove(PREF_AUDIO_URI)
            .remove(PREF_AUDIO_NAME)
            .apply()

        Log.d(
            TAG_WEB,
            "Custom audio deleted"
        )
    }


    /*
     * ============================================================
     * JAVASCRIPT BRIDGE
     * ============================================================
     */

    inner class WakeWayAndroidBridge {

        @JavascriptInterface
        fun hasCustomAudio(): Boolean {
            return getSavedAudioUri() != null
        }

        @JavascriptInterface
        fun getCustomAudioName(): String {
            return getSavedAudioName()
        }

        @JavascriptInterface
        fun getCustomAudioDataUrl(): String {
            return getAudioDataUrl() ?: ""
        }

        @JavascriptInterface
        fun deleteCustomAudio() {

            runOnUiThread {
                this@MainActivity.deleteCustomAudio()
            }
        }

        @JavascriptInterface
        fun openCustomAudioPicker() {

            runOnUiThread {

                try {

                    audioPickerLauncher.launch(
                        arrayOf("audio/*")
                    )

                } catch (e: Exception) {

                    Log.e(
                        TAG_WEB,
                        "Could not open audio picker",
                        e
                    )
                }
            }
        }

        @JavascriptInterface
        fun pickAudioFile() {
            openCustomAudioPicker()
        }

        @JavascriptInterface
        fun getSharedLocation(): String {
            return ""
        }

        @JavascriptInterface
        fun openMaps(
            latitude: Double,
            longitude: Double
        ) {

            runOnUiThread {

                val uri =
                    Uri.parse(
                        "google.navigation:q=$latitude,$longitude"
                    )

                val intent =
                    Intent(
                        Intent.ACTION_VIEW,
                        uri
                    )

                intent.setPackage(
                    "com.google.android.apps.maps"
                )

                try {

                    startActivity(intent)

                } catch (e: Exception) {

                    startActivity(
                        Intent(
                            Intent.ACTION_VIEW,
                            Uri.parse(
                                "https://www.google.com/maps/dir/" +
                                        "?api=1&destination=" +
                                        "$latitude,$longitude"
                            )
                        )
                    )
                }
            }
        }

        @JavascriptInterface
        fun callPhone(
            phone: String
        ) {

            runOnUiThread {

                try {

                    val intent =
                        Intent(
                            Intent.ACTION_DIAL,
                            Uri.parse("tel:$phone")
                        )

                    startActivity(intent)

                } catch (e: Exception) {

                    Log.e(
                        TAG_WEB,
                        "Could not open dialer",
                        e
                    )
                }
            }
        }

        @JavascriptInterface
        fun requestLocationPermission() {

            runOnUiThread {
                requestLocationPermissionIfNeeded()
            }
        }

        @JavascriptInterface
        fun isLocationPermissionGranted(): Boolean {

            return ContextCompat.checkSelfPermission(
                this@MainActivity,
                Manifest.permission.ACCESS_FINE_LOCATION
            ) == PackageManager.PERMISSION_GRANTED ||
                    ContextCompat.checkSelfPermission(
                        this@MainActivity,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    ) == PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun openAppSettings() {

            runOnUiThread {

                try {

                    startActivity(
                        Intent(
                            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                            Uri.parse("package:$packageName")
                        )
                    )

                } catch (e: Exception) {

                    Log.e(
                        TAG_WEB,
                        "Could not open settings",
                        e
                    )
                }
            }
        }
    }


    /*
     * ============================================================
     * SHARED LOCATION
     * ============================================================
     */

    private fun handleIncomingIntent(
        intent: Intent?
    ) {

        if (intent == null) {
            return
        }

        Log.d(
            TAG_SHARE,
            "Incoming intent action: ${intent.action}"
        )

        when (intent.action) {

            Intent.ACTION_SEND -> {

                val text =
                    intent.getStringExtra(
                        Intent.EXTRA_TEXT
                    )

                val subject =
                    intent.getStringExtra(
                        Intent.EXTRA_SUBJECT
                    )

                Log.d(
                    TAG_SHARE,
                    "EXTRA_TEXT = $text"
                )

                Log.d(
                    TAG_SHARE,
                    "EXTRA_SUBJECT = $subject"
                )

                if (
                    !text.isNullOrBlank() ||
                    !subject.isNullOrBlank()
                ) {

                    processSharedLocation(
                        text,
                        subject
                    )
                }
            }

            Intent.ACTION_VIEW -> {

                val uri =
                    intent.data?.toString()

                if (!uri.isNullOrBlank()) {

                    processSharedLocation(
                        uri,
                        null
                    )
                }
            }
        }
    }

    private fun processSharedLocation(
        text: String?,
        subject: String?
    ) {

        Log.d(
            TAG_SHARE,
            "Processing shared text: $text"
        )

        Log.d(
            TAG_SHARE,
            "Shared subject: $subject"
        )

        val cleanSubject =
            cleanSharedPlaceName(subject)

        val combined =
            listOfNotNull(
                subject,
                text
            )
                .joinToString(" ")

        /*
         * --------------------------------------------------------
         * 1. GEO URI
         * --------------------------------------------------------
         */

        val geoLocation =
            parseGeoUri(text)
                ?: parseGeoUri(subject)

        if (geoLocation != null) {

            createSharedLocation(
                geoLocation.name,
                geoLocation.latitude,
                geoLocation.longitude,
                geoLocation.address
            )

            return
        }

        /*
         * --------------------------------------------------------
         * 2. URL
         * --------------------------------------------------------
         */

        val url =
            extractUrl(text)
                ?: extractUrl(subject)

        if (url != null) {

            Log.d(
                TAG_SHARE,
                "Detected URL: $url"
            )

            val fallback =
                cleanSubject
                    ?.takeIf { it.isNotBlank() }
                    ?: extractUsefulPlaceText(combined)
                    ?: "Shared Location"

            Log.d(
                TAG_SHARE,
                "Clean URL fallback name: $fallback"
            )

            parseUrlForLocation(
                url,
                fallback
            )

            return
        }

        /*
         * --------------------------------------------------------
         * 3. PLUS CODE
         * --------------------------------------------------------
         */

        val plusCode =
            extractPlusCode(combined)

        if (plusCode != null) {

            Log.d(
                TAG_SHARE,
                "Detected Plus Code: $plusCode"
            )

            val locality =
                removePlusCodeFromText(
                    combined,
                    plusCode
                )
                    ?.let {
                        cleanPlaceText(it)
                    }

            Log.d(
                TAG_SHARE,
                "Plus Code locality: $locality"
            )

            if (
                OpenLocationCode.isFull(
                    plusCode
                )
            ) {

                try {

                    val area =
                        OpenLocationCode.decode(
                            plusCode
                        )

                    Log.d(
                        TAG_SHARE,
                        "Decoded full Plus Code center: " +
                                "${area.latitudeCenter}, " +
                                "${area.longitudeCenter}"
                    )

                    createSharedLocation(
                        locality ?: plusCode,
                        area.latitudeCenter,
                        area.longitudeCenter,
                        locality
                    )

                    return

                } catch (e: Exception) {

                    Log.e(
                        TAG_PLUS,
                        "Full Plus Code decode failed",
                        e
                    )
                }
            }

            if (!locality.isNullOrBlank()) {

                geocodeLocalityForPlusCode(
                    plusCode,
                    locality
                )

                return
            }
        }

        /*
         * --------------------------------------------------------
         * 4. NORMAL PLACE NAME
         * --------------------------------------------------------
         */

        val place =
            cleanSubject
                ?: cleanPlaceText(combined)

        if (place.isNotBlank()) {

            geocodePlaceName(
                place = place,
                displayName = place,
                contextAddress = place
            )
        }
    }


    /*
     * ============================================================
     * CLEAN SHARED PLACE NAME
     * ============================================================
     */

    private fun cleanSharedPlaceName(
        value: String?
    ): String? {

        if (value.isNullOrBlank()) {
            return null
        }

        val withoutUrl =
            value
                .replace(
                    Regex(
                        """https?://\S+"""
                    ),
                    ""
                )
                .replace(
                    Regex(
                        """\s+"""
                    ),
                    " "
                )
                .trim(
                    ' ',
                    ',',
                    '-',
                    '|'
                )

        return withoutUrl
            .takeIf {
                it.isNotBlank()
            }
    }

    private fun cleanPlaceText(
        value: String
    ): String {

        return value
            .replace(
                Regex(
                    """https?://\S+"""
                ),
                ""
            )
            .replace(
                Regex(
                    """\s+"""
                ),
                " "
            )
            .trim(
                ' ',
                ',',
                '-',
                '|'
            )
    }

    private fun extractUsefulPlaceText(
        value: String
    ): String? {

        val cleaned =
            cleanPlaceText(value)

        return cleaned.takeIf {
            it.isNotBlank()
        }
    }

    private fun extractUrl(
        value: String?
    ): String? {

        if (value.isNullOrBlank()) {
            return null
        }

        val regex =
            Regex(
                """https?://[^\s<>"']+"""
            )

        val match =
            regex.find(value)
                ?: return null

        return match.value
            .trim()
            .trimEnd(
                '.',
                ',',
                ';',
                ':',
                ')',
                ']',
                '}'
            )
            .takeIf {
                it.isNotBlank()
            }
    }


    /*
     * ============================================================
     * GEO URI
     * ============================================================
     */

    private data class SharedCoordinates(
        val latitude: Double,
        val longitude: Double,
        val name: String?,
        val address: String?
    )

    private fun parseGeoUri(
        value: String?
    ): SharedCoordinates? {

        if (value.isNullOrBlank()) {
            return null
        }

        if (
            !value.trim()
                .startsWith(
                    "geo:",
                    ignoreCase = true
                )
        ) {

            return null
        }

        return try {

            val uri =
                Uri.parse(
                    value.trim()
                )

            val path =
                uri.schemeSpecificPart
                    ?.substringBefore("?")
                    ?: return null

            val parts =
                path.split(",")

            if (parts.size < 2) {
                return null
            }

            val latitude =
                parts[0].toDoubleOrNull()
                    ?: return null

            val longitude =
                parts[1].toDoubleOrNull()
                    ?: return null

            if (
                latitude !in -90.0..90.0 ||
                longitude !in -180.0..180.0
            ) {
                return null
            }

            SharedCoordinates(
                latitude = latitude,
                longitude = longitude,
                name = uri.getQueryParameter("q"),
                address = uri.getQueryParameter("q")
            )

        } catch (e: Exception) {

            Log.e(
                TAG_SHARE,
                "Geo URI parsing failed",
                e
            )

            null
        }
    }


    /*
     * ============================================================
     * PLUS CODE EXTRACTION
     * ============================================================
     */

    private fun extractPlusCode(
        value: String?
    ): String? {

        if (value.isNullOrBlank()) {
            return null
        }

        val regex =
            Regex(
                """(?i)(?<![A-Z0-9])[23456789CFGHJMPQRVWX]{2,8}\+[23456789CFGHJMPQRVWX]{2,7}(?![A-Z0-9])"""
            )

        val match =
            regex.find(value)
                ?: return null

        val code =
            match.value
                .uppercase(Locale.US)

        return try {

            if (
                OpenLocationCode.isValid(code)
            ) {
                code
            } else {
                null
            }

        } catch (
            _: Exception
        ) {

            null
        }
    }

    private fun removePlusCodeFromText(
        value: String,
        plusCode: String
    ): String? {

        val result =
            value
                .replace(
                    plusCode,
                    "",
                    ignoreCase = true
                )
                .replace(
                    Regex("""\s+"""),
                    " "
                )
                .trim(
                    ' ',
                    ',',
                    '-'
                )

        return if (
            result.isBlank()
        ) {
            null
        } else {
            result
        }
    }


    /*
     * ============================================================
     * PHOTON HELPERS
     * ============================================================
     */

    private fun normalizeMatchText(
        value: String?
    ): String {

        if (value.isNullOrBlank()) {
            return ""
        }

        return value
            .lowercase(Locale.US)
            .replace(
                Regex(
                    """[^\p{L}\p{N}]+"""
                ),
                " "
            )
            .replace(
                Regex("""\s+"""),
                " "
            )
            .trim()
    }

    private fun meaningfulTokens(
        value: String?
    ): Set<String> {

        val stopWords =
            setOf(
                "the",
                "and",
                "near",
                "opposite",
                "opp",
                "road",
                "rd",
                "street",
                "st",
                "roadway",
                "no",
                "number",
                "shop",
                "building",
                "block",
                "floor",
                "unit",
                "complex",
                "area",
                "district",
                "state",
                "country"
            )

        return normalizeMatchText(value)
            .split(" ")
            .map { it.trim() }
            .filter {
                it.length >= 3 &&
                        it !in stopWords
            }
            .toSet()
    }

    private fun scorePhotonFeature(
        feature: JSONObject,
        source: String,
        displayName: String? = null
    ): Int {

        val properties =
            feature.optJSONObject(
                "properties"
            )
                ?: return Int.MIN_VALUE

        val sourceNormalized =
            normalizeMatchText(source)

        if (sourceNormalized.isBlank()) {
            return 0
        }

        val sourceTokens =
            meaningfulTokens(source)

        val candidateName =
            properties.optString("name")

        val street =
            properties.optString("street")

        val district =
            properties.optString("district")

        val city =
            properties.optString("city")

        val state =
            properties.optString("state")

        val country =
            properties.optString("country")

        val postcode =
            properties.optString("postcode")

        val countryCode =
            properties.optString("countrycode")

        val candidateParts =
            listOf(
                candidateName,
                street,
                district,
                city,
                state,
                country,
                postcode,
                countryCode
            )
                .filter {
                    it.isNotBlank()
                }

        val candidateNormalized =
            normalizeMatchText(
                candidateParts.joinToString(" ")
            )

        var score = 0

        /*
         * --------------------------------------------------------
         * DISPLAY NAME MATCH
         * --------------------------------------------------------
         */

        if (!displayName.isNullOrBlank()) {

            val normalizedDisplay =
                normalizeMatchText(
                    displayName
                )

            val normalizedCandidateName =
                normalizeMatchText(
                    candidateName
                )

            if (
                normalizedDisplay.isNotBlank() &&
                normalizedCandidateName.isNotBlank()
            ) {

                if (
                    normalizedDisplay ==
                    normalizedCandidateName
                ) {

                    score += 150

                } else if (
                    normalizedDisplay.contains(
                        normalizedCandidateName
                    ) ||
                    normalizedCandidateName.contains(
                        normalizedDisplay
                    )
                ) {

                    score += 80
                }
            }
        }

        /*
         * --------------------------------------------------------
         * EXACT POSTCODE
         * --------------------------------------------------------
         */

        val sourcePostcodes =
            Regex(
                """\b\d{3,10}[A-Z]?\b"""
            )
                .findAll(source)
                .map {
                    normalizeMatchText(
                        it.value
                    )
                }
                .filter {
                    it.length >= 3
                }
                .toSet()

        if (
            sourcePostcodes.isNotEmpty() &&
            postcode.isNotBlank()
        ) {

            val normalizedPostcode =
                normalizeMatchText(
                    postcode
                )

            if (
                sourcePostcodes.contains(
                    normalizedPostcode
                )
            ) {

                score += 120
            }
        }

        /*
         * --------------------------------------------------------
         * COUNTRY / STATE / CITY / DISTRICT
         * --------------------------------------------------------
         */

        val regionValues =
            listOf(
                country to 90,
                state to 80,
                city to 70,
                district to 60
            )

        for ((value, points) in regionValues) {

            val normalizedValue =
                normalizeMatchText(value)

            if (
                normalizedValue.isBlank() ||
                normalizedValue.length < 3
            ) {
                continue
            }

            if (
                sourceNormalized == normalizedValue ||
                sourceNormalized.contains(
                    normalizedValue
                )
            ) {

                score += points

            } else {

                val fieldTokens =
                    normalizedValue
                        .split(" ")
                        .filter {
                            it.length >= 3
                        }
                        .toSet()

                if (
                    fieldTokens.isNotEmpty() &&
                    sourceTokens.containsAll(
                        fieldTokens
                    )
                ) {

                    score += points - 10
                }
            }
        }

        /*
         * --------------------------------------------------------
         * NAME MATCH
         * --------------------------------------------------------
         */

        val normalizedName =
            normalizeMatchText(
                candidateName
            )

        if (
            normalizedName.isNotBlank() &&
            normalizedName.length >= 4 &&
            sourceNormalized.contains(
                normalizedName
            )
        ) {

            score += 70
        }

        /*
         * --------------------------------------------------------
         * STREET MATCH
         * --------------------------------------------------------
         */

        val normalizedStreet =
            normalizeMatchText(
                street
            )

        if (
            normalizedStreet.isNotBlank() &&
            normalizedStreet.length >= 4 &&
            sourceNormalized.contains(
                normalizedStreet
            )
        ) {

            score += 35
        }

        /*
         * --------------------------------------------------------
         * FULL ADDRESS MATCH
         * --------------------------------------------------------
         */

        if (
            candidateNormalized.length >= 8 &&
            sourceNormalized.contains(
                candidateNormalized
            )
        ) {

            score += 50
        }

        /*
         * --------------------------------------------------------
         * TOKEN OVERLAP
         * --------------------------------------------------------
         */

        val candidateTokens =
            meaningfulTokens(
                candidateParts.joinToString(" ")
            )

        if (
            sourceTokens.isNotEmpty() &&
            candidateTokens.isNotEmpty()
        ) {

            val overlap =
                sourceTokens
                    .intersect(candidateTokens)
                    .size

            score +=
                min(
                    overlap * 5,
                    40
                )
        }

        return score
    }

    private fun selectBestPhotonFeature(
        features: org.json.JSONArray,
        source: String,
        displayName: String? = null
    ): JSONObject? {

        if (features.length() == 0) {
            return null
        }

        var bestFeature: JSONObject? = null
        var bestScore = Int.MIN_VALUE

        for (
            index in 0 until features.length()
        ) {

            val feature =
                features.getJSONObject(index)

            val score =
                scorePhotonFeature(
                    feature,
                    source,
                    displayName
                )

            val properties =
                feature.optJSONObject(
                    "properties"
                )

            val name =
                properties
                    ?.optString("name")
                    ?: ""

            val city =
                properties
                    ?.optString("city")
                    ?: ""

            val state =
                properties
                    ?.optString("state")
                    ?: ""

            val country =
                properties
                    ?.optString("country")
                    ?: ""

            Log.d(
                TAG_SHARE,
                "Photon candidate[$index]: " +
                        "$name | $city | $state | $country | score=$score"
            )

            if (
                score > bestScore
            ) {

                bestScore = score
                bestFeature = feature
            }
        }

        Log.d(
            TAG_SHARE,
            "Best Photon candidate score: $bestScore"
        )

        return bestFeature
    }


    /*
     * ============================================================
     * PHOTON LOCALITY LOOKUP FOR SHORT PLUS CODES
     * ============================================================
     */

    private fun geocodeLocalityForPlusCode(
        plusCode: String,
        locality: String
    ) {

        Thread {

            try {

                val cleanLocality =
                    cleanPlaceText(locality)

                val query =
                    URLEncoder.encode(
                        cleanLocality,
                        "UTF-8"
                    )

                val requestUrl =
                    "https://photon.komoot.io/api/" +
                            "?q=$query" +
                            "&limit=10" +
                            "&lang=en"

                Log.d(
                    TAG_SHARE,
                    "Photon locality request: $requestUrl"
                )

                val connection =
                    URL(requestUrl)
                        .openConnection()
                            as HttpURLConnection

                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.requestMethod = "GET"

                val responseCode =
                    connection.responseCode

                Log.d(
                    TAG_SHARE,
                    "Photon locality response: $responseCode"
                )

                if (
                    responseCode !=
                    HttpURLConnection.HTTP_OK
                ) {

                    connection.disconnect()

                    runOnUiThread {

                        geocodePlaceName(
                            place = cleanLocality,
                            displayName = cleanLocality,
                            contextAddress = cleanLocality
                        )
                    }

                    return@Thread
                }

                val response =
                    connection.inputStream
                        .bufferedReader()
                        .use {
                            it.readText()
                        }

                connection.disconnect()

                val json =
                    JSONObject(response)

                val features =
                    json.optJSONArray(
                        "features"
                    )

                if (
                    features == null ||
                    features.length() == 0
                ) {

                    Log.w(
                        TAG_SHARE,
                        "Photon returned no locality result"
                    )

                    runOnUiThread {

                        geocodePlaceName(
                            place = cleanLocality,
                            displayName = cleanLocality,
                            contextAddress = cleanLocality
                        )
                    }

                    return@Thread
                }

                val feature =
                    selectBestPhotonFeature(
                        features,
                        cleanLocality,
                        cleanLocality
                    )
                        ?: features.getJSONObject(0)

                val geometry =
                    feature.getJSONObject(
                        "geometry"
                    )

                val coordinates =
                    geometry.getJSONArray(
                        "coordinates"
                    )

                val referenceLongitude =
                    coordinates.getDouble(0)

                val referenceLatitude =
                    coordinates.getDouble(1)

                Log.d(
                    TAG_SHARE,
                    "Reference locality coordinates: " +
                            "$referenceLatitude, $referenceLongitude"
                )

                val referenceCode =
                    OpenLocationCode.encode(
                        referenceLatitude,
                        referenceLongitude
                    )

                Log.d(
                    TAG_PLUS,
                    "Reference code: $referenceCode"
                )

                val recoveredCode =
                    OpenLocationCode.recoverNearest(
                        plusCode,
                        referenceLatitude,
                        referenceLongitude
                    )

                Log.d(
                    TAG_PLUS,
                    "Recovered Plus Code: $recoveredCode"
                )

                val area =
                    OpenLocationCode.decode(
                        recoveredCode
                    )

                Log.d(
                    TAG_SHARE,
                    "Decoded Plus Code center: " +
                            "${area.latitudeCenter}, " +
                            "${area.longitudeCenter}"
                )

                createSharedLocation(
                    cleanLocality,
                    area.latitudeCenter,
                    area.longitudeCenter,
                    cleanLocality
                )

            } catch (e: Exception) {

                Log.e(
                    TAG_SHARE,
                    "Photon/Plus Code recovery failed",
                    e
                )

                runOnUiThread {

                    geocodePlaceName(
                        place = cleanPlaceText(locality),
                        displayName = cleanPlaceText(locality),
                        contextAddress = cleanPlaceText(locality)
                    )
                }
            }

        }.start()
    }


    /*
     * ============================================================
     * NORMAL PLACE GEOCODING
     * ============================================================
     *
     * place         = actual Photon search query
     * displayName   = clean name shown to user
     * contextAddress = original detailed location context
     *
     * NO COUNTRY OR STATE IS EVER HARDCODED.
     * ============================================================
     */

    private fun geocodePlaceName(
        place: String,
        displayName: String? = null,
        contextAddress: String? = place,
        allowFallback: Boolean = true
    ) {

        val cleanPlace =
            cleanPlaceText(place)

        if (cleanPlace.isBlank()) {
            return
        }

        val cleanDisplayName =
            displayName
                ?.let {
                    cleanPlaceText(it)
                }
                ?.takeIf {
                    it.isNotBlank()
                }

        val cleanContext =
            contextAddress
                ?.let {
                    cleanPlaceText(it)
                }
                ?.takeIf {
                    it.isNotBlank()
                }
                ?: cleanPlace

        Thread {

            try {

                val query =
                    URLEncoder.encode(
                        cleanPlace,
                        "UTF-8"
                    )

                val requestUrl =
                    "https://photon.komoot.io/api/" +
                            "?q=$query" +
                            "&limit=10" +
                            "&lang=en"

                Log.d(
                    TAG_SHARE,
                    "Photon place request: $requestUrl"
                )

                Log.d(
                    TAG_SHARE,
                    "Photon matching context: $cleanContext"
                )

                val connection =
                    URL(requestUrl)
                        .openConnection()
                            as HttpURLConnection

                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.requestMethod = "GET"

                val responseCode =
                    connection.responseCode

                if (
                    responseCode !=
                    HttpURLConnection.HTTP_OK
                ) {

                    Log.w(
                        TAG_SHARE,
                        "Photon place response: $responseCode"
                    )

                    connection.disconnect()

                    if (
                        allowFallback &&
                        !cleanDisplayName.isNullOrBlank() &&
                        !cleanDisplayName.equals(
                            cleanPlace,
                            ignoreCase = true
                        )
                    ) {

                        runOnUiThread {

                            geocodePlaceName(
                                place = cleanDisplayName,
                                displayName = cleanDisplayName,
                                contextAddress = cleanContext,
                                allowFallback = false
                            )
                        }
                    }

                    return@Thread
                }

                val response =
                    connection.inputStream
                        .bufferedReader()
                        .use {
                            it.readText()
                        }

                connection.disconnect()

                val json =
                    JSONObject(response)

                val features =
                    json.optJSONArray(
                        "features"
                    )

                if (
                    features == null ||
                    features.length() == 0
                ) {

                    Log.w(
                        TAG_SHARE,
                        "Photon returned no result for: $cleanPlace"
                    )

                    if (
                        allowFallback &&
                        !cleanDisplayName.isNullOrBlank() &&
                        !cleanDisplayName.equals(
                            cleanPlace,
                            ignoreCase = true
                        )
                    ) {

                        runOnUiThread {

                            geocodePlaceName(
                                place = cleanDisplayName,
                                displayName = cleanDisplayName,
                                contextAddress = cleanContext,
                                allowFallback = false
                            )
                        }
                    }

                    return@Thread
                }

                /*
                 * ------------------------------------------------
                 * WORLDWIDE CANDIDATE MATCHING
                 * ------------------------------------------------
                 */

                val feature =
                    selectBestPhotonFeature(
                        features,
                        cleanContext,
                        cleanDisplayName
                    )
                        ?: features.getJSONObject(0)

                val geometry =
                    feature.getJSONObject(
                        "geometry"
                    )

                val coordinates =
                    geometry.getJSONArray(
                        "coordinates"
                    )

                val longitude =
                    coordinates.getDouble(0)

                val latitude =
                    coordinates.getDouble(1)

                if (
                    latitude !in -90.0..90.0 ||
                    longitude !in -180.0..180.0
                ) {

                    Log.w(
                        TAG_SHARE,
                        "Photon returned invalid coordinates: " +
                                "$latitude,$longitude"
                    )

                    return@Thread
                }

                val properties =
                    feature.optJSONObject(
                        "properties"
                    )

                val name =
                    cleanDisplayName
                        ?: properties
                            ?.optString("name")
                            ?.takeIf {
                                it.isNotBlank()
                            }
                        ?: cleanPlace

                val address =
                    buildPhotonAddress(
                        properties,
                        name
                    )

                Log.d(
                    TAG_SHARE,
                    "Photon result: $name -> $latitude,$longitude"
                )

                Log.d(
                    TAG_SHARE,
                    "Photon address: $address"
                )

                createSharedLocation(
                    name,
                    latitude,
                    longitude,
                    address
                )

            } catch (e: Exception) {

                Log.e(
                    TAG_SHARE,
                    "Photon place geocoding failed for '$cleanPlace'",
                    e
                )

                if (
                    allowFallback &&
                    !cleanDisplayName.isNullOrBlank() &&
                    !cleanDisplayName.equals(
                        cleanPlace,
                        ignoreCase = true
                    )
                ) {

                    runOnUiThread {

                        geocodePlaceName(
                            place = cleanDisplayName,
                            displayName = cleanDisplayName,
                            contextAddress = cleanContext,
                            allowFallback = false
                        )
                    }
                }
            }

        }.start()
    }

    private fun buildPhotonAddress(
        properties: JSONObject?,
        fallback: String
    ): String {

        if (properties == null) {
            return fallback
        }

        val parts =
            listOf(
                properties.optString("name"),
                properties.optString("street"),
                properties.optString("district"),
                properties.optString("city"),
                properties.optString("state"),
                properties.optString("country")
            )
                .filter {
                    it.isNotBlank()
                }
                .distinct()

        return if (
            parts.isEmpty()
        ) {
            fallback
        } else {
            parts.joinToString(", ")
        }
    }


    /*
     * ============================================================
     * URL HANDLING
     *
     * IMPORTANT ORDER:
     *
     * 1. Google Maps-specific route parser
     * 2. Google Maps-specific place/query parser
     * 3. Generic coordinate parser
     * 4. Short URL resolution
     *
     * This prevents the generic coordinate parser from stealing
     * the ORIGIN coordinates from a Google Maps route.
     * ============================================================
     */

    private fun parseUrlForLocation(
        url: String,
        fallbackText: String
    ) {

        Log.d(
            TAG_SHARE,
            "Parsing URL: $url"
        )

        /*
         * --------------------------------------------------------
         * 1. GOOGLE MAPS-SPECIFIC PARSING
         * --------------------------------------------------------
         */

        if (isGoogleMapsUrl(url)) {

            Log.d(
                TAG_SHARE,
                "Detected Google Maps URL"
            )

            /*
             * Route parser MUST run first.
             *
             * This is the main fix for:
             *
             * origin = 17.4442946,78.5075717
             * destination = 17.420265,78.4919883
             *
             * The old generic parser selected the origin.
             */

            if (
                parseGoogleMapsRoute(
                    url,
                    fallbackText
                )
            ) {

                return
            }

            if (
                parseGoogleMapsUrl(
                    url,
                    fallbackText
                )
            ) {

                return
            }
        }

        /*
         * --------------------------------------------------------
         * 2. GENERIC COORDINATE FALLBACK
         * --------------------------------------------------------
         */

        val coordinates =
            extractCoordinatesFromUrl(url)

        if (coordinates != null) {

            val cleanName =
                cleanPlaceText(fallbackText)
                    .takeIf {
                        it.isNotBlank()
                    }
                    ?: "Shared Location"

            Log.d(
                TAG_SHARE,
                "Generic URL coordinates: " +
                        "${coordinates.first},${coordinates.second}"
            )

            createSharedLocation(
                cleanName,
                coordinates.first,
                coordinates.second,
                cleanName
            )

            return
        }

        /*
         * --------------------------------------------------------
         * 3. SHORT URL RESOLUTION
         * --------------------------------------------------------
         */

        resolveShortUrl(
            url,
            cleanSharedPlaceName(fallbackText)
                ?: fallbackText
        )
    }


    /*
     * ============================================================
     * GOOGLE MAPS URL DETECTION
     * ============================================================
     */

    private fun isGoogleMapsUrl(
        url: String
    ): Boolean {

        return try {

            val uri =
                Uri.parse(url)

            val host =
                uri.host
                    ?.lowercase(Locale.US)
                    ?: ""

            val path =
                uri.path
                    ?.lowercase(Locale.US)
                    ?: ""

            (
                host == "maps.google.com"
            ) ||
                    (
                        host == "www.google.com" &&
                                path.startsWith("/maps")
                    ) ||
                    (
                        host == "google.com" &&
                                path.startsWith("/maps")
                    ) ||
                    (
                        host == "maps.app.goo.gl"
                    ) ||
                    (
                        host == "goo.gl" &&
                                path.startsWith("/maps")
                    )

        } catch (
            _: Exception
        ) {

            false
        }
    }


    /*
     * ============================================================
     * GOOGLE MAPS ROUTE PARSER
     *
     * THIS IS THE IMPORTANT FIX.
     *
     * Priority:
     *
     * 1. destination / daddr parameter
     * 2. exact destination !3dLAT!4dLNG
     * 3. destination path segment
     * 4. Plus Code destination
     * 5. Google Maps generic coordinates
     *
     * NEVER blindly use the first coordinate in a /dir/ URL.
     * ============================================================
     */

    private fun parseGoogleMapsRoute(
        url: String,
        fallbackText: String
    ): Boolean {

        return try {

            val uri =
                Uri.parse(url)

            val path =
                uri.path
                    ?: return false

            val lowerPath =
                path.lowercase(Locale.US)

            if (
                !lowerPath.contains(
                    "/maps/dir/"
                )
            ) {

                return false
            }

            Log.d(
                TAG_SHARE,
                "Google Maps route URL detected"
            )

            /*
             * ----------------------------------------------------
             * 1. EXPLICIT DESTINATION PARAMETER
             * ----------------------------------------------------
             */

            val destinationParameter =
                uri.getQueryParameter("destination")
                    ?: uri.getQueryParameter("daddr")

            if (
                !destinationParameter.isNullOrBlank()
            ) {

                Log.d(
                    TAG_SHARE,
                    "Route destination parameter: " +
                            destinationParameter
                )

                /*
                 * Destination is directly encoded as coordinates.
                 */

                val coordinates =
                    extractCoordinatePair(
                        destinationParameter
                    )

                if (coordinates != null) {

                    val destinationName =
                        cleanPlaceText(
                            destinationParameter
                        )

                    Log.d(
                        TAG_SHARE,
                        "Using destination parameter coordinates: " +
                                "${coordinates.first}," +
                                "${coordinates.second}"
                    )

                    createSharedLocation(
                        destinationName,
                        coordinates.first,
                        coordinates.second,
                        destinationName
                    )

                    return true
                }

                /*
                 * Destination contains a Plus Code.
                 */

                val plusCode =
                    extractPlusCode(
                        destinationParameter
                    )

                if (plusCode != null) {

                    val locality =
                        removePlusCodeFromText(
                            destinationParameter,
                            plusCode
                        )
                            ?.let {
                                cleanPlaceText(it)
                            }

                    if (
                        OpenLocationCode.isFull(
                            plusCode
                        )
                    ) {

                        val area =
                            OpenLocationCode.decode(
                                plusCode
                            )

                        createSharedLocation(
                            locality ?: plusCode,
                            area.latitudeCenter,
                            area.longitudeCenter,
                            locality
                        )

                        return true
                    }

                    if (
                        !locality.isNullOrBlank()
                    ) {

                        geocodeLocalityForPlusCode(
                            plusCode,
                            locality
                        )

                        return true
                    }
                }

                /*
                 * Destination is a normal address/place.
                 *
                 * Use the complete destination context.
                 * Do NOT geocode "Shared route".
                 */

                val destinationName =
                    cleanPlaceText(
                        destinationParameter
                    )

                geocodePlaceName(
                    place = destinationName,
                    displayName = destinationName,
                    contextAddress = destinationName
                )

                return true
            }

            /*
             * ----------------------------------------------------
             * 2. EXACT GOOGLE MAPS DESTINATION COORDINATES
             * ----------------------------------------------------
             *
             * Google Maps route URLs commonly contain:
             *
             * !3d<latitude>!4d<longitude>
             *
             * We specifically extract the destination's
             * coordinate pair rather than using the first pair
             * found in the entire URL.
             */

            val destinationCoordinates =
                extractGoogleMapsDestinationCoordinates(
                    url
                )

            if (
                destinationCoordinates != null
            ) {

                val destinationName =
                    extractGoogleMapsRouteDestinationName(
                        url
                    )
                        ?: cleanSharedPlaceName(
                            fallbackText
                        )
                            ?.takeIf {
                                !it.equals(
                                    "Shared route",
                                    ignoreCase = true
                                )
                            }
                        ?: "Shared Location"

                Log.d(
                    TAG_SHARE,
                    "Google Maps destination coordinates: " +
                            "${destinationCoordinates.first}," +
                            "${destinationCoordinates.second}"
                )

                Log.d(
                    TAG_SHARE,
                    "Google Maps route destination name: " +
                            destinationName
                )

                createSharedLocation(
                    destinationName,
                    destinationCoordinates.first,
                    destinationCoordinates.second,
                    destinationName
                )

                return true
            }

            /*
             * ----------------------------------------------------
             * 3. DESTINATION FROM /maps/dir/ PATH
             * ----------------------------------------------------
             *
             * Example:
             *
             * /maps/dir/
             * 17.4442946,78.5075717/
             * Raju+Gari+Biryani,+Musheerabad/
             * data=...
             *
             * Work backwards because the destination is normally
             * the last meaningful route segment.
             */

            val marker =
                "/maps/dir/"

            val markerIndex =
                lowerPath.indexOf(marker)

            if (markerIndex >= 0) {

                val routePath =
                    path.substring(
                        markerIndex + marker.length
                    )

                val routePart =
                    routePath
                        .substringBefore(
                            "/data",
                            missingDelimiterValue = routePath
                        )
                        .substringBefore("?")
                        .substringBefore("#")

                val segments =
                    routePart
                        .split("/")
                        .mapNotNull { segment ->

                            val decoded =
                                try {

                                    URLDecoder.decode(
                                        segment,
                                        "UTF-8"
                                    )

                                } catch (
                                    _: Exception
                                ) {

                                    segment
                                }

                            decoded
                                .replace(
                                    '+',
                                    ' '
                                )
                                .trim()
                                .takeIf {
                                    it.isNotBlank()
                                }
                        }

                for (
                    segment in segments.asReversed()
                ) {

                    if (
                        segment.equals(
                            "dir",
                            ignoreCase = true
                        )
                    ) {
                        continue
                    }

                    /*
                     * Destination coordinates directly in path.
                     */

                    val coordinates =
                        extractCoordinatePair(
                            segment
                        )

                    if (coordinates != null) {

                        val name =
                            cleanPlaceText(
                                segment
                            )

                        Log.d(
                            TAG_SHARE,
                            "Route destination coordinates: " +
                                    "${coordinates.first}," +
                                    "${coordinates.second}"
                        )

                        createSharedLocation(
                            name,
                            coordinates.first,
                            coordinates.second,
                            name
                        )

                        return true
                    }

                    /*
                     * Destination Plus Code.
                     */

                    val plusCode =
                        extractPlusCode(
                            segment
                        )

                    if (plusCode != null) {

                        val locality =
                            removePlusCodeFromText(
                                segment,
                                plusCode
                            )
                                ?.let {
                                    cleanPlaceText(it)
                                }

                        if (
                            OpenLocationCode.isFull(
                                plusCode
                            )
                        ) {

                            val area =
                                OpenLocationCode.decode(
                                    plusCode
                                )

                            createSharedLocation(
                                locality ?: plusCode,
                                area.latitudeCenter,
                                area.longitudeCenter,
                                locality
                            )

                            return true
                        }

                        if (
                            !locality.isNullOrBlank()
                        ) {

                            geocodeLocalityForPlusCode(
                                plusCode,
                                locality
                            )

                            return true
                        }
                    }

                    /*
                     * Destination as place/address text.
                     */

                    if (
                        segment.length >= 2
                    ) {

                        Log.d(
                            TAG_SHARE,
                            "Route destination text: $segment"
                        )

                        geocodePlaceName(
                            place = segment,
                            displayName = segment,
                            contextAddress = segment
                        )

                        return true
                    }
                }
            }

            /*
             * ----------------------------------------------------
             * 4. GOOGLE MAPS FALLBACK COORDINATES
             * ----------------------------------------------------
             */

            val coordinates =
                extractGoogleMapsCoordinates(
                    url
                )

            if (coordinates != null) {

                val name =
                    cleanSharedPlaceName(
                        fallbackText
                    )
                        ?.takeIf {
                            !it.equals(
                                "Shared route",
                                ignoreCase = true
                            )
                        }
                        ?: "Shared Location"

                Log.d(
                    TAG_SHARE,
                    "Google Maps fallback coordinates: " +
                            "${coordinates.first}," +
                            "${coordinates.second}"
                )

                createSharedLocation(
                    name,
                    coordinates.first,
                    coordinates.second,
                    name
                )

                return true
            }

            false

        } catch (e: Exception) {

            Log.e(
                TAG_SHARE,
                "Google Maps route parsing failed",
                e
            )

            false
        }
    }


    /*
     * ============================================================
     * GOOGLE MAPS DESTINATION COORDINATES
     *
     * Specifically extracts !3dLAT!4dLNG.
     *
     * This avoids accidentally taking the origin.
     * ============================================================
     */

    private fun extractGoogleMapsDestinationCoordinates(
        url: String
    ): Pair<Double, Double>? {

        return try {

            val regex =
                Regex(
                    """!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)"""
                )

            /*
             * First search original URL.
             */

            val match =
                regex.find(url)

            if (match != null) {

                val latitude =
                    match.groupValues[1]
                        .toDoubleOrNull()

                val longitude =
                    match.groupValues[2]
                        .toDoubleOrNull()

                if (
                    latitude != null &&
                    longitude != null &&
                    latitude in -90.0..90.0 &&
                    longitude in -180.0..180.0
                ) {

                    return Pair(
                        latitude,
                        longitude
                    )
                }
            }

            /*
             * Some URLs may contain encoded characters.
             */

            val decodedUrl =
                try {

                    URLDecoder.decode(
                        url,
                        "UTF-8"
                    )

                } catch (
                    _: Exception
                ) {

                    url
                }

            if (
                decodedUrl != url
            ) {

                val decodedMatch =
                    regex.find(
                        decodedUrl
                    )

                if (
                    decodedMatch != null
                ) {

                    val latitude =
                        decodedMatch.groupValues[1]
                            .toDoubleOrNull()

                    val longitude =
                        decodedMatch.groupValues[2]
                            .toDoubleOrNull()

                    if (
                        latitude != null &&
                        longitude != null &&
                        latitude in -90.0..90.0 &&
                        longitude in -180.0..180.0
                    ) {

                        return Pair(
                            latitude,
                            longitude
                        )
                    }
                }
            }

            null

        } catch (e: Exception) {

            Log.e(
                TAG_SHARE,
                "Could not extract Google Maps destination coordinates",
                e
            )

            null
        }
    }


    /*
     * ============================================================
     * GOOGLE MAPS ROUTE DESTINATION NAME
     *
     * Extracts the last meaningful component from:
     *
     * /maps/dir/origin/destination/...
     *
     * Example:
     *
     * Raju+Gari+Biryani,+Musheerabad
     *
     * becomes:
     *
     * Raju Gari Biryani, Musheerabad
     * ============================================================
     */

    private fun extractGoogleMapsRouteDestinationName(
        url: String
    ): String? {

        return try {

            val uri =
                Uri.parse(url)

            val path =
                uri.path
                    ?: return null

            val marker =
                "/maps/dir/"

            val index =
                path.lowercase(
                    Locale.US
                ).indexOf(marker)

            if (index < 0) {
                return null
            }

            val routePart =
                path.substring(
                    index + marker.length
                )
                    .substringBefore(
                        "/data"
                    )
                    .substringBefore("?")
                    .substringBefore("#")

            val segments =
                routePart
                    .split("/")
                    .mapNotNull { segment ->

                        val decoded =
                            try {

                                URLDecoder.decode(
                                    segment,
                                    "UTF-8"
                                )

                            } catch (
                                _: Exception
                            ) {

                                segment
                            }

                        decoded
                            .replace(
                                '+',
                                ' '
                            )
                            .trim()
                            .takeIf {
                                it.isNotBlank()
                            }
                    }

            /*
             * Work backwards because destination is normally last.
             */

            segments
                .asReversed()
                .firstOrNull { segment ->

                    !segment.equals(
                        "dir",
                        ignoreCase = true
                    ) &&
                            extractCoordinatePair(
                                segment
                            ) == null &&
                            extractPlusCode(
                                segment
                            ) == null
                }
                ?.let {
                    cleanPlaceText(it)
                }
                ?.takeIf {
                    it.isNotBlank()
                }

        } catch (e: Exception) {

            Log.w(
                TAG_SHARE,
                "Could not extract route destination name",
                e
            )

            null
        }
    }


    /*
     * ============================================================
     * GOOGLE MAPS-SPECIFIC PARSER
     * ============================================================
     */

    private fun parseGoogleMapsUrl(
        url: String,
        fallbackText: String
    ): Boolean {

        /*
         * --------------------------------------------------------
         * A. /maps/place/ URL
         * --------------------------------------------------------
         */

        val placeName =
            extractGoogleMapsPlaceName(url)

        if (!placeName.isNullOrBlank()) {

            Log.d(
                TAG_SHARE,
                "Google Maps place extracted: $placeName"
            )

            val preferredName =
                cleanSharedPlaceName(
                    fallbackText
                )
                    ?.takeIf {
                        it.isNotBlank() &&
                                !it.equals(
                                    "Shared Location",
                                    ignoreCase = true
                                )
                    }
                    ?: placeName

            Log.d(
                TAG_SHARE,
                "Google Maps search address: $placeName"
            )

            Log.d(
                TAG_SHARE,
                "Google Maps display name: $preferredName"
            )

            /*
             * Google Maps coordinates are always preferred.
             */

            val googleCoordinates =
                extractGoogleMapsCoordinates(
                    url
                )

            if (googleCoordinates != null) {

                val latitude =
                    googleCoordinates.first

                val longitude =
                    googleCoordinates.second

                Log.d(
                    TAG_SHARE,
                    "Using Google Maps coordinates directly: " +
                            "$latitude,$longitude"
                )

                createSharedLocation(
                    preferredName,
                    latitude,
                    longitude,
                    placeName
                )

                return true
            }

            /*
             * No exact coordinates available.
             *
             * Search the FULL Google Maps place address,
             * not merely the short display name.
             */

            Log.d(
                TAG_SHARE,
                "Google Maps coordinates unavailable. " +
                        "Using full place address with Photon."
            )

            geocodePlaceName(
                place = placeName,
                displayName = preferredName,
                contextAddress = placeName
            )

            return true
        }

        /*
         * --------------------------------------------------------
         * B. Google Maps query / destination parameters
         * --------------------------------------------------------
         */

        try {

            val uri =
                Uri.parse(url)

            val query =
                uri.getQueryParameter("query")
                    ?: uri.getQueryParameter("q")
                    ?: uri.getQueryParameter("destination")
                    ?: uri.getQueryParameter("origin")

            if (!query.isNullOrBlank()) {

                Log.d(
                    TAG_SHARE,
                    "Google Maps query parameter: $query"
                )

                /*
                 * Coordinates inside q/query/destination.
                 */

                val queryCoordinates =
                    extractCoordinatePair(
                        query
                    )

                if (queryCoordinates != null) {

                    val name =
                        cleanSharedPlaceName(
                            fallbackText
                        )
                            ?: cleanPlaceText(query)

                    createSharedLocation(
                        name,
                        queryCoordinates.first,
                        queryCoordinates.second,
                        cleanPlaceText(query)
                    )

                    return true
                }

                /*
                 * Full Plus Code.
                 */

                val plusCode =
                    extractPlusCode(query)

                if (plusCode != null) {

                    val locality =
                        removePlusCodeFromText(
                            query,
                            plusCode
                        )
                            ?.let {
                                cleanPlaceText(it)
                            }

                    if (
                        OpenLocationCode.isFull(
                            plusCode
                        )
                    ) {

                        try {

                            val area =
                                OpenLocationCode.decode(
                                    plusCode
                                )

                            createSharedLocation(
                                locality ?: plusCode,
                                area.latitudeCenter,
                                area.longitudeCenter,
                                locality
                            )

                            return true

                        } catch (e: Exception) {

                            Log.e(
                                TAG_PLUS,
                                "Could not decode Maps Plus Code",
                                e
                            )
                        }
                    }

                    if (!locality.isNullOrBlank()) {

                        geocodeLocalityForPlusCode(
                            plusCode,
                            locality
                        )

                        return true
                    }
                }

                /*
                 * Query is a normal place/address.
                 */

                geocodePlaceName(
                    place = query,
                    displayName = cleanSharedPlaceName(
                        fallbackText
                    ),
                    contextAddress = query
                )

                return true
            }

        } catch (e: Exception) {

            Log.w(
                TAG_SHARE,
                "Could not parse Google Maps query",
                e
            )
        }

        /*
         * --------------------------------------------------------
         * C. Google Maps @latitude,longitude
         * --------------------------------------------------------
         */

        val atCoordinates =
            extractGoogleMapsAtCoordinates(
                url
            )

        if (atCoordinates != null) {

            val name =
                cleanSharedPlaceName(
                    fallbackText
                )
                    ?: "Shared Location"

            Log.d(
                TAG_SHARE,
                "Google Maps @ coordinates: " +
                        "${atCoordinates.first}," +
                        "${atCoordinates.second}"
            )

            createSharedLocation(
                name,
                atCoordinates.first,
                atCoordinates.second,
                name
            )

            return true
        }

        /*
         * --------------------------------------------------------
         * D. Google Maps data URL coordinates
         * --------------------------------------------------------
         */

        val mapsCoordinates =
            extractGoogleMapsCoordinates(
                url
            )

        if (mapsCoordinates != null) {

            val name =
                cleanSharedPlaceName(
                    fallbackText
                )
                    ?: "Shared Location"

            createSharedLocation(
                name,
                mapsCoordinates.first,
                mapsCoordinates.second,
                name
            )

            return true
        }

        return false
    }


    /*
     * ============================================================
     * GOOGLE MAPS COORDINATE EXTRACTION
     * ============================================================
     */

    private fun extractGoogleMapsCoordinates(
        url: String
    ): Pair<Double, Double>? {

        try {

            /*
             * ----------------------------------------------------
             * METHOD 1:
             * Google Maps query parameters.
             * ----------------------------------------------------
             */

            val uri =
                Uri.parse(url)

            val coordinateParameters =
                listOf(
                    "q",
                    "query",
                    "ll",
                    "center",
                    "destination",
                    "origin"
                )

            for (parameter in coordinateParameters) {

                val value =
                    uri.getQueryParameter(
                        parameter
                    )

                if (!value.isNullOrBlank()) {

                    val result =
                        extractCoordinatePair(
                            value
                        )

                    if (result != null) {

                        Log.d(
                            TAG_SHARE,
                            "Google Maps coordinates from " +
                                    "parameter '$parameter': " +
                                    "${result.first},${result.second}"
                        )

                        return result
                    }
                }
            }

            /*
             * ----------------------------------------------------
             * METHOD 2:
             * Google Maps @lat,lng.
             * ----------------------------------------------------
             */

            val atCoordinates =
                extractGoogleMapsAtCoordinates(
                    url
                )

            if (atCoordinates != null) {

                Log.d(
                    TAG_SHARE,
                    "Google Maps coordinates from @ pair: " +
                            "${atCoordinates.first}," +
                            "${atCoordinates.second}"
                )

                return atCoordinates
            }

            /*
             * ----------------------------------------------------
             * METHOD 3:
             * Complete URL.
             * ----------------------------------------------------
             */

            val coordinateRegex =
                Regex(
                    """(-?\d{1,3}\.\d{4,})[,\s%]+(-?\d{1,3}\.\d{4,})"""
                )

            val match =
                coordinateRegex.find(url)

            if (match != null) {

                val first =
                    match.groupValues[1]
                        .toDoubleOrNull()

                val second =
                    match.groupValues[2]
                        .toDoubleOrNull()

                if (
                    first != null &&
                    second != null
                ) {

                    if (
                        first in -90.0..90.0 &&
                        second in -180.0..180.0
                    ) {

                        return Pair(
                            first,
                            second
                        )
                    }

                    if (
                        second in -90.0..90.0 &&
                        first in -180.0..180.0
                    ) {

                        return Pair(
                            second,
                            first
                        )
                    }
                }
            }

            /*
             * ----------------------------------------------------
             * METHOD 4:
             * Decode URL.
             * ----------------------------------------------------
             */

            val decodedUrl =
                try {

                    URLDecoder.decode(
                        url,
                        "UTF-8"
                    )

                } catch (
                    _: Exception
                ) {

                    url
                }

            if (decodedUrl != url) {

                val decodedAt =
                    extractGoogleMapsAtCoordinates(
                        decodedUrl
                    )

                if (decodedAt != null) {
                    return decodedAt
                }

                val decodedMatch =
                    coordinateRegex.find(
                        decodedUrl
                    )

                if (decodedMatch != null) {

                    val first =
                        decodedMatch.groupValues[1]
                            .toDoubleOrNull()

                    val second =
                        decodedMatch.groupValues[2]
                            .toDoubleOrNull()

                    if (
                        first != null &&
                        second != null &&
                        first in -90.0..90.0 &&
                        second in -180.0..180.0
                    ) {

                        return Pair(
                            first,
                            second
                        )
                    }

                    if (
                        first != null &&
                        second != null &&
                        second in -90.0..90.0 &&
                        first in -180.0..180.0
                    ) {

                        return Pair(
                            second,
                            first
                        )
                    }
                }
            }

        } catch (e: Exception) {

            Log.e(
                TAG_SHARE,
                "Failed to extract Google Maps coordinates",
                e
            )
        }

        Log.d(
            TAG_SHARE,
            "No Google Maps coordinates found"
        )

        return null
    }

    private fun extractGoogleMapsAtCoordinates(
        url: String
    ): Pair<Double, Double>? {

        val patterns =
            listOf(
                Regex(
                    """@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)"""
                ),
                Regex(
                    """!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)"""
                )
            )

        for (pattern in patterns) {

            val match =
                pattern.find(url)
                    ?: continue

            val first =
                match.groupValues[1]
                    .toDoubleOrNull()
                    ?: continue

            val second =
                match.groupValues[2]
                    .toDoubleOrNull()
                    ?: continue

            if (
                first in -90.0..90.0 &&
                second in -180.0..180.0
            ) {

                return Pair(
                    first,
                    second
                )
            }

            if (
                second in -90.0..90.0 &&
                first in -180.0..180.0
            ) {

                return Pair(
                    second,
                    first
                )
            }
        }

        return null
    }

    private fun extractCoordinatePair(
        value: String
    ): Pair<Double, Double>? {

        val regex =
            Regex(
                """(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)"""
            )

        val match =
            regex.find(value)
                ?: return null

        val first =
            match.groupValues[1]
                .toDoubleOrNull()
                ?: return null

        val second =
            match.groupValues[2]
                .toDoubleOrNull()
                ?: return null

        if (
            first in -90.0..90.0 &&
            second in -180.0..180.0
        ) {

            return Pair(
                first,
                second
            )
        }

        if (
            second in -90.0..90.0 &&
            first in -180.0..180.0
        ) {

            return Pair(
                second,
                first
            )
        }

        return null
    }


    /*
     * ============================================================
     * GOOGLE MAPS PLACE NAME
     * ============================================================
     */

    private fun extractGoogleMapsPlaceName(
        url: String
    ): String? {

        return try {

            val uri =
                Uri.parse(url)

            val path =
                uri.path
                    ?: return null

            val marker =
                "/maps/place/"

            val index =
                path.indexOf(
                    marker,
                    ignoreCase = true
                )

            if (index < 0) {
                return null
            }

            val afterMarker =
                path.substring(
                    index + marker.length
                )

            val encodedName =
                afterMarker
                    .substringBefore("/")
                    .substringBefore("?")
                    .substringBefore("#")

            if (encodedName.isBlank()) {
                return null
            }

            val decoded =
                try {

                    URLDecoder.decode(
                        encodedName,
                        "UTF-8"
                    )

                } catch (
                    _: Exception
                ) {

                    encodedName
                }

            decoded
                .replace(
                    '+',
                    ' '
                )
                .replace(
                    Regex("""\s+"""),
                    " "
                )
                .trim()
                .takeIf {
                    it.isNotBlank()
                }

        } catch (e: Exception) {

            Log.w(
                TAG_SHARE,
                "Could not extract Google Maps place name",
                e
            )

            null
        }
    }


    /*
     * ============================================================
     * GENERIC COORDINATE PARSER
     *
     * IMPORTANT:
     * This is intentionally AFTER the Google Maps parser.
     * ============================================================
     */

    private fun extractCoordinatesFromUrl(
        url: String
    ): Pair<Double, Double>? {

        val patterns =
            listOf(

                Regex(
                    """@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)"""
                ),

                Regex(
                    """[?&](?:q|query|ll|center|destination)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)"""
                ),

                Regex(
                    """(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)"""
                )
            )

        for (pattern in patterns) {

            val match =
                pattern.find(url)
                    ?: continue

            val latitude =
                match.groupValues[1]
                    .toDoubleOrNull()
                    ?: continue

            val longitude =
                match.groupValues[2]
                    .toDoubleOrNull()
                    ?: continue

            if (
                latitude in -90.0..90.0 &&
                longitude in -180.0..180.0
            ) {

                return Pair(
                    latitude,
                    longitude
                )
            }

            if (
                longitude in -90.0..90.0 &&
                latitude in -180.0..180.0
            ) {

                return Pair(
                    longitude,
                    latitude
                )
            }
        }

        return null
    }


    /*
     * ============================================================
     * SHORT URL RESOLUTION
     * ============================================================
     */

    private fun resolveShortUrl(
        url: String,
        fallbackText: String
    ) {

        Thread {

            var connection:
                    HttpURLConnection? = null

            try {

                /*
                 * First try HEAD.
                 */

                connection =
                    URL(url)
                        .openConnection()
                            as HttpURLConnection

                connection.instanceFollowRedirects = false
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.requestMethod = "HEAD"

                connection.connect()

                val location =
                    connection.getHeaderField(
                        "Location"
                    )

                connection.disconnect()

                if (!location.isNullOrBlank()) {

                    Log.d(
                        TAG_SHARE,
                        "Resolved URL: $location"
                    )

                    parseUrlForLocation(
                        location,
                        fallbackText
                    )

                    return@Thread
                }

                /*
                 * Some Google servers don't expose the redirect
                 * through HEAD, so try GET.
                 */

                connection =
                    URL(url)
                        .openConnection()
                            as HttpURLConnection

                connection.instanceFollowRedirects = true
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                connection.requestMethod = "GET"

                connection.connect()

                val finalUrl =
                    connection.url?.toString()

                connection.disconnect()

                if (
                    !finalUrl.isNullOrBlank() &&
                    finalUrl != url
                ) {

                    Log.d(
                        TAG_SHARE,
                        "Resolved final URL: $finalUrl"
                    )

                    parseUrlForLocation(
                        finalUrl,
                        fallbackText
                    )

                } else {

                    fallbackAfterUrlResolution(
                        fallbackText
                    )
                }

            } catch (e: Exception) {

                connection?.disconnect()

                Log.e(
                    TAG_SHARE,
                    "Short URL resolution failed",
                    e
                )

                fallbackAfterUrlResolution(
                    fallbackText
                )
            }

        }.start()
    }

    private fun fallbackAfterUrlResolution(
        fallbackText: String
    ) {

        val cleanFallback =
            cleanSharedPlaceName(
                fallbackText
            )
                ?: cleanPlaceText(
                    fallbackText
                )

        val plusCode =
            extractPlusCode(
                fallbackText
            )

        if (plusCode != null) {

            val locality =
                removePlusCodeFromText(
                    fallbackText,
                    plusCode
                )
                    ?.let {
                        cleanPlaceText(it)
                    }

            if (!locality.isNullOrBlank()) {

                geocodeLocalityForPlusCode(
                    plusCode,
                    locality
                )

                return
            }
        }

        if (!cleanFallback.isNullOrBlank()) {

            geocodePlaceName(
                place = cleanFallback,
                displayName = cleanFallback,
                contextAddress = cleanFallback
            )
        }
    }


    /*
     * ============================================================
     * SEND LOCATION TO REACT
     * ============================================================
     */

    private fun createSharedLocation(
        name: String?,
        latitude: Double,
        longitude: Double,
        address: String?
    ) {

        if (
            latitude !in -90.0..90.0 ||
            longitude !in -180.0..180.0
        ) {

            Log.e(
                TAG_SHARE,
                "Refusing invalid shared coordinates: " +
                        "$latitude,$longitude"
            )

            return
        }

        val safeName =
            name
                ?.takeIf {
                    it.isNotBlank()
                }
                ?: "Shared Location"

        val safeAddress =
            address
                ?.takeIf {
                    it.isNotBlank()
                }
                ?: "$latitude, $longitude"

        val location =
            JSONObject().apply {

                put(
                    "id",
                    "shared_${System.currentTimeMillis()}"
                )

                put(
                    "name",
                    safeName
                )

                put(
                    "address",
                    safeAddress
                )

                put(
                    "latitude",
                    latitude
                )

                put(
                    "longitude",
                    longitude
                )
            }

        Log.d(
            TAG_SHARE,
            "Shared destination created: $location"
        )

        sendSharedLocationToReact(
            location
        )
    }

    private fun sendSharedLocationToReact(
        location: JSONObject
    ) {

        val json =
            JSONObject.quote(
                location.toString()
            )

        runOnUiThread {

            if (!::webView.isInitialized) {
                return@runOnUiThread
            }

            webView.evaluateJavascript(
                """
                (function() {
                    try {
                        const location =
                            JSON.parse($json);

                        window.dispatchEvent(
                            new CustomEvent(
                                'wakewaySharedLocation',
                                {
                                    detail: location
                                }
                            )
                        );

                        console.log(
                            'WakeWay shared location received:',
                            location
                        );

                        return true;

                    } catch (e) {

                        console.error(
                            'WakeWay shared location error:',
                            e
                        );

                        return false;
                    }
                })();
                """.trimIndent(),
                null
            )

            Log.d(
                TAG_SHARE,
                "Shared location sent to React"
            )
        }
    }


    /*
     * ============================================================
     * BACK BUTTON
     * ============================================================
     */

    @Suppress("DEPRECATION")
    override fun onBackPressed() {

        if (
            ::webView.isInitialized &&
            webView.canGoBack()
        ) {

            webView.goBack()

        } else {

            super.onBackPressed()
        }
    }

    override fun onDestroy() {

        pendingAudioCallback
            ?.onReceiveValue(null)

        pendingAudioCallback = null

        if (::webView.isInitialized) {

            webView.apply {

                stopLoading()

                removeJavascriptInterface(
                    "WakeWayAndroid"
                )

                clearHistory()

                removeAllViews()

                destroy()
            }
        }

        super.onDestroy()
    }


    /*
     * ============================================================
     * OPEN LOCATION CODE
     *
     * Based on Google's Open Location Code specification.
     * ============================================================
     */

    object OpenLocationCode {

        private const val ALPHABET =
            "23456789CFGHJMPQRVWX"

        private const val SEPARATOR =
            '+'

        private const val PADDING =
            '0'

        private const val SEPARATOR_POSITION =
            8

        private const val MIN_DIGIT_COUNT =
            2

        private const val MAX_DIGIT_COUNT =
            15

        private const val PAIR_CODE_LENGTH =
            10

        private const val ENCODING_BASE =
            20

        private const val LATITUDE_MAX =
            90.0

        private const val LONGITUDE_MAX =
            180.0

        private const val GRID_ROWS =
            5

        private const val GRID_COLUMNS =
            4

        data class CodeArea(
            val latitudeLo: Double,
            val longitudeLo: Double,
            val latitudeHi: Double,
            val longitudeHi: Double,
            val codeLength: Int
        ) {

            val latitudeCenter: Double
                get() =
                    (latitudeLo + latitudeHi) / 2.0

            val longitudeCenter: Double
                get() =
                    (longitudeLo + longitudeHi) / 2.0
        }


        /*
         * --------------------------------------------------------
         * VALIDATION
         * --------------------------------------------------------
         */

        fun isValid(
            code: String
        ): Boolean {

            val clean =
                code
                    .trim()
                    .uppercase(Locale.US)

            if (clean.isEmpty()) {
                return false
            }

            val separatorIndex =
                clean.indexOf(
                    SEPARATOR
                )

            if (separatorIndex < 0) {
                return false
            }

            if (
                clean.indexOf(
                    SEPARATOR,
                    separatorIndex + 1
                ) >= 0
            ) {
                return false
            }

            if (
                separatorIndex == 0 ||
                separatorIndex > SEPARATOR_POSITION
            ) {
                return false
            }

            val digits =
                clean.replace(
                    SEPARATOR.toString(),
                    ""
                )

            if (
                digits.length < MIN_DIGIT_COUNT ||
                digits.length > MAX_DIGIT_COUNT
            ) {
                return false
            }

            if (
                clean.length ==
                separatorIndex + 1
            ) {
                return false
            }

            var paddingStarted =
                false

            for (
                i in 0 until separatorIndex
            ) {

                val c =
                    clean[i]

                if (c == PADDING) {

                    if (!paddingStarted) {

                        paddingStarted = true

                        if (
                            i != 2 &&
                            i != 4 &&
                            i != 6
                        ) {
                            return false
                        }

                        if (
                            separatorIndex <
                            SEPARATOR_POSITION
                        ) {
                            return false
                        }
                    }

                } else {

                    if (
                        paddingStarted ||
                        ALPHABET.indexOf(c) < 0
                    ) {
                        return false
                    }
                }
            }

            if (
                clean.length >
                separatorIndex + 1
            ) {

                if (paddingStarted) {
                    return false
                }

                for (
                    i in separatorIndex + 1 until clean.length
                ) {

                    if (
                        ALPHABET.indexOf(
                            clean[i]
                        ) < 0
                    ) {
                        return false
                    }
                }
            }

            return true
        }

        fun isFull(
            code: String
        ): Boolean {

            val clean =
                code
                    .trim()
                    .uppercase(Locale.US)

            return isValid(clean) &&
                    clean.indexOf(
                        SEPARATOR
                    ) == SEPARATOR_POSITION
        }

        fun isShort(
            code: String
        ): Boolean {

            val clean =
                code
                    .trim()
                    .uppercase(Locale.US)

            if (!isValid(clean)) {
                return false
            }

            val separatorIndex =
                clean.indexOf(
                    SEPARATOR
                )

            return separatorIndex in
                    2 until SEPARATOR_POSITION
        }


        /*
         * --------------------------------------------------------
         * LATITUDE / LONGITUDE
         * --------------------------------------------------------
         */

        private fun clipLatitude(
            latitude: Double
        ): Double {

            return latitude.coerceIn(
                -90.0,
                90.0
            )
        }

        private fun normalizeLongitude(
            longitude: Double
        ): Double {

            var value =
                longitude

            while (value < -180.0) {
                value += 360.0
            }

            while (value >= 180.0) {
                value -= 360.0
            }

            return value
        }


        /*
         * --------------------------------------------------------
         * PRECISION
         * --------------------------------------------------------
         */

        private fun precisionForLength(
            codeLength: Int
        ): Double {

            if (codeLength <= 2) {
                return 20.0
            }

            return 20.0.pow(
                2.0 -
                        codeLength / 2.0
            )
        }


        /*
         * --------------------------------------------------------
         * ENCODE
         * --------------------------------------------------------
         */

        fun encode(
            latitude: Double,
            longitude: Double,
            codeLength: Int = 10
        ): String {

            var lat =
                clipLatitude(
                    latitude
                )

            val lng =
                normalizeLongitude(
                    longitude
                )

            if (lat == LATITUDE_MAX) {
                lat -= 1e-12
            }

            val requestedLength =
                min(
                    codeLength,
                    MAX_DIGIT_COUNT
                )

            require(
                requestedLength >=
                        MIN_DIGIT_COUNT
            ) {
                "Invalid Plus Code length"
            }

            if (
                requestedLength < 10 &&
                requestedLength % 2 != 0
            ) {

                throw IllegalArgumentException(
                    "Plus Code length must be even below 10"
                )
            }

            var latValue =
                lat + 90.0

            var lngValue =
                lng + 180.0

            val code =
                StringBuilder()

            var placeValue =
                20.0

            var digitsGenerated =
                0

            while (
                digitsGenerated <
                min(
                    requestedLength,
                    PAIR_CODE_LENGTH
                )
            ) {

                val latDigit =
                    floor(
                        latValue /
                                placeValue
                    ).toInt()

                val lngDigit =
                    floor(
                        lngValue /
                                placeValue
                    ).toInt()

                code.append(
                    ALPHABET[
                        latDigit.coerceIn(
                            0,
                            19
                        )
                    ]
                )

                code.append(
                    ALPHABET[
                        lngDigit.coerceIn(
                            0,
                            19
                        )
                    ]
                )

                latValue -=
                    latDigit *
                            placeValue

                lngValue -=
                    lngDigit *
                            placeValue

                placeValue /=
                    ENCODING_BASE

                digitsGenerated += 2
            }

            if (
                requestedLength >
                PAIR_CODE_LENGTH
            ) {

                var latRemainder =
                    latValue

                var lngRemainder =
                    lngValue

                var latResolution =
                    1.0 / 8000.0

                var lngResolution =
                    1.0 / 8000.0

                repeat(
                    requestedLength -
                            PAIR_CODE_LENGTH
                ) {

                    latResolution /=
                        GRID_ROWS

                    lngResolution /=
                        GRID_COLUMNS

                    val row =
                        floor(
                            latRemainder /
                                    latResolution
                        )
                            .toInt()
                            .coerceIn(
                                0,
                                GRID_ROWS - 1
                            )

                    val column =
                        floor(
                            lngRemainder /
                                    lngResolution
                        )
                            .toInt()
                            .coerceIn(
                                0,
                                GRID_COLUMNS - 1
                            )

                    val index =
                        row *
                                GRID_COLUMNS +
                                column

                    code.append(
                        ALPHABET[index]
                    )

                    latRemainder -=
                        row *
                                latResolution

                    lngRemainder -=
                        column *
                                lngResolution
                }
            }

            val raw =
                code.toString()

            val formatted =
                if (
                    requestedLength <
                    SEPARATOR_POSITION
                ) {

                    raw.padEnd(
                        SEPARATOR_POSITION,
                        PADDING
                    )

                } else {

                    raw
                }

            return formatted.substring(
                0,
                min(
                    formatted.length,
                    SEPARATOR_POSITION
                )
            ) +
                    SEPARATOR +
                    if (
                        requestedLength >
                        SEPARATOR_POSITION
                    ) {

                        raw.substring(
                            SEPARATOR_POSITION
                        )

                    } else {

                        ""
                    }
        }


        /*
         * --------------------------------------------------------
         * DECODE
         * --------------------------------------------------------
         */

        fun decode(
            code: String
        ): CodeArea {

            val cleanCode =
                code
                    .trim()
                    .uppercase(Locale.US)

            require(
                isFull(cleanCode)
            ) {
                "Only full Plus Codes can be decoded"
            }

            val separatorIndex =
                cleanCode.indexOf(
                    SEPARATOR
                )

            val significant =
                cleanCode
                    .substring(
                        0,
                        separatorIndex
                    )
                    .replace(
                        PADDING.toString(),
                        ""
                    ) +
                    cleanCode.substring(
                        separatorIndex + 1
                    )

            var latitude =
                -90.0

            var longitude =
                -180.0

            var placeValue =
                20.0

            var index =
                0

            val pairDigits =
                min(
                    significant.length,
                    PAIR_CODE_LENGTH
                )

            while (
                index + 1 <
                pairDigits
            ) {

                val latDigit =
                    ALPHABET.indexOf(
                        significant[index]
                    )

                val lngDigit =
                    ALPHABET.indexOf(
                        significant[index + 1]
                    )

                latitude +=
                    latDigit *
                            placeValue

                longitude +=
                    lngDigit *
                            placeValue

                placeValue /=
                    ENCODING_BASE

                index += 2
            }

            var latitudePrecision =
                placeValue

            var longitudePrecision =
                placeValue

            while (
                index <
                significant.length
            ) {

                latitudePrecision /=
                    GRID_ROWS

                longitudePrecision /=
                    GRID_COLUMNS

                val digit =
                    ALPHABET.indexOf(
                        significant[index]
                    )

                val row =
                    digit /
                            GRID_COLUMNS

                val column =
                    digit %
                            GRID_COLUMNS

                latitude +=
                    row *
                            latitudePrecision

                longitude +=
                    column *
                            longitudePrecision

                index++
            }

            return CodeArea(
                latitudeLo =
                    latitude,
                longitudeLo =
                    longitude,
                latitudeHi =
                    latitude +
                            latitudePrecision,
                longitudeHi =
                    longitude +
                            longitudePrecision,
                codeLength =
                    significant.length
            )
        }


        /*
         * --------------------------------------------------------
         * RECOVER NEAREST
         * --------------------------------------------------------
         */

        fun recoverNearest(
            shortCode: String,
            referenceLatitude: Double,
            referenceLongitude: Double
        ): String {

            var latitude =
                clipLatitude(
                    referenceLatitude
                )

            val longitude =
                normalizeLongitude(
                    referenceLongitude
                )

            val code =
                shortCode
                    .trim()
                    .uppercase(Locale.US)

            if (isFull(code)) {
                return code
            }

            require(
                isShort(code)
            ) {
                "Invalid short Plus Code: $shortCode"
            }

            val separatorIndex =
                code.indexOf(
                    SEPARATOR
                )

            val paddingLength =
                SEPARATOR_POSITION -
                        separatorIndex

            val resolution =
                ENCODING_BASE.toDouble()
                    .pow(
                        2.0 -
                                paddingLength /
                                2.0
                    )

            val halfResolution =
                resolution / 2.0

            val codeLength =
                code.replace(
                    SEPARATOR.toString(),
                    ""
                ).length

            latitude =
                clipLatitude(
                    latitude
                )

            val referenceCode =
                encode(
                    latitude,
                    longitude,
                    10
                )

            Log.d(
                TAG_PLUS,
                "Reference code: $referenceCode"
            )

            Log.d(
                TAG_PLUS,
                "Prefix length: $paddingLength"
            )

            val referencePrefix =
                referenceCode
                    .replace(
                        SEPARATOR.toString(),
                        ""
                    )
                    .substring(
                        0,
                        paddingLength
                    )

            val recoveredCode =
                referencePrefix +
                        code

            Log.d(
                TAG_PLUS,
                "Initial recovered code: $recoveredCode"
            )

            var area =
                decode(
                    recoveredCode
                )

            var centerLatitude =
                area.latitudeCenter

            var centerLongitude =
                area.longitudeCenter

            if (
                latitude +
                halfResolution <
                centerLatitude &&
                centerLatitude -
                resolution >
                -LATITUDE_MAX
            ) {

                centerLatitude -=
                    resolution

            } else if (
                latitude -
                halfResolution >
                centerLatitude &&
                centerLatitude +
                resolution <
                LATITUDE_MAX
            ) {

                centerLatitude +=
                    resolution
            }

            if (
                longitude +
                halfResolution <
                centerLongitude
            ) {

                centerLongitude -=
                    resolution

            } else if (
                longitude -
                halfResolution >
                centerLongitude
            ) {

                centerLongitude +=
                    resolution
            }

            centerLongitude =
                normalizeLongitude(
                    centerLongitude
                )

            val finalCode =
                encode(
                    centerLatitude,
                    centerLongitude,
                    codeLength
                )

            Log.d(
                TAG_PLUS,
                "Final recovered code: $finalCode"
            )

            area =
                decode(
                    finalCode
                )

            Log.d(
                TAG_PLUS,
                "Final decoded center: " +
                        "${area.latitudeCenter}, " +
                        "${area.longitudeCenter}"
            )

            return finalCode
        }
    }
}