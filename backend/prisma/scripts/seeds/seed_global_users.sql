-- Inserção de usuários mestres Gestão Global
-- Juliano Freitas
INSERT INTO "users" ("id", "name", "created_at", "updated_at")
VALUES ('cmlclts6n0000qcw8lt33kopx', 'Juliano Freitas', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = NOW();

INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_cmlclts6n0000qcw8lt33kopx', 'cmlclts6n0000qcw8lt33kopx', 'juliano@gestaovirtual.com', '$2a$10$I5IAYCJuF3AY.Oed/DriWOottOlNGsqxi.Kpnp8w1TqzIEWnjEopi', 'SUPER_ADMIN_GOD', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role", "updated_at" = NOW();

-- Socio
INSERT INTO "users" ("id", "name", "created_at", "updated_at")
VALUES ('cmlclts720001qcw8adkek84h', 'Socio (Gestão Global)', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = NOW();

INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_cmlclts720001qcw8adkek84h', 'cmlclts720001qcw8adkek84h', 'socio@gestaovirtual.com', '$2a$10$I5IAYCJuF3AY.Oed/DriWOottOlNGsqxi.Kpnp8w1TqzIEWnjEopi', 'SOCIO_DIRETOR', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role", "updated_at" = NOW();

-- Admin
INSERT INTO "users" ("id", "name", "created_at", "updated_at")
VALUES ('cmlclts7t0002qcw86wo8skn5', 'Admin (Gestão Global)', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = NOW();

INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_cmlclts7t0002qcw86wo8skn5', 'cmlclts7t0002qcw86wo8skn5', 'admin@gestaovirtual.com', '$2a$12$ElBnrtRGHWu/J1QdDbgwKu9z2ByVAm4z.6h8nVWiHHpwBRe9oTbKy', 'ADMIN', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role", "updated_at" = NOW();

-- TI Software
INSERT INTO "users" ("id", "name", "created_at", "updated_at")
VALUES ('cmlclts850003qcw8z3gsgums', 'Suporte Técnico (Gestão Global)', NOW(), NOW())
ON CONFLICT ("id") DO UPDATE SET "name" = EXCLUDED."name", "updated_at" = NOW();

INSERT INTO "auth_credentials" ("id", "user_id", "email", "password", "role", "status", "created_at", "updated_at")
VALUES ('auth_cmlclts850003qcw8z3gsgums', 'cmlclts850003qcw8z3gsgums', 'ti@gestaovirtual.com', '$2a$10$I5IAYCJuF3AY.Oed/DriWOottOlNGsqxi.Kpnp8w1TqzIEWnjEopi', 'TI_SOFTWARE', 'ACTIVE', NOW(), NOW())
ON CONFLICT ("email") DO UPDATE SET "password" = EXCLUDED."password", "role" = EXCLUDED."role", "updated_at" = NOW();
