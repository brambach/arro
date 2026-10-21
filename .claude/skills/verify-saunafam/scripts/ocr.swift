// Prints the text Vision reads in a PNG as JSON lines, with pixel boxes
// (origin top left). Read only. verify.mjs compiles it once into its cache.
import Foundation
import Vision

let url = URL(fileURLWithPath: CommandLine.arguments[1])
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.usesLanguageCorrection = false
let handler = VNImageRequestHandler(url: url)
try handler.perform([request])
guard let image = CGImageSourceCreateWithURL(url as CFURL, nil).flatMap({ CGImageSourceCreateImageAtIndex($0, 0, nil) }) else { exit(1) }
let (w, h) = (Double(image.width), Double(image.height))
let out: [[String: Any]] = (request.results ?? []).compactMap { o in
  guard let c = o.topCandidates(1).first else { return nil }
  let b = o.boundingBox
  return ["text": c.string, "x": b.minX * w, "y": (1 - b.maxY) * h, "w": b.width * w, "h": b.height * h]
}
print(String(data: try JSONSerialization.data(withJSONObject: out), encoding: .utf8)!)
