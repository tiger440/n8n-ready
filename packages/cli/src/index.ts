#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { runDoctorChecks, printDoctorResults } from './doctor.js';
import { composeUp, composeDown } from './compose.js';

const __filename = fileURLToPath(import.meta.url);

const program = new Command();

program
  .name('n8n-ready')
  .description('CLI tool for n8n-ready project initialization')
  .version('1.0.0');

async function initProject(projectName: string, options: { profile: string }) {
  const { profile } = options;

  if (!['local', 'prod'].includes(profile)) {
    console.error('❌ Profile must be either "local" or "prod"');
    process.exit(1);
  }

  const projectDir = path.resolve(projectName);
  const templateDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates', profile);

  try {
    // Check if project directory already exists
    if (await fs.pathExists(projectDir)) {
      console.error(`❌ Directory "${projectName}" already exists`);
      process.exit(1);
    }

    // Check if template exists
    if (!(await fs.pathExists(templateDir))) {
      console.error(`❌ Template for profile "${profile}" not found`);
      process.exit(1);
    }

    console.log(`🚀 Initializing n8n-ready project "${projectName}" with profile "${profile}"...`);

    // Create project directory
    await fs.ensureDir(projectDir);

    // Copy template files
    await fs.copy(templateDir, projectDir);

    // Generate README.md
    const readmeContent = generateReadme(projectName, profile);
    await fs.writeFile(path.join(projectDir, 'README.md'), readmeContent);

    console.log('✅ Project initialized successfully!');
    console.log(`📁 Project created at: ${projectDir}`);
    console.log(`📋 Profile: ${profile}`);
    console.log('\n🎯 Next steps:');
    console.log(`   cd ${projectName}`);
    console.log('   cp .env.example .env');
    console.log('   # Edit .env with your configuration');
    console.log('   n8n-ready up');

  } catch (error) {
    console.error('❌ Failed to initialize project:', error);
    process.exit(1);
  }
}

function generateReadme(projectName: string, profile: string): string {
  return `# ${projectName}

An n8n-ready project configured for **${profile}** environment.

## Getting Started

1. **Setup environment variables:**
   \`\`\`bash
   cp .env.example .env
   \`\`\`

   Edit the \`.env\` file with your specific configuration.

2. **Start the services:**
   \`\`\`bash
   n8n-ready up
   \`\`\`

3. **Access n8n:**
   - **Local**: http://localhost:5678
   - **Production**: Configure your domain in the environment variables

## Configuration

This project uses Docker Compose to orchestrate the following services:
- **n8n**: Workflow automation platform
- **PostgreSQL**: Database for n8n data persistence
- **Redis**: Queue management for n8n workflows

### Environment Variables

Check \`.env.example\` for all available configuration options.

## Profile: ${profile}

${profile === 'local'
  ? `This profile is optimized for local development:
- n8n accessible on localhost:5678
- Development-friendly logging
- Local data persistence`
  : `This profile is optimized for production deployment:
- SSL/TLS configuration ready
- Production-grade security settings
- Persistent volumes for data safety
- Health checks enabled`
}

## Commands

- \`n8n-ready up\` - Start all services in background
- \`n8n-ready down\` - Stop all services
- \`n8n-ready doctor\` - Check system requirements
- \`docker-compose logs -f n8n\` - View n8n logs
- \`docker-compose ps\` - Show running services

## Backup

${profile === 'prod'
  ? `For production deployments, ensure you backup:
- PostgreSQL database: \`docker-compose exec postgres pg_dump -U n8n n8n > backup.sql\`
- n8n data volume: Located at \`./n8n_data\``
  : `For local development, data is persisted in local volumes.`
}

---

Generated with n8n-ready CLI
`;
}

async function doctorCommand(options: { path?: string }) {
  const { path: projectPath } = options;

  console.log('🩺 Running n8n-ready system checks...\n');

  try {
    const results = await runDoctorChecks(projectPath);
    printDoctorResults(results);

    const hasErrors = results.some(r => r.status === 'error');
    if (hasErrors) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Doctor check failed:', error);
    process.exit(1);
  }
}

program
  .command('init')
  .description('Initialize a new n8n-ready project')
  .argument('<project-name>', 'Name of the project to create')
  .option('--profile <profile>', 'Environment profile (local or prod)', 'local')
  .action(initProject);

program
  .command('doctor')
  .description('Check system requirements and configuration')
  .option('--path <path>', 'Path to n8n-ready project directory for additional checks')
  .action(doctorCommand);

program
  .command('up')
  .description('Start n8n services using Docker Compose')
  .action(() => composeUp());

program
  .command('down')
  .description('Stop n8n services using Docker Compose')
  .action(() => composeDown());

program.parse();