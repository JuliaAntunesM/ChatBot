# 🚀 Como colocar o ChatBot na nuvem (Railway)

> Siga cada passo com calma. Você só precisa fazer isso **uma única vez**.
> Depois disso, o bot fica rodando 24h por dia, mesmo com o computador desligado.

---

## PASSO 1 — Criar conta no GitHub (gratuito)

O GitHub é onde o código do seu bot vai ficar guardado na internet.

1. Acesse: **https://github.com**
2. Clique em **"Sign up"** (canto superior direito)
3. Crie uma conta com seu e-mail
4. Confirme o e-mail

---

## PASSO 2 — Criar um repositório no GitHub

1. Após fazer login no GitHub, clique no **"+"** no canto superior direito
2. Clique em **"New repository"**
3. Em **"Repository name"** digite: `chatbot-nataliafit`
4. Deixe marcado como **"Private"** (privado)
5. Clique em **"Create repository"**
6. Na próxima tela, copie o endereço do repositório (algo como `https://github.com/SEU_USUARIO/chatbot-nataliafit.git`)

---

## PASSO 3 — Enviar o código para o GitHub

Abra o terminal (PowerShell) dentro da pasta do projeto e execute os comandos abaixo **um por um**:

```
git init
git add .
git commit -m "primeiro envio"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/chatbot-nataliafit.git
git push -u origin main
```

> ⚠️ Substitua `SEU_USUARIO` pelo seu usuário do GitHub

---

## PASSO 4 — Criar conta no Railway (gratuito)

1. Acesse: **https://railway.app**
2. Clique em **"Login"** → **"Login with GitHub"**
3. Autorize o Railway a acessar sua conta GitHub

---

## PASSO 5 — Criar o projeto no Railway

1. No Railway, clique em **"New Project"**
2. Clique em **"Deploy from GitHub repo"**
3. Selecione o repositório `chatbot-nataliafit`
4. O Railway vai detectar o Dockerfile e começar a instalar tudo automaticamente
5. Aguarde alguns minutos até aparecer **"Active"** em verde

---

## PASSO 6 — Abrir o Dashboard e escanear o QR Code

1. No Railway, clique no seu projeto
2. Clique em **"Settings"** → **"Networking"** → **"Generate Domain"**
3. Copie o endereço gerado (algo como `https://chatbot-nataliafit-xxx.up.railway.app`)
4. Abra esse endereço no seu navegador
5. Clique na aba **"📱 Conexão"**
6. O QR Code vai aparecer — escaneie com seu WhatsApp
7. Pronto! O bot está conectado e rodando na nuvem 🎉

---

## ✅ Após conectar

- O bot fica **ativo 24h por dia**, mesmo com o PC desligado
- Para editar as mensagens, acesse o endereço do Railway no navegador
- Faça as alterações no Dashboard e clique em **"💾 Salvar Alterações"**

---

## ❓ Dúvidas frequentes

**O QR Code expirou antes de eu escanear?**
Recarregue a aba "Conexão" no Dashboard — um novo QR Code será gerado.

**O bot parou de funcionar?**
Acesse o Railway, veja se o serviço está "Active". Se não estiver, clique em "Restart".

**Preciso reconectar o WhatsApp toda vez?**
Não! O Railway salva a sessão. Só precisa escanear o QR Code uma vez.
