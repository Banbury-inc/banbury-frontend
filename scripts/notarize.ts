import { notarize } from '@electron/notarize';

export default async function notarizing(context: any) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appName = context.packager.appInfo.productFilename;
  const appPath = `${appOutDir}/${appName}.app`;

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      tool: 'notarytool',
      teamId: "5Q7W7ZFVLS",
      appPath,
      appleId: "mamills@maine.rr.com",
      appleIdPassword: "mgwm-abks-hehu-reom"
    });
    console.log('Notarization complete!');
  } catch (error: any) {
    console.error('Notarization failed:', error.message);
    throw error;
  }
}



