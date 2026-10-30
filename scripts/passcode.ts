/**
 * Creates the PASSCODE_HASH value for a new passcode. Only the hash is ever stored.
 *
 *   npm run passcode                    asks for the passcode (typing is hidden)
 *   echo 'my passcode' | npm run passcode -s    reads it from stdin
 */
import { createInterface } from "node:readline";
import { hashPasscode, MIN_PASSCODE_LENGTH } from "../lib/passcode";

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Echo nothing while the passcode is typed.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s) => {
      if (s.startsWith(question)) process.stdout.write(question);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function readStdin(): Promise<string> {
  let data = "";
  for await (const chunk of process.stdin) data += chunk;
  return data.replace(/\r?\n$/, "");
}

async function main() {
  let passcode: string;
  if (process.stdin.isTTY) {
    passcode = await ask("New passcode: ");
    if ((await ask("Type it again: ")) !== passcode) throw new Error("The two entries don't match.");
  } else {
    passcode = await readStdin();
  }
  if (passcode.length < MIN_PASSCODE_LENGTH) throw new Error(`Use at least ${MIN_PASSCODE_LENGTH} characters. A short phrase of four or more words works well.`);
  if (passcode.length > 200) throw new Error("Keep it under 200 characters.");

  const hash = await hashPasscode(passcode);
  if (process.stdin.isTTY) {
    console.log("\nSet this environment variable on the server (for local use, put it in .env.local), then restart the app:\n");
  }
  console.log(`PASSCODE_HASH=${hash}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
