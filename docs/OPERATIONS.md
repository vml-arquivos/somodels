# Operações: backup, migration e rollback

## Backup antes de migration

Não execute migration em produção sem um backup lógico consistente do banco compatível e sem confirmar onde o arquivo foi armazenado. Para MySQL 8/TiDB, a referência operacional é `mysqldump --single-transaction --routines --triggers --events --hex-blob --set-gtid-purged=OFF "$DATABASE_URL" > /secure/backups/somodels-YYYYMMDD-HHMM.sql`. O caminho deve ficar fora do repositório e a senha deve ser lida pelo mecanismo seguro do Coolify, nunca pela linha de comando visível.

A validação mínima é listar o arquivo, calcular seu hash SHA-256 e restaurar em um banco descartável isolado usando `mysql` sem tocar no banco de produção. Registre somente data, tamanho, hash e resultado de restauração. A aplicação não deve armazenar documentos brutos de identidade, biometria ou dados desnecessários.

## Migrations

As migrations são forward-only. A migration `0002_certain_carlie_cooper.sql` cria as tabelas novas, amplia papéis e campos de autenticação e preenche `profile_media.storageHash` antes de torná-lo obrigatório. Em produção, execute uma vez, aguarde término e valide tabelas, índices e contagem de linhas. Não use `DROP`, `TRUNCATE`, reset de schema ou sincronização destrutiva.

## Rollback

O rollback de aplicação é feito no Coolify para o último SHA saudável, sem desfazer automaticamente migrations. Como a migration é expansiva e compatível com a versão anterior, o código anterior deve continuar funcionando enquanto a causa é investigada. Se uma migration falhar, pare o deploy, preserve logs e restaure o backup somente após avaliar impacto e confirmar autorização explícita para essa ação.

## Incidente

Em caso de healthcheck 503, erro de conexão, exposição de mídia ou suspeita de credencial, mantenha `PUBLIC_ACCESS_ENABLED=false`, desative pagamentos e KYC se necessário, revogue sessões locais e preserve a evidência mínima. Não publique segredos em tickets, commits, logs ou screenshots. Após a correção, execute os smoke tests e confirme que o SHA do container coincide com o SHA aprovado.
