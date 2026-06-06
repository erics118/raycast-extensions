import Foundation
import NaturalLanguage
import RaycastSwiftMacros
import Translation

struct TranslationLanguage: Encodable {
  let identifier: String
  let localizedName: String
}

struct AvailabilityResult: Encodable {
  let sourceLanguageIdentifier: String
  let sourceLanguageName: String
  let targetLanguageIdentifier: String
  let targetLanguageName: String
  let status: String
}

struct TranslationResult: Encodable {
  let sourceLanguageIdentifier: String
  let sourceLanguageName: String
  let targetLanguageIdentifier: String
  let targetLanguageName: String
  let translatedText: String
}

enum LocalTranslationError: LocalizedError {
  case emptyText
  case unsupportedOS
  case unableToDetectSourceLanguage
  case invalidLanguageIdentifier(String)
  case sameLanguagePair
  case languagePairSupportedButNotInstalled(source: String, target: String)
  case unsupportedLanguagePair(source: String, target: String)

  var errorDescription: String? {
    switch self {
    case .emptyText:
      "Enter some text to translate."
    case .unsupportedOS:
      "This command requires a macOS version that supports direct on-device TranslationSession access from the Swift bridge."
    case .unableToDetectSourceLanguage:
      "Couldn't determine the source language from the provided text."
    case .invalidLanguageIdentifier(let identifier):
      "Invalid language identifier: \(identifier)"
    case .sameLanguagePair:
      "Source and target languages must be different."
    case .languagePairSupportedButNotInstalled(let source, let target):
      "\(source) -> \(target) is supported, but the local language pack is not installed. Install it in System Settings > General > Language & Region > Translation Languages."
    case .unsupportedLanguagePair(let source, let target):
      "\(source) -> \(target) isn't available for local on-device translation."
    }
  }
}

@raycast func supportedLanguages() async -> [TranslationLanguage] {
  let availability = LanguageAvailability()
  let locale = Locale.current
  let languages = await availability.supportedLanguages

  return languages
    .map { language in
      let identifier = language.languageCode?.identifier ?? language.maximalIdentifier
      let localizedName = locale.localizedString(forIdentifier: identifier) ?? identifier
      return TranslationLanguage(identifier: identifier, localizedName: localizedName)
    }
    .sorted { $0.localizedName.localizedCaseInsensitiveCompare($1.localizedName) == .orderedAscending }
}

@raycast func checkTranslationAvailability(
  text: String,
  targetLanguageIdentifier: String,
  sourceLanguageIdentifier: String?
) async throws -> AvailabilityResult {
  let normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !normalizedText.isEmpty else { throw LocalTranslationError.emptyText }

  let sourceLanguage = try resolveSourceLanguage(explicitIdentifier: sourceLanguageIdentifier, text: normalizedText)
  let targetLanguage = try resolveLanguage(identifier: targetLanguageIdentifier)
  try validateDistinctLanguages(sourceLanguage: sourceLanguage, targetLanguage: targetLanguage)

  let availability = LanguageAvailability()
  let status = await availability.status(from: sourceLanguage, to: targetLanguage)

  return AvailabilityResult(
    sourceLanguageIdentifier: sourceLanguage.maximalIdentifier,
    sourceLanguageName: localizedName(for: sourceLanguage),
    targetLanguageIdentifier: targetLanguage.maximalIdentifier,
    targetLanguageName: localizedName(for: targetLanguage),
    status: statusString(from: status)
  )
}

@raycast func translateText(
  text: String,
  targetLanguageIdentifier: String,
  sourceLanguageIdentifier: String?
) async throws -> TranslationResult {
  guard #available(macOS 26.0, *) else {
    throw LocalTranslationError.unsupportedOS
  }

  let normalizedText = text.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !normalizedText.isEmpty else { throw LocalTranslationError.emptyText }

  let sourceLanguage = try resolveSourceLanguage(explicitIdentifier: sourceLanguageIdentifier, text: normalizedText)
  let targetLanguage = try resolveLanguage(identifier: targetLanguageIdentifier)
  try validateDistinctLanguages(sourceLanguage: sourceLanguage, targetLanguage: targetLanguage)

  let availability = LanguageAvailability()
  let status = await availability.status(from: sourceLanguage, to: targetLanguage)

  switch status {
  case .installed:
    let session = TranslationSession(installedSource: sourceLanguage, target: targetLanguage)
    let response = try await session.translate(normalizedText)

    return TranslationResult(
      sourceLanguageIdentifier: response.sourceLanguage.maximalIdentifier,
      sourceLanguageName: localizedName(for: response.sourceLanguage),
      targetLanguageIdentifier: response.targetLanguage.maximalIdentifier,
      targetLanguageName: localizedName(for: response.targetLanguage),
      translatedText: response.targetText
    )
  case .supported:
    throw LocalTranslationError.languagePairSupportedButNotInstalled(
      source: localizedName(for: sourceLanguage),
      target: localizedName(for: targetLanguage)
    )
  case .unsupported:
    throw LocalTranslationError.unsupportedLanguagePair(
      source: localizedName(for: sourceLanguage),
      target: localizedName(for: targetLanguage)
    )
  @unknown default:
    throw LocalTranslationError.unsupportedLanguagePair(
      source: localizedName(for: sourceLanguage),
      target: localizedName(for: targetLanguage)
    )
  }
}

private func resolveSourceLanguage(explicitIdentifier: String?, text: String) throws -> Locale.Language {
  if let explicitIdentifier, !explicitIdentifier.isEmpty {
    return try resolveLanguage(identifier: explicitIdentifier)
  }

  guard let dominantLanguage = NLLanguageRecognizer.dominantLanguage(for: text) else {
    throw LocalTranslationError.unableToDetectSourceLanguage
  }

  return Locale.Language(identifier: dominantLanguage.rawValue)
}

private func resolveLanguage(identifier: String) throws -> Locale.Language {
  let normalized = identifier.trimmingCharacters(in: .whitespacesAndNewlines)
  guard !normalized.isEmpty else {
    throw LocalTranslationError.invalidLanguageIdentifier(identifier)
  }

  return Locale.Language(identifier: normalized)
}

private func validateDistinctLanguages(sourceLanguage: Locale.Language, targetLanguage: Locale.Language) throws {
  if sourceLanguage.minimalIdentifier == targetLanguage.minimalIdentifier {
    throw LocalTranslationError.sameLanguagePair
  }
}

private func localizedName(for language: Locale.Language) -> String {
  let identifier = language.languageCode?.identifier ?? language.maximalIdentifier
  return Locale.current.localizedString(forIdentifier: identifier) ?? identifier
}

private func statusString(from status: LanguageAvailability.Status) -> String {
  switch status {
  case .installed:
    "installed"
  case .supported:
    "supported"
  case .unsupported:
    "unsupported"
  @unknown default:
    "unsupported"
  }
}
