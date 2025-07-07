export const handleToggleTool = (toolId: string, isEnabled: boolean, setWebSearchEnabled: (isEnabled: boolean) => void, setBanburyEnabled: (isEnabled: boolean) => void, setGmailEnabled: (isEnabled: boolean) => void, setGoogleCalendarEnabled: (isEnabled: boolean) => void, setGoogleDriveEnabled: (isEnabled: boolean) => void, setGoogleTasksEnabled: (isEnabled: boolean) => void, setFilesystemEnabled: (isEnabled: boolean) => void, setBrowserbaseEnabled: (isEnabled: boolean) => void) => {
    switch (toolId) {
      case 'web_search':
        setWebSearchEnabled(isEnabled);
        break;
      case 'banbury':
        setBanburyEnabled(isEnabled);
        break;
      case 'gmail':
        setGmailEnabled(isEnabled);
        break;
      case 'google_calendar':
        setGoogleCalendarEnabled(isEnabled);
        break;
      case 'google_drive':
        setGoogleDriveEnabled(isEnabled);
        break;
      case 'google_tasks':
        setGoogleTasksEnabled(isEnabled);
        break;
      case 'filesystem':
        setFilesystemEnabled(isEnabled);
        break;
      case 'browserbase':
        setBrowserbaseEnabled(isEnabled);
        break;
      default:
        console.warn(`Unknown tool ID: ${toolId}`);
    }
  };
