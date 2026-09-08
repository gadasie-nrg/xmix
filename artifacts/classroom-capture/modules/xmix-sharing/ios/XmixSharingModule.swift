import ExpoModulesCore
import UIKit

public class XmixSharingModule: Module {
  public func definition() -> ModuleDefinition {
    Name("XmixSharing")

    AsyncFunction("shareImages") { (paths: [String], mimeType: String?, title: String?, text: String?, promise: Promise) in
      guard !paths.isEmpty else {
        throw XmixSharingError.noImages
      }

      let fileURLs = paths.map { path in
        if let url = URL(string: path), url.isFileURL {
          return url
        }
        return URL(fileURLWithPath: path)
      }
      guard fileURLs.allSatisfy({ FileManager.default.isReadableFile(atPath: $0.path) }) else {
        throw XmixSharingError.unreadableImage
      }
      _ = mimeType

      var activityItems: [Any] = fileURLs
      if let text, !text.isEmpty {
        activityItems.append(text)
      }

      let activityController = UIActivityViewController(
        activityItems: activityItems,
        applicationActivities: nil
      )
      activityController.title = title

      activityController.completionWithItemsHandler = { _, _, _, _ in
        promise.resolve(nil)
      }

      guard let currentViewController = appContext?.utilities?.currentViewController() else {
        throw XmixSharingError.missingViewController
      }

      if UIDevice.current.userInterfaceIdiom == .pad {
        activityController.popoverPresentationController?.sourceView = currentViewController.view
        activityController.popoverPresentationController?.sourceRect = CGRect(
          x: currentViewController.view.bounds.midX,
          y: currentViewController.view.bounds.maxY,
          width: 0,
          height: 0
        )
      }

      currentViewController.present(activityController, animated: true)
    }
    .runOnQueue(.main)
  }
}

private enum XmixSharingError: Error {
  case noImages
  case unreadableImage
  case missingViewController
}
