# InovaLog — Gestão de Equipamentos e Rotas Internas do Porto

App web responsivo, tema escuro, com a logo InovaLog enviada no topo (sem "Bom dia, Emily"). Todas as telas do mockup, ligadas entre si, com dados fictícios que se atualizam de verdade durante o uso.

## Identidade

- Logo InovaLog no cabeçalho lateral (desktop) e no topo (celular).
- Fundo preto/cinza, cards arredondados, verde-limão para livre/rotas, amarelo para em uso, vermelho para manutenção/bloqueio, detalhe dourado da marca.
- Ícones simples e tipografia limpa, seguindo o mockup.

## Telas

1. **Início (Dashboard)** — total de equipamentos, em uso, disponíveis, manutenção; atividades do dia (entregas, cargas, descargas); alertas recentes; resumo da operação.
2. **Mapa Interno** — planta fictícia do porto desenhada à mão (setores, pátios, armazéns, cais, oficina, vias internas). Equipamentos aparecem como marcadores coloridos por status e se movem quando há rota ativa. Zoom com botões e roda do mouse, arraste para navegar, legenda, filtro por status, bloqueios marcados em vermelho.
3. **Equipamentos** — busca + filtros por tipo, status, setor e combustível; cartões com status e nível de combustível.
4. **Detalhes do Equipamento** — foto, tipo, placa, capacidade, combustível, horímetro, operador, próxima manutenção; botões "Ver no mapa" e "Solicitar este equipamento".
5. **Solicitar Rota** — tipo de equipamento, equipamento, destino, atividade e observações.
6. **Rota Sugerida** — equipamento escolhido automaticamente, origem, destino, distância, tempo estimado, traçado no mapa e "Iniciar rota".
7. **Rota em Andamento** — traçado, tempo e distância restantes atualizando em tempo real, status e "Cancelar rota".
8. **Notificações** — disponibilidade, bloqueios, conclusão de rota, congestionamento, manutenção e combustível baixo.
9. **Relatórios** — horas de uso, atividades, tempo de espera, consumo de combustível e produtividade, com gráficos.
10. **Manutenções** — necessárias, agendadas, concluídas e próximas datas.

Navegação inferior no celular: Início | Mapa | Equipamentos | Mais (leva a Solicitar, Notificações, Relatórios, Manutenções). No desktop, barra lateral como no mockup.

## GPS interno inteligente (simulado)

- Malha de caminhos entre setores com distâncias reais da planta.
- Ao pedir uma máquina: escolhe o equipamento livre mais próximo do destino, calcula o menor caminho, e se houver trecho bloqueado mostra o alerta "CAMINHO BLOQUEADO" e recalcula automaticamente uma rota alternativa.
- Durante a rota, o marcador anda pelo traçado, e tempo/distância restantes diminuem até concluir; ao concluir, o equipamento muda de setor e de status, e gera notificação.

## Detalhes técnicos

- Mapa próprio em SVG (sem Google Maps): planta vetorial com setores, vias, nós e arestas; pan/zoom com âncora no cursor e listener não passivo.
- Roteamento por Dijkstra sobre o grafo de vias, com arestas bloqueadas removidas e fallback alternativo.
- Estado global em memória (React context + reducer) com tick de simulação, compartilhado por todas as telas — sem backend nesta etapa.
- Rotas TanStack separadas por tela, cada uma com seu próprio título/descrição.
- Tokens de cor no design system (styles.css), sem cores fixas nos componentes.
- Logo enviada publicada como asset e usada no cabeçalho; imagens dos equipamentos geradas.

Sem banco de dados: os dados voltam ao estado inicial ao recarregar. Se quiser guardar histórico e login de operadores depois, dá para adicionar o Lovable Cloud numa próxima etapa.
