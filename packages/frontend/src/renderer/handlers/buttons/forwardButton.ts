
export async function forwardButton(
  global_file_path: string,
  setGlobal_file_path: (path: string) => void,
  backHistory: string[],
  setBackHistory: (history: string[]) => void,
  forwardHistory: string[],
  setForwardHistory: (history: string[]) => void
) {
  if (backHistory.length > 0) {
    const lastBackPath = backHistory[backHistory.length - 1];
    setBackHistory(backHistory.slice(0, -1)); // Remove the last back path
    setForwardHistory([global_file_path, ...forwardHistory]); // Add current path to forward history
    setGlobal_file_path(lastBackPath);
  } else {
    console.warn("No back history available");
  }
}
