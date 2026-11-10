// Pure validation for the offline platform-admin bootstrap command.
// No secrets are accepted on argv or written to the repository.
export function parseBootstrapArgs(args) {
  const allowed = new Set(["--email", "--name", "--expect-db"]);
  const values = {};
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    if (!allowed.has(flag) || values[flag] !== undefined || !args[i + 1] || args[i + 1].startsWith("--")) {
      throw new Error("Usage: node prisma/bootstrap-platform-admin.mjs --email ADDRESS --name DISPLAY_NAME [--expect-db clubkeep]");
    }
    values[flag] = args[i + 1];
  }

  const email = values["--email"]?.trim().toLowerCase();
  const name = values["--name"]?.trim();
  const expectedDb = values["--expect-db"] ?? "clubkeep";
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("A valid --email is required");
  }
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new Error("A non-empty --name (up to 80 characters) is required");
  }
  if (!/^clubkeep(?:_[a-z0-9_]+)?$/.test(expectedDb)) {
    throw new Error("Database name must be explicitly scoped to ClubKeep");
  }
  return { email, name, expectedDb };
}

export async function readPasswordFromStdin(input, isTTY) {
  if (isTTY) {
    throw new Error("Do not type a password into an echoed terminal. Pipe one line from a silent shell prompt.");
  }
  const parts = [];
  let length = 0;
  for await (const part of input) {
    length += part.length;
    if (length > 8192) throw new Error("Password input too long");
    parts.push(Buffer.isBuffer(part) ? part : Buffer.from(part));
  }
  const password = Buffer.concat(parts).toString("utf8").replace(/\r?\n$/, "");
  if (password.includes("\n") || password.includes("\r") || password.length < 8 || password.length > 128) {
    throw new Error("Password must be a single line of 8–128 characters");
  }
  return password;
}
