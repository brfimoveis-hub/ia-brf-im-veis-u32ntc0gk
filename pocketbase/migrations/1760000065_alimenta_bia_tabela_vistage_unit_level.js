migrate(
  (app) => {
    // Migration 1760000065:
    // 1. Registrar / atualizar documentos oficiais do Vistage Residence em ai_knowledge_files:
    //    - TABELA VISTAGE (Setembro/2026 unit-level) íntegra, ativa e vinculada a property_id='4ccqbm5dmc2d21f'.
    //    - POLITICA VENDAS - VISTAGE (1) garantida íntegra, ativa e vinculada a property_id='4ccqbm5dmc2d21f'.
    // 2. Atualizar tabela de valores unit-level no dossiê de lançamentos ('launches' slug='vistage-residence') e 'properties' (id='4ccqbm5dmc2d21f').
    // 3. Atualizar o TEXTO ÚNICO DA BIA (bia_learnings id='tYVJIdIFb5rW4iq') e users (bia_instructions / ai_instructions)
    //    com as diretrizes obrigatórias de cotação unit-level, unidades vendidas, "a partir de" dinâmico,
    //    política comercial com dados do cliente vs dados internos protegidos, e regra anti-contradição.

    const VISTAGE_PROP_ID = '4ccqbm5dmc2d21f'
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19)

    // Texto completo estruturado em Markdown da TABELA OFICIAL SET/2026 POR UNIDADE
    const tabelaMarkdown = `# VISTAGE RESIDENCE — TABELA OFICIAL DE VENDAS (AJ COELHO)
Vigência: A partir de Setembro/2026
Localização: Rua Capitão Pedro Leite, nº 28 / Barreiros, São José - SC (Grande Florianópolis)
Construtora e Incorporadora: AJ COELHO CONSTRUTORA E INCORPORADORA LTDA (CNPJ: 08.981.143/0001-33)
Registro de Incorporação: R-160.236
Previsão de Entrega: Dezembro/2030
Modalidade: Empreendimento Associativo CEF (Caixa Econômica Federal)

================================================================================
ESTRUTURA DE PAGAMENTO PADRÃO DA TABELA:
- ATO (Entrada mínima): 15% do valor do imóvel
- MENSAIS: 60 parcelas mensais (15% do valor total dividido em 60x)
- REFORÇOS: 4 reforços balões (10% do valor total dividido em 4x)
- FINANCIAMENTO: 60% do valor total exclusivo CAIXA (durante a obra)
- CORREÇÃO: Parcelas, reforços e chaves corrigidos pelo CUB até a entrega; após chaves IGPM + 0,99% a.m.
- DESCONTO: 10% SOMENTE para pagamento integral à vista
- PROPOSTAS: Vigência estrita de 48 horas

================================================================================
STATUS DE DISPONIBILIDADE E UNIDADES VENDIDAS:
UNIDADES VENDIDAS / RESERVADAS: 201, 301, 202, 203, 505, 705.
REGRA DA BIA: NUNCA oferecer nem cotar como disponível uma unidade vendida.
Se o cliente perguntar por uma unidade vendida, informe com naturalidade que ela já foi reservada e ofereça a unidade disponível mais próxima da mesma tipologia e andar adjacente.

================================================================================
TABELA DETALHADA POR UNIDADE (TODOS OS BLOCOS):

--- BLOCO 101 A 1301 ---
Tipologia: 3 QUARTOS COM 1 SUÍTE E 2 DEMI-SUÍTES, 1 LAVABO — SOL DA TARDE
Área Privativa: 110,09m² (unidade 101 c/ terraço 61,99m²) | 106,47m² (unidades 201 a 1301)
- Apto 101 (110,09m² priv + 61,99m² terr, Vaga 46 E, HB 101): R$ 1.183.725,00 | Ato (15%): R$ 142.047,00 | 60x R$ 2.959,31 | 4x Reforços R$ 29.593,13 | Financiamento (60%): R$ 710.235,00 | DISPONÍVEL
- Apto 201 (106,47m², Vaga 42, HB 201): R$ 1.011.465,00 | Ato: R$ 151.719,75 | 60x R$ 2.528,66 | 4x R$ 25.286,63 | Financiamento: R$ 606.879,00 | **VENDIDO**
- Apto 301 (106,47m², Vaga 44 + MT 01, HB 6): R$ 1.032.759,00 | Ato: R$ 154.913,85 | 60x R$ 2.581,90 | 4x R$ 25.818,98 | Financiamento: R$ 619.655,40 | **VENDIDO**
- Apto 401 (106,47m², Vaga 43 E, HB 401): R$ 1.054.053,00 | Ato: R$ 158.107,95 | 60x R$ 2.635,13 | 4x R$ 26.351,33 | Financiamento: R$ 632.431,80 | DISPONÍVEL
- Apto 501 (106,47m², Vaga 45 E, HB 501): R$ 1.075.347,00 | Ato: R$ 161.302,05 | 60x R$ 2.688,37 | 4x R$ 26.883,68 | Financiamento: R$ 645.208,20 | DISPONÍVEL
- Apto 601 (106,47m², Vaga 11 E, HB 601): R$ 1.096.641,00 | Ato: R$ 164.496,15 | 60x R$ 2.741,60 | 4x R$ 27.416,03 | Financiamento: R$ 657.984,60 | DISPONÍVEL
- Apto 701 (106,47m², Vaga 32-33, HB 701): R$ 1.128.582,00 | Ato: R$ 169.287,30 | 60x R$ 2.821,46 | 4x R$ 28.214,55 | Financiamento: R$ 677.149,20 | DISPONÍVEL
- Apto 801 (106,47m², Vaga 30-31, HB 801): R$ 1.160.523,00 | Ato: R$ 174.078,45 | 60x R$ 2.901,31 | 4x R$ 29.013,08 | Financiamento: R$ 696.313,80 | DISPONÍVEL
- Apto 901 (106,47m², Vaga 22-27, HB 901): R$ 1.192.464,00 | Ato: R$ 178.869,60 | 60x R$ 2.981,16 | 4x R$ 29.811,60 | Financiamento: R$ 715.478,40 | DISPONÍVEL
- Apto 1001 (106,47m², Vaga 25-26, HB 1001): R$ 1.224.405,00 | Ato: R$ 183.660,75 | 60x R$ 3.061,01 | 4x R$ 30.610,13 | Financiamento: R$ 734.643,00 | DISPONÍVEL
- Apto 1101 (106,47m², Vaga 15-16, HB 1101): R$ 1.256.346,00 | Ato: R$ 188.451,90 | 60x R$ 3.140,87 | 4x R$ 31.408,65 | Financiamento: R$ 753.807,60 | DISPONÍVEL
- Apto 1201 (106,47m², Vaga 17-18, HB 1201): R$ 1.288.287,00 | Ato: R$ 193.243,05 | 60x R$ 3.220,72 | 4x R$ 32.207,18 | Financiamento: R$ 772.972,20 | DISPONÍVEL
- Apto 1301 (106,47m², Vaga 28-29, HB 1301): R$ 1.320.228,00 | Ato: R$ 198.034,20 | 60x R$ 3.300,57 | 4x R$ 33.005,70 | Financiamento: R$ 792.136,80 | DISPONÍVEL

--- BLOCO 102 A 1302 ---
Tipologia: 3 QUARTOS COM 1 SUÍTE E 2 DEMI-SUÍTES, 1 LAVABO — SOL DA MANHÃ E TARDE
Área Privativa: 103,87m² (unidade 102 c/ terraço 20,68m²) | 101,07m² (demais)
- Apto 102 (103,87m² priv + 20,68m² terr, Vaga 94 E, HB 102): R$ 965.615,00 | Ato: R$ 144.842,25 | 60x R$ 2.414,04 | 4x R$ 24.140,38 | Financiamento: R$ 579.369,00 | DISPONÍVEL
- Apto 202 (101,07m², Vaga 88 E, HB 202): R$ 909.630,00 | Ato: R$ 136.444,50 | 60x R$ 2.274,08 | 4x R$ 22.740,75 | Financiamento: R$ 545.778,00 | **VENDIDO**
- Apto 302 (101,07m², Vaga 96 + MT 04, HB 302): R$ 929.844,00 | Ato: R$ 139.476,60 | 60x R$ 2.324,61 | 4x R$ 23.246,10 | Financiamento: R$ 557.906,40 | DISPONÍVEL (Menor valor de 3 dorm disponível)
- Apto 402 (101,07m², Vaga 83 E, HB 402): R$ 950.058,00 | Ato: R$ 142.508,70 | 60x R$ 2.375,15 | 4x R$ 23.751,45 | Financiamento: R$ 570.034,80 | DISPONÍVEL
- Apto 502 (101,07m², Vaga 95 E, HB 502): R$ 970.272,00 | Ato: R$ 145.540,80 | 60x R$ 2.425,68 | 4x R$ 24.256,80 | Financiamento: R$ 582.163,20 | DISPONÍVEL
- Apto 602 (101,07m², Vaga 14 E, HB 602): R$ 990.486,00 | Ato: R$ 148.572,90 | 60x R$ 2.476,22 | 4x R$ 24.762,15 | Financiamento: R$ 594.291,60 | DISPONÍVEL
- Apto 702 (101,07m², Vaga 13 E, HB 702): R$ 1.020.807,00 | Ato: R$ 153.121,05 | 60x R$ 2.552,02 | 4x R$ 25.520,18 | Financiamento: R$ 612.484,20 | DISPONÍVEL
- Apto 802 (101,07m², Vaga 12 E, HB 802): R$ 1.051.128,00 | Ato: R$ 157.669,20 | 60x R$ 2.627,82 | 4x R$ 26.278,20 | Financiamento: R$ 630.676,80 | DISPONÍVEL
- Apto 902 (101,07m², Vaga 08-09, HB 902): R$ 1.081.449,00 | Ato: R$ 162.217,35 | 60x R$ 2.703,62 | 4x R$ 27.036,23 | Financiamento: R$ 648.869,40 | DISPONÍVEL
- Apto 1002 (101,07m², Vaga 06-07, HB 1002): R$ 1.111.770,00 | Ato: R$ 166.765,50 | 60x R$ 2.779,43 | 4x R$ 27.794,25 | Financiamento: R$ 667.062,00 | DISPONÍVEL
- Apto 1102 (101,07m², Vaga 04-05, HB 1102): R$ 1.142.091,00 | Ato: R$ 171.313,65 | 60x R$ 2.855,23 | 4x R$ 28.552,28 | Financiamento: R$ 685.254,60 | DISPONÍVEL
- Apto 1202 (101,07m², Vaga 02-03, HB 1202): R$ 1.172.412,00 | Ato: R$ 175.861,80 | 60x R$ 2.931,03 | 4x R$ 29.310,30 | Financiamento: R$ 703.447,20 | DISPONÍVEL
- Apto 1302 (101,07m², Vaga 60-61, HB 1302): R$ 1.202.733,00 | Ato: R$ 180.409,95 | 60x R$ 3.006,83 | 4x R$ 30.068,33 | Financiamento: R$ 721.639,80 | DISPONÍVEL

--- BLOCO 103 A 1303 ---
Tipologia: 2 QUARTOS COM 1 SUÍTE, 1 BANHEIRO — SOL DA MANHÃ
Área Privativa: 68,54m² (unidade 103 c/ terraço 10,13m²) | 66,80m² (demais)
- Apto 103 (68,54m² priv + 10,13m² terr, Vaga 10, HB 103): R$ 623.110,00 | Ato: R$ 93.466,50 | 60x R$ 1.557,78 | 4x R$ 15.577,75 | Financiamento: R$ 373.866,00 | DISPONÍVEL
- Apto 203 (66,80m², Vaga 93, HB 203): R$ 594.520,00 | Ato: R$ 89.178,00 | 60x R$ 1.486,30 | 4x R$ 14.863,00 | Financiamento: R$ 356.712,00 | **VENDIDO**
- Apto 303 (66,80m², Vaga 84, HB 303): R$ 607.880,00 | Ato: R$ 91.182,00 | 60x R$ 1.519,70 | 4x R$ 15.197,00 | Financiamento: R$ 364.728,00 | DISPONÍVEL (Menor valor de 2 dorm disponível)
- Apto 403 (66,80m², Vaga 65, HB 403): R$ 621.240,00 | Ato: R$ 93.186,00 | 60x R$ 1.553,10 | 4x R$ 15.531,00 | Financiamento: R$ 372.744,00 | DISPONÍVEL
- Apto 503 (66,80m², Vaga 74, HB 503): R$ 634.600,00 | Ato: R$ 95.190,00 | 60x R$ 1.586,50 | 4x R$ 15.865,00 | Financiamento: R$ 380.760,00 | DISPONÍVEL
- Apto 603 (66,80m², Vaga 75, HB 603): R$ 647.960,00 | Ato: R$ 97.194,00 | 60x R$ 1.619,90 | 4x R$ 16.199,00 | Financiamento: R$ 388.776,00 | DISPONÍVEL
- Apto 703 (66,80m², Vaga 81, HB 703): R$ 661.320,00 | Ato: R$ 99.198,00 | 60x R$ 1.653,30 | 4x R$ 16.533,00 | Financiamento: R$ 396.792,00 | DISPONÍVEL
- Apto 803 (66,80m², Vaga 92, HB 803): R$ 674.680,00 | Ato: R$ 101.202,00 | 60x R$ 1.686,70 | 4x R$ 16.867,00 | Financiamento: R$ 404.808,00 | DISPONÍVEL
- Apto 903 (66,80m², Vaga 91, HB 903): R$ 688.040,00 | Ato: R$ 103.206,00 | 60x R$ 1.720,10 | 4x R$ 17.201,00 | Financiamento: R$ 412.824,00 | DISPONÍVEL
- Apto 1003 (66,80m², Vaga 90, HB 1003): R$ 701.400,00 | Ato: R$ 105.210,00 | 60x R$ 1.753,50 | 4x R$ 17.535,00 | Financiamento: R$ 420.840,00 | DISPONÍVEL
- Apto 1103 (66,80m², Vaga 89, HB 1103): R$ 714.760,00 | Ato: R$ 107.214,00 | 60x R$ 1.786,90 | 4x R$ 17.869,00 | Financiamento: R$ 428.856,00 | DISPONÍVEL
- Apto 1203 (66,80m², Vaga 88, HB 1203): R$ 728.120,00 | Ato: R$ 109.218,00 | 60x R$ 1.820,30 | 4x R$ 18.203,00 | Financiamento: R$ 436.872,00 | DISPONÍVEL
- Apto 1303 (66,80m², Vaga 87, HB 1303): R$ 741.480,00 | Ato: R$ 111.222,00 | 60x R$ 1.853,70 | 4x R$ 18.537,00 | Financiamento: R$ 444.888,00 | DISPONÍVEL

--- BLOCO 104 A 1304 ---
Tipologia: 2 QUARTOS COM 2 SUÍTES, 1 BANHEIRO / LAVABO — SOL DA TARDE
Área Privativa: 85,62m² (unidade 104 c/ terraço 58,31m²) | 81,60m² (demais)
- Apto 104 (85,62m² priv + 58,31m² terr, Vaga 55, HB 104): R$ 935.324,00 | Ato: R$ 140.298,60 | 60x R$ 2.338,31 | 4x R$ 23.383,10 | Financiamento: R$ 561.194,40 | DISPONÍVEL
- Apto 204 (81,60m², Vaga 50, HB 204): R$ 701.760,00 | Ato: R$ 105.264,00 | 60x R$ 1.754,40 | 4x R$ 17.544,00 | Financiamento: R$ 421.056,00 | DISPONÍVEL
- Apto 304 (81,60m², Vaga 54, HB 304): R$ 718.080,00 | Ato: R$ 107.712,00 | 60x R$ 1.795,20 | 4x R$ 17.952,00 | Financiamento: R$ 430.848,00 | DISPONÍVEL
- Apto 404 (81,60m², Vaga 51, HB 404): R$ 734.400,00 | Ato: R$ 110.160,00 | 60x R$ 1.836,00 | 4x R$ 18.360,00 | Financiamento: R$ 440.640,00 | DISPONÍVEL
- Apto 504 (81,60m², Vaga 66, HB 504): R$ 750.720,00 | Ato: R$ 112.608,00 | 60x R$ 1.876,80 | 4x R$ 18.768,00 | Financiamento: R$ 450.432,00 | DISPONÍVEL
- Apto 604 (81,60m², Vaga 67, HB 604): R$ 767.040,00 | Ato: R$ 115.056,00 | 60x R$ 1.917,60 | 4x R$ 19.176,00 | Financiamento: R$ 460.224,00 | DISPONÍVEL
- Apto 704 (81,60m², Vaga 68, HB 704): R$ 783.360,00 | Ato: R$ 117.504,00 | 60x R$ 1.958,40 | 4x R$ 19.584,00 | Financiamento: R$ 470.016,00 | DISPONÍVEL
- Apto 804 (81,60m², Vaga 69, HB 804): R$ 799.680,00 | Ato: R$ 119.952,00 | 60x R$ 1.999,20 | 4x R$ 19.992,00 | Financiamento: R$ 479.808,00 | DISPONÍVEL
- Apto 904 (81,60m², Vaga 80, HB 904): R$ 816.000,00 | Ato: R$ 122.400,00 | 60x R$ 2.040,00 | 4x R$ 20.400,00 | Financiamento: R$ 489.600,00 | DISPONÍVEL
- Apto 1004 (81,60m², Vaga 79, HB 1004): R$ 848.640,00 | Ato: R$ 127.296,00 | 60x R$ 2.121,60 | 4x R$ 21.216,00 | Financiamento: R$ 509.184,00 | DISPONÍVEL
- Apto 1104 (81,60m², Vaga 78, HB 1104): R$ 864.960,00 | Ato: R$ 129.744,00 | 60x R$ 2.162,40 | 4x R$ 21.624,00 | Financiamento: R$ 518.976,00 | DISPONÍVEL
- Apto 1204 (81,60m², Vaga 77, HB 1204): R$ 881.280,00 | Ato: R$ 132.192,00 | 60x R$ 2.203,20 | 4x R$ 22.032,00 | Financiamento: R$ 528.768,00 | DISPONÍVEL
- Apto 1304 (81,60m², Vaga 76, HB 1304): R$ 897.600,00 | Ato: R$ 134.640,00 | 60x R$ 2.244,00 | 4x R$ 22.440,00 | Financiamento: R$ 538.560,00 | DISPONÍVEL

--- BLOCO 105 A 1305 ---
Tipologia: 2 QUARTOS COM 2 SUÍTES — SOL DA MANHÃ
Área Privativa: 75,15m² (unidade 105 c/ terraço 46,67m²) | 72,96m² (demais)
- Apto 105 (75,15m² priv + 46,67m² terr, Vaga 52, HB 9): R$ 858.070,00 | Ato: R$ 128.710,50 | 60x R$ 2.145,18 | 4x R$ 21.451,75 | Financiamento: R$ 514.842,00 | DISPONÍVEL
- Apto 205 (72,96m², Vaga 53): R$ 671.232,00 | Ato: R$ 100.684,80 | 60x R$ 1.678,08 | 4x R$ 16.780,80 | Financiamento: R$ 402.739,20 | DISPONÍVEL
- Apto 305 (72,96m², Vaga 62): R$ 685.824,00 | Ato: R$ 102.873,60 | 60x R$ 1.714,56 | 4x R$ 17.145,60 | Financiamento: R$ 411.494,40 | DISPONÍVEL
- Apto 405 (72,96m², Vaga 63): R$ 700.416,00 | Ato: R$ 105.062,40 | 60x R$ 1.751,04 | 4x R$ 17.510,40 | Financiamento: R$ 420.249,60 | DISPONÍVEL
- Apto 505 (72,96m², Vaga 47): R$ 729.600,00 | Ato: R$ 109.440,00 | 60x R$ 1.824,00 | 4x R$ 18.240,00 | Financiamento: R$ 437.760,00 | **VENDIDO**
- Apto 605 (72,96m², Vaga 41): R$ 751.488,00 | Ato: R$ 112.723,20 | 60x R$ 1.878,72 | 4x R$ 18.787,20 | Financiamento: R$ 450.892,80 | DISPONÍVEL
- Apto 705 (72,96m², Vaga 34, HB 8): R$ 773.376,00 | Ato: R$ 116.006,40 | 60x R$ 1.933,44 | 4x R$ 19.334,40 | Financiamento: R$ 464.025,60 | **VENDIDO**
- Apto 805 (72,96m², Vaga 86): R$ 795.264,00 | Ato: R$ 119.289,60 | 60x R$ 1.988,16 | 4x R$ 19.881,60 | Financiamento: R$ 477.158,40 | DISPONÍVEL
- Apto 905 (72,96m², Vaga 85): R$ 817.152,00 | Ato: R$ 122.572,80 | 60x R$ 2.042,88 | 4x R$ 20.428,80 | Financiamento: R$ 490.291,20 | DISPONÍVEL
- Apto 1005 (72,96m², Vaga 73): R$ 839.040,00 | Ato: R$ 125.856,00 | 60x R$ 2.097,60 | 4x R$ 20.976,00 | Financiamento: R$ 503.424,00 | DISPONÍVEL
- Apto 1105 (72,96m², Vaga 72): R$ 860.928,00 | Ato: R$ 129.139,20 | 60x R$ 2.152,32 | 4x R$ 21.523,20 | Financiamento: R$ 516.556,80 | DISPONÍVEL
- Apto 1205 (72,96m², Vaga 71): R$ 882.816,00 | Ato: R$ 132.422,40 | 60x R$ 2.207,04 | 4x R$ 22.070,40 | Financiamento: R$ 529.689,60 | DISPONÍVEL
- Apto 1305 (72,96m², Vaga 70): R$ 904.704,00 | Ato: R$ 135.705,60 | 60x R$ 2.261,76 | 4x R$ 22.617,60 | Financiamento: R$ 542.822,40 | DISPONÍVEL

--- BLOCO 106 A 1306 ---
Tipologia: 2 QUARTOS COM 2 SUÍTES, 1 BANHEIRO / LAVABO — SOL DA MANHÃ
Área Privativa: 92,02m² (unidade 106 c/ terraço 106,01m²) | 87,42m² (demais)
- Apto 106 (92,02m² priv + 106,01m² terr, Vaga 59): R$ 1.178.604,00 | Ato: R$ 176.790,60 | 60x R$ 2.946,51 | 4x R$ 29.465,10 | Financiamento: R$ 707.162,40 | DISPONÍVEL
- Apto 206 (87,42m², Vaga 58): R$ 804.264,00 | Ato: R$ 120.639,60 | 60x R$ 2.010,66 | 4x R$ 20.106,60 | Financiamento: R$ 482.558,40 | DISPONÍVEL
- Apto 306 (87,42m², Vaga 57): R$ 821.748,00 | Ato: R$ 123.262,20 | 60x R$ 2.054,37 | 4x R$ 20.543,70 | Financiamento: R$ 493.048,80 | DISPONÍVEL
- Apto 406 (87,42m², Vaga 56): R$ 839.232,00 | Ato: R$ 125.884,80 | 60x R$ 2.098,08 | 4x R$ 20.980,80 | Financiamento: R$ 503.539,20 | DISPONÍVEL
- Apto 506 (87,42m², Vaga 49): R$ 874.200,00 | Ato: R$ 131.130,00 | 60x R$ 2.185,50 | 4x R$ 21.855,00 | Financiamento: R$ 524.520,00 | DISPONÍVEL
- Apto 606 (87,42m², Vaga 48): R$ 900.426,00 | Ato: R$ 135.063,90 | 60x R$ 2.251,07 | 4x R$ 22.510,65 | Financiamento: R$ 540.255,60 | DISPONÍVEL
- Apto 706 (87,42m², Vaga 64): R$ 926.652,00 | Ato: R$ 138.997,80 | 60x R$ 2.316,63 | 4x R$ 23.166,30 | Financiamento: R$ 555.991,20 | DISPONÍVEL
- Apto 806 (87,42m², Vaga 35): R$ 952.878,00 | Ato: R$ 142.931,70 | 60x R$ 2.382,20 | 4x R$ 23.821,95 | Financiamento: R$ 571.726,80 | DISPONÍVEL
- Apto 906 (87,42m², Vaga 36): R$ 979.104,00 | Ato: R$ 146.865,60 | 60x R$ 2.447,76 | 4x R$ 24.477,60 | Financiamento: R$ 587.462,40 | DISPONÍVEL
- Apto 1006 (87,42m², Vaga 37): R$ 1.005.330,00 | Ato: R$ 150.799,50 | 60x R$ 2.513,33 | 4x R$ 25.133,25 | Financiamento: R$ 603.198,00 | DISPONÍVEL
- Apto 1106 (87,42m², Vaga 38): R$ 1.031.556,00 | Ato: R$ 154.733,40 | 60x R$ 2.578,89 | 4x R$ 25.788,90 | Financiamento: R$ 618.933,60 | DISPONÍVEL
- Apto 1206 (87,42m², Vaga 39): R$ 1.057.782,00 | Ato: R$ 158.667,30 | 60x R$ 2.644,46 | 4x R$ 26.444,55 | Financiamento: R$ 634.669,20 | DISPONÍVEL
- Apto 1306 (87,42m², Vaga 40): R$ 1.084.008,00 | Ato: R$ 162.601,20 | 60x R$ 2.710,02 | 4x R$ 27.100,20 | Financiamento: R$ 650.404,80 | DISPONÍVEL

--- COBERTURA 1401 ---
Tipologia: 3 QUARTOS COM 3 SUÍTES, 1 LAVABO — SOL DA MANHÃ E TARDE
Área Privativa: 296,20m² (Vagas 19-20-21, HB 2)
- Apto 1401 (296,20m²): R$ 3.258.200,00 | Ato (15%): R$ 488.730,00 | 60x R$ 8.145,50 | 4x Reforços R$ 81.455,00 | Financiamento (60%): R$ 1.954.920,00 | DISPONÍVEL

--- HOBBY BOXES AVULSOS DISPONÍVEIS (R$ 7.000,00/m²) ---
- HB 01: 3,03m² = R$ 21.210,00
- HB 03: 2,76m² = R$ 19.320,00
- HB 04: 2,55m² = R$ 17.850,00
- HB 05: 2,11m² = R$ 14.770,00
- HB 07: 4,69m² = R$ 32.830,00
- HB 10: 3,82m² = R$ 26.740,00
- HB 11: 3,80m² = R$ 26.600,00
- HB 12: 3,80m² = R$ 26.600,00
- HB 103: 2,48m² = R$ 17.360,00
- HB 203: 2,48m² = R$ 17.360,00
- HB 301: 3,12m² = R$ 21.840,00
- HB 303: 2,48m² = R$ 17.360,00
- HB 403: 2,48m² = R$ 17.360,00
- HB 503: 2,48m² = R$ 17.360,00
- HB 603: 2,48m² = R$ 17.360,00
- HB 703: 2,48m² = R$ 17.360,00
- HB 803: 2,48m² = R$ 17.360,00
- HB 903: 2,48m² = R$ 17.360,00
- HB 1003: 2,48m² = R$ 17.360,00
- HB 1103: 2,48m² = R$ 17.360,00
- HB 1203: 2,48m² = R$ 17.360,00
- HB 1303: 2,48m² = R$ 17.360,00

--- VAGAS DE MOTO DISPONÍVEIS (R$ 5.000,00/m² - 2,20m²) ---
- VAGA MOTO 02: 2,20m² = R$ 11.000,00
- VAGA MOTO 03: 2,20m² = R$ 11.000,00
`

    // Texto completo estruturado em Markdown da POLÍTICA COMERCIAL OFICIAL
    const politicaMarkdown = `# POLÍTICA COMERCIAL OFICIAL — VISTAGE RESIDENCE (AJ COELHO)
Empreendimento: Vistage Residence
Localização: Rua Capitão Pedro Leite, nº 28, Barreiros, São José – SC. CEP: 88.117-600. Fone: (48) 3047.2120
Construtora: AJ COELHO CONSTRUTORA E INCORPORADORA LTDA (CNPJ: 08.981.143/0001-33)
Registro de Incorporação: R-160.236
Modalidade: Empreendimento Associativo pela Caixa Econômica Federal (CEF)
Previsão de Entrega: Dezembro/2030

================================================================================
DIRETRIZES COMERCIAIS QUE A BIA PODE UTILIZAR EM ARGUMENTAÇÃO COM O CLIENTE:
1. Construtora: AJ Coelho Construtora (mais de 30 anos no mercado da Grande Florianópolis).
2. Registro de Incorporação: R-160.236 — garantia de segurança jurídica total.
3. Previsão de Entrega: Dezembro/2030.
4. Desconto à vista: 10% de desconto concedido SOMENTE para compras realizadas integralmente à vista.
5. Vigência das propostas: Valores e condições garantidos por 48 HORAS a partir da apresentação da proposta formal.
6. Entrada mínima: Ato a partir de 15% sobre o valor do imóvel (parcelado até a entrega da obra).
7. Financiamento Habitacional: Exclusividade da CAIXA ECONÔMICA FEDERAL por se tratar de empreendimento associativo.
8. Financiamento na Construção: O financiamento bancário é contratado com a CAIXA durante a obra; o cliente paga apenas juros de obra durante a construção, com amortização iniciando após as chaves.
9. Teto de Financiamento Caixa: Financiamento de no máximo 60% do valor de avaliação da Caixa.
10. Utilização do FGTS: Permitido se o cliente tiver no mínimo 3 anos de trabalho com carteira assinada (acumulados, somando todos os contratos). O saque só pode ser feito de forma integral e o saldo não pode estar bloqueado.
11. Custos de Documentação por conta do comprador: Taxas da Caixa, ITBI (2% da prefeitura de São José) e Registro do Imóvel (com taxa FRJ inclusa).

================================================================================
INFORMAÇÕES DE USO ESTRITAMENTE INTERNO DA IMOBILIÁRIA E CONSTRUTORA:
[ATENÇÃO BIA: AS INFORMAÇÕES ABAIXO NUNCA DEVEM SER MENCIONADAS AO CLIENTE. USO EXCLUSIVO DA EQUIPE INTERNA]
- Comissão de corretores: 4,5% sobre o valor da venda, paga na assinatura do contrato mediante emissão de Nota Fiscal (PJ com retenção de ISS em São José; se recibo PF, retenção de 6%).
- Contato do Financeiro da Construtora: Dora (48) 6100-6502 / adm@ajcoelhoconstrutora.com.br (USO INTERNO).
- Contato para envio de proposta e reserva: Leonardo (48) 98431-7799 (WhatsApp exclusivo de reservas — USO INTERNO).
- Correspondente bancário oficial: Azul Cred (totalcredcaixa1@gmail.com — USO INTERNO).
- Regra de duplicidade: Notificar a construtora assim que o cliente iniciar conversa para resguardar o atendimento do corretor.
`

    // --------------------------------------------------------------------------
    // 1. ATUALIZAR / REGISTRAR DOCUMENTOS EM ai_knowledge_files
    // --------------------------------------------------------------------------
    console.log('[MIG_1760000065] Iniciando atualização de ai_knowledge_files...')

    // 1.a TABELA VISTAGE oficial
    // Se o registro 1p354c83ug3jn8l já existe, atualizamos extracted_text, is_active e property_id
    try {
      const tabelaRec = app.findRecordById('ai_knowledge_files', '1p354c83ug3jn8l')
      if (tabelaRec) {
        tabelaRec.set('extracted_text', tabelaMarkdown)
        tabelaRec.set('is_active', true)
        tabelaRec.set('property_id', VISTAGE_PROP_ID)
        tabelaRec.set('enterprise', 'Vistage Residence')
        tabelaRec.set('summary', 'Tabela oficial de valores unit-level do Vistage Residence válida a partir de Setembro/2026 (AJ Coelho). Contém preços individuais de todas as unidades dos blocos 101 a 1306 e cobertura 1401, condições de pagamento (15% ato, 60x mensais, 4x reforços, 60% Caixa) e indicação de unidades vendidas (201, 301, 202, 203, 505, 705).')
        tabelaRec.set('updated', now)
        app.saveNoValidate(tabelaRec)
        console.log('[MIG_1760000065] Registro 1p354c83ug3jn8l atualizado com a tabela Set/2026 unit-level completa.')
      }
    } catch (e1) {
      console.warn('[MIG_1760000065] Registro 1p354c83ug3jn8l não encontrado por id:', String(e1))
    }

    // 1.b POLÍTICA DE VENDAS VISTAGE
    // Atualizar os registros existentes de política de vendas garantindo que estejam íntegros e vinculados
    try {
      const polRec1 = app.findRecordById('ai_knowledge_files', '9g3yoz32wdqhek6')
      if (polRec1) {
        polRec1.set('extracted_text', politicaMarkdown)
        polRec1.set('is_active', true)
        polRec1.set('property_id', VISTAGE_PROP_ID)
        polRec1.set('enterprise', 'Vistage Residence')
        polRec1.set('summary', 'Política Comercial oficial do Vistage Residence Barreiros (AJ Coelho Construtora). Regras de negociação, 10% desconto à vista, validade de proposta 48h, 15% ato, financiamento exclusivo Caixa até 60% e uso de FGTS.')
        polRec1.set('updated', now)
        app.saveNoValidate(polRec1)
        console.log('[MIG_1760000065] Registro 9g3yoz32wdqhek6 (POLITICA VENDAS) atualizado com sucesso.')
      }
    } catch (e2) {
      console.warn('[MIG_1760000065] Registro 9g3yoz32wdqhek6 não encontrado:', String(e2))
    }

    try {
      const polRec2 = app.findRecordById('ai_knowledge_files', 'eqolmuk9ko328ez')
      if (polRec2) {
        polRec2.set('extracted_text', politicaMarkdown)
        polRec2.set('is_active', true)
        polRec2.set('property_id', VISTAGE_PROP_ID)
        polRec2.set('enterprise', 'Vistage Residence')
        polRec2.set('summary', 'Política Comercial oficial do Vistage Residence Barreiros (AJ Coelho Construtora). Regras de negociação, 10% desconto à vista, validade de proposta 48h, 15% ato, financiamento exclusivo Caixa até 60% e uso de FGTS.')
        polRec2.set('updated', now)
        app.saveNoValidate(polRec2)
        console.log('[MIG_1760000065] Registro eqolmuk9ko328ez (POLITICA VENDAS) sincronizado com sucesso.')
      }
    } catch (e3) {
      console.warn('[MIG_1760000065] Registro eqolmuk9ko328ez não encontrado:', String(e3))
    }

    // 1.c Desativar explicitamente tabelas antigas ou duplicadas desatualizadas (ex: cnbqist3pc112xw)
    try {
      const oldTab = app.findRecordById('ai_knowledge_files', 'cnbqist3pc112xw')
      if (oldTab) {
        oldTab.set('is_active', false)
        oldTab.set('summary', 'Tabela antiga desativada — substituída pela Tabela Oficial Setembro/2026 (1p354c83ug3jn8l).')
        oldTab.set('updated', now)
        app.saveNoValidate(oldTab)
        console.log('[MIG_1760000065] Tabela antiga cnbqist3pc112xw mantida desativada com aviso de substituição.')
      }
    } catch (_) {}

    // --------------------------------------------------------------------------
    // 2. ATUALIZAR DOSSIÊ DO IMÓVEL VISTAGE (properties id 4ccqbm5dmc2d21f)
    // --------------------------------------------------------------------------
    try {
      const propRec = app.findRecordById('properties', VISTAGE_PROP_ID)
      if (propRec) {
        // Preço dinâmico da menor unidade DISPONÍVEL da tabela: 2 dorm AP 303 = R$ 607.880,00
        propRec.set('price', 607880)
        propRec.set('price_formatted', 'A partir de R$ 607.880,00')
        propRec.set('description', 'Vistage Residence em Barreiros, São José - SC. Lançamento de alto padrão AJ Coelho com plantas de 2 e 3 dormitórios (1 suíte + 2 demi-suítes ou 2 suítes) e cobertura exclusiva linear de 296m². Rooftop completo com piscina de borda infinita, academia panorâmica com vista mar, marketplace 24h na garagem e sacada com churrasqueira a carvão. Tabela oficial de valores por unidade Setembro/2026.')
        
        let feat = propRec.get('features') || []
        if (typeof feat === 'string') {
          try { feat = JSON.parse(feat) } catch (_) { feat = [] }
        }
        // Limpar menção a Garden se houver
        feat = feat.filter((f) => !/garden/i.test(String(f)))
        if (!feat.includes('Tabela Oficial Setembro/2026')) {
          feat.push('Tabela Oficial Setembro/2026')
        }
        propRec.set('features', feat)
        propRec.set('updated', now)
        app.saveNoValidate(propRec)
        console.log('[MIG_1760000065] Imóvel properties VISTAGE atualizado para R$ 607.880,00 e menções a Garden removidas.')
      }
    } catch (pErr) {
      console.warn('[MIG_1760000065] Erro ao atualizar properties Vistage:', String(pErr))
    }

    // --------------------------------------------------------------------------
    // 3. ATUALIZAR DOSSIÊ DE LANÇAMENTOS (launches slug='vistage-residence')
    // --------------------------------------------------------------------------
    try {
      const launchRec = app.findFirstRecordByFilter('launches', "slug = 'vistage-residence'")
      if (launchRec) {
        // Gerar array completo de 79 unidades com disponibilidade precisa
        const unitsArray = [
          // Bloco 101-1301 (3 quartos: 1 suíte + 2 demi-suítes, sol tarde)
          { unit: '101', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '110,09m²', price: 'R$ 1.183.725,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 142.047,00' },
          { unit: '201', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.011.465,00', available: false, status: 'VENDIDO', sun: 'Sol da Tarde' },
          { unit: '301', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.032.759,00', available: false, status: 'VENDIDO', sun: 'Sol da Tarde' },
          { unit: '401', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.054.053,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 158.107,95' },
          { unit: '501', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.075.347,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 161.302,05' },
          { unit: '601', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.096.641,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 164.496,15' },
          { unit: '701', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.128.582,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 169.287,30' },
          { unit: '801', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.160.523,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 174.078,45' },
          { unit: '901', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.192.464,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 178.869,60' },
          { unit: '1001', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.224.405,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 183.660,75' },
          { unit: '1101', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.256.346,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 188.451,90' },
          { unit: '1201', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.288.287,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 193.243,05' },
          { unit: '1301', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '106,47m²', price: 'R$ 1.320.228,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 198.034,20' },

          // Bloco 102-1302 (3 quartos: 1 suíte + 2 demi-suítes, sol manhã/tarde)
          { unit: '102', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '103,87m²', price: 'R$ 965.615,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 144.842,25' },
          { unit: '202', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 909.630,00', available: false, status: 'VENDIDO', sun: 'Sol da Manhã e Tarde' },
          { unit: '302', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 929.844,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 139.476,60', notes: 'Menor valor de 3 dorm disponível' },
          { unit: '402', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 950.058,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 142.508,70' },
          { unit: '502', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 970.272,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 145.540,80' },
          { unit: '602', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 990.486,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 148.572,90' },
          { unit: '702', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.020.807,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 153.121,05' },
          { unit: '802', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.051.128,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 157.669,20' },
          { unit: '902', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.081.449,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 162.217,35' },
          { unit: '1002', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.111.770,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 166.765,50' },
          { unit: '1102', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.142.091,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 171.313,65' },
          { unit: '1202', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.172.412,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 175.861,80' },
          { unit: '1302', typology: '3 Quartos (1 suíte + 2 demi-suítes)', area: '101,07m²', price: 'R$ 1.202.733,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 180.409,95' },

          // Bloco 103-1303 (2 quartos: 1 suíte + 1 banheiro, sol manhã)
          { unit: '103', typology: '2 Quartos (1 suíte)', area: '68,54m²', price: 'R$ 623.110,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 93.466,50' },
          { unit: '203', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 594.520,00', available: false, status: 'VENDIDO', sun: 'Sol da Manhã' },
          { unit: '303', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 607.880,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 91.182,00', notes: 'Menor valor de 2 dorm disponível' },
          { unit: '403', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 621.240,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 93.186,00' },
          { unit: '503', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 634.600,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 95.190,00' },
          { unit: '603', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 647.960,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 97.194,00' },
          { unit: '703', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 661.320,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 99.198,00' },
          { unit: '803', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 674.680,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 101.202,00' },
          { unit: '903', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 688.040,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 103.206,00' },
          { unit: '1003', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 701.400,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 105.210,00' },
          { unit: '1103', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 714.760,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 107.214,00' },
          { unit: '1203', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 728.120,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 109.218,00' },
          { unit: '1303', typology: '2 Quartos (1 suíte)', area: '66,80m²', price: 'R$ 741.480,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 111.222,00' },

          // Bloco 104-1304 (2 quartos: 2 suítes, sol tarde)
          { unit: '104', typology: '2 Quartos (2 suítes)', area: '85,62m²', price: 'R$ 935.324,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 140.298,60' },
          { unit: '204', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 701.760,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 105.264,00' },
          { unit: '304', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 718.080,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 107.712,00' },
          { unit: '404', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 734.400,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 110.160,00' },
          { unit: '504', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 750.720,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 112.608,00' },
          { unit: '604', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 767.040,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 115.056,00' },
          { unit: '704', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 783.360,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 117.504,00' },
          { unit: '804', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 799.680,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 119.952,00' },
          { unit: '904', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 816.000,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 122.400,00' },
          { unit: '1004', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 848.640,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 127.296,00' },
          { unit: '1104', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 864.960,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 129.744,00' },
          { unit: '1204', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 881.280,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 132.192,00' },
          { unit: '1304', typology: '2 Quartos (2 suítes)', area: '81,60m²', price: 'R$ 897.600,00', available: true, sun: 'Sol da Tarde', downPayment: 'R$ 134.640,00' },

          // Bloco 105-1305 (2 quartos: 2 suítes, sol manhã)
          { unit: '105', typology: '2 Quartos (2 suítes)', area: '75,15m²', price: 'R$ 858.070,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 128.710,50' },
          { unit: '205', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 671.232,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 100.684,80' },
          { unit: '305', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 685.824,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 102.873,60' },
          { unit: '405', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 700.416,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 105.062,40' },
          { unit: '505', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 729.600,00', available: false, status: 'VENDIDO', sun: 'Sol da Manhã' },
          { unit: '605', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 751.488,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 112.723,20' },
          { unit: '705', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 773.376,00', available: false, status: 'VENDIDO', sun: 'Sol da Manhã' },
          { unit: '805', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 795.264,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 119.289,60' },
          { unit: '905', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 817.152,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 122.572,80' },
          { unit: '1005', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 839.040,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 125.856,00' },
          { unit: '1105', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 860.928,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 129.139,20' },
          { unit: '1205', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 882.816,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 132.422,40' },
          { unit: '1305', typology: '2 Quartos (2 suítes)', area: '72,96m²', price: 'R$ 904.704,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 135.705,60' },

          // Bloco 106-1306 (2 quartos: 2 suítes, sol manhã)
          { unit: '106', typology: '2 Quartos (2 suítes)', area: '92,02m²', price: 'R$ 1.178.604,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 176.790,60' },
          { unit: '206', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 804.264,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 120.639,60' },
          { unit: '306', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 821.748,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 123.262,20' },
          { unit: '406', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 839.232,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 125.884,80' },
          { unit: '506', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 874.200,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 131.130,00' },
          { unit: '606', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 900.426,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 135.063,90' },
          { unit: '706', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 926.652,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 138.997,80' },
          { unit: '806', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 952.878,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 142.931,70' },
          { unit: '906', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 979.104,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 146.865,60' },
          { unit: '1006', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 1.005.330,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 150.799,50' },
          { unit: '1106', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 1.031.556,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 154.733,40' },
          { unit: '1206', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 1.057.782,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 158.667,30' },
          { unit: '1306', typology: '2 Quartos (2 suítes)', area: '87,42m²', price: 'R$ 1.084.008,00', available: true, sun: 'Sol da Manhã', downPayment: 'R$ 162.601,20' },

          // Cobertura 1401 (3 quartos: 3 suítes + 1 lavabo, sol manhã/tarde)
          { unit: '1401', typology: 'Cobertura 3 Suítes', area: '296,20m²', price: 'R$ 3.258.200,00', available: true, sun: 'Sol da Manhã e Tarde', downPayment: 'R$ 488.730,00' },
        ]

        launchRec.set('units', unitsArray)
        launchRec.set('payment_terms', 'Tabela Setembro/2026: Entrada de 15% (Ato), 60 parcelas mensais, 4 reforços balões e financiamento de 60% exclusivo Caixa durante a obra. Desconto de 10% exclusivo para pagamento 100% à vista. Propostas garantidas por 48h.')
        launchRec.set('description', 'O Vistage Residence chega para transformar a forma de viver em Barreiros, São José. Com entrega e padrão AJ Coelho, reúne arquitetura contemporânea, piscina de borda infinita no rooftop, academia com vista panorâmica para o mar, dois salões sociais e conveniência de marketplace 24h. Tabela oficial unit-level válida a partir de Setembro/2026.')
        launchRec.set('updated', now)
        app.saveNoValidate(launchRec)
        console.log('[MIG_1760000065] Dossiê de lançamentos launches Vistage atualizado com as 79 unidades e regras de pagamento.')
      }
    } catch (lErr) {
      console.warn('[MIG_1760000065] Erro ao atualizar launches Vistage:', String(lErr))
    }

    // --------------------------------------------------------------------------
    // 4. ATUALIZAR O TEXTO ÚNICO DA BIA (bia_learnings id='tYVJIdIFb5rW4iq')
    // --------------------------------------------------------------------------
    try {
      let biaRec = null
      try {
        biaRec = app.findRecordById('bia_learnings', 'tYVJIdIFb5rW4iq')
      } catch (_) {
        biaRec = null
      }

      if (!biaRec) {
        const activeRecs = app.findRecordsByFilter('bia_learnings', 'is_active = true', '-priority,-created', 1, 0)
        if (activeRecs && activeRecs.length > 0) {
          biaRec = activeRecs[0]
        }
      }

      if (biaRec) {
        let currentText = biaRec.getString('rule_text') || ''

        // Novo Art. 10 soberano atualizado, substituindo qualquer versão anterior de valores do Vistage
        const novoArtigo10 = `10. REGRAS GERAIS DE FINANCIAMENTO, REGRA DA IDADE E TABELA OFICIAL VISTAGE RESIDENCE
• Regra Prática da Idade no Financiamento Bancário e na Construtora: os bancos e construtoras limitam a idade do proponente ao término do contrato à fórmula: IDADE DO CLIENTE + PRAZO DE FINANCIAMENTO ≤ 80 ANOS.
  - Assim que o cliente informar a idade (ou quando a conversa financeira amadurecer), calcule na hora o prazo máximo restante permitido (por exemplo: cliente com 67 anos de idade tem prazo máximo de até 13 anos, ou 156 meses).
  - Esta regra de idade máxima aplica-se TANTO aos bancos (Caixa, Itaú, Santander, Bradesco, Sicoob) QUANTO ao financiamento direto com a construtora (AJ Coelho ou planos diretos).
  - Prazo menor significa parcela mensal maior: calcule o impacto com o memo do dia. Se a parcela estourar a margem máxima de 30% da renda bruta familiar, apresente os caminhos viáveis: aporte de entrada maior, composição de renda com proponente mais jovem, escolha de uma unidade de valor menor ou opção pela AJ Coelho.
  - Proibição de promessa vazia: NUNCA diga frases como "vou verificar e retorno" sem apresentar a solução. Se você tem os dados na mão, calcule e responda na hora; se a aprovação exata depender de score no banco, apresente a estimativa baseada no memo do dia e ofereça a análise formal de crédito.

• TABELA OFICIAL VISTAGE RESIDENCE (Barreiros, São José - SC) — VIGÊNCIA SETEMBRO/2026:
  A Tabela Oficial Setembro/2026 é agora a ÚNICA fonte de verdade de valores do Vistage Residence.
  - Regra "A partir de" DINÂMICA: o "a partir de" é sempre calculado pela MENOR UNIDADE DISPONÍVEL da tipologia (não pela menor da tabela):
    * 2 quartos: a partir de R$ 607.880,00 (unidade 303 disponível; unidade 203 de R$ 594.520 está VENDIDA);
    * 3 quartos: a partir de R$ 929.844,00 (unidade 302 disponível; unidade 202 de R$ 909.630 está VENDIDA);
    * Cobertura linear exclusiva: R$ 3.258.200,00 (unidade 1401, 296,20m², 3 suítes, sol manhã e tarde).
  - NÃO EXISTE "GARDEN" nesta tabela oficial: é TERMINANTEMENTE PROIBIDO mencionar "Apartamento Garden" ou citar valor de Garden para o Vistage Residence.
  - UNIDADES VENDIDAS / RESERVADAS: 201, 301, 202, 203, 505, 705.
    REGRA MANDATÓRIA: a Bia NUNCA pode oferecer nem cotar como disponível uma unidade vendida. Se o lead perguntar por uma unidade vendida (ex.: AP 203, AP 505, AP 201), responda com naturalidade que a unidade acabou de ser reservada e ofereça imediatamente a unidade disponível mais próxima da mesma tipologia e andar adjacente (ex.: para a 505, ofereça a 405 de R$ 700.416 ou a 605 de R$ 751.488; para a 203, ofereça a 303 de R$ 607.880).
  - COTAÇÃO PELO NÚMERO DA UNIDADE: Quando o cliente perguntar o preço de um apartamento específico pelo número (ex.: "quanto custa o AP 302?", "e o 401?", "quanto sai a unidade 103?"):
    A Bia deve cotar o VALOR TOTAL EXATO DA TABELA daquela unidade específica:
    * AP 101: R$ 1.183.725 (110,09m² + terraço 61,99m²)
    * AP 302: R$ 929.844 (101,07m²)
    * AP 401: R$ 1.054.053 (106,47m²)
    * AP 103: R$ 623.110 (68,54m² + terraço 10,13m²)
    * AP 303: R$ 607.880 (66,80m²)
    * AP 104: R$ 935.324 (85,62m² + terraço 58,31m²)
    * AP 204: R$ 701.760 (81,60m²)
    * AP 105: R$ 858.070 (75,15m² + terraço 46,67m²)
    * AP 205: R$ 671.232 (72,96m²)
    * AP 106: R$ 1.178.604 (92,02m² + terraço 106,01m²)
    * AP 206: R$ 804.264 (87,42m²)
    * Cobertura 1401: R$ 3.258.200 (296,20m²)
    * Hobby boxes avulsos: R$ 7.000/m² (R$ 11.000 a R$ 32.830). Vagas de moto: R$ 5.000/m² (R$ 11.000).
  - Condições de Pagamento de Cada Unidade:
    * Ato (entrada mínima): 15% do valor total;
    * Mensais: 60 parcelas mensais (15% total);
    * Reforços: 4 balões semestrais/anuais (10% total);
    * Financiamento: 60% do valor total exclusivo CAIXA (durante a obra).
    (Exemplo real: unidade 103 -> Ato R$ 93.466,50 / 60x de R$ 1.557,78 / 4 reforços de R$ 15.577,75 / Financiamento Caixa R$ 373.866,00 / Total R$ 623.110,00).
  - REGRA ANTI-CONTRADIÇÃO E ANTI-ERRO ADAPTA:
    NUNCA cite os valores incorretos gerados pela ferramenta Adapta (R$ 680.000 / R$ 1.020.000). Esses números NÃO existem na tabela oficial da construtora AJ Coelho. Se o cliente citar vídeo de anúncio ou esses valores, esclareça que a tabela oficial vigente possui 2 dormitórios a partir de R$ 607.880 e 3 dormitórios a partir de R$ 929.844.
    Os resumos antigos ("2 dorm R$ 596k / 3 dorm R$ 890k / Garden R$ 980k") estão PERMANENTEMENTE SUBSTITUÍDOS.
  - POLÍTICA COMERCIAL PARA ARGUMENTAÇÃO COM O CLIENTE:
    * Entrega prevista: Dezembro/2030;
    * Desconto de 10% SOMENTE para pagamento integral à vista;
    * Propostas garantidas por 48 horas;
    * Financiamento exclusivo Caixa (empreendimento associativo na planta);
    * FGTS utilizável com no mínimo 3 anos de carteira de trabalho (saque integral, desde que não esteja bloqueado);
    * Financiamento máx. 60% do valor de avaliação da Caixa;
    * Registro de Incorporação: R-160.236; Construtora: AJ Coelho.
  - DADOS DE USO ESTRITAMENTE INTERNO (A BIA NUNCA DIZ AO CLIENTE):
    * Comissão de corretores de 4,5%;
    * Nomes e contatos internos da construtora (Dora, Leonardo);
    * E-mails de correspondente bancário (Azul Cred).`

        // Substituição do Artigo 10 no Texto Único
        const art10Regex = /10\.\s*REGRAS GERAIS DE FINANCIAMENTO.*?(?=\n11\.\s*PROGRAMA MINHA CASA MINHA VIDA|\n##\s*11|$)/s
        if (art10Regex.test(currentText)) {
          currentText = currentText.replace(art10Regex, novoArtigo10 + '\n\n')
        } else {
          // Se não encontrou o regex, anexa antes do item 11
          const item11Anchor = '11. PROGRAMA MINHA CASA MINHA VIDA'
          if (currentText.includes(item11Anchor)) {
            currentText = currentText.replace(item11Anchor, novoArtigo10 + '\n\n' + item11Anchor)
          } else {
            currentText = currentText + '\n\n' + novoArtigo10
          }
        }

        // Também substitui qualquer ocorrência residual de menção a Córrego Grande no Vistage no item 7
        currentText = currentText.replace(/onde localiza-se o Vistage Residence, ao lado do Parque Linear do Córrego Grande/gi, 'onde localizam-se empreendimentos universitários da Ilha')

        // Atualiza a diretriz de interpretação de unidades inserida na migração 63 para contemplar a tabela unit-level do Vistage
        const diretrizUnidadesAntiga = `[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]:
Quando o cliente perguntar o preço de uma unidade específica (ex.: "AP 302", "unidade 501"):
1. Verifique a tipologia correspondente no dossiê do lançamento em foco e apresente o valor oficial daquela tipologia conforme a tabela vigente do dossiê.
2. NUNCA cite um valor genérico incompatível com a unidade perguntada.
3. Se a numeração não permitir identificar com precisão a tipologia no dossiê, informe os valores-base das tipologias disponíveis e pergunte ao lead qual a tipologia da unidade de interesse antes de fechar a condição.`

        const diretrizUnidadesNova = `[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]:
Quando o cliente perguntar o preço de uma unidade específica (ex.: "quanto custa o AP 302?", "unidade 501", "qual o valor da 103?"):
1. COTAÇÃO PELO NÚMERO DA UNIDADE: Apresente o VALOR TOTAL EXATO da unidade perguntada conforme a tabela oficial unit-level do lançamento em foco.
2. NUNCA use valores de marketing desatualizados (ex.: R$ 680k ou R$ 1.020k no Vistage são erros da Adapta e estão proibidos).
3. UNIDADES VENDIDAS: Se a unidade perguntada for VENDIDA (no Vistage: 201, 301, 202, 203, 505, 705), NUNCA cote como disponível; informe com naturalidade que foi reservada e ofereça a unidade disponível mais próxima da mesma tipologia e andar adjacente.
4. "A PARTIR DE" DINÂMICO: Se o lead perguntar "a partir de quanto?", informe o valor da MENOR UNIDADE DISPONÍVEL da tipologia (ex.: no Vistage, 2 dorm a partir de R$ 607.880 na unidade 303; 3 dorm a partir de R$ 929.844 na unidade 302; cobertura R$ 3.258.200 na 1401). Não existe Garden no Vistage.
5. CONDIÇÕES DE PAGAMENTO: Ao detalhar fluxo, apresente o padrão do lançamento (no Vistage: 15% ato, 60 parcelas mensais, 4 reforços balões e 60% financiamento Caixa associativo).`

        if (currentText.includes('[INTERPRETAÇÃO DE UNIDADES E PLANTAS ESPECÍFICAS]')) {
          if (currentText.includes(diretrizUnidadesAntiga)) {
            currentText = currentText.replace(diretrizUnidadesAntiga, diretrizUnidadesNova)
          }
        }

        biaRec.set('rule_text', currentText)
        biaRec.set('updated', now)
        biaRec.set('last_reviewed_at', now)
        app.saveNoValidate(biaRec)
        console.log('[MIG_1760000065] Texto Único da Bia atualizado em bia_learnings com sucesso.')

        // Sincronizar na coleção users
        try {
          app.db().newQuery('UPDATE users SET bia_instructions = {:rule_text}, ai_instructions = {:rule_text} WHERE 1=1')
            .bind({ rule_text: currentText })
            .execute()
          console.log('[MIG_1760000065] users.bia_instructions e users.ai_instructions sincronizados.')
        } catch (uErr) {
          console.warn('[MIG_1760000065] Erro ao sincronizar users:', String(uErr))
        }
      }
    } catch (bErr) {
      console.warn('[MIG_1760000065] Erro ao atualizar bia_learnings:', String(bErr))
    }
  },
  (app) => {
    // Reversão
    console.log('[MIG_1760000065] Reversão executada.')
  }
)
