package expo.modules.xmixsharing

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.content.FileProvider
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class XmixSharingModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: error("React context is not available.")
  private var pendingPromise: Promise? = null

  override fun definition() = ModuleDefinition {
    Name("XmixSharing")

    AsyncFunction("shareImages") { paths: List<String>, mimeType: String?, title: String?, text: String?, promise: Promise ->
      if (pendingPromise != null) {
        promise.reject("ERR_XMIX_SHARE_IN_PROGRESS", "Another share is already in progress.", null)
        return@AsyncFunction
      }

      try {
        if (paths.isEmpty()) {
          throw IllegalArgumentException("At least one image is required.")
        }

        val contentUris = paths.map { path ->
          val parsed = Uri.parse(path)
          if (parsed.scheme != "file") {
            throw IllegalArgumentException("Only local file URLs can be shared.")
          }
          val file = File(parsed.path ?: throw IllegalArgumentException("The image path is empty."))
          if (!file.exists() || !file.canRead()) {
            throw IllegalArgumentException("The image is no longer readable.")
          }
          FileProvider.getUriForFile(
            context,
            context.applicationInfo.packageName + ".SharingFileProvider",
            file
          )
        }

        val shareIntent = Intent(Intent.ACTION_SEND_MULTIPLE).apply {
          type = mimeType ?: "image/*"
          putParcelableArrayListExtra(Intent.EXTRA_STREAM, ArrayList(contentUris))
          if (!text.isNullOrBlank()) {
            putExtra(Intent.EXTRA_TEXT, text)
          }
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        context.packageManager
          .queryIntentActivities(shareIntent, PackageManager.MATCH_DEFAULT_ONLY)
          .forEach { resolveInfo ->
            contentUris.forEach { uri ->
              context.grantUriPermission(
                resolveInfo.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
              )
            }
          }

        val chooser = Intent.createChooser(shareIntent, title ?: "Share XmiX photos").apply {
          addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        pendingPromise = promise
        appContext.throwingActivity.startActivityForResult(chooser, REQUEST_CODE)
      } catch (error: Exception) {
        pendingPromise = null
        promise.reject("ERR_XMIX_SHARE", error.message ?: "Unable to share images.", error)
      }
    }

    OnActivityResult { _, (requestCode) ->
      if (requestCode == REQUEST_CODE) {
        pendingPromise?.resolve(null)
        pendingPromise = null
      }
    }
  }

  companion object {
    private const val REQUEST_CODE = 8537
  }
}
