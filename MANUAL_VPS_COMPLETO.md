
# 🚀 Guia Definitivo: Instalação FaceFind na sua VPS

Este guia assume que você tem uma VPS com **Ubuntu 22.04 LTS** limpa.

## 1. Preparação do Terreno (SSH)
Acesse sua VPS via terminal:
```bash
ssh root@seu-ip-da-vps
```

Atualize o sistema e instale as ferramentas básicas:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install git curl nginx -y
```

## 2. Instalação do Docker (Obrigatório)
O motor de IA (CompreFace) e opcionalmente o banco rodam via Docker.
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

## 3. Instalando o Motor de IA (CompreFace)
O CompreFace é o que faz o reconhecimento facial ser profissional.
```bash
mkdir ~/ia-motor && cd ~/ia-motor
# Baixa o instalador oficial
wget -qO- https://raw.githubusercontent.com/exadel-inc/CompreFace/master/install.sh | bash
```
> **Aguarde:** Isso vai baixar cerca de 2GB de imagens. Quando terminar, o painel da IA estará em `http://seu-ip:8000`.

## 4. Configurando o Banco de Dados (Supabase)
### Opção A: Supabase Cloud (Recomendado/Grátis)
Crie uma conta em `supabase.com`, crie um projeto e anote a **URL** e a **Anon Key**.
### Opção B: Self-Hosted (Avançado)
Se quiser rodar o Supabase na VPS também, siga o guia oficial do Supabase Docker, mas note que ele consome muita RAM (+4GB).

**IMPORTANTE:** Você precisa criar 3 tabelas no seu banco (SQL Editor do Supabase):
```sql
-- Tabela de Eventos
create table events (
  id uuid primary key,
  name text,
  date date,
  coverImage text,
  password text,
  createdAt bigint,
  createdBy uuid
);

-- Tabela de Fotos
create table photos (
  id uuid primary key,
  eventId uuid references events(id) on delete cascade,
  src text,
  original text,
  createdAt bigint
);

-- Tabela de Fotógrafos
create table users (
  id uuid primary key,
  name text,
  username text unique,
  password text,
  createdAt bigint
);

-- Tabela de Configurações
create table settings (
  key text primary key,
  value text
);
```

## 5. Subindo o Frontend (Seu Site)
No seu computador local (onde você está desenvolvendo):
```bash
npm run build
```
Isso vai gerar a pasta `dist`. Envie essa pasta para a VPS:
```bash
# Execute isso no seu computador, não na VPS
scp -r dist/* root@seu-ip-da-vps:/var/www/html/
```

## 6. Configurando o Servidor Web (Nginx)
Na VPS, crie o arquivo de configuração:
```bash
sudo nano /etc/nginx/sites-available/facefind
```
Cole este conteúdo (ajuste o domínio se tiver):
```nginx
server {
    listen 80;
    server_name seu-ip-ou-dominio.com;

    location / {
        root /var/www/html;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Proxy para evitar erro de CORS na IA
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/api/v1/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
Ative a config e reinicie o Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/facefind /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl restart nginx
```

## 7. Configuração Final no Painel Admin
1. Acesse `http://seu-ip/admin`.
2. Login: `admin` | Senha: `123`.
3. Vá em **Configurações**.
4. Insira as chaves do Supabase.
5. Em IA, coloque a URL `http://seu-ip:8000` e a API Key do CompreFace (que você cria acessando o IP na porta 8000).

## 8. HTTPS Grátis (Certbot)
Se você tiver um domínio apontado:
```bash
sudo apt install python3-certbot-nginx -y
sudo certbot --nginx -d seu-dominio.com
```

---
**DÚVIDAS FREQUENTES:**
- **Erro 502 no Nginx?** Verifique se o Docker do CompreFace subiu (`docker ps`).
- **Fotos não aparecem?** Verifique se criou o Bucket chamado `images` no Storage do Supabase e deixou como **Public**.
- **Não deleta fotógrafo?** Verifique se o login que você está usando é o `admin` master.
