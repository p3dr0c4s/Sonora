# SONORA

Gestão musical pessoal para organizar instrumentos e acompanhar a rotina de estudos. O SONORA é uma aplicação web estática: não precisa de backend, conta ou dependências de terceiros, e mantém os dados no `localStorage` do navegador.

## Funcionalidades

- Cadastro e organização de instrumentos, com busca, filtros, estado de conservação e histórico de manutenção.
- Práticas livres ou planejadas, cronômetro com pausa e registro do conteúdo, dificuldades e anotações.
- Histórico de sessões com edição e exclusão.
- Metas semanais gerais e individuais por instrumento.
- Estatísticas diárias, semanais e mensais, instrumentos mais praticados e evolução das metas.
- Exportação de backup JSON e do histórico em CSV; restauração validada de backups.
- Interface responsiva em português.

## Como executar

Não há etapa de instalação nem processo de build. Com Python instalado, abra um terminal nesta pasta e execute:

```powershell
py -m http.server 8000
```

Depois, acesse <http://localhost:8000>. Para encerrar o servidor, pressione `Ctrl+C` no terminal. Também é possível abrir `index.html` diretamente, mas servir a pasta localmente tende a oferecer comportamento mais consistente entre navegadores.

## Dados e backups

Os dados ficam no armazenamento local do navegador e não são enviados a um servidor. Eles são vinculados ao perfil do navegador e à origem usada para abrir o app; não são sincronizados entre dispositivos ou navegadores. Limpar os dados do site pode apagá-los.

Faça backups periódicos pela seção **Dados**:

- **JSON** guarda instrumentos, sessões e metas e pode ser restaurado no SONORA.
- **CSV** exporta o histórico de sessões para consulta em planilhas; não é um formato de restauração.
- Restaurar um backup substitui os dados atuais. Antes da restauração, o app baixa uma cópia dos dados atuais.

Backups e exportações podem conter informações pessoais. Mantenha-os em local seguro e não os adicione ao repositório. Os padrões desses arquivos estão no `.gitignore`.

## Estrutura do projeto

```text
index.html       Interface e conteúdo
style.css        Estilos e layout responsivo
script.js        Fluxos da aplicação e persistência local
data-tools.js    Leitura de JSON e exportação JSON/CSV
docs/            Documentação técnica
```

## Verificações

Para verificar a sintaxe dos scripts, com Node.js instalado:

```powershell
node --check .\script.js
node --check .\data-tools.js
```

O projeto não possui dependências npm nem uma suíte automatizada de testes.

## Documentação

- [Arquitetura e armazenamento](docs/ARQUITETURA.md)
