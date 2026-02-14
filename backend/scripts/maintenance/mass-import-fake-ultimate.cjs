const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const { fakerPT_BR: faker } = require("@faker-js/faker");

// --- CARREGAR VARIÁVEIS DE AMBIENTE ---
const envPath = path.resolve(process.cwd(), ".env");
const envLines = fs.readFileSync(envPath, "utf8").split("\n");
const env = {};
envLines.forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    const value = valueParts.join("=").trim().replace(/"/g, "");
    env[key.trim()] = value;
  }
});

const client = new Client({ connectionString: env.DATABASE_URL });

async function main() {
  await client.connect();
  const projectId = "0d6675ac-16d2-428b-9127-2de7a4398d0b";

  // 1. Detectar colunas REAIS (Information schema retorna lowercase)
  async function findCol(table, possibilities) {
    const res = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = $1",
      [table],
    );
    const available = res.rows.map((r) => r.column_name.toLowerCase());
    for (let p of possibilities) {
      if (available.includes(p.toLowerCase())) {
        // Retornamos o nome exato que o Postgres pode estar esperando se for camelCase (com aspas)
        // Mas o query do postgres via information schema retorna o nome sem aspas
        // Vamos tentar casar o caso original.
        const actual = res.rows.find(
          (r) => r.column_name.toLowerCase() === p.toLowerCase(),
        ).column_name;
        return actual;
      }
    }
    return possibilities[0];
  }

  const c_comp = await findCol("projects", [
    "company_id",
    "companyId",
    "companyid",
  ]);
  const c_site = await findCol("projects", ["site_id", "siteId", "siteid"]);
  const t_site = await findCol("teams", ["site_id", "siteId", "siteid"]);
  const t_comp = await findCol("teams", [
    "company_id",
    "companyId",
    "companyid",
  ]);
  const u_reg = await findCol("users", [
    "registration_number",
    "registrationNumber",
  ]);
  const u_proj = await findCol("users", ["project_id", "projectId"]);
  const u_comp = await findCol("users", ["company_id", "companyId"]);
  const u_site = await findCol("users", ["site_id", "siteId"]);

  console.log(
    `Colunas detectadas: Project(${c_comp}, ${c_site}), Team(${t_site}), User(${u_reg})`,
  );

  // 2. Metadados do Projeto
  const resProj = await client.query(
    `SELECT "${c_comp}", "${c_site}" FROM projects WHERE id = $1`,
    [projectId],
  );
  const companyIdValue = resProj.rows[0][c_comp];
  const siteIdValue = resProj.rows[0][c_site];

  // 3. Extrair dados
  const files = [1, 2, 3, 4, 5, 6, 7];
  let allEmployeesRaw = [];
  for (const f of files) {
    const filePath = path.resolve(process.cwd(), `prisma/data-real-${f}.ts`);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    const regex = /{ nGeral: \d+.*desc: "([^"]+)".*funcao: "([^"]+)"/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      allEmployeesRaw.push({ teamName: match[1] });
    }
  }

  // 4. Equipes
  const uniqueTeams = [...new Set(allEmployeesRaw.map((e) => e.teamName))];
  const teamMap = {};
  for (const tName of uniqueTeams) {
    const res = await client.query(
      `INSERT INTO teams (name, "${t_site}", "${t_comp}") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id`,
      [tName, siteIdValue, companyIdValue],
    );
    if (res.rows.length > 0) {
      teamMap[tName] = res.rows[0].id;
    } else {
      const existing = await client.query(
        `SELECT id FROM teams WHERE name = $1 AND "${t_site}" = $2`,
        [tName, siteIdValue],
      );
      teamMap[tName] = existing.rows[0].id;
    }
  }

  // 5. Funcionários Fictícios
  console.log("Anonimizando...");
  let count = 0;
  for (const emp of allEmployeesRaw) {
    try {
      const fakeName = faker.person.fullName().toUpperCase();
      const fakeEmail = faker.internet
        .email({
          firstName: fakeName.split(" ")[0],
          lastName: `f${count}${Date.now()}`,
        })
        .toLowerCase();
      const fakeReg = "F" + (200000 + count);
      const fakeCpf = faker.string.numeric(11);

      const resUser = await client.query(
        `INSERT INTO users (email, name, role, status, "${u_reg}", cpf, "${u_comp}", "${u_proj}", "${u_site}") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id`,
        [
          fakeEmail,
          fakeName,
          "WORKER",
          "ACTIVE",
          fakeReg,
          fakeCpf,
          companyIdValue,
          projectId,
          siteIdValue,
        ],
      );
      const uId = resUser.rows[0].id;
      await client.query(
        `INSERT INTO team_members (team_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [teamMap[emp.teamName], uId],
      );
      count++;
      if (count % 100 === 0) console.log(`Progresso: ${count}...`);
    } catch (e) {
      console.error(`Erro registro ${count}:`, e.message);
    }
  }

  console.log(`\nImportação Fictícia Finalizada!`);
  console.log(`${count} funcionários criados.`);
}

main()
  .catch((e) => console.error(e))
  .finally(() => client.end());
