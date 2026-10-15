# Painel privado no celular

Esta versão usa o servidor com login e SQLite do dashboard, com uma nova interface em `/mobile/`. As planilhas, contas, senhas, banco e valores reais não fazem parte do repositório publicado. O site de demonstração no GitHub Pages permanece independente.

## Hospedar pelo celular

1. Crie sua conta em https://render.com e conecte o GitHub.
2. No painel Render escolha **New > Blueprint**, repositório **planoaadm2-prog/Test**, branch **mobile-privado**. O arquivo `render.yaml` prepara o serviço Node com disco persistente de 1 GB e HTTPS.
3. Confira os preços mostrados pelo Render para o plano Starter e o disco antes de contratar. Esta configuração usa recursos pagos. Não use disco temporário para o banco financeiro.
4. Depois de o deploy terminar, abra o endereço HTTPS exibido pelo Render e acrescente `/mobile/`.
5. Na seção **Environment** do serviço, copie o valor gerado de `DASHBOARD_SETUP_TOKEN`. Use-o apenas no formulário inicial do seu site. Não envie essa chave em prints, mensagens nem ao GitHub.
6. Escolha um usuário sem espaços e uma senha com pelo menos 12 caracteres. Não há senha padrão. A configuração inicial deixa de funcionar assim que existe administrador; depois remova `DASHBOARD_SETUP_TOKEN` do serviço.
7. Entre, toque **Importar arquivos e administrar**, selecione outubro/2026, importe a planilha principal e depois a Hermanos, confira e confirme cada importação. Use a mesma base atual da sua instalação; arquivos enviados nesta conversa não são transferidos automaticamente à hospedagem.
8. Volte a `/mobile/` e toque **Atualizar**. Os dois painéis usam o mesmo banco no servidor hospedado. O painel antigo no Windows só sincroniza se também passar a acessar este servidor; não existe sincronização automática entre dois bancos distintos.

Alternativa para migrar sua instalação: no painel Windows exporte o backup como administrador; no painel hospedado restaure esse backup após conferir a prévia. Isso preserva histórico e arquivos, sem migrar senhas. A conta administrativa da hospedagem é independente.

## Segurança e conservação

Dados financeiros são retornados apenas depois do login. A API mobile não entrega histórico, documentos ou arquivos Excel. O navegador não grava os dados em localStorage, sessionStorage ou service worker; respostas financeiras usam `Cache-Control: no-store`. Ao sair ou ocultar o aplicativo, a tela limpa os dados em memória. Uma falha de conexão durante a atualização também limpa a tela. A versão privada exige conexão; a demonstração continua funcionando independentemente.

Banco, usuários, arquivos originais e histórico ficam em `/var/data/convenios`. Preserve esse disco nas atualizações, mantenha uma instância e exporte backups periodicamente no menu administrativo. Não exclua o serviço/disco sem backup. Persistência não substitui backup.

O build da hospedagem instala SheetJS 0.20.3 da distribuição oficial antes de compilar e testar. Se esse download ou qualquer teste falhar, a construção para. O ambiente local da conversa tem bloqueio de rede ao CDN oficial; a validação local inicial usou o leitor já instalado. A execução do build com o leitor corrigido precisa ser confirmada nos logs da hospedagem.

## Desenvolvimento

Node.js 24+. O dashboard existente continua em `/`; a interface mobile fica em `/mobile/`. `npm run build` copia `public/mobile` para `dist/mobile`. `npm test` cobre os fluxos de autenticação, importação mensal, histórico e proteção da API mobile com banco temporário.

Para criar administrador localmente continua disponível `npm run setup-admin`. O cadastro inicial pelo navegador só é habilitado quando `DASHBOARD_SETUP_TOKEN` tem pelo menos 32 caracteres e ainda não há administrador. Não crie contas de teste no banco real.
