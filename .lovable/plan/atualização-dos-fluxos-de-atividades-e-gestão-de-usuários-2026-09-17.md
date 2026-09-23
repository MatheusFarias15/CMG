# Atualização dos fluxos de atividades e gestão de usuários

## Resultado esperado
- Manter os cards de atividades navegáveis e tornar a conclusão de tarefas clara para o analista.
- Garantir no banco que analistas leiam e atualizem somente atividades atribuídas a eles, incluindo registros e evidências.
- Adicionar uma tela exclusiva de Gestão para listar e cadastrar usuários.
- Remover completamente o cadastro público da tela de acesso.

## Implementação
1. **Atividades do analista**
   - Confirmar e preservar a navegação de cada card para o detalhe da atividade.
   - Destacar a ação “Concluir atividade” e manter a validação dos campos obrigatórios antes da conclusão.
   - Exibir erros de leitura, salvamento e evidências de forma clara, sem deixar a tela em estado incorreto.

2. **Permissões do banco**
   - Aplicar uma migração idempotente para reafirmar as regras de leitura e atualização das atividades atribuídas ao analista e o acesso global da Gestão.
   - Manter a criação e exclusão de atividades restritas à Gestão.
   - Manter fotos e registros vinculados às mesmas regras de propriedade da atividade.

3. **Gestão de Usuários**
   - Criar a rota protegida `/usuarios`, disponível no menu apenas para Gestão.
   - Listar Nome, ID da Empresa, Data de Nascimento e Cargo combinando `profiles` e `user_roles`.
   - Adicionar um modal “Novo Usuário” com Nome, ID da Empresa, Data de Nascimento, Cargo e Senha Inicial.
   - Criar uma função protegida no servidor que valide a sessão e a role Gestão antes de usar o acesso administrativo para criar a conta e gravar perfil/cargo.
   - Tratar duplicidade e desfazer a conta caso a gravação do perfil ou cargo falhe.

4. **Acesso público**
   - Remover a aba e o formulário “Cadastrar” da página inicial.
   - Remover a função pública de cadastro; a recuperação de senha e o login permanecem.
   - Impedir que funções administrativas públicas criem contas sem autenticação.

## Validação
- Conferir a compilação e os avisos de segurança do banco.
- Testar como Gestão: abrir a lista de usuários, cadastrar um usuário e confirmar sua presença na tabela.
- Testar como Analista: ver apenas atividades atribuídas, abrir o card, salvar dados/evidências e concluir a atividade.
- Confirmar que um analista não abre `/usuarios` e não consegue chamar diretamente a criação administrativa.
- Confirmar que a tela pública não oferece cadastro.

## Observação técnica
A criação de usuários usará uma função de servidor autenticada. Primeiro ela confirma a role `gestao` usando as permissões normais do usuário; somente depois carrega a credencial administrativa no servidor. Nenhuma senha ou chave privada será enviada para a listagem ou incorporada ao navegador.
