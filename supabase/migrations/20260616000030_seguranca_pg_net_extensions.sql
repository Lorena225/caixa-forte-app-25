-- Move pg_net para o schema extensions (advisor: extension_in_public).
-- pg_net não suporta SET SCHEMA; como 0 funções usam net.http*, drop+recreate
-- no schema correto é seguro e elimina o aviso.
DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
