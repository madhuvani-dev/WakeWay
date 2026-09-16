import JSZip from 'jszip';
import { ANDROID_PROJECT_FILES } from '../data/androidFiles';

export async function downloadAndroidProjectZip(): Promise<void> {
  const zip = new JSZip();

  // Add all files into the zip
  for (const file of ANDROID_PROJECT_FILES) {
    zip.file(file.path, file.content);
  }

  // Also include root README and helper scripts
  zip.file(
    'README.md',
    `# WakeWay Android Studio Project

Import this directory directly into Android Studio (Koala, Ladybug, Meerkat, or 2024+):
1. Extract this ZIP.
2. Open Android Studio and choose "Open Existing Project".
3. Select the extracted folder.
4. Let Gradle sync and build.
5. Run on an Android device or emulator (Android 8.0+ / API 26-35).
`
  );

  // Generate the zip blob
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'WakeWay-Android-Project.zip';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
