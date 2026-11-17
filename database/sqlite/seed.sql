-- StudyHub - dados iniciais: catálogo de conquistas (usuários e matérias nascem no cadastro)

PRAGMA foreign_keys = ON;

-- Conquistas (a regra de cada uma fica no GamificacaoService, pelo "codigo")
INSERT OR IGNORE INTO conquista (codigo, nome, descricao, xp_bonus) VALUES
    ('primeira_sessao',  'Primeiro Foco',      'Conclua sua primeira sessão Pomodoro.',        20),
    ('dez_sessoes',      'Maratonista',        'Conclua 10 sessões Pomodoro.',                 50),
    ('primeiro_topico',  'Revisor',            'Marque seu primeiro tópico como revisado.',    20),
    ('cinco_topicos',    'Estudioso',          'Revise 5 tópicos do planner.',                 50),
    ('primeiro_cartao',  'Memória Ativa',      'Revise seu primeiro flashcard.',               10),
    ('cinquenta_cartoes','Mestre das Cartas',  'Revise 50 flashcards.',                        60),
    ('nivel_5',          'Veterano',           'Alcance o nível 5.',                          100);
