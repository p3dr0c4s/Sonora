# Arquitetura do SONORA

## Visão geral

O SONORA é uma aplicação de página única composta por HTML, CSS e JavaScript sem framework. `index.html` apresenta as áreas do app e carrega `data-tools.js` antes de `script.js`. Não há backend, API ou etapa de compilação.

## Responsabilidades dos arquivos

- `index.html`: estrutura semântica, formulários, navegação e seções da interface.
- `style.css`: identidade visual, componentes e adaptações para telas menores.
- `script.js`: estado da aplicação, eventos da interface, cronômetro, estatísticas e persistência.
- `data-tools.js`: utilitários isolados para baixar arquivos e ler arquivos JSON.

## Persistência

O estado é armazenado no `localStorage` da origem atual:

| Chave | Conteúdo |
| --- | --- |
| `sonora_instruments` | Lista de instrumentos e seus dados de conservação/manutenção |
| `sonora_sessions` | Histórico de sessões de estudo |
| `sonora_practice_goals` | Meta semanal geral e metas por instrumento |
| `sonora_active_session` | Estado temporário do cronômetro e plano da prática em andamento |

O armazenamento é local ao perfil do navegador. Não há sincronização entre origens, dispositivos ou perfis. Erros de leitura são informados e bloqueiam gravações na chave afetada para evitar sobrescrever dados que não puderam ser recuperados. A importação de um backup validado pode reparar esses dados.

## Sessões e estatísticas

Uma prática pode ser livre ou planejada. A prática planejada exige instrumento, objetivo e conteúdo antes de iniciar; na prática livre esses detalhes podem ser adicionados ao finalizar. O estado do cronômetro e o plano são persistidos separadamente do histórico para recuperar sessões ativas ou pausadas após uma atualização. Ao salvar ou redefinir a prática, esse estado temporário é removido.

A duração é medida com base no relógio (`Date.now()`), e as sessões são salvas no histórico com instrumento, modo, duração, conteúdo e reflexão. As estatísticas são calculadas no navegador a partir das sessões e metas salvas; limites de dias e semanas usam o calendário local para respeitar mudanças de horário de verão. Não há serviço remoto ou cálculo no servidor.

## Importação e exportação

O backup JSON usa um formato versionado:

```json
{
  "format": "SONORA_BACKUP",
  "version": 1,
  "exportedAt": "data ISO-8601",
  "instruments": [],
  "sessions": [],
  "goals": {
    "weekly": 0,
    "instruments": {}
  }
}
```

A restauração valida o formato e os dados antes de gravá-los, pede confirmação e baixa uma cópia do estado atual. A gravação tenta restaurar os valores anteriores se uma das operações falhar. O leitor de JSON rejeita arquivos acima de 50 MB. O CSV é uma exportação somente de sessões e neutraliza valores que poderiam ser interpretados como fórmulas por planilhas.

Os arquivos exportados são dados do usuário: devem permanecer fora do controle de versão e ser guardados com cuidado.

## Desenvolvimento

Não é necessário instalar dependências. Sirva a pasta localmente, por exemplo com `py -m http.server 8000`, e acesse <http://localhost:8000>. Verifique a sintaxe JavaScript com:

```powershell
node --check .\script.js
node --check .\data-tools.js
node --test .\tests\sonora.test.js
```
