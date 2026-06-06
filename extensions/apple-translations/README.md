# Apple Translations

Raycast extension for translating text with Apple's on-device Translation framework.

This extension is based on [raycast/extensions-swift-sample](https://github.com/raycast/extensions-swift-sample) and uses the Swift bridge from [raycast/extensions-swift-tools](https://github.com/raycast/extensions-swift-tools).

## Current Scope

- One `Translate Text` command.
- TypeScript UI in `src/translate-text.tsx`.
- Native translation logic in `swift/Sources/SwiftAPI.swift`.

## Notes

- This implementation is local-only. It doesn't call any external translation service.
- The current MVP can only translate when the required language pair is already installed on the Mac.
- If a pair is supported but not installed, the UI tells the user to install the language pack from System Settings.
- Source language is auto-detected locally with Apple's Natural Language framework.

## Development

1. Import the extension folder into Raycast.
2. Start development build from Raycast.
3. Raycast generates the TypeScript bindings for the Swift functions during build.

For the Swift bridge details, see [Swift for Raycast Extensions](https://github.com/raycast/extensions-swift-tools).
