import { Platform } from 'react-native';
import ExpoFontLoader from 'expo-font/build/ExpoFontLoader';

const FONT_FILES: Record<string, string> = {
  'PlusJakartaSans-Regular': 'PlusJakartaSans-Regular.ttf',
  'PlusJakartaSans-Medium': 'PlusJakartaSans-Medium.ttf',
  'PlusJakartaSans-SemiBold': 'PlusJakartaSans-SemiBold.ttf',
  'PlusJakartaSans-Bold': 'PlusJakartaSans-Bold.ttf',
  'PlusJakartaSans-ExtraBold': 'PlusJakartaSans-ExtraBold.ttf',
  'PlusJakartaSans-Light': 'PlusJakartaSans-Light.ttf',
  'PlusJakartaSans-Italic': 'PlusJakartaSans-Italic.ttf',
  'PlusJakartaSans-BoldItalic': 'PlusJakartaSans-BoldItalic.ttf',
  'PlusJakartaSans-MediumItalic': 'PlusJakartaSans-MediumItalic.ttf',
  'PlusJakartaSans-SemiBoldItalic': 'PlusJakartaSans-SemiBoldItalic.ttf',
};

const ANDROID_FILE_PATHS = [
  '/data/data/com.cloudnews.mobile/files/fonts/',
  '/data/user/0/com.cloudnews.mobile/files/fonts/',
  'asset:///fonts/',
];

export async function loadCustomFonts(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  let anySuccess = false;

  for (const [fontFamily, filename] of Object.entries(FONT_FILES)) {
    let fontRegistered = false;

    for (const basePath of ANDROID_FILE_PATHS) {
      try {
        const fullUri = `${basePath}${filename}`;
        await ExpoFontLoader.loadAsync(fontFamily, fullUri);
        console.log(`[FontLoader] Successfully loaded ${fontFamily} from ${fullUri}`);
        fontRegistered = true;
        anySuccess = true;
        break;
      } catch (err: any) {
        // Try next path
      }
    }

    if (!fontRegistered) {
      console.warn(`[FontLoader] Could not load ${fontFamily} from local paths`);
    }
  }

  return anySuccess;
}
