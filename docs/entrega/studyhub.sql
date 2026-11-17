-- StudyHub - Projeto Integrado (DWS + POO + BD)
-- Criação do banco de dados e das tabelas (MySQL) - versão final, com login
-- Aluno(a): (preencher o nome)        Turma: 2º TI-_

CREATE DATABASE studyhub;
USE studyhub;

CREATE TABLE usuario (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    apelido VARCHAR(30),
    bio VARCHAR(300),
    tema VARCHAR(10) NOT NULL DEFAULT 'escuro',
    tutorial_visto BOOLEAN NOT NULL DEFAULT FALSE,
    xp_total INT NOT NULL DEFAULT 0,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE foto_perfil (
    usuario_id INT PRIMARY KEY,
    tipo VARCHAR(20) NOT NULL,
    dados MEDIUMBLOB NOT NULL,
    atualizado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE TABLE sessao_login (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expira_em DATETIME NOT NULL,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE TABLE reset_senha (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expira_em DATETIME NOT NULL,
    usado BOOLEAN NOT NULL DEFAULT FALSE,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE TABLE materia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome VARCHAR(60) NOT NULL,
    cor CHAR(7) NOT NULL DEFAULT '#6c757d',
    UNIQUE (usuario_id, nome),
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE TABLE topico (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    materia_id INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'nao_visto',
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    FOREIGN KEY (materia_id) REFERENCES materia (id)
);

CREATE TABLE sessao_estudo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    materia_id INT NOT NULL,
    topico_id INT,
    duracao_min INT NOT NULL,
    concluida BOOLEAN NOT NULL DEFAULT TRUE,
    iniciada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    FOREIGN KEY (materia_id) REFERENCES materia (id),
    FOREIGN KEY (topico_id) REFERENCES topico (id)
);

CREATE TABLE baralho (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    materia_id INT NOT NULL,
    nome VARCHAR(100) NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    FOREIGN KEY (materia_id) REFERENCES materia (id)
);

CREATE TABLE cartao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    baralho_id INT NOT NULL,
    frente VARCHAR(500) NOT NULL,
    verso VARCHAR(500) NOT NULL,
    intervalo_dias INT NOT NULL DEFAULT 1,
    proxima_revisao DATE NOT NULL,
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baralho_id) REFERENCES baralho (id)
);

CREATE TABLE revisao_cartao (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cartao_id INT NOT NULL,
    acertou BOOLEAN NOT NULL,
    revisado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cartao_id) REFERENCES cartao (id)
);

CREATE TABLE xp_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    origem VARCHAR(20) NOT NULL,
    pontos INT NOT NULL,
    descricao VARCHAR(255),
    criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuario (id)
);

CREATE TABLE conquista (
    id INT AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(40) NOT NULL UNIQUE,
    nome VARCHAR(80) NOT NULL,
    descricao VARCHAR(255) NOT NULL,
    xp_bonus INT NOT NULL DEFAULT 0
);

-- Tabela associativa N:N entre usuario e conquista (chave primária composta)
CREATE TABLE usuario_conquista (
    usuario_id INT NOT NULL,
    conquista_id INT NOT NULL,
    desbloqueada_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, conquista_id),
    FOREIGN KEY (usuario_id) REFERENCES usuario (id),
    FOREIGN KEY (conquista_id) REFERENCES conquista (id)
);
