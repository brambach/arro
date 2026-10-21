// Prints the on-screen windows, front to back, as JSON. Read only: it never
// moves, raises or focuses anything. verify.mjs compiles it once into its cache.
import CoreGraphics
import Foundation

let list = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] ?? []
let out: [[String: Any]] = list.compactMap { w in
  guard let b = w["kCGWindowBounds"] as? [String: Any] else { return nil }
  return [
    "owner": w["kCGWindowOwnerName"] as? String ?? "",
    "name": w["kCGWindowName"] as? String ?? "",
    "pid": w["kCGWindowOwnerPID"] as? Int ?? 0,
    "id": w["kCGWindowNumber"] as? Int ?? 0,
    "layer": w["kCGWindowLayer"] as? Int ?? 0,
    "alpha": w["kCGWindowAlpha"] as? Double ?? 1,
    "x": b["X"] as? Double ?? 0,
    "y": b["Y"] as? Double ?? 0,
    "w": b["Width"] as? Double ?? 0,
    "h": b["Height"] as? Double ?? 0,
  ]
}
let data = try JSONSerialization.data(withJSONObject: out)
print(String(data: data, encoding: .utf8)!)
