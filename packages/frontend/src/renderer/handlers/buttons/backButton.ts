
export async function backButton(
  global_file_path: string | null,
  setGlobal_file_path: (path: string) => void,
  backHistory: string[],
  setBackHistory: (history: string[]) => void,
  setForwardHistory: (history: string[]) => void
) {
  if (global_file_path) {
    const newPath = global_file_path.substring(0, global_file_path.lastIndexOf('/'));
    setBackHistory([...backHistory, global_file_path]); // Add current path to back history
    setGlobal_file_path(newPath);
    setForwardHistory([]); // Clear forward history
  } else {
    console.warn("Global file path is not defined or is null");
  }
}
