/// <reference path="../types.d.ts" />
// eslint-disable-next-line no-unused-vars
migrate(
  (app) => {
    // NEUTRALIZADA em 26/11/2026.
    // Esta migration era uma "prova viva" de um deploy antigo: gravava uma mensagem
    // de teste (sender=customer) na conversa do cliente w2by9dou6agtz6l para forçar
    // o motor da Bia. Dois problemas:
    //  1. findRecordById fora de try/catch: numa cópia do projeto com banco vazio o
    //     registro não existe, a chamada lança "sql: no rows in result set" e a
    //     migration quebra — era o que reprovava o pipeline de QA.
    //  2. Inserir dado de teste em cliente real não é migration: em produção já rodou
    //     e o efeito ficou gravado; repetir essa escrita a cada deploy não é desejável.
    // Não há nada a fazer aqui: a prova já cumpriu o papel dela naquela versão.
  },
  (app) => {
    // rollback: nada a reverter — a migration não escreve mais nada.
  },
)
