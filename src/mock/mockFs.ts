/**
 * Mock 文件系统。
 *
 * 模拟 `ls` / `cat` 等命令读取的假目录与文件内容。
 * 键为绝对路径（不含结尾斜杠），值为该目录下的条目。
 */

export interface MockEntry {
  type: "file" | "dir";
  /** 文件字节数，目录为固定值 */
  size: number;
  /** 最后修改时间，格式同 `ls -l` */
  modified: string;
  /** 文件正文，`cat` 时输出 */
  content?: string;
}

export type MockFs = Record<string, Record<string, MockEntry>>;

export const MOCK_FS: MockFs = {
  "/": {
    etc: { type: "dir", size: 4096, modified: "Aug 12 09:24" },
    home: { type: "dir", size: 4096, modified: "Aug 20 14:02" },
    opt: { type: "dir", size: 4096, modified: "Sep  3 11:47" },
    root: { type: "dir", size: 4096, modified: "Aug 20 14:05" },
    tmp: { type: "dir", size: 4096, modified: "Oct 21 16:38" },
    usr: { type: "dir", size: 4096, modified: "Jul 30 08:15" },
    var: { type: "dir", size: 4096, modified: "Oct 21 16:41" },
  },
  "/home": {
    deploy: { type: "dir", size: 4096, modified: "Oct 20 22:10" },
    ops: { type: "dir", size: 4096, modified: "Sep 18 10:33" },
    dba: { type: "dir", size: 4096, modified: "Oct 11 08:20" },
  },
  "/home/deploy": {
    ".bashrc": {
      type: "file",
      size: 3771,
      modified: "Aug 12 09:20",
      content: [
        "# ~/.bashrc: executed by bash(1) for non-login shells.",
        "",
        "export PS1='\\[\\e[32m\\]\\u@\\h\\[\\e[0m\\]:\\[\\e[34m\\]\\w\\[\\e[0m\\]\\$ '",
        "export LS_OPTIONS='--color=auto'",
        "alias ll='ls -alF'",
        "alias la='ls -A'",
        "alias l='ls -CF'",
        "",
        "# 常用别名",
        "alias gs='git status -sb'",
        "alias gco='git checkout'",
        "alias k='kubectl'",
        "",
      ].join("\n"),
    },
    "deploy.sh": {
      type: "file",
      size: 1842,
      modified: "Oct 19 17:55",
      content: [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        "",
        'APP_DIR="${APP_DIR:-/opt/app}"',
        'SERVICE_NAME="${SERVICE_NAME:-charlie-api}"',
        "",
        'echo "==> 部署目标: ${APP_DIR}"',
        'echo "==> 服务名称: ${SERVICE_NAME}"',
        "",
        "cd \"${APP_DIR}\"",
        "git fetch --all --tags",
        "git checkout \"${GIT_TAG:-main}\"",
        "npm ci --omit=dev",
        "npm run build",
        "",
        'echo "==> 重启服务"',
        "sudo systemctl restart \"${SERVICE_NAME}\"",
        "systemctl is-active --quiet \"${SERVICE_NAME}\" && echo '==> 部署完成' || echo '==> 部署失败'",
      ].join("\n"),
    },
    "notes.md": {
      type: "file",
      size: 640,
      modified: "Oct 18 09:31",
      content: [
        "# 运维笔记",
        "",
        "- 网关 10.20.0.11 的 nginx 日志在 `/var/log/nginx/error.log`",
        "- 数据库慢查询阈值 1s，超过即告警",
        "- 每周一凌晨 3 点做一次全量备份",
        "",
        "## 待办",
        "",
        "- [ ] 清理 `/var/log` 下 90 天前的归档",
        "- [ ] 把跳板机的 SSH 密钥轮换一遍",
      ].join("\n"),
    },
  },
  "/home/ops": {
    ".ssh": { type: "dir", size: 4096, modified: "Sep 18 10:33" },
    "runbook.md": {
      type: "file",
      size: 1520,
      modified: "Oct  2 13:18",
      content: [
        "# 故障处置手册",
        "",
        "## 1. 网关 5xx 激增",
        "",
        "```bash",
        "tail -n 200 /var/log/nginx/error.log",
        "systemctl status nginx",
        "```",
        "",
        "## 2. 磁盘打满",
        "",
        "```bash",
        "df -h",
        "du -sh /var/log/* | sort -h | tail",
        "```",
        "",
        "## 3. 服务起不来",
        "",
        "```bash",
        "journalctl -u charlie-api -n 200 --no-pager",
        "```",
      ].join("\n"),
    },
  },
  "/etc": {
    hosts: {
      type: "file",
      size: 312,
      modified: "Aug 02 10:00",
      content: [
        "127.0.0.1   localhost",
        "127.0.1.1   prod-gateway",
        "10.20.0.31  prod-db",
        "10.30.1.12  test-web",
        "",
        "::1         localhost ip6-localhost ip6-loopback",
      ].join("\n"),
    },
    nginx: { type: "dir", size: 4096, modified: "Oct 21 16:40" },
    systemd: { type: "dir", size: 4096, modified: "Sep 30 08:12" },
  },
  "/etc/nginx": {
    "nginx.conf": {
      type: "file",
      size: 2048,
      modified: "Oct 21 16:40",
      content: [
        "user www-data;",
        "worker_processes auto;",
        "",
        "events {",
        "    worker_connections 1024;",
        "}",
        "",
        "http {",
        "    include /etc/nginx/mime.types;",
        "    default_type application/octet-stream;",
        "    sendfile on;",
        "    keepalive_timeout 65;",
        "",
        "    server {",
        "        listen 80;",
        "        server_name prod-gateway;",
        "",
        "        location / {",
        "            proxy_pass http://127.0.0.1:8080;",
        "            proxy_set_header Host $host;",
        "            proxy_set_header X-Real-IP $remote_addr;",
        "            proxy_read_timeout 60s;",
        "        }",
        "    }",
        "}",
      ].join("\n"),
    },
    "sites-enabled": { type: "dir", size: 4096, modified: "Oct 21 16:40" },
  },
  "/etc/systemd": {
    system: { type: "dir", size: 4096, modified: "Sep 30 08:12" },
  },
  "/etc/systemd/system": {
    "charlie-api.service": {
      type: "file",
      size: 412,
      modified: "Sep 30 08:12",
      content: [
        "[Unit]",
        "Description=Charlie API Service",
        "After=network.target",
        "",
        "[Service]",
        "Type=simple",
        "User=deploy",
        "WorkingDirectory=/opt/app",
        "ExecStart=/usr/bin/node /opt/app/dist/main.js",
        "Restart=always",
        "RestartSec=3",
        "",
        "[Install]",
        "WantedBy=multi-user.target",
      ].join("\n"),
    },
  },
  "/opt": {
    app: { type: "dir", size: 4096, modified: "Oct 21 16:41" },
  },
  "/opt/app": {
    "dist": { type: "dir", size: 4096, modified: "Oct 21 16:41" },
    "logs": { type: "dir", size: 4096, modified: "Oct 21 16:41" },
    "package.json": {
      type: "file",
      size: 896,
      modified: "Oct 20 22:10",
      content: [
        "{",
        '  "name": "charlie-api",',
        '  "version": "2.4.1",',
        '  "private": true,',
        '  "scripts": {',
        '    "build": "tsc -p tsconfig.build.json",',
        '    "start": "node dist/main.js",',
        '    "test": "vitest run"',
        "  },",
        '  "dependencies": {',
        '    "fastify": "^5.2.0",',
        '    "ioredis": "^5.4.1"',
        "  }",
        "}",
      ].join("\n"),
    },
    "README.md": {
      type: "file",
      size: 1120,
      modified: "Oct 20 22:12",
      content: [
        "# charlie-api",
        "",
        "内部业务 API 服务，提供订单与用户相关的聚合接口。",
        "",
        "## 本地运行",
        "",
        "```bash",
        "npm install",
        "npm run dev",
        "```",
        "",
        "## 部署",
        "",
        "由 `/home/deploy/deploy.sh` 脚本驱动，发布到 `/opt/app` 后重启 `charlie-api` 服务。",
      ].join("\n"),
    },
    "docker-compose.yml": {
      type: "file",
      size: 640,
      modified: "Sep 28 15:04",
      content: [
        "services:",
        "  api:",
        "    image: registry.corp.internal/charlie-api:2.4.1",
        "    restart: unless-stopped",
        "    ports:",
        '      - "8080:8080"',
        "    environment:",
        '      - NODE_ENV=production',
        "    depends_on:",
        "      - redis",
        "  redis:",
        "    image: redis:7-alpine",
        "    restart: unless-stopped",
      ].join("\n"),
    },
  },
  "/var": {
    lib: { type: "dir", size: 4096, modified: "Aug 20 14:00" },
    log: { type: "dir", size: 4096, modified: "Oct 21 16:41" },
    www: { type: "dir", size: 4096, modified: "Oct 19 17:55" },
  },
  "/var/log": {
    nginx: { type: "dir", size: 4096, modified: "Oct 21 16:41" },
    "syslog": {
      type: "file",
      size: 24576,
      modified: "Oct 21 16:41",
      content: [
        "Oct 21 16:02:11 prod-gateway systemd[1]: Started charlie-api.service.",
        "Oct 21 16:02:11 prod-gateway node[2481]: listening on 0.0.0.0:8080",
        "Oct 21 16:18:44 prod-gateway kernel: [12345.678] TCP: request_sock_TCP: overflow",
        "Oct 21 16:31:02 prod-gateway nginx[1190]: reload signal received, reconfiguring",
        "Oct 21 16:41:09 prod-gateway systemd[1]: Starting Daily apt upgrade activities...",
      ].join("\n"),
    },
  },
  "/var/log/nginx": {
    "access.log": {
      type: "file",
      size: 81920,
      modified: "Oct 21 16:41",
      content: [
        '10.20.0.55 - - [21/Oct/2026:16:02:03 +0800] "GET /api/v1/orders?page=1 HTTP/1.1" 200 1284',
        '10.20.0.55 - - [21/Oct/2026:16:02:04 +0800] "GET /api/v1/users/me HTTP/1.1" 200 342',
        '10.30.1.12 - - [21/Oct/2026:16:02:11 +0800] "POST /api/v1/orders HTTP/1.1" 201 96',
        '10.20.0.88 - - [21/Oct/2026:16:03:55 +0800] "GET /api/v1/reports/daily HTTP/1.1" 502 153',
        '10.20.0.55 - - [21/Oct/2026:16:04:07 +0800] "GET /api/v1/orders?page=2 HTTP/1.1" 200 1301',
      ].join("\n"),
    },
    "error.log": {
      type: "file",
      size: 4096,
      modified: "Oct 21 16:38",
      content: [
        "2026/10/21 16:03:55 [error] 1182#1182: *41 upstream timed out (110: Connection timed out) while reading response header from upstream, client: 10.20.0.88, server: prod-gateway, request: \"GET /api/v1/reports/daily HTTP/1.1\", upstream: \"http://127.0.0.1:8080/api/v1/reports/daily\"",
        "2026/10/21 16:03:55 [warn] 1182#1182: *42 upstream server temporarily disabled while connecting to upstream, client: 10.20.0.88, server: prod-gateway, request: \"GET /api/v1/reports/daily HTTP/1.1\", upstream: \"http://127.0.0.1:8080/api/v1/reports/daily\"",
        "2026/10/21 16:18:44 [notice] 1180#1180: signal process started",
      ].join("\n"),
    },
  },
  "/var/www": {
    "index.html": {
      type: "file",
      size: 486,
      modified: "Oct 19 17:55",
      content: [
        "<!doctype html>",
        '<html lang="zh-CN">',
        "  <head>",
        "    <meta charset=\"UTF-8\" />",
        "    <title>Charlie</title>",
        "  </head>",
        "  <body>",
        "    <div id=\"root\"></div>",
        "  </body>",
        "</html>",
      ].join("\n"),
    },
  },
  "/root": {
    ".bash_history": {
      type: "file",
      size: 2048,
      modified: "Oct 21 15:22",
      content: [
        "systemctl status nginx",
        "tail -f /var/log/nginx/error.log",
        "df -h",
        "docker ps",
        "journalctl -u charlie-api -n 100 --no-pager",
      ].join("\n"),
    },
  },
  "/usr": {
    bin: { type: "dir", size: 4096, modified: "Jul 30 08:15" },
    lib: { type: "dir", size: 4096, modified: "Jul 30 08:15" },
    local: { type: "dir", size: 4096, modified: "Jul 30 08:15" },
  },
  "/usr/local": {
    bin: { type: "dir", size: 4096, modified: "Jul 30 08:15" },
    lib: { type: "dir", size: 4096, modified: "Jul 30 08:15" },
  },
  "/tmp": {},
  "/root/.ssh": {
    "authorized_keys": {
      type: "file",
      size: 512,
      modified: "Sep 18 10:33",
      content: ["ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI... deploy@ops-workstation"].join(
        "\n",
      ),
    },
  },
  "/home/ops/.ssh": {
    "config": {
      type: "file",
      size: 380,
      modified: "Sep 18 10:35",
      content: [
        "Host prod-gateway",
        "    HostName 10.20.0.11",
        "    User deploy",
        "    IdentityFile ~/.ssh/id_ed25519_prod",
        "",
        "Host prod-db",
        "    HostName 10.20.0.31",
        "    User dba",
        "    Port 22",
      ].join("\n"),
    },
  },
};

/** 用户名到家目录的映射 */
export const HOME_DIRS: Record<string, string> = {
  deploy: "/home/deploy",
  ops: "/home/ops",
  dba: "/home/dba",
  app: "/home/deploy",
  root: "/root",
};

/** 取用户的家目录，未知用户回退到 root */
export function homeDirFor(username: string): string {
  return HOME_DIRS[username] ?? HOME_DIRS.root ?? "/root";
}
