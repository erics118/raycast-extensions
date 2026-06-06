import {
  Action,
  ActionPanel,
  Clipboard,
  Form,
  Icon,
  Toast,
  getPreferenceValues,
  getSelectedText,
  showToast,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { checkTranslationAvailability, supportedLanguages, translateText } from "swift:../swift";

type Preferences = {
  preferredInputSource?: "selected" | "clipboard";
  defaultTargetLanguage?: string;
};

type Language = {
  identifier: string;
  localizedName: string;
};

type AvailabilityResult = {
  sourceLanguageIdentifier: string;
  sourceLanguageName: string;
  targetLanguageIdentifier: string;
  targetLanguageName: string;
  status: "installed" | "supported" | "unsupported";
};

type TranslationResult = {
  sourceLanguageIdentifier: string;
  sourceLanguageName: string;
  targetLanguageIdentifier: string;
  targetLanguageName: string;
  translatedText: string;
};

type FormValues = {
  text: string;
  targetLanguage: string;
};

const { preferredInputSource = "selected", defaultTargetLanguage = "en" } = getPreferenceValues<Preferences>();

export default function Command() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [text, setText] = useState("");
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [result, setResult] = useState<TranslationResult | null>(null);
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    void loadLanguages();
    void preloadText();
  }, []);

  async function loadLanguages() {
    try {
      const items = (await supportedLanguages()) as Language[];
      setLanguages(items);

      if (!items.some((language) => language.identifier === targetLanguage) && items[0]) {
        setTargetLanguage(items[0].identifier);
      }
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn't load languages",
        message: getErrorMessage(error),
      });
    } finally {
      setIsLoadingLanguages(false);
    }
  }

  async function preloadText() {
    try {
      const value = await readInitialText();
      if (value) {
        setText(value);
      }
    } finally {
      setIsBootstrapping(false);
    }
  }

  async function handleSubmit(values: FormValues) {
    setIsTranslating(true);
    setResult(null);

    try {
      const availabilityResult = (await checkTranslationAvailability(
        values.text,
        values.targetLanguage,
        null,
      )) as AvailabilityResult;
      setAvailability(availabilityResult);

      if (availabilityResult.status !== "installed") {
        return;
      }

      const translation = (await translateText(values.text, values.targetLanguage, null)) as TranslationResult;
      setResult(translation);
      await showToast({
        style: Toast.Style.Success,
        title: "Translation complete",
        message: `${translation.sourceLanguageName} -> ${translation.targetLanguageName}`,
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Translation failed",
        message: getErrorMessage(error),
      });
    } finally {
      setIsTranslating(false);
    }
  }

  const availabilityMessage = formatAvailabilityMessage(availability);

  return (
    <Form
      isLoading={isBootstrapping || isLoadingLanguages}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Translate" icon={Icon.Globe} onSubmit={handleSubmit} />
          {result ? <Action.CopyToClipboard title="Copy Translation" content={result.translatedText} /> : null}
          {text ? (
            <Action.CopyToClipboard
              title="Copy Source Text"
              content={text}
              shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
            />
          ) : null}
        </ActionPanel>
      }
    >
      <Form.Description
        title="Local Only"
        text="Uses Apple's on-device translation framework. This MVP can translate only when the required language pair is already installed locally on the Mac."
      />
      <Form.TextArea id="text" title="Text" placeholder="Enter text to translate" value={text} onChange={setText} />
      <Form.Dropdown
        id="targetLanguage"
        title="Target Language"
        value={targetLanguage}
        onChange={setTargetLanguage}
        storeValue
      >
        {languages.map((language) => (
          <Form.Dropdown.Item key={language.identifier} value={language.identifier} title={language.localizedName} />
        ))}
      </Form.Dropdown>
      {availabilityMessage ? <Form.Description title="Availability" text={availabilityMessage} /> : null}
      {result ? (
        <Form.Description
          title={`Result (${result.sourceLanguageName} -> ${result.targetLanguageName})`}
          text={result.translatedText}
        />
      ) : null}
      {isTranslating ? <Form.Description title="Status" text="Translating with Apple on-device models..." /> : null}
    </Form>
  );
}

async function readInitialText() {
  const readers =
    preferredInputSource === "clipboard"
      ? [readClipboardText, readSelectedText]
      : [readSelectedText, readClipboardText];

  for (const reader of readers) {
    const value = await reader();
    if (value) {
      return value;
    }
  }

  return "";
}

async function readSelectedText() {
  try {
    return await getSelectedText();
  } catch {
    return "";
  }
}

async function readClipboardText() {
  try {
    return (await Clipboard.readText()) ?? "";
  } catch {
    return "";
  }
}

function formatAvailabilityMessage(result: AvailabilityResult | null) {
  if (!result) {
    return "";
  }

  const pair = `${result.sourceLanguageName} -> ${result.targetLanguageName}`;

  switch (result.status) {
    case "installed":
      return `${pair} is installed locally and ready for translation.`;
    case "supported":
      return `${pair} is supported by Apple's on-device translation framework, but the local language pack is not installed. Install it in System Settings > General > Language & Region > Translation Languages.`;
    case "unsupported":
      return `${pair} isn't available for local translation on this Mac.`;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}
