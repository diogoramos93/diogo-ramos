
# Guia de Instalação - Exadel CompreFace (Docker)

Para usar o reconhecimento facial profissional no FaceFind, você deve instalar o CompreFace no seu servidor (VPS).

## 1. Requisitos do Servidor
- **SO:** Ubuntu 20.04 ou superior.
- **RAM:** No mínimo 4GB (Recomendado 8GB).
- **Docker e Docker Compose** instalados.

## 2. Instalando o CompreFace via Terminal (SSH)

Acesse seu servidor e rode os comandos:

```bash
# Criar pasta do projeto
mkdir compreface && cd compreface

# Baixar o arquivo oficial de instalação
wget -qO- https://raw.githubusercontent.com/exadel-inc/CompreFace/master/install.sh | bash
```

O script vai baixar todas as imagens do Docker (aprox. 2GB) e iniciar o sistema.

## 3. Acessando e Configurando o Painel
1. No navegador, acesse: `http://seu-ip:8000`.
2. Crie sua conta de administrador.
3. Crie uma nova **Application** (ex: "FaceFind Galeria").
4. Dentro da aplicação, crie um **Verification Service**.
5. Copie a **API Key** gerada para esse serviço.

## 4. Configurando no FaceFind Admin
1. Vá no painel Admin do FaceFind (seu site).
2. Clique em **Configurações de IA**.
3. Selecione o provedor **Exadel CompreFace**.
4. No campo **URL**, coloque o endereço do seu servidor (ex: `http://62.72.11.108:8000`).
5. No campo **API Key**, cole a chave que você copiou do painel do CompreFace.
6. Clique em **Salvar**.

## 5. Dica Pro: Reverse Proxy (aaPanel)
Se você usa o aaPanel:
1. Vá em **Website** -> Adicionar site (crie um subdomínio como `api.seudominio.com`).
2. Clique no site criado -> **Reverse Proxy**.
3. Target URL: `http://127.0.0.1:8000`.
4. Isso permite que o site acesse a API via HTTPS e evita erros de CORS.
