# 🚀 Guia Completo: Instalação no Coolify

Este guia explica como subir toda a estrutura do FaceFind (Frontend + IA) utilizando o seu servidor com **Coolify**.

---

## 1. Instalando o Exadel CompreFace (O Motor de IA)

O CompreFace é composto por vários serviços. No Coolify, a melhor forma de instalá-lo é via **Docker Compose**.

### Passos:
1. No painel do **Coolify**, clique em **+ New Resource**.
2. Selecione **Docker Compose**.
3. Dê um nome (ex: `compreface-ai`).
4. No campo de configuração, cole o conteúdo oficial do arquivo `docker-compose.yml` do CompreFace.
   - *Nota: Você pode encontrar o conteúdo atualizado em: [Exadel CompreFace GitHub](https://github.com/exadel-inc/CompreFace/blob/master/docker-compose.yml)*
5. **Dica de Performance:** No arquivo colado, procure por `compreface-core` e certifique-se de que ele não tenha limites de CPU muito baixos, pois ele faz o trabalho pesado.
6. Clique em **Deploy**.

### Configurando o CompreFace:
1. Após o deploy, acesse a URL gerada pelo Coolify (ou `http://IP-DO-SERVIDOR:8000`).
2. Crie sua conta de administrador.
3. Crie uma **Application**.
4. Dentro da aplicação, crie um **Verification Service**.
5. Copie a **API Key** gerada. Você precisará dela no painel Admin do FaceFind.

---

## 2. Instalando o Frontend (FaceFind)

Como o seu projeto está no GitHub e você usa Vite:

### Passos:
1. No **Coolify**, clique em **+ New Resource**.
2. Selecione **Public Repository** (ou Private, se for o caso).
3. Cole a URL do seu repositório GitHub.
4. O Coolify detectará automaticamente as configurações de build:
   - **Build Command:** `npm run build` ou `yarn build`
   - **Install Command:** `npm install`
   - **Static Directory:** `dist`
5. **Configurações de Rede:** 
   - Se o Coolify pedir a porta, use a **3000** (padrão do Vite dev) ou certifique-se de que o deploy seja como **Static Site**.

---

## 3. Conectando as Pontas (Admin)

1. Acesse o seu site instalado.
2. Vá em `/admin` (Senha padrão `admin` / `123` se não alterou no Supabase).
3. Clique na aba **Configurações de IA**.
4. Selecione **Exadel CompreFace**.
5. **URL:** Use o domínio ou IP que o Coolify gerou para o serviço `compreface-ui` (Ex: `https://ai.seudominio.com`).
6. **API Key:** Cole a chave do Verification Service.
7. Clique em **Salvar**.

---

## 4. Resolvendo Problemas de CORS

Se o site não conseguir falar com a IA, o navegador pode estar bloqueando por CORS.
No Coolify, na aba de configurações do serviço CompreFace, você pode precisar adicionar Headers customizados no Proxy:
`Access-Control-Allow-Origin: *`

---

## 5. Variáveis de Ambiente (Opcional)

Se preferir não usar o painel Admin para o banco de dados, você pode configurar as variáveis no Coolify:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
