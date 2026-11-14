// Pure helpers for the licence check (scripts/check-licenses.mjs). No file, network or process access here,
// so the rules can be tested on their own (tests/licences.test.ts).

export function toAllowedSet(list) {
  return new Set(list.map((id) => String(id).toLowerCase()));
}

function tokenize(expression) {
  return expression.replace(/\(/g, " ( ").replace(/\)/g, " ) ").trim().split(/\s+/).filter(Boolean);
}

// Is an SPDX licence expression allowed? OR needs one allowed side, AND needs both, AND binds tighter than OR.
// Anything we cannot read (empty, "UNLICENSED", "SEE LICENSE IN ...", broken brackets) is NOT allowed.
export function expressionAllowed(expression, allowedSet) {
  const tokens = tokenize(String(expression ?? ""));
  let position = 0;
  const peek = () => tokens[position];
  const isWord = (token, word) => typeof token === "string" && token.toUpperCase() === word;

  function parseOr() {
    let result = parseAnd();
    while (isWord(peek(), "OR")) {
      position += 1;
      const right = parseAnd();
      result = result || right;
    }
    return result;
  }

  function parseAnd() {
    let result = parseAtom();
    while (isWord(peek(), "AND")) {
      position += 1;
      const right = parseAtom();
      result = result && right;
    }
    return result;
  }

  function parseAtom() {
    const token = tokens[position];
    position += 1;
    if (token === undefined) throw new Error("unexpected end");
    if (token === "(") {
      const inner = parseOr();
      if (tokens[position] !== ")") throw new Error("missing closing bracket");
      position += 1;
      return inner;
    }
    if (token === ")" || isWord(token, "AND") || isWord(token, "OR") || isWord(token, "WITH")) {
      throw new Error("unexpected " + token);
    }
    if (isWord(peek(), "WITH")) {
      position += 1;
      if (tokens[position] === undefined) throw new Error("missing exception id");
      position += 1;
    }
    return allowedSet.has(token.toLowerCase());
  }

  try {
    const result = parseOr();
    return position === tokens.length && result;
  } catch {
    return false;
  }
}

// pnpm prints { "<licence>": [ { name, versions: [...] } ] }. One row per package version.
export function flattenPnpm(data) {
  const rows = [];
  for (const [license, packages] of Object.entries(data)) {
    for (const entry of packages) {
      const versions = entry.versions && entry.versions.length > 0 ? entry.versions : ["unknown"];
      for (const version of versions) rows.push({ name: entry.name, version, license });
    }
  }
  return rows;
}

// "@img/sharp-libvips-*" matches every name that starts with "@img/sharp-libvips-". Otherwise the name must be equal.
export function nameMatches(pattern, name) {
  if (!pattern) return false;
  return pattern.endsWith("*") ? name.startsWith(pattern.slice(0, -1)) : pattern === name;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// "approved" only with an approver and a date. "pending" is a proposal. Anything else is invalid.
export function exceptionState(exception) {
  if (exception.status === "pending") return "pending";
  if (
    exception.status === "approved" &&
    exception.approvedBy &&
    DATE.test(String(exception.approvedOn))
  ) {
    return "approved";
  }
  return "invalid";
}

export function exceptionProblems(exceptions) {
  const problems = [];
  exceptions.forEach((exception, index) => {
    const who = `exception ${index + 1} (${exception.name ?? "no name"})`;
    if (!exception.name) problems.push(`${who}: name is missing`);
    if (!exception.license) problems.push(`${who}: license is missing`);
    if (!exception.reason) problems.push(`${who}: reason is missing`);
    if (exceptionState(exception) === "invalid") {
      problems.push(
        `${who}: status must be pending, or approved with approvedBy and approvedOn (YYYY-MM-DD)`,
      );
    }
  });
  return problems;
}

// Sorts every package into: fine (not listed), approved exception, pending exception, or failed.
export function checkPackages(packages, allowedList, exceptions) {
  const allowedSet = toAllowedSet(allowedList);
  const failed = [];
  const pending = [];
  const approved = [];
  const used = new Set();
  for (const pkg of packages) {
    if (expressionAllowed(pkg.license, allowedSet)) continue;
    const exception = exceptions.find(
      (candidate) => nameMatches(candidate.name, pkg.name) && candidate.license === pkg.license,
    );
    if (exception) used.add(exception);
    const state = exception ? exceptionState(exception) : "none";
    if (state === "approved") approved.push({ pkg, exception });
    else if (state === "pending") pending.push({ pkg, exception });
    else failed.push(pkg);
  }
  return {
    failed,
    pending,
    approved,
    unused: exceptions.filter((exception) => !used.has(exception)),
  };
}
