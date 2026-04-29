import { readFile } from "node:fs/promises";

const credentialLabels = {
  Admin: {
    email: "Admin email",
    password: "Admin password",
  },
  Organizer: {
    email: "Organizer email",
    password: "Organizer password",
  },
  Scanner: {
    email: "Scanner email",
    password: "Scanner password",
  },
} as const;

export const defaultPilotOperatorCredentialPath =
  process.env.PILOT_OPERATOR_BOOTSTRAP_OUTPUT_PATH ?? "/Users/dogan/Desktop/OmaLeima-pilot-operator-credentials.txt";

export type PilotOperatorKey = keyof typeof credentialLabels;

export type PilotOperatorCredential = {
  email: string;
  password: string;
};

export type PilotOperatorCredentialMap = Record<PilotOperatorKey, PilotOperatorCredential>;

const readCredentialValue = (lines: string[], label: string, filePath: string): string => {
  const matchingLine = lines.find((line) => line.startsWith(`${label}: `));

  if (matchingLine === undefined) {
    throw new Error(`Missing "${label}" in ${filePath}.`);
  }

  return matchingLine.slice(`${label}: `.length).trim();
};

export const parsePilotOperatorCredentials = (source: string, filePath: string): PilotOperatorCredentialMap => {
  const lines = source.split("\n").map((line) => line.trim());

  return {
    Admin: {
      email: readCredentialValue(lines, credentialLabels.Admin.email, filePath),
      password: readCredentialValue(lines, credentialLabels.Admin.password, filePath),
    },
    Organizer: {
      email: readCredentialValue(lines, credentialLabels.Organizer.email, filePath),
      password: readCredentialValue(lines, credentialLabels.Organizer.password, filePath),
    },
    Scanner: {
      email: readCredentialValue(lines, credentialLabels.Scanner.email, filePath),
      password: readCredentialValue(lines, credentialLabels.Scanner.password, filePath),
    },
  };
};

export const readPilotOperatorCredentialsAsync = async (filePath: string): Promise<PilotOperatorCredentialMap> => {
  const source = await readFile(filePath, "utf8");

  return parsePilotOperatorCredentials(source, filePath);
};
