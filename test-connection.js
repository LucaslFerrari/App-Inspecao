import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function testConnection() {
  console.log("Testando conexão MySQL...");
  console.log(`Host: ${process.env.DB_HOST}`);
  console.log(`Porta: ${process.env.DB_PORT}`);
  console.log(`Usuário: ${process.env.DB_USER}`);
  console.log(`Banco: ${process.env.DB_NAME}`);
  console.log("");

  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 10000,
    });

    console.log("✅ Conexão bem-sucedida!");
    await connection.end();
  } catch (error) {
    console.error("❌ Erro na conexão:", error.message);
    console.error("Código:", error.code);
    console.error("\nPossíveis soluções:");
    console.error("1. Verifique se o MySQL está rodando em 192.168.0.206:3306");
    console.error("2. Verifique se as credenciais estão corretas");
    console.error("3. Verifique se o firewall não está bloqueando a porta 3306");
    console.error("4. Tente: mysql -h 192.206.0.126 -u usuario_inspection -p");
  }
}

testConnection();
