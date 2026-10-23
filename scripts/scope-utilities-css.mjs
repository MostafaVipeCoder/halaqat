// Scopes the generated utilities to elements inside a `.mz` container,
// so classes that the prebuilt index.css lacks do not change the rest of the app.
// `:where()` keeps each utility's specificity identical to plain Tailwind.
import { readFileSync, writeFileSync } from 'node:fs';

const file = new URL('../src/styles/utilities.css', import.meta.url);
const css = readFileSync(file, 'utf8');

const start = css.indexOf('@layer utilities {');
if (start === -1) throw new Error('utilities layer not found');

const head = css.slice(0, start);
const utilities = css
    .slice(start)
    .replace(/^ {2}(\.[^\s{][^{]*?) \{$/gm, '  $1:where(.mz, .mz *) {');

writeFileSync(file, head + utilities);
console.log('Scoped utilities to .mz');
