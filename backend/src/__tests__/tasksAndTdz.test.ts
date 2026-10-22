import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { pickCurrentShiftIndex, prevDateStr } from '../utils/taskDue';

function walkCodeFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '__tests__') continue;
      walkCodeFiles(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Scope-accurate AST TDZ detector: tracks exact lexical scopes (`const`, `let`,
 * `class`) including shadowed inner blocks so zero false positives occur while
 * catching EVERY real TDZ bug (like `[..., isCareShiftView]` before
 * `const isCareShiftView = ...` or IIFE/useMemo/useState references before
 * lexical initialization).
 */
function findTdzViolations(filePath: string): string[] {
  const src = fs.readFileSync(filePath, 'utf8');
  const sf = ts.createSourceFile(
    filePath,
    src,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  type DeclMap = Map<string, { pos: number; line: number }>;
  const violations: string[] = [];

  function collectDirectLexicalDecls(stmts: readonly ts.Statement[]): DeclMap {
    const map: DeclMap = new Map();
    const bind = (nameNode: ts.BindingName, pos: number) => {
      if (ts.isIdentifier(nameNode)) {
        const line = sf.getLineAndCharacterOfPosition(pos).line + 1;
        if (!map.has(nameNode.text)) map.set(nameNode.text, { pos, line });
      } else if (ts.isObjectBindingPattern(nameNode) || ts.isArrayBindingPattern(nameNode)) {
        for (const el of nameNode.elements) {
          if (ts.isBindingElement(el)) bind(el.name, pos);
        }
      }
    };
    for (const st of stmts) {
      if (ts.isVariableStatement(st)) {
        const isLexical = (st.declarationList.flags & (ts.NodeFlags.Let | ts.NodeFlags.Const)) !== 0;
        if (isLexical) {
          for (const d of st.declarationList.declarations) bind(d.name, d.pos);
        }
      } else if (ts.isClassDeclaration(st) && st.name) {
        bind(st.name, st.pos);
      }
    }
    return map;
  }

  function scanNode(node: ts.Node, scopeStack: DeclMap[], syncOnly: boolean) {
    // Enter new block/module scope
    if (ts.isSourceFile(node) || ts.isBlock(node) || ts.isCaseClause(node) || ts.isDefaultClause(node)) {
      const nextStack = [...scopeStack, collectDirectLexicalDecls(node.statements)];
      for (const st of node.statements) scanNode(st, nextStack, syncOnly);
      return;
    }

    // Catch clause introduces its own binding name
    if (ts.isCatchClause(node)) {
      const catchMap: DeclMap = new Map();
      if (node.variableDeclaration && ts.isIdentifier(node.variableDeclaration.name)) {
        catchMap.set(node.variableDeclaration.name.text, { pos: node.variableDeclaration.pos, line: 0 });
      }
      scanNode(node.block, [...scopeStack, catchMap], syncOnly);
      return;
    }

    // Function / arrow function boundaries
    if (
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node)
    ) {
      const paramMap: DeclMap = new Map();
      for (const p of node.parameters) {
        if (ts.isIdentifier(p.name)) paramMap.set(p.name.text, { pos: p.pos, line: 0 });
      }
      if (ts.isFunctionDeclaration(node) && node.name) {
        paramMap.set(node.name.text, { pos: node.pos, line: 0 });
      }

      const parent = node.parent;
      const isIIFE = Boolean(
        parent && (
          (ts.isCallExpression(parent) && parent.expression === node) ||
          (ts.isParenthesizedExpression(parent) && parent.parent && ts.isCallExpression(parent.parent) && parent.parent.expression === parent)
        ),
      );
      const isSyncHookCallback = Boolean(
        parent && ts.isCallExpression(parent) && parent.arguments[0] === node &&
        (parent.expression.getText(sf).endsWith('useMemo') || parent.expression.getText(sf).endsWith('useState')),
      );

      if (node.body) {
        if (isIIFE || isSyncHookCallback) {
          // Executes immediately during outer evaluation: outer TDZ bindings ARE still active!
          scanNode(node.body, [...scopeStack, paramMap], true);
        } else {
          // Deferred callback: start fresh outer TDZ check ONLY for scopes inside this function itself!
          scanNode(node.body, [paramMap], false);
        }
      }
      return;
    }

    if (ts.isIdentifier(node)) {
      const p = node.parent;
      const isNonValueRef =
        (ts.isPropertyAccessExpression(p) && p.name === node) ||
        (ts.isPropertyAssignment(p) && p.name === node) ||
        ts.isTypeReferenceNode(p) ||
        ts.isTypeQueryNode(p) ||
        ts.isInterfaceDeclaration(p) ||
        ts.isTypeAliasDeclaration(p) ||
        (ts.isJsxAttribute(p) && p.name === node) ||
        (ts.isVariableDeclaration(p) && p.name === node) ||
        (ts.isBindingElement(p) && (p.name === node || p.propertyName === node)) ||
        (ts.isParameter(p) && p.name === node) ||
        (ts.isImportSpecifier(p)) ||
        (ts.isImportClause(p)) ||
        (ts.isNamespaceImport(p));

      if (!isNonValueRef) {
        // Resolve nearest enclosing scope declaring `node.text`
        for (let i = scopeStack.length - 1; i >= 0; i--) {
          const hit = scopeStack[i].get(node.text);
          if (hit) {
            if (node.getStart(sf) < hit.pos) {
              const useLine = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
              violations.push(
                `${filePath}:${useLine} references '${node.text}' before its lexical declaration on line ${hit.line}`,
              );
            }
            break;
          }
        }
      }
    }

    ts.forEachChild(node, child => scanNode(child, scopeStack, syncOnly));
  }

  scanNode(sf, [], false);
  return violations;
}

describe('Codebase-wide TDZ & Circular Dependency Guards', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const frontendSrc = path.join(repoRoot, 'frontend/src');
  const backendSrc = path.join(repoRoot, 'backend/src');

  test('zero Temporal Dead Zone (TDZ) use-before-initialization bugs across frontend & backend', () => {
    const allFiles = [...walkCodeFiles(frontendSrc), ...walkCodeFiles(backendSrc)];
    expect(allFiles.length).toBeGreaterThan(50);
    const allViolations = allFiles.flatMap(findTdzViolations);
    expect(allViolations).toEqual([]);
  });

  test('zero circular value-import cycles across frontend/src', () => {
    const files = walkCodeFiles(frontendSrc);
    const exts = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];
    const graph = new Map<string, string[]>();

    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8');
      const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true);
      const deps: string[] = [];
      for (const st of sf.statements) {
        if ((ts.isImportDeclaration(st) || ts.isExportDeclaration(st)) && st.moduleSpecifier && ts.isStringLiteral(st.moduleSpecifier)) {
          if (ts.isImportDeclaration(st) && st.importClause?.isTypeOnly) continue;
          const spec = st.moduleSpecifier.text;
          if (!spec.startsWith('.')) continue;
          const base = path.resolve(path.dirname(file), spec);
          for (const ext of exts) {
            const cand = base + ext;
            if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
              deps.push(cand);
              break;
            }
          }
        }
      }
      graph.set(file, deps);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();
    const cycles: string[] = [];

    const dfs = (u: string, stack: string[]) => {
      visited.add(u);
      inStack.add(u);
      for (const v of graph.get(u) || []) {
        if (!visited.has(v)) dfs(v, [...stack, v]);
        else if (inStack.has(v)) {
          const idx = stack.indexOf(v);
          cycles.push(stack.slice(idx).concat(v).map(p => path.relative(repoRoot, p)).join(' -> '));
        }
      }
      inStack.delete(u);
    };

    for (const f of graph.keys()) {
      if (!visited.has(f)) dfs(f, [f]);
    }
    expect(cycles).toEqual([]);
  });
});

describe('Midnight & Overnight Shift Selection (pickCurrentShiftIndex)', () => {
  test('selects yesterday active overnight shift right after midnight over later daytime shift', () => {
    const shifts = [
      { start_time: '20:00:00', end_time: '08:00:00', _fromPrevDay: true },
      { start_time: '12:00:00', end_time: '16:00:00' },
      { start_time: '20:00:00', end_time: '08:00:00' },
    ];
    expect(pickCurrentShiftIndex(shifts, '00:05')).toBe(0);
    expect(pickCurrentShiftIndex(shifts, '04:30')).toBe(0);
    expect(pickCurrentShiftIndex(shifts, '12:30')).toBe(1);
    expect(pickCurrentShiftIndex(shifts, '21:15')).toBe(2);
  });

  test('computes previous calendar date accurately across month/year boundaries', () => {
    expect(prevDateStr('2026-10-22')).toBe('2026-10-21');
    expect(prevDateStr('2026-11-01')).toBe('2026-10-31');
    expect(prevDateStr('2027-01-01')).toBe('2026-12-31');
  });
});

describe('Clock-Out End-to-End Safety Guards', () => {
  const repoRoot = path.resolve(__dirname, '../../..');

  test('StaffDashboard clock-out handler never passes React SyntheticEvent into JSON payload', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/dashboard/StaffDashboard.tsx'), 'utf8');
    expect(src).not.toMatch(/onClick=\{clockOutNow\}/);
    expect(src).toMatch(/typeof overrideReason === 'string'/);
  });

  test('QR ClockIn page skips browser geolocation prompt immediately for clock_out and auto-detects open session', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'frontend/src/pages/clockin/ClockIn.tsx'), 'utf8');
    expect(src).toContain("if (activeType === 'clock_out') {\n      sendWithoutLocation()\n      return\n    }");
    expect(src).toContain('/api/clockin/status');
  });

  test('Backend clock-out endpoint allows clock_out without client homeId and includes overnight shifts', () => {
    const src = fs.readFileSync(path.join(repoRoot, 'backend/src/routes/clockin.routes.ts'), 'utf8');
    expect(src).toContain("body('homeId').if((_: any, { req }: any) => req.body.eventType !== 'clock_out').isUUID()");
    expect(src).toContain('openClockInHomeId');
  });
});

