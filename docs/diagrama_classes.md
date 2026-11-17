# Diagrama de Classes (UML) - StudyHub

Diagrama de classes do domínio e dos services. O GitHub renderiza o bloco abaixo automaticamente.
O mesmo diagrama está em `diagrama_classes.mermaid`.

```mermaid
classDiagram
    direction TB

    class Usuario {
        -int id
        -str nome
        -str email
        -str senha_hash
        -str apelido
        -str bio
        -str tema
        -bool tutorial_visto
        -int xp_total
        -datetime criado_em
        +calcular_nivel() int
        +xp_para_proximo_nivel() int
        +adicionar_xp(pontos) void
    }

    class Materia {
        -int id
        -str nome
        -str cor
    }

    class Topico {
        -int id
        -str titulo
        -str status
        -datetime criado_em
        +avancar_status() void
        +mudar_status(novo_status) bool
    }

    class SessaoEstudo {
        -int id
        -int duracao_min
        -bool concluida
        -datetime iniciada_em
        +concluir() void
    }

    class Baralho {
        -int id
        -str nome
        -datetime criado_em
        +cartoes_para_revisar(hoje) list
    }

    class Cartao {
        -int id
        -str frente
        -str verso
        -int intervalo_dias
        -date proxima_revisao
        +precisa_revisar(hoje) bool
        +registrar_revisao(acertou) RevisaoCartao
    }

    class RevisaoCartao {
        -int id
        -bool acertou
        -datetime revisado_em
    }

    class XPLog {
        -int id
        -str origem
        -int pontos
        -str descricao
        -datetime criado_em
    }

    class Conquista {
        -int id
        -str codigo
        -str nome
        -str descricao
        -int xp_bonus
    }

    class UsuarioConquista {
        -datetime desbloqueada_em
    }

    class FotoPerfil {
        -str tipo
        -bytes dados
        -datetime atualizado_em
    }

    class SessaoLogin {
        -int id
        -str token_hash
        -datetime expira_em
    }

    class ResetSenha {
        -int id
        -str token_hash
        -datetime expira_em
        -bool usado
    }

    class AuthService {
        +cadastrar(nome, email, senha, confirmar, tema) tuple
        +entrar(email, senha, lembrar) tuple
        +usuario_por_token(token) int
        +sair(token) void
        +atualizar_perfil(usuario_id, dados) dict
        +salvar_foto(usuario_id, imagem) dict
        +alterar_email(usuario_id, novo_email, senha, token) dict
        +alterar_senha(usuario_id, atual, nova, confirmar, token) void
        +solicitar_recuperacao(email) str
        +redefinir_senha(token, nova, confirmar) void
    }

    class GamificacaoService {
        +conceder_xp(usuario_id, origem, pontos, descricao) dict
        +verificar_conquistas(usuario_id) list
    }

    class PomodoroService {
        +registrar_sessao(usuario_id, materia_id, duracao_min, topico_id, concluida) tuple
    }

    class PlannerService {
        +mudar_status(topico_id, novo_status) tuple
        +avancar_status(topico_id) tuple
    }

    class FlashcardService {
        +registrar_revisao(cartao_id, acertou) tuple
    }

    Usuario "1" --> "*" Materia : organiza
    Usuario "1" --> "0..1" FotoPerfil : tem
    Usuario "1" --> "*" SessaoLogin : abre
    Usuario "1" --> "*" ResetSenha : pede
    AuthService ..> Usuario : cadastra e autentica
    AuthService ..> SessaoLogin : cria e invalida
    AuthService ..> ResetSenha : gera link
    Usuario "1" --> "*" Topico : planeja
    Usuario "1" --> "*" SessaoEstudo : realiza
    Usuario "1" --> "*" Baralho : cria
    Usuario "1" --> "*" XPLog : acumula
    Usuario "1" --> "*" UsuarioConquista : desbloqueia
    Conquista "1" --> "*" UsuarioConquista : e desbloqueada em

    Materia "1" --> "*" Topico : classifica
    Materia "1" --> "*" SessaoEstudo : classifica
    Materia "1" --> "*" Baralho : classifica

    Topico "0..1" <-- "*" SessaoEstudo : foco opcional

    Baralho "1" *-- "*" Cartao : contem
    Cartao "1" *-- "*" RevisaoCartao : historico

    PomodoroService ..> SessaoEstudo : grava
    PlannerService ..> Topico : atualiza status
    FlashcardService ..> Cartao : agenda revisao
    PomodoroService ..> GamificacaoService : sessao concluida gera XP
    PlannerService ..> GamificacaoService : topico revisado gera XP
    FlashcardService ..> GamificacaoService : revisao gera XP

    GamificacaoService ..> Usuario : atualiza xp_total
    GamificacaoService ..> XPLog : registra
    GamificacaoService ..> UsuarioConquista : concede
```

## Correspondência entre classes e tabelas do banco

| Classe | Tabela | Observação |
|---|---|---|
| Usuario | `usuario` | senha guardada só como hash; `xp_total` é atualizado pelo GamificacaoService |
| Materia | `materia` | cada usuário tem as suas matérias |
| Topico | `topico` | status: `nao_visto`, `estudando`, `revisado` (só avança) |
| SessaoEstudo | `sessao_estudo` | `topico_id` é opcional |
| Baralho | `baralho` | pertence a um usuário e a uma matéria |
| Cartao | `cartao` | `intervalo_dias` e `proxima_revisao` controlam a repetição espaçada |
| RevisaoCartao | `revisao_cartao` | histórico de acertos e erros |
| XPLog | `xp_log` | origem: `pomodoro`, `topico`, `flashcard`, `conquista` |
| Conquista | `conquista` | `codigo` identifica a regra no GamificacaoService |
| UsuarioConquista | `usuario_conquista` | tabela associativa N:N entre Usuario e Conquista |
| FotoPerfil | `foto_perfil` | foto de perfil (imagem guardada no banco) |
| SessaoLogin | `sessao_login` | sessões de login; só o hash do token |
| ResetSenha | `reset_senha` | links de recuperação de senha, de uso único |
| AuthService | (sem tabela) | cadastro, login, perfil, troca de senha e recuperação |
| GamificacaoService | (sem tabela) | concede XP e confere conquistas; usado pelos 3 services de módulo |
| PomodoroService, PlannerService, FlashcardService | (sem tabela) | gravam a ação e chamam o GamificacaoService na mesma transação |

## Relacionamentos

- **1:N**: Usuario com Materia, Topico, SessaoEstudo, Baralho, XPLog, SessaoLogin e ResetSenha; Materia com Topico, SessaoEstudo e Baralho; Topico com SessaoEstudo (opcional).
- **1:1 (opcional)**: Usuario e FotoPerfil.
- **N:N**: Usuario e Conquista, resolvido pela tabela `usuario_conquista`.
- **Composição**: Baralho contém Cartao, e Cartao contém RevisaoCartao (apagar o pai apaga os filhos).
- **Dependência**: cada service de módulo depende do GamificacaoService.
