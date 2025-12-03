# App Inspecao

Aplicacao fullstack para controle de inspecoes, com frontend em React/Vite e API em Express integrando com MySQL. Em producao, o servidor Express entrega a API e tambem os arquivos gerados em `dist/`.

## Requisitos
- Node.js 20+ e npm
- Instancia MySQL acessivel (credenciais via variaveis de ambiente)

## Configuracao
1. Crie um `.env` na raiz (nao commitar). Exemplo de chaves:
   ```env
   NODE_ENV=development
   API_PORT=3500
   STORAGE_DRIVER=local
   VITE_API_BASE=http://localhost:3500/api
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=seu_usuario
   DB_PASSWORD=sua_senha
   DB_NAME=inspection_db
   ```
2. Instale dependencias: `npm install`.

## Scripts
- `npm run dev`: API e frontend juntos (hot reload).
- `npm run dev:server` / `npm run dev:client`: iniciam API e frontend separadamente.
- `npm run build`: gera o frontend em `dist/`.
- `npm start`: inicia o Express servindo API e, em producao, os arquivos de `dist/`.
- `npm run lint`: analise estatica.

## Como rodar
- Desenvolvimento: `npm run dev` (API em `http://localhost:3500`, frontend em `http://localhost:5173` por padrao).
- Producao: `npm run build` e depois `npm start` ou `pm2 start ecosystem.config.cjs` (PM2 usa as variaveis definidas no arquivo).

## Estrutura
- `src/`: componentes, paginas e estilos do frontend.
- `src/server/`: API Express, rotas, controllers e conexao MySQL.
- `uploads/`: arquivos salvos quando `STORAGE_DRIVER=local` (fora do versionamento).
- `dist/`: build do frontend (fora do versionamento).

## Boas praticas
- Nao commitar `.env` ou credenciais; use variaveis de ambiente.
- Mantenha `package-lock.json` para reprodutibilidade.
- Limpe dados sensiveis de seeds/dumps antes de compartilhar.
