# Limpar atividades e analistas

## Resultado
- Preservar a conta Master `admin01`, seu perfil de Gestão e as configurações da plataforma.
- Excluir permanentemente as 3 atividades existentes.
- Excluir permanentemente as 2 contas de analistas, seus perfis e permissões.
- Remover registros e arquivos de fotos vinculados às atividades; atualmente não há fotos registradas.

## Execução segura
1. Confirmar novamente que existe exatamente um perfil Master `admin01` antes da exclusão.
2. Excluir as atividades e seus registros relacionados.
3. Excluir as contas de acesso dos analistas; as regras de relacionamento removerão seus perfis e permissões.
4. Conferir que o banco ficou sem atividades e analistas, mantendo somente o Master.
5. Verificar que o login do Master continua disponível.

## Observação técnica
A estrutura das tabelas, regras de acesso, armazenamento e código da plataforma não será alterada. A operação afetará somente os dados atuais e não poderá ser desfeita.
