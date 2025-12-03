// tools/hashPassword.mjs
import bcrypt from "bcryptjs";

const senha = process.argv[2];

if (!senha) {
  console.error("Uso: node tools/hashPassword.mjs SUA_SENHA_AQUI");
  process.exit(1);
}

const hash = await bcrypt.hash(senha, 10);
console.log("Hash gerado:");
console.log(hash);
