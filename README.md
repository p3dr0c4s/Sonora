# SONORA

Seu espaço para organizar instrumentos e acompanhar seus estudos musicais.

**Acesse o SONORA:** [p3dr0c4s.github.io/Sonora](https://p3dr0c4s.github.io/Sonora/)

## O que você pode fazer

- Cadastrar seus instrumentos e acompanhar o estado de cada um.
- Usar o cronômetro em práticas livres ou planejar o que vai estudar.
- Registrar sessões, dificuldades e anotações.
- Definir metas semanais e acompanhar seu progresso.
- Exportar seus dados para fazer backup.

## Como usar

Não precisa instalar nada: abra o [SONORA no navegador](https://p3dr0c4s.github.io/Sonora/).

Se quiser executar uma cópia no seu computador, tenha o Python instalado e:

1. Abra um terminal na pasta do projeto.
2. Execute:

   ```powershell
   py -m http.server 8000
   ```

3. Abra <http://localhost:8000> no navegador.
4. Para parar, volte ao terminal e pressione `Ctrl+C`.

## Seus dados e backups

Seus dados ficam salvos no navegador que você usa. Eles não são enviados a um servidor nem sincronizados com outros dispositivos. Se limpar os dados do site ou trocar de navegador, você pode perdê-los.

Para se proteger, abra a seção **Dados** no SONORA e faça backups:

- **JSON:** salva instrumentos, sessões e metas. Você pode restaurar esse arquivo no SONORA.
- **CSV:** salva o histórico de sessões para abrir em uma planilha. Não serve para restaurar os dados.

Ao restaurar um backup, os dados atuais serão substituídos. O SONORA baixa uma cópia deles antes da restauração. Guarde seus arquivos de backup em um local seguro.

## Para quem desenvolve

O SONORA é um site estático: não tem servidor, instalação de dependências ou etapa de compilação. Para verificar os scripts e executar os testes, instale o [Node.js](https://nodejs.org/) e rode estes comandos na pasta do projeto:

```powershell
node --check .\script.js
node --check .\data-tools.js
node --test .\tests\sonora.test.js
```

## Arquivos do projeto

- `index.html`: estrutura e conteúdo da página.
- `style.css`: aparência e adaptação para telas menores.
- `script.js`: funcionalidades e salvamento dos dados.
- `data-tools.js`: leitura e exportação de arquivos.
- `tests/`: testes automatizados.
- `docs/`: documentação técnica.

Veja também a [documentação da arquitetura](docs/ARQUITETURA.md).
