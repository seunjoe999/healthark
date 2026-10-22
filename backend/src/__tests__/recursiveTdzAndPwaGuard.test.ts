import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const repoRoot = path.resolve(__dirname, '../../..');
const frontendSrc = path.join(repoRoot, 'frontend/src');
const frontendDist = path.join(repoRoot, 'frontend/dist');

function collectFiles(dir: string, exts: string[]): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full, exts));
    else if (exts.some(ext => full.endsWith(ext))) out.push(full);
  }
  return out;
}

function collectPatternNames(nameNode: ts.BindingName, out: Set<string>) {
  if (ts.isIdentifier(nameNode)) {
    out.add(nameNode.text);
  } else if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
    for (const el of nameNode.elements) {
      if (ts.isBindingElement(el)) collectPatternNames(el.name, out);
    }
  }
}

/**
 * Recursively scans every ECMA-262 lexical scope (SourceFile, Block, FunctionBody)
 * for synchronous Temporal Dead Zone (TDZ) reads before a `let`/`const`/`class`
 * binding in that exact lexical scope is initialized.
 */
function findRecursiveSyncTdzViolations(filePath: string): string[] {
  const code = fs.readFileSync(filePath, 'utf8');
  const kind = filePath.endsWith('.tsx')
    ? ts.ScriptKind.TSX
    : filePath.endsWith('.ts')
    ? ts.ScriptKind.TS
    : ts.ScriptKind.JS;
  const sf = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true, kind);
  const violations: string[] = [];

  function checkStatements(stmts: readonly ts.Statement[]) {
    const tdzDecls = new Map<string, number>();
    const hoistedVarOrFunc = new Set<string>();

    stmts.forEach((stmt, idx) => {
      if (ts.isVariableStatement(stmt)) {
        const isBlockScoped = (stmt.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
        const names = new Set<string>();
        for (const decl of stmt.declarationList.declarations) {
          collectPatternNames(decl.name, names);
        }
        if (isBlockScoped) {
          names.forEach(n => tdzDecls.set(n, idx));
        } else {
          names.forEach(n => hoistedVarOrFunc.add(n));
        }
      } else if (ts.isClassDeclaration(stmt) && stmt.name) {
        tdzDecls.set(stmt.name.text, idx);
      } else if (ts.isFunctionDeclaration(stmt) && stmt.name) {
        hoistedVarOrFunc.add(stmt.name.text);
      } else if (ts.isImportDeclaration(stmt) && stmt.importClause) {
        if (stmt.importClause.name) hoistedVarOrFunc.add(stmt.importClause.name.text);
        const nb = stmt.importClause.namedBindings;
        if (nb && ts.isNamespaceImport(nb)) hoistedVarOrFunc.add(nb.name.text);
        if (nb && ts.isNamedImports(nb)) {
          nb.elements.forEach(el => hoistedVarOrFunc.add(el.name.text));
        }
      }
    });

    const isNonValueIdentifier = (id: ts.Identifier): boolean => {
      const p = id.parent;
      if (!p) return false;
      if (ts.isPropertyAccessExpression(p) && p.name === id) return true;
      if (ts.isPropertyAssignment(p) && p.name === id) return true;
      if (ts.isMethodDeclaration(p) && p.name === id) return true;
      if (ts.isGetAccessorDeclaration(p) && p.name === id) return true;
      if (ts.isSetAccessorDeclaration(p) && p.name === id) return true;
      if (ts.isPropertyDeclaration(p) && p.name === id) return true;
      if (ts.isBindingElement(p) && p.propertyName === id) return true;
      if ((ts.isImportSpecifier(p) || ts.isExportSpecifier(p)) && p.propertyName === id) return true;
      if (ts.isLabeledStatement(p) && p.label === id) return true;
      if ((ts.isBreakStatement(p) || ts.isContinueStatement(p)) && p.label === id) return true;
      if (ts.isTypeNode(p) || ts.isTypeReferenceNode(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) return true;
      if (ts.isJsxAttribute(p) && p.name === id) return true;
      return false;
    };

    stmts.forEach((stmt, stmtIdx) => {
      const walkSync = (node: ts.Node, shadowed: Set<string>) => {
        if (
          node !== stmt &&
          (ts.isFunctionDeclaration(node) ||
            ts.isFunctionExpression(node) ||
            ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) ||
            ts.isGetAccessorDeclaration(node) ||
            ts.isSetAccessorDeclaration(node) ||
            ts.isConstructorDeclaration(node))
        ) {
          if (node.body && ts.isBlock(node.body)) {
            checkStatements(node.body.statements);
          }
          return;
        }
        if (node !== stmt && ts.isBlock(node)) {
          checkStatements(node.statements);
          return;
        }
        if (ts.isSwitchStatement(node)) {
          walkSync(node.expression, shadowed);
          const caseStmts: ts.Statement[] = [];
          node.caseBlock.clauses.forEach(c => caseStmts.push(...c.statements));
          checkStatements(caseStmts);
          return;
        }
        if (ts.isCatchClause(node)) {
          checkStatements(node.block.statements);
          return;
        }
        if (ts.isForStatement(node) || ts.isForInStatement(node) || ts.isForOfStatement(node)) {
          const nextShadow = new Set(shadowed);
          if (node.initializer && ts.isVariableDeclarationList(node.initializer)) {
            for (const d of node.initializer.declarations) collectPatternNames(d.name, nextShadow);
          }
          ts.forEachChild(node, child => walkSync(child, nextShadow));
          return;
        }
        if (ts.isTypeNode(node)) return;

        if (ts.isIdentifier(node) && !isNonValueIdentifier(node) && !shadowed.has(node.text)) {
          const declIdx = tdzDecls.get(node.text);
          if (declIdx !== undefined && stmtIdx < declIdx && !hoistedVarOrFunc.has(node.text)) {
            const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
            violations.push(
              `${path.relative(repoRoot, filePath)}:${line + 1} reads '${node.text}' synchronously before its const/let declaration`
            );
          }
        }
        ts.forEachChild(node, child => walkSync(child, shadowed));
      };

      if (ts.isFunctionDeclaration(stmt) && stmt.body) {
        checkStatements(stmt.body.statements);
      } else if (ts.isBlock(stmt)) {
        checkStatements(stmt.statements);
      } else {
        walkSync(stmt, new Set());
      }
    });
  }

  checkStatements(sf.statements);
  return violations;
}

describe('Zero TDZ Hazards (Recursive AST + Compiled Rollup Chunks) & Mobile PWA Auto-Healing Guards', () => {
  test('every TypeScript/TSX file in frontend/src has zero synchronous TDZ reads in module or component scopes', () => {
    const files = collectFiles(frontendSrc, ['.ts', '.tsx']);
    expect(files.length).toBeGreaterThan(80);
    const allViolations = files.flatMap(findRecursiveSyncTdzViolations);
    expect(allViolations).toEqual([]);
  });

  test('every compiled Rollup chunk in frontend/dist/assets has zero synchronous TDZ reads in module or function scopes', () => {
    const assetsDir = path.join(frontendDist, 'assets');
    const jsChunks = collectFiles(assetsDir, ['.js']);
    expect(jsChunks.length).toBeGreaterThan(50);
    const chunkViolations = jsChunks.flatMap(findRecursiveSyncTdzViolations);
    expect(chunkViolations).toEqual([]);
  });

  test('Service Worker compcare-v19 purges stale caches, auto-navigates open mobile window clients, and guards JS/CSS MIME types', () => {
    const sw = fs.readFileSync(path.join(repoRoot, 'frontend/public/sw.js'), 'utf8');
    expect(sw).toContain("const CACHE = 'compcare-v19'");
    expect(sw).toContain("const DYNAMIC_CACHE = 'compcare-dynamic-v19'");
    expect(sw).toContain('self.skipWaiting()');
    expect(sw).toContain('self.clients.claim()');
    expect(sw).toContain('client.navigate(client.url)');
    expect(sw).toContain("ct.includes('text/html')");
  });

  test('Live App.tsx ErrorBoundary, main.tsx GlobalBoundary, backend /assets 404 guard, and Capacitor HTTPS URL are active', () => {
    const appTsx = fs.readFileSync(path.join(frontendSrc, 'App.tsx'), 'utf8');
    const mainTsx = fs.readFileSync(path.join(frontendSrc, 'main.tsx'), 'utf8');
    const backendIndex = fs.readFileSync(path.join(repoRoot, 'backend/src/index.ts'), 'utf8');
    const capacitorCfg = fs.readFileSync(path.join(repoRoot, 'frontend/capacitor.config.ts'), 'utf8');

    expect(appTsx).toContain('purgeCachesAndReload');
    expect(mainTsx).toContain('purgeCachesAndReload');
    expect(backendIndex).toContain("res.status(404).type('text/plain').send('Asset not found')");
    expect(capacitorCfg).toContain("url: 'https://compcarehub.co.uk'");
  });
});
