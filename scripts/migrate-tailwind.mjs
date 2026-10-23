// One-time, repeatable migration from the original stylesheet to explicit JSX utilities.
// Run after installing client dependencies: node scripts/migrate-tailwind.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
const client = path.join(root, 'client');
const require = createRequire(path.join(client, 'package.json'));
const postcss = require('postcss');
const ts = require('typescript');
const stylesheet = path.join(client, 'src/style.css');
const sourceRef = process.argv
  .find((arg) => arg.startsWith('--source-ref='))
  ?.slice('--source-ref='.length);
/**
 * Reads UTF-8 source from `--source-ref` when supplied, or from the working tree.
 * File-read and Git command failures propagate to the caller.
 */
const readSource = (file) =>
  sourceRef
    ? execFileSync(
        'git',
        [
          'show',
          `${sourceRef}:${path.relative(root, file).replaceAll(path.sep, '/')}`,
        ],
        { cwd: root, encoding: 'utf8' },
      )
    : readFileSync(file, 'utf8');
const css = readSource(stylesheet);
if (!css.includes('.shell {')) {
  console.log('Tailwind migration already applied.');
  process.exit(0);
}

const classes = new Map();
const elements = new Map();
const documentRules = [];
const plateRules = postcss.root();
const plateMedia = new Map();
const direct = {
  'display:flex': 'flex',
  'display:grid': 'grid',
  'display:block': 'block',
  'display:inline-flex': 'inline-flex',
  'display:none': 'hidden',
  'position:sticky': 'sticky',
  'position:static': 'static',
  'position:relative': 'relative',
  'position:absolute': 'absolute',
  'align-items:center': 'items-center',
  'align-items:end': 'items-end',
  'align-items:flex-start': 'items-start',
  'justify-content:center': 'justify-center',
  'justify-content:space-between': 'justify-between',
  'justify-content:flex-start': 'justify-start',
  'justify-content:flex-end': 'justify-end',
  'flex-direction:column': 'flex-col',
  'flex-wrap:wrap': 'flex-wrap',
  'text-decoration:none': 'no-underline',
  'text-align:center': 'text-center',
  'cursor:pointer': 'cursor-pointer',
  'cursor:not-allowed': 'cursor-not-allowed',
  'font-weight:400': 'font-normal',
  'font-weight:500': 'font-medium',
  'font-weight:600': 'font-semibold',
  'font-weight:700': 'font-bold',
  'overflow:hidden': 'overflow-hidden',
  'white-space:nowrap': 'whitespace-nowrap',
  'white-space:pre-wrap': 'whitespace-pre-wrap',
  'resize:vertical': 'resize-y',
  'width:100%': 'w-full',
  'min-width:0': 'min-w-0',
  'min-height:100vh': 'min-h-screen',
  'height:100vh': 'h-screen',
  'margin:0': 'm-0',
  'padding:0': 'p-0',
  'border:0': 'border-0',
  'flex:1': 'flex-1',
  'place-items:center': 'place-items-center',
};
const properties = {
  'font-size': 'text',
  'line-height': 'leading',
  'letter-spacing': 'tracking',
  padding: 'p',
  'padding-top': 'pt',
  'padding-right': 'pr',
  'padding-bottom': 'pb',
  'padding-left': 'pl',
  margin: 'm',
  'margin-top': 'mt',
  'margin-right': 'mr',
  'margin-bottom': 'mb',
  'margin-left': 'ml',
  width: 'w',
  height: 'h',
  'min-height': 'min-h',
  'max-height': 'max-h',
  'min-width': 'min-w',
  'max-width': 'max-w',
  gap: 'gap',
  'border-radius': 'rounded',
  'grid-template-columns': 'grid-cols',
  opacity: 'opacity',
};
/** Converts a CSS declaration to a Tailwind utility, using arbitrary values when needed. */
function utility(property, value) {
  value = value.replace(/\s+/g, ' ').trim();
  if (direct[`${property}:${value}`]) return direct[`${property}:${value}`];
  const escaped = value.replace(/ /g, '_');
  if (property === 'color') return `text-[${escaped}]`;
  if (property === 'background' && /^(#|white$)/.test(value))
    return `bg-[${escaped}]`;
  if (properties[property]) return `${properties[property]}-[${escaped}]`;
  return `[${property}:${escaped}]`;
}
/** Appends values to the map entry, creating it when absent and retaining duplicates. */
function add(map, key, values) {
  map.set(key, [...(map.get(key) ?? []), ...values]);
}
postcss.parse(css).walkRules((rule) => {
  if (rule.selectors.every((selector) => /^\.plate(?:$| )/.test(selector))) {
    if (rule.parent.type === 'atrule') {
      let group = plateMedia.get(rule.parent.params);
      if (!group) {
        group = postcss.atRule({ name: 'media', params: rule.parent.params });
        plateMedia.set(rule.parent.params, group);
        plateRules.append(group);
      }
      group.append(rule.clone());
    } else plateRules.append(rule.clone());
    return;
  }
  if ([':root', '*', 'body'].includes(rule.selector)) {
    documentRules.push(rule.toString());
    return;
  }
  const media =
    rule.parent.type === 'atrule'
      ? `[@media${rule.parent.params.replace(/ /g, '')}]:`
      : '';
  for (const selector of rule.selectors) {
    const classMatch = selector.match(/^\.([\w-]+)/);
    const elementMatch = selector.match(/^([a-z][a-z0-9]*)/);
    const name = classMatch?.[1] ?? elementMatch?.[1];
    if (!name) throw new Error(`Unsupported selector: ${selector}`);
    const suffix = selector.slice(classMatch ? name.length + 1 : name.length);
    const specificity = name === 'button' ? '&' : '&&';
    const variant = classMatch
      ? `[${specificity}${suffix.trimEnd().replace(/ /g, '_')}]:`
      : suffix
        ? `[&${suffix.trimEnd().replace(/ /g, '_')}]:`
        : '';
    const values = rule.nodes
      .filter((node) => node.type === 'decl')
      .map((node) => `${media}${variant}${utility(node.prop, node.value)}`);
    add(classMatch ? classes : elements, name, values);
  }
});
for (const [name, values] of elements) {
  elements.set(
    name,
    values.flatMap((value) =>
      value === '[font:inherit]'
        ? [
            '[font-family:inherit]',
            '[font-size:inherit]',
            '[line-height:inherit]',
            ...(name === 'button' ? [] : ['[font-weight:inherit]']),
          ]
        : [value],
    ),
  );
}

/**
 * Recursively lists TSX files, excluding paths containing `.test.` or a `test` directory.
 * Directory-read errors propagate to the caller.
 */
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    return entry.isDirectory()
      ? files(full)
      : full.endsWith('.tsx') &&
          !full.includes('.test.') &&
          !full.includes(`${path.sep}test${path.sep}`)
        ? [full]
        : [];
  });
}
for (const file of files(path.join(client, 'src'))) {
  const source = readSource(file);
  const tree = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const edits = [];
  /**
   * Collects utility-class edits from this node and its descendants in `edits`.
   * Throws when element utilities must be added to a nonliteral className.
   */
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const base = elements.get(node.tagName.getText(tree)) ?? [];
      const attribute = node.attributes.properties.find(
        (prop) =>
          ts.isJsxAttribute(prop) && prop.name.getText(tree) === 'className',
      );
      if (attribute?.initializer && ts.isStringLiteral(attribute.initializer)) {
        const names = attribute.initializer.text.split(/\s+/);
        const tokens = [
          ...base,
          ...names.flatMap((name) => [name, ...(classes.get(name) ?? [])]),
        ];
        edits.push({
          start: attribute.initializer.getStart(tree),
          end: attribute.initializer.end,
          value: JSON.stringify(tokens.join(' ')),
        });
      } else if (!attribute && base.length) {
        edits.push({
          start: node.tagName.end,
          end: node.tagName.end,
          value: ` className=${JSON.stringify(base.join(' '))}`,
        });
      } else if (attribute && base.length) {
        throw new Error(`Dynamic className requires review: ${file}`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(tree);
  let result = source;
  for (const edit of edits.sort((a, b) => b.start - a.start))
    result = result.slice(0, edit.start) + edit.value + result.slice(edit.end);
  if (path.basename(file) === 'PlannerHero.tsx')
    result = result.replace(
      "import { Leaf } from 'lucide-react';",
      "import { Leaf } from 'lucide-react';\nimport './PlannerHero.css';",
    );
  if (result !== source) writeFileSync(file, result);
}
writeFileSync(
  path.join(client, 'src/features/planning/PlannerHero.css'),
  `/* Decorative plate geometry stays beside the component that renders it. */\n${plateRules.toString()}\n`,
);
writeFileSync(
  stylesheet,
  `@layer theme, base, components, utilities;\n@import 'tailwindcss/theme.css' layer(theme);\n@import 'tailwindcss/utilities.css' layer(utilities);\n\n/* Document defaults only. Component styles live in their JSX utility classes.\n   Preflight is intentionally omitted to preserve the application's native defaults. */\n@layer base {\n${documentRules.join('\n')}\n}\n`,
);
console.log(
  'Migrated JSX styling. Verify the pre-migration UI baselines before committing.',
);
