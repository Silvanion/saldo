/**
 * Google Drive API Service for Saldo Application
 */

import { AppState } from "./types";

export interface GoogleDriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export class GoogleAuthError extends Error {
  status: 401 | 403;
  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "GoogleAuthError";
    this.status = status;
  }
}

const handleDriveErrorResponse = async (res: Response, action: string) => {
  if (res.status === 401 || res.status === 403) {
    throw new GoogleAuthError(
      "SESSION_EXPIRED: Token Google Drive wygasł lub jest nieprawidłowy. Połącz ponownie konto Google Drive.",
      res.status as 401 | 403
    );
  }
  if (res.status === 404) {
    throw new Error("FILE_NOT_FOUND: Plik kopii zapasowej nie został odnaleziony na Dysku Google.");
  }
  const errorText = await res.text();
  throw new Error(`Google Drive API error (${action}): ${errorText}`);
};

/**
 * Searches for 'saldo_budget.json' file in the user's Google Drive.
 */
export const findBudgetFile = async (accessToken: string): Promise<GoogleDriveFile | null> => {
  try {
    const q = encodeURIComponent("name = 'saldo_budget.json' and trashed = false");
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,modifiedTime)&spaces=drive`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      await handleDriveErrorResponse(res, "Search");
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (err) {
    console.error("Error searching Google Drive:", (err as Error)?.message || err);
    throw err;
  }
};

/**
 * Reads the content of a specific file from Google Drive.
 */
export const readBudgetFile = async (accessToken: string, fileId: string): Promise<AppState> => {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
    
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      await handleDriveErrorResponse(res, "Read");
    }

    return await res.json() as AppState;
  } catch (err) {
    console.error("Error reading file from Google Drive:", (err as Error)?.message || err);
    throw err;
  }
};

/**
 * Updates an existing file on Google Drive with new content.
 */
export const updateBudgetFile = async (
  accessToken: string,
  fileId: string,
  stateData: AppState
): Promise<void> => {
  try {
    const url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`;
    
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stateData, null, 2),
    });

    if (!res.ok) {
      await handleDriveErrorResponse(res, "Update Content");
    }
  } catch (err) {
    console.error("Error updating Google Drive file:", (err as Error)?.message || err);
    throw err;
  }
};

/**
 * Creates a new 'saldo_budget.json' file on Google Drive and writes stateData to it.
 */
export const createBudgetFile = async (accessToken: string, stateData: AppState): Promise<string> => {
  try {
    // Step 1: Create metadata for the file
    const metaRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "saldo_budget.json",
        mimeType: "application/json",
        description: "Saldo Budget Application Backup Data File"
      }),
    });

    if (!metaRes.ok) {
      await handleDriveErrorResponse(metaRes, "Create Metadata");
    }

    const file = await metaRes.json();
    const fileId = file.id;

    // Step 2: Upload the actual content using PATCH
    await updateBudgetFile(accessToken, fileId, stateData);
    return fileId;
  } catch (err) {
    console.error("Error creating Google Drive file:", (err as Error)?.message || err);
    throw err;
  }
};
