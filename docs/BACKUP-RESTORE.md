# Backup e restauração do banco

## Backup diário
No Coolify, use o recurso de backup agendado do banco (diário, retenção de 14 dias, destino S3 ou outro disco). Se preferir manual:

```bash
mysqldump --single-transaction --routines --triggers \
  -h HOST -u USUARIO -p NOME_DO_BANCO | gzip > backup-$(date +%F).sql.gz
```

Faça um backup antes de cada deploy que tenha migration nova.

## Teste de restauração (uma vez por mês)
```bash
gunzip -c backup-AAAA-MM-DD.sql.gz | mysql -h HOST_DE_TESTE -u USUARIO -p BANCO_DE_TESTE
```
Suba um ambiente de teste apontando para esse banco e confira `/healthz` (`database: true`). Backup que nunca foi restaurado não é garantia.

## Mídia
Os arquivos enviados ficam no armazenamento configurado (`STORAGE_*`). Ative versionamento ou cópia periódica do bucket.
