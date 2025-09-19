import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';

const execAsync = promisify(exec);

interface ProjectInfo {
  profile: 'local' | 'prod' | null;
  n8nUrl: string;
  n8nHost: string;
  n8nPort: string;
  n8nProtocol: string;
}

export async function checkComposeProject(projectPath: string = process.cwd()): Promise<void> {
  const composePath = path.join(projectPath, 'docker-compose.yml');

  if (!(await fs.pathExists(composePath))) {
    console.error('❌ No docker-compose.yml found in current directory');
    console.error('💡 Make sure you are in a n8n-ready project directory');
    console.error('💡 Run "n8n-ready init <project-name>" to create a new project');
    process.exit(1);
  }
}

export async function getProjectInfo(projectPath: string = process.cwd()): Promise<ProjectInfo> {
  const composePath = path.join(projectPath, 'docker-compose.yml');
  const envPath = path.join(projectPath, '.env');

  let profile: 'local' | 'prod' | null = null;
  let n8nHost = 'localhost';
  let n8nPort = '5678';
  let n8nProtocol = 'http';

  // Detect profile from docker-compose.yml
  try {
    const composeContent = await fs.readFile(composePath, 'utf-8');
    if (composeContent.includes('networks:') && composeContent.includes('n8n_network')) {
      profile = 'prod';
      n8nPort = '80';
      n8nProtocol = 'https';
    } else {
      profile = 'local';
    }
  } catch (error) {
    // Use defaults
  }

  // Read environment variables if .env exists
  try {
    if (await fs.pathExists(envPath)) {
      const envContent = await fs.readFile(envPath, 'utf-8');

      const hostMatch = envContent.match(/^N8N_HOST=(.+)$/m);
      if (hostMatch && hostMatch[1]) {
        n8nHost = hostMatch[1].trim();
      }

      const portMatch = envContent.match(/^N8N_PORT=(.+)$/m);
      if (portMatch && portMatch[1]) {
        n8nPort = portMatch[1].trim();
      }

      const protocolMatch = envContent.match(/^N8N_PROTOCOL=(.+)$/m);
      if (protocolMatch && protocolMatch[1]) {
        n8nProtocol = protocolMatch[1].trim();
      }
    }
  } catch (error) {
    // Use defaults
  }

  const n8nUrl = `${n8nProtocol}://${n8nHost}${n8nPort !== '80' && n8nPort !== '443' ? `:${n8nPort}` : ''}`;

  return {
    profile,
    n8nUrl,
    n8nHost,
    n8nPort,
    n8nProtocol
  };
}

export async function composeUp(projectPath: string = process.cwd()): Promise<void> {
  await checkComposeProject(projectPath);

  console.log('🚀 Starting n8n services...\n');

  try {
    // Try docker compose first (v2), fallback to docker-compose (v1)
    let composeCommand = 'docker compose';
    try {
      await execAsync('docker compose version');
    } catch (error) {
      console.log('⚠️  Using legacy docker-compose command');
      composeCommand = 'docker-compose';
    }

    const { stdout, stderr } = await execAsync(`${composeCommand} up -d`, {
      cwd: projectPath
    });

    if (stderr && !stderr.includes('Creating') && !stderr.includes('Starting')) {
      console.error('⚠️  Warning:', stderr);
    }

    console.log('✅ Services started successfully!\n');

    // Get project info and display useful information
    const projectInfo = await getProjectInfo(projectPath);

    console.log('📋 Project Information:');
    console.log(`   Profile: ${projectInfo.profile || 'unknown'}`);
    console.log(`   n8n URL: ${projectInfo.n8nUrl}`);

    if (projectInfo.profile === 'local') {
      console.log('\n🔗 Access your n8n instance:');
      console.log(`   ${projectInfo.n8nUrl}`);
    } else if (projectInfo.profile === 'prod') {
      console.log('\n🔗 Access your n8n instance:');
      console.log(`   ${projectInfo.n8nUrl}`);
      console.log('\n⚠️  Production Notes:');
      console.log('   • Make sure your domain points to this server');
      console.log('   • Configure SSL/TLS certificates if using HTTPS');
      console.log('   • Check firewall settings for ports 80/443');
    }

    console.log('\n📊 Useful Commands:');
    console.log('   n8n-ready down          # Stop all services');
    console.log(`   ${composeCommand} logs -f n8n    # View n8n logs`);
    console.log(`   ${composeCommand} ps             # Check service status`);

  } catch (error) {
    console.error('❌ Failed to start services:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

export async function composeDown(projectPath: string = process.cwd()): Promise<void> {
  await checkComposeProject(projectPath);

  console.log('🛑 Stopping n8n services...\n');

  try {
    // Try docker compose first (v2), fallback to docker-compose (v1)
    let composeCommand = 'docker compose';
    try {
      await execAsync('docker compose version');
    } catch (error) {
      console.log('⚠️  Using legacy docker-compose command');
      composeCommand = 'docker-compose';
    }

    const { stdout, stderr } = await execAsync(`${composeCommand} down`, {
      cwd: projectPath
    });

    if (stderr && !stderr.includes('Stopping') && !stderr.includes('Removing')) {
      console.error('⚠️  Warning:', stderr);
    }

    console.log('✅ Services stopped successfully!');
    console.log('\n📊 Data Preservation:');
    console.log('   • Database data is preserved in Docker volumes');
    console.log('   • n8n workflows and credentials are safe');
    console.log('   • Run "n8n-ready up" to restart services');

  } catch (error) {
    console.error('❌ Failed to stop services:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}