import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import { lookup } from 'dns';
import { publicIpv4 } from 'public-ip';
import net from 'net';

const execAsync = promisify(exec);
const dnsLookup = promisify(lookup);

interface CheckResult {
  name: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: string;
}

export async function runDoctorChecks(projectPath?: string): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  // Check Docker installation
  results.push(await checkDocker());

  // Check Docker Compose
  results.push(await checkDockerCompose());

  // If we have a project path, check project-specific things
  if (projectPath && await fs.pathExists(projectPath)) {
    const profile = await detectProfile(projectPath);

    if (profile === 'prod') {
      results.push(await checkPorts([80, 443]));
    } else if (profile === 'local') {
      results.push(await checkPorts([5678, 5432, 6379]));
    }

    // Check domain configuration if .env exists
    const envPath = path.join(projectPath, '.env');
    if (await fs.pathExists(envPath)) {
      results.push(await checkDomainConfiguration(envPath));
    }
  }

  return results;
}

async function checkDocker(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('docker --version');
    const version = stdout.trim();
    return {
      name: 'Docker Installation',
      status: 'success',
      message: 'Docker is installed',
      details: version
    };
  } catch (error) {
    return {
      name: 'Docker Installation',
      status: 'error',
      message: 'Docker is not installed or not accessible',
      details: 'Install Docker from https://docs.docker.com/get-docker/'
    };
  }
}

async function checkDockerCompose(): Promise<CheckResult> {
  try {
    const { stdout } = await execAsync('docker compose version');
    const version = stdout.trim();
    return {
      name: 'Docker Compose',
      status: 'success',
      message: 'Docker Compose is available',
      details: version
    };
  } catch (error) {
    // Try legacy docker-compose command
    try {
      const { stdout } = await execAsync('docker-compose --version');
      const version = stdout.trim();
      return {
        name: 'Docker Compose',
        status: 'warning',
        message: 'Using legacy docker-compose command',
        details: `${version}. Consider upgrading to Docker Compose V2`
      };
    } catch (legacyError) {
      return {
        name: 'Docker Compose',
        status: 'error',
        message: 'Docker Compose is not available',
        details: 'Make sure Docker Compose is installed'
      };
    }
  }
}

async function checkPorts(ports: number[]): Promise<CheckResult> {
  const portChecks = await Promise.all(
    ports.map(port => checkPortAvailable(port))
  );

  const unavailablePorts = portChecks
    .filter(check => !check.available)
    .map(check => check.port);

  if (unavailablePorts.length === 0) {
    return {
      name: 'Port Availability',
      status: 'success',
      message: `All required ports are available`,
      details: `Checked ports: ${ports.join(', ')}`
    };
  } else {
    return {
      name: 'Port Availability',
      status: 'error',
      message: `Some ports are already in use`,
      details: `Unavailable ports: ${unavailablePorts.join(', ')}`
    };
  }
}

async function checkPortAvailable(port: number): Promise<{ port: number; available: boolean }> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.listen(port, () => {
      server.close(() => {
        resolve({ port, available: true });
      });
    });

    server.on('error', () => {
      resolve({ port, available: false });
    });
  });
}

async function detectProfile(projectPath: string): Promise<string | null> {
  try {
    const composePath = path.join(projectPath, 'docker-compose.yml');
    if (await fs.pathExists(composePath)) {
      const content = await fs.readFile(composePath, 'utf-8');
      // Simple heuristic: prod profile usually has networks defined
      if (content.includes('networks:') && content.includes('n8n_network')) {
        return 'prod';
      } else {
        return 'local';
      }
    }
  } catch (error) {
    // Ignore errors
  }
  return null;
}

async function checkDomainConfiguration(envPath: string): Promise<CheckResult> {
  try {
    const envContent = await fs.readFile(envPath, 'utf-8');
    const hostMatch = envContent.match(/^N8N_HOST=(.+)$/m);

    if (!hostMatch || !hostMatch[1]) {
      return {
        name: 'Domain Configuration',
        status: 'warning',
        message: 'N8N_HOST not configured in .env',
        details: 'Set N8N_HOST to your domain name'
      };
    }

    const domain = hostMatch[1].trim();

    // Skip localhost checks
    if (domain === 'localhost' || domain === '127.0.0.1') {
      return {
        name: 'Domain Configuration',
        status: 'success',
        message: 'Using localhost configuration',
        details: 'Domain: localhost'
      };
    }

    try {
      // Get public IP of the server
      const publicIp = await publicIpv4();

      // Resolve domain to IP
      const resolved = await dnsLookup(domain);
      const domainIp = Array.isArray(resolved) ? resolved[0].address : resolved.address;

      if (domainIp === publicIp) {
        return {
          name: 'Domain Configuration',
          status: 'success',
          message: 'Domain points to this server',
          details: `${domain} → ${domainIp}`
        };
      } else {
        return {
          name: 'Domain Configuration',
          status: 'warning',
          message: 'Domain does not point to this server',
          details: `${domain} → ${domainIp}, but server IP is ${publicIp}`
        };
      }
    } catch (error) {
      return {
        name: 'Domain Configuration',
        status: 'error',
        message: 'Cannot resolve domain or detect public IP',
        details: `Domain: ${domain}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  } catch (error) {
    return {
      name: 'Domain Configuration',
      status: 'error',
      message: 'Cannot read .env file',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export function printDoctorResults(results: CheckResult[]): void {
  console.log('\n🔍 n8n-ready Doctor Report\n');
  console.log('═'.repeat(50));

  results.forEach(result => {
    const icon = result.status === 'success' ? '✅' :
                 result.status === 'warning' ? '⚠️' : '❌';

    console.log(`\n${icon} ${result.name}`);
    console.log(`   ${result.message}`);

    if (result.details) {
      console.log(`   ${result.details}`);
    }
  });

  console.log('\n═'.repeat(50));

  const successCount = results.filter(r => r.status === 'success').length;
  const warningCount = results.filter(r => r.status === 'warning').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  console.log(`\n📊 Summary: ${successCount} passed, ${warningCount} warnings, ${errorCount} errors`);

  if (errorCount > 0) {
    console.log('\n❌ Some critical issues found. Please fix them before deploying.');
  } else if (warningCount > 0) {
    console.log('\n⚠️  Everything looks good, but there are some warnings to consider.');
  } else {
    console.log('\n✅ All checks passed! Your system is ready for n8n deployment.');
  }
}