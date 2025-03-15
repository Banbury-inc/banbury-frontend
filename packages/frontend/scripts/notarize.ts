const { notarize } = require('@electron/notarize');

async function notarizing() {
  const appPath = process.env.APP_PATH;
  if (!appPath) {
    console.error('APP_PATH environment variable is not set');
    process.exit(1);
  }

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      tool: 'notarytool',
      teamId: process.env.APPLE_TEAM_ID,
      appPath,
      appleId: process.env.APPLE_ID,
      appleIdPassword: process.env.APPLE_APP_SPECIFIC_PASSWORD
    });
    console.log('Notarization complete!');
  } catch (error) {
    console.error('Notarization failed:', error.message);
    throw error;
  }
}

notarizing().catch((error) => {
  console.error(error);
  process.exit(1);
});



