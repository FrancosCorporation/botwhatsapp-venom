import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const audit = spawnSync(
  isWindows ? 'corepack.cmd' : 'corepack',
  ['yarn', 'audit', '--json'],
  { encoding: 'utf8', shell: isWindows },
);

if (audit.error || audit.signal || audit.status === null) {
  console.error('Não foi possível executar yarn audit:', audit.error?.message || audit.signal || 'processo encerrado');
  process.exit(1);
}

const records = audit.stdout
  .split(/\r?\n/)
  .filter(Boolean)
  .flatMap((line) => {
    try {
      return [JSON.parse(line)];
    } catch {
      return [];
    }
  });

const summary = records.find((record) => record.type === 'auditSummary')?.data;
const vulnerabilities = summary?.vulnerabilities;
if (!vulnerabilities || typeof vulnerabilities !== 'object') {
  console.error('O audit do Yarn não retornou o resumo de vulnerabilidades esperado.');
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

const severities = ['info', 'low', 'moderate', 'high', 'critical'];
const counts = Object.fromEntries(severities.map((severity) => {
  const count = Number(vulnerabilities[severity] || 0);
  return [severity, Number.isInteger(count) && count >= 0 ? count : NaN];
}));

if (Object.values(counts).some((count) => !Number.isFinite(count))) {
  console.error('O audit do Yarn retornou contagens inválidas.');
  process.exit(1);
}

const expectedExitCode = severities.reduce((code, severity, index) => (
  code | (counts[severity] > 0 ? 1 << index : 0)
), 0);
if (audit.status !== expectedExitCode) {
  console.error(`O audit terminou com código ${audit.status}, mas o resumo corresponde a ${expectedExitCode}.`);
  if (audit.stderr) console.error(audit.stderr.trim());
  process.exit(1);
}

console.log(
  `Yarn audit: ${counts.critical} críticas, ${counts.high} altas, ` +
  `${counts.moderate} moderadas, ${counts.low} baixas, ${counts.info} informativas.`,
);

if (counts.critical > 0) {
  for (const record of records) {
    const advisory = record.type === 'auditAdvisory' ? record.data?.advisory : null;
    if (advisory?.severity === 'critical') {
      console.error(`- ${advisory.module_name}: ${advisory.title} (${advisory.url})`);
    }
  }
  process.exit(1);
}

console.log('Nenhuma vulnerabilidade crítica.');
