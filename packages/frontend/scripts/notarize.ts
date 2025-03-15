import { notarize } from '@electron/notarize';

async function notarizing() {
  const appPath = process.env.APP_PATH;
  const teamId = process.env.APPLE_TEAM_ID;
  const appleId = process.env.APPLE_ID;
  const appleIdPassword = process.env.APPLE_APP_SPECIFIC_PASSWORD;

  if (!appPath) {
    console.error('APP_PATH environment variable is not set');
    process.exit(1);
  }

  if (!teamId || !appleId || !appleIdPassword) {
    console.error('Required environment variables are not set');
    process.exit(1);
  }

  console.log(`Notarizing ${appPath}...`);

  try {
    await notarize({
      appPath,
      appleId,
      appleIdPassword,
      teamId
    });
    console.log('Notarization complete!');
  } catch (error: any) {
    console.error('Notarization failed:', error.message);
    throw error;
  }
}

notarizing().catch((error) => {
  console.error(error);
  process.exit(1);
});



