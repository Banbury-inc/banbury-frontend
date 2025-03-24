export async function addfolderButton(
  setDisableFetch: (disable: boolean) => void,
  setIsAddingFolder: (adding: boolean) => void,
  setNewFolderName: (name: string) => void,
  setFileRows: (callback: (prevFileRows: any[]) => any[]) => void
) {
  setDisableFetch(true);
  setIsAddingFolder(true);
  setNewFolderName(""); // Reset folder name input

  setFileRows((prevFileRows) => [
    ...prevFileRows,
    {
      id: Date.now(), // Assign a unique ID for the new folder
      fileName: "",
      fileSize: "",
      kind: "Folder",
      dateUploaded: new Date().toISOString(),
      filePath: "",
      deviceID: "",
      deviceName: "",
      helpers: 0,
      available: "Available",
    },
  ]);
}
