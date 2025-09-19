# n8n-ready 🚀

> **CLI tool to bootstrap self-hosted n8n environments in seconds**

[![npm version](https://badge.fury.io/js/n8n-ready.svg)](https://www.npmjs.com/package/@tiger440/n8n-ready)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

n8n-ready is a command-line tool that helps you quickly set up production-ready or development n8n instances with Docker Compose. No more manual configuration - get your workflow automation platform running in minutes with best practices baked in.

## ✨ Features

- 🎯 **Two optimized profiles**: Local development & Production deployment
- 🔒 **Security-first**: Production profile includes Caddy reverse proxy with automatic HTTPS
- 🔄 **Automatic backups**: Built-in PostgreSQL backup with retention policies
- 🩺 **Health checks**: System requirements validation with `doctor` command
- 📦 **Zero configuration**: Sensible defaults with easy customization
- 🐳 **Docker-based**: Consistent environments across development and production

## 🚀 Quick Start

### Installation

No installation required! Use npx to run directly:

```bash
npx n8n-ready init my-n8n-project
```

Or install globally:

```bash
npm install -g n8n-ready
```

### Basic Usage

```bash
# Create a new project
npx n8n-ready init my-project --profile local

# Enter the project directory
cd my-project

# Configure environment
cp .env.example .env
# Edit .env with your settings

# Check system requirements
n8n-ready doctor

# Start services
n8n-ready up

# Access n8n at http://localhost:5678
```

## 📋 Commands

### `init <project-name> [options]`

Initialize a new n8n-ready project.

```bash
npx n8n-ready init my-project --profile local   # Development setup
npx n8n-ready init my-project --profile prod    # Production setup
```

**Options:**
- `--profile <profile>`: Choose `local` or `prod` (default: `local`)

### `doctor [options]`

Check system requirements and configuration.

```bash
n8n-ready doctor                    # Basic system checks
n8n-ready doctor --path ./my-project # Project-specific checks
```

**Validates:**
- Docker and Docker Compose installation
- Port availability (80/443 for prod, 5678/5432/6379 for local)
- Domain DNS configuration (production only)
- Environment configuration

### `up`

Start n8n services using Docker Compose.

```bash
n8n-ready up
```

**Features:**
- Automatic Docker Compose detection (v2 vs legacy)
- Environment-specific information display
- Connection URLs and next steps

### `down`

Stop n8n services using Docker Compose.

```bash
n8n-ready down
```

**Safe shutdown:**
- Preserves all data in Docker volumes
- Graceful container shutdown
- Data persistence confirmation

## 🔧 Profiles

### 🛠️ Local Development Profile

Perfect for development, testing, and learning.

**Includes:**
- n8n + PostgreSQL + Redis
- Direct port mapping (localhost:5678)
- Development-friendly logging
- Optional authentication
- Database accessible on localhost:5432

**Use case:** Local development, testing workflows, learning n8n

### 🏭 Production Profile

Enterprise-ready deployment with security and reliability.

**Includes:**
- n8n + PostgreSQL + Redis + Caddy
- Automatic HTTPS with Let's Encrypt
- Reverse proxy with security headers
- Automatic database backups
- Health checks and monitoring
- Network isolation
- Rate limiting

**Use case:** Production deployments, staging environments, client projects

## 🌐 Production Deployment Guide

### Prerequisites

1. **VPS Requirements:**
   - 2+ GB RAM
   - 20+ GB disk space
   - Ubuntu 20.04+ or Debian 11+
   - Root or sudo access

2. **Domain Setup:**
   - Domain name pointing to your VPS IP
   - DNS A record: `your-domain.com` → `YOUR_VPS_IP`

### Step-by-Step Deployment

#### 1. Server Preparation

```bash
# Connect to your VPS
ssh root@YOUR_VPS_IP

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Node.js (for n8n-ready CLI)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Create application directory
mkdir -p /opt/n8n && cd /opt/n8n
```

#### 2. Project Initialization

```bash
# Create production project
npx n8n-ready init production --profile prod

# Enter project directory
cd production

# Configure environment
cp .env.example .env
nano .env  # Edit configuration (see below)
```

#### 3. Environment Configuration

Edit `.env` file with your production settings:

```bash
# Domain Configuration
N8N_HOST=your-domain.com
TIMEZONE=Europe/Paris

# Database (CHANGE THESE!)
POSTGRES_USER=n8n_user
POSTGRES_PASSWORD=your_super_strong_db_password_here
POSTGRES_DB=n8n_production

# Redis (CHANGE THIS!)
REDIS_PASSWORD=your_strong_redis_password_here

# n8n Security (CHANGE ALL!)
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your_admin_password_here
N8N_ENCRYPTION_KEY=$(openssl rand -hex 32)
N8N_JWT_SECRET=$(openssl rand -base64 32)
```

#### 4. System Validation

```bash
# Check system requirements
n8n-ready doctor

# Fix any issues before continuing
# Common fixes:
# - Open firewall: ufw allow 80,443/tcp
# - Check DNS: dig your-domain.com
```

#### 5. Deployment

```bash
# Start services
n8n-ready up

# Check service status
docker-compose ps

# View logs
docker-compose logs -f n8n
docker-compose logs -f caddy
```

#### 6. Access and Setup

1. **Access n8n**: Visit `https://your-domain.com`
2. **First login**: Use the basic auth credentials from your `.env`
3. **Setup n8n**: Create your n8n user account
4. **Test workflows**: Create a simple workflow to verify everything works

#### 7. Backup Setup (Recommended)

```bash
# Run manual backup
docker-compose --profile backup run --rm backup

# Setup automated backups (cron)
crontab -e
# Add: 0 2 * * * cd /opt/n8n/production && docker-compose --profile backup run --rm backup

# Setup off-site backup sync (example with rsync)
# 0 3 * * * rsync -av /opt/n8n/production/backups/ user@backup-server:/backups/n8n/
```

### Popular VPS Providers

#### Hetzner Cloud
```bash
# Create server (example)
hcloud server create --type cx21 --image ubuntu-22.04 --name n8n-server --ssh-key your-key

# Connect
ssh root@$(hcloud server ip n8n-server)
```

#### OVH Cloud
```bash
# Create server via OVH panel or API
# Choose: VPS SSD 1 (2GB RAM, 20GB SSD)
# OS: Ubuntu 22.04

# Connect
ssh ubuntu@YOUR_VPS_IP
```

#### DigitalOcean
```bash
# Create droplet (example with doctl)
doctl compute droplet create n8n-server --size s-1vcpu-2gb --image ubuntu-22-04-x64 --region fra1

# Connect
ssh root@YOUR_VPS_IP
```

## 🔒 Security Best Practices

### Production Security Checklist

- [ ] **Strong passwords**: Use 16+ character passwords with mixed case, numbers, symbols
- [ ] **Unique secrets**: Generate unique encryption keys and JWT secrets
- [ ] **Firewall**: Only open ports 80, 443, and 22 (SSH)
- [ ] **SSH keys**: Disable password authentication, use SSH keys only
- [ ] **Updates**: Regularly update Docker images and system packages
- [ ] **Backups**: Verify backups work and store off-site
- [ ] **Monitoring**: Set up log monitoring and alerts

### Environment Security

```bash
# Secure .env file
chmod 600 .env
chown root:root .env

# Regular security updates
apt update && apt upgrade -y
docker-compose pull && docker-compose up -d

# Monitor logs for suspicious activity
docker-compose logs --since=24h | grep -i "error\|failed\|unauthorized"
```

## 📊 Monitoring & Maintenance

### Health Monitoring

```bash
# Check service health
n8n-ready doctor --path /opt/n8n/production

# Monitor containers
docker-compose ps
docker stats

# Check logs
docker-compose logs -f --tail=100 n8n
docker-compose logs -f --tail=100 caddy
```

### Maintenance Tasks

```bash
# Weekly: Update containers
docker-compose pull && docker-compose up -d

# Monthly: Clean unused Docker resources
docker system prune -a

# Check backup integrity
ls -la backups/db/
# Test restore process on staging environment
```

## 🆘 Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Check what's using port 80/443
netstat -tlnp | grep ':80\|:443'
# Stop conflicting services or change ports
```

**SSL certificate issues:**
```bash
# Check Caddy logs
docker-compose logs caddy
# Verify DNS pointing to server
dig your-domain.com
```

**Database connection errors:**
```bash
# Check PostgreSQL logs
docker-compose logs postgres
# Verify credentials in .env
# Check network connectivity
docker-compose exec n8n ping postgres
```

**Permission issues:**
```bash
# Fix volume permissions
docker-compose down
sudo chown -R 1000:1000 ./
docker-compose up -d
```

### Getting Help

1. **Check logs**: `docker-compose logs service-name`
2. **Validate config**: `n8n-ready doctor --path .`
3. **Community**: [n8n Community Forum](https://community.n8n.io/)
4. **Documentation**: [n8n Documentation](https://docs.n8n.io/)

## 📚 Useful Links

### n8n Resources
- [📖 n8n Documentation](https://docs.n8n.io/)
- [🌐 n8n Community](https://community.n8n.io/)
- [🐙 n8n GitHub](https://github.com/n8n-io/n8n)
- [🎓 n8n Academy](https://docs.n8n.io/courses/)

### Docker Resources
- [🐳 Docker Documentation](https://docs.docker.com/)
- [📋 Docker Compose Reference](https://docs.docker.com/compose/)
- [🔧 Caddy Documentation](https://caddyserver.com/docs/)

### Infrastructure
- [☁️ Hetzner Cloud](https://www.hetzner.com/cloud)
- [🌐 OVH Cloud](https://www.ovhcloud.com/)
- [💧 DigitalOcean](https://www.digitalocean.com/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [n8n team](https://n8n.io/) for creating an amazing workflow automation platform
- [Docker](https://docker.com/) for containerization technology
- [Caddy](https://caddyserver.com/) for automatic HTTPS
- The open-source community for inspiration and tools

---

**Made with ❤️ for the n8n community**

*Get your n8n instance running in production with zero hassle!*
